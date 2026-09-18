// 相対音感の練習要否判定(仕様 relative-pitch-test-spec.md §13.4・§6.2)。
//
// 完了済み判定条件: test_type = relative_pitch、test_version = 指定されたバージョン、
// session_status = completed のセッションが1件でもあれば、2回目以降として練習をスキップ可能にする。
// 中断履歴(interrupted)だけでは完了済みとみなさない。簡易版・完全版は別々に判定する
// (簡易版を完了していても、完全版の練習は別途必要、仕様19章「同じ系列へ無条件に混在させない」と同じ考え方)。
//
// sessions内の各要素は、少なくとも testType/testVersion/sessionStatus を持つことを前提とする。
// 参加者IDでの絞り込みは、呼び出し側(保存データを読み込む側)が既に行っている前提とする。
export function hasCompletedSession(sessions, testVersion) {
  return sessions.some((session) => (
    session.testType === "relative_pitch"
    && session.testVersion === testVersion
    && session.sessionStatus === "completed"
  ));
}
