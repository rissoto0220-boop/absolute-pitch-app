<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/validate.php';
require_once __DIR__ . '/csv.php';
require_once __DIR__ . '/test_types.php';

// DATA_ROOT配下を testType/participantId/date/{AP|RP}_{participantId}_{startAt}.csv の階層でスキャンし、
// 条件に合うファイルのパス一覧を返す(1ファイル=1セッション)。
function find_response_detail_files(?string $testType = null, ?string $participantId = null): array
{
    $files = [];
    $testTypes = $testType !== null ? [$testType] : ALLOWED_TEST_TYPES;

    foreach ($testTypes as $tt) {
        if (!is_valid_test_type($tt)) {
            continue;
        }
        $ttDir = DATA_ROOT . "/{$tt}";
        if (!is_dir($ttDir)) {
            continue;
        }

        $participantDirs = $participantId !== null ? [$participantId] : array_values(array_filter(
            scandir($ttDir) ?: [],
            fn ($name) => is_valid_participant_id($name) && is_dir("{$ttDir}/{$name}")
        ));

        foreach ($participantDirs as $pid) {
            if (!is_valid_participant_id($pid)) {
                continue;
            }
            $pidDir = "{$ttDir}/{$pid}";
            if (!is_dir($pidDir)) {
                continue;
            }

            $dateDirs = array_values(array_filter(
                scandir($pidDir) ?: [],
                fn ($name) => is_valid_date_segment($name) && is_dir("{$pidDir}/{$name}")
            ));

            foreach ($dateDirs as $date) {
                $dateDir = "{$pidDir}/{$date}";
                $prefix = test_type_profile($tt)->filePrefix();
                foreach (scandir($dateDir) ?: [] as $csvFile) {
                    // ファイル名は「{prefix}_{参加者ID}_{startAt}.csv」で、フォルダ(参加者ID・日付)と矛盾しないものだけを対象にする。
                    if (!preg_match('/^' . $prefix . '_(P\d{5})_(\d{14})\.csv$/', $csvFile, $m)
                        || $m[1] !== $pid || substr($m[2], 0, 8) !== $date) {
                        continue;
                    }
                    $files[] = [
                        'testType' => $tt,
                        'participantId' => $pid,
                        'date' => $date,
                        'startAt' => $m[2],
                        'filename' => $csvFile,
                        'path' => "{$dateDir}/{$csvFile}",
                    ];
                }
            }
        }
    }

    return $files;
}

// 絞り込み条件(parse_list_filters()の戻り値のfilters)に合う回答詳細CSVを、
// テスト種別・参加者ID・開始日時の順に並べて返す。日付はファイルの日付フォルダ(=開始日)で判定する。
function find_response_detail_files_filtered(array $filters): array
{
    $files = array_filter(
        find_response_detail_files($filters['testType'], $filters['participantId']),
        fn ($f) => ($filters['from'] === null || $f['date'] >= $filters['from'])
            && ($filters['to'] === null || $f['date'] <= $filters['to'])
    );
    usort($files, fn ($a, $b) => [$a['testType'], $a['participantId'], $a['startAt']] <=> [$b['testType'], $b['participantId'], $b['startAt']]);
    return array_values($files);
}

// testTypeスコープでセッション履歴行(集計済み)を組み立てる。$participantIdがnullなら全参加者。
// 行は参加者ID順、次に開始日時順。$includeInterrupted が false なら sessionStatus === 'interrupted' を除外する。
function build_session_history_rows(string $testType, ?string $participantId, bool $includeInterrupted): array
{
    $profile = test_type_profile($testType);
    $summaries = [];
    foreach (find_response_detail_files($testType, $participantId) as $file) {
        $csvRows = read_csv_file($file['path']);
        if (empty($csvRows)) {
            continue;
        }
        $summary = $profile->summarizeSessionRows($csvRows);
        if (!$includeInterrupted && $summary['sessionStatus'] === 'interrupted') {
            continue;
        }
        $summaries[] = $summary;
    }
    usort($summaries, fn ($a, $b) => [$a['participantId'], $a['startedAt']] <=> [$b['participantId'], $b['startedAt']]);
    return array_map([$profile, 'buildSessionHistoryRow'], $summaries);
}
