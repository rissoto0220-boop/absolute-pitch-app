<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function is_valid_test_type(string $testType): bool
{
    return in_array($testType, ALLOWED_TEST_TYPES, true);
}

function is_valid_participant_id(string $participantId): bool
{
    return (bool) preg_match('/^P\d{5}$/', $participantId);
}

// YYYYMMDD形式(ディレクトリ名としてそのまま使う)。
function is_valid_date_segment(string $date): bool
{
    return (bool) preg_match('/^\d{8}$/', $date);
}

function is_valid_session_id(string $sessionId): bool
{
    return (bool) preg_match('/^[0-9a-fA-F-]{36}$/', $sessionId);
}

// セッション開始日時(yyyyMMddHHmmss、24時間表記)。回答詳細CSVのファイル名に使う。
function is_valid_start_at(string $startAt): bool
{
    return (bool) preg_match('/^\d{14}$/', $startAt);
}

// 全テスト種別に共通する、セッションオブジェクトの外枠の検証。
// 異常があれば理由の配列を返す(空配列なら正常)。
function validate_session_envelope(array $session, array $requiredKeys, array $allowedStatuses): array
{
    $errors = [];
    foreach ($requiredKeys as $field) {
        if (!array_key_exists($field, $session)) {
            $errors[] = "missing field: {$field}";
        }
    }
    if (!empty($errors)) {
        return $errors;
    }

    foreach (['sessionId', 'testType', 'startedAt', 'endedAt', 'sessionStatus'] as $field) {
        if (!is_string($session[$field])) {
            $errors[] = "{$field} must be a string";
        }
    }
    if (!empty($errors)) {
        return $errors;
    }

    if (!is_valid_session_id($session['sessionId'])) {
        $errors[] = 'invalid sessionId';
    }
    if (!in_array($session['sessionStatus'], $allowedStatuses, true)) {
        $errors[] = 'invalid sessionStatus';
    }
    if ($session['startedAt'] === '' || $session['endedAt'] === '') {
        $errors[] = 'startedAt/endedAt must not be empty';
    } elseif (!preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/', $session['startedAt'])) {
        // ファイル名(startAt)と保存先の日付を、この文字列から作るため。
        $errors[] = 'startedAt must be ISO 8601 (yyyy-MM-ddTHH:mm:ss...)';
    }
    if (!is_array($session['responses'])) {
        $errors[] = 'responses must be an array';
    }
    return $errors;
}

// responses[]の各要素の検証。値はCSVのセルになるため、配列・オブジェクトは受け付けない。
function validate_response_items(array $responses, array $requiredKeys, array $phases, array $outcomes): array
{
    $errors = [];
    foreach ($responses as $i => $r) {
        if (!is_array($r)) {
            $errors[] = "responses[{$i}] must be an object";
            continue;
        }
        foreach ($requiredKeys as $field) {
            if (!array_key_exists($field, $r)) {
                $errors[] = "responses[{$i}].{$field} is missing";
            }
        }
        foreach ($r as $key => $value) {
            if (is_array($value)) {
                $errors[] = "responses[{$i}].{$key} must be a scalar or null";
            }
        }
        if (isset($r['phase']) && !in_array($r['phase'], $phases, true)) {
            $errors[] = "responses[{$i}].phase is invalid";
        }
        if (isset($r['outcome']) && !in_array($r['outcome'], $outcomes, true)) {
            $errors[] = "responses[{$i}].outcome is invalid";
        }
    }
    return $errors;
}
