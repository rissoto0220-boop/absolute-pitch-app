import { test } from "node:test";
import assert from "node:assert/strict";
import { hasCompletedSession } from "../../src/relative-pitch/practice-history.js";

test("完了済みの相対音感簡易版セッションが1件でもあればtrue(仕様13.4)", () => {
  const sessions = [
    { testType: "relative_pitch", testVersion: "simplified", sessionStatus: "completed" },
  ];
  assert.equal(hasCompletedSession(sessions, "simplified"), true);
});

test("セッションが1件もなければfalse(初回として扱う)", () => {
  assert.equal(hasCompletedSession([], "simplified"), false);
});

test("中断履歴だけでは完了済みとみなさない(仕様13.4)", () => {
  const sessions = [
    { testType: "relative_pitch", testVersion: "simplified", sessionStatus: "interrupted" },
  ];
  assert.equal(hasCompletedSession(sessions, "simplified"), false);
});

test("絶対音感のセッションは対象に含めない", () => {
  const sessions = [
    { testType: "absolute_pitch", testVersion: undefined, sessionStatus: "completed" },
  ];
  assert.equal(hasCompletedSession(sessions, "simplified"), false);
});

test("完全版(test_version = full)は簡易版の完了済み判定に含めない", () => {
  const sessions = [
    { testType: "relative_pitch", testVersion: "full", sessionStatus: "completed" },
  ];
  assert.equal(hasCompletedSession(sessions, "simplified"), false);
});

test("簡易版(test_version = simplified)は完全版の完了済み判定に含めない(仕様19章と同じ考え方、2026-09-18追加)", () => {
  const sessions = [
    { testType: "relative_pitch", testVersion: "simplified", sessionStatus: "completed" },
  ];
  assert.equal(hasCompletedSession(sessions, "full"), false);
});

test("完了済みの完全版セッションが1件でもあればtrue(2026-09-18追加)", () => {
  const sessions = [
    { testType: "relative_pitch", testVersion: "full", sessionStatus: "completed" },
  ];
  assert.equal(hasCompletedSession(sessions, "full"), true);
});

test("複数セッションが混在していても、条件に合う1件があればtrue", () => {
  const sessions = [
    { testType: "relative_pitch", testVersion: "simplified", sessionStatus: "interrupted" },
    { testType: "absolute_pitch", sessionStatus: "completed" },
    { testType: "relative_pitch", testVersion: "simplified", sessionStatus: "completed" },
  ];
  assert.equal(hasCompletedSession(sessions, "simplified"), true);
});
