import { test } from "node:test";
import assert from "node:assert/strict";
import { loadJson, saveJson } from "../src/shared/storage.js";

function makeFakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, value); },
  };
}

test("saveJson/loadJson: 保存した値をそのまま読み戻せる", () => {
  const storage = makeFakeStorage();
  saveJson(storage, "k", { a: 1 });
  assert.deepEqual(loadJson(storage, "k", null), { a: 1 });
});

test("loadJson: キーが存在しない場合は初期値を返す", () => {
  const storage = makeFakeStorage();
  assert.deepEqual(loadJson(storage, "missing", { empty: true }), { empty: true });
});

test("loadJson: 保存データの形式が不正でも例外を投げず初期値を返す(仕様26.3)", () => {
  const storage = makeFakeStorage();
  storage.setItem("k", "{ this is not valid json");
  assert.deepEqual(loadJson(storage, "k", { fallback: true }), { fallback: true });
});

test("loadJson: getItem自体が例外を投げても初期値を返す(ブラウザ保存が利用できない場合)", () => {
  const storage = { getItem: () => { throw new Error("unavailable"); } };
  assert.deepEqual(loadJson(storage, "k", { fallback: true }), { fallback: true });
});

test("saveJson: setItemが例外を投げてもfalseを返すだけで例外を伝播しない(容量不足など)", () => {
  const storage = { setItem: () => { throw new Error("quota exceeded"); } };
  assert.equal(saveJson(storage, "k", { a: 1 }), false);
});
