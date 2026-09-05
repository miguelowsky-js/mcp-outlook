import { z } from "zod";
import { graphFetch } from "../graphClient.js";

const SELECT_FIELDS = "subject,from,toRecipients,receivedDateTime,body";

export const readEmail = {
  name: "read_email",
  config: {
    title: "Read Email",
    description: "Reads the full content of one email by its ID.",
    inputSchema: z.object({
      messageId: z.string().describe("The email's Graph message ID, from list_emails or search_emails"),
    }),
  },
  handler: async ({ messageId }) => {
    const data = await graphFetch(`/me/messages/${messageId}?$select=${SELECT_FIELDS}`);

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  },
};
