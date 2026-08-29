// 相対音感テスト簡易版・本番12問の出題順生成(仕様書 relative-pitch-test-spec.md §12)。
// 練習(固定3問、intervals.jsのPRACTICE_QUESTIONS)では使わない、本番固有のロジック。
import { buildQuestion } from "./intervals.js";

// 属性ペア6組(仕様12.1)。同じinterval_label・scale_labelを持つ半音差の組。
// 各組の一方をKey Cへ、もう一方をKey Fisへ割り当てる(仕様12.2)。
export const ATTRIBUTE_PAIRS = [
  [1, 3], // short + out
  [2, 4], // short + in
  [5, 7], // mid + in
  [6, 8], // mid + out
  [9, 11], // long + in
  [10, 13], // long + out
];

export const TOTAL_QUESTIONS = ATTRIBUTE_PAIRS.length * 2; // 12

// 配列をFisher-Yatesでシャッフルする。乱数関数を外から渡せるようにし、テストでは固定値を渡して
// 結果を再現できるようにする(development-handover.md 12.3・絶対音感main-test.jsと同じ考え方)。
function shuffle(array, randomFn) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(randomFn() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 各属性ペアの一方をKey Cへ、もう一方をKey Fisへランダムに割り当てる(仕様12.2の手順1〜3)。
// 戻り値はペア順に並んだ、Key Cの6半音差とKey Fisの6半音差。
export function assignKeysToPairs(randomFn = Math.random) {
  const cSemitones = [];
  const fisSemitones = [];
  ATTRIBUTE_PAIRS.forEach(([a, b]) => {
    if (randomFn() < 0.5) {
      cSemitones.push(a);
      fisSemitones.push(b);
    } else {
      cSemitones.push(b);
      fisSemitones.push(a);
    }
  });
  return { cSemitones, fisSemitones };
}

// 固定ブロック方式で本番12問の出題順を生成する(仕様12.3)。
//
// 1. 各属性ペアをKey C/Key Fisへ割り当てる(assignKeysToPairs)。
// 2. Cの6刺激・Fisの6刺激をそれぞれ独立にシャッフルしてから1対1に組み合わせ、6ブロックを作る
//    (「Cの6刺激とFisの6刺激のブロックへの組み合わせ」のランダム化)。
// 3. 各ブロック内の2問の順序(CとFisどちらを先にするか)をランダム化する。
// 4. 6ブロック自体の順序をランダム化する。
//
// 各ブロックは常にC1問・Fis1問で構成されるため、同じキーが3問以上連続することは構造上起こり得ない
// (ブロックの境界をまたいでも、同じキーが続くのは最大2問まで)。
export function generateTestSequence(randomFn = Math.random) {
  const { cSemitones, fisSemitones } = assignKeysToPairs(randomFn);
  const shuffledC = shuffle(cSemitones, randomFn);
  const shuffledFis = shuffle(fisSemitones, randomFn);

  const blocks = shuffledC.map((cSemitone, index) => {
    const cQuestion = buildQuestion("C", cSemitone);
    const fisQuestion = buildQuestion("Fis", shuffledFis[index]);
    return randomFn() < 0.5 ? [cQuestion, fisQuestion] : [fisQuestion, cQuestion];
  });

  const orderedBlocks = shuffle(blocks, randomFn);

  const sequence = [];
  orderedBlocks.forEach((block, blockIndex) => {
    block.forEach((question) => {
      sequence.push({ ...question, keyBlockNumber: blockIndex + 1 });
    });
  });

  validateQuestionOrder(sequence);
  return sequence;
}

// 出題開始前の検査(仕様12.4)。条件を満たさない場合は例外を投げ、本番を開始しない
// (「条件を満たさない順序でテストを開始しない」)。
export function validateQuestionOrder(sequence) {
  if (sequence.length !== TOTAL_QUESTIONS) {
    throw new Error(`問題数が${TOTAL_QUESTIONS}ではありません: ${sequence.length}`);
  }

  const semitones = sequence.map((q) => q.intervalSemitones);
  const uniqueSemitones = new Set(semitones);
  const allSemitonesPresent = ATTRIBUTE_PAIRS.flat().every((s) => uniqueSemitones.has(s));
  if (!allSemitonesPresent || uniqueSemitones.size !== TOTAL_QUESTIONS) {
    throw new Error("半音差1〜11・13が各1回になっていません");
  }

  const cCount = sequence.filter((q) => q.keyCode === "C").length;
  const fisCount = sequence.filter((q) => q.keyCode === "Fis").length;
  if (cCount !== 6 || fisCount !== 6) {
    throw new Error(`Key Cが${cCount}問、Key Fisが${fisCount}問になっています(それぞれ6問である必要があります)`);
  }

  for (let blockNumber = 1; blockNumber <= 6; blockNumber += 1) {
    const blockQuestions = sequence.filter((q) => q.keyBlockNumber === blockNumber);
    if (blockQuestions.length !== 2) {
      throw new Error(`ブロック${blockNumber}が2問になっていません`);
    }
    if (new Set(blockQuestions.map((q) => q.keyCode)).size !== 2) {
      throw new Error(`ブロック${blockNumber}にCとFisが1問ずつ含まれていません`);
    }
  }

  const keyBySemitone = new Map(sequence.map((q) => [q.intervalSemitones, q.keyCode]));
  const pairsHaveDifferentKeys = ATTRIBUTE_PAIRS.every(([a, b]) => keyBySemitone.get(a) !== keyBySemitone.get(b));
  if (!pairsHaveDifferentKeys) {
    throw new Error("属性ペアの2刺激が同じキーへ割り当てられています");
  }

  let sameKeyStreak = 1;
  for (let i = 1; i < sequence.length; i += 1) {
    sameKeyStreak = sequence[i].keyCode === sequence[i - 1].keyCode ? sameKeyStreak + 1 : 1;
    if (sameKeyStreak >= 3) {
      throw new Error("同じキーが3問以上連続しています");
    }
  }

  return true;
}
