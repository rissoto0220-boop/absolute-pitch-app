// 一般的な表計算ソフトで開けるCSVを組み立てる(仕様22.1)。

function needsQuoting(value) {
  return /[",\r\n]/.test(value);
}

function toCsvField(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (!needsQuoting(str)) return str;
  return `"${str.replace(/"/g, '""')}"`;
}

// headers: 列名(=各行オブジェクトのキー)の配列。rows: プレーンなオブジェクトの配列。
// 改行はCRLFにする(表計算ソフトとの互換性のため)。
export function toCsv(headers, rows) {
  const lines = [headers.map(toCsvField).join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((key) => toCsvField(row[key])).join(","));
  });
  return lines.join("\r\n") + "\r\n";
}

// 文字列をCSVファイルとして参加者の端末にダウンロードさせる(ブラウザ専用)。
export function downloadTextFile(filename, content, mimeType = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
