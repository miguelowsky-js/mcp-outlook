# mcp-outlook

A small MCP server for **personal** Outlook/Hotmail/Live accounts, using the
Microsoft Graph API directly. The official Outlook MCP server only supports
work/school (Azure AD) accounts, this one is for everyone else.

Tools: `list_emails`, `search_emails`, `read_email`, `delete_email` (requires
explicit confirmation).

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
its config, using the full path to `src/index.js`:

```json
{
  "mcpServers": {
    "outlook": {
      "command": "node",
      "args": ["C:/xampp/htdocs/mcp-outlook-js/src/index.js"]
    }
  }
}
```

## Notes

- `config.json` and `token-cache.json` hold secrets and are gitignored, never commit them.
- `delete_email` moves the message to Deleted Items (like a normal Outlook delete), and only runs if called with `confirm: true`.
