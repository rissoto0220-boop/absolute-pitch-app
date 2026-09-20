<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

// "2026-09-16T10:00:00+09:00" -> "20260916"(既存クライアントのtoLocalIso()と同じく
// 常にローカル日時のオフセット付き文字列で送られてくる前提)。
function date_segment_from_iso(string $isoDateTime): string
{
    $datePart = substr($isoDateTime, 0, 10); // "2026-09-16"
    return str_replace('-', '', $datePart);
}

// "2026-09-19T10:00:00+09:00" -> "20260919100000"(yyyyMMddHHmmss)。
// startedAtに含まれるローカル日時をそのまま使う(タイムゾーン変換はしない)。呼び出し前に
// startedAtがISO 8601形式であることを検証しておくこと。
function start_at_from_iso(string $isoDateTime): string
{
    return preg_replace('/\D/', '', substr($isoDateTime, 0, 19));
}

// 回答詳細CSVのファイル名。例: AP_P00001_20260919100000.csv
function response_detail_filename(string $prefix, string $participantId, string $startAt): string
{
    return "{$prefix}_{$participantId}_{$startAt}.csv";
}

// headers: 列名(=各行連想配列のキー)の配列。rows: 連想配列の配列。
// 表計算ソフトとの互換性のためCRLFで改行する(既存クライアントのtoCsv()と同じ方針)。
function write_csv_file(string $path, array $headers, array $rows): void
{
    $fh = fopen($path, 'wb');
    if ($fh === false) {
        throw new RuntimeException("failed to open file for writing: {$path}");
    }
    flock($fh, LOCK_EX);
    fputcsv($fh, $headers, ',', '"', '\\', "\r\n");
    foreach ($rows as $row) {
        $line = [];
        foreach ($headers as $key) {
            $line[] = $row[$key] ?? '';
        }
        fputcsv($fh, $line, ',', '"', '\\', "\r\n");
    }
    flock($fh, LOCK_UN);
    fclose($fh);
}

// headers/rowsからCSV文字列を組み立てて返す(ダウンロードAPIでファイルに保存せず
// その場で応答するために使う)。
function build_csv_string(array $headers, array $rows): string
{
    $fh = fopen('php://temp', 'r+b');
    fputcsv($fh, $headers, ',', '"', '\\', "\r\n");
    foreach ($rows as $row) {
        $line = [];
        foreach ($headers as $key) {
            $line[] = $row[$key] ?? '';
        }
        fputcsv($fh, $line, ',', '"', '\\', "\r\n");
    }
    rewind($fh);
    $content = stream_get_contents($fh);
    fclose($fh);
    return $content;
}

// 保存済みCSVファイルを読み込み、ヘッダー行をキーにした連想配列の配列として返す。
function read_csv_file(string $path): array
{
    $fh = fopen($path, 'rb');
    if ($fh === false) {
        throw new RuntimeException("failed to open file for reading: {$path}");
    }
    $headers = fgetcsv($fh, 0, ',', '"', '\\');
    $rows = [];
    while (($line = fgetcsv($fh, 0, ',', '"', '\\')) !== false) {
        $rows[] = array_combine($headers, $line);
    }
    fclose($fh);
    return $rows;
}
