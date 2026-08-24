import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "../src/shared/csv.js";

test("toCsv: ヘッダー行とデータ行をCRLF区切りで並べる", () => {
  const csv = toCsv(["a", "b"], [{ a: 1, b: "x" }, { a: 2, b: "y" }]);
  assert.equal(csv, "a,b\r\n1,x\r\n2,y\r\n");
});

test("toCsv: 空値は空文字として出力する", () => {
  const csv = toCsv(["a", "b"], [{ a: "", b: undefined }]);
  assert.equal(csv, "a,b\r\n,\r\n");
});

test("toCsv: カンマを含む値はダブルクォートで囲む", () => {
  const csv = toCsv(["note"], [{ note: "C,D" }]);
  assert.equal(csv, "note\r\n\"C,D\"\r\n");
});

test("toCsv: ダブルクォートを含む値は二重にしてクォートで囲む", () => {
  const csv = toCsv(["note"], [{ note: 'say "hi"' }]);
  assert.equal(csv, 'note\r\n"say ""hi"""\r\n');
});

test("toCsv: 改行を含む値はクォートで囲む", () => {
  const csv = toCsv(["note"], [{ note: "line1\nline2" }]);
  assert.equal(csv, 'note\r\n"line1\nline2"\r\n');
});
