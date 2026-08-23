import { normalizeParticipantId, isValidParticipantId } from "./src/shared/participant-id.js";
import { createQuestionTimer } from "./src/shared/question-timer.js";
import { playStimulus } from "./src/shared/audio-player.js";
import { createAnswerLock } from "./src/shared/answer-lock.js";
import { noteByNumber, PRACTICE_STIMULUS_NUMBERS } from "./src/absolute-pitch/notes.js";
import {
  TOTAL_QUESTIONS,
  generateTestSequence,
  pickRandomStart,
  pickRandomDirection,
  shouldForceTerminate,
} from "./src/absolute-pitch/main-test.js";

const ANSWERS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const QUESTION_MS = 3500;

let screenEl = null;
let participantId = "";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// --- 参加者ID入力・確認(仕様7章) ---

function showIdEntry(prefill = "") {
  screenEl.innerHTML = `
    <div class="panel">
      <h2>参加者IDを入力してください</h2>
      <p>研究者から指定されたIDを入力してください。小文字の p は自動で大文字に変換します。</p>
      <div class="field">
        <label for="participant-id">参加者ID</label>
        <input id="participant-id" inputmode="text" autocomplete="off" placeholder="P00001" maxlength="6" value="${escapeHtml(prefill)}">
        <p id="id-error" class="error"></p>
      </div>
      <div class="actions"><button id="continue" class="primary">確認へ進む</button></div>
    </div>`;

  const input = document.getElementById("participant-id");
  input.focus();
  input.addEventListener("input", () => { input.value = input.value.toUpperCase(); });

  const submit = () => {
    const value = normalizeParticipantId(input.value);
    input.value = value;
    if (!isValidParticipantId(value)) {
      document.getElementById("id-error").textContent = "Pに続けて5桁の数字を入力してください。例: P00001";
      return;
    }
    participantId = value;
    showIdConfirm();
  };
  document.getElementById("continue").addEventListener("click", submit);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
}

function showIdConfirm() {
  screenEl.innerHTML = `
    <div class="panel center">
      <h2>参加者IDを確認してください</h2>
      <p class="id-card">${escapeHtml(participantId)}</p>
      <p>このIDでよろしいですか?</p>
      <div class="actions centered">
        <button id="edit" class="secondary">修正する</button>
        <button id="accept" class="primary">このIDで進む</button>
      </div>
    </div>`;
  document.getElementById("edit").addEventListener("click", () => showIdEntry(participantId));
  document.getElementById("accept").addEventListener("click", showPracticeIntro);
}

// --- 練習説明(仕様9章) ---

function showPracticeIntro() {
  screenEl.innerHTML = `
    <div class="panel">
      <h2>練習問題</h2>
      <p>これから3問の練習を行います。</p>
      <ul class="instructions">
        <li>音は1回だけ自動で再生されます。</li>
        <li>聞こえた音名のボタンを押してください。</li>
        <li>回答時間は、音の再生開始から3.5秒です。</li>
        <li>音の再生中でも回答できます。</li>
        <li>早く回答しても、次の問題は3.5秒後に始まります。</li>
        <li>正解・不正解は表示しません。</li>
      </ul>
      <p class="note">この練習は原則1回のみです。練習問題そのものの再実施はできません。</p>
      <div class="actions"><button id="practice-start" class="primary">練習を開始</button></div>
    </div>`;
  document.getElementById("practice-start").addEventListener("click", runPractice);
}

function runPractice() {
  const notes = PRACTICE_STIMULUS_NUMBERS.map(noteByNumber);
  step(0);

  function step(index) {
    if (index >= notes.length) {
      showTestConfirm();
      return;
    }
    const note = notes[index];
    showQuestion({ mode: "practice", note }, (result) => {
      console.log("[question result]", {
        phase: "practice",
        questionNumber: index + 1,
        stimulusNumber: note.number,
        stimulusNote: note.germanNote,
        correctResponse: note.answer,
        ...result,
      });
      step(index + 1);
    });
  }
}

// --- 出題画面(仕様11〜14章。練習・本番で共通) ---
// onResult({ outcome, responseNote, responseTimeMs }) を1問終了ごとに1回呼ぶ。
// 次に進むかどうかの判断(練習は常に進む、本番は13件で打ち切り)は呼び出し側が行う。

function showQuestion({ mode, note }, onResult) {
  const title = mode === "practice" ? "練習" : "本番";
  const helpBlock = mode === "practice"
    ? `<div class="notice">
        <strong>操作方法:</strong>聞こえた音名を選択してください。音は1回だけ、回答時間は3.5秒です。
      </div>`
    : "";

  screenEl.innerHTML = `
    <div class="panel">
      <h2>${title}</h2>
      ${helpBlock}
      <p id="status" class="status">音を再生しています。聞こえた音名を選んでください。</p>
      <div class="answer-grid">
        ${ANSWERS.map((a, i) => `<button class="answer" style="--i:${i}" data-answer="${a}" aria-label="${a}">${a}</button>`).join("")}
      </div>
    </div>`;

  const answerLock = createAnswerLock();
  let selectedAnswer = null;

  const buttons = [...document.querySelectorAll(".answer")];
  buttons.forEach((btn) => btn.addEventListener("click", () => handleAnswer(btn)));

  function handleAnswer(button) {
    if (!answerLock.tryLock()) return;
    selectedAnswer = button.dataset.answer;
    buttons.forEach((b) => { b.disabled = true; });
    button.classList.add("selected");
    document.getElementById("status").textContent = "回答を受け付けました。次の問題までお待ちください。";
    // 回答してもタイマーは止めない。次の問題への進行はタイマーのonQuestionEndに任せる(仕様13.2)。
  }

  playStimulus(`public/sounds/${note.filename}`)
    .then(() => {
      createQuestionTimer({
        durationMs: QUESTION_MS,
        onQuestionEnd: (elapsedMs) => {
          const answered = answerLock.isLocked();
          const outcome = !answered ? "timeout" : (selectedAnswer === note.answer ? "correct" : "incorrect");
          onResult({
            outcome,
            responseNote: answered ? selectedAnswer : "",
            responseTimeMs: answered ? Math.round(elapsedMs) : "",
          });
        },
      });
    })
    .catch(() => {
      // 再生失敗時は onResult を呼ばず進行を止める(フェーズ5で「中断」として保存する予定)。
      showPlaybackError(note);
    });
}

function showPlaybackError(note) {
  screenEl.innerHTML = `
    <div class="panel center">
      <h2>音声を再生できませんでした</h2>
      <p>問題の音声ファイル(${escapeHtml(note.filename)})の再生に失敗しました。</p>
      <p class="note">
        この問題は誤回答やタイムアウトとしては記録されません。<br>
        お手数ですが、最初からやり直してください。
      </p>
      <div class="actions centered"><button id="restart" class="primary">最初からやり直す</button></div>
    </div>`;
  document.getElementById("restart").addEventListener("click", () => { participantId = ""; showIdEntry(); });
}

// --- 本番開始確認(仕様10章) ---

// 強制終了ルールの告知文(仕様10章の確定事項)。
// 将来この告知自体を削除する場合に他の文章へ影響しないよう、独立した定数にしている。
const FORCED_TERMINATION_NOTICE = "誤回答とタイムアウトの合計が13件に達した場合、その時点でテストが終了します。";

function showTestConfirm() {
  screenEl.innerHTML = `
    <div class="panel">
      <h2>本番開始確認</h2>
      <p>練習が終了しました。<br>
      次から本番の絶対音感テストを開始します。<br>
      本番中も正解・不正解は表示されません。</p>
      <p class="notice">${escapeHtml(FORCED_TERMINATION_NOTICE)}</p>
      <p>準備ができたら「本番を開始」を押してください。</p>
      <div class="actions">
        <button id="back-info" class="secondary">練習の説明を確認する</button>
        <button id="main-start" class="primary">本番を開始</button>
      </div>
    </div>`;
  document.getElementById("back-info").addEventListener("click", showPracticeRecap);
  document.getElementById("main-start").addEventListener("click", startMainTest);
}

function showPracticeRecap() {
  screenEl.innerHTML = `
    <div class="panel">
      <h2>操作方法の確認</h2>
      <ul class="instructions">
        <li>音は各問題で1回だけ自動再生されます。</li>
        <li>回答時間は音の再生開始から3.5秒です。</li>
        <li>音の再生中でも回答できます。</li>
        <li>正解・不正解は表示しません。</li>
      </ul>
      <p class="note">練習問題は原則1回のため、再実施はできません。</p>
      <div class="actions"><button id="back-confirm" class="primary">本番開始確認へ戻る</button></div>
    </div>`;
  document.getElementById("back-confirm").addEventListener("click", showTestConfirm);
}

// --- 本番60問(仕様11章・15章) ---

function startMainTest() {
  const startIndex = pickRandomStart();
  const direction = pickRandomDirection();
  const sequence = generateTestSequence(startIndex, direction);

  let correctCount = 0;
  let totalIncorrectCount = 0;

  step(0);

  function step(index) {
    if (index >= sequence.length) {
      finish("completed");
      return;
    }
    const note = noteByNumber(sequence[index]);
    showQuestion({ mode: "test", note }, (result) => {
      if (result.outcome === "correct") correctCount += 1;
      else totalIncorrectCount += 1; // incorrect または timeout

      console.log("[question result]", {
        phase: "test",
        questionNumber: index + 1,
        stimulusNumber: note.number,
        stimulusNote: note.germanNote,
        correctResponse: note.answer,
        ...result,
        incorrectTotalAfterQuestion: totalIncorrectCount,
        sequenceStartNumber: sequence[0],
        sequenceDirection: direction === 1 ? "forward" : "reverse",
      });

      // 13件到達チェックを60問完了チェックより先に行うことで、
      // 60問目で同時に13件目に達した場合は自然に「強制終了」が優先される(既存の確定事項)。
      if (shouldForceTerminate(totalIncorrectCount)) {
        finish("forced_termination");
        return;
      }
      step(index + 1);
    });
  }

  function finish(sessionStatus) {
    // フェーズ5で保存を実装するまでの仮の記録。session_statusは参加者には表示しない(仕様16章)。
    console.log("[test finished]", { sessionStatus, correctCount, totalQuestions: TOTAL_QUESTIONS });
    showResult(correctCount);
  }
}

function showResult(correctCount) {
  screenEl.innerHTML = `
    <div class="panel center">
      <h2>テストが終了しました</h2>
      <p>正解数</p>
      <div class="score">${correctCount} / ${TOTAL_QUESTIONS}</div>
      <div class="actions centered"><button id="restart" class="primary">最初からやり直す</button></div>
    </div>`;
  document.getElementById("restart").addEventListener("click", () => { participantId = ""; showIdEntry(); });
}

function mount() {
  screenEl = document.getElementById("screen");
  showIdEntry();
}

if (typeof document !== "undefined") {
  mount();
}
