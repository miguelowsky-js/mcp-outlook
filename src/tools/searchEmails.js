import { fromJsonSchema } from "@modelcontextprotocol/server";
import { graphFetch } from "../graphClient.js";

const SELECT_FIELDS = "subject,from,receivedDateTime,isRead";

export const searchEmails = {
  name: "search_emails",
  config: {
    title: "Search Emails",
    description:
      "Searches emails across all folders by keyword (subject, body, sender, etc). Returns a nextLink when more pages are available.",
    inputSchema: fromJsonSchema({
      type: "object",
      properties: {
        query: { type: "string", description: "Text to search for" },
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
      required: ["query"],
    }),
  },
  handler: async ({ query, limit = 10, nextLink }) => {
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
