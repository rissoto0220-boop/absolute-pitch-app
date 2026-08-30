#!/usr/bin/env python3
"""相対音感テスト用の開発用代替音(仮音源)を生成する一時的なスクリプト。

正式なピアノ音源(カデンツ・基準音)はまだ用意されておらず、条件も未確定
(仕様8.5・28.1)。フェーズ3の音声タイムライン(カデンツ→基準音→目的音)を
タイミング確認できるようにするため、サイン波の仮音源をここで生成する。
研究本番では使用できない(絶対音感の scripts/generate-placeholder-audio.py と同じ位置付け)。

生成するファイル(いずれも public/sounds/ 内。絶対音感の単音WAVと同じ1つのフォルダー):

- cadence_C.wav / cadence_Fis.wav: カデンツ(属七和音→主和音、仕様8.2〜8.4)。長さ2.0秒
- reference_C4.wav / reference_Fis4.wav: 基準音(仕様9.1・9.3)。長さ1.0秒+短いフェードアウト

目的音は絶対音感の既存WAV(public/sounds/内の単音、例: E4.wav)をそのまま使うため、
ここでは生成しない(仕様9.1)。

正式音源が揃ったら、このスクリプトで生成した4ファイルを正式WAVに差し替え、
このスクリプトは不要になる(削除してよい)。

Python標準ライブラリのみを使用し、追加のインストールは不要。
"""
import math
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 44100
AMPLITUDE = 0.15  # 複数の音を重ねるカデンツがあるため、絶対音感の単音(0.2)より控えめにする
CADENCE_CROSSFADE_SECONDS = 0.015  # 属七和音→主和音の切り替わり時のクリック音を防ぐ(仕様8.2で許容)

NOTE_INDEX = {
    "C": 0, "Cis": 1, "D": 2, "Dis": 3, "E": 4, "F": 5,
    "Fis": 6, "G": 7, "Gis": 8, "A": 9, "Ais": 10, "H": 11,
}

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "sounds"

# カデンツのボイシング(仕様8.3・8.4)。
CADENCE_VOICINGS = {
    "C": {
        "dominant": ["G3", "F4", "G4", "H4"],
        "tonic": ["C4", "E4", "G4", "C5"],
    },
    "Fis": {
        "dominant": ["Cis4", "H4", "Cis5", "F5"],
        "tonic": ["Fis4", "Ais4", "Cis5", "Fis5"],
    },
}

# 基準音(仕様9.2)。
REFERENCE_NOTES = {"C": "C4", "Fis": "Fis4"}


def frequency_for(german_note):
    name = "".join(ch for ch in german_note if not ch.isdigit())
    octave = int("".join(ch for ch in german_note if ch.isdigit()))
    absolute_index = octave * 12 + NOTE_INDEX[name]
    semitones_from_a4 = absolute_index - (4 * 12 + 9)  # A4を基準(440Hz)
    return 440.0 * (2.0 ** (semitones_from_a4 / 12.0))


def chord_value(frequencies, t):
    return sum(math.sin(2 * math.pi * f * t) for f in frequencies) / len(frequencies)


def write_wav(path, total_seconds, sampler, edge_fade_seconds):
    total_samples = int(SAMPLE_RATE * total_seconds)
    fade_samples = int(SAMPLE_RATE * edge_fade_seconds)
    frames = bytearray()
    for i in range(total_samples):
        t = i / SAMPLE_RATE
        value = sampler(t)
        if i < fade_samples:
            value *= i / fade_samples
        elif i > total_samples - fade_samples:
            value *= (total_samples - i) / fade_samples
        value = max(-1.0, min(1.0, value))
        frames += struct.pack("<h", int(value * AMPLITUDE * 32767))

    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        wav_file.writeframes(bytes(frames))


def generate_cadence(key_code):
    dominant = [frequency_for(n) for n in CADENCE_VOICINGS[key_code]["dominant"]]
    tonic = [frequency_for(n) for n in CADENCE_VOICINGS[key_code]["tonic"]]
    switch_at = 1.0  # 1.000秒に主和音へ切り替わる(仕様8.2)

    def sampler(t):
        if t < switch_at - CADENCE_CROSSFADE_SECONDS:
            return chord_value(dominant, t)
        if t > switch_at + CADENCE_CROSSFADE_SECONDS:
            return chord_value(tonic, t)
        # 属七和音→主和音のクロスフェード区間。
        ratio = (t - (switch_at - CADENCE_CROSSFADE_SECONDS)) / (2 * CADENCE_CROSSFADE_SECONDS)
        return chord_value(dominant, t) * (1 - ratio) + chord_value(tonic, t) * ratio

    path = OUTPUT_DIR / f"cadence_{key_code}.wav"
    write_wav(path, total_seconds=2.0, sampler=sampler, edge_fade_seconds=0.02)
    print(f"generated {path}")


def generate_reference(key_code):
    note = REFERENCE_NOTES[key_code]
    freq = frequency_for(note)

    def sampler(t):
        return math.sin(2 * math.pi * freq * t)

    path = OUTPUT_DIR / f"reference_{note}.wav"
    # フェード時間(10/15/20ms)は仕様28.1 #7で未確定のため、暫定値として15msを使う。
    write_wav(path, total_seconds=1.0, sampler=sampler, edge_fade_seconds=0.015)
    print(f"generated {path} ({freq:.2f} Hz)")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for key_code in ["C", "Fis"]:
        generate_cadence(key_code)
        generate_reference(key_code)
    print("done: 4 files")


if __name__ == "__main__":
    main()
