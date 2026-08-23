#!/usr/bin/env python3
"""開発用の代替音(サイン波)を生成する一時的なスクリプト。

フェーズ2の時点でプロジェクト内に正式なピアノ音源WAVがまだないため、
練習3問(D2, F4, A#6)だけ、動作確認用の代替音をこのスクリプトで生成する。
参照用デモに含まれる音源はコピーしていない(新規生成)。

正式WAVが揃ったら public/sounds/ 内の該当ファイルを正式WAVに差し替え、
このスクリプトは不要になる(削除してよい)。

Python標準ライブラリのみを使用し、追加のインストールは不要。
"""
import math
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 44100
DURATION_SECONDS = 2.0
FADE_SECONDS = 0.03
AMPLITUDE = 0.2  # 音量は控えめにする(0.0〜1.0)

NOTE_INDEX = {
    "C": 0, "Cis": 1, "D": 2, "Dis": 3, "E": 4, "F": 5,
    "Fis": 6, "G": 7, "Gis": 8, "A": 9, "Ais": 10, "H": 11,
}

PRACTICE_NOTES = ["D2", "F4", "Ais6"]

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "sounds"


def frequency_for(german_note):
    name = "".join(ch for ch in german_note if not ch.isdigit())
    octave = int("".join(ch for ch in german_note if ch.isdigit()))
    absolute_index = octave * 12 + NOTE_INDEX[name]
    semitones_from_a4 = absolute_index - (4 * 12 + 9)  # A4を基準(440Hz)
    return 440.0 * (2.0 ** (semitones_from_a4 / 12.0))


def generate_wav(path, frequency):
    total_samples = int(SAMPLE_RATE * DURATION_SECONDS)
    fade_samples = int(SAMPLE_RATE * FADE_SECONDS)
    frames = bytearray()
    for i in range(total_samples):
        t = i / SAMPLE_RATE
        value = math.sin(2 * math.pi * frequency * t)
        if i < fade_samples:
            value *= i / fade_samples
        elif i > total_samples - fade_samples:
            value *= (total_samples - i) / fade_samples
        sample = int(value * AMPLITUDE * 32767)
        frames += struct.pack("<h", sample)

    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        wav_file.writeframes(bytes(frames))


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for german_note in PRACTICE_NOTES:
        frequency = frequency_for(german_note)
        path = OUTPUT_DIR / f"{german_note}.wav"
        generate_wav(path, frequency)
        print(f"generated {path} ({frequency:.2f} Hz)")


if __name__ == "__main__":
    main()
