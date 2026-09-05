import { z } from "zod";
import { graphFetch } from "../graphClient.js";

const SELECT_FIELDS = "subject,from,receivedDateTime,isRead";

export const listEmails = {
  name: "list_emails",
  config: {
    title: "List Emails",
    description: "Lists recent emails from a mail folder (defaults to the inbox).",
    inputSchema: z.object({
      folder: z.string().default("inbox").describe("Mail folder name, e.g. 'inbox' or 'sentitems'"),
      limit: z.number().int().min(1).max(50).default(10).describe("Max number of emails to return"),
    }),
  },
  handler: async ({ folder, limit }) => {
    const data = await graphFetch(
      `/me/mailFolders/${folder}/messages?$top=${limit}&$select=${SELECT_FIELDS}`
    );

    return {
      content: [{ type: "text", text: JSON.stringify(data.value, null, 2) }],
    };
  },
};
