// 確定したセッションをサーバーAPI(session_create.php)へ送信する(server/docs/session-create-api.md)。
//
// 送信のたびに個別の再送処理を書くのではなく、「localStorageに保存されている確定済みセッションのうち、
// まだ送れていないものを全部送る」同期処理1本にまとめている。APIは同じsessionIdの再送に安全
// (保存済みなら200を返して何もしない)なので、何度呼んでも問題ない。これにより、送信失敗時の再送・
// オフライン時の後回し・次回開始時に中断と確定した放置セッションの送信が、すべて同じ仕組みで扱える。
//
// 送信状態は既存のセッションデータとは別のキーに保存し、絶対音感・相対音感の保存形式には手を加えない。
import { loadJson, saveJson } from "./storage.js";

export const UPLOAD_STATE_KEY = "session-uploads";

// localStorageのキー名 → APIのtestType。参加者IDはキー名の後半から取り出す。
const TEST_TYPE_BY_KEY_PREFIX = {
  "absolute-pitch": "absolute_pitch",
  "relative-pitch": "relative_pitch",
};
const SESSION_KEY_PATTERN = /^(absolute-pitch|relative-pitch):(P\d{5})$/;

// 再送しても結果が変わらない応答(データ不正・同じ開始時刻に別セッションが保存済み、など)。
// 何度も送り続けないよう、失敗として記録して以後は送らない。
const PERMANENT_FAILURE_STATUSES = new Set([400, 405, 409]);

// sessionStatusが確定し、進行中の問題が残っていないセッションだけを送る(API仕様5節)。
export function isUploadable(session) {
  return Boolean(session && session.sessionStatus && session.endedAt && !session.currentQuestion);
}

// currentQuestionは送信不要(API仕様2節)。
export function toPayload(session) {
  const { currentQuestion: _currentQuestion, ...payload } = session;
  return payload;
}

// 1セッションを送信し、結果を "sent"(成功)・"failed"(再送しても直らない)・
// "retry"(通信エラー・サーバー障害。次回の同期で再送する)のいずれかに分類して返す。
export async function uploadSession({ testType, participantId, session, endpoint, fetchFn }) {
  const url = `${endpoint}?testType=${encodeURIComponent(testType)}&participantId=${encodeURIComponent(participantId)}`;
  let response;
  try {
    response = await fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(session)),
      // テスト終了直後にページが閉じられても、送信が途中で打ち切られにくくする。
      keepalive: true,
    });
  } catch {
    return { result: "retry", httpStatus: null };
  }
  const httpStatus = response.status;
  if (httpStatus === 200 || httpStatus === 201) return { result: "sent", httpStatus };
  if (PERMANENT_FAILURE_STATUSES.has(httpStatus)) return { result: "failed", httpStatus };
  return { result: "retry", httpStatus };
}

function collectPendingSessions(storage, uploadState) {
  const keys = [];
  for (let i = 0; i < storage.length; i += 1) keys.push(storage.key(i));

  const pending = [];
  keys.forEach((key) => {
    const match = SESSION_KEY_PATTERN.exec(key ?? "");
    if (!match) return;
    const testType = TEST_TYPE_BY_KEY_PREFIX[match[1]];
    const participantId = match[2];
    const data = loadJson(storage, key, { sessions: [] });
    (data.sessions ?? []).forEach((session) => {
      if (!isUploadable(session)) return;
      if (uploadState[session.sessionId]) return; // 送信済み、または再送しても直らない失敗
      pending.push({ testType, participantId, session });
    });
  });
  return pending;
}

async function runSync({ storage, fetchFn, endpoint, now }) {
  const uploadState = loadJson(storage, UPLOAD_STATE_KEY, {});
  const summary = { sent: 0, failed: 0, retry: 0 };

  for (const item of collectPendingSessions(storage, uploadState)) {
    // 1件ずつ順番に送る(keepaliveの合計サイズ上限を超えないようにするため)。
    const { result, httpStatus } = await uploadSession({ ...item, endpoint, fetchFn });
    summary[result] += 1;
    if (result === "retry") continue; // 記録しない → 次回の同期で自動的に再送される
    uploadState[item.session.sessionId] = { status: result, httpStatus, at: now() };
    saveJson(storage, UPLOAD_STATE_KEY, uploadState);
  }
  return summary;
}

let inFlight = null;
let rerunRequested = false;

// 未送信の確定済みセッションをすべて送る。実行中に呼ばれた場合は二重に送らず、
// 実行中の処理が終わった後にもう一度だけ同期し直す(その間に確定したセッションを取りこぼさないため)。
export function syncPendingSessions({ storage, fetchFn, endpoint, now = () => new Date().toISOString() }) {
  if (inFlight) {
    rerunRequested = true;
    return inFlight;
  }
  inFlight = (async () => {
    const total = { sent: 0, failed: 0, retry: 0 };
    do {
      rerunRequested = false;
      const summary = await runSync({ storage, fetchFn, endpoint, now });
      total.sent += summary.sent;
      total.failed += summary.failed;
      total.retry += summary.retry;
    } while (rerunRequested);
    return total;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
