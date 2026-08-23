// Audio再生の薄いラッパー(仕様8章・12.2)。1問につき1回だけ再生する。
//
// play()が返すPromiseは、ブラウザが実際に再生を開始したと判断した時点で解決される。
// このPromiseの解決時刻を回答時間の計測起点として使う(仕様13.3)。
// ただし「再生要求が受理された時刻」であり、実際に音が聞こえ始めた瞬間そのものとは
// 数十ミリ秒程度ずれる可能性がある。この限界は仕様13.3にも明記されている。
export function playStimulus(src) {
  const audio = new Audio(src);
  audio.preload = "auto";
  return audio.play().then(() => audio);
}
