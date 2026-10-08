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
const deleteButton = document.getElementById("deleteButton");
const deleteMessage = document.getElementById("deleteMessage");
const deleteDialog = document.getElementById("deleteDialog");
const deleteConfirmButton = document.getElementById("deleteConfirmButton");

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

// ---- 回答詳細CSVの削除 ----
// 手順: 条件を検証 → 該当件数を取得 → 確認ダイアログ(キャンセル/削除) → 「削除」で実行。
// 確認ダイアログを開いたときの条件を保持し、実行時はその条件を使う(ダイアログを開いた後に
// 入力欄を書き換えても、確認した内容と違う条件で削除されないようにする)。
let pendingDelete = null;

function isRealDate(value) {
  if (!/^\d{8}$/.test(value)) return false;
  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(4, 6));
  const d = Number(value.slice(6, 8));
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function formatDate(value) {
  return `${value.slice(0, 4)}/${value.slice(4, 6)}/${value.slice(6, 8)}`;
}

async function openDeleteDialog() {
  deleteMessage.textContent = "";
  const testType = document.getElementById("deleteTestType").value;
  const participantId = document.getElementById("deleteParticipantId").value.trim();
  const to = document.getElementById("deleteTo").value.trim();

  if (!isRealDate(to)) {
    deleteMessage.textContent = "日付は、実在する日付をYYYYMMDD形式で入力してください。";
    return;
  }
  const params = new URLSearchParams({ to });
  if (testType) params.set("testType", testType);
  if (participantId) params.set("participantId", participantId);

  deleteButton.disabled = true;
  try {
    // 該当件数を、一覧と同じ絞り込みで数える(削除の対象と一致する)。
    const res = await fetch(`api/list_files.php?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    if (data.files.length === 0) {
      deleteMessage.textContent = "条件に一致するファイルがないため、削除するものはありません。";
      return;
    }
    pendingDelete = { params, count: data.files.length };
    const conditions = [
      ["テスト種別", testType ? (TEST_TYPE_LABEL[testType] ?? testType) : "すべて"],
      ["参加者ID", participantId || "すべて"],
      ["日付", `${formatDate(to)} 以前`],
    ];
    const dl = document.getElementById("deleteConditions");
    dl.replaceChildren(...conditions.flatMap(([label, value]) => {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      return [dt, dd];
    }));
    document.getElementById("deleteCount").textContent = `該当する回答詳細CSVファイル: ${data.files.length}件`;
    deleteDialog.showModal();
  } catch (e) {
    deleteMessage.textContent = `削除の準備に失敗しました: ${e.message}`;
  } finally {
    deleteButton.disabled = false;
  }
}

async function executeDelete() {
  const { params } = pendingDelete;
  deleteConfirmButton.disabled = true;
  try {
    const res = await fetch("api/delete_files.php", { method: "POST", body: params });
    const data = await res.json();
    deleteDialog.close();
    if (!res.ok) {
      deleteMessage.textContent = `削除に失敗しました: ${data.error ?? `HTTP ${res.status}`}`
        + (data.deleted !== undefined ? `(${data.deleted}件は削除済み)` : "");
    } else {
      deleteMessage.className = "success";
      deleteMessage.textContent = `${data.deleted}件の回答詳細CSVファイルを削除しました。`;
    }
    search(); // 一覧を最新にする
  } catch (e) {
    deleteDialog.close();
    deleteMessage.textContent = `削除に失敗しました: ${e.message}`;
  } finally {
    pendingDelete = null;
    deleteConfirmButton.disabled = false;
  }
}

deleteButton.addEventListener("click", () => {
  deleteMessage.className = "error";
  openDeleteDialog();
});
document.getElementById("deleteCancelButton").addEventListener("click", () => {
  pendingDelete = null;
  deleteDialog.close();
});
// Escキーで閉じた場合も、削除は実行しない。
deleteDialog.addEventListener("close", () => { pendingDelete = null; });
deleteConfirmButton.addEventListener("click", executeDelete);

bulkButton.addEventListener("click", bulkDownload);
historyButton.addEventListener("click", downloadHistory);

// 初回表示時に一覧を取得しておく
search();
