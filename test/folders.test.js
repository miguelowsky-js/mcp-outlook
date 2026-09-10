import { test } from "node:test";
import assert from "node:assert/strict";
import {
  wellKnownFolder,
  findFolderByName,
  looksLikeFolderId,
  buildMoveRequests,
} from "../src/lib/folders.js";

test("wellKnownFolder normalises case and whitespace", () => {
  assert.equal(wellKnownFolder("Inbox"), "inbox");
  assert.equal(wellKnownFolder("  JUNKEMAIL "), "junkemail");
});

test("wellKnownFolder returns null for a non-well-known name", () => {
  assert.equal(wellKnownFolder("Receipts"), null);
  assert.equal(wellKnownFolder(""), null);
});

test("findFolderByName matches displayName case-insensitively", () => {
  const folders = [{ displayName: "Receipts", id: "AAA" }];
  assert.deepEqual(findFolderByName(folders, "receipts"), { displayName: "Receipts", id: "AAA" });
});

test("findFolderByName returns null when nothing matches", () => {
  assert.equal(findFolderByName([{ displayName: "Receipts", id: "AAA" }], "missing"), null);
  assert.equal(findFolderByName([], "anything"), null);
});

test("findFolderByName returns the first of two same-named folders", () => {
  const folders = [
    { displayName: "Work", id: "1" },
    { displayName: "work", id: "2" },
  ];
  assert.equal(findFolderByName(folders, "WORK").id, "1");
});

test("looksLikeFolderId is true only for long whitespace-free strings", () => {
  assert.equal(looksLikeFolderId("AQMkAGI2ThisIsAPretendGraphFolderIdThatIsLongEnough123"), true);
  assert.equal(looksLikeFolderId("Finance"), false);
  assert.equal(looksLikeFolderId("My Folder Name That Is Long But Has Spaces In It"), false);
});

test("buildMoveRequests builds one $batch sub-request per message id", () => {
  assert.deepEqual(buildMoveRequests(["m1", "m2"], "archive"), [
    {
      id: "0",
      method: "POST",
      url: "/me/messages/m1/move",
      headers: { "Content-Type": "application/json" },
      body: { destinationId: "archive" },
    },
    {
      id: "1",
      method: "POST",
      url: "/me/messages/m2/move",
      headers: { "Content-Type": "application/json" },
      body: { destinationId: "archive" },
    },
  ]);
});

test("buildMoveRequests returns an empty array for no ids", () => {
  assert.deepEqual(buildMoveRequests([], "deleteditems"), []);
});
