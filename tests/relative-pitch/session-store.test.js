import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadParticipantData,
  persistParticipantData,
  startSession,
  setPracticeStatus,
  setGeneratedQuestionOrder,
  beginQuestion,
  recordStageStarted,
  finalizeQuestion,
  finalizeSession,
} from "../../src/relative-pitch/session-store.js";
import { buildQuestion } from "../../src/relative-pitch/intervals.js";

function makeFakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, value); },
  };
}

function makeClock() {
  let n = 0;
  return () => `T${n++}`;
}

test("startSessionは新しいセッションを作り、test_type/test_versionを設定する(仕様18.1〜18.3)", () => {
  const storage = makeFakeStorage();
  const { session, data } = startSession("P00001", { storage, now: makeClock(), generateId: () => "s1", answerLayout: "circular" });

  assert.equal(session.sessionId, "s1");
  assert.equal(session.testType, "relative_pitch");
  assert.equal(session.testVersion, "simplified");
  assert.equal(session.answerLayout, "circular");
  assert.equal(session.practiceStatus, null);
  assert.equal(session.sessionStatus, null);
  assert.deepEqual(session.generatedQuestionOrder, []);
  assert.deepEqual(session.responses, []);
  assert.equal(data.sessions.length, 1);
  assert.equal(loadParticipantData("P00001", storage).sessions[0].sessionId, "s1");
});

test("絶対音感とは別のlocalStorageキーに保存される(仕様18.3: 別キー方式)", () => {
  const storage = makeFakeStorage();
  startSession("P00001", { storage, now: makeClock(), generateId: () => "s1" });

  assert.equal(storage.getItem("absolute-pitch:P00001"), null);
  assert.ok(storage.getItem("relative-pitch:P00001"));
});

test("同じ参加者で2回目のstartSessionを呼ぶと、1回目はinterruptedとして確定される(仕様17.1)", () => {
  const storage = makeFakeStorage();
  const now = makeClock();

  const first = startSession("P00001", { storage, now, generateId: () => "s1" });
  const second = startSession("P00001", { storage, now, generateId: () => "s2" });

  assert.equal(second.data.sessions.length, 2);
  const reconciledFirst = second.data.sessions[0];
  assert.equal(reconciledFirst.sessionId, first.session.sessionId);
  assert.equal(reconciledFirst.sessionStatus, "interrupted");
  assert.ok(reconciledFirst.endedAt);
  assert.equal(second.session.sessionStatus, null);
});

test("setPracticeStatus/setGeneratedQuestionOrderで各フィールドを設定できる", () => {
  const storage = makeFakeStorage();
  const { session } = startSession("P00001", { storage, now: makeClock(), generateId: () => "s1" });

  setPracticeStatus(session, "completed");
  assert.equal(session.practiceStatus, "completed");

  const sequence = [buildQuestion("C", 4), buildQuestion("Fis", 8)];
  setGeneratedQuestionOrder(session, sequence);
  assert.deepEqual(session.generatedQuestionOrder, [4, 8]);
});

test("beginQuestion→recordStageStarted→finalizeQuestionで回答詳細が1行記録される", () => {
  const storage = makeFakeStorage();
  const now = makeClock();
  const { session } = startSession("P00001", { storage, now, generateId: () => "s1" });
  const question = buildQuestion("C", 4);

  beginQuestion(session, {
    phase: "test", questionNumber: 1, keyCode: question.keyCode, keyBlockNumber: 3,
    cadenceFilename: "cadence_C.wav", referenceNote: question.referenceNote, targetNote: question.targetNote,
    intervalSemitones: question.intervalSemitones, syllableCode: question.syllableCode,
    displayLabel: question.displayLabel, intervalLabel: question.intervalLabel, scaleLabel: question.scaleLabel,
  }, now);
  assert.ok(session.currentQuestion);
  assert.equal(session.currentQuestion.cadenceStartedAt, "T1");

  recordStageStarted(session, "reference", now);
  recordStageStarted(session, "target", now);
  assert.equal(session.currentQuestion.referenceStartedAt, "T2");
  assert.equal(session.currentQuestion.targetStartedAt, "T3");

  finalizeQuestion(session, { responseCode: 4, responseAt: "T-answer", responseTimeMs: 350, outcome: "correct" });

  assert.equal(session.currentQuestion, null);
  assert.equal(session.responses.length, 1);
  assert.deepEqual(session.responses[0], {
    phase: "test", questionNumber: 1, keyCode: "C", keyBlockNumber: 3,
    cadenceFilename: "cadence_C.wav", referenceNote: "C4", targetNote: "E4",
    intervalSemitones: 4, syllableCode: "MiM", displayLabel: "ミ", intervalLabel: "short", scaleLabel: "in",
    cadenceStartedAt: "T1", referenceStartedAt: "T2", targetStartedAt: "T3",
    responseCode: 4, responseAt: "T-answer", responseTimeMs: 350, outcome: "correct",
  });
});

test("recordStageStartedは進行中の問題が無ければ何もしない", () => {
  const storage = makeFakeStorage();
  const { session } = startSession("P00001", { storage, now: makeClock(), generateId: () => "s1" });
  assert.doesNotThrow(() => recordStageStarted(session, "target"));
});

test("進行中の問題が残ったまま次のセッションを開始すると、outcome=interruptedの行として復元される(仕様17.2)", () => {
  const storage = makeFakeStorage();
  const now = makeClock();
  const first = startSession("P00001", { storage, now, generateId: () => "s1" });

  beginQuestion(first.session, {
    phase: "test", questionNumber: 5, keyCode: "Fis", keyBlockNumber: 2,
    cadenceFilename: "cadence_Fis.wav", referenceNote: "Fis4", targetNote: "Ais4",
    intervalSemitones: 4, syllableCode: "MiM", displayLabel: "ミ", intervalLabel: "short", scaleLabel: "in",
  }, now);
  recordStageStarted(first.session, "reference", now);
  // 基準音の再生予約直後(目的音提示前)にブラウザが閉じられた状況を再現する。
  persistParticipantData("P00001", first.data, storage);

  const second = startSession("P00001", { storage, now, generateId: () => "s2" });
  const reconciledFirst = second.data.sessions[0];

  assert.equal(reconciledFirst.sessionStatus, "interrupted");
  assert.equal(reconciledFirst.currentQuestion, null);
  assert.equal(reconciledFirst.responses.length, 1);
  const interruptedRow = reconciledFirst.responses[0];
  assert.equal(interruptedRow.outcome, "interrupted");
  assert.equal(interruptedRow.cadenceStartedAt, "T1");
  assert.equal(interruptedRow.referenceStartedAt, "T2");
  assert.equal(interruptedRow.targetStartedAt, undefined, "目的音提示前の中断はtargetStartedAtを持たない");
  assert.equal(interruptedRow.responseCode, "");
  assert.equal(interruptedRow.responseAt, "");
  assert.equal(interruptedRow.responseTimeMs, "");
});

test("進行中の問題がない状態で中断した場合は、行を追加せずセッションだけinterruptedになる", () => {
  const storage = makeFakeStorage();
  const now = makeClock();
  startSession("P00001", { storage, now, generateId: () => "s1" });
  const second = startSession("P00001", { storage, now, generateId: () => "s2" });

  const reconciledFirst = second.data.sessions[0];
  assert.equal(reconciledFirst.sessionStatus, "interrupted");
  assert.equal(reconciledFirst.responses.length, 0);
});

test("finalizeSessionはsessionStatusとendedAtを設定する(簡易版に強制終了はない、仕様15.1)", () => {
  const storage = makeFakeStorage();
  const now = makeClock();
  const { session } = startSession("P00001", { storage, now, generateId: () => "s1" });

  finalizeSession(session, "completed", now);
  assert.equal(session.sessionStatus, "completed");
  assert.equal(session.endedAt, "T1");
});

test("参加者IDごとに別々に保存され、互いに影響しない", () => {
  const storage = makeFakeStorage();
  const now = makeClock();
  startSession("P00001", { storage, now, generateId: () => "a" });
  startSession("P00002", { storage, now, generateId: () => "b" });

  const dataA = loadParticipantData("P00001", storage);
  const dataB = loadParticipantData("P00002", storage);
  assert.equal(dataA.sessions.length, 1);
  assert.equal(dataB.sessions.length, 1);
});
