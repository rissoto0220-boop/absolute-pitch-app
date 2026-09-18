// 回答ボタンの共通部品(仕様 relative-pitch-test-spec.md §11.2)。
// 「回答画面、回答候補、正解判定、保存処理をレイアウトごとに複製せず、配置だけを切り替える」ことを
// 満たすため、circular(単一リング)・spiral(渦巻配置)・dual_ring(二重円環)のどれでも、
// 同じラベル一覧・同じ選択処理を使い回す。
//
// 絶対音感の既存の円環状ボタン(app.js内、CSSクラス.answer-grid/.answer)には触れず、
// 新しいクラス名(.answer-panel系)で独立して実装する。
import { createAnswerLock } from "./answer-lock.js";
import {
  computeSpiralPositions,
  spiralGuidePathPoints,
  computeDualRingLayout,
  safeDualRingInnerRadius,
  pointsToPathD,
} from "./circular-answer-layout.js";

// circular/spiral/dual_ringが共有する、styles.cssの--button-size・--wheel-sizeの最大値
// (画面が大きいときの値)。dual_ringの内側半径を安全に決めるために使う。
// styles.cssの値を変えた場合は、ここも合わせて更新すること。
const MAX_BUTTON_SIZE_PX = 76;
const MAX_WHEEL_SIZE_PX = 430;

// spiral/dual_ringの位置計算に使う確定値(モックHTMLでの検証結果、2026-09-18)。
const SPIRAL_CONFIG = { baseRadius: 0.66, step: 0.032 };
// outerRadiusは1.0(コンテナ端)を超えてもよい(コンテナ自体はoverflowをクリップしないため、
// ボタンが外側へはみ出すだけで表示上は問題ない)。innerRadiusは決め打ちにせず、外側半径・
// 最大ボタンサイズから安全な値を逆算する(2026-09-18: 内側半径を独立した値で広げたところ、
// 大画面でボタンが最大サイズになったときに「ド」と「高いド」等の同じ角度上のペアが
// 半径方向で重なる問題が見つかったため)。外側半径だけを動かせば、内側半径も連動して
// 安全な間隔を保ったまま追従する。
const DUAL_RING_OUTER_RADIUS = 1.15;
const DUAL_RING_CONFIG = {
  outerRadius: DUAL_RING_OUTER_RADIUS,
  innerRadius: safeDualRingInnerRadius(DUAL_RING_OUTER_RADIUS, {
    maxButtonSizePx: MAX_BUTTON_SIZE_PX,
    maxWheelSizePx: MAX_WHEEL_SIZE_PX,
  }),
};

// container(DOM要素)の中に、labels(表示ラベルの配列)をlayout("circular"・"spiral"・"dual_ring"・
// "grid"のいずれか)で描画する。ボタンを押すと、最初の1回だけonSelect(label, index)を呼び、
// 以後すべてのボタンを無効化して選択したボタンへ.selectedを付ける
// (仕様11.3: 選択後は全ボタン無効化・二重回答を受け付けない)。
// 呼び出すたびに中身を作り直すだけで、内部状態を持ち越さない。
//
// labelsの各要素は、プレーンな文字列、または次の形のオブジェクト(2026-09-17追加)。
//   text: 主表記(必須)
//   enharmonic: ♭側などの異名同音表記。無ければnull/省略可
//   extra: 1オクターブ上の重複音(半音差12・13)かどうか(省略時false)。
//     circularレイアウトでは、通常のリングより外側・放射状に配置する目印として使う。
export function renderAnswerPanel({ container, labels, layout, onSelect }) {
  const answerLock = createAnswerLock();
  const items = labels.map((label) => (typeof label === "string" ? { text: label } : label));

  const geometry = layout === "spiral" || layout === "dual_ring" ? computeGeometry(layout, items.length) : null;
  const guideSvg = geometry ? buildGuideSvg(geometry) : "";
  const positions = geometry ? geometry.positions : null;

  container.innerHTML = `
    <div class="answer-panel answer-panel--${layout}">
      ${guideSvg}
      ${items.map((item, i) => {
        const accessibleName = item.enharmonic ? `${item.text}、${item.enharmonic}` : item.text;
        const extraClass = item.extra ? " answer-panel__button--extra" : "";
        const positionStyle = positions ? `left:${positions[i].x}%;top:${positions[i].y}%;` : "";
        return `
        <button type="button" class="answer-panel__button${extraClass}" style="--i:${i};${positionStyle}" data-index="${i}" aria-label="${accessibleName}">
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

// spiral/dual_ringの位置とガイド線をまとめて計算する。
// labelsは常に半音差0〜(itemCount-1)の連番順(intervals.jsのANSWER_BUTTON_SEMITONES)である前提で、
// 配列のindexをそのまま半音差として扱う。
function computeGeometry(layout, itemCount) {
  const semitones = Array.from({ length: itemCount }, (_, i) => i);
  if (layout === "spiral") {
    const raw = computeSpiralPositions(semitones, SPIRAL_CONFIG);
    return {
      positions: semitones.map((s) => raw[s]),
      guidePaths: [pointsToPathD(spiralGuidePathPoints(itemCount - 1, SPIRAL_CONFIG))],
    };
  }
  const dual = computeDualRingLayout(semitones, DUAL_RING_CONFIG);
  return {
    positions: semitones.map((s) => dual.positions[s]),
    guidePaths: [pointsToPathD(dual.innerRingPoints), pointsToPathD(dual.bridgeArcPoints)],
  };
}

function buildGuideSvg(geometry) {
  return `<svg class="answer-panel__guide" viewBox="0 0 100 100">
    ${geometry.guidePaths.map((d) => `<path d="${d}" />`).join("")}
  </svg>`;
}
