// Pure helpers for resolving a folder name/id and building $batch move requests.
// No imports here so this stays unit-testable without loading config.js.

// Graph accepts these names directly wherever a folder id is expected.
export const WELL_KNOWN_FOLDERS = Object.freeze([
  "inbox",
  "archive",
  "deleteditems",
  "drafts",
  "sentitems",
  "junkemail",
]);

// Returns the normalised well-known name, or null if it isn't one.
export function wellKnownFolder(name) {
  const normalised = String(name ?? "").trim().toLowerCase();
  return WELL_KNOWN_FOLDERS.includes(normalised) ? normalised : null;
}

// Case-insensitive displayName lookup over a GET /me/mailFolders value[].
// Display names aren't guaranteed unique, so the first match wins.
export function findFolderByName(folderList, name) {
  const target = String(name ?? "").trim().toLowerCase();
  if (!target) return null;
  return (folderList ?? []).find((f) => String(f.displayName ?? "").toLowerCase() === target) ?? null;
}

// Heuristic: Graph folder ids are long, whitespace-free base64-ish strings.
// Lets move_emails try an unresolved string as a raw id before giving up.
export function looksLikeFolderId(value) {
  const str = String(value ?? "");
  return str.length > 40 && !/\s/.test(str);
}

// Builds the $batch sub-requests that move each message to destinationId.
// Shared by move_emails and delete_emails (which moves to "deleteditems").
export function buildMoveRequests(messageIds, destinationId) {
  return messageIds.map((id, index) => ({
    id: String(index),
    method: "POST",
    url: `/me/messages/${id}/move`,
    headers: { "Content-Type": "application/json" },
    body: { destinationId },
  }));
}
