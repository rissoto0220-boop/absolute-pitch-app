// セッション・回答記録の組み立てとブラウザ保存(仕様 relative-pitch-test-spec.md §17〜19)。
// 参加者IDごとに、絶対音感とは別のlocalStorageキーへ、その参加者の相対音感の全セッションを
// まとめて保存する(仕様18.3で確定: 絶対音感の保存キー・コードには一切触れない)。
// 簡易版・完全版は、同じキーの中にtestVersion列で区別して保存する想定(仕様18.3)。
import { loadJson, saveJson } from "../shared/storage.js";
import { toLocalIso } from "../shared/iso-time.js";

const SCHEMA_VERSION = 1;
const TEST_TYPE = "relative_pitch";
const TEST_VERSION = "simplified"; // 完全版はまだ実装しない(仕様6.2)

function storageKeyFor(participantId) {
  return `relative-pitch:${participantId}`;
}

function emptyParticipantData() {
  return { schemaVersion: SCHEMA_VERSION, sessions: [] };
}

export function loadParticipantData(participantId, storage) {
  return loadJson(storage, storageKeyFor(participantId), emptyParticipantData());
}

export function persistParticipantData(participantId, data, storage) {
  return saveJson(storage, storageKeyFor(participantId), data);
}

// 前回、completedにならないまま残っていたセッションをinterruptedとして確定する
// (仕様17.1・17.3・19章と同じ考え方)。簡易版に強制終了は無いため、確定する状態は
// completedかinterruptedのいずれかになる。
function reconcileDanglingSessions(data, now) {
  data.sessions.forEach((session) => {
    if (session.sessionStatus) return; // すでにcompletedで終了済み
    if (session.currentQuestion) {
      // 回答確定前に中断した問題(仕様17.2)。目的音提示前の中断は採点しない
      // (outcomeをinterruptedとして残すだけで、正解・不正解のいずれにもしない)。
      session.responses.push({
        ...session.currentQuestion,
        responseCode: "",
        responseAt: "",
        responseTimeMs: "",
        outcome: "interrupted",
      });
      session.currentQuestion = null;
    }
    session.sessionStatus = "interrupted";
    session.endedAt = now();
  });
}

// options.answerLayout: フェーズ2で選んだレイアウト("circular"または"grid")。
export function startSession(participantId, {
  storage,
  answerLayout = "",
  now = () => toLocalIso(),
  generateId = () => crypto.randomUUID(),
}) {
  const data = loadParticipantData(participantId, storage);
  reconcileDanglingSessions(data, now);

  const session = {
    sessionId: generateId(),
    testType: TEST_TYPE,
    testVersion: TEST_VERSION,
    startedAt: now(),
    endedAt: "",
    sessionStatus: null, // completed/interrupted が決まるまではnull(簡易版に強制終了はない、仕様15.1)
    answerLayout,
    practiceStatus: null, // completed/skipped/interrupted(仕様13.4)
    generatedQuestionOrder: [], // 本番12問の半音差の出題順(仕様18.2)
    currentQuestion: null,
    responses: [],
  };
  data.sessions.push(session);
  persistParticipantData(participantId, data, storage);

  return { data, session };
}

export function setPracticeStatus(session, practiceStatus) {
  session.practiceStatus = practiceStatus;
}

export function setGeneratedQuestionOrder(session, sequence) {
  session.generatedQuestionOrder = sequence.map((q) => q.intervalSemitones);
}

// カデンツの再生を予約した時点で「進行中の問題」として記録する。
export function beginQuestion(session, questionInfo, now = () => toLocalIso()) {
  session.currentQuestion = { ...questionInfo, cadenceStartedAt: now() };
}

// 基準音・目的音それぞれの再生を予約した時点の時刻を、進行中の問題へ追記する
// (仕様17.2の中断段階の把握用)。
export function recordStageStarted(session, stage, now = () => toLocalIso()) {
  if (!session.currentQuestion) return;
  if (stage === "reference") session.currentQuestion.referenceStartedAt = now();
  if (stage === "target") session.currentQuestion.targetStartedAt = now();
}

// 回答が確定した時点で、進行中の問題を正式な1行として記録する。
export function finalizeQuestion(session, result) {
  const current = session.currentQuestion;
  session.responses.push({
    ...current,
    responseCode: result.responseCode,
    responseAt: result.responseAt,
    responseTimeMs: result.responseTimeMs,
    outcome: result.outcome,
  });
  session.currentQuestion = null;
}

// セッション全体の終了(completed/interrupted、仕様15.1・18章)。
export function finalizeSession(session, sessionStatus, now = () => toLocalIso()) {
  session.sessionStatus = sessionStatus;
  session.endedAt = now();
}
