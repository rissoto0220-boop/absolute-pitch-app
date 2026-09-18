// 相対音感テスト(簡易版・完全版)の半音差・階名・目的音の対応表
// (仕様書 relative-pitch-test-spec.md §6.2・§9〜10・13)。
// 絶対音感固有の処理(src/absolute-pitch/)とは混在させず、相対音感固有のデータとしてここに置く。

// キーごとの基準音(=そのキーの「ド」、仕様9.2)。参加者・研究者向けの表記に合わせた綴りを使う
// (Esは♭系表記。目的音の計算では異名同音として扱う。下のCHROMATIC_INDEX_BY_KEY参照)。
export const KEY_BASE_NOTES = {
  C: "C4",
  Es: "Es4",
  Fis: "Fis4",
  A: "A4",
};

// 完全版で使用する4キー(仕様6.2、2026-09-18確定)。
export const FULL_KEYS = ["C", "Es", "Fis", "A"];

// 使用する半音差の12種類(仕様10.1)。半音差0と12は出題しない。簡易版専用。
export const INTERVAL_SEMITONES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13];

// 完全版で使用する半音差の11種類(仕様6.2、2026-09-18確定)。
// 簡易版の12種類から、オクターブを超える半音差13を除いた単純な連続集合。
export const FULL_INTERVAL_SEMITONES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// 半音差ごとの階名定義(仕様10.2)。
// code: 正解判定に使う内部コード(参加者へは表示しない)。
// displayLabel: 参加者向けのカタカナ表示。
// enharmonicLabel: 「#」を含む表記に併記する♭側の異名同音表記(2026-09-17追加)。無い場合はnull。
// intervalLabel/scaleLabel: 属性ペア分類用(仕様12.1)。
export const SYLLABLES_BY_SEMITONE = {
  // 半音差0(基準音そのもの、「ド」)は出題対象ではないが、回答の選択肢としては表示する
  // (2026-09-17追加)。属性ペア分類の対象外のため、intervalLabel/scaleLabelはnull。
  0: { code: "DoM", displayLabel: "ド", enharmonicLabel: null, intervalLabel: null, scaleLabel: null },
  1: { code: "DiM", displayLabel: "ド♯", enharmonicLabel: "レ♭", intervalLabel: "short", scaleLabel: "out" },
  2: { code: "ReM", displayLabel: "レ", enharmonicLabel: null, intervalLabel: "short", scaleLabel: "in" },
  3: { code: "RiM", displayLabel: "レ♯", enharmonicLabel: "ミ♭", intervalLabel: "short", scaleLabel: "out" },
  4: { code: "MiM", displayLabel: "ミ", enharmonicLabel: null, intervalLabel: "short", scaleLabel: "in" },
  5: { code: "FaM", displayLabel: "ファ", enharmonicLabel: null, intervalLabel: "mid", scaleLabel: "in" },
  6: { code: "FiM", displayLabel: "ファ♯", enharmonicLabel: "ソ♭", intervalLabel: "mid", scaleLabel: "out" },
  7: { code: "SoM", displayLabel: "ソ", enharmonicLabel: null, intervalLabel: "mid", scaleLabel: "in" },
  8: { code: "SiM", displayLabel: "ソ♯", enharmonicLabel: "ラ♭", intervalLabel: "mid", scaleLabel: "out" },
  9: { code: "LaM", displayLabel: "ラ", enharmonicLabel: null, intervalLabel: "long", scaleLabel: "in" },
  10: { code: "LiM", displayLabel: "ラ♯", enharmonicLabel: "シ♭", intervalLabel: "long", scaleLabel: "out" },
  11: { code: "TiM", displayLabel: "シ", enharmonicLabel: null, intervalLabel: "long", scaleLabel: "in" },
  // 半音差12(1オクターブ上の「ド」)も、半音差0と同じく出題対象ではないが、
  // 回答の選択肢としては表示する(2026-09-18追加)。
  12: { code: "doH", displayLabel: "ド↑", enharmonicLabel: null, intervalLabel: null, scaleLabel: null },
  13: { code: "diH", displayLabel: "ド♯↑", enharmonicLabel: "レ♭↑", intervalLabel: "long", scaleLabel: "out" },
};

// 回答ボタンとして表示する半音差(2026-09-17追加、2026-09-18に半音差12を追加)。
// 半音差0〜13の連番14種類。「出題される半音差」(INTERVAL_SEMITONES)と「回答ボタンとして
// 表示する半音差」を分けることで、出題ロジック(question-generator.js等)には一切影響しない。
// 半音差0・12はisCorrectAnswer()のどの問題の正解にも一致しないため、これらを押すと
// 自動的に不正解として扱われる(正解判定ロジックの変更は不要)。
export const ANSWER_BUTTON_SEMITONES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

// 完全版の回答ボタンとして表示する半音差(仕様6.2「回答ボタン」、2026-09-18確定)。
// 「ド」(0)にFULL_INTERVAL_SEMITONES(1〜11)を加えた12種類。完全版はオクターブ重複音
// (半音差12・13)を出題しないため、対応する重複ボタンも不要。
export const FULL_ANSWER_BUTTON_SEMITONES = [0, ...FULL_INTERVAL_SEMITONES];

// 目的音の計算に使う、絶対音感の音源ライブラリと同じ命名(♯系のみ、public/sounds/参照)の
// 半音階。目的音WAVは絶対音感の既存単音WAVを共用するため、常にこの命名で解決する必要がある。
const CHROMATIC_SCALE = ["C", "Cis", "D", "Dis", "E", "F", "Fis", "G", "Gis", "A", "Ais", "H"];

// 各キーの主音が、上のCHROMATIC_SCALEの何番目(オクターブ4基準)にあたるかの対応。
// KeyEsは♭系表記だが、既存音源(♯系命名)を参照するため異名同音のDis(index 3)として扱う
// (仕様6.2「Key Esの内部処理」、2026-09-18確定)。
const CHROMATIC_INDEX_BY_KEY = { C: 0, Es: 3, Fis: 6, A: 9 };

export function syllableFor(semitone) {
  return SYLLABLES_BY_SEMITONE[semitone];
}

// 基準音(主音)から半音差ぶん上の目的音を計算する(仕様10.3・10.4・6.2)。
// 常にCHROMATIC_SCALEの♯系命名で返すため、キーの表記(EsのようなB系含む)に関わらず
// 既存の絶対音感音源ライブラリを正しく参照できる。
export function targetNoteFor(keyCode, semitone) {
  const totalIndex = CHROMATIC_INDEX_BY_KEY[keyCode] + semitone;
  const noteName = CHROMATIC_SCALE[totalIndex % 12];
  const octave = 4 + Math.floor(totalIndex / 12);
  return `${noteName}${octave}`;
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

// 正解判定は半音差(内部コード)を基準に行い、参加者向け表示文字列(displayLabel)を
// 正解判定の基準にはしない(仕様10.2)。
export function isCorrectAnswer(question, responseSemitone) {
  return question.intervalSemitones === responseSemitone;
}

// 練習固定3問(仕様13.1)。この順番で1回だけ提示する。ランダム化しない。
// 完全版もこの3問をそのまま流用する(仕様6.2「練習問題」、2026-09-18更新)。
export const PRACTICE_QUESTIONS = [
  buildQuestion("C", 4),
  buildQuestion("C", 8),
  buildQuestion("Fis", 4),
];
