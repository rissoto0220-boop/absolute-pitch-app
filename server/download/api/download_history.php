<?php
declare(strict_types=1);

require_once __DIR__ . '/../../lib/config.php';
require_once __DIR__ . '/../../lib/validate.php';
require_once __DIR__ . '/../../lib/repository.php';
require_once __DIR__ . '/../../lib/test_types.php';

function respond_json_error(int $status, string $message): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

$testType = $_GET['testType'] ?? '';
$participantId = ($_GET['participantId'] ?? '') === '' ? null : $_GET['participantId']; // 未指定=全参加者
$includeInterrupted = ($_GET['includeInterrupted'] ?? '0') === '1';

if (!is_valid_test_type($testType)) {
    respond_json_error(400, 'invalid testType');
}
if ($participantId !== null && !is_valid_participant_id($participantId)) {
    respond_json_error(400, 'invalid participantId');
}

$rows = build_session_history_rows($testType, $participantId, $includeInterrupted);
$csv = build_csv_string(test_type_profile($testType)->sessionHistoryHeaders(), $rows);

// 例: AP_sessions_20260920.csv(日付はダウンロード日、日本時間)
$filename = test_type_profile($testType)->filePrefix() . '_sessions_' . date('Ymd') . '.csv';

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . strlen($csv));
echo $csv;
