// 60音の対応表(仕様書8.3〜8.4)。刺激番号1=C2 〜 60=H6(英語式でB6)。
// 出題順の生成や13件強制終了などの「本番のロジック」はフェーズ3で追加する。
export const NOTES = [
  { number: 1, germanNote: "C2", answer: "C", filename: "C2.wav" },
  { number: 2, germanNote: "Cis2", answer: "C#", filename: "Cis2.wav" },
  { number: 3, germanNote: "D2", answer: "D", filename: "D2.wav" },
  { number: 4, germanNote: "Dis2", answer: "D#", filename: "Dis2.wav" },
  { number: 5, germanNote: "E2", answer: "E", filename: "E2.wav" },
  { number: 6, germanNote: "F2", answer: "F", filename: "F2.wav" },
  { number: 7, germanNote: "Fis2", answer: "F#", filename: "Fis2.wav" },
  { number: 8, germanNote: "G2", answer: "G", filename: "G2.wav" },
  { number: 9, germanNote: "Gis2", answer: "G#", filename: "Gis2.wav" },
  { number: 10, germanNote: "A2", answer: "A", filename: "A2.wav" },
  { number: 11, germanNote: "Ais2", answer: "A#", filename: "Ais2.wav" },
  { number: 12, germanNote: "H2", answer: "B", filename: "H2.wav" },
  { number: 13, germanNote: "C3", answer: "C", filename: "C3.wav" },
  { number: 14, germanNote: "Cis3", answer: "C#", filename: "Cis3.wav" },
  { number: 15, germanNote: "D3", answer: "D", filename: "D3.wav" },
  { number: 16, germanNote: "Dis3", answer: "D#", filename: "Dis3.wav" },
  { number: 17, germanNote: "E3", answer: "E", filename: "E3.wav" },
  { number: 18, germanNote: "F3", answer: "F", filename: "F3.wav" },
  { number: 19, germanNote: "Fis3", answer: "F#", filename: "Fis3.wav" },
  { number: 20, germanNote: "G3", answer: "G", filename: "G3.wav" },
  { number: 21, germanNote: "Gis3", answer: "G#", filename: "Gis3.wav" },
  { number: 22, germanNote: "A3", answer: "A", filename: "A3.wav" },
  { number: 23, germanNote: "Ais3", answer: "A#", filename: "Ais3.wav" },
  { number: 24, germanNote: "H3", answer: "B", filename: "H3.wav" },
  { number: 25, germanNote: "C4", answer: "C", filename: "C4.wav" },
  { number: 26, germanNote: "Cis4", answer: "C#", filename: "Cis4.wav" },
  { number: 27, germanNote: "D4", answer: "D", filename: "D4.wav" },
  { number: 28, germanNote: "Dis4", answer: "D#", filename: "Dis4.wav" },
  { number: 29, germanNote: "E4", answer: "E", filename: "E4.wav" },
  { number: 30, germanNote: "F4", answer: "F", filename: "F4.wav" },
  { number: 31, germanNote: "Fis4", answer: "F#", filename: "Fis4.wav" },
  { number: 32, germanNote: "G4", answer: "G", filename: "G4.wav" },
  { number: 33, germanNote: "Gis4", answer: "G#", filename: "Gis4.wav" },
  { number: 34, germanNote: "A4", answer: "A", filename: "A4.wav" },
  { number: 35, germanNote: "Ais4", answer: "A#", filename: "Ais4.wav" },
  { number: 36, germanNote: "H4", answer: "B", filename: "H4.wav" },
  { number: 37, germanNote: "C5", answer: "C", filename: "C5.wav" },
  { number: 38, germanNote: "Cis5", answer: "C#", filename: "Cis5.wav" },
  { number: 39, germanNote: "D5", answer: "D", filename: "D5.wav" },
  { number: 40, germanNote: "Dis5", answer: "D#", filename: "Dis5.wav" },
  { number: 41, germanNote: "E5", answer: "E", filename: "E5.wav" },
  { number: 42, germanNote: "F5", answer: "F", filename: "F5.wav" },
  { number: 43, germanNote: "Fis5", answer: "F#", filename: "Fis5.wav" },
  { number: 44, germanNote: "G5", answer: "G", filename: "G5.wav" },
  { number: 45, germanNote: "Gis5", answer: "G#", filename: "Gis5.wav" },
  { number: 46, germanNote: "A5", answer: "A", filename: "A5.wav" },
  { number: 47, germanNote: "Ais5", answer: "A#", filename: "Ais5.wav" },
  { number: 48, germanNote: "H5", answer: "B", filename: "H5.wav" },
  { number: 49, germanNote: "C6", answer: "C", filename: "C6.wav" },
  { number: 50, germanNote: "Cis6", answer: "C#", filename: "Cis6.wav" },
  { number: 51, germanNote: "D6", answer: "D", filename: "D6.wav" },
  { number: 52, germanNote: "Dis6", answer: "D#", filename: "Dis6.wav" },
  { number: 53, germanNote: "E6", answer: "E", filename: "E6.wav" },
  { number: 54, germanNote: "F6", answer: "F", filename: "F6.wav" },
  { number: 55, germanNote: "Fis6", answer: "F#", filename: "Fis6.wav" },
  { number: 56, germanNote: "G6", answer: "G", filename: "G6.wav" },
  { number: 57, germanNote: "Gis6", answer: "G#", filename: "Gis6.wav" },
  { number: 58, germanNote: "A6", answer: "A", filename: "A6.wav" },
  { number: 59, germanNote: "Ais6", answer: "A#", filename: "Ais6.wav" },
  { number: 60, germanNote: "H6", answer: "B", filename: "H6.wav" },
];

export function noteByNumber(number) {
  return NOTES[number - 1];
}

// 練習は仕様9.2の通り、D2・F4・A#6をこの順で1回ずつ(刺激番号)。
export const PRACTICE_STIMULUS_NUMBERS = [3, 30, 59];

// 回答ボタンに表示する音名ラベル(仕様12.1)。円環状ボタンの並び順そのもの。
// 絶対音感固有のデータ(仕様29章)。将来の相対音感テスト等は別のラベル体系になる可能性があるため、
// 円環状ボタンの表示・排他制御の仕組み(共通処理)とは分けてここに置く。
export const ANSWERS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
