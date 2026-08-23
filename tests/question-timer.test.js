import { test } from "node:test";
import assert from "node:assert/strict";
import { createQuestionTimer } from "../src/shared/question-timer.js";

// 疑似時計: 呼ばれるたびに配列の値を順番に返す(実時間を待たずにテストするため)
function makeFakeClock(values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

test("durationMs経過後にonQuestionEndが1回呼ばれる", () => {
  let scheduledCallback = null;
  let scheduledDelay = null;
  const fakeSetTimeout = (cb, delay) => { scheduledCallback = cb; scheduledDelay = delay; return "fake-id"; };

  let calledWith = null;
  createQuestionTimer({
    durationMs: 3500,
    onQuestionEnd: (elapsedMs) => { calledWith = elapsedMs; },
    now: makeFakeClock([0, 3500]),
    setTimeoutFn: fakeSetTimeout,
    clearTimeoutFn: () => {},
  });

  assert.equal(scheduledDelay, 3500);
  assert.equal(calledWith, null, "疑似タイマーを発火させるまではonQuestionEndは呼ばれない");
  scheduledCallback();
  assert.equal(calledWith, 3500);
});

test("タイマー発火が遅れても、発火時点の実経過時間を測り直して渡す(仕様13.3)", () => {
  let scheduledCallback = null;
  const fakeSetTimeout = (cb) => { scheduledCallback = cb; return "fake-id"; };
  let calledWith = null;

  createQuestionTimer({
    durationMs: 3500,
    onQuestionEnd: (elapsedMs) => { calledWith = elapsedMs; },
    now: makeFakeClock([0, 3620]), // ブラウザの負荷で発火が3620msに遅れた想定
    setTimeoutFn: fakeSetTimeout,
    clearTimeoutFn: () => {},
  });

  scheduledCallback();
  assert.equal(calledWith, 3620, "3500ではなく実際に経過した3620が渡される");
});

test("cancel()は登録したタイマーIDでclearTimeoutFnを呼ぶ", () => {
  let clearedWith = null;
  const timer = createQuestionTimer({
    durationMs: 3500,
    onQuestionEnd: () => {},
    now: makeFakeClock([0]),
    setTimeoutFn: () => "the-id",
    clearTimeoutFn: (id) => { clearedWith = id; },
  });

  timer.cancel();
  assert.equal(clearedWith, "the-id");
});

test("elapsedSince()は開始時刻からの経過時間を返す", () => {
  const timer = createQuestionTimer({
    durationMs: 3500,
    onQuestionEnd: () => {},
    now: makeFakeClock([100, 250]),
    setTimeoutFn: () => "id",
    clearTimeoutFn: () => {},
  });

  assert.equal(timer.elapsedSince(), 150);
});
