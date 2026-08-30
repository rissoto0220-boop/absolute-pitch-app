import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateAccuracy, formatAccuracyLabel } from "../../src/relative-pitch/scoring.js";

test("calculateAccuracy: 11/12はおよそ91.7%(小数第1位まで四捨五入、仕様15.2)", () => {
  assert.equal(calculateAccuracy(11, 12), 91.7);
});

test("calculateAccuracy: 0問正解は0、12問正解は100", () => {
  assert.equal(calculateAccuracy(0, 12), 0);
  assert.equal(calculateAccuracy(12, 12), 100);
});

test("formatAccuracyLabel: 常に小数第1位まで表示する(0.0%・100.0%を含む)", () => {
  assert.equal(formatAccuracyLabel(11, 12), "91.7%");
  assert.equal(formatAccuracyLabel(0, 12), "0.0%");
  assert.equal(formatAccuracyLabel(12, 12), "100.0%");
});
