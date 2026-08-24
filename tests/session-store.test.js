import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadParticipantData,
  persistParticipantData,
  startSession,
  beginQuestion,
  finalizeQuestion,
  finalizeSession,
} from "../src/absolute-pitch/session-store.js";

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

test("startSessionは新しいセッションを作り保存する", () => {
  const storage = makeFakeStorage();
  const { session, data } = startSession("P00001", { storage, now: makeClock(), generateId: () => "s1" });

  assert.equal(session.sessionId, "s1");
  assert.equal(session.testType, "absolute_pitch");
  assert.equal(session.sessionStatus, null);
  assert.deepEqual(session.responses, []);
  assert.equal(data.sessions.length, 1);
  assert.deepEqual(loadParticipantData("P00001", storage).sessions[0].sessionId, "s1");
});

test("同じ参加者で2回目のstartSessionを呼ぶと、1回目はinterruptedとして確定される(仕様6.2・19章)", () => {
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
  assert.notEqual(second.session.sessionId, first.session.sessionId);
});

test("beginQuestion→finalizeQuestionで回答詳細が1行記録され、currentQuestionはクリアされる", () => {
  const storage = makeFakeStorage();
  const now = makeClock();
  const { session } = startSession("P00001", { storage, now, generateId: () => "s1" });

  beginQuestion(session, {
    phase: "practice", questionNumber: 1, stimulusNumber: 3, stimulusNote: "D2",
    stimulusFilename: "D2.wav", correctResponse: "D",
  }, now);
  assert.ok(session.currentQuestion);

  finalizeQuestion(session, {
    outcome: "correct", responseNote: "D", responseAt: "T-answer", responseTimeMs: 900,
    incorrectTotalAfterQuestion: "",
  });

  assert.equal(session.currentQuestion, null);
  assert.equal(session.responses.length, 1);
  assert.deepEqual(session.responses[0], {
    phase: "practice", questionNumber: 1, stimulusNumber: 3, stimulusNote: "D2",
    stimulusFilename: "D2.wav", correctResponse: "D", stimulusStartedAt: "T1",
    responseNote: "D", responseAt: "T-answer", responseTimeMs: 900, outcome: "correct",
    incorrectTotalAfterQuestion: "",
  });
});

test("進行中の問題が残ったまま次のセッションを開始すると、outcome=interruptedの行として復元される(仕様19.2)", () => {
  const storage = makeFakeStorage();
  const now = makeClock();
  const first = startSession("P00001", { storage, now, generateId: () => "s1" });

  beginQuestion(first.session, {
    phase: "test", questionNumber: 10, stimulusNumber: 42, stimulusNote: "F5",
    stimulusFilename: "F5.wav", correctResponse: "F",
  }, now);
  // 出題直後(実際のアプリではここで毎回保存する)に、回答もタイムアウトも確定しないまま
  // ブラウザが閉じられた状況を再現する。
  persistParticipantData("P00001", first.data, storage);

  const second = startSession("P00001", { storage, now, generateId: () => "s2" });
  const reconciledFirst = second.data.sessions[0];

  assert.equal(reconciledFirst.sessionStatus, "interrupted");
  assert.equal(reconciledFirst.currentQuestion, null);
  assert.equal(reconciledFirst.responses.length, 1);
  assert.deepEqual(reconciledFirst.responses[0], {
    phase: "test", questionNumber: 10, stimulusNumber: 42, stimulusNote: "F5",
    stimulusFilename: "F5.wav", correctResponse: "F", stimulusStartedAt: "T1",
    responseNote: "", responseAt: "", responseTimeMs: "", outcome: "interrupted",
    incorrectTotalAfterQuestion: "",
  });
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

test("finalizeSessionはsessionStatusとendedAtを設定する", () => {
  const storage = makeFakeStorage();
  const now = makeClock();
  const { session } = startSession("P00001", { storage, now, generateId: () => "s1" });

  finalizeSession(session, "completed", now);
  assert.equal(session.sessionStatus, "completed");
  assert.equal(session.endedAt, "T1");
});

test("参加者IDごとに別々に保存され、互いに影響しない(handover12.2)", () => {
  const storage = makeFakeStorage();
  const now = makeClock();
  startSession("P00001", { storage, now, generateId: () => "a" });
  startSession("P00002", { storage, now, generateId: () => "b" });

  const dataA = loadParticipantData("P00001", storage);
  const dataB = loadParticipantData("P00002", storage);
  assert.equal(dataA.sessions.length, 1);
  assert.equal(dataB.sessions.length, 1);
  assert.equal(dataA.sessions[0].sessionId, "a");
  assert.equal(dataB.sessions[0].sessionId, "b");
});
