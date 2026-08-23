// 参加者ID(仕様7章)。形式は大文字P + 5桁の数字(例: P00001)。
export function normalizeParticipantId(value) {
  return value.trim().toUpperCase();
}

export function isValidParticipantId(value) {
  return /^P\d{5}$/.test(value);
}
