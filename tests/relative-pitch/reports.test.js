import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildHistorySummary,
  buildResponseDetailRows,
  buildSessionHistoryRows,
  buildCsvFilename,
  RESPONSE_DETAIL_HEADERS,
  SESSION_HISTORY_HEADERS,
} from "../../src/relative-pitch/reports.js";

function makeResponse(overrides) {
  return {
    phase: "test",
    questionNumber: 1,
    keyCode: "C",
    keyBlockNumber: 1,
    cadenceFilename: "cadence_C.wav",
    referenceNote: "C4",
    targetNote: "E4",
    intervalSemitones: 4,
    syllableCode: "MiM",
    displayLabel: "ミ",
    intervalLabel: "short",
    scaleLabel: "in",
    cadenceStartedAt: "2026-01-01T00:00:00.000+09:00",
    referenceStartedAt: "2026-01-01T00:00:03.000+09:00",
    targetStartedAt: "2026-01-01T00:00:04.000+09:00",
    responseCode: 4,
    responseAt: "2026-01-01T00:00:04.350+09:00",
    responseTimeMs: 350,
    outcome: "correct",
    ...overrides,
  };
}

function makePracticeResponses() {
  return [
    makeResponse({ phase: "practice", questionNumber: 1, keyBlockNumber: "", outcome: "correct" }),
    makeResponse({ phase: "practice", questionNumber: 2, keyBlockNumber: "", outcome: "incorrect" }),
    makeResponse({ phase: "practice", questionNumber: 3, keyBlockNumber: "", outcome: "correct" }),
  ];
}

function makeSession(overrides) {
  return {
    sessionId: "s1",
    testType: "relative_pitch",
    testVersion: "simplified",
    startedAt: "2026-01-01T00:00:00.000+09:00",
    endedAt: "2026-01-01T00:10:00.000+09:00",
    sessionStatus: "completed",
    answerLayout: "circular",
    practiceStatus: "completed",
    generatedQuestionOrder: [4, 8, 1, 2, 3, 5, 6, 7, 9, 10, 11, 13],
    currentQuestion: null,
    responses: [],
    ...overrides,
  };
}

test("buildHistorySummary: 実施日時の古い順に受験回数を割り当てる", () => {
  const older = makeSession({ sessionId: "old", startedAt: "2026-01-01T00:00:00.000+09:00" });
  const newer = makeSession({ sessionId: "new", startedAt: "2026-01-02T00:00:00.000+09:00" });
  const summary = buildHistorySummary([newer, older], true);

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

test("buildResponseDetailRows: 列順がRESPONSE_DETAIL_HEADERSと一致する(仕様20.3)", () => {
  assert.deepEqual(RESPONSE_DETAIL_HEADERS, [
    "participant_id", "session_id", "test_type", "test_version", "phase", "session_status", "answer_layout",
    "question_number", "key_block_number", "key_code", "cadence_filename", "reference_note", "target_note",
    "interval_semitones", "syllable_code", "display_label", "interval_label", "scale_label",
    "cadence_started_at", "reference_started_at", "target_started_at",
    "response_code", "response_at", "response_time_ms", "outcome",
  ]);
});

test("buildResponseDetailRows: 練習行はkey_block_numberを空欄にする", () => {
  const session = makeSession({ responses: makePracticeResponses() });
  const rows = buildResponseDetailRows("P00001", [session], true);

  rows.forEach((row) => {
    assert.equal(row.phase, "practice");
    assert.equal(row.key_block_number, "");
  });
});

test("buildResponseDetailRows: 本番行はkey_block_number等を含み、参加者IDが反映される", () => {
  const session = makeSession({ responses: [makeResponse({ phase: "test" })] });
  const [row] = buildResponseDetailRows("P00001", [session], true);
  assert.equal(row.participant_id, "P00001");
  assert.equal(row.key_block_number, 1);
  assert.equal(row.answer_layout, "circular");
  assert.equal(row.interval_semitones, 4);
});

test("buildResponseDetailRows: 目的音提示前の中断はreference/target_started_atが空欄になる", () => {
  const session = makeSession({
    sessionStatus: "interrupted",
    responses: [makeResponse({
      outcome: "interrupted", referenceStartedAt: "2026-01-01T00:00:03.000+09:00", targetStartedAt: undefined,
      responseCode: "", responseAt: "", responseTimeMs: "",
    })],
  });
  const [row] = buildResponseDetailRows("P00001", [session], true);
  assert.equal(row.target_started_at, "");
  assert.equal(row.response_code, "");
});

test("buildResponseDetailRows: includeInterrupted=falseだと中断セッションの行を含まない", () => {
  const session = makeSession({ sessionStatus: "interrupted", responses: [makeResponse({ outcome: "interrupted" })] });
  assert.equal(buildResponseDetailRows("P00001", [session], false).length, 0);
  assert.equal(buildResponseDetailRows("P00001", [session], true).length, 1);
});

test("buildSessionHistoryRows: 列順がSESSION_HISTORY_HEADERSと一致する(仕様20.4)", () => {
  assert.deepEqual(SESSION_HISTORY_HEADERS, [
    "participant_id", "session_id", "test_type", "test_version", "started_at", "ended_at", "session_status",
    "answer_layout", "practice_status", "practice_questions_presented", "questions_presented",
    "questions_answered", "correct_count", "incorrect_count", "accuracy",
    "interrupted_phase", "interrupted_question_number",
  ]);
});

test("buildSessionHistoryRows: 完了時は12問全て答えたことになり、正答率が算出される(仕様15.1・15.2・21章)", () => {
  const testResponses = [
    ...Array.from({ length: 11 }, (_, i) => makeResponse({ questionNumber: i + 1, outcome: "correct" })),
    makeResponse({ questionNumber: 12, outcome: "incorrect" }),
  ];
  const session = makeSession({ responses: [...makePracticeResponses(), ...testResponses] });
  const [row] = buildSessionHistoryRows("P00001", [session], true);

  assert.equal(row.session_status, "completed");
  assert.equal(row.questions_presented, 12);
  assert.equal(row.questions_answered, 12);
  assert.equal(row.correct_count, 11);
  assert.equal(row.incorrect_count, 1);
  assert.equal(row.accuracy, 91.7);
  assert.equal(row.practice_questions_presented, 3);
});

test("buildSessionHistoryRows: 中断セッションは正答率を空欄にする(完了扱いにしない)", () => {
  const testResponses = [
    makeResponse({ questionNumber: 1, outcome: "correct" }),
    makeResponse({ questionNumber: 2, outcome: "interrupted", responseCode: "", responseAt: "", responseTimeMs: "" }),
  ];
  const session = makeSession({ sessionStatus: "interrupted", responses: testResponses });
  const [row] = buildSessionHistoryRows("P00001", [session], true);

  assert.equal(row.accuracy, "");
  assert.equal(row.questions_answered, 1);
  assert.equal(row.interrupted_phase, "test");
  assert.equal(row.interrupted_question_number, 2);
});

test("buildSessionHistoryRows: 中断以外はinterrupted_phase・interrupted_question_numberが空欄", () => {
  const session = makeSession({ responses: [makeResponse({ outcome: "correct" })] });
  const [row] = buildSessionHistoryRows("P00001", [session], true);
  assert.equal(row.interrupted_phase, "");
  assert.equal(row.interrupted_question_number, "");
});

test("buildCsvFilename: 仕様20.2の形式になる", () => {
  const date = { getFullYear: () => 2026, getMonth: () => 7, getDate: () => 30, getHours: () => 15, getMinutes: () => 35, getSeconds: () => 25 };
  assert.equal(buildCsvFilename("P00001", "responses", date), "P00001_relative_pitch_responses_20260830_153525.csv");
});
