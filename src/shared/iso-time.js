function pad(n, width = 2) {
  return String(n).padStart(width, "0");
}

// タイムゾーン付きISO 8601形式の文字列を作る(例: 2026-08-23T15:35:25.123+09:00、仕様23.3)。
// Date.prototype.toISOString()はUTC(末尾がZ)になってしまうため、端末のローカル時刻とタイム
// ゾーンから自前で組み立てる。
export function toLocalIso(date = new Date()) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absMinutes / 60));
  const offsetMins = pad(absMinutes % 60);

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `.${pad(date.getMilliseconds(), 3)}${sign}${offsetHours}:${offsetMins}`
  );
}

// CSVファイル名用の日時(例: 20260823_153525、仕様22.3)。コロンはファイル名に使えない
// ことがあるため含めない。
export function toFilenameTimestamp(date = new Date()) {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}
