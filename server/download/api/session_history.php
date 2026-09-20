<?php
declare(strict_types=1);

require_once __DIR__ . '/../../lib/config.php';
require_once __DIR__ . '/../../lib/validate.php';
require_once __DIR__ . '/../../lib/repository.php';
require_once __DIR__ . '/../../lib/test_types.php';

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

$testType = $_GET['testType'] ?? '';
$participantId = ($_GET['participantId'] ?? '') === '' ? null : $_GET['participantId']; // 未指定=全参加者
$includeInterrupted = ($_GET['includeInterrupted'] ?? '0') === '1';

if (!is_valid_test_type($testType)) {
    respond(400, ['error' => 'invalid testType']);
}
if ($participantId !== null && !is_valid_participant_id($participantId)) {
    respond(400, ['error' => 'invalid participantId']);
}

$rows = build_session_history_rows($testType, $participantId, $includeInterrupted);

respond(200, ['rows' => $rows]);
