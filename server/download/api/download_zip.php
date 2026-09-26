<?php
declare(strict_types=1);

require_once __DIR__ . '/../../lib/config.php';
require_once __DIR__ . '/../../lib/list_filters.php';
require_once __DIR__ . '/../../lib/repository.php';

function respond_json_error(int $status, string $message): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!class_exists('ZipArchive')) {
    respond_json_error(500, 'PHP zip extension is not available on this server');
}

$parsed = parse_list_filters($_GET);
if ($parsed['error'] !== null) {
    respond_json_error(400, $parsed['error']);
}

$files = find_response_detail_files_filtered($parsed['filters']);
if (empty($files)) {
    respond_json_error(404, 'no files match the given conditions');
}

$tmpPath = tempnam(sys_get_temp_dir(), 'results_');
if ($tmpPath === false) {
    respond_json_error(500, 'failed to create a temporary file');
}
register_shutdown_function(static function () use ($tmpPath): void {
    if (is_file($tmpPath)) {
        unlink($tmpPath);
    }
});

// ZipArchiveはclose()までファイルを開いたままにするため、件数が多いと同時に開けるファイル数の
// 上限(macOSの既定は256)に達する。一定件数ごとにclose()して開き直す。
$zip = new ZipArchive();
$opened = $zip->open($tmpPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
if ($opened !== true) {
    respond_json_error(500, 'failed to create the zip file');
}
foreach ($files as $i => $file) {
    // zip内のパスは、テスト種別ディレクトリ以下の構造(testType/participantId/yyyyMMdd/ファイル名)。
    $zip->addFile($file['path'], "{$file['testType']}/{$file['participantId']}/{$file['date']}/{$file['filename']}");
    if (($i + 1) % 100 === 0) {
        $zip->close();
        if ($zip->open($tmpPath) !== true) {
            respond_json_error(500, 'failed to append to the zip file');
        }
    }
}
if (!$zip->close()) {
    respond_json_error(500, 'failed to finish the zip file');
}

// 例: results_20260920.zip(日付はダウンロード日、日本時間)
$filename = 'results_' . date('Ymd') . '.zip';
header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . filesize($tmpPath));
readfile($tmpPath);
