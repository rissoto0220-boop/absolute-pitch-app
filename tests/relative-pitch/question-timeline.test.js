import { test } from "node:test";
import assert from "node:assert/strict";
import { runQuestionTimeline } from "../../src/relative-pitch/question-timeline.js";
import { buildQuestion } from "../../src/relative-pitch/intervals.js";

// 実際のAudioContext・setTimeoutを使わず、経過時間を自分で進められる疑似環境を作る。
// development-handover.md 12.3・12.4の「乱数やブラウザAPIを外部から渡せる構造にする」と同じ考え方。
function createFakeEnv({ targetDurationSeconds = 2.0 } = {}) {
  let currentTime = 0; // AudioContextの時刻(秒)相当
  const loadedSrcs = [];
  const scheduledCalls = []; // { src, when }
  const timeouts = [];

  return {
    audioContextTimeFn: () => currentTime,
    loadAudioBufferFn: (src) => {
      loadedSrcs.push(src);
      // durationは目的音(絶対音感の既存WAV)にだけ持たせる。カデンツ・基準音は使わないダミー。
      return Promise.resolve({ __bufferFor: src, duration: targetDurationSeconds });
    },
    scheduleAudioBufferFn: (buffer, when) => {
      scheduledCalls.push({ src: buffer.__bufferFor, when });
      return { source: {}, startedAt: when };
    },
    setTimeoutFn: (fn, delay) => { timeouts.push({ fn, delay }); },
    advance(seconds) { currentTime += seconds; },
    loadedSrcs,
    scheduledCalls,
    timeouts,
  };
}

// Promise.all(...).then(...)の解決を待つため、複数回マイクロタスクを進める。
async function flushMicrotasks() {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

function runOptions(env, overrides = {}) {
  return {
    onAnswerable: () => {},
    onResult: () => {},
    audioContextTimeFn: env.audioContextTimeFn,
    loadAudioBufferFn: env.loadAudioBufferFn,
    scheduleAudioBufferFn: env.scheduleAudioBufferFn,
    setTimeoutFn: env.setTimeoutFn,
    ...overrides,
  };
}

// SCHEDULE_LEAD_SECONDS(コールドスタート対策の先読み時間)の具体的な秒数は実装の調整対象のため、
// テスト側では厳密な値を決め打ちせず、「基準時刻からの相対位置(+0秒・+3秒・+4秒)が正しいか」を
// 許容誤差付きで検証する。
function approxEqual(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-6, message ?? `expected ~${expected}, got ${actual}`);
}

test("カデンツ・基準音・目的音の3つを並行して読み込む(仕様7.1: 事前読み込み)", async () => {
  const env = createFakeEnv();
  const question = buildQuestion("C", 4); // 練習1と同じ(Key C, ミ)

  runQuestionTimeline(question, runOptions(env));
  await flushMicrotasks();

  assert.deepEqual(env.loadedSrcs, [
    "public/sounds/cadence_C.wav",
    "public/sounds/reference_C4.wav",
    "public/sounds/E4.wav",
  ]);
});

test("読み込み完了後、同じ基準時刻からカデンツ(+0秒)・基準音(+3秒)・目的音(+4秒)を一括予約する", async () => {
  const env = createFakeEnv();
  const question = buildQuestion("C", 4);

  runQuestionTimeline(question, runOptions(env));
  await flushMicrotasks();

  assert.equal(env.scheduledCalls.length, 3);
  const [cadence, reference, target] = env.scheduledCalls;
  assert.equal(cadence.src, "public/sounds/cadence_C.wav");
  assert.equal(reference.src, "public/sounds/reference_C4.wav");
  assert.equal(target.src, "public/sounds/E4.wav");

  const baseTime = cadence.when;
  approxEqual(reference.when, baseTime + 3, "基準音はカデンツの3秒後");
  approxEqual(target.when, baseTime + 4, "目的音はカデンツの4秒後");
});

test("onStageStartedがcadence→reference→targetの順に呼ばれる(仕様17.2: 中断段階の把握用)", async () => {
  const env = createFakeEnv();
  const question = buildQuestion("C", 4);
  const stages = [];

  runQuestionTimeline(question, runOptions(env, { onStageStarted: (stage) => stages.push(stage) }));
  await flushMicrotasks();

  assert.deepEqual(stages, ["cadence", "reference", "target"]);
});

test("Key Fisの問題では、カデンツ・基準音のファイル名もFis用になる", async () => {
  const env = createFakeEnv();
  const question = buildQuestion("Fis", 4); // 練習3と同じ(Key Fis, ミ、目的音Ais4)

  runQuestionTimeline(question, runOptions(env));
  await flushMicrotasks();

  assert.deepEqual(env.scheduledCalls.map((c) => c.src), [
    "public/sounds/cadence_Fis.wav",
    "public/sounds/reference_Fis4.wav",
    "public/sounds/Ais4.wav",
  ]);
});

test("目的音の予定時刻に合わせてonAnswerableを呼ぶsetTimeoutが仕込まれる(仕様16.1)", async () => {
  const env = createFakeEnv();
  const question = buildQuestion("C", 4);
  let answerable = false;

  runQuestionTimeline(question, runOptions(env, { onAnswerable: () => { answerable = true; } }));
  await flushMicrotasks();

  assert.equal(env.timeouts.length, 1);
  const targetWhen = env.scheduledCalls.find((c) => c.src === "public/sounds/E4.wav").when;
  approxEqual(env.timeouts[0].delay / 1000, targetWhen, "setTimeoutの遅延は目的音の予定時刻と一致する");

  env.timeouts[0].fn();
  assert.equal(answerable, true);
});

test("反応時間は、目的音の予定開始時刻からのAudioContext時刻の差で算出される(仕様16.1)", async () => {
  const env = createFakeEnv();
  const question = buildQuestion("C", 4);
  let result = null;

  const timeline = runQuestionTimeline(question, runOptions(env, { onResult: (r) => { result = r; } }));
  await flushMicrotasks();

  const targetWhen = env.scheduledCalls.find((c) => c.src === "public/sounds/E4.wav").when;
  env.advance(targetWhen); // 目的音の予定時刻まで進める
  env.advance(0.35); // 反応時間350ms相当
  timeline.submitAnswer("ミ");

  assert.equal(result.responseCode, "ミ");
  approxEqual(result.responseTimeMs, 350, "反応時間は約350ms");
});

test("onSettled: 早く回答した場合、目的音の再生終了時刻(回答から1秒後より遅い方)に予約される(仕様7.3)", async () => {
  const env = createFakeEnv({ targetDurationSeconds: 2.0 });
  const question = buildQuestion("C", 4);
  let settledAt = null;

  const timeline = runQuestionTimeline(question, runOptions(env, {
    onSettled: () => { settledAt = env.audioContextTimeFn(); },
  }));
  await flushMicrotasks();

  const targetWhen = env.scheduledCalls.find((c) => c.src === "public/sounds/E4.wav").when;
  env.advance(targetWhen);
  env.advance(0.35); // 目的音開始から0.35秒後に回答(目的音はあと1.65秒再生中)
  timeline.submitAnswer("ミ");

  // submitAnswer呼び出し時点でsetTimeoutFnが1回追加で呼ばれているはず(onAnswerable用と合わせて2回)。
  assert.equal(env.timeouts.length, 2);
  const settleTimeout = env.timeouts[1];
  // 回答から1秒後(0.35+1=1.35秒後)より、目的音の再生終了(2.0秒後)の方が遅いので、そちらに合わせる。
  approxEqual(settleTimeout.delay / 1000, 2.0 - 0.35, "目的音の再生終了までの残り時間で予約される");

  env.advance(settleTimeout.delay / 1000); // 実際にその遅延分だけ時間が経過した状態を再現する
  settleTimeout.fn();
  approxEqual(settledAt, targetWhen + 2.0, "目的音の再生終了時刻で発火する");
});

test("onSettled: 回答が遅れた場合、回答から1秒後に予約される(仕様7.3)", async () => {
  const env = createFakeEnv({ targetDurationSeconds: 2.0 });
  const question = buildQuestion("C", 4);
  let settledAt = null;

  const timeline = runQuestionTimeline(question, runOptions(env, {
    onSettled: () => { settledAt = env.audioContextTimeFn(); },
  }));
  await flushMicrotasks();

  const targetWhen = env.scheduledCalls.find((c) => c.src === "public/sounds/E4.wav").when;
  env.advance(targetWhen);
  env.advance(1.9); // 目的音の再生終了(2.0秒)直前に回答
  timeline.submitAnswer("ミ");

  const settleTimeout = env.timeouts[1];
  approxEqual(settleTimeout.delay / 1000, 1.0, "目的音の残り時間(0.1秒)より、回答から1秒の方が遅いのでそちらに合わせる");

  env.advance(settleTimeout.delay / 1000);
  settleTimeout.fn();
  approxEqual(settledAt, targetWhen + 1.9 + 1.0, "回答から1秒後に発火する");
});

test("submitAnswerは最初の1回だけ受け付ける(仕様7.3: 二重回答を防ぐ)", async () => {
  const env = createFakeEnv();
  const question = buildQuestion("C", 4);
  const results = [];

  const timeline = runQuestionTimeline(question, runOptions(env, { onResult: (r) => results.push(r) }));
  await flushMicrotasks();

  timeline.submitAnswer("A");
  timeline.submitAnswer("B");

  assert.equal(results.length, 1);
  assert.equal(results[0].responseCode, "A");
});

test("目的音の予約前にsubmitAnswerを呼んでも、responseTimeMsはnullになる", () => {
  const env = createFakeEnv();
  const question = buildQuestion("C", 4);
  let result = null;

  const timeline = runQuestionTimeline(question, runOptions(env, { onResult: (r) => { result = r; } }));
  timeline.submitAnswer("早すぎる回答");

  assert.deepEqual(result, { responseCode: "早すぎる回答", responseTimeMs: null });
});

test("音声の読み込みに失敗した場合、onErrorが呼ばれ、onAnswerable/onResultは呼ばれない(仕様22.1)", async () => {
  const env = createFakeEnv();
  const question = buildQuestion("C", 4);
  const loadError = new Error("読み込み失敗(テスト用)");
  let capturedError = null;
  let answerableCalled = false;

  runQuestionTimeline(question, runOptions(env, {
    loadAudioBufferFn: (src) => (src.includes("reference_") ? Promise.reject(loadError) : env.loadAudioBufferFn(src)),
    onAnswerable: () => { answerableCalled = true; },
    onError: (error) => { capturedError = error; },
  }));
  await flushMicrotasks();

  assert.equal(capturedError, loadError);
  assert.equal(answerableCalled, false);
  assert.equal(env.timeouts.length, 0);
});
