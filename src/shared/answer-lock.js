// 「最初の1回だけ回答を受け付ける」ロック(仕様13.2)。DOMに依存しないため単体テストできる。
export function createAnswerLock() {
  let locked = false;
  return {
    isLocked: () => locked,
    // ロックできれば(=まだ誰も回答していなければ)trueを返し、以後ロックする。
    // 2回目以降の呼び出しはfalseを返すだけで、状態は変えない。
    tryLock: () => {
      if (locked) return false;
      locked = true;
      return true;
    },
  };
}
