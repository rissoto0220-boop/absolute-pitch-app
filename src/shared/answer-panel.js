// 回答ボタンの共通部品(仕様 relative-pitch-test-spec.md §11.2)。
// 「回答画面、回答候補、正解判定、保存処理をレイアウトごとに複製せず、配置だけを切り替える」ことを
// 満たすため、grid(2行6列)とcircular(円環状)のどちらでも、同じラベル一覧・同じ選択処理を使い回す。
//
// 絶対音感の既存の円環状ボタン(app.js内、CSSクラス.answer-grid/.answer)には触れず、
// 新しいクラス名(.answer-panel系)で独立して実装する。
import { createAnswerLock } from "./answer-lock.js";

// container(DOM要素)の中に、labels(表示ラベルの配列)をlayout("grid"または"circular")で描画する。
// ボタンを押すと、最初の1回だけonSelect(label, index)を呼び、以後すべてのボタンを無効化して
// 選択したボタンへ.selectedを付ける(仕様11.3: 選択後は全ボタン無効化・二重回答を受け付けない)。
// 呼び出すたびに中身を作り直すだけで、内部状態を持ち越さない。
export function renderAnswerPanel({ container, labels, layout, onSelect }) {
  const answerLock = createAnswerLock();

  container.innerHTML = `
    <div class="answer-panel answer-panel--${layout}">
      ${labels.map((label, i) => `
        <button type="button" class="answer-panel__button" style="--i:${i}" data-index="${i}" aria-label="${label}">${label}</button>
      `).join("")}
    </div>`;

  const buttons = [...container.querySelectorAll(".answer-panel__button")];
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      if (!answerLock.tryLock()) return;
      buttons.forEach((b) => { b.disabled = true; });
      button.classList.add("selected");
      onSelect(labels[index], index);
    });
  });

  return { buttons };
}
