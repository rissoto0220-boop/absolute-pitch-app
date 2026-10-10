// 回答ボタンの共通部品(仕様 relative-pitch-test-spec.md §11.2)。
// 回答レイアウトは円環状(circular)に固定している(2026-10-09)。位置はCSS(styles.css)の
// rotate/translateYで決めるため、このファイルは位置を計算しない。
//
// 絶対音感の既存の円環状ボタン(app.js内、CSSクラス.answer-grid/.answer)には触れず、
// 新しいクラス名(.answer-panel系)で独立して実装する。
import { createAnswerLock } from "./answer-lock.js";

// container(DOM要素)の中に、labels(表示ラベルの配列)を円環状に描画する。ボタンを押すと、
// 最初の1回だけonSelect(label, index)を呼き、
// 以後すべてのボタンを無効化して選択したボタンへ.selectedを付ける
// (仕様11.3: 選択後は全ボタン無効化・二重回答を受け付けない)。
// 呼び出すたびに中身を作り直すだけで、内部状態を持ち越さない。
//
// labelsの各要素は、プレーンな文字列、または次の形のオブジェクト(2026-09-17追加)。
//   text: 主表記(必須)
//   enharmonic: ♭側などの異名同音表記。無ければnull/省略可
//   extra: 1オクターブ上の重複音(半音差12・13)かどうか(省略時false)。
//     通常のリングより外側・放射状に配置する目印として使う。
export function renderAnswerPanel({ container, labels, onSelect }) {
  const answerLock = createAnswerLock();
  const items = labels.map((label) => (typeof label === "string" ? { text: label } : label));

  container.innerHTML = `
    <div class="answer-panel answer-panel--circular">
      ${items.map((item, i) => {
        const accessibleName = item.enharmonic ? `${item.text}、${item.enharmonic}` : item.text;
        const extraClass = item.extra ? " answer-panel__button--extra" : "";
        return `
        <button type="button" class="answer-panel__button${extraClass}" style="--i:${i}" data-index="${i}" aria-label="${accessibleName}">
          <span class="answer-panel__label-main">${item.text}</span>
          ${item.enharmonic ? `<span class="answer-panel__label-alt">${item.enharmonic}</span>` : ""}
        </button>`;
      }).join("")}
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
