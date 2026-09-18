import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INTERVAL_SEMITONES,
  FULL_INTERVAL_SEMITONES,
  FULL_KEYS,
  SYLLABLES_BY_SEMITONE,
  ANSWER_BUTTON_SEMITONES,
  FULL_ANSWER_BUTTON_SEMITONES,
  KEY_BASE_NOTES,
  syllableFor,
  targetNoteFor,
  buildQuestion,
  isCorrectAnswer,
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

test("半音差0(「ド」)は出題対象ではないが、回答ボタン用の階名定義を持つ(2026-09-17追加)", () => {
  const syllable = syllableFor(0);
  assert.equal(syllable.code, "DoM");
  assert.equal(syllable.displayLabel, "ド");
  assert.equal(syllable.enharmonicLabel, null);
  assert.equal(INTERVAL_SEMITONES.includes(0), false, "出題対象のINTERVAL_SEMITONESには含まれない");
});

test("ANSWER_BUTTON_SEMITONES: 半音差0〜13の連番14種類で、INTERVAL_SEMITONESは変更しない(2026-09-18更新)", () => {
  assert.deepEqual(ANSWER_BUTTON_SEMITONES, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  assert.equal(ANSWER_BUTTON_SEMITONES.length, 14);
  assert.deepEqual(INTERVAL_SEMITONES, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13], "既存の出題用リストは不変(半音差12は引き続き出題対象外)");
});

test("半音差12(「高いド」)は出題対象ではないが、回答ボタン用の階名定義を持つ(2026-09-18追加)", () => {
  const syllable = syllableFor(12);
  assert.equal(syllable.code, "doH");
  assert.equal(syllable.displayLabel, "ド↑");
  assert.equal(syllable.enharmonicLabel, null);
  assert.equal(INTERVAL_SEMITONES.includes(12), false, "出題対象のINTERVAL_SEMITONESには含まれない");
});

test("FULL_ANSWER_BUTTON_SEMITONES: 「ド」(0)を先頭に加えた完全版の回答ボタン12種類(仕様6.2、2026-09-18追加)", () => {
  assert.deepEqual(FULL_ANSWER_BUTTON_SEMITONES, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(FULL_ANSWER_BUTTON_SEMITONES.length, 12);
  assert.equal(FULL_ANSWER_BUTTON_SEMITONES.includes(12), false, "オクターブ重複ボタンは含まない");
  assert.equal(FULL_ANSWER_BUTTON_SEMITONES.includes(13), false, "オクターブ重複ボタンは含まない");
});

test("「#」を含む階名には♭側の異名同音表記が付き、それ以外はnull(2026-09-18更新)", () => {
  const expectedEnharmonic = {
    0: null, 1: "レ♭", 2: null, 3: "ミ♭", 4: null, 5: null, 6: "ソ♭",
    7: null, 8: "ラ♭", 9: null, 10: "シ♭", 11: null, 12: null, 13: "レ♭↑",
  };
  ANSWER_BUTTON_SEMITONES.forEach((semitone) => {
    assert.equal(syllableFor(semitone).enharmonicLabel, expectedEnharmonic[semitone]);
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

test("isCorrectAnswerは半音差(内部コード相当)を基準に判定する(仕様10.2)", () => {
  const question = buildQuestion("C", 4); // 正解はミ(半音差4)
  assert.equal(isCorrectAnswer(question, 4), true);
  assert.equal(isCorrectAnswer(question, 8), false);
  assert.equal(isCorrectAnswer(question, 1), false);
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

test("完全版で使用する半音差は1〜11の11種類(仕様6.2、2026-09-18追加)", () => {
  assert.deepEqual(FULL_INTERVAL_SEMITONES, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(FULL_INTERVAL_SEMITONES.includes(13), false, "簡易版だけの半音差13は含まない");
});

test("完全版で使用する4キーはC・Es・Fis・A(仕様6.2、2026-09-18追加)", () => {
  assert.deepEqual(FULL_KEYS, ["C", "Es", "Fis", "A"]);
  FULL_KEYS.forEach((key) => {
    assert.ok(KEY_BASE_NOTES[key], `KEY_BASE_NOTESに${key}の基準音が定義されているはず`);
  });
});

test("Key Esの基準音はEs4(表示用)、目的音の計算は異名同音のDisとして扱う(仕様6.2、2026-09-18追加)", () => {
  assert.equal(KEY_BASE_NOTES.Es, "Es4");
  const expected = {
    1: "E4", 2: "F4", 3: "Fis4", 4: "G4", 5: "Gis4", 6: "A4",
    7: "Ais4", 8: "H4", 9: "C5", 10: "Cis5", 11: "D5",
  };
  FULL_INTERVAL_SEMITONES.forEach((semitone) => {
    assert.equal(targetNoteFor("Es", semitone), expected[semitone]);
  });
});

test("Key Aの基準音はA4、目的音の計算は仕様6.2の通り(2026-09-18追加)", () => {
  assert.equal(KEY_BASE_NOTES.A, "A4");
  const expected = {
    1: "Ais4", 2: "H4", 3: "C5", 4: "Cis5", 5: "D5", 6: "Dis5",
    7: "E5", 8: "F5", 9: "Fis5", 10: "G5", 11: "Gis5",
  };
  FULL_INTERVAL_SEMITONES.forEach((semitone) => {
    assert.equal(targetNoteFor("A", semitone), expected[semitone]);
  });
});

test("cadenceFilenameFor・referenceFilenameForはKey Es・Aでも正しいファイル名を返す(2026-09-18追加)", () => {
  assert.equal(cadenceFilenameFor("Es"), "cadence_Es.wav");
  assert.equal(cadenceFilenameFor("A"), "cadence_A.wav");
  assert.equal(referenceFilenameFor("Es"), "reference_Es4.wav");
  assert.equal(referenceFilenameFor("A"), "reference_A4.wav");
});
