// 相対音感 簡易版/完全版 選択画面(仕様 relative-pitch-test-spec.md §5.1・§6章)。
// 参加者が相対音感テストに進んだ直後に、どちらのバージョンを受けるかを選ぶ画面。
// この段階では音声再生・保存とはまだ接続しない。選んだtestVersion("simplified"または"full")を
// onSelectへ渡すだけ。
export function showVersionSelectionScreen({ screenEl, onSelect, onBack }) {
  screenEl.innerHTML = `
    <div class="panel">
      <h2>相対音感テストの種類を選んでください</h2>
      <p>どちらか一方を選んで開始してください。</p>
      <div class="actions centered">
        <button id="version-simplified" class="primary">簡易版を始める</button>
      </div>
      <p class="note">Key C・Fisの2キー、本番12問。</p>
      <div class="actions centered">
        <button id="version-full" class="primary">完全版を始める</button>
      </div>
      <p class="note">Key C・Es・Fis・Aの4キー、本番44問。</p>
      <div class="actions"><button id="back" class="secondary">戻る</button></div>
    </div>`;

  document.getElementById("version-simplified").addEventListener("click", () => onSelect("simplified"));
  document.getElementById("version-full").addEventListener("click", () => onSelect("full"));
  document.getElementById("back").addEventListener("click", onBack);
}
