// 保存済みのセッション・回答データから、履歴一覧とCSV出力用の行を組み立てる(仕様20〜24章)。
// 正解数や誤答数などは保存時に別途持たず、responsesから都度数え直す
// (値がずれる心配をなくし、保存側の実装をシンプルに保つため)。
import { TOTAL_QUESTIONS } from "./main-test.js";
import { toFilenameTimestamp } from "../shared/iso-time.js";

function summarize(session) {
  const testResponses = session.responses.filter((r) => r.phase === "test");
  const practiceResponses = session.responses.filter((r) => r.phase === "practice");
  const correctCount = testResponses.filter((r) => r.outcome === "correct").length;
  const incorrectAnswerCount = testResponses.filter((r) => r.outcome === "incorrect").length;
  const timeoutCount = testResponses.filter((r) => r.outcome === "timeout").length;
  const practiceTimeoutCount = practiceResponses.filter((r) => r.outcome === "timeout").length;
  // 中断時に進行していた問題(仕様19.2・24.2)。中断以外のセッションには存在しない。
  const interruptedRow = session.responses.find((r) => r.outcome === "interrupted");

  return {
    correctCount,
    incorrectAnswerCount,
    timeoutCount,
    totalIncorrectCount: incorrectAnswerCount + timeoutCount,
    practiceQuestionsPresented: practiceResponses.length,
    practiceTimeoutCount,
    questionsPresented: testResponses.length,
    unpresentedCount: TOTAL_QUESTIONS - testResponses.length,
    interruptedPhase: interruptedRow ? interruptedRow.phase : "",
    interruptedQuestionNumber: interruptedRow ? interruptedRow.questionNumber : "",
  };
}

// completed/forced_termination/interruptedのいずれかに確定済みのセッションだけを対象にし、
// includeInterruptedがfalseならinterruptedを除外する(仕様20.1・22.2)。
function filterSessions(sessions, includeInterrupted) {
  return sessions.filter((s) => s.sessionStatus && (includeInterrupted || s.sessionStatus !== "interrupted"));
}

// 履歴一覧の表示用(仕様20章)。受験回数は、中断も含めた実施日時の古い順に割り当てる
// (仕様21章の将来グラフと同じ考え方)。表示を絞り込んでも番号は詰め直さない。
export function buildHistorySummary(sessions, includeInterrupted) {
  const chronological = [...sessions]
    .filter((s) => s.sessionStatus)
    .sort((a, b) => (a.startedAt < b.startedAt ? -1 : a.startedAt > b.startedAt ? 1 : 0));

  return chronological
    .map((session, index) => ({
      attemptNumber: index + 1,
      startedAt: session.startedAt,
      sessionStatus: session.sessionStatus,
      correctCount: summarize(session).correctCount,
    }))
    .filter((row) => includeInterrupted || row.sessionStatus !== "interrupted");
}

// 推奨ファイル名(仕様22.3)。例: P00001_absolute_pitch_responses_20260823_153525.csv
export function buildCsvFilename(participantId, kind, date = new Date()) {
  return `${participantId}_absolute_pitch_${kind}_${toFilenameTimestamp(date)}.csv`;
}

export const RESPONSE_DETAIL_HEADERS = [
  "participant_id", "session_id", "test_type", "phase", "session_status", "session_started_at",
  "question_number", "stimulus_number", "stimulus_note", "stimulus_filename", "stimulus_started_at",
  "correct_response", "response_note", "response_at", "response_time_ms", "outcome",
  "incorrect_total_after_question", "sequence_start_position", "sequence_start_number", "sequence_direction",
];

export function buildResponseDetailRows(participantId, sessions, includeInterrupted) {
  const rows = [];
  filterSessions(sessions, includeInterrupted).forEach((session) => {
    session.responses.forEach((r) => {
      const isTest = r.phase === "test";
      rows.push({
        participant_id: participantId,
        session_id: session.sessionId,
        test_type: session.testType,
        phase: r.phase,
        session_status: session.sessionStatus,
        session_started_at: session.startedAt,
        question_number: r.questionNumber,
        stimulus_number: r.stimulusNumber,
        stimulus_note: r.stimulusNote,
        stimulus_filename: r.stimulusFilename,
        stimulus_started_at: r.stimulusStartedAt,
        correct_response: r.correctResponse,
        response_note: r.responseNote,
        response_at: r.responseAt,
        response_time_ms: r.responseTimeMs,
        outcome: r.outcome,
        // 練習行では空欄にする(仕様23.2)。
        incorrect_total_after_question: isTest ? r.incorrectTotalAfterQuestion : "",
        sequence_start_position: isTest ? session.sequenceStartPosition : "",
        sequence_start_number: isTest ? session.sequenceStartNumber : "",
        sequence_direction: isTest ? session.sequenceDirection : "",
      });
    });
  });
  return rows;
}

export const SESSION_HISTORY_HEADERS = [
  "participant_id", "session_id", "test_type", "started_at", "ended_at", "session_status",
  "practice_questions_presented", "practice_timeout_count", "questions_presented",
  "correct_count", "incorrect_answer_count", "timeout_count", "total_incorrect_count", "unpresented_count",
  "sequence_start_position", "sequence_start_number", "sequence_direction",
  "interrupted_phase", "interrupted_question_number",
];

export function buildSessionHistoryRows(participantId, sessions, includeInterrupted) {
  return filterSessions(sessions, includeInterrupted).map((session) => {
    const s = summarize(session);
    return {
      participant_id: participantId,
      session_id: session.sessionId,
      test_type: session.testType,
      started_at: session.startedAt,
      ended_at: session.endedAt,
      session_status: session.sessionStatus,
      practice_questions_presented: s.practiceQuestionsPresented,
      practice_timeout_count: s.practiceTimeoutCount,
      questions_presented: s.questionsPresented,
      correct_count: s.correctCount,
      incorrect_answer_count: s.incorrectAnswerCount,
      timeout_count: s.timeoutCount,
      total_incorrect_count: s.totalIncorrectCount,
      unpresented_count: s.unpresentedCount,
      sequence_start_position: session.sequenceStartPosition,
      sequence_start_number: session.sequenceStartNumber,
      sequence_direction: session.sequenceDirection,
      interrupted_phase: s.interruptedPhase,
      interrupted_question_number: s.interruptedQuestionNumber,
    };
  });
}
