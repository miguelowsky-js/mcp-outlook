import { z } from "zod";
import { graphFetch } from "../graphClient.js";

const SELECT_FIELDS = "subject,from,receivedDateTime,isRead";

export const searchEmails = {
  name: "search_emails",
  config: {
    title: "Search Emails",
    description: "Searches emails across all folders by keyword (subject, body, sender, etc).",
    inputSchema: z.object({
      query: z.string().describe("Text to search for"),
      limit: z.number().int().min(1).max(50).default(10).describe("Max number of emails to return"),
    }),
  },
  handler: async ({ query, limit }) => {
    const encodedQuery = encodeURIComponent(`"${query}"`);
    const data = await graphFetch(
      `/me/messages?$search=${encodedQuery}&$top=${limit}&$select=${SELECT_FIELDS}`
    );

    return {
      content: [{ type: "text", text: JSON.stringify(data.value, null, 2) }],
    };
  },
};
