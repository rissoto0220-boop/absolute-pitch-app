import { test } from "node:test";
import assert from "node:assert/strict";
import { SCREENS, renderScreenHtml } from "../app.js";

test("画面の並び順が仕様6.1の遷移順と一致する", () => {
  const expectedKeys = [
    "id-entry",
    "id-confirm",
    "practice-intro",
    "question",
    "test-confirm",
    "result",
    "history",
  ];
  assert.deepEqual(SCREENS.map((s) => s.key), expectedKeys);
});

test("各プレースホルダー画面にタイトルが表示される", () => {
  SCREENS.forEach((screen, index) => {
    const html = renderScreenHtml(index);
    assert.ok(html.includes(screen.title));
  });
});

test("最初の画面には「戻る」ボタンがない", () => {
  const html = renderScreenHtml(0);
  assert.ok(!html.includes('id="back"'));
  assert.ok(html.includes('id="next"'));
});

test("最後の画面には「次へ」ボタンがない", () => {
  const html = renderScreenHtml(SCREENS.length - 1);
  assert.ok(!html.includes('id="next"'));
  assert.ok(html.includes('id="back"'));
});
