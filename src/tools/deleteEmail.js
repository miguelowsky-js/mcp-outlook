import { z } from "zod";
import { graphFetch } from "../graphClient.js";

export const deleteEmail = {
  name: "delete_email",
  config: {
    title: "Delete Email",
    description:
      "Permanently deletes an email (moves it to Deleted Items). Only call this after the human user has explicitly confirmed they want it deleted. Requires confirm: true.",
    inputSchema: z.object({
      messageId: z.string().describe("The email's Graph message ID to delete"),
      confirm: z.boolean().describe("Must be true. Set only after the human user has confirmed the deletion."),
    }),
  },
  handler: async ({ messageId, confirm }) => {
    if (confirm !== true) {
      return {
        content: [
          {
            type: "text",
            text: "Deletion cancelled: ask the human user to confirm before calling this tool with confirm: true.",
          },
        ],
      };
    }

    await graphFetch(`/me/messages/${messageId}`, { method: "DELETE" });

    return {
      content: [{ type: "text", text: `Email ${messageId} deleted.` }],
    };
  },
};
