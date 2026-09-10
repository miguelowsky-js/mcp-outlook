# mcp-outlook

![CI](https://github.com/miguelowsky-js/mcp-outlook/actions/workflows/ci.yml/badge.svg)

A lightweight MCP server for **personal** Outlook/Hotmail/Live accounts, using the
Microsoft Graph API directly. The official Outlook MCP server only supports
work/school (Azure AD) accounts, this one is for everyone else.

Tools: `list_emails`, `search_emails`, `read_email`, `delete_emails` (batch
delete, requires explicit confirmation), `list_folders`, `create_folder`,
`move_emails` (batch-file emails into folders, requires explicit confirmation).

## 1. Register an Azure app (one-time setup)

1. Go to https://portal.azure.com → **Azure Active Directory** → **App registrations** → **New registration**.
2. Name it anything, e.g. "Personal Outlook MCP".
3. Under "Supported account types", choose **"Personal Microsoft accounts only"**.
4. Leave "Redirect URI" blank.
5. After creation, copy the **Application (client) ID** from the app overview page.
6. Go to **Authentication** → scroll to "Advanced settings" → set **"Allow public client flows"** to **Yes**, then save.
7. Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions** → add `Mail.Read`, `Mail.ReadWrite`, `offline_access`.

## 2. Configure

```bash
npm install
cp config.example.json config.json
```

Edit `config.json` and paste in your client ID:

```json
{ "clientId": "your-client-id-here" }
```

## 3. Run

```bash
npm start
```

On first run, the terminal prints a code and a URL
(`https://microsoft.com/devicelogin`). Open the URL on any device, enter the
code, and sign in with your personal Microsoft account. A `token-cache.json`
file is created afterward so you won't need to log in again until the
refresh token expires.

## 4. Connect it to an MCP client

Point your MCP client (e.g. Claude Desktop) at this server by adding it to
its config, using the full path to `src/index.js` on your machine:

```json
{
  "mcpServers": {
    "outlook": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-outlook/src/index.js"]
    }
  }
}
```

## How it works

```
MCP client (e.g. Claude) ──stdio──▶ src/index.js ──▶ tools/*.js ──▶ graphClient.js ──▶ Microsoft Graph API
                                                          │
                                                       auth.js (device code login, token refresh)
```

- **`auth.js`** — logs in with the OAuth 2.0 device code flow (no local
  redirect server needed) and caches the access/refresh token in
  `token-cache.json`, refreshing it automatically.
- **`graphClient.js`** — one shared `fetch` wrapper that adds the auth header
  and a request timeout, used by every tool.
- **`tools/*.js`** — one file per MCP tool, each exporting `{ name, config,
  handler }`; `index.js` just registers all of them.

## Development

```bash
npm test
```

Runs the unit tests (Node's built-in test runner, no extra dependencies) —
also wired up in GitHub Actions on every push.

## Limitations

- **Single user, local only.** It's built to run as one person's local MCP
  server (like Claude Desktop spawning it), not a multi-tenant service —
  the token cache is a plain file, not per-user.
- **`delete_emails` moves to Deleted Items**, matching a normal Outlook
  delete — not a permanent purge.
- No automatic retry for Microsoft Graph rate limiting (HTTP 429). If you
  hit it deleting very large batches, split the request into smaller ones.

## Notes

- `config.json` and `token-cache.json` hold secrets and are gitignored — never commit them.
- `delete_emails` takes a list of message IDs, moves them to Deleted Items (like a normal Outlook delete) in batches of up to 20 per Graph API call, and only runs if called with `confirm: true`. It uses Graph's `move` action rather than the `DELETE` verb — `DELETE /me/messages/{id}` skips Deleted Items entirely and drops the message straight into the hidden "Recoverable Items" folder, which isn't visible in Outlook.
- `list_emails` and `search_emails` return up to `limit` emails per call plus a `nextLink`. Pass that `nextLink` back into the same tool to get the next page; it's `null` once there are no more results.
- **Organizing mail by folder.** `list_folders` shows the folder tree (pass `parentFolderId` for subfolders); `create_folder` makes a category folder (nest it with `parentFolderId`); `move_emails` files a batch of messages into a folder named by a well-known name (`archive`, `inbox`, ...), a folder id, or an exact display name — `createIfMissing: true` creates a **top-level** folder if the name doesn't resolve. `move_emails` needs `confirm: true`. Moving a message gives it a **new id**, so each result row maps `oldMessageId` → `newMessageId`; discard any ids you cached before the move. Moves batch 20 per Graph call with no automatic retry on rate limiting (429) — same as `delete_emails`.

## Troubleshooting

- **A tool call hangs forever with no error, especially after working once:**
  This is usually Claude Desktop's own permission dialog, not this server. If
  you clicked "Allow once" instead of "Always allow" for a tool, Claude
  Desktop is supposed to ask again once that permission expires — but it can
  silently hang instead of re-prompting. Fix: click **"Always allow"** for
  this server's tools (especially `delete_emails`) instead of "Allow once".
- To see what the server itself is doing (or confirm a hang never even
  reached it), check Claude Desktop's log for this server:
  `%LOCALAPPDATA%\Claude\Logs\mcp-server-outlook.log` on Windows. Every Graph
  API call and response is logged there with a timestamp.

## License

[ISC](LICENSE)
