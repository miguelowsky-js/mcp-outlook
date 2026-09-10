import { fromJsonSchema } from "@modelcontextprotocol/server";
import { graphFetch } from "../graphClient.js";

const SELECT_FIELDS = "subject,from,receivedDateTime,isRead";

export const listEmails = {
  name: "list_emails",
  config: {
    title: "List Emails",
    description:
      "Lists recent emails from a mail folder (defaults to the inbox). Returns a nextLink when more pages are available.",
    inputSchema: fromJsonSchema({
      type: "object",
      properties: {
        folder: {
          type: "string",
          default: "inbox",
          description: "Mail folder name, e.g. 'inbox' or 'sentitems'",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          default: 10,
          description: "Max number of emails per page",
        },
        nextLink: {
          type: "string",
          description: "Pass the nextLink from a previous call to get the next page",
        },
      },
    }),
  },
  // Defaults are also applied here in case the client omits them.
  handler: async ({ folder = "inbox", limit = 10, nextLink }) => {
    // A nextLink already encodes the folder, page size, and cursor, so use it as-is.
    const url =
      nextLink ?? `/me/mailFolders/${folder}/messages?$top=${limit}&$select=${SELECT_FIELDS}`;
    const data = await graphFetch(url);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ emails: data.value, nextLink: data["@odata.nextLink"] ?? null }, null, 2),
        },
      ],
    };
  },
};
