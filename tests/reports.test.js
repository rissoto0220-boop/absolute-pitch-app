import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildHistorySummary,
  buildResponseDetailRows,
  buildSessionHistoryRows,
  buildCsvFilename,
  RESPONSE_DETAIL_HEADERS,
  SESSION_HISTORY_HEADERS,
} from "../src/absolute-pitch/reports.js";

function makeResponse(overrides) {
  return {
    phase: "test",
    questionNumber: 1,
    stimulusNumber: 1,
    stimulusNote: "C2",
    stimulusFilename: "C2.wav",
    stimulusStartedAt: "2026-01-01T00:00:00.000+09:00",
    correctResponse: "C",
    responseNote: "C",
    responseAt: "2026-01-01T00:00:01.000+09:00",
    responseTimeMs: 900,
    outcome: "correct",
    incorrectTotalAfterQuestion: 0,
    ...overrides,
  };
}

function makePracticeResponses() {
  return [
    makeResponse({ phase: "practice", questionNumber: 1, stimulusNote: "D2", outcome: "correct", incorrectTotalAfterQuestion: "" }),
    makeResponse({ phase: "practice", questionNumber: 2, stimulusNote: "F4", outcome: "incorrect", incorrectTotalAfterQuestion: "" }),
    makeResponse({ phase: "practice", questionNumber: 3, stimulusNote: "Ais6", outcome: "timeout", responseNote: "", responseAt: "", responseTimeMs: "", incorrectTotalAfterQuestion: "" }),
  ];
}

function makeSession(overrides) {
  return {
    sessionId: "s1",
    testType: "absolute_pitch",
    startedAt: "2026-01-01T00:00:00.000+09:00",
    endedAt: "2026-01-01T00:10:00.000+09:00",
    sessionStatus: "completed",
    sequenceStartPosition: 5,
    sequenceStartNumber: 22,
    sequenceDirection: "forward",
    currentQuestion: null,
    responses: [],
    ...overrides,
  };
}

test("buildHistorySummary: 実施日時の古い順に受験回数を割り当てる", () => {
  const older = makeSession({ sessionId: "old", startedAt: "2026-01-01T00:00:00.000+09:00" });
  const newer = makeSession({ sessionId: "new", startedAt: "2026-01-02T00:00:00.000+09:00" });
  const summary = buildHistorySummary([newer, older], true); // 保存順が新→旧でも古い順に並べ替わること

  assert.deepEqual(summary.map((r) => [r.attemptNumber, r.startedAt]), [
    [1, "2026-01-01T00:00:00.000+09:00"],
    [2, "2026-01-02T00:00:00.000+09:00"],
  ]);
});

test("buildHistorySummary: includeInterrupted=falseだと中断セッションを除外するが、番号は詰め直さない", () => {
  const interrupted = makeSession({ sessionId: "a", sessionStatus: "interrupted", startedAt: "2026-01-01T00:00:00.000+09:00" });
  const completed = makeSession({ sessionId: "b", startedAt: "2026-01-02T00:00:00.000+09:00" });

  const hidden = buildHistorySummary([interrupted, completed], false);
  assert.deepEqual(hidden.map((r) => r.attemptNumber), [2]);

  const shown = buildHistorySummary([interrupted, completed], true);
  assert.deepEqual(shown.map((r) => r.attemptNumber), [1, 2]);
});

test("buildResponseDetailRows: 列順がRESPONSE_DETAIL_HEADERSと一致する", () => {
  assert.deepEqual(RESPONSE_DETAIL_HEADERS, [
    "participant_id", "session_id", "test_type", "phase", "session_status", "session_started_at",
    "question_number", "stimulus_number", "stimulus_note", "stimulus_filename", "stimulus_started_at",
    "correct_response", "response_note", "response_at", "response_time_ms", "outcome",
    "incorrect_total_after_question", "sequence_start_position", "sequence_start_number", "sequence_direction",
  ]);
});

test("buildResponseDetailRows: 練習行はincorrect_total_after_questionとsequence_*を空欄にする(仕様23.2)", () => {
  const session = makeSession({ responses: makePracticeResponses() });
  const rows = buildResponseDetailRows("P00001", [session], true);

  rows.forEach((row) => {
    assert.equal(row.phase, "practice");
    assert.equal(row.incorrect_total_after_question, "");
    assert.equal(row.sequence_start_position, "");
    assert.equal(row.sequence_start_number, "");
    assert.equal(row.sequence_direction, "");
  });
});

test("buildResponseDetailRows: 本番行はsequence_*を含む", () => {
  const session = makeSession({ responses: [makeResponse({ phase: "test" })] });
  const [row] = buildResponseDetailRows("P00001", [session], true);
  assert.equal(row.sequence_start_position, 5);
  assert.equal(row.sequence_start_number, 22);
  assert.equal(row.sequence_direction, "forward");
  assert.equal(row.participant_id, "P00001");
});

test("buildResponseDetailRows: includeInterrupted=falseだと中断セッションの行を含まない", () => {
  const session = makeSession({ sessionStatus: "interrupted", responses: [makeResponse({ outcome: "interrupted" })] });
  assert.equal(buildResponseDetailRows("P00001", [session], false).length, 0);
  assert.equal(buildResponseDetailRows("P00001", [session], true).length, 1);
});

test("buildSessionHistoryRows: 列順がSESSION_HISTORY_HEADERSと一致し、practice_questions_answeredを含まない", () => {
  assert.deepEqual(SESSION_HISTORY_HEADERS, [
    "participant_id", "session_id", "test_type", "started_at", "ended_at", "session_status",
    "practice_questions_presented", "practice_timeout_count", "questions_presented",
    "correct_count", "incorrect_answer_count", "timeout_count", "total_incorrect_count", "unpresented_count",
    "sequence_start_position", "sequence_start_number", "sequence_direction",
    "interrupted_phase", "interrupted_question_number",
  ]);
  assert.ok(!SESSION_HISTORY_HEADERS.includes("practice_questions_answered"));
});

test("buildSessionHistoryRows: 通常終了はquestions_presented=60・unpresented_count=0(仕様25章)", () => {
  const testResponses = Array.from({ length: 60 }, (_, i) => makeResponse({ questionNumber: i + 1, outcome: "correct" }));
  const session = makeSession({ responses: [...makePracticeResponses(), ...testResponses] });
  const [row] = buildSessionHistoryRows("P00001", [session], true);

  assert.equal(row.session_status, "completed");
  assert.equal(row.questions_presented, 60);
  assert.equal(row.unpresented_count, 0);
  assert.equal(row.correct_count, 60);
  assert.equal(row.total_incorrect_count, 0);
  assert.equal(row.practice_questions_presented, 3);
  assert.equal(row.practice_timeout_count, 1);
});

test("buildSessionHistoryRows: 強制終了はtotal_incorrect_count=13(仕様25章)", () => {
  const testResponses = [
    ...Array.from({ length: 7 }, (_, i) => makeResponse({ questionNumber: i + 1, outcome: "correct" })),
    ...Array.from({ length: 8 }, (_, i) => makeResponse({ questionNumber: i + 8, outcome: "incorrect" })),
    ...Array.from({ length: 5 }, (_, i) => makeResponse({ questionNumber: i + 16, outcome: "timeout" })),
  ]; // 7問正解 + 8誤答 + 5タイムアウト = 20問、誤答+タイムアウト合計13
  const session = makeSession({ sessionStatus: "forced_termination", responses: testResponses });
  const [row] = buildSessionHistoryRows("P00001", [session], true);

  assert.equal(row.questions_presented, 20);
  assert.equal(row.unpresented_count, 40);
  assert.equal(row.correct_count, 7);
  assert.equal(row.incorrect_answer_count, 8);
  assert.equal(row.timeout_count, 5);
  assert.equal(row.total_incorrect_count, 13);
});

test("buildSessionHistoryRows: 中断時のinterrupted_phase・interrupted_question_numberを復元行から求める", () => {
  const responses = [
    makeResponse({ questionNumber: 1, outcome: "correct" }),
    makeResponse({ questionNumber: 2, outcome: "interrupted", responseNote: "", responseAt: "", responseTimeMs: "" }),
  ];
  const session = makeSession({ sessionStatus: "interrupted", responses });
  const [row] = buildSessionHistoryRows("P00001", [session], true);

  assert.equal(row.interrupted_phase, "test");
  assert.equal(row.interrupted_question_number, 2);
});

test("buildSessionHistoryRows: 中断以外は空欄", () => {
  const session = makeSession({ responses: [makeResponse({ outcome: "correct" })] });
  const [row] = buildSessionHistoryRows("P00001", [session], true);
  assert.equal(row.interrupted_phase, "");
  assert.equal(row.interrupted_question_number, "");
});

test("buildCsvFilename: 仕様22.3の形式になる", () => {
  const date = { getFullYear: () => 2026, getMonth: () => 7, getDate: () => 23, getHours: () => 15, getMinutes: () => 35, getSeconds: () => 25 };
  assert.equal(buildCsvFilename("P00001", "responses", date), "P00001_absolute_pitch_responses_20260823_153525.csv");
});
