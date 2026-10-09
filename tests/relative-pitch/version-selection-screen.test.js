import { test } from "node:test";
import assert from "node:assert/strict";

// showVersionSelectionScreenはDOM(document)を直接書き換えるため、他のrelative-pitch画面
// (answer-labels.test.js参照)と同じ理由でNode環境からのテストには向かない。
// ここでは、documentが存在しない環境(Node)でimportしても例外にならないことだけを確認し、
// 実際のボタン描画・クリック時の遷移は手動でのブラウザ確認で検証する。
test("document が無い環境でも version-selection-screen.js のimportで例外にならない", async () => {
  await assert.doesNotReject(import("../../src/relative-pitch/version-selection-screen.js"));
});
