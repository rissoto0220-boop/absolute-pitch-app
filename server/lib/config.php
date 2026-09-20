<?php
declare(strict_types=1);

// テスト種別の許可リスト。追加する場合は、lib/test_types.php にもプロファイルを登録すること
// (未知のtestTypeはAPIで拒否する)。
const ALLOWED_TEST_TYPES = [
    'absolute_pitch',
    'relative_pitch',
];

// 日付を含むダウンロードファイル名(results_yyyyMMdd.zip など)を日本時間で作るため、
// php.iniのdate.timezone未設定(既定UTC)に依存せず固定する。
date_default_timezone_set('Asia/Tokyo');

// data_root。当面はhtdocs配下に置くが、data/.htaccessでWebからの直接
// アクセスは拒否している(PHPからのファイル読み書きには影響しない)。
const DATA_ROOT = __DIR__ . '/../data';
