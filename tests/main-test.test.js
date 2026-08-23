import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BASE_SEQUENCE,
  TOTAL_QUESTIONS,
  MAX_INCORRECT,
  generateTestSequence,
  pickRandomStart,
  pickRandomDirection,
  shouldForceTerminate,
} from "../src/absolute-pitch/main-test.js";

test("基準数列は60個で、1から60を各1回含む", () => {
  assert.equal(BASE_SEQUENCE.length, 60);
  assert.deepEqual([...BASE_SEQUENCE].sort((a, b) => a - b), Array.from({ length: 60 }, (_, i) => i + 1));
});

test("基準数列は隣接差(循環部分を含む)が14以上", () => {
  for (let i = 0; i < BASE_SEQUENCE.length; i += 1) {
    const next = BASE_SEQUENCE[(i + 1) % BASE_SEQUENCE.length];
    const diff = Math.abs(BASE_SEQUENCE[i] - next);
    assert.ok(diff >= 14, `index ${i}: diff ${diff} is less than 14`);
  }
});

test("generateTestSequenceは、どの開始位置・方向でも60個を重複なく生成する", () => {
  for (let startIndex = 0; startIndex < BASE_SEQUENCE.length; startIndex += 1) {
    for (const direction of [1, -1]) {
      const sequence = generateTestSequence(startIndex, direction);
      assert.equal(sequence.length, TOTAL_QUESTIONS);
      assert.deepEqual([...sequence].sort((a, b) => a - b), Array.from({ length: 60 }, (_, i) => i + 1));
      assert.equal(sequence[0], BASE_SEQUENCE[startIndex]);
    }
  }
});

test("generateTestSequence: forward(順方向)は基準数列をそのまま先頭から辿る", () => {
  const sequence = generateTestSequence(0, 1);
  assert.deepEqual(sequence, BASE_SEQUENCE);
});

test("generateTestSequence: reverse(逆方向)は基準数列を逆順に辿る", () => {
  const sequence = generateTestSequence(0, -1);
  assert.equal(sequence[0], BASE_SEQUENCE[0]);
  assert.equal(sequence[1], BASE_SEQUENCE[BASE_SEQUENCE.length - 1]);
});

test("pickRandomStart/pickRandomDirection: 乱数関数を外から渡せる", () => {
  assert.equal(pickRandomStart(() => 0), 0);
  assert.equal(pickRandomStart(() => 0.999999), 59);
  assert.equal(pickRandomDirection(() => 0), 1);
  assert.equal(pickRandomDirection(() => 0.9), -1);
});

test(`shouldForceTerminate: ${MAX_INCORRECT - 1}件はfalse、${MAX_INCORRECT}件はtrue(境界値)`, () => {
  assert.equal(shouldForceTerminate(MAX_INCORRECT - 1), false);
  assert.equal(shouldForceTerminate(MAX_INCORRECT), true);
  assert.equal(shouldForceTerminate(0), false);
});
