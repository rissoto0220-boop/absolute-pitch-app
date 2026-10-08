import { test } from "node:test";
import assert from "node:assert/strict";
import {
  UPLOAD_STATE_KEY,
  isUploadable,
  toPayload,
  uploadSession,
  syncPendingSessions,
} from "../src/shared/session-uploader.js";
import {
  isUploadEnabled,
  resolveSessionEndpoint,
  SESSION_CREATE_ENDPOINT,
  LOCAL_SESSION_CREATE_ENDPOINT,
} from "../src/shared/server-config.js";

const ENDPOINT = "https://example.test/api/session_create.php";

// localStorageと同じく、length・key(i)で全キーを列挙できる疑似ストレージ。
function makeFakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, value); },
  };
}

// 呼び出し内容を記録し、URLごとに決めた応答(数値のステータス、または例外)を返す疑似fetch。
function makeFakeFetch(respond) {
  const calls = [];
  const fetchFn = async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    const outcome = respond(url, calls.length);
    if (outcome instanceof Error) throw outcome;
    return { status: outcome };
  };
  return { fetchFn, calls };
}

function finalizedSession(overrides = {}) {
  return {
    sessionId: "11111111-1111-1111-1111-111111111111",
    testType: "relative_pitch",
    startedAt: "2026-10-08T10:00:00+09:00",
    endedAt: "2026-10-08T10:05:00+09:00",
    sessionStatus: "completed",
    currentQuestion: null,
    responses: [],
    ...overrides,
  };
}

test("isUploadable: sessionStatus・endedAtが確定し、進行中の問題が無いセッションだけ送信対象", () => {
  assert.equal(isUploadable(finalizedSession()), true);
  assert.equal(isUploadable(finalizedSession({ sessionStatus: null })), false);
  assert.equal(isUploadable(finalizedSession({ endedAt: "" })), false);
  assert.equal(isUploadable(finalizedSession({ currentQuestion: { phase: "test" } })), false);
});

test("toPayload: currentQuestionを除き、それ以外はそのまま送る", () => {
  const payload = toPayload(finalizedSession({ answerLayout: "spiral" }));
  assert.equal("currentQuestion" in payload, false);
  assert.equal(payload.answerLayout, "spiral");
  assert.equal(payload.sessionId, "11111111-1111-1111-1111-111111111111");
});

test("uploadSession: testType・participantIdをクエリに付けてJSONをPOSTする", async () => {
  const { fetchFn, calls } = makeFakeFetch(() => 201);
  await uploadSession({ testType: "relative_pitch", participantId: "P99901", session: finalizedSession(), endpoint: ENDPOINT, fetchFn });
  assert.equal(calls[0].url, `${ENDPOINT}?testType=relative_pitch&participantId=P99901`);
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers["Content-Type"], "application/json");
  assert.equal(calls[0].options.keepalive, true);
});

test("uploadSession: 応答を sent / failed / retry に分類する(API仕様3節)", async () => {
  const classify = async (outcome) => {
    const { fetchFn } = makeFakeFetch(() => outcome);
    return (await uploadSession({ testType: "relative_pitch", participantId: "P99901", session: finalizedSession(), endpoint: ENDPOINT, fetchFn })).result;
  };
  assert.equal(await classify(201), "sent");
  assert.equal(await classify(200), "sent");
  assert.equal(await classify(400), "failed");
  assert.equal(await classify(409), "failed");
  assert.equal(await classify(500), "retry");
  assert.equal(await classify(503), "retry");
  assert.equal(await classify(new TypeError("Failed to fetch")), "retry");
});

test("syncPendingSessions: 絶対音感・相対音感の確定済みセッションを送り、未確定は送らない", async () => {
  const storage = makeFakeStorage({
    "relative-pitch:P99901": { sessions: [finalizedSession({ sessionId: "r-done" }), finalizedSession({ sessionId: "r-open", sessionStatus: null, endedAt: "" })] },
    "absolute-pitch:P99902": { sessions: [finalizedSession({ sessionId: "a-done", testType: "absolute_pitch", sessionStatus: "forced_termination" })] },
    "unrelated-key": { sessions: [finalizedSession({ sessionId: "ignored" })] },
  });
  const { fetchFn, calls } = makeFakeFetch(() => 201);

  const summary = await syncPendingSessions({ storage, fetchFn, endpoint: ENDPOINT });

  assert.deepEqual(summary, { sent: 2, failed: 0, retry: 0 });
  assert.deepEqual(calls.map((c) => c.body.sessionId).sort(), ["a-done", "r-done"]);
  assert.ok(calls.some((c) => c.url.endsWith("testType=absolute_pitch&participantId=P99902")));
  assert.ok(calls.some((c) => c.url.endsWith("testType=relative_pitch&participantId=P99901")));
});

test("syncPendingSessions: 送信に成功したセッションは、次の同期では送らない", async () => {
  const storage = makeFakeStorage({ "relative-pitch:P99901": { sessions: [finalizedSession({ sessionId: "s1" })] } });
  const { fetchFn, calls } = makeFakeFetch(() => 201);

  await syncPendingSessions({ storage, fetchFn, endpoint: ENDPOINT });
  await syncPendingSessions({ storage, fetchFn, endpoint: ENDPOINT });

  assert.equal(calls.length, 1);
  assert.equal(JSON.parse(storage.getItem(UPLOAD_STATE_KEY)).s1.status, "sent");
});

test("syncPendingSessions: 409・400は失敗として記録し、再送しない", async () => {
  const storage = makeFakeStorage({ "relative-pitch:P99901": { sessions: [finalizedSession({ sessionId: "s1" })] } });
  const { fetchFn, calls } = makeFakeFetch(() => 409);

  await syncPendingSessions({ storage, fetchFn, endpoint: ENDPOINT });
  await syncPendingSessions({ storage, fetchFn, endpoint: ENDPOINT });

  assert.equal(calls.length, 1);
  const state = JSON.parse(storage.getItem(UPLOAD_STATE_KEY));
  assert.deepEqual([state.s1.status, state.s1.httpStatus], ["failed", 409]);
});

test("syncPendingSessions: 通信エラー・5xxは記録せず、次の同期で再送する", async () => {
  const storage = makeFakeStorage({ "relative-pitch:P99901": { sessions: [finalizedSession({ sessionId: "s1" })] } });
  const { fetchFn, calls } = makeFakeFetch((_url, callCount) => (callCount === 1 ? new TypeError("offline") : 201));

  const first = await syncPendingSessions({ storage, fetchFn, endpoint: ENDPOINT });
  assert.deepEqual(first, { sent: 0, failed: 0, retry: 1 });
  assert.equal(storage.getItem(UPLOAD_STATE_KEY), null);

  const second = await syncPendingSessions({ storage, fetchFn, endpoint: ENDPOINT });
  assert.deepEqual(second, { sent: 1, failed: 0, retry: 0 });
  assert.equal(calls.length, 2);
});

test("syncPendingSessions: 実行中に再度呼ばれても二重送信せず、終了後に確定したセッションも拾う", async () => {
  const sessions = [finalizedSession({ sessionId: "s1" })];
  const storage = makeFakeStorage({ "relative-pitch:P99901": { sessions } });
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const calls = [];
  const fetchFn = async (_url, options) => {
    calls.push(JSON.parse(options.body).sessionId);
    if (calls.length === 1) await gate;
    return { status: 201 };
  };

  const first = syncPendingSessions({ storage, fetchFn, endpoint: ENDPOINT });
  // 1件目の送信中に、別のセッションが確定して同期が要求された状況。
  storage.setItem("relative-pitch:P99901", JSON.stringify({ sessions: [...sessions, finalizedSession({ sessionId: "s2" })] }));
  const second = syncPendingSessions({ storage, fetchFn, endpoint: ENDPOINT });
  assert.equal(first, second, "実行中は同じ処理を返す");
  release();
  await first;

  assert.deepEqual(calls, ["s1", "s2"]);
});

test("isUploadEnabled: 本番ホストでは送信し、開発ホストでは ?upload=1 のときだけ送信する", () => {
  assert.equal(isUploadEnabled({ hostname: "uec-tst.koto.jp", search: "" }), true);
  assert.equal(isUploadEnabled({ hostname: "absolute-pitch-app.vercel.app", search: "" }), true);
  assert.equal(isUploadEnabled({ hostname: "localhost", search: "" }), false);
  assert.equal(isUploadEnabled({ hostname: "192.168.11.21", search: "" }), false);
  assert.equal(isUploadEnabled({ hostname: "localhost", search: "?upload=1" }), true);
  assert.equal(isUploadEnabled(undefined), false);
});

test("resolveSessionEndpoint: ?upload=local は手元のAPI、?upload=1 と本番ホストは本番API、開発ホストの既定は送信しない", () => {
  assert.equal(resolveSessionEndpoint({ hostname: "localhost", search: "?upload=local" }), LOCAL_SESSION_CREATE_ENDPOINT);
  assert.equal(resolveSessionEndpoint({ hostname: "localhost", search: "?upload=1" }), SESSION_CREATE_ENDPOINT);
  assert.equal(resolveSessionEndpoint({ hostname: "uec-tst.koto.jp", search: "" }), SESSION_CREATE_ENDPOINT);
  assert.equal(resolveSessionEndpoint({ hostname: "localhost", search: "" }), null);
  assert.equal(resolveSessionEndpoint({ hostname: "192.168.11.21", search: "" }), null);
});
