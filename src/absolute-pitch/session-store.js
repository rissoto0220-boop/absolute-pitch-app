// セッション・回答記録の組み立てとブラウザ保存(仕様17〜19章)。
// 参加者IDごとにlocalStorageの1キーへ、その参加者の全セッションをまとめて保存する。
import { loadJson, saveJson } from "../shared/storage.js";
import { toLocalIso } from "../shared/iso-time.js";

const SCHEMA_VERSION = 1;
const TEST_TYPE = "absolute_pitch";

function storageKeyFor(participantId) {
  return `absolute-pitch:${participantId}`;
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

// 前回、completed/forced_terminationにならないまま残っていたセッションを
// interruptedとして確定する(仕様6.2・19章)。「閉じる瞬間」を検出するのではなく、
// 次にこの参加者が新しいセッションを始めるタイミングで確定させる。
function reconcileDanglingSessions(data, now) {
  data.sessions.forEach((session) => {
    if (session.sessionStatus) return; // すでにcompleted/forced_terminationで終了済み
    if (session.currentQuestion) {
      // 音源再生後、回答またはタイムアウトが確定する前に中断した問題(仕様19.2)。
      session.responses.push({
        ...session.currentQuestion,
        responseNote: "",
        responseAt: "",
        responseTimeMs: "",
        outcome: "interrupted",
        incorrectTotalAfterQuestion: "",
      });
      session.currentQuestion = null;
    }
    session.sessionStatus = "interrupted";
    session.endedAt = now();
  });
}

export function startSession(participantId, { storage, now = () => toLocalIso(), generateId = () => crypto.randomUUID() }) {
  const data = loadParticipantData(participantId, storage);
  reconcileDanglingSessions(data, now);

  const session = {
    sessionId: generateId(),
    testType: TEST_TYPE,
    startedAt: now(),
    endedAt: "",
    sessionStatus: null, // completed/forced_termination/interrupted が決まるまではnull
    sequenceStartPosition: "",
    sequenceStartNumber: "",
    sequenceDirection: "",
    currentQuestion: null,
    responses: [],
  };
  data.sessions.push(session);
  persistParticipantData(participantId, data, storage);

  return { data, session };
}

// 出題(音声再生開始)の時点で「進行中の問題」として記録する(仕様23.2のstimulus_started_at)。
export function beginQuestion(session, questionInfo, now = () => toLocalIso()) {
  session.currentQuestion = { ...questionInfo, stimulusStartedAt: now() };
}

// 回答またはタイムアウトが確定した時点で、進行中の問題を正式な1行として記録する。
export function finalizeQuestion(session, result) {
  const current = session.currentQuestion;
  session.responses.push({
    ...current,
    responseNote: result.responseNote,
    responseAt: result.responseAt,
    responseTimeMs: result.responseTimeMs,
    outcome: result.outcome,
    incorrectTotalAfterQuestion: result.incorrectTotalAfterQuestion,
  });
  session.currentQuestion = null;
}

// セッション全体の終了(completed/forced_termination/interrupted、仕様18章)。
export function finalizeSession(session, sessionStatus, now = () => toLocalIso()) {
  session.sessionStatus = sessionStatus;
  session.endedAt = now();
}
