# 動作確認ツール 取扱説明書

## 1. 概要

動作確認ツール(`server/tools/index.html`)は、クライアントアプリ(絶対音感・相対音感テスト)がまだ接続されていない状態でも、セッション登録API(`session_create.php`)を試せるブラウザ用のツールです。

- テスト種別・参加者IDを指定し、サンプルのセッションJSONを自動生成して、APIへ送信できます。
- 生成したJSONは画面上で編集できるため、不正な値を入れてエラー応答を確認する用途にも使えます。
- 送信したデータは**実際にサーバへ保存されます**(4節参照)。

## 2. 開き方

| 環境 | URL |
|---|---|
| ローカル(MAMP) | `http://localhost:8888/uec-tst/server/tools/index.html` |

開くとBasic認証のダイアログが表示されます。ダウンロードページと同じユーザー名・パスワード(管理者から受け取ったもの)を入力してください。ダウンロードページで認証済みなら、再入力は不要です。認証後、ページには絶対音感の「完了」サンプルが入力済みの状態で表示されます。

## 3. 画面と操作

| 項目 | 説明 |
|---|---|
| testType | テスト種別。`absolute_pitch`(絶対音感)/ `relative_pitch`(相対音感) |
| testVersion | 相対音感を選んだときだけ表示。`simplified`(簡易版・本番12問)/ `full`(完全版・本番44問) |
| participantId | 参加者ID。`P`+5桁の数字(例: `P00001`)。初期値は`P00001` |
| 送信するセッションJSON | APIへ送るボディ。自由に編集できます |
| サンプルセッションを生成(完了) | 完了状態のサンプルをJSON欄に生成します |
| サンプルセッションを生成(中断) | 途中離脱で確定した状態のサンプルをJSON欄に生成します |
| API1へ送信 | JSON欄の内容をAPIへ送信し、結果を画面下部に表示します |

### 基本の手順

1. testType(相対音感なら testVersion も)を選ぶ。
2. participantId を入力する。
3. 「サンプルセッションを生成(完了)」または「(中断)」を押す。
4. 「API1へ送信」を押す。
5. 画面下部の結果(`HTTP ステータス` と応答JSON)を確認する。

testType や testVersion を切り替えると、JSON欄はその種別の「完了」サンプルに自動で作り直されます。切り替えたあとに中断サンプルが必要な場合は、改めて「(中断)」を押してください。

### 生成されるサンプルの内容

| テスト種別 | 完了 | 中断 |
|---|---|---|
| 絶対音感 | 練習3問+本番3問(正解・不正解・タイムアウトを1問ずつ)。`sessionStatus: "completed"` | 練習3問+本番1問目は正解、2問目は再生開始後に離脱(`outcome: "interrupted"`)。`sessionStatus: "interrupted"` |
| 相対音感 | 練習3問+本番全問(簡易版12問/完全版44問)。4問に1問が不正解。`sessionStatus: "completed"` | 練習3問+本番3問回答済み、4問目のカデンツ再生後に離脱。`sessionStatus: "interrupted"` |

送信するたびに`sessionId`は新しく発行されるため、「生成」を押し直さずに同じJSONを2回送ると、2回目は「同じセッションの再送」として扱われます(下表の`200`)。

## 4. 結果の見方

| 表示 | 意味 |
|---|---|
| `HTTP 201` | 新規に保存できました |
| `HTTP 200` | 同じ`sessionId`が保存済みだったため、何もせず成功として扱われました(再送) |
| `HTTP 409` | 同じ参加者・同じ`startedAt`で、別の`sessionId`のデータが既にあります(上書きはされません)。JSON内の`sessionId`と`startedAt`を変えて送るか、既存ファイルを削除してください |
| `HTTP 400` | 入力に問題があります。応答の`details`に理由が入ります(例: `missing field: endedAt`、`responses[0].outcome is invalid`) |
| `HTTP 405` | POST以外のメソッドで呼ばれました(このツールでは通常発生しません) |
| `HTTP 500` | サーバ側で保存に失敗しました |
| 「JSONの形式が不正です」 | JSON欄の内容がJSONとして読めません(カンマ・引用符の誤りなど) |
| 「通信エラー」 | サーバに接続できませんでした。MAMPのApacheが起動しているか確認してください |
| ページが`401 Unauthorized`になる | ユーザー名・パスワードを確認してください |
| ページが`500 Internal Server Error`になる | `server/tools/.htaccess`の`AuthUserFile`のパスが、実際の`.htpasswd`の場所と一致していない可能性があります |

## 5. 注意事項

- **送信したデータは実データと同じ場所に保存されます。** `server/data/{testType}/{participantId}/{YYYYMMDD}/`の下に、絶対音感は`AP_{participantId}_{yyyyMMddHHmmss}.csv`、相対音感は`RP_{participantId}_{yyyyMMddHHmmss}.csv`という名前で作られ、ダウンロードページの一覧にも表示されます。検証用には、本番の参加者IDと重ならない番号(例: `P99901`)を使ってください。
- **検証データの削除**: 不要になったら、該当する`participantId`のフォルダを削除してください(例: `server/data/absolute_pitch/P99901`。ファイル単体なら、その日付フォルダ内の`AP_P99901_....csv`)。`server/data/`配下のCSVはgitの管理対象外です。
- **認証について**: このツールはダウンロードページと同じBasic認証(`server/tools/.htaccess`、`server/download/.htpasswd`を共用)で保護されています。ただし、ツールが送信先にしているAPI(`session_create.php`)自体は、クライアントアプリが使うため認証なしです。ツールを保護しても、APIへ直接送信することはできます。
- **本番公開時**: 検証が終わったら、`server/tools/`をデプロイしないことを推奨します。デプロイする場合は、`.htaccess`の`AuthUserFile`のパスを、サーバ上の`.htpasswd`の実際の場所に合わせてください。
- 画面が古いまま動く場合はブラウザのキャッシュが原因のことがあります。`Cmd + Shift + R`(Windowsは`Ctrl + Shift + R`)で再読み込みしてください。

## 6. 関連ドキュメント

- [session-create-api.md](session-create-api.md) — 送信するJSONの仕様(API1)
- [download-page-manual.md](download-page-manual.md) — 保存されたCSVを確認・ダウンロードする方法
