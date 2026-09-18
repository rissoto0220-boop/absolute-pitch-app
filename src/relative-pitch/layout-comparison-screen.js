// 回答レイアウト比較画面(仕様 relative-pitch-test-spec.md §11.2)。
// circular・spiral・dual_ringの3つを、練習開始前にだけ切り替えて試せるようにする
// (2026-09-18: gridは削除し、渦巻配置(spiral)・二重円環(dual_ring)を追加)。
// この段階(フェーズ2)では音声再生・保存とはまだ接続しない。レイアウトが決まったらonConfirmへ渡すだけ。
import { renderAnswerPanel } from "../shared/answer-panel.js";
import { ANSWER_BUTTON_SEMITONES, FULL_ANSWER_BUTTON_SEMITONES, syllableFor } from "./intervals.js";

// 半音差から回答ラベル1件を組み立てる。
// text: 主表記、enharmonic: ♭側の異名同音表記(無ければnull)、
// extra: 1オクターブ上の重複音(半音差12・13)かどうか。
function buildAnswerLabel(semitone) {
  const syllable = syllableFor(semitone);
  return {
    text: syllable.displayLabel,
    enharmonic: syllable.enharmonicLabel,
    extra: semitone >= 12,
  };
}

// 簡易版の参加者向け表示ラベル一覧、半音差の小さい順(仕様11.1に「ド」「高いド」を追加)。
export const ANSWER_LABELS = ANSWER_BUTTON_SEMITONES.map(buildAnswerLabel);

// 完全版の参加者向け表示ラベル一覧(仕様6.2「回答ボタン」、2026-09-18確定)。
// オクターブ重複音が無いため、全要素でextraは常にfalseになる。
export const FULL_ANSWER_LABELS = FULL_ANSWER_BUTTON_SEMITONES.map(buildAnswerLabel);

const LAYOUT_OPTIONS = [
  { value: "circular", label: "円環状" },
  { value: "spiral", label: "渦巻状" },
  { value: "dual_ring", label: "二重リング" },
];

// screenEl: 画面全体を描画するコンテナ。
// testVersion: "simplified"(既定)または"full"。使用する回答ラベル一覧を切り替える。
// onConfirm(layout): 「この配置で決定」を押した時点で選ばれているレイアウト
//   ("circular"・"spiral"・"dual_ring"のいずれか)を渡す。
// onBack: 「戻る」を押したときに呼ぶ(呼び出し元の画面へ戻る)。
export function showLayoutComparisonScreen({ screenEl, testVersion = "simplified", onConfirm, onBack }) {
  let layout = "circular";
  const answerLabels = testVersion === "full" ? FULL_ANSWER_LABELS : ANSWER_LABELS;

  function render() {
    screenEl.innerHTML = `
      <div class="panel">
        <h2>回答レイアウトを選んでください</h2>
        <p>相対音感テストで使う回答ボタンの並べ方を、本番前にお試しいただけます。試しにいくつか押して、操作感を比べてください。</p>
        <div class="actions">
          ${LAYOUT_OPTIONS.map((option) => `
            <button id="layout-${option.value}" class="${layout === option.value ? "primary" : "secondary"}">${option.label}</button>
          `).join("")}
        </div>
        <p id="panel-status" class="status"></p>
        <div id="answer-panel-container"></div>
        <div class="actions">
          <button id="try-again" class="secondary">もう一度試す</button>
          <button id="confirm-layout" class="primary">この配置で決定</button>
        </div>
        <div class="actions"><button id="back" class="secondary">戻る</button></div>
      </div>`;

    LAYOUT_OPTIONS.forEach((option) => {
      document.getElementById(`layout-${option.value}`).addEventListener("click", () => {
        layout = option.value;
        render();
      });
    });
    document.getElementById("try-again").addEventListener("click", render);
    document.getElementById("confirm-layout").addEventListener("click", () => onConfirm(layout));
    document.getElementById("back").addEventListener("click", onBack);

    renderAnswerPanel({
      container: document.getElementById("answer-panel-container"),
      labels: answerLabels,
      layout,
      onSelect: () => {
        document.getElementById("panel-status").textContent = "回答を受け付けました。";
      },
    });
  }

  render();
}
