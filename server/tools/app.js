// API1(session_create.php)の動作確認用。既存クライアント(uec-tst/app.js)が
// 送るであろうデータ形式を模したサンプルセッションJSONを生成し、実際にPOSTする。

const SAMPLE_NOTES = [
  { number: 3, germanNote: "D2", answer: "D", filename: "D2.wav" },
  { number: 30, germanNote: "F4", answer: "F", filename: "F4.wav" },
  { number: 60, germanNote: "H6", answer: "B", filename: "H6.wav" },
];

function toLocalIso(date) {
  const pad = (n, len = 2) => String(n).padStart(len, "0");
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

// status: "completed"(60問完了を模した動作確認用。実際は3問だけ) or
// "interrupted"(本番の途中で再生開始済み・回答未確定のまま離脱したケース。
// 既存クライアントのreconcileDanglingSessions()が組み立てる行と同じ形にする)。
function buildAbsoluteSampleSession(status = "completed") {
  const start = new Date();
  const responses = [];
  let t = new Date(start);

  // 練習3問(どちらのステータスでも共通。練習は最後まで終えてから本番に入る前提のため)。
  SAMPLE_NOTES.forEach((note, i) => {
    responses.push({
      phase: "practice",
      questionNumber: i + 1,
      stimulusNumber: note.number,
      stimulusNote: note.germanNote,
      stimulusFilename: note.filename,
      stimulusStartedAt: toLocalIso(t),
      correctResponse: note.answer,
      responseNote: note.answer,
      responseAt: toLocalIso(new Date(t.getTime() + 800)),
      responseTimeMs: 800,
      outcome: "correct",
      incorrectTotalAfterQuestion: "",
    });
    t = new Date(t.getTime() + 4000);
  });

  if (status === "interrupted") {
    // 本番1問目は回答確定済み、2問目は音声再生開始後・回答確定前に離脱したことにする。
    const answeredNote = SAMPLE_NOTES[0];
    responses.push({
      phase: "test",
      questionNumber: 1,
      stimulusNumber: answeredNote.number,
      stimulusNote: answeredNote.germanNote,
      stimulusFilename: answeredNote.filename,
      stimulusStartedAt: toLocalIso(t),
      correctResponse: answeredNote.answer,
      responseNote: answeredNote.answer,
      responseAt: toLocalIso(new Date(t.getTime() + 900)),
      responseTimeMs: 900,
      outcome: "correct",
      incorrectTotalAfterQuestion: 0,
    });
    t = new Date(t.getTime() + 4000);

    const interruptedNote = SAMPLE_NOTES[1];
    const interruptedAt = new Date(t.getTime() + 1500); // 再生開始1.5秒後に離脱、を想定
    responses.push({
      phase: "test",
      questionNumber: 2,
      stimulusNumber: interruptedNote.number,
      stimulusNote: interruptedNote.germanNote,
      stimulusFilename: interruptedNote.filename,
      stimulusStartedAt: toLocalIso(t),
      correctResponse: interruptedNote.answer,
      responseNote: "",
      responseAt: "",
      responseTimeMs: "",
      outcome: "interrupted",
      incorrectTotalAfterQuestion: "",
    });

    return {
      sessionId: crypto.randomUUID(),
      testType: "absolute_pitch",
      startedAt: toLocalIso(start),
      endedAt: toLocalIso(interruptedAt),
      sessionStatus: "interrupted",
      sequenceStartPosition: 1,
      sequenceStartNumber: SAMPLE_NOTES[0].number,
      sequenceDirection: "forward",
      responses,
    };
  }

  // 本番テストの一部(数問)。動作確認用に3問だけ入れる。
  const testNotes = [
    { note: SAMPLE_NOTES[0], outcome: "correct" },
    { note: SAMPLE_NOTES[1], outcome: "incorrect" },
    { note: SAMPLE_NOTES[2], outcome: "timeout" },
  ];
  let incorrectTotal = 0;
  testNotes.forEach(({ note, outcome }, i) => {
    if (outcome !== "correct") incorrectTotal += 1;
    const answered = outcome !== "timeout";
    responses.push({
      phase: "test",
      questionNumber: i + 1,
      stimulusNumber: note.number,
      stimulusNote: note.germanNote,
      stimulusFilename: note.filename,
      stimulusStartedAt: toLocalIso(t),
      correctResponse: note.answer,
      responseNote: answered ? (outcome === "correct" ? note.answer : "C#") : "",
      responseAt: answered ? toLocalIso(new Date(t.getTime() + 900)) : "",
      responseTimeMs: answered ? 900 : "",
      outcome,
      incorrectTotalAfterQuestion: incorrectTotal,
    });
    t = new Date(t.getTime() + 4000);
  });

  return {
    sessionId: crypto.randomUUID(),
    testType: "absolute_pitch",
    startedAt: toLocalIso(start),
    endedAt: toLocalIso(t),
    sessionStatus: "completed",
    sequenceStartPosition: 1,
    sequenceStartNumber: SAMPLE_NOTES[0].number,
    sequenceDirection: "forward",
    responses,
  };
}


// ---- 相対音感 ----
// 既存クライアント(uec-tst/src/relative-pitch/intervals.js)の対応表を、動作確認用に写したもの。
const REL_KEY_BASE_NOTES = { C: "C4", Es: "Es4", Fis: "Fis4", A: "A4" };
const REL_KEY_CHROMATIC_INDEX = { C: 0, Es: 3, Fis: 6, A: 9 };
const REL_CHROMATIC_SCALE = ["C", "Cis", "D", "Dis", "E", "F", "Fis", "G", "Gis", "A", "Ais", "H"];
const REL_SYLLABLES = {
  1: { code: "DiM", label: "ド♯", interval: "short", scale: "out" },
  2: { code: "ReM", label: "レ", interval: "short", scale: "in" },
  3: { code: "RiM", label: "レ♯", interval: "short", scale: "out" },
  4: { code: "MiM", label: "ミ", interval: "short", scale: "in" },
  5: { code: "FaM", label: "ファ", interval: "mid", scale: "in" },
  6: { code: "FiM", label: "ファ♯", interval: "mid", scale: "out" },
  7: { code: "SoM", label: "ソ", interval: "mid", scale: "in" },
  8: { code: "SiM", label: "ソ♯", interval: "mid", scale: "out" },
  9: { code: "LaM", label: "ラ", interval: "long", scale: "in" },
  10: { code: "LiM", label: "ラ♯", interval: "long", scale: "out" },
  11: { code: "TiM", label: "シ", interval: "long", scale: "in" },
  13: { code: "diH", label: "ド♯↑", interval: "long", scale: "out" },
};

function relBuildQuestion(keyCode, semitone) {
  const total = REL_KEY_CHROMATIC_INDEX[keyCode] + semitone;
  const syllable = REL_SYLLABLES[semitone];
  return {
    keyCode,
    intervalSemitones: semitone,
    syllableCode: syllable.code,
    displayLabel: syllable.label,
    intervalLabel: syllable.interval,
    scaleLabel: syllable.scale,
    referenceNote: REL_KEY_BASE_NOTES[keyCode],
    targetNote: `${REL_CHROMATIC_SCALE[total % 12]}${4 + Math.floor(total / 12)}`,
  };
}

// 本番の出題順のサンプル。簡易版は12種の半音差×2キー(C/Fis)、完全版は11種×4キーの計44問。
function relBuildTestSequence(testVersion) {
  const sequence = [];
  if (testVersion === "full") {
    const keys = ["C", "Es", "Fis", "A"];
    for (let s = 1; s <= 11; s++) {
      keys.forEach((k, i) => sequence.push({ ...relBuildQuestion(k, s), keyBlockNumber: Math.floor(sequence.length / 4) + 1 }));
    }
  } else {
    const semitones = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13];
    semitones.forEach((s, i) => {
      sequence.push({ ...relBuildQuestion(i % 2 === 0 ? "C" : "Fis", s), keyBlockNumber: Math.floor(i / 2) + 1 });
    });
  }
  return sequence;
}

function relBuildResponse(phase, questionNumber, question, keyBlockNumber, startedAt, answered, correct) {
  const wrongAnswer = question.intervalSemitones === 1 ? 2 : 1;
  const at = (ms) => toLocalIso(new Date(startedAt.getTime() + ms));
  return {
    phase,
    questionNumber,
    keyCode: question.keyCode,
    keyBlockNumber,
    cadenceFilename: `cadence_${question.keyCode}.wav`,
    referenceNote: question.referenceNote,
    targetNote: question.targetNote,
    intervalSemitones: question.intervalSemitones,
    syllableCode: question.syllableCode,
    displayLabel: question.displayLabel,
    intervalLabel: question.intervalLabel,
    scaleLabel: question.scaleLabel,
    cadenceStartedAt: at(0),
    referenceStartedAt: at(3000),
    targetStartedAt: at(4500),
    responseCode: answered ? (correct ? question.intervalSemitones : wrongAnswer) : "",
    responseAt: answered ? at(5500) : "",
    responseTimeMs: answered ? 1000 : "",
    outcome: answered ? (correct ? "correct" : "incorrect") : "interrupted",
  };
}

// status: "completed" or "interrupted"。testVersion: "simplified" or "full"。
// 中断は、本番の途中(3問回答済み・4問目のカデンツ再生後に離脱)を想定する。
function buildRelativeSampleSession(status, testVersion) {
  const start = new Date();
  let t = new Date(start);
  const responses = [];

  const practice = [relBuildQuestion("C", 4), relBuildQuestion("C", 8), relBuildQuestion("Fis", 4)];
  practice.forEach((q, i) => {
    responses.push(relBuildResponse("practice", i + 1, q, "", t, true, true));
    t = new Date(t.getTime() + 8000);
  });

  const sequence = relBuildTestSequence(testVersion);
  const answeredCount = status === "interrupted" ? 3 : sequence.length;
  sequence.slice(0, answeredCount).forEach((q, i) => {
    // 4問に1問は不正解にする。
    responses.push(relBuildResponse("test", i + 1, q, q.keyBlockNumber, t, true, i % 4 !== 3));
    t = new Date(t.getTime() + 8000);
  });

  let endedAt = t;
  if (status === "interrupted") {
    const q = sequence[answeredCount];
    const row = relBuildResponse("test", answeredCount + 1, q, q.keyBlockNumber, t, false, false);
    // カデンツ再生後、基準音の提示前に離脱した想定。
    row.referenceStartedAt = "";
    row.targetStartedAt = "";
    responses.push(row);
    endedAt = new Date(t.getTime() + 1500);
  }

  return {
    sessionId: crypto.randomUUID(),
    testType: "relative_pitch",
    testVersion,
    startedAt: toLocalIso(start),
    endedAt: toLocalIso(endedAt),
    sessionStatus: status,
    answerLayout: "circular",
    practiceStatus: "completed",
    generatedQuestionOrder: sequence.map((q) => q.intervalSemitones),
    responses,
  };
}

function buildSampleSession(status) {
  const testType = testTypeEl.value;
  if (testType === "relative_pitch") {
    return buildRelativeSampleSession(status, testVersionEl.value);
  }
  const session = buildAbsoluteSampleSession(status);
  session.testType = testType;
  return session;
}

const testTypeEl = document.getElementById("testType");
const testVersionEl = document.getElementById("testVersion");
const versionRowEl = document.getElementById("versionRow");
const participantIdEl = document.getElementById("participantId");
const payloadEl = document.getElementById("payload");
const resultEl = document.getElementById("result");

function generate(status) {
  payloadEl.value = JSON.stringify(buildSampleSession(status), null, 2);
  resultEl.textContent = "";
  resultEl.className = "";
}

document.getElementById("generate").addEventListener("click", () => generate("completed"));
document.getElementById("generateInterrupted").addEventListener("click", () => generate("interrupted"));

// 相対音感のときだけtestVersion選択を表示し、切り替えたら現在の種別のサンプルに更新する。
function onTestTypeChanged() {
  versionRowEl.hidden = testTypeEl.value !== "relative_pitch";
  generate("completed");
}
testTypeEl.addEventListener("change", onTestTypeChanged);
testVersionEl.addEventListener("change", () => generate("completed"));

document.getElementById("send").addEventListener("click", async () => {
  const testType = testTypeEl.value;
  const participantId = participantIdEl.value.trim();
  let body;
  try {
    body = JSON.parse(payloadEl.value);
  } catch (e) {
    resultEl.textContent = "JSONの形式が不正です: " + e.message;
    resultEl.className = "status-ng";
    return;
  }

  const url = `../api/session_create.php?testType=${encodeURIComponent(testType)}&participantId=${encodeURIComponent(participantId)}`;
  resultEl.textContent = "送信中...";
  resultEl.className = "";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    resultEl.className = res.ok ? "status-ok" : "status-ng";
    resultEl.textContent = `HTTP ${res.status}\n${text}`;
  } catch (e) {
    resultEl.className = "status-ng";
    resultEl.textContent = "通信エラー: " + e.message;
  }
});

// 初回表示時にサンプルを生成しておく
onTestTypeChanged();
