// If the app's script or styles fail to download (weak signal, or opened during a deploy), the page stayed blank until
// refreshed. Reload it instead: at most twice, and once back online when offline.
(function () {
  var KEY = 'upt_reload';
  var failed = false;
  addEventListener('error', function (e) {
    var el = e.target;
    if (failed || !el || (el.tagName !== 'SCRIPT' && !(el.tagName === 'LINK' && el.rel === 'stylesheet'))) return;
    failed = true;
    try {
      var tries = Number(sessionStorage.getItem(KEY)) || 0;
      if (tries >= 2) return;
      var reload = function () {
        try { sessionStorage.setItem(KEY, String(tries + 1)); } catch (err) { return; }
        location.reload();
      };
      if (navigator.onLine === false) addEventListener('online', reload, { once: true });
      else setTimeout(reload, 1000 * (tries + 1));
    } catch (err) { /* no storage: no way to count, so never risk a reload loop */ }
  }, true);
  addEventListener('load', function () {
    try { if (!failed) sessionStorage.removeItem(KEY); } catch (err) { /* no storage */ }
  });
})();
