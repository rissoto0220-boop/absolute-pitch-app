import { test } from "node:test";
import assert from "node:assert/strict";

// history-screen.jsはDOM(document)を直接書き換えるため、app.js(tests/app.test.js参照)と
// 同じ理由でNode環境からのテストには向かない。ここではimportで例外にならないことだけを確認し、
// 実際の一覧表示・CSVダウンロードは手動でのブラウザ確認で検証する
// (行データ自体の正しさはtests/relative-pitch/reports.test.jsで検証済み)。
test("document が無い環境でも history-screen.js のimportで例外にならない", async () => {
  await assert.doesNotReject(import("../../src/relative-pitch/history-screen.js"));
});
