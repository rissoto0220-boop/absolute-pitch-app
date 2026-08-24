// localStorage相当のストレージへの汎用的な読み書き(仕様17.4・26.3)。
// 保存先(getItem/setItemを持つオブジェクト)を外から渡せるようにし、
// テストでは疑似ストレージを使う(乱数・時計と同じ「外から差し替えられる」考え方)。

export function loadJson(storage, key, fallback) {
  let raw;
  try {
    raw = storage.getItem(key);
  } catch {
    // ブラウザ保存が利用できない場合(仕様26.3)。
    return fallback;
  }
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    // 保存データの形式が不正な場合(仕様26.3)。壊れたデータとして扱わず初期値を返す。
    return fallback;
  }
}

export function saveJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // 容量不足・書き込み失敗など(仕様26.3)。
    return false;
  }
}
