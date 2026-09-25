# ダウンロードページ 取扱説明書

## 1. 概要

ダウンロードページ(`server/download/index.html`)は、クライアントアプリからサーバへ送信された回答データを、研究者が確認・ダウンロードするためのページです。次の2種類のファイルを取得できます。

| ファイル | 内容 | 作り方 |
|---|---|---|
| 回答詳細CSVのzip(`results_yyyyMMdd.zip`) | 絞り込んだセッションの回答詳細CSV(1セッション=1ファイル、1回答=1行)をまとめたもの | サーバに保存されているファイルを、ダウンロードのたびにzipにまとめる |
| セッション履歴CSV(`AP_sessions_yyyyMMdd.csv` / `RP_sessions_yyyyMMdd.csv`) | テスト種別ごとの受験履歴。1セッション=1行(正答数・正答率など) | 保存済みの回答詳細CSVから、ダウンロードのたびに集計して生成 |

対象のテスト種別は、絶対音感と相対音感です。ファイル名の日付(`yyyyMMdd`)は、ダウンロードした日(日本時間)です。同じ日に何度もダウンロードすると、ブラウザが`(1)`などを付けて保存します。

## 2. 開き方

| 環境 | URL |
|---|---|
| 本番 | `https://uec-tst.koto.jp/download/index.html` |

**現在、このページに認証はありません。** URLを知っていれば、誰でも開けて、全参加者のデータをダウンロードできます。URLを関係者以外に共有しないでください。**将来的にBasic認証(ユーザー名・パスワード)を掛ける予定**です。認証を導入した際は、ページを開くときにBasic認証のダイアログが表示されるようになります。

## 3. 回答詳細CSVファイル一覧と一括ダウンロード

ページ上部の一覧で保存済みのセッションを絞り込んで確認し、絞り込んだ回答詳細CSVを「一括ダウンロード」でzipにまとめて取得します。ページを開いた直後は、全件が新しい順に表示されます。一覧には個別のダウンロードボタンはありません。

### 絞り込み

| 項目 | 説明 |
|---|---|
| テスト種別 | `(すべて)`/絶対音感/相対音感 |
| 参加者ID | `P`+5桁の数字(例: `P00001`)。空欄(表示は「すべて」)なら全員 |
| 開始日 | `YYYYMMDD`形式(例: `20260101`)。この日以降のセッション。空欄(表示は「指定なし」)なら制限なし |
| 終了日 | `YYYYMMDD`形式(例: `20261231`)。この日以前のセッション。空欄(表示は「指定なし」)なら制限なし |

条件を入れて「一覧を取得」を押すと、一覧が更新されます。日付は、セッションの開始日(保存先フォルダの日付)で判定します。

### 一覧の列

| 列 | 内容 |
|---|---|
| テスト種別 | 絶対音感/相対音感 |
| 参加者ID | |
| 版 | 相対音感のみ。簡易版/完全版(絶対音感は`-`) |
| 開始日時 | セッションの開始日時 |
| 状態 | 完了/強制終了(絶対音感のみ)/中断 |
| 正答数 | `正解数 / 分母`。分母は、絶対音感では実際に提示された問題数、相対音感では本番の総問題数(簡易版12・完全版44) |
| 正答率 | 相対音感の**完了**セッションのみ表示(小数第1位まで)。それ以外は`-` |

### 一括ダウンロード

「一覧を取得」の右隣の「一括ダウンロード」を押すと、**一覧に表示されているセッションの回答詳細CSVだけ**をzipにまとめて保存します。ファイル名は`results_yyyyMMdd.zip`です。

- zipの中は、テスト種別のフォルダから始まる、サーバ上と同じフォルダ構造になります。

```
absolute_pitch/P00001/20260919/AP_P00001_20260919100000.csv
absolute_pitch/P00002/20260920/AP_P00002_20260920093000.csv
relative_pitch/P00001/20260919/RP_P00001_20260919110000.csv
```

- 対象は、**最後に「一覧を取得」したときの絞り込み条件**です。入力欄を書き換えただけでは変わらないので、条件を変えたら「一覧を取得」を押し直してください(画面の一覧とzipの中身が一致します)。
- 一覧が0件のときは、ボタンを押せません。
- 失敗した場合は、ボタンの下に理由が表示されます。

## 4. セッション履歴CSVダウンロード

ページ下部で、テスト種別ごとの受験履歴をCSVにまとめてダウンロードします。

1. テスト種別(絶対音感/相対音感)を選ぶ。
2. 参加者IDを入力する(`P`+5桁の数字)。空欄(表示は「すべて」)なら、全参加者を含めます。
3. 「中断セッションを含める」を確認する。初期状態でチェックが入っています。中断を除きたいときは、外します。
4. 「セッション履歴CSVをダウンロード」を押す。

- ファイル名は、絶対音感が`AP_sessions_yyyyMMdd.csv`、相対音感が`RP_sessions_yyyyMMdd.csv`です。
- 全参加者を対象にした場合、行は参加者ID順、同じ参加者の中では開始日時の古い順に並びます。
- テスト種別ごとに列が異なるため、絶対音感と相対音感は別々のファイルです(まとめて1つにはできません)。
- 参加者IDの形式が不正な場合は、ダウンロードされずに、ボタンの下に理由が表示されます。
- 該当するセッションが無い場合は、ヘッダ行だけのCSVになります。

## 5. CSVの列

### 回答詳細CSV(絶対音感)

| 列 | 内容 |
|---|---|
| participant_id / session_id / test_type | 参加者ID / セッションID / テスト種別 |
| phase | `practice`(練習)/`test`(本番) |
| session_status | `completed` / `forced_termination` / `interrupted` |
| session_started_at / session_ended_at | セッションの開始・終了日時 |
| question_number | 問題番号(練習・本番それぞれの通し番号) |
| stimulus_number / stimulus_note / stimulus_filename | 出題した音の番号 / 音名 / 音源ファイル名 |
| stimulus_started_at | 音の再生開始日時 |
| correct_response / response_note | 正解 / 回答(未回答は空欄) |
| response_at / response_time_ms | 回答日時 / 反応時間(ミリ秒。未回答は空欄) |
| outcome | `correct` / `incorrect` / `timeout` / `interrupted` |
| incorrect_total_after_question | その問題までの誤答+タイムアウトの累計(本番のみ) |
| sequence_start_position / sequence_start_number / sequence_direction | 出題順の開始位置 / 開始音番号 / 方向(本番のみ) |

### 回答詳細CSV(相対音感)

| 列 | 内容 |
|---|---|
| participant_id / session_id / test_type | 参加者ID / セッションID / テスト種別 |
| test_version | `simplified`(簡易版)/`full`(完全版) |
| phase | `practice`(練習)/`test`(本番) |
| session_status | `completed` / `interrupted` |
| answer_layout | 回答ボタンの配置(`circular` / `spiral` / `dual_ring`) |
| session_started_at / session_ended_at | セッションの開始・終了日時 |
| practice_status | 練習の状態(`completed` / `skipped` / `interrupted`。未確定は空欄) |
| total_questions | 本番の総問題数(簡易版12・完全版44。本番開始前の中断は0) |
| question_number / key_block_number | 問題番号 / キーのブロック番号(練習は空欄) |
| key_code / cadence_filename | キー(C / Es / Fis / A) / カデンツ音源ファイル名 |
| reference_note / target_note | 基準音 / 目的音 |
| interval_semitones / syllable_code / display_label | 正解の半音差 / 階名コード / 階名の表示文字 |
| interval_label / scale_label | 属性ペア分類(音程の大きさ / スケール内外) |
| cadence_started_at / reference_started_at / target_started_at | カデンツ / 基準音 / 目的音の再生開始日時(中断のタイミングによっては空欄) |
| response_code / response_at / response_time_ms | 回答した半音差 / 回答日時 / 反応時間(未回答は空欄) |
| outcome | `correct` / `incorrect` / `interrupted` |

`session_started_at`・`session_ended_at`・`practice_status`・`total_questions`は、クライアントの回答詳細CSVには無い、サーバ側で追加した列です(セッション履歴を作るために必要です)。

### セッション履歴CSV(絶対音感)

`participant_id`, `session_id`, `test_type`, `started_at`, `ended_at`, `session_status`, `practice_questions_presented`(練習の提示数), `practice_timeout_count`(練習のタイムアウト数), `questions_presented`(本番の提示数), `correct_count`(正解数), `incorrect_answer_count`(誤答数), `timeout_count`(タイムアウト数), `total_incorrect_count`(誤答+タイムアウト), `unpresented_count`(未提示数=60-提示数), `sequence_start_position`, `sequence_start_number`, `sequence_direction`, `interrupted_phase`, `interrupted_question_number`(中断時に進行していた問題の`phase`と問題番号)

### セッション履歴CSV(相対音感)

`participant_id`, `session_id`, `test_type`, `test_version`, `started_at`, `ended_at`, `session_status`, `answer_layout`, `practice_status`, `practice_questions_presented`, `questions_presented`(本番の提示数), `questions_answered`(回答済み数), `correct_count`, `incorrect_count`, `accuracy`(正答率。完了セッションのみ。中断は空欄), `interrupted_phase`, `interrupted_question_number`

## 6. データの見方の注意

- 回答が1件も記録されないまま終了・中断したセッションは、回答詳細CSVに**セッション情報だけの1行**(`phase`や`outcome`が空欄)が入ります。一覧・履歴には、正解0・提示0のセッションとして表示されます。
- 中断セッションは、クライアント側で「次回同じ参加者がテストを始めたとき」に初めて中断と確定されます。離脱してそのまま再開されていない場合、そのセッションはまだサーバへ届いていません。
- 回答詳細CSVのファイル名は`AP_`/`RP_`+参加者ID+開始日時の形式です。この命名規則に合わないファイル(旧形式の`{sessionId}.csv`など)は、一覧に表示されず、一括ダウンロードのzipにも入りません。
- CSVをExcelなどで開くと、`=`・`+`・`-`・`@`で始まる文字列が数式として解釈される場合があります。参加者が入力できる値ではありませんが、見慣れない値がある場合は数式を実行しないようご注意ください。
- 文字化けする場合は、CSVをUTF-8として読み込んでください。

## 7. 困ったとき

| 症状 | 原因と対処 |
|---|---|
| 「一括ダウンロード」を押せない | 一覧が0件か、絞り込み条件のエラーです。条件を変えて「一覧を取得」を押し直してください |
| 一括ダウンロードで「PHP zip extension is not available」と出る | サーバのPHPで`zip`拡張が無効です。サーバ管理者に、有効化を依頼してください(`php -m`に`zip`が出ること) |
| 一覧が空 | 条件(種別・参加者ID・日付)を外して再検索してください。データが未送信の可能性もあります。`data/`配下に手で置いたファイルが、命名規則に合っていない可能性もあります(6節) |
| 「通信エラー」と表示される | インターネットへの接続を確認してください。接続できている場合は、サーバの障害の可能性があるため、サーバ管理者に連絡してください |
| 一覧の表示が古い | 「一覧を取得」を押し直してください。それでも変わらなければ`Cmd + Shift + R`で再読み込みしてください |

## 8. 関連ドキュメント

- [session-create-api.md](session-create-api.md) — クライアントからの送信(API1)の仕様
- [test-tool-manual.md](test-tool-manual.md) — 動作確認ツールの取扱説明書
