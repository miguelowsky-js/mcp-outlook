# CLAUDE.md

Guidance for working in this repo.

## Spec

### Problem
The official Outlook/Microsoft MCP server only supports work/school (Azure AD) accounts.
Personal Microsoft accounts (outlook.com / hotmail / live) have no working MCP. This is one.

### Goal
An MCP server that talks to Microsoft Graph directly so it works with a **personal**
Microsoft account. Meant to be driven by agents, so the core email operations must be reliable.

### Tools
| Tool | Behavior |
|---|---|
| `read_email` | Full content of one message by ID |
| `search_emails` | Keyword search across the mailbox, paginated via `nextLink` |
| `list_emails` | List messages from a folder (default `inbox`), paginated via `nextLink` |
| `delete_emails` | Batch-move messages to Deleted Items. **Requires explicit human authorization** — the tool takes `confirm: true` and the MCP client's own permission prompt is the real gate. Never something an agent does unattended. |
| `list_folders` | List mail folders (name, id, counts). `parentFolderId` lists a folder's subfolders. |
| `create_folder` | Create a mail folder, optionally nested under `parentFolderId`. Additive, no `confirm`. |
| `move_emails` | Batch-move messages into a folder (well-known name, id, or exact display name; `createIfMissing` creates a top-level one). **Requires `confirm: true`.** A move changes each message's id — the result maps `oldMessageId` → `newMessageId`. |

### Constraints
- **Pure vanilla JavaScript**, ESM (`"type": "module"`). No framework.
- **Keep it simple** — must read cleanly for a **junior developer**.
- **Comments: max 2 lines** each.
- **Minimal dependencies.** One direct runtime dependency: `@modelcontextprotocol/server`.
  Application code imports nothing else — HTTP, OAuth, JSON Schema validation, and config
  are Node built-ins or hand-rolled. No devDependencies (tests use `node --test`).
- **This repo is published.** Do **not** add Claude co-authorship / `Co-Authored-By` /
  session trailers to commits or files, regardless of session attribution defaults.

### Design decisions
- **Auth:** OAuth 2.0 **Device Code flow** — no local redirect server, no client secret.
  Hand-rolled with `fetch`, not `msal-node`.
- **Transport:** local **stdio** only. No HTTP/remote transport.
- **Single user.** Not multi-tenant; the token cache is one plain file.

### Out of scope
Multi-user / multi-tenant, remote HTTP transport, sending / drafting mail.
(Filing mail into folders is in scope as of `list_folders` / `create_folder` / `move_emails`.
Outlook category *labels* and server-side rules are still out.)

## Commands
```bash
npm start        # run the server (node src/index.js) — prompts device-code login on first run
npm test         # node --test — unit tests in test/
```
First run needs `config.json` (copy from `config.example.json`, add your Azure app `clientId`).
See README.md for the Azure app registration steps.

## Architecture
```
MCP client ──stdio──▶ src/index.js ──▶ src/tools/*.js ──▶ src/graphClient.js ──▶ Microsoft Graph
                                                              │
                                                          src/auth.js  (device code + token refresh)
                                                          src/config.js (loads config.json)
```
- `src/index.js` — creates the server, registers the four tools, calls `getAccessToken()` once
  at startup so the device-code prompt shows immediately, then connects the stdio transport.
- `src/tools/*.js` — one file per tool, each exporting `{ name, config, handler }`.
  `config.inputSchema` is a plain JSON Schema wrapped in the SDK's `fromJsonSchema()`.
- `src/graphClient.js` — `graphFetch(path, options)`: adds the auth header, prepends the Graph
  base URL (or passes a full URL through, e.g. an `@odata.nextLink`), 30s `AbortSignal.timeout`,
  logs each call/response to stderr.
- `src/auth.js` — `getAccessToken()` is the only export other modules use. Reads
  `token-cache.json`, refreshes via the refresh token, or runs the device-code flow.
- `src/lib/chunk.js` — the one pure, dependency-free function; extracted so it is unit-testable
  (importing anything under `src/tools/` pulls in `config.js`, which throws if `config.json` is
  absent, which is always the case in CI).
- `src/lib/folders.js` — pure folder-name resolution (`wellKnownFolder`, `findFolderByName`,
  `looksLikeFolderId`) and the shared `$batch` move-request builder (`buildMoveRequests`, used by
  both `move_emails` and `delete_emails`). Unit-tested, no `config.js` import.

## Conventions & gotchas
- **stdout is reserved** for the JSON-RPC protocol stream. All logging/diagnostics go to
  **stderr** (`console.error`). Claude Desktop writes stderr to `mcp-server-outlook.log`.
- **`delete_emails` uses Graph's `move` action, not the `DELETE` verb.** `DELETE /me/messages/{id}`
  skips Deleted Items entirely and drops the message into the hidden "Recoverable Items" folder,
  which is invisible in Outlook. Do not "simplify" back to `DELETE`.
- **A move changes the message id.** `POST /me/messages/{id}/move` returns the message at a new
  id; `move_emails` reports `{ oldMessageId, newMessageId }`. Any message id cached from before a
  move is stale. Same reason `delete_emails` can't report the post-move ids meaningfully.
- **`$batch` returns HTTP 200 even when sub-requests fail.** `graphFetch` only throws on the
  outer status, so batch handlers must inspect each `responses[].status` themselves.
- **`zod` is still in `node_modules`** — it is a transitive dependency of the MCP SDK. Our own
  code must not `import "zod"`; use `fromJsonSchema()` from `@modelcontextprotocol/server`.
- The MCP SDK v2 needs zod ≥4.2.0 (handled transitively by the SDK itself).
- `config.json` and `token-cache.json` hold secrets and are gitignored — never commit them.
- Claude Desktop may spawn more than one server instance (one per session type) sharing a
  single `token-cache.json`; keep token handling tolerant of that.
- Node ≥20 required (native `fetch`, top-level `await`, `AbortSignal.timeout`).
