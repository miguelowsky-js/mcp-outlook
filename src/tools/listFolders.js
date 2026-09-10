import { fromJsonSchema } from "@modelcontextprotocol/server";
import { graphFetch } from "../graphClient.js";

const SELECT_FIELDS =
  "id,displayName,parentFolderId,childFolderCount,unreadItemCount,totalItemCount";

export const listFolders = {
  name: "list_folders",
  config: {
    title: "List Folders",
    description:
      "Lists mail folders (name, id, unread/total counts). Pass parentFolderId to list a folder's subfolders. Use a folder's id or exact name with move_emails.",
    inputSchema: fromJsonSchema({
      type: "object",
      properties: {
        parentFolderId: {
          type: "string",
          description: "List child folders of this folder instead of the top level",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          default: 50,
          description: "Max number of folders per page",
        },
      },
    }),
  },
  handler: async ({ parentFolderId, limit = 50 }) => {
    const base = parentFolderId
      ? `/me/mailFolders/${parentFolderId}/childFolders`
      : "/me/mailFolders";
    const data = await graphFetch(`${base}?$top=${limit}&$select=${SELECT_FIELDS}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { folders: data.value, nextLink: data["@odata.nextLink"] ?? null },
            null,
            2
          ),
        },
      ],
    };
  },
};
