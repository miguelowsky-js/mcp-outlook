import { getAccessToken } from "./auth.js";

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

// Thin wrapper so every tool doesn't repeat the auth header and base URL.
export async function graphFetch(path, options = {}) {
  const accessToken = await getAccessToken();

  const response = await fetch(`${GRAPH_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Graph API error ${response.status}: ${errorBody}`);
  }

  // DELETE requests return an empty body, so guard against JSON parse errors.
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
