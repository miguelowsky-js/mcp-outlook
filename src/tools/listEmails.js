import { z } from "zod";
import { graphFetch } from "../graphClient.js";

const SELECT_FIELDS = "subject,from,receivedDateTime,isRead";

export const listEmails = {
  name: "list_emails",
  config: {
    title: "List Emails",
    description:
      "Lists recent emails from a mail folder (defaults to the inbox). Returns a nextLink when more pages are available.",
    inputSchema: z.object({
      folder: z.string().default("inbox").describe("Mail folder name, e.g. 'inbox' or 'sentitems'"),
      limit: z.number().int().min(1).max(50).default(10).describe("Max number of emails per page"),
      nextLink: z.string().optional().describe("Pass the nextLink from a previous call to get the next page"),
    }),
  },
  handler: async ({ folder, limit, nextLink }) => {
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
