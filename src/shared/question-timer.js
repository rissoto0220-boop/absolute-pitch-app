// 1問の回答時間(仕様13章)を管理する。
//
// 「早く回答してもタイマーは止めない」(仕様13.2)ため、このタイマーの役目は
// durationMs経過後に必ず1回 onQuestionEnd を呼ぶことだけ。回答の正誤判定は
// 呼び出し側が「onQuestionEndが呼ばれた時点で回答済みだったか」を見て行う。
//
// 時計(now)とタイマー予約(setTimeoutFn/clearTimeoutFn)を外から渡せるようにし、
// テストでは実際に3.5秒待たずに検証できるようにしている
// (development-handover.md 12.3が乱数について求めている「外部から渡せる構造」と同じ考え方)。
export function createQuestionTimer({
  durationMs,
  onQuestionEnd,
  now = () => performance.now(),
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
}) {
  const startedAt = now();

  const timeoutId = setTimeoutFn(() => {
    // 発火タイミングをそのまま信用せず、この時点で実経過時間を測り直す(仕様13.3)。
    const elapsedMs = now() - startedAt;
    onQuestionEnd(elapsedMs);
  }, durationMs);

  return {
    startedAt,
    elapsedSince: () => now() - startedAt,
    cancel: () => clearTimeoutFn(timeoutId),
  };
}
