import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDisplayDateTime } from "../src/shared/display-format.js";

test("formatDisplayDateTime: ISO 8601形式を読みやすい表記に変換する", () => {
  const result = formatDisplayDateTime("2026-08-24T09:51:57.109+09:00");
  // タイムゾーンはテスト実行環境に依存するため、年月日と区切り記号の形だけを確認する。
  assert.match(result, /^2026\/08\/24 \d{2}:\d{2}$/);
});

test("formatDisplayDateTime: 解釈できない文字列はそのまま返す", () => {
  assert.equal(formatDisplayDateTime("not-a-date"), "not-a-date");
});
