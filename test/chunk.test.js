import { test } from "node:test";
import assert from "node:assert/strict";
import { chunk } from "../src/lib/chunk.js";

test("splits an array into equal-sized chunks", () => {
  assert.deepEqual(chunk([1, 2, 3, 4], 2), [
    [1, 2],
    [3, 4],
  ]);
});

test("puts the remainder in a smaller last chunk", () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

test("returns a single chunk when size is bigger than the array", () => {
  assert.deepEqual(chunk([1, 2], 10), [[1, 2]]);
});

test("returns an empty array for an empty input", () => {
  assert.deepEqual(chunk([], 5), []);
});
