import { test } from "node:test";
import assert from "node:assert/strict";
import { runQuestionTimeline } from "../../src/relative-pitch/question-timeline.js";
import { buildQuestion } from "../../src/relative-pitch/intervals.js";

// 実際のAudioContext・setTimeoutを使わず、経過時間を自分で進められる疑似環境を作る。
// development-handover.md 12.3・12.4の「乱数やブラウザAPIを外部から渡せる構造にする」と同じ考え方。
function createFakeEnv() {
  let currentTime = 0; // AudioContextの時刻(秒)相当
  const loadedSrcs = [];
  const scheduledCalls = []; // { src, when }
  const timeouts = [];

  return {
    audioContextTimeFn: () => currentTime,
    loadAudioBufferFn: (src) => {
      loadedSrcs.push(src);
      return Promise.resolve({ __bufferFor: src }); // 中身は使わない、srcが分かればよいダミー
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
