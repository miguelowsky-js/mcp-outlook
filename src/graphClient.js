import { getAccessToken } from "./auth.js";

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
const REQUEST_TIMEOUT_MS = 30000;

// stdout is reserved for MCP protocol messages, so diagnostics go to stderr.
// Claude Desktop writes stderr into its per-server log file, so this is
// what to check first the next time a call seems stuck.
function log(message) {
  console.error(`[graphClient] ${new Date().toISOString()} ${message}`);
}

// Thin wrapper so every tool doesn't repeat the auth header and base URL.
// `path` can also be a full URL, e.g. an @odata.nextLink from a previous page.
export async function graphFetch(path, options = {}) {
  const accessToken = await getAccessToken();
  const url = path.startsWith("http") ? path : `${GRAPH_BASE_URL}${path}`;

  log(`${options.method || "GET"} ${url}`);
  const start = Date.now();

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
      // A hard timeout so a stalled connection fails loudly instead of hanging forever.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    log(`Request failed after ${Date.now() - start}ms: ${err.message}`);
    throw new Error(`Graph API request failed (network or timeout): ${err.message}`);
  }

  log(`Response ${response.status} after ${Date.now() - start}ms`);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Graph API error ${response.status}: ${errorBody}`);
  }

  // DELETE requests return an empty body, so guard against JSON parse errors.
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
