/*
 * LINEの友だち追加が、どこから来た人かを数えるための仕組み。
 *
 * LINE公式アカウントの「流入経路分析」で作った友だち追加URLを、下の2か所に貼ると、
 * LP・ヘルプの「LINE」ボタンがそのURLに置き換わる。LINE公式アカウントの管理画面で
 * 「LPから何人」「Xの投稿から何人」友だち追加したかが分かるようになる。
 *   - lp: LPを見て友だち追加した人
 *   - x : Xの投稿（t.co / x.com から来た人、または ?from=x 付きのURL）からLPに来て友だち追加した人
 * 空のままなら、今までどおりのURL（https://lin.ee/8zc0VBd）のまま。
 *
 * Cookieや外部のアクセス解析は使わない。来た経路はこのタブの中だけで覚え、
 * LP → ヘルプへ移っても同じURLを使う（タブを閉じると消える）。
 */
(function () {
  var LINE_ADD_URLS = {
    lp: "https://lin.ee/nRZlyLR",
    x: "https://lin.ee/ysRb6nm"
  };
  var DEFAULT_URL = "https://lin.ee/8zc0VBd";
  var KEY = "torudake_line_route";

  function cameFromX() {
    var p = new URLSearchParams(location.search);
    var src = (p.get("from") || p.get("utm_source") || "").toLowerCase();
    if (src === "x" || src === "twitter" || p.get("v") === "card") return true;
    try {
      var host = document.referrer ? new URL(document.referrer).hostname : "";
      return /(^|\.)(t\.co|x\.com|twitter\.com)$/i.test(host);
    } catch (e) {
      return false;
    }
  }

  var route = cameFromX() ? "x" : "";
  try {
    if (route) sessionStorage.setItem(KEY, route);
    else route = sessionStorage.getItem(KEY) || "";
  } catch (e) { /* 保存できない環境でも、そのページでは使う */ }

  var url = (route === "x" && LINE_ADD_URLS.x) || LINE_ADD_URLS.lp;
  if (!url) return;
  function apply() {
    var links = document.querySelectorAll('a[href^="' + DEFAULT_URL + '"]');
    for (var i = 0; i < links.length; i++) links[i].href = url;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  else apply();
})();
