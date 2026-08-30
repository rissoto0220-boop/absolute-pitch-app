// 相対音感テスト(簡易版)の半音差・階名・目的音の対応表(仕様書 relative-pitch-test-spec.md §9〜10・13)。
// 絶対音感固有の処理(src/absolute-pitch/)とは混在させず、相対音感固有のデータとしてここに置く。

// キーごとの基準音(=そのキーの「ド」、仕様9.2)。
export const KEY_BASE_NOTES = {
  C: "C4",
  Fis: "Fis4",
};

// 使用する半音差の12種類(仕様10.1)。半音差0と12は出題しない。
export const INTERVAL_SEMITONES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13];

// 半音差ごとの階名定義(仕様10.2)。
// code: 正解判定に使う内部コード(参加者へは表示しない)。
// displayLabel: 参加者向けのカタカナ表示。
// intervalLabel/scaleLabel: 属性ペア分類用(仕様12.1)。
export const SYLLABLES_BY_SEMITONE = {
  1: { code: "DiM", displayLabel: "ド♯", intervalLabel: "short", scaleLabel: "out" },
  2: { code: "ReM", displayLabel: "レ", intervalLabel: "short", scaleLabel: "in" },
  3: { code: "RiM", displayLabel: "レ♯", intervalLabel: "short", scaleLabel: "out" },
  4: { code: "MiM", displayLabel: "ミ", intervalLabel: "short", scaleLabel: "in" },
  5: { code: "FaM", displayLabel: "ファ", intervalLabel: "mid", scaleLabel: "in" },
  6: { code: "FiM", displayLabel: "ファ♯", intervalLabel: "mid", scaleLabel: "out" },
  7: { code: "SoM", displayLabel: "ソ", intervalLabel: "mid", scaleLabel: "in" },
  8: { code: "SiM", displayLabel: "ソ♯", intervalLabel: "mid", scaleLabel: "out" },
  9: { code: "LaM", displayLabel: "ラ", intervalLabel: "long", scaleLabel: "in" },
  10: { code: "LiM", displayLabel: "ラ♯", intervalLabel: "long", scaleLabel: "out" },
  11: { code: "TiM", displayLabel: "シ", intervalLabel: "long", scaleLabel: "in" },
  13: { code: "diH", displayLabel: "ド♯↑", intervalLabel: "long", scaleLabel: "out" },
};

// キーごとの目的音対応表(仕様10.3・10.4)。
const TARGET_NOTES_BY_KEY = {
  C: {
    1: "Cis4", 2: "D4", 3: "Dis4", 4: "E4", 5: "F4", 6: "Fis4",
    7: "G4", 8: "Gis4", 9: "A4", 10: "Ais4", 11: "H4", 13: "Cis5",
  },
  Fis: {
    1: "G4", 2: "Gis4", 3: "A4", 4: "Ais4", 5: "H4", 6: "C5",
    7: "Cis5", 8: "D5", 9: "Dis5", 10: "E5", 11: "F5", 13: "G5",
  },
};

export function syllableFor(semitone) {
  return SYLLABLES_BY_SEMITONE[semitone];
}

export function targetNoteFor(keyCode, semitone) {
  return TARGET_NOTES_BY_KEY[keyCode][semitone];
}

// キーと半音差から、1問分の情報一式を組み立てる。
// 練習(固定3問)・本番(生成された12問)の両方から使う共通の組み立て処理。
export function buildQuestion(keyCode, semitone) {
  const syllable = syllableFor(semitone);
  return {
    keyCode,
    intervalSemitones: semitone,
    syllableCode: syllable.code,
    displayLabel: syllable.displayLabel,
    intervalLabel: syllable.intervalLabel,
    scaleLabel: syllable.scaleLabel,
    referenceNote: KEY_BASE_NOTES[keyCode],
    targetNote: targetNoteFor(keyCode, semitone),
  };
}

// カデンツWAVのファイル名(仕様8.1)。
export function cadenceFilenameFor(keyCode) {
  return `cadence_${keyCode}.wav`;
}

// 基準音WAVのファイル名。既存の絶対音感WAV(2秒、加工なし)とは別の、
// 基準音専用の新規WAV(1秒+短いフェードアウト)を使う(仕様9.1、2026-08-30確定)。
export function referenceFilenameFor(keyCode) {
  return `reference_${KEY_BASE_NOTES[keyCode]}.wav`;
}

// 目的音WAVのファイル名。絶対音感テストで使用している既存の単音WAVをそのまま共用する(仕様9.1・9.4)。
export function targetFilenameFor(note) {
  return `${note}.wav`;
}

// 練習固定3問(仕様13.1)。この順番で1回だけ提示する。ランダム化しない。
export const PRACTICE_QUESTIONS = [
  buildQuestion("C", 4),
  buildQuestion("C", 8),
  buildQuestion("Fis", 4),
];
