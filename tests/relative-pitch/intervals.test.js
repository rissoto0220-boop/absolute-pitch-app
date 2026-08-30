import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INTERVAL_SEMITONES,
  SYLLABLES_BY_SEMITONE,
  KEY_BASE_NOTES,
  syllableFor,
  targetNoteFor,
  buildQuestion,
  PRACTICE_QUESTIONS,
  cadenceFilenameFor,
  referenceFilenameFor,
  targetFilenameFor,
} from "../../src/relative-pitch/intervals.js";

test("半音差は12種類(1〜11・13)。0と12は含まない", () => {
  assert.deepEqual(INTERVAL_SEMITONES, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13]);
  assert.equal(INTERVAL_SEMITONES.includes(0), false);
  assert.equal(INTERVAL_SEMITONES.includes(12), false);
});

test("半音差と内部コードの対応(仕様10.2)", () => {
  const expected = {
    1: "DiM", 2: "ReM", 3: "RiM", 4: "MiM", 5: "FaM", 6: "FiM",
    7: "SoM", 8: "SiM", 9: "LaM", 10: "LiM", 11: "TiM", 13: "diH",
  };
  INTERVAL_SEMITONES.forEach((semitone) => {
    assert.equal(syllableFor(semitone).code, expected[semitone]);
  });
});

test("半音差と参加者向け表示ラベルの対応(仕様10.2)", () => {
  const expected = {
    1: "ド♯", 2: "レ", 3: "レ♯", 4: "ミ", 5: "ファ", 6: "ファ♯",
    7: "ソ", 8: "ソ♯", 9: "ラ", 10: "ラ♯", 11: "シ", 13: "ド♯↑",
  };
  INTERVAL_SEMITONES.forEach((semitone) => {
    assert.equal(syllableFor(semitone).displayLabel, expected[semitone]);
  });
});

test("半音差とinterval_label・scale_labelの対応(仕様10.2・12.1の属性ペアと整合)", () => {
  assert.deepEqual(
    [SYLLABLES_BY_SEMITONE[1].intervalLabel, SYLLABLES_BY_SEMITONE[1].scaleLabel],
    ["short", "out"],
  );
  assert.deepEqual(
    [SYLLABLES_BY_SEMITONE[7].intervalLabel, SYLLABLES_BY_SEMITONE[7].scaleLabel],
    ["mid", "in"],
  );
  assert.deepEqual(
    [SYLLABLES_BY_SEMITONE[13].intervalLabel, SYLLABLES_BY_SEMITONE[13].scaleLabel],
    ["long", "out"],
  );
});

test("Key Cの基準音はC4、目的音の計算は仕様10.3の通り", () => {
  assert.equal(KEY_BASE_NOTES.C, "C4");
  const expected = {
    1: "Cis4", 2: "D4", 3: "Dis4", 4: "E4", 5: "F4", 6: "Fis4",
    7: "G4", 8: "Gis4", 9: "A4", 10: "Ais4", 11: "H4", 13: "Cis5",
  };
  INTERVAL_SEMITONES.forEach((semitone) => {
    assert.equal(targetNoteFor("C", semitone), expected[semitone]);
  });
});

test("Key Fisの基準音はFis4、目的音の計算は仕様10.4の通り", () => {
  assert.equal(KEY_BASE_NOTES.Fis, "Fis4");
  const expected = {
    1: "G4", 2: "Gis4", 3: "A4", 4: "Ais4", 5: "H4", 6: "C5",
    7: "Cis5", 8: "D5", 9: "Dis5", 10: "E5", 11: "F5", 13: "G5",
  };
  INTERVAL_SEMITONES.forEach((semitone) => {
    assert.equal(targetNoteFor("Fis", semitone), expected[semitone]);
  });
});

test("buildQuestionは半音差から1問分の情報一式を組み立てる", () => {
  const question = buildQuestion("C", 8);
  assert.deepEqual(question, {
    keyCode: "C",
    intervalSemitones: 8,
    syllableCode: "SiM",
    displayLabel: "ソ♯",
    intervalLabel: "mid",
    scaleLabel: "out",
    referenceNote: "C4",
    targetNote: "Gis4",
  });
});

test("音源ファイル名の解決(仕様8.1・9.1)", () => {
  assert.equal(cadenceFilenameFor("C"), "cadence_C.wav");
  assert.equal(cadenceFilenameFor("Fis"), "cadence_Fis.wav");
  assert.equal(referenceFilenameFor("C"), "reference_C4.wav");
  assert.equal(referenceFilenameFor("Fis"), "reference_Fis4.wav");
  assert.equal(targetFilenameFor("E4"), "E4.wav");
  assert.equal(targetFilenameFor("Cis5"), "Cis5.wav");
});

test("練習の固定3問は仕様13.1の通り(Key C:ミ, Key C:ソ♯, Key Fis:ミ)", () => {
  assert.equal(PRACTICE_QUESTIONS.length, 3);
  assert.deepEqual(
    PRACTICE_QUESTIONS.map((q) => [q.keyCode, q.intervalSemitones, q.syllableCode, q.displayLabel, q.targetNote]),
    [
      ["C", 4, "MiM", "ミ", "E4"],
      ["C", 8, "SiM", "ソ♯", "Gis4"],
      ["Fis", 4, "MiM", "ミ", "Ais4"],
    ],
  );
});
