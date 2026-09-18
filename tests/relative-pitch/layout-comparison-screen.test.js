import { test } from "node:test";
import assert from "node:assert/strict";
import { ANSWER_LABELS } from "../../src/relative-pitch/layout-comparison-screen.js";

test("ANSWER_LABELSは、仕様11.1の12種類に「ド」「高いド」を加えた14種類(2026-09-18更新)", () => {
  assert.deepEqual(ANSWER_LABELS.map((l) => l.text), [
    "ド", "ド♯", "レ", "レ♯", "ミ", "ファ", "ファ♯",
    "ソ", "ソ♯", "ラ", "ラ♯", "シ", "ド↑", "ド♯↑",
  ]);
});

test("ANSWER_LABELS: 「#」を含むラベルには♭側の異名同音表記が付く", () => {
  assert.deepEqual(ANSWER_LABELS.map((l) => l.enharmonic), [
    null, "レ♭", null, "ミ♭", null, null, "ソ♭",
    null, "ラ♭", null, "シ♭", null, null, "レ♭↑",
  ]);
});

test("ANSWER_LABELS: 末尾2つ(高いド・高いド#)だけextraがtrue(2026-09-18更新)", () => {
  assert.deepEqual(ANSWER_LABELS.map((l) => l.extra), [
    false, false, false, false, false, false, false,
    false, false, false, false, false, true, true,
  ]);
});

// renderAnswerPanel/showLayoutComparisonScreenはDOM(document)を直接書き換えるため、
// app.js(tests/app.test.js参照)と同じ理由でNode環境からのテストには向かない。
// ここでは、documentが存在しない環境(Node)でimportしても例外にならないことだけを確認し、
// 実際のボタン描画・クリック時の色変化・レイアウト切り替えは手動でのブラウザ確認で検証する。
test("document が無い環境でも layout-comparison-screen.js のimportで例外にならない", async () => {
  await assert.doesNotReject(import("../../src/relative-pitch/layout-comparison-screen.js"));
});

test("document が無い環境でも answer-panel.js のimportで例外にならない", async () => {
  await assert.doesNotReject(import("../../src/shared/answer-panel.js"));
});
