import { readFileSync, writeFileSync } from "node:fs";
import { config, tokenCachePath } from "./config.js";

const SCOPE = "Mail.Read Mail.ReadWrite offline_access";
const DEVICE_CODE_URL = "https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode";
const TOKEN_URL = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";

function readTokenCache() {
  try {
    return JSON.parse(readFileSync(tokenCachePath, "utf-8"));
  } catch {
    return null;
  }
}

function saveTokenCache(tokens) {
  const cache = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };
  writeFileSync(tokenCachePath, JSON.stringify(cache, null, 2));
  return cache;
}

// Kicks off the device code login and prints the code the user must enter.
async function runDeviceCodeFlow() {
  const deviceResponse = await fetch(DEVICE_CODE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.clientId, scope: SCOPE }),
  });
  const deviceData = await deviceResponse.json();
  if (!deviceResponse.ok) {
    throw new Error(`Failed to start device code login: ${JSON.stringify(deviceData)}`);
  }

  // stdout is reserved for MCP protocol messages, so log to stderr instead.
  console.error(deviceData.message);

  return pollForToken(deviceData.device_code, deviceData.interval);
}

// Polls the token endpoint until the user approves the login (or it expires).
async function pollForToken(deviceCode, intervalSeconds) {
  let interval = intervalSeconds;

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));

    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: deviceCode,
      }),
    });
    const data = await response.json();

    if (response.ok) {
      return saveTokenCache(data);
    }
    if (data.error === "authorization_pending") {
      continue;
    }
    if (data.error === "slow_down") {
      interval += 5;
      continue;
    }
    throw new Error(`Device code login failed: ${data.error_description || data.error}`);
  }
}

async function refreshAccessToken(refreshToken) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: SCOPE,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${data.error_description || data.error}`);
  }
  return saveTokenCache(data);
}

// The only function other modules need: always returns a usable access token.
export async function getAccessToken() {
  const cache = readTokenCache();
  const bufferMs = 60 * 1000;

  if (cache && cache.expiresAt > Date.now() + bufferMs) {
    return cache.accessToken;
  }

  if (cache && cache.refreshToken) {
    try {
      const refreshed = await refreshAccessToken(cache.refreshToken);
      return refreshed.accessToken;
    } catch {
      // Refresh token expired or revoked, fall back to a fresh login below.
    }
  }

  const fresh = await runDeviceCodeFlow();
  return fresh.accessToken;
}
