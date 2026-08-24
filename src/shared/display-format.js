// 画面表示専用の日時整形。保存データやCSV出力のISO 8601形式(仕様23.3)には影響しない。
const displayDateTimeFormat = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
});

export function formatDisplayDateTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return displayDateTimeFormat.format(date);
}
