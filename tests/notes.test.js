import { test } from "node:test";
import assert from "node:assert/strict";
import { NOTES, noteByNumber, PRACTICE_STIMULUS_NUMBERS } from "../src/absolute-pitch/notes.js";

test("NOTESは60件で、刺激番号が1から60まで連続する", () => {
  assert.equal(NOTES.length, 60);
  NOTES.forEach((note, index) => {
    assert.equal(note.number, index + 1);
  });
});

test("noteByNumber(1)はC2、noteByNumber(60)はH6(英語式B)", () => {
  assert.equal(noteByNumber(1).germanNote, "C2");
  assert.equal(noteByNumber(1).answer, "C");
  assert.equal(noteByNumber(60).germanNote, "H6");
  assert.equal(noteByNumber(60).answer, "B");
});

test("練習の固定3問はD2・F4・A#6(仕様9.2)", () => {
  const practiceNotes = PRACTICE_STIMULUS_NUMBERS.map(noteByNumber);
  assert.deepEqual(
    practiceNotes.map((n) => [n.germanNote, n.answer]),
    [["D2", "D"], ["F4", "F"], ["Ais6", "A#"]],
  );
});

test("ファイル名はドイツ音名+.wavと一致する", () => {
  NOTES.forEach((note) => {
    assert.equal(note.filename, `${note.germanNote}.wav`);
  });
});
