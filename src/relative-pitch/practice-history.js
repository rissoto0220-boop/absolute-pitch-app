// 相対音感簡易版の練習要否判定(仕様 relative-pitch-test-spec.md §13.4)。
//
// 完了済み判定条件: test_type = relative_pitch、test_version = simplified、
// session_status = completed のセッションが1件でもあれば、2回目以降として練習をスキップ可能にする。
// 中断履歴(interrupted)だけでは完了済みとみなさない。
//
// 実際の保存済みセッションの読み込みはフェーズ6(保存と中断)で実装する。ここでは、
// 「渡されたセッション一覧の中に該当するものがあるか」を判定する純粋な関数として先に用意し、
// フェーズ6で実際のlocalStorageデータをそのまま渡せるようにする。
// sessions内の各要素は、少なくとも testType/testVersion/sessionStatus を持つことを前提とする。
// 参加者IDでの絞り込みは、呼び出し側(保存データを読み込む側)が既に行っている前提とする。
export function hasCompletedSimplifiedSession(sessions) {
  return sessions.some((session) => (
    session.testType === "relative_pitch"
    && session.testVersion === "simplified"
    && session.sessionStatus === "completed"
  ));
}
