<?php
declare(strict_types=1);

// テスト種別ごとに異なる処理(受け付けるJSONの検証、回答詳細CSVの列と行の組み立て、
// セッション履歴の集計)をまとめたインターフェース。
interface TestTypeProfile
{
    // 回答詳細CSVのファイル名の先頭に付ける識別子(例: AP_P00001_20260919100000.csv の"AP")。
    public function filePrefix(): string;

    public function responseDetailHeaders(): array;

    public function sessionHistoryHeaders(): array;

    // 受信したセッションJSONの検証。異常があれば理由の配列を返す(空配列なら正常)。
    public function validateSessionPayload(array $session): array;

    // 受信したセッションJSON(1セッション分)を、回答詳細CSVの行(連想配列)の配列に変換する。
    // 回答が0件のセッションでも、セッションの情報が失われないよう最低1行は返す。
    public function sessionToResponseDetailRows(string $participantId, array $session): array;

    // 1セッション分の回答詳細CSVの行(全て文字列)から、一覧・セッション履歴に使う集計値を求める。
    // 共通キー: sessionId, testType, sessionStatus, startedAt, endedAt, correctCount, questionsPresented。
    public function summarizeSessionRows(array $rows): array;

    public function buildSessionHistoryRow(array $summary): array;
}
