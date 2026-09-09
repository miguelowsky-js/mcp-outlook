import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { getAccessToken } from "./auth.js";
import { listEmails } from "./tools/listEmails.js";
import { searchEmails } from "./tools/searchEmails.js";
import { readEmail } from "./tools/readEmail.js";
import { deleteEmails } from "./tools/deleteEmails.js";

const server = new McpServer({
  name: "mcp-outlook",
  version: "1.0.0",
});

const tools = [listEmails, searchEmails, readEmail, deleteEmails];
for (const tool of tools) {
  server.registerTool(tool.name, tool.config, tool.handler);
}

// Log in up front so the device code prompt shows immediately on startup,
// instead of waiting for an MCP client to call the first tool.
await getAccessToken();

await server.connect(new StdioServerTransport());
