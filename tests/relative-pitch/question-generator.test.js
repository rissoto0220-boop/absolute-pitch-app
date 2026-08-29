import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ATTRIBUTE_PAIRS,
  TOTAL_QUESTIONS,
  assignKeysToPairs,
  generateTestSequence,
  validateQuestionOrder,
} from "../../src/relative-pitch/question-generator.js";
import { INTERVAL_SEMITONES } from "../../src/relative-pitch/intervals.js";

// テストで乱数を固定するための、あらかじめ決めた値を順番に返す疑似乱数関数
// (development-handover.md 12.3「乱数生成部分を外部から渡せる構造にする」と同じ考え方)。
function fakeRandomSequence(values) {
  let i = 0;
  return () => {
    const value = values[i % values.length];
    i += 1;
    return value;
  };
}

test("属性ペアは6組で、仕様12.1の組み合わせと一致する", () => {
  assert.deepEqual(ATTRIBUTE_PAIRS, [
    [1, 3],
    [2, 4],
    [5, 7],
    [6, 8],
    [9, 11],
    [10, 13],
  ]);
  assert.equal(TOTAL_QUESTIONS, 12);
});

test("assignKeysToPairs: 乱数が常に0ならペアの前者がKey Cへ、常に1に近ければ後者がKey Cへ", () => {
  const allFirstToC = assignKeysToPairs(() => 0);
  assert.deepEqual(allFirstToC.cSemitones, ATTRIBUTE_PAIRS.map(([a]) => a));
  assert.deepEqual(allFirstToC.fisSemitones, ATTRIBUTE_PAIRS.map(([, b]) => b));

  const allSecondToC = assignKeysToPairs(() => 0.999999);
  assert.deepEqual(allSecondToC.cSemitones, ATTRIBUTE_PAIRS.map(([, b]) => b));
  assert.deepEqual(allSecondToC.fisSemitones, ATTRIBUTE_PAIRS.map(([a]) => a));
});

test("generateTestSequence: Key Cが6問、Key Fisが6問(仕様12.2・12.4)", () => {
  const sequence = generateTestSequence();
  assert.equal(sequence.filter((q) => q.keyCode === "C").length, 6);
  assert.equal(sequence.filter((q) => q.keyCode === "Fis").length, 6);
});

test("generateTestSequence: 12種類の半音差が各1回含まれる(仕様12.4)", () => {
  const sequence = generateTestSequence();
  const semitones = sequence.map((q) => q.intervalSemitones).sort((a, b) => a - b);
  assert.deepEqual(semitones, [...INTERVAL_SEMITONES].sort((a, b) => a - b));
});

test("generateTestSequence: 固定ブロックが6個で、各ブロックにCとFisが1問ずつ含まれる(仕様12.3・12.4)", () => {
  const sequence = generateTestSequence();
  const blockNumbers = new Set(sequence.map((q) => q.keyBlockNumber));
  assert.equal(blockNumbers.size, 6);
  for (let blockNumber = 1; blockNumber <= 6; blockNumber += 1) {
    const block = sequence.filter((q) => q.keyBlockNumber === blockNumber);
    assert.equal(block.length, 2);
    assert.deepEqual(new Set(block.map((q) => q.keyCode)), new Set(["C", "Fis"]));
  }
});

test("generateTestSequence: 属性ペアの2刺激は異なるキーへ割り当てられる(仕様12.4)", () => {
  const sequence = generateTestSequence();
  const keyBySemitone = new Map(sequence.map((q) => [q.intervalSemitones, q.keyCode]));
  ATTRIBUTE_PAIRS.forEach(([a, b]) => {
    assert.notEqual(keyBySemitone.get(a), keyBySemitone.get(b));
  });
});

test("generateTestSequence: 同じキーが3問以上連続しない(仕様12.3・12.4)。既定の乱数で200回生成しても検査に通る", () => {
  for (let trial = 0; trial < 200; trial += 1) {
    const sequence = generateTestSequence();
    assert.doesNotThrow(() => validateQuestionOrder(sequence));

    let streak = 1;
    for (let i = 1; i < sequence.length; i += 1) {
      streak = sequence[i].keyCode === sequence[i - 1].keyCode ? streak + 1 : 1;
      assert.ok(streak < 3, `trial ${trial}, index ${i}: 同じキーが3問以上連続`);
    }
  }
});

test("generateTestSequence: 固定乱数を渡すと同じ出題順を再現できる", () => {
  const seed = [
    0.1, 0.6, 0.2, 0.7, 0.3, 0.8,
    0.9, 0.4, 0.15, 0.65, 0.25, 0.75,
    0.35, 0.85, 0.05, 0.55, 0.45, 0.95,
    0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
  ];
  const first = generateTestSequence(fakeRandomSequence(seed));
  const second = generateTestSequence(fakeRandomSequence(seed));
  assert.deepEqual(first, second);
});

test("validateQuestionOrder: 条件を満たさない出題順は例外を投げる", () => {
  assert.throws(() => validateQuestionOrder([]));

  const sequence = generateTestSequence();
  const broken = sequence.map((q) => ({ ...q, keyCode: "C" })); // 全問Key Cにして条件を崩す
  assert.throws(() => validateQuestionOrder(broken));
});
