import { z } from "zod";
import { graphFetch } from "../graphClient.js";
import { chunk } from "../lib/chunk.js";

// Microsoft Graph allows at most 20 requests per $batch call.
const BATCH_LIMIT = 20;

// Deletes one chunk of emails in a single Graph $batch call.
async function deleteBatch(messageIds) {
  const requests = messageIds.map((id, index) => ({
    id: String(index),
    method: "DELETE",
    url: `/me/messages/${id}`,
  }));

  const { responses } = await graphFetch("/$batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  });

  // Graph doesn't guarantee response order, so match back by id.
  return responses.map((response) => ({
    messageId: messageIds[Number(response.id)],
    success: response.status >= 200 && response.status < 300,
    status: response.status,
  }));
}

export const deleteEmails = {
  name: "delete_emails",
  config: {
    title: "Delete Emails",
    description:
      "Permanently deletes one or more emails in a single batch (moves them to Deleted Items). Only call this after the human user has explicitly confirmed they want them deleted. Requires confirm: true.",
    inputSchema: z.object({
      messageIds: z.array(z.string()).min(1).describe("Graph message IDs to delete"),
      confirm: z.boolean().describe("Must be true. Set only after the human user has confirmed the deletion."),
    }),
  },
  handler: async ({ messageIds, confirm }) => {
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

    try {
      const chunks = chunk(messageIds, BATCH_LIMIT);
      const results = [];
      for (let i = 0; i < chunks.length; i++) {
        console.error(`[delete_emails] chunk ${i + 1}/${chunks.length} (${chunks[i].length} emails)`);
        results.push(...(await deleteBatch(chunks[i])));
      }

      const deletedCount = results.filter((r) => r.success).length;
      return {
        content: [
          {
            type: "text",
            text: `Deleted ${deletedCount}/${messageIds.length} emails.\n${JSON.stringify(results, null, 2)}`,
          },
        ],
      };
    } catch (err) {
      // Surface network/timeout/Graph errors as a clear result instead of an unhandled failure.
      return {
        isError: true,
        content: [{ type: "text", text: `delete_emails failed: ${err.message}` }],
      };
    }
  },
};
