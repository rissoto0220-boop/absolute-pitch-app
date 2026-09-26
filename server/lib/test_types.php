<?php
declare(strict_types=1);

require_once __DIR__ . '/test_types/AbsolutePitchProfile.php';
require_once __DIR__ . '/test_types/RelativePitchProfile.php';

// testTypeに対応するプロファイルを返す。新しいテスト種別を追加する場合は、
// ここへの登録と、lib/config.phpのALLOWED_TEST_TYPESへの追記の両方が必要。
function test_type_profile(string $testType): TestTypeProfile
{
    static $profiles = null;
    $profiles ??= [
        'absolute_pitch' => new AbsolutePitchProfile(),
        'relative_pitch' => new RelativePitchProfile(),
    ];
    return $profiles[$testType] ?? throw new InvalidArgumentException("unknown testType: {$testType}");
}
