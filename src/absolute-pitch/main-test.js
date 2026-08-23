// 本番60問のルール(仕様11章・15章)。練習では使わない、絶対音感固有のロジック。

// 60個の基準数列(仕様11.2)。1〜60を各1回含み、隣接差(循環部分含む)は14以上。
export const BASE_SEQUENCE = [
  11, 57, 43, 29, 46, 32, 3, 19, 35, 51,
  22, 8, 54, 10, 26, 42, 28, 14, 60, 31,
  17, 48, 34, 5, 36, 7, 53, 24, 40, 56,
  27, 13, 59, 45, 16, 2, 33, 49, 20, 6,
  52, 38, 9, 25, 41, 12, 58, 44, 30, 1,
  15, 47, 18, 50, 4, 21, 37, 23, 39, 55,
];

export const TOTAL_QUESTIONS = BASE_SEQUENCE.length;
export const MAX_INCORRECT = 13;

// 開始位置・方向は乱数で決める(仕様11.3)。テストで固定値を渡せるよう、乱数関数を外から渡せるようにする
// (development-handover.md 12.3の「乱数生成部分を外部から渡せる構造にする」と同じ考え方)。
export function pickRandomStart(randomFn = Math.random) {
  return Math.floor(randomFn() * BASE_SEQUENCE.length);
}

export function pickRandomDirection(randomFn = Math.random) {
  return randomFn() < 0.5 ? 1 : -1; // 1: forward, -1: reverse
}

// 基準数列を開始位置・方向に沿って並べ替え、60個の出題順を作る(仕様11.3)。
// 末尾または先頭に到達したら反対端へ循環する。
export function generateTestSequence(startIndex, direction) {
  const length = BASE_SEQUENCE.length;
  return Array.from({ length }, (_, i) => {
    const position = (startIndex + direction * i + length * 2) % length;
    return BASE_SEQUENCE[position];
  });
}

// 誤回答+タイムアウトの合計がMAX_INCORRECTに達したら強制終了(仕様15.2)。
export function shouldForceTerminate(totalIncorrectCount) {
  return totalIncorrectCount >= MAX_INCORRECT;
}
