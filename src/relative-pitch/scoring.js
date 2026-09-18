// 相対音感の採点(仕様 relative-pitch-test-spec.md §15.2)。簡易版・完全版で共通。
// accuracy = correct_count / totalQuestions * 100、小数第1位まで四捨五入する。
// totalQuestionsは本番の総問題数(簡易版12・完全版44)を呼び出し側から渡す。

export function calculateAccuracy(correctCount, totalQuestions) {
  return Math.round((correctCount / totalQuestions) * 1000) / 10;
}

// 参加者向け表示用の文字列(例: "91.7%"、0問正解は"0.0%"、満点は"100.0%")。
export function formatAccuracyLabel(correctCount, totalQuestions) {
  return `${calculateAccuracy(correctCount, totalQuestions).toFixed(1)}%`;
}
