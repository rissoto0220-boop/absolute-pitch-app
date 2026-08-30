// 保存済みのセッション・回答データから、履歴一覧とCSV出力用の行を組み立てる
// (仕様 relative-pitch-test-spec.md §19〜20)。
// 正解数・正答率などは保存時に別途持たず、responsesから都度数え直す
// (値がずれる心配をなくし、保存側の実装をシンプルに保つため。絶対音感reports.jsと同じ考え方)。
import { TOTAL_QUESTIONS } from "./question-generator.js";
import { calculateAccuracy } from "./scoring.js";
import { toFilenameTimestamp } from "../shared/iso-time.js";

function summarize(session) {
  const testResponses = session.responses.filter((r) => r.phase === "test");
  const practiceResponses = session.responses.filter((r) => r.phase === "practice");
  const answeredTestResponses = testResponses.filter((r) => r.outcome === "correct" || r.outcome === "incorrect");
  const correctCount = testResponses.filter((r) => r.outcome === "correct").length;
  const incorrectCount = testResponses.filter((r) => r.outcome === "incorrect").length;
  // 中断時に進行していた問題(仕様17.2)。中断以外のセッションには存在しない。
  const interruptedRow = session.responses.find((r) => r.outcome === "interrupted");

  return {
    practiceQuestionsPresented: practiceResponses.length,
    questionsPresented: testResponses.length,
    questionsAnswered: answeredTestResponses.length,
    correctCount,
    incorrectCount,
    // 正答率は完了したセッションについてだけ意味を持つ(仕様15.1・21章)。
    // 中断セッションでは、途中までの数字を完了時と同じ扱いで見せないよう空欄にする。
    accuracy: session.sessionStatus === "completed" ? calculateAccuracy(correctCount, TOTAL_QUESTIONS) : "",
    interruptedPhase: interruptedRow ? interruptedRow.phase : "",
    interruptedQuestionNumber: interruptedRow ? interruptedRow.questionNumber : "",
  };
}

// completed/interruptedのいずれかに確定済みのセッションだけを対象にし、
// includeInterruptedがfalseならinterruptedを除外する(仕様19・20.2)。
function filterSessions(sessions, includeInterrupted) {
  return sessions.filter((s) => s.sessionStatus && (includeInterrupted || s.sessionStatus !== "interrupted"));
}

// 履歴一覧の表示用(仕様19章)。受験回数は、中断も含めた実施日時の古い順に割り当てる
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
      testVersion: session.testVersion,
      correctCount: summarize(session).correctCount,
      accuracy: summarize(session).accuracy,
    }))
    .filter((row) => includeInterrupted || row.sessionStatus !== "interrupted");
}

// 推奨ファイル名(仕様20.2)。例: P00001_relative_pitch_responses_20260830_153525.csv
export function buildCsvFilename(participantId, kind, date = new Date()) {
  return `${participantId}_relative_pitch_${kind}_${toFilenameTimestamp(date)}.csv`;
}

export const RESPONSE_DETAIL_HEADERS = [
  "participant_id", "session_id", "test_type", "test_version", "phase", "session_status", "answer_layout",
  "question_number", "key_block_number", "key_code", "cadence_filename", "reference_note", "target_note",
  "interval_semitones", "syllable_code", "display_label", "interval_label", "scale_label",
  "cadence_started_at", "reference_started_at", "target_started_at",
  "response_code", "response_at", "response_time_ms", "outcome",
];

export function buildResponseDetailRows(participantId, sessions, includeInterrupted) {
  const rows = [];
  filterSessions(sessions, includeInterrupted).forEach((session) => {
    session.responses.forEach((r) => {
      rows.push({
        participant_id: participantId,
        session_id: session.sessionId,
        test_type: session.testType,
        test_version: session.testVersion,
        phase: r.phase,
        session_status: session.sessionStatus,
        answer_layout: session.answerLayout,
        question_number: r.questionNumber,
        key_block_number: r.keyBlockNumber,
        key_code: r.keyCode,
        cadence_filename: r.cadenceFilename,
        reference_note: r.referenceNote,
        target_note: r.targetNote,
        interval_semitones: r.intervalSemitones,
        syllable_code: r.syllableCode,
        display_label: r.displayLabel,
        interval_label: r.intervalLabel,
        scale_label: r.scaleLabel,
        cadence_started_at: r.cadenceStartedAt ?? "",
        // 中断のタイミングによっては、基準音・目的音の提示前に確定することがある(仕様17.2)。
        // その場合は明示的に空欄にする(toCsv側のundefined→""変換に頼らない)。
        reference_started_at: r.referenceStartedAt ?? "",
        target_started_at: r.targetStartedAt ?? "",
        response_code: r.responseCode,
        response_at: r.responseAt,
        response_time_ms: r.responseTimeMs,
        outcome: r.outcome,
      });
    });
  });
  return rows;
}

export const SESSION_HISTORY_HEADERS = [
  "participant_id", "session_id", "test_type", "test_version", "started_at", "ended_at", "session_status",
  "answer_layout", "practice_status", "practice_questions_presented", "questions_presented",
  "questions_answered", "correct_count", "incorrect_count", "accuracy",
  "interrupted_phase", "interrupted_question_number",
];

export function buildSessionHistoryRows(participantId, sessions, includeInterrupted) {
  return filterSessions(sessions, includeInterrupted).map((session) => {
    const s = summarize(session);
    return {
      participant_id: participantId,
      session_id: session.sessionId,
      test_type: session.testType,
      test_version: session.testVersion,
      started_at: session.startedAt,
      ended_at: session.endedAt,
      session_status: session.sessionStatus,
      answer_layout: session.answerLayout,
      practice_status: session.practiceStatus,
      practice_questions_presented: s.practiceQuestionsPresented,
      questions_presented: s.questionsPresented,
      questions_answered: s.questionsAnswered,
      correct_count: s.correctCount,
      incorrect_count: s.incorrectCount,
      accuracy: s.accuracy,
      interrupted_phase: s.interruptedPhase,
      interrupted_question_number: s.interruptedQuestionNumber,
    };
  });
}
