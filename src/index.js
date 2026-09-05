import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { listEmails } from "./tools/listEmails.js";
import { searchEmails } from "./tools/searchEmails.js";
import { readEmail } from "./tools/readEmail.js";
import { deleteEmail } from "./tools/deleteEmail.js";

const server = new McpServer({
  name: "mcp-outlook",
  version: "1.0.0",
});

const tools = [listEmails, searchEmails, readEmail, deleteEmail];
for (const tool of tools) {
  server.registerTool(tool.name, tool.config, tool.handler);
}

await server.connect(new StdioServerTransport());
