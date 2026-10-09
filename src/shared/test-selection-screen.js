// テスト選択画面。参加者ID確認の後に表示し、ここから各テストの練習・本番へ進む。
// 表示はtestsの一覧から機械的に作るだけで、テスト固有の処理は持たない
// (テストを追加するときは、呼び出し側の一覧に1件足すだけで済むようにする)。
import { escapeHtml } from "./escape-html.js";

// tests: { id, title, description, available, onStart } の配列。
//   available が false のテストは「準備中」として表示し、選べないようにする。
// onChangeParticipant: 「参加者IDを変更する」を押したときに呼ぶ。
export function showTestSelectionScreen({ screenEl, participantId, tests, onChangeParticipant }) {
  screenEl.innerHTML = `
    <div class="panel">
      <h2>受けるテストを選んでください</h2>
      <p class="note">参加者ID: ${escapeHtml(participantId)}</p>
      <ul class="test-list">
        ${tests.map((test) => `
          <li class="test-item${test.available ? "" : " is-unavailable"}">
            <button id="test-${escapeHtml(test.id)}" class="test-button"${test.available ? "" : " disabled"}>
              <span class="test-title">${escapeHtml(test.title)}</span>
              ${test.available ? "" : `<span class="test-badge">準備中</span>`}
            </button>
            <p class="test-description">${escapeHtml(test.description)}</p>
          </li>`).join("")}
      </ul>
      <div class="actions"><button id="change-participant" class="secondary">参加者IDを変更する</button></div>
    </div>`;

  tests.filter((test) => test.available).forEach((test) => {
    document.getElementById(`test-${test.id}`).addEventListener("click", test.onStart);
  });
  document.getElementById("change-participant").addEventListener("click", onChangeParticipant);
}
