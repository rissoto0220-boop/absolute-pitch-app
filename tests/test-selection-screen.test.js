import { test } from "node:test";
import assert from "node:assert/strict";

// showTestSelectionScreenはDOM(document)を直接書き換えるため、他の画面と同じ理由で
// Node環境からのテストには向かない。importで例外にならないことだけを確認し、
// 実際の表示・遷移は手動でのブラウザ確認で検証する。
test("document が無い環境でも test-selection-screen.js のimportで例外にならない", async () => {
  await assert.doesNotReject(import("../src/shared/test-selection-screen.js"));
});
