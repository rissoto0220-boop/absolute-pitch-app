import { test } from "node:test";
import assert from "node:assert/strict";

// practice-screen.jsはDOM(document)を直接書き換え、実際の音声再生も伴うため、
// app.js(tests/app.test.js参照)と同じ理由でNode環境からのテストには向かない。
// ここではimportで例外にならないことだけを確認し、実際の画面遷移・フィードバック表示・
// 練習スキップの分岐は手動でのブラウザ確認で検証する。
test("document が無い環境でも practice-screen.js のimportで例外にならない", async () => {
  await assert.doesNotReject(import("../../src/relative-pitch/practice-screen.js"));
});
