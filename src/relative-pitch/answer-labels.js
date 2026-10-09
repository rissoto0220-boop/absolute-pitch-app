// 相対音感テストの回答ボタンに表示するラベル(仕様 relative-pitch-test-spec.md §6.2・§10・§11)。
// 回答レイアウトは円環状に固定したため(2026-10-09)、レイアウトの比較画面は削除し、
// 練習・本番の画面が共通で使うラベル一覧だけをここに置く。
import { ANSWER_BUTTON_SEMITONES, FULL_ANSWER_BUTTON_SEMITONES, syllableFor } from "./intervals.js";

// 半音差から回答ラベル1件を組み立てる。
// text: 主表記、enharmonic: ♭側の異名同音表記(無ければnull)、
// extra: 1オクターブ上の重複音(半音差12・13)かどうか。
function buildAnswerLabel(semitone) {
  const syllable = syllableFor(semitone);
  return {
    text: syllable.displayLabel,
    enharmonic: syllable.enharmonicLabel,
    extra: semitone >= 12,
  };
}

// 簡易版の参加者向け表示ラベル一覧、半音差の小さい順(仕様11.1に「ド」「高いド」を追加)。
export const ANSWER_LABELS = ANSWER_BUTTON_SEMITONES.map(buildAnswerLabel);

// 完全版の参加者向け表示ラベル一覧(仕様6.2「回答ボタン」、2026-09-18確定)。
// オクターブ重複音が無いため、全要素でextraは常にfalseになる。
export const FULL_ANSWER_LABELS = FULL_ANSWER_BUTTON_SEMITONES.map(buildAnswerLabel);
