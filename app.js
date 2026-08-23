export const SCREENS = [
  { key: "id-entry", title: "参加者ID入力", phase: "フェーズ2" },
  { key: "id-confirm", title: "参加者ID確認", phase: "フェーズ2" },
  { key: "practice-intro", title: "練習説明", phase: "フェーズ2" },
  { key: "question", title: "出題画面(練習・本番で共通)", phase: "フェーズ2・3" },
  { key: "test-confirm", title: "本番開始確認", phase: "フェーズ2" },
  { key: "result", title: "結果表示", phase: "フェーズ3" },
  { key: "history", title: "履歴・CSV出力", phase: "フェーズ6" },
];

export function renderScreenHtml(index) {
  const screen = SCREENS[index];
  const isFirst = index === 0;
  const isLast = index === SCREENS.length - 1;
  return `
    <div class="panel">
      <h2>${screen.title}</h2>
      <p class="note">この画面はプレースホルダーです。実際の操作は${screen.phase}で実装予定です。</p>
      <p class="note">${index + 1} / ${SCREENS.length}</p>
      <div class="actions">
        ${isFirst ? "" : `<button id="back" class="secondary">戻る</button>`}
        ${isLast ? "" : `<button id="next" class="primary">次へ</button>`}
      </div>
    </div>`;
}

function mount() {
  const screenEl = document.getElementById("screen");
  let index = 0;

  function render() {
    screenEl.innerHTML = renderScreenHtml(index);
    const back = document.getElementById("back");
    const next = document.getElementById("next");
    if (back) back.addEventListener("click", () => { index -= 1; render(); });
    if (next) next.addEventListener("click", () => { index += 1; render(); });
  }

  render();
}

if (typeof document !== "undefined") {
  mount();
}
