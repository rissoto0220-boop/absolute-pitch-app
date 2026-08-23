import { test } from "node:test";
import assert from "node:assert/strict";
import { createAnswerLock } from "../src/shared/answer-lock.js";

test("最初のtryLock()はtrueを返し、ロックされる", () => {
  const lock = createAnswerLock();
  assert.equal(lock.isLocked(), false);
  assert.equal(lock.tryLock(), true);
  assert.equal(lock.isLocked(), true);
});

test("2回目以降のtryLock()はfalseを返す(二重回答防止)", () => {
  const lock = createAnswerLock();
  lock.tryLock();
  assert.equal(lock.tryLock(), false);
  assert.equal(lock.tryLock(), false);
  assert.equal(lock.isLocked(), true);
});
