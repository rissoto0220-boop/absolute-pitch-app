import { test } from "node:test";
import assert from "node:assert/strict";
import { ANSWER_LABELS } from "../../src/relative-pitch/layout-comparison-screen.js";

test("ANSWER_LABELSは仕様11.1の通り、半音差の小さい順の12種類", () => {
  assert.deepEqual(ANSWER_LABELS, [
    "ド♯", "レ", "レ♯", "ミ", "ファ", "ファ♯",
    "ソ", "ソ♯", "ラ", "ラ♯", "シ", "ド♯↑",
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
