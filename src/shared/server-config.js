// テスト結果の送信先サーバーの設定(server/docs/session-create-api.md)。
// 配信元が変わっても、送信先URLの変更はここ1か所で済むようにしておく。

// 本番サーバーはリポジトリを丸ごと配置しているため、APIは /server/api/ にある
// (server/docs/session-create-api.md の記載どおり)。
export const SESSION_CREATE_ENDPOINT = "https://uec-tst.koto.jp/server/api/session_create.php";

// 手元でアプリとサーバー(server/)を同じ php -S で配信して確認するときの送信先(同一オリジンの相対パス)。
// 保存先は手元の server/data/ になり、本番サーバーには送られない。
export const LOCAL_SESSION_CREATE_ENDPOINT = "/server/api/session_create.php";

// 開発中(ローカルサーバーやLAN内のスマホ確認)の検証データが本番サーバーに混ざらないよう、
// これらのホストでは既定で送信しない。URLに ?upload=local を付けると手元のサーバーへ、
// ?upload=1 を付けると本番サーバーへ送る。
function isDevelopmentHost(hostname) {
  return (
    hostname === ""
    || hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "[::1]"
    || hostname.endsWith(".local")
    || /^10\./.test(hostname)
    || /^192\.168\./.test(hostname)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

// 送信先URLを返す。送信しない場合はnull。
// location: window.location相当({ hostname, search })。
export function resolveSessionEndpoint(location) {
  if (!location) return null;
  const uploadParam = new URLSearchParams(location.search).get("upload");
  if (uploadParam === "local") return LOCAL_SESSION_CREATE_ENDPOINT;
  if (uploadParam === "1" || !isDevelopmentHost(location.hostname)) return SESSION_CREATE_ENDPOINT;
  return null;
}

export function isUploadEnabled(location) {
  return resolveSessionEndpoint(location) !== null;
}
