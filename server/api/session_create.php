<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/config.php';
require_once __DIR__ . '/../lib/validate.php';
require_once __DIR__ . '/../lib/csv.php';
require_once __DIR__ . '/../lib/test_types.php';

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['error' => 'method not allowed']);
}

$testType = $_GET['testType'] ?? '';
$participantId = $_GET['participantId'] ?? '';

if (!is_valid_test_type($testType)) {
    respond(400, ['error' => 'invalid or unknown testType']);
}
if (!is_valid_participant_id($participantId)) {
    respond(400, ['error' => 'invalid participantId']);
}

$rawBody = file_get_contents('php://input');
$session = json_decode($rawBody, true);

if (!is_array($session)) {
    respond(400, ['error' => 'request body must be a JSON object']);
}

if (($session['testType'] ?? null) !== $testType) {
    respond(400, ['error' => 'testType in query and body do not match']);
}

$profile = test_type_profile($testType);
$validationErrors = $profile->validateSessionPayload($session);
if (!empty($validationErrors)) {
    respond(400, ['error' => 'validation failed', 'details' => $validationErrors]);
}

$sessionId = $session['sessionId'];
$startAt = start_at_from_iso($session['startedAt']);
$date = substr($startAt, 0, 8);
if (!is_valid_start_at($startAt) || !is_valid_date_segment($date)) {
    respond(400, ['error' => 'startedAt could not be parsed into a date and time']);
}

$filename = response_detail_filename($profile->filePrefix(), $participantId, $startAt);
$dir = DATA_ROOT . "/{$testType}/{$participantId}/{$date}";
$path = "{$dir}/{$filename}";
$result = ['sessionId' => $sessionId, 'testType' => $testType, 'participantId' => $participantId, 'date' => $date, 'filename' => $filename];

if (file_exists($path)) {
    // 同じ参加者・同じ開始日時のファイルが既にある。同一sessionIdなら再送(クライアント側のリトライ)
    // として冪等に成功扱いにし、別のsessionIdなら上書きせずに拒否する。
    $existingRows = read_csv_file($path);
    if (($existingRows[0]['session_id'] ?? null) === $sessionId) {
        respond(200, $result);
    }
    respond(409, ['error' => 'a different session with the same participantId and startedAt already exists']);
}

if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
    respond(500, ['error' => 'failed to create storage directory']);
}

try {
    $rows = $profile->sessionToResponseDetailRows($participantId, $session);
    write_csv_file($path, $profile->responseDetailHeaders(), $rows);
} catch (Throwable $e) {
    respond(500, ['error' => 'failed to write CSV file']);
}

respond(201, $result);
