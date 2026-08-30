import { test } from "node:test";
import assert from "node:assert/strict";

// question-timeline-demo-screen.jsはDOM(document)・実際の音声再生を伴うため、
// app.js(tests/app.test.js参照)と同じ理由でNode環境からのテストには向かない。
// ここではimportで例外にならないことだけを確認し、実際のタイミング・表示は手動でのブラウザ確認で検証する。
test("document が無い環境でも question-timeline-demo-screen.js のimportで例外にならない", async () => {
  await assert.doesNotReject(import("../../src/relative-pitch/question-timeline-demo-screen.js"));
});
