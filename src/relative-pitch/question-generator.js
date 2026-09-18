// 相対音感テスト簡易版・本番12問の出題順生成(仕様書 relative-pitch-test-spec.md §12)。
// 完全版・本番44問の出題順生成(仕様書 relative-pitch-test-spec.md §6.2)。
// 練習(固定問題、intervals.jsのPRACTICE_QUESTIONS。簡易版・完全版で共通)では使わない、
// 本番固有のロジック。簡易版用のロジックはそのまま残し、完全版用は新しい関数として追加する
// (簡易版の出題生成・保存済みテストに影響を与えないため)。
import { buildQuestion, FULL_KEYS, FULL_INTERVAL_SEMITONES } from "./intervals.js";

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

// ---- ここから完全版(仕様6.2、2026-09-18確定) ----

export const FULL_TOTAL_QUESTIONS = FULL_INTERVAL_SEMITONES.length * FULL_KEYS.length; // 44

// 固定ブロック方式を4キーへ一般化して本番44問の出題順を生成する(仕様6.2「出題生成」、2026-09-18再修正)。
//
// 簡易版と異なり、11半音差×4キー=44通り全てを網羅する完全実施計画のため、
// 「属性ペアをキーへ割り当てる」手順(assignKeysToPairs相当)は不要
// (サンプリングの偏りが原理的に発生しないため)。
//
// 過去に「半音差ごとに1ブロック(4キー分、4キーとも同じ半音差)を作る」方式を試したが、
// そのブロック構造のせいで同じ半音差(=同じ階名)が必ず4問連続してしまう不具合が
// 手動確認で見つかった。次に「44通りを単純にシャッフルし、条件を満たすまで作り直す」
// 方式を試したが、シャッフル1回が条件を満たす確率が実測で約1%しかなく、作り直しの
// 回数が非常に多くなっていた。
//
// そこで、ブロック構造(11ブロック、各ブロック4キー1問ずつ)は維持しつつ、
// 「各キーがどのブロックでどの半音差を出題するか」を次の式でランダムに決める方式にした。
//
//   半音差の位置(0〜10) = (ブロック番号 + キーの番号 × step) mod 11
//
// 11は素数なので、この式は以下を数学的に保証する。
// - 固定したキーについてブロック番号を0〜10まで動かすと、位置が0〜10を重複なく1周する
//   (=各キーは11種類の半音差をちょうど1回ずつ担当する。44通りの重複が起こり得ない)
// - 固定したブロックについてキーの番号を0〜3まで動かすと、位置が4つとも異なる
//   (=同じブロック内で2キー以上が同じ半音差になることが起こり得ない)
// この構造により、シャッフル1回が「同じキー3問以上連続なし・同じ半音差の連続なし」を
// 満たす確率が実測で約46%まで上がり、作り直しの回数を大きく減らせた。
export function generateFullTestSequence(randomFn = Math.random) {
  // 満たせないまま尽きる確率は、成功率約46%なら天文学的に低い(念のため200回を上限にする)。
  const MAX_ATTEMPTS = 200;
  let sequence = buildFullSequenceAttempt(randomFn);
  for (let attempt = 1; attempt < MAX_ATTEMPTS && !satisfiesFullOrderConstraints(sequence); attempt += 1) {
    sequence = buildFullSequenceAttempt(randomFn);
  }

  validateFullQuestionOrder(sequence);
  return sequence;
}

function buildFullSequenceAttempt(randomFn) {
  const semitoneCount = FULL_INTERVAL_SEMITONES.length; // 11
  const shuffledSemitones = shuffle(FULL_INTERVAL_SEMITONES, randomFn);
  const step = 1 + Math.floor(randomFn() * (semitoneCount - 1)); // 1〜10のいずれか

  const blocks = shuffledSemitones.map((_, blockIndex) => {
    const questions = FULL_KEYS.map((keyCode, keyIndex) => {
      const position = (blockIndex + keyIndex * step) % semitoneCount;
      return buildQuestion(keyCode, shuffledSemitones[position]);
    });
    return shuffle(questions, randomFn);
  });

  const orderedBlocks = shuffle(blocks, randomFn);

  const sequence = [];
  orderedBlocks.forEach((block, blockIndex) => {
    block.forEach((question) => {
      sequence.push({ ...question, keyBlockNumber: blockIndex + 1 });
    });
  });
  return sequence;
}

function satisfiesFullOrderConstraints(sequence) {
  let sameKeyStreak = 1;
  for (let i = 1; i < sequence.length; i += 1) {
    sameKeyStreak = sequence[i].keyCode === sequence[i - 1].keyCode ? sameKeyStreak + 1 : 1;
    if (sameKeyStreak >= 3) return false;
    if (sequence[i].intervalSemitones === sequence[i - 1].intervalSemitones) return false;
  }
  return true;
}

// 完全版・出題開始前の検査(仕様6.2「出題生成」)。条件を満たさない場合は例外を投げ、
// 本番を開始しない(簡易版のvalidateQuestionOrderと同じ考え方)。
export function validateFullQuestionOrder(sequence) {
  if (sequence.length !== FULL_TOTAL_QUESTIONS) {
    throw new Error(`問題数が${FULL_TOTAL_QUESTIONS}ではありません: ${sequence.length}`);
  }

  const combinationKey = (q) => `${q.keyCode}:${q.intervalSemitones}`;
  const uniqueCombinations = new Set(sequence.map(combinationKey));
  if (uniqueCombinations.size !== FULL_TOTAL_QUESTIONS) {
    throw new Error("キーと半音差の組み合わせ44通りが重複なく含まれていません");
  }
  const allCombinationsPresent = FULL_KEYS.every((keyCode) =>
    FULL_INTERVAL_SEMITONES.every((semitone) => uniqueCombinations.has(`${keyCode}:${semitone}`)),
  );
  if (!allCombinationsPresent) {
    throw new Error("キーと半音差の組み合わせ44通りが全て含まれていません");
  }

  FULL_KEYS.forEach((keyCode) => {
    const count = sequence.filter((q) => q.keyCode === keyCode).length;
    if (count !== FULL_INTERVAL_SEMITONES.length) {
      throw new Error(`Key ${keyCode}が${count}問になっています(${FULL_INTERVAL_SEMITONES.length}問である必要があります)`);
    }
  });

  for (let blockNumber = 1; blockNumber <= FULL_INTERVAL_SEMITONES.length; blockNumber += 1) {
    const blockQuestions = sequence.filter((q) => q.keyBlockNumber === blockNumber);
    if (blockQuestions.length !== FULL_KEYS.length) {
      throw new Error(`ブロック${blockNumber}が${FULL_KEYS.length}問になっていません`);
    }
    if (new Set(blockQuestions.map((q) => q.keyCode)).size !== FULL_KEYS.length) {
      throw new Error(`ブロック${blockNumber}に4キーが1問ずつ含まれていません`);
    }
  }

  let sameKeyStreak = 1;
  for (let i = 1; i < sequence.length; i += 1) {
    sameKeyStreak = sequence[i].keyCode === sequence[i - 1].keyCode ? sameKeyStreak + 1 : 1;
    if (sameKeyStreak >= 3) {
      throw new Error("同じキーが3問以上連続しています");
    }
    if (sequence[i].intervalSemitones === sequence[i - 1].intervalSemitones) {
      throw new Error("同じ半音差(階名)が連続しています");
    }
  }

  return true;
}
