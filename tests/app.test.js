import { test } from "node:test";
import assert from "node:assert/strict";

// app.js はフェーズ1の配列方式から、デモと同じ「画面ごとの関数が次の画面を呼ぶ」方式に変更した。
// 画面はDOM(document)を直接書き換えるため、Node環境からのテストには向かない。
// ここでは、document が存在しない環境(Node)でimportしても例外にならないこと
// (画面起動処理が document の有無で正しくガードされていること)だけを確認する。
// 実際の画面遷移・音声再生・タイマーは development-handover.md 12.4 の方針どおり、
// 手動でのブラウザ確認(README参照)で検証する。
test("document が無い環境でも app.js のimportで例外にならない", async () => {
  await assert.doesNotReject(import("../app.js"));
});
