// フェーズ3: 音声タイムラインの手動確認用デモ画面。
// 練習・本番の画面(フェーズ4・5)、保存(フェーズ6)とはまだ接続しない、動作確認専用の画面。
// カデンツ→基準音→目的音の実際の再生タイミングを、経過時間のログで確認できるようにする。
import { renderAnswerPanel } from "../shared/answer-panel.js";
import { runQuestionTimeline } from "./question-timeline.js";
import { resumeAudioContext } from "../shared/audio-buffer-player.js";
import { ANSWER_LABELS } from "./layout-comparison-screen.js";
import { PRACTICE_QUESTIONS } from "./intervals.js";

export function showQuestionTimelineDemoScreen({ screenEl, onBack }) {
  function renderQuestion(question) {
    const log = [];
    const startedAt = performance.now();

    function appendLog(label) {
      log.push(`${Math.round(performance.now() - startedAt)}ms: ${label}`);
      const el = document.getElementById("timeline-log");
      if (el) el.innerHTML = log.map((line) => `<li>${line}</li>`).join("");
    }

    screenEl.innerHTML = `
      <div class="panel">
        <h2>音声タイムライン確認(Key ${question.keyCode}, ${question.displayLabel})</h2>
        <p class="note">
          カデンツ(0.0秒)→無音区間→基準音(3.0秒)→目的音(4.0秒)の順に自動再生されます。<br>
          目的音が鳴り始めたら回答できます。下のログで実際の経過時間を確認してください。
        </p>
        <p id="timeline-status" class="status">再生中です…</p>
        <div id="answer-panel-container"></div>
        <ul id="timeline-log" class="history-list"></ul>
        <div class="actions">
          <button id="next-question" class="secondary">別の練習問題で試す</button>
          <button id="back" class="secondary">戻る</button>
        </div>
      </div>`;

    document.getElementById("back").addEventListener("click", onBack);
    document.getElementById("next-question").addEventListener("click", () => {
      const others = PRACTICE_QUESTIONS.filter((q) => q !== question);
      const next = others[Math.floor(Math.random() * others.length)] || PRACTICE_QUESTIONS[0];
      renderQuestion(next);
    });

    appendLog("カデンツ再生開始");

    const timeline = runQuestionTimeline(question, {
      onAnswerable: () => {
        appendLog("目的音再生開始・回答受付開始");
        document.getElementById("timeline-status").textContent = "聞こえた階名を選んでください。";
        renderAnswerPanel({
          container: document.getElementById("answer-panel-container"),
          labels: ANSWER_LABELS,
          layout: "circular",
          onSelect: (label) => timeline.submitAnswer(label),
        });
      },
      onResult: ({ responseCode, responseTimeMs }) => {
        appendLog(`回答: ${responseCode}(反応時間 ${responseTimeMs}ms)`);
        document.getElementById("timeline-status").textContent = "回答を受け付けました。";
      },
      onError: (error) => {
        appendLog(`音声の読み込みに失敗しました: ${error.message}`);
        document.getElementById("timeline-status").textContent = "音声の読み込みに失敗しました。";
      },
    });
  }

  // このリンクのクリック自体がユーザー操作にあたるため、ここでAudioContextを有効化する
  // (ブラウザの自動再生制限への対応)。resumeが完了するまで(=AudioContextの時計が実際に
  // 動き出すまで)は最初の問題を始めない。ここを待たずに始めると、AudioContextがまだ
  // 一時停止(suspended)状態のうちに基準時刻を読み取ってしまい、スケジュールがずれ得る。
  screenEl.innerHTML = `<div class="panel center"><p class="status">音声を準備しています…</p></div>`;
  resumeAudioContext().then(() => {
    renderQuestion(PRACTICE_QUESTIONS[0]);
  });
}
