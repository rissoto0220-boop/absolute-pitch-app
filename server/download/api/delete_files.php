<?php
declare(strict_types=1);

require_once __DIR__ . '/../../lib/config.php';
require_once __DIR__ . '/../../lib/list_filters.php';
require_once __DIR__ . '/../../lib/repository.php';

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

// 削除は取り消せないため、リンクの先読み等で実行されないようPOSTのみ受け付ける。
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['error' => 'method not allowed']);
}

$parsed = parse_list_filters($_POST);
if ($parsed['error'] !== null) {
    respond(400, ['error' => $parsed['error']]);
}
$filters = $parsed['filters'];

// 日付(指定日付以前)は必須。未指定で全件を消してしまう事故を防ぐ。
// 「以前」だけを使うため、開始日(from)は受け付けない。
if ($filters['to'] === null) {
    respond(400, ['error' => 'to is required']);
}
$filters['from'] = null;

$files = find_response_detail_files_filtered($filters);

$deleted = 0;
$failed = 0;
$dirs = [];
foreach ($files as $file) {
    if (@unlink($file['path'])) {
        $deleted++;
        $dateDir = dirname($file['path']);
        $dirs[$dateDir] = true;
    } else {
        $failed++;
    }
}

// 空になったフォルダ(日付・参加者ID・テスト種別)を片付ける。中身が残っているフォルダは消えない。
// DATA_ROOT自体は消さない。
foreach (array_keys($dirs) as $dateDir) {
    $participantDir = dirname($dateDir);
    $testTypeDir = dirname($participantDir);
    foreach ([$dateDir, $participantDir, $testTypeDir] as $dir) {
        if (is_dir($dir) && count(scandir($dir) ?: []) <= 2) {
            @rmdir($dir);
        }
    }
}

error_log(sprintf(
    'delete_files: testType=%s participantId=%s to=%s deleted=%d failed=%d remote=%s',
    $filters['testType'] ?? 'ALL',
    $filters['participantId'] ?? 'ALL',
    $filters['to'],
    $deleted,
    $failed,
    $_SERVER['REMOTE_ADDR'] ?? '-'
));

if ($failed > 0) {
    respond(500, ['error' => 'some files could not be deleted', 'deleted' => $deleted, 'failed' => $failed]);
}
respond(200, ['deleted' => $deleted]);
