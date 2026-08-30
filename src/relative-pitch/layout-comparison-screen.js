// 回答レイアウト比較画面(仕様 relative-pitch-test-spec.md §11.2)。
// grid・circularの両方を、練習開始前にだけ切り替えて試せるようにする。
// この段階(フェーズ2)では音声再生・保存とはまだ接続しない。レイアウトが決まったらonConfirmへ渡すだけ。
import { renderAnswerPanel } from "../shared/answer-panel.js";
import { INTERVAL_SEMITONES, syllableFor } from "./intervals.js";

// 半音差の小さい順の参加者向け表示ラベル一覧(仕様11.1)。
export const ANSWER_LABELS = INTERVAL_SEMITONES.map((semitone) => syllableFor(semitone).displayLabel);

// screenEl: 画面全体を描画するコンテナ。
// onConfirm(layout): 「この配置で決定」を押した時点で選ばれているレイアウト("grid"または"circular")を渡す。
// onBack: 「戻る」を押したときに呼ぶ(呼び出し元の画面へ戻る)。
export function showLayoutComparisonScreen({ screenEl, onConfirm, onBack }) {
  let layout = "circular";

  function render() {
    screenEl.innerHTML = `
      <div class="panel">
        <h2>回答レイアウトを選んでください</h2>
        <p>相対音感テストで使う回答ボタンの並べ方を、本番前にお試しいただけます。試しにいくつか押して、操作感を比べてください。</p>
        <div class="actions">
          <button id="layout-circular" class="${layout === "circular" ? "primary" : "secondary"}">円環状</button>
          <button id="layout-grid" class="${layout === "grid" ? "primary" : "secondary"}">グリッド</button>
        </div>
        <p id="panel-status" class="status"></p>
        <div id="answer-panel-container"></div>
        <div class="actions">
          <button id="try-again" class="secondary">もう一度試す</button>
          <button id="confirm-layout" class="primary">この配置で決定</button>
        </div>
        <div class="actions"><button id="back" class="secondary">戻る</button></div>
      </div>`;

    document.getElementById("layout-circular").addEventListener("click", () => { layout = "circular"; render(); });
    document.getElementById("layout-grid").addEventListener("click", () => { layout = "grid"; render(); });
    document.getElementById("try-again").addEventListener("click", render);
    document.getElementById("confirm-layout").addEventListener("click", () => onConfirm(layout));
    document.getElementById("back").addEventListener("click", onBack);

    renderAnswerPanel({
      container: document.getElementById("answer-panel-container"),
      labels: ANSWER_LABELS,
      layout,
      onSelect: () => {
        document.getElementById("panel-status").textContent = "回答を受け付けました。";
      },
    });
  }

  render();
}
