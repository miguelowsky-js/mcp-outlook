import { fromJsonSchema } from "@modelcontextprotocol/server";
import { graphFetch } from "../graphClient.js";
import { chunk } from "../lib/chunk.js";
import {
  wellKnownFolder,
  findFolderByName,
  looksLikeFolderId,
  buildMoveRequests,
} from "../lib/folders.js";

// Microsoft Graph allows at most 20 requests per $batch call.
const BATCH_LIMIT = 20;

// Turns the destinationFolder input into a Graph destinationId, creating the
// folder first when asked. Returns null when it can't be resolved.
async function resolveDestinationId(destinationFolder, createIfMissing) {
  const known = wellKnownFolder(destinationFolder);
  if (known) return known;

  const { value } = await graphFetch("/me/mailFolders?$top=100&$select=id,displayName");
  const match = findFolderByName(value, destinationFolder);
  if (match) return match.id;

  if (looksLikeFolderId(destinationFolder)) return destinationFolder;

  if (createIfMissing) {
    const folder = await graphFetch("/me/mailFolders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: destinationFolder }),
    });
    return folder.id;
  }

  return null;
}

// Moves one chunk of messages in a single $batch call. A move returns the
// message at a NEW id, so the new id is read back from each sub-response.
async function moveBatch(messageIds, destinationId) {
  const requests = buildMoveRequests(messageIds, destinationId);

  const { responses } = await graphFetch("/$batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  });

  // Graph doesn't guarantee response order, so match back by id.
  return responses.map((response) => ({
    oldMessageId: messageIds[Number(response.id)],
    newMessageId: response.body?.id ?? null,
    success: response.status >= 200 && response.status < 300,
    status: response.status,
  }));
}

export const moveEmails = {
  name: "move_emails",
  config: {
    title: "Move Emails",
    description:
      "Moves one or more emails into a folder given by a well-known name (archive, inbox, ...), a folder id, or an exact folder display name. Moving changes each message's id; the new ids are in the result. Only call this after the human user has confirmed. Requires confirm: true.",
    inputSchema: fromJsonSchema({
      type: "object",
      properties: {
        messageIds: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          description: "Graph message IDs to move",
        },
        destinationFolder: {
          type: "string",
          description: "Well-known folder name, folder id, or exact folder display name",
        },
        createIfMissing: {
          type: "boolean",
          default: false,
          description: "Create a top-level folder with that display name if it doesn't exist",
        },
        confirm: {
          type: "boolean",
          description: "Must be true. Set only after the human user has confirmed the move.",
        },
      },
      required: ["messageIds", "destinationFolder", "confirm"],
    }),
  },
  handler: async ({ messageIds, destinationFolder, createIfMissing = false, confirm }) => {
    if (confirm !== true) {
      return {
        content: [
          {
            type: "text",
            text: "Move cancelled: ask the human user to confirm before calling this tool with confirm: true.",
          },
        ],
      };
    }

    try {
      const destinationId = await resolveDestinationId(destinationFolder, createIfMissing);
      if (!destinationId) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Folder '${destinationFolder}' not found. Pass createIfMissing: true or an exact folder id.`,
            },
          ],
        };
      }

      const chunks = chunk(messageIds, BATCH_LIMIT);
      const results = [];
      for (let i = 0; i < chunks.length; i++) {
        console.error(`[move_emails] chunk ${i + 1}/${chunks.length} (${chunks[i].length} emails)`);
        results.push(...(await moveBatch(chunks[i], destinationId)));
      }

      const movedCount = results.filter((r) => r.success).length;
      return {
        content: [
          {
            type: "text",
            text: `Moved ${movedCount}/${messageIds.length} emails to '${destinationFolder}'.\n${JSON.stringify(results, null, 2)}`,
          },
        ],
      };
    } catch (err) {
      // Surface network/timeout/Graph errors as a clear result instead of an unhandled failure.
      return {
        isError: true,
        content: [{ type: "text", text: `move_emails failed: ${err.message}` }],
      };
    }
  },
};
