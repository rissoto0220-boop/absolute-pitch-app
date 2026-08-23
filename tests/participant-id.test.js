import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeParticipantId, isValidParticipantId } from "../src/shared/participant-id.js";

test("normalizeParticipantId: 前後の半角スペースを取り除く", () => {
  assert.equal(normalizeParticipantId(" P00001 "), "P00001");
});

test("normalizeParticipantId: 前後の全角スペースを取り除く", () => {
  assert.equal(normalizeParticipantId("　P00001　"), "P00001");
});

test("normalizeParticipantId: 小文字pを大文字に変換する", () => {
  assert.equal(normalizeParticipantId("p00001"), "P00001");
});

test("isValidParticipantId: 正しい形式は合格", () => {
  assert.equal(isValidParticipantId("P00001"), true);
});

test("isValidParticipantId: 空文字は不合格", () => {
  assert.equal(isValidParticipantId(""), false);
});

test("isValidParticipantId: 桁数不足は不合格", () => {
  assert.equal(isValidParticipantId("P001"), false);
});

test("isValidParticipantId: 桁数超過は不合格", () => {
  assert.equal(isValidParticipantId("P000001"), false);
});

test("isValidParticipantId: 先頭がPでなければ不合格", () => {
  assert.equal(isValidParticipantId("A00001"), false);
});

test("isValidParticipantId: 数字部分に文字が混ざると不合格", () => {
  assert.equal(isValidParticipantId("P00A01"), false);
});

test("isValidParticipantId: 小文字のままだと不合格(normalize後に検証する前提)", () => {
  assert.equal(isValidParticipantId("p00001"), false);
});
