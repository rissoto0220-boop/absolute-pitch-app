<?php
declare(strict_types=1);

require_once __DIR__ . '/validate.php';

// 一覧・一括ダウンロードAPI共通の絞り込み条件(testType, participantId, from, to。全て任意)。
// 空文字は「指定なし」として扱う。戻り値: ['filters' => [...], 'error' => string|null]
function parse_list_filters(array $query): array
{
    $filters = [];
    foreach (['testType', 'participantId', 'from', 'to'] as $key) {
        $value = $query[$key] ?? '';
        $filters[$key] = is_string($value) && $value !== '' ? $value : null;
    }

    if ($filters['testType'] !== null && !is_valid_test_type($filters['testType'])) {
        return ['filters' => $filters, 'error' => 'invalid testType'];
    }
    if ($filters['participantId'] !== null && !is_valid_participant_id($filters['participantId'])) {
        return ['filters' => $filters, 'error' => 'invalid participantId'];
    }
    foreach (['from', 'to'] as $key) {
        if ($filters[$key] !== null && !is_valid_date_segment($filters[$key])) {
            return ['filters' => $filters, 'error' => "invalid {$key}"];
        }
    }
    return ['filters' => $filters, 'error' => null];
}
