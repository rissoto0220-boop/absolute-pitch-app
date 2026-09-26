# セッション登録API 仕様書 (API1: session_create.php)

対象: 電通大TonalSenseTrainer クライアントアプリ担当者向け

このAPIは、クライアントアプリが1セット分のテスト(絶対音感60問/相対音感の簡易版12問・完全版44問)の**完了**または**途中離脱の確定**を検知した時点で、そのセッション1件分の回答詳細データをサーバへ送信し、CSVファイルとして保存するためのものです。

---

## 1. エンドポイント

```
POST https://uec-tst.koto.jp/api/session_create.php?testType={testType}&participantId={participantId}
```

| 項目 | 内容 |
|---|---|
| メソッド | `POST`(それ以外は`405 Method Not Allowed`) |
| 認証 | なし |
| Content-Type(リクエスト) | `application/json` |
| Content-Type(レスポンス) | `application/json; charset=utf-8` |

### クエリパラメータ

| 名前 | 必須 | 形式 | 説明 |
|---|---|---|---|
| `testType` | ○ | 許可リストに含まれる文字列 | `absolute_pitch`(絶対音感)/ `relative_pitch`(相対音感)。未知の値は`400`エラー |
| `participantId` | ○ | `^P\d{5}$`(例: `P00001`) | 形式が合わない場合`400`エラー |

---

## 2. リクエストボディ

**1セッション分のオブジェクト**をそのまま送信します。クライアントがlocalStorageに保存しているセッションオブジェクト(`sessions[]`配列の1要素)と同じ形式です。テスト種別によって形式が異なります(2.1: 絶対音感、2.2: 相対音感)。

### 2.1 絶対音感(`testType=absolute_pitch`)

```jsonc
{
  "sessionId": "3f2504e0-4f89-4f9d-9a7f-2f1e6b6a2b11",  // UUID形式必須
  "testType": "absolute_pitch",                          // クエリのtestTypeと一致必須
  "startedAt": "2026-09-17T10:00:00+09:00",
  "endedAt": "2026-09-17T10:05:23+09:00",                 // 必須・空文字不可
  "sessionStatus": "completed",                           // "completed" | "forced_termination" | "interrupted"
  "sequenceStartPosition": 12,
  "sequenceStartNumber": 13,
  "sequenceDirection": "forward",
  "responses": [
    {
      "phase": "practice",                                // "practice" | "test"
      "questionNumber": 1,
      "stimulusNumber": 3,
      "stimulusNote": "D2",
      "stimulusFilename": "D2.wav",
      "stimulusStartedAt": "2026-09-17T10:00:00+09:00",
      "correctResponse": "D",
      "responseNote": "D",
      "responseAt": "2026-09-17T10:00:01+09:00",
      "responseTimeMs": 812,
      "outcome": "correct",                               // "correct" | "incorrect" | "timeout" | "interrupted"
      "incorrectTotalAfterQuestion": 0
    }
  ]
}
```

### フィールド仕様

#### セッション直下

| フィールド | 必須 | 補足 |
|---|---|---|
| `sessionId` | ○ | UUID形式(`^[0-9a-fA-F-]{36}$`)。**同じ`sessionId`は同一セッションの再送とみなされる**(3節参照) |
| `testType` | ○ | クエリの`testType`と完全一致していないと`400` |
| `startedAt` | ○ | 空文字不可。`yyyy-MM-ddTHH:mm:ss`で始まるISO 8601形式であること(例: `2026-09-19T10:00:00+09:00`)。ここから日付を切り出して保存先フォルダ名に、日時を回答詳細CSVのファイル名に使う(3節参照)。**タイムゾーンの変換はせず、文字列中のローカル日時をそのまま使う** |
| `endedAt` | ○ | 空文字不可。**localStorageの仕様上、`sessionStatus`が確定するまで空文字なので、確定後に送信すること** |
| `sessionStatus` | ○ | `completed` / `forced_termination` / `interrupted` のいずれか |
| `sequenceStartPosition` / `sequenceStartNumber` / `sequenceDirection` | 任意 | 未指定でもエラーにはならない |
| `currentQuestion` | 送信不要 | 送られてきても無視される。確定前の進行中データは含めないこと |
| `responses` | ○ | 配列(空配列も可) |

#### `responses[]`の各要素

| フィールド | 必須 | 補足 |
|---|---|---|
| `phase` | ○ | `practice` または `test` のみ有効 |
| `questionNumber` | ○ | |
| `stimulusNumber` | ○ | |
| `stimulusNote` | ○ | |
| `stimulusFilename` | ○ | |
| `stimulusStartedAt` | ○ | |
| `correctResponse` | ○ | |
| `outcome` | ○ | `correct` / `incorrect` / `timeout` / `interrupted` のみ有効 |
| `responseNote` / `responseAt` / `responseTimeMs` | 任意 | 未回答(`timeout`/`interrupted`)の場合は空文字でよい |
| `incorrectTotalAfterQuestion` | 任意 | `practice`行では空文字でよい |


### 2.2 相対音感(`testType=relative_pitch`)

localStorageキー`relative-pitch:{participantId}`の`sessions[]`の1要素(`src/relative-pitch/session-store.js`の`startSession`が作るオブジェクト)をそのまま送信します。

```jsonc
{
  "sessionId": "0b8f6c1e-2d3a-4e5f-8a7b-9c0d1e2f3a4b",   // UUID形式必須
  "testType": "relative_pitch",                            // クエリのtestTypeと一致必須
  "testVersion": "simplified",                             // "simplified"(簡易版) | "full"(完全版)
  "startedAt": "2026-09-19T10:00:00+09:00",
  "endedAt": "2026-09-19T10:05:00+09:00",                  // 必須・空文字不可
  "sessionStatus": "completed",                            // "completed" | "interrupted"(強制終了はない)
  "answerLayout": "circular",                              // "circular" | "spiral" | "dual_ring" など(空文字可)
  "practiceStatus": "completed",                           // "completed" | "skipped" | "interrupted" | null
  "generatedQuestionOrder": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13],  // 本番の出題順(半音差)。件数=本番の総問題数
  "responses": [
    {
      "phase": "test",                                     // "practice" | "test"
      "questionNumber": 1,
      "keyCode": "C",
      "keyBlockNumber": 1,                                 // 練習は""
      "cadenceFilename": "cadence_C.wav",
      "referenceNote": "C4",
      "targetNote": "E4",
      "intervalSemitones": 4,
      "syllableCode": "MiM",
      "displayLabel": "ミ",
      "intervalLabel": "short",                            // null可
      "scaleLabel": "in",                                  // null可
      "cadenceStartedAt": "2026-09-19T10:00:00+09:00",
      "referenceStartedAt": "2026-09-19T10:00:03+09:00",   // 中断のタイミングによっては""
      "targetStartedAt": "2026-09-19T10:00:04+09:00",      // 中断のタイミングによっては""
      "responseCode": 4,                                   // 回答した半音差。未回答は""
      "responseAt": "2026-09-19T10:00:06+09:00",
      "responseTimeMs": 1200,
      "outcome": "correct"                                 // "correct" | "incorrect" | "interrupted"(timeoutはない)
    }
  ]
}
```

| フィールド | 必須 | 補足 |
|---|---|---|
| `sessionId` / `testType` / `startedAt` / `endedAt` / `sessionStatus` / `responses` | ○ | 絶対音感と同じ規則(`sessionStatus`は`completed`/`interrupted`のみ) |
| `testVersion` | ○ | `simplified` または `full` |
| `answerLayout` | ○ | 英小文字と`_`のみ・32文字以内(空文字可) |
| `practiceStatus` | ○ | キーは必須。値は`null`可 |
| `generatedQuestionOrder` | ○ | 配列。**要素数がサーバ側で「本番の総問題数」(正答率の分母)になる**。本番開始前に中断した場合は`[]`でよい |
| `responses[]` | ○ | 配列(空配列も可) |
| `responses[].phase` / `questionNumber` / `keyCode` / `cadenceFilename` / `referenceNote` / `targetNote` / `intervalSemitones` / `syllableCode` / `displayLabel` / `outcome` | ○ | キーが無いと`400` |
| `responses[]`のその他(`keyBlockNumber`、`intervalLabel`、`scaleLabel`、`*StartedAt`、`responseCode`/`responseAt`/`responseTimeMs`) | 任意 | 無い場合は空欄として扱う |
| `currentQuestion` | 送信不要 | 送られても無視される。確定前の進行中データは含めないこと |

サーバ側では、`generatedQuestionOrder`の件数・`practiceStatus`・`startedAt`/`endedAt`を回答詳細CSVに列として保持し、セッション履歴(正答率など)を回答詳細CSVだけから再構築します。クライアントで別途計算した値を送る必要はありません。

---

## 3. 保存先・ファイル名と再送

### 保存先とファイル名

回答詳細CSVは、1セッション=1ファイルで次の場所に保存されます。

```
data/{testType}/{participantId}/{yyyyMMdd}/{AP|RP}_{participantId}_{yyyyMMddHHmmss}.csv
```

| テスト種別 | ファイル名の例 |
|---|---|
| 絶対音感 | `AP_P00001_20260919100000.csv` |
| 相対音感 | `RP_P00001_20260919100000.csv` |

日時部分(`yyyyMMddHHmmss`、24時間表記)は`startedAt`の日時で、タイムゾーンの変換はしません(`2026-09-19T15:45:30+09:00`なら`20260919154530`)。同じ参加者のファイル名を並べると、セッションの実行順を確認できます。

`sessionId`はファイル名に含まれません(ファイルの中身の`session_id`列に入ります)。成功時のレスポンスに保存したファイル名(`filename`)が入ります。

### 再送について

ネットワーク不調等でクライアントが送信結果を確認できなかった場合に備え、**同じセッションを何度再送しても安全**な設計になっています。同じ参加者・同じ`startedAt`のファイルが既にある場合、`sessionId`を照合して判定します。

| 状況 | レスポンス |
|---|---|
| 初めて送信するセッション | `201 Created`(新規にCSVファイルを作成) |
| 既に保存済みのセッションを再送(同じ`sessionId`) | `200 OK`(何もせず、既存ファイルはそのまま) |
| 同じ参加者・同じ`startedAt`で、別の`sessionId`が既に保存されている | `409 Conflict`(上書きしない) |

クライアント側では、送信が成功したかどうかを`sessionId`単位で管理し、**`200`か`201`が返ってきたら成功として扱ってください**(どちらでも同じ意味です)。`409`は、同じ参加者が同じ秒に2つのセッションを開始した場合などにしか起こらない想定外の状態です。再送しても解消しないため、記録して担当者へ連絡してください。通信エラー・5xxの場合は再送してください。

---

## 4. レスポンス

### 成功

```json
// 201 Created または 200 OK
{
  "sessionId": "3f2504e0-4f89-4f9d-9a7f-2f1e6b6a2b11",
  "testType": "absolute_pitch",
  "participantId": "P00001",
  "date": "20260917",
  "filename": "AP_P00001_20260917100000.csv"
}
```

### エラー

| ステータス | 原因の例 | レスポンス例 |
|---|---|---|
| 400 | `testType`が不正・未知 | `{"error": "invalid or unknown testType"}` |
| 400 | `participantId`の形式不正 | `{"error": "invalid participantId"}` |
| 400 | リクエストボディがJSONオブジェクトでない | `{"error": "request body must be a JSON object"}` |
| 400 | クエリとボディの`testType`不一致 | `{"error": "testType in query and body do not match"}` |
| 400 | 必須フィールド欠落・形式不正など(テスト種別ごとの検証。`startedAt`がISO 8601形式でない場合、`responses[]`の値に配列・オブジェクトが含まれる場合も) | `{"error": "validation failed", "details": ["missing field: endedAt", "responses[2].outcome is invalid"]}` |
| 405 | `POST`以外のメソッド | `{"error": "method not allowed"}` |
| 409 | 同じ参加者・同じ`startedAt`で、別の`sessionId`が既に保存されている(3節) | `{"error": "a different session with the same participantId and startedAt already exists"}` |
| 500 | サーバ側の保存失敗 | `{"error": "failed to create storage directory"}` 等 |

---

## 5. 呼び出しタイミング

既存クライアントの実装(`session-store.js`)に沿うと、以下の2箇所が送信トリガーになります。

1. **60問完了 または 誤答+タイムアウト13件で強制終了したとき**
   `finalizeSession(session, "completed" | "forced_termination")`が呼ばれ、`sessionStatus`と`endedAt`が確定した直後
2. **前回セッションが未完了のまま放置されていたとき(途中離脱の確定)**
   次回同じ参加者でセッションを開始した際、`reconcileDanglingSessions`が`sessionStatus = "interrupted"`を確定させた直後

いずれも「`sessionStatus`が`null`から値を持った直後」という点で共通しています。相対音感も同様で、`finalizeSession(session, "completed" | "interrupted")`の直後と、次回`startSession`内で`reconcileDanglingSessions`が`interrupted`を確定した直後が送信タイミングです(絶対音感・相対音感とも、音声再生失敗時に`finalizeSession(session, "interrupted")`を直接呼ぶ箇所も同様)。**`currentQuestion`が`null`でない(＝まだ回答/タイムアウトが確定していない)状態のセッションは送信しないでください。**

---

## 6. リクエスト例(curl)

```bash
curl -X POST "https://uec-tst.koto.jp/api/session_create.php?testType=absolute_pitch&participantId=P00001" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "3f2504e0-4f89-4f9d-9a7f-2f1e6b6a2b11",
    "testType": "absolute_pitch",
    "startedAt": "2026-09-17T10:00:00+09:00",
    "endedAt": "2026-09-17T10:05:23+09:00",
    "sessionStatus": "completed",
    "sequenceStartPosition": 12,
    "sequenceStartNumber": 13,
    "sequenceDirection": "forward",
    "responses": [ ... ]
  }'
```

動作確認用のブラウザツール(`https://uec-tst.koto.jp/tools/index.html`)を用意しています(ソースは`uec-tst`リポジトリの`server/tools/`)。現在、このツールに認証はありません(将来的にBasic認証を掛ける予定です)。サンプルJSON(完了/中断の2パターン、絶対音感・相対音感)を生成して実際に送信できるので、実装の参考にしてください。送信したデータは本番サーバに保存されるため、実際の参加者IDとは別の番号を使ってください。

---

## 7. 未確定事項

- 本APIは現時点で**無認証**です。将来的に認証を追加する場合は別途連携します。
- 通信は`https://uec-tst.koto.jp/`(HTTPS)です。クライアントアプリの配信元が`https://uec-tst.koto.jp/`と異なるドメインの場合は、ブラウザの制限(CORS)により、現状のAPIは呼び出せません。その場合は事前にご連絡ください(サーバ側の対応が必要です)。
- `testType`は現在`absolute_pitch`・`relative_pitch`が有効です。「調性感テスト」等が追加された際は別途通知します。
- 相対音感の回答詳細CSVは、クライアントのCSV列に加え、セッション履歴を再構築するための列(`session_started_at`、`session_ended_at`、`practice_status`、`total_questions`)をサーバ側で追加しています。
