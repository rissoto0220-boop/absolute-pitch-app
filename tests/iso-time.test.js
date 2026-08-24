import { test } from "node:test";
import assert from "node:assert/strict";
import { toLocalIso } from "../src/shared/iso-time.js";

// Dateと同じメソッドだけを持つ疑似オブジェクト。タイムゾーンをテスト環境に依存させないため。
function fakeDate({ y, mo, d, h, mi, s, ms, timezoneOffsetMinutes }) {
  return {
    getFullYear: () => y,
    getMonth: () => mo - 1,
    getDate: () => d,
    getHours: () => h,
    getMinutes: () => mi,
    getSeconds: () => s,
    getMilliseconds: () => ms,
    getTimezoneOffset: () => timezoneOffsetMinutes,
  };
}

test("実際の日時に対して仕様23.3の形式(タイムゾーン付きISO 8601)になる", () => {
  const result = toLocalIso(new Date());
  assert.match(result, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
});

test("日本標準時(UTC+9、getTimezoneOffset=-540)は+09:00になる", () => {
  const date = fakeDate({ y: 2026, mo: 8, d: 23, h: 15, mi: 35, s: 25, ms: 123, timezoneOffsetMinutes: -540 });
  assert.equal(toLocalIso(date), "2026-08-23T15:35:25.123+09:00");
});

test("UTCより遅れているタイムゾーン(例: getTimezoneOffset=300)は-05:00になる", () => {
  const date = fakeDate({ y: 2026, mo: 1, d: 2, h: 3, mi: 4, s: 5, ms: 6, timezoneOffsetMinutes: 300 });
  assert.equal(toLocalIso(date), "2026-01-02T03:04:05.006-05:00");
});

test("1桁の月・日・時・分・秒は0埋めされる", () => {
  const date = fakeDate({ y: 2026, mo: 1, d: 2, h: 3, mi: 4, s: 5, ms: 6, timezoneOffsetMinutes: 0 });
  assert.equal(toLocalIso(date), "2026-01-02T03:04:05.006+00:00");
});
