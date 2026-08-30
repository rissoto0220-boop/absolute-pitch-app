// フェーズ4: 相対音感の練習(仕様 relative-pitch-test-spec.md §13)。保存はフェーズ6で接続済み。
import { renderAnswerPanel } from "../shared/answer-panel.js";
import { runQuestionTimeline } from "./question-timeline.js";
import { resumeAudioContext } from "../shared/audio-buffer-player.js";
import { toLocalIso } from "../shared/iso-time.js";
import { ANSWER_LABELS } from "./layout-comparison-screen.js";
import { PRACTICE_QUESTIONS, INTERVAL_SEMITONES, isCorrectAnswer, cadenceFilenameFor } from "./intervals.js";
import * as sessionStore from "./session-store.js";

// screenEl: 描画先のDOM要素。
// layout: フェーズ2で選んだ回答レイアウト("circular"または"grid")。
// hasCompletedBefore: 完了済みの相対音感簡易版履歴があるか(仕様13.4)。
// session: このセッションの保存対象(session-store.jsのstartSessionが返すもの)。
// persistSession: 保存を反映させるために呼ぶ関数(呼び出し元がlocalStorageへの書き込みを担う)。
// onFinished: 練習が終わった時点(3問終えた、またはスキップした)で呼ぶ。
export function showPracticeFlow({
  screenEl,
  layout = "circular",
  hasCompletedBefore = false,
  session,
  persistSession = () => {},
  onFinished = () => {},
}) {
  if (hasCompletedBefore) {
    showSkipChoice();
  } else {
    showIntro();
  }

  function showSkipChoice() {
    screenEl.innerHTML = `
      <div class="panel">
        <h2>練習について</h2>
        <p>以前にこのテストを完了した記録があります。練習をもう一度行うか、スキップして本番へ進むか選べます。</p>
        <div class="actions">
          <button id="do-practice" class="primary">練習してから開始</button>
          <button id="skip-practice" class="secondary">練習をスキップして本番へ</button>
        </div>
      </div>`;
    document.getElementById("do-practice").addEventListener("click", showIntro);
    document.getElementById("skip-practice").addEventListener("click", () => {
      sessionStore.setPracticeStatus(session, "skipped");
      persistSession();
      onFinished("skipped");
    });
  }

  function showIntro() {
    screenEl.innerHTML = `
      <div class="panel">
        <h2>練習問題</h2>
        <p>これから3問の練習を行います。</p>
        <ul class="instructions">
          <li>カデンツ・基準音・目的音の順に自動再生されます。</li>
          <li>目的音が鳴り始めたら、聞こえた階名を選んでください。</li>
          <li>回答時間の制限はありません。回答するまで次へ進みません。</li>
          <li>練習では、回答のたびに正解・不正解が表示されます(本番では表示されません)。</li>
        </ul>
        <p class="note">この練習は原則1回のみです。</p>
        <div class="actions"><button id="practice-start" class="primary">練習を開始</button></div>
      </div>`;
    document.getElementById("practice-start").addEventListener("click", () => {
      // 参加者が最初に音声を伴う操作をするタイミングでAudioContextを有効化する。
      // resumeの完了(=AudioContextの時計が実際に動き出す)を待ってから最初の問題を始める。
      // 待たずに始めると、時計が一時停止したままの状態でスケジュールを計算してしまい、
      // 後から時計が動き出した際にスケジュールが早く(または即座に)発火してしまう。
      screenEl.innerHTML = `<div class="panel center"><p class="status">音声を準備しています…</p></div>`;
      resumeAudioContext().then(() => {
        runQuestion(0);
      });
    });
  }

  function runQuestion(index) {
    if (index >= PRACTICE_QUESTIONS.length) {
      sessionStore.setPracticeStatus(session, "completed");
      persistSession();
      onFinished("completed");
      return;
    }
    const question = PRACTICE_QUESTIONS[index];
    const questionNumber = index + 1;

    screenEl.innerHTML = `
      <div class="panel">
        <h2>練習</h2>
        <p id="practice-status" class="status">音を再生しています。しばらくお待ちください。</p>
        <div id="answer-panel-container"></div>
      </div>`;

    const timeline = runQuestionTimeline(question, {
      onStageStarted: (stage) => {
        if (stage === "cadence") {
          sessionStore.beginQuestion(session, {
            phase: "practice",
            questionNumber,
            keyCode: question.keyCode,
            keyBlockNumber: "",
            cadenceFilename: cadenceFilenameFor(question.keyCode),
            referenceNote: question.referenceNote,
            targetNote: question.targetNote,
            intervalSemitones: question.intervalSemitones,
            syllableCode: question.syllableCode,
            displayLabel: question.displayLabel,
            intervalLabel: question.intervalLabel,
            scaleLabel: question.scaleLabel,
          });
        } else {
          sessionStore.recordStageStarted(session, stage);
        }
        persistSession();
      },
      onAnswerable: () => {
        document.getElementById("practice-status").textContent = "聞こえた階名を選んでください。";
        renderAnswerPanel({
          container: document.getElementById("answer-panel-container"),
          labels: ANSWER_LABELS,
          layout,
          onSelect: (label, labelIndex) => {
            // 正解判定・保存には表示ラベルではなく半音差(内部コード相当)を使う(仕様10.2)。
            timeline.submitAnswer(INTERVAL_SEMITONES[labelIndex]);
          },
        });
      },
      onResult: ({ responseCode: responseSemitone, responseTimeMs }) => {
        const responseAt = toLocalIso();
        const outcome = isCorrectAnswer(question, responseSemitone) ? "correct" : "incorrect";
        sessionStore.finalizeQuestion(session, { responseCode: responseSemitone, responseAt, responseTimeMs, outcome });
        persistSession();
        showFeedback(questionNumber, outcome);
      },
      onError: () => {
        // 音源エラー時はセッションを中断扱いにする(仕様22.1)。
        sessionStore.finalizeSession(session, "interrupted");
        persistSession();
        document.getElementById("practice-status").textContent = "音声の読み込みに失敗しました。お手数ですが、最初からやり直してください。";
      },
    });
  }

  function showFeedback(questionNumber, outcome) {
    const question = PRACTICE_QUESTIONS[questionNumber - 1];
    const isLast = questionNumber >= PRACTICE_QUESTIONS.length;

    screenEl.innerHTML = `
      <div class="panel center">
        <h2>${outcome === "correct" ? "正解です" : "不正解です"}</h2>
        ${outcome === "correct" ? "" : `<p>正解は「${question.displayLabel}」です</p>`}
        <div class="actions centered">
          <button id="next" class="primary">${isLast ? "練習を終了" : "次へ"}</button>
        </div>
      </div>`;
    document.getElementById("next").addEventListener("click", () => runQuestion(questionNumber));
  }
}
