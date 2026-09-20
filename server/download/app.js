const STATUS_LABEL = {
  completed: "完了",
  forced_termination: "強制終了",
  interrupted: "中断",
};

const TEST_TYPE_LABEL = {
  absolute_pitch: "絶対音感",
  relative_pitch: "相対音感",
};

const TEST_VERSION_LABEL = {
  simplified: "簡易版",
  full: "完全版",
};

const listArea = document.getElementById("listArea");
const bulkButton = document.getElementById("bulkDownloadButton");
const bulkMessage = document.getElementById("bulkMessage");
const historyButton = document.getElementById("historyDownloadButton");
const historyMessage = document.getElementById("historyMessage");

// 一括ダウンロードは、画面に表示している一覧と中身が一致するよう、最後に「一覧を取得」した
// 時点の絞り込み条件を使う(その後に入力欄を書き換えても、再度「一覧を取得」するまで反映しない)。
let lastSearchQuery = "";

// APIのレスポンスをファイルとして保存する。失敗時はサーバが返すJSONのerrorを例外にする。
async function downloadFile(url, fallbackName) {
  const res = await fetch(url);
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      message = (await res.json()).error ?? message;
    } catch {
      // JSONでない応答は、ステータスコードだけを表示する。
    }
    throw new Error(message);
  }
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const blob = await res.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = match ? match[1] : fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function renderList(files) {
  if (files.length === 0) {
    listArea.innerHTML = '<p class="empty">条件に一致するファイルがありません。</p>';
    return;
  }

  const rows = files
    .map((f) => {
      const statusLabel = STATUS_LABEL[f.sessionStatus] ?? f.sessionStatus;
      const testTypeLabel = TEST_TYPE_LABEL[f.testType] ?? f.testType;
      const versionLabel = f.testVersion ? (TEST_VERSION_LABEL[f.testVersion] ?? f.testVersion) : "-";
      // 絶対音感は「提示された問題数」、相対音感は「本番の総問題数」を分母にする。
      const denominator = f.totalQuestions ?? f.questionsPresented;
      const accuracyLabel = f.accuracy === null || f.accuracy === "" ? "-" : `${Number(f.accuracy).toFixed(1)}%`;
      return `
        <tr>
          <td>${testTypeLabel}</td>
          <td>${f.participantId}</td>
          <td>${versionLabel}</td>
          <td>${f.startedAt}</td>
          <td class="status-${f.sessionStatus}">${statusLabel}</td>
          <td>${f.correctCount} / ${denominator}</td>
          <td>${accuracyLabel}</td>
        </tr>`;
    })
    .join("");

  listArea.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>テスト種別</th><th>参加者ID</th><th>版</th><th>開始日時</th><th>状態</th><th>正答数</th><th>正答率</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

async function search() {
  const params = new URLSearchParams();
  const testType = document.getElementById("filterTestType").value;
  const participantId = document.getElementById("filterParticipantId").value.trim();
  const from = document.getElementById("filterFrom").value.trim();
  const to = document.getElementById("filterTo").value.trim();
  if (testType) params.set("testType", testType);
  if (participantId) params.set("participantId", participantId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  listArea.innerHTML = '<p class="empty">読み込み中...</p>';
  bulkMessage.textContent = "";
  bulkButton.disabled = true;
  lastSearchQuery = "";
  try {
    const res = await fetch(`api/list_files.php?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      listArea.innerHTML = `<p class="error">エラー: ${data.error ?? res.status}</p>`;
      return;
    }
    renderList(data.files);
    lastSearchQuery = params.toString();
    bulkButton.disabled = data.files.length === 0;
  } catch (e) {
    listArea.innerHTML = `<p class="error">通信エラー: ${e.message}</p>`;
  }
}

async function bulkDownload() {
  bulkMessage.textContent = "";
  bulkButton.disabled = true;
  try {
    await downloadFile(`api/download_zip.php?${lastSearchQuery}`, "results.zip");
  } catch (e) {
    bulkMessage.textContent = `一括ダウンロードに失敗しました: ${e.message}`;
  } finally {
    bulkButton.disabled = false;
  }
}

document.getElementById("searchButton").addEventListener("click", search);

async function downloadHistory() {
  const params = new URLSearchParams({
    testType: document.getElementById("historyTestType").value,
    includeInterrupted: document.getElementById("historyIncludeInterrupted").checked ? "1" : "0",
  });
  // 参加者IDが空欄なら、全参加者のセッションを含める。
  const participantId = document.getElementById("historyParticipantId").value;
  if (participantId.trim()) params.set("participantId", participantId.trim());

  historyMessage.textContent = "";
  historyButton.disabled = true;
  try {
    await downloadFile(`api/download_history.php?${params.toString()}`, "sessions.csv");
  } catch (e) {
    historyMessage.textContent = `ダウンロードに失敗しました: ${e.message}`;
  } finally {
    historyButton.disabled = false;
  }
}

bulkButton.addEventListener("click", bulkDownload);
historyButton.addEventListener("click", downloadHistory);

// 初回表示時に一覧を取得しておく
search();
