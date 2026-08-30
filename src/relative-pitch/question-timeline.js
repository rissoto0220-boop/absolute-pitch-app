// 相対音感テスト1問分の音声タイムライン(仕様 relative-pitch-test-spec.md §7・§16)。
//
// カデンツ(0秒)・基準音(3秒)・目的音(4秒)の3つの音声を、あらかじめすべて読み込み・デコードした
// うえで、AudioContext(音声専用の正確な時計)を基準にまとめて一括予約する。setTimeoutは、
// 「回答を受け付けられる状態に画面を切り替える」タイミングにだけ使い、音声そのものの再生タイミングは
// AudioContext側に任せる(仕様7.1「前の音声の再生終了イベントを待つのではなく、経過時間を基準に
// スケジュールする」・16.2)。
//
// 基準音は、専用の新規WAV(1秒+フェード込み、仕様9.1)を最後まで再生するだけで、
// 実行時に音量操作や途中停止は行わない。
import {
  loadAudioBuffer,
  scheduleAudioBuffer,
  audioContextTime,
  COLD_START_LEAD_SECONDS,
} from "../shared/audio-buffer-player.js";
import { createAnswerLock } from "../shared/answer-lock.js";
import { cadenceFilenameFor, referenceFilenameFor, targetFilenameFor } from "./intervals.js";

const REFERENCE_OFFSET_SECONDS = 3;
const TARGET_OFFSET_SECONDS = 4;

// question: buildQuestion()が返す1問分の情報(keyCode, targetNote等)。
//
// options:
//   onAnswerable: 目的音の再生開始予定時刻になった時点で呼ぶ(仕様16.1: 反応時間計測の起点)。
//   onResult({ responseCode, responseTimeMs }): 回答確定時に1回だけ呼ぶ。
//   onError(error): 音声の読み込み・デコードに失敗した場合に呼ぶ(仕様22.1)。
//   setTimeoutFn: 画面切り替えのタイマー予約を外から渡せるようにする(自動テストで待たずに検証できる)。
//   loadAudioBufferFn/scheduleAudioBufferFn/audioContextTimeFn: 音声読み込み・再生予約・時計を
//     外から渡せるようにする(自動テストでは実際のAudioContextを使わない)。
export function runQuestionTimeline(question, {
  onAnswerable,
  onResult,
  onError = () => {},
  setTimeoutFn = setTimeout,
  loadAudioBufferFn = loadAudioBuffer,
  scheduleAudioBufferFn = scheduleAudioBuffer,
  audioContextTimeFn = audioContextTime,
  soundsBasePath = "public/sounds/",
} = {}) {
  const answerLock = createAnswerLock();
  let targetStartedAt = null; // AudioContext時刻(秒)。目的音の再生予定時刻。

  const cadenceSrc = `${soundsBasePath}${cadenceFilenameFor(question.keyCode)}`;
  const referenceSrc = `${soundsBasePath}${referenceFilenameFor(question.keyCode)}`;
  const targetSrc = `${soundsBasePath}${targetFilenameFor(question.targetNote)}`;

  Promise.all([
    loadAudioBufferFn(cadenceSrc),
    loadAudioBufferFn(referenceSrc),
    loadAudioBufferFn(targetSrc),
  ])
    .then(([cadenceBuffer, referenceBuffer, targetBuffer]) => {
      // 3つとも読み込み(デコード)が完了した時点のAudioContext時刻を、この問題のタイムラインの
      // 起点とする。以後はAudioContext自身の正確な時計で一括予約するため、setTimeoutの精度や
      // 音声読み込みの遅延に左右されない。
      const baseTime = audioContextTimeFn() + COLD_START_LEAD_SECONDS;
      targetStartedAt = baseTime + TARGET_OFFSET_SECONDS;

      scheduleAudioBufferFn(cadenceBuffer, baseTime);
      scheduleAudioBufferFn(referenceBuffer, baseTime + REFERENCE_OFFSET_SECONDS);
      scheduleAudioBufferFn(targetBuffer, targetStartedAt);

      // 回答受付(画面の切り替え)だけは、目的音の予定時刻に合わせたsetTimeoutで行う。
      // ここは見た目の切り替えに過ぎず、数ミリ秒のズレが起きても実害はない
      // (音声自体の再生タイミングはAudioContext側が正確に扱う)。
      const delayMs = Math.max(0, (targetStartedAt - audioContextTimeFn()) * 1000);
      setTimeoutFn(() => onAnswerable(), delayMs);
    })
    .catch((error) => onError(error));

  return {
    // 最初の1回だけ回答を受け付ける(仕様7.3: 二重回答を受け付けない)。
    submitAnswer(responseCode) {
      if (!answerLock.tryLock()) return;
      const responseTimeMs = targetStartedAt == null
        ? null
        : Math.round((audioContextTimeFn() - targetStartedAt) * 1000);
      onResult({ responseCode, responseTimeMs });
    },
  };
}
