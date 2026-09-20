<?php
declare(strict_types=1);

require_once __DIR__ . '/../../lib/config.php';
require_once __DIR__ . '/../../lib/validate.php';
require_once __DIR__ . '/../../lib/list_filters.php';
require_once __DIR__ . '/../../lib/repository.php';
require_once __DIR__ . '/../../lib/test_types.php';

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

$parsed = parse_list_filters($_GET);
if ($parsed['error'] !== null) {
    respond(400, ['error' => $parsed['error']]);
}

$files = find_response_detail_files_filtered($parsed['filters']);
$result = [];

foreach ($files as $file) {
    $rows = read_csv_file($file['path']);
    if (empty($rows)) {
        continue;
    }
    $summary = test_type_profile($file['testType'])->summarizeSessionRows($rows);

    $result[] = [
        'sessionId' => $summary['sessionId'],
        'startAt' => $file['startAt'],
        'filename' => $file['filename'],
        'testType' => $file['testType'],
        'participantId' => $file['participantId'],
        'date' => $file['date'],
        'sessionStatus' => $summary['sessionStatus'],
        'startedAt' => $summary['startedAt'],
        'endedAt' => $summary['endedAt'],
        'correctCount' => $summary['correctCount'],
        'questionsPresented' => $summary['questionsPresented'],
        // 以下は相対音感のみ値を持つ(絶対音感ではnull)。
        'testVersion' => $summary['testVersion'] ?? null,
        'totalQuestions' => $summary['totalQuestions'] ?? null,
        'accuracy' => $summary['accuracy'] ?? null,
    ];
}

usort($result, fn ($a, $b) => $b['startedAt'] <=> $a['startedAt']); // 新しい順

respond(200, ['files' => $result]);
