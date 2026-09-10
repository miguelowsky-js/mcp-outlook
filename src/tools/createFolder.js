import { fromJsonSchema } from "@modelcontextprotocol/server";
import { graphFetch } from "../graphClient.js";

export const createFolder = {
  name: "create_folder",
  config: {
    title: "Create Folder",
    description:
      "Creates a mail folder, optionally nested under parentFolderId. Use this to set up category folders before filing emails with move_emails.",
    inputSchema: fromJsonSchema({
      type: "object",
      properties: {
        displayName: { type: "string", description: "Name for the new folder" },
        parentFolderId: {
          type: "string",
          description: "Create the folder inside this folder instead of at the top level",
        },
      },
      required: ["displayName"],
    }),
  },
  handler: async ({ displayName, parentFolderId }) => {
    const path = parentFolderId
      ? `/me/mailFolders/${parentFolderId}/childFolders`
      : "/me/mailFolders";

    try {
      const folder = await graphFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(folder, null, 2) }],
      };
    } catch (err) {
      // A duplicate name comes back as a Graph 409 and lands here as a clear message.
      return {
        isError: true,
        content: [{ type: "text", text: `create_folder failed: ${err.message}` }],
      };
    }
  },
};
