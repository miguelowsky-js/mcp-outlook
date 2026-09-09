import { z } from "zod";
import { graphFetch } from "../graphClient.js";

const SELECT_FIELDS = "subject,from,receivedDateTime,isRead";

export const searchEmails = {
  name: "search_emails",
  config: {
    title: "Search Emails",
    description:
      "Searches emails across all folders by keyword (subject, body, sender, etc). Returns a nextLink when more pages are available.",
    inputSchema: z.object({
      query: z.string().describe("Text to search for"),
      limit: z.number().int().min(1).max(50).default(10).describe("Max number of emails per page"),
      nextLink: z.string().optional().describe("Pass the nextLink from a previous call to get the next page"),
    }),
  },
  handler: async ({ query, limit, nextLink }) => {
    // A nextLink already encodes the query, page size, and cursor, so use it as-is.
    let url = nextLink;
    if (!url) {
      const encodedQuery = encodeURIComponent(`"${query}"`);
      url = `/me/messages?$search=${encodedQuery}&$top=${limit}&$select=${SELECT_FIELDS}`;
    }
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
