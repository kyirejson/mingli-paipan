(function () {
  'use strict';
  // Resolve the chart code while the home page is idle. No chart is mounted,
  // calculated or saved until the user actually starts one.
  var attempts = 0;
  function prepare() {
    var app = document.getElementById('app');
    var router = app && app.__vue__ && app.__vue__.$router;
    if (!router || !router.currentRoute || !router.currentRoute.name) {
      if (++attempts < 40) setTimeout(prepare, 250);
      return;
    }
    var scheduled = false, completed = false, unsubscribe;
    function schedule() {
      if (scheduled || completed || router.currentRoute.name !== 'WZIndex') return;
      scheduled = true;
      if (window.requestIdleCallback) window.requestIdleCallback(load, { timeout: 3000 });
      else setTimeout(load, 1000);
    }
    function load() {
      scheduled = false;
      if (router.currentRoute.name !== 'WZIndex') return;
      var route = router.resolve({ name: 'PaiPan' }).route;
      var record = route.matched[route.matched.length - 1];
      var component = record && record.components.default;
      if (typeof component === 'function' && !component.cid) {
        try { Promise.resolve(component()).then(function () { completed = true; if (unsubscribe) unsubscribe(); }).catch(function () {}); }
        catch (error) { /* Normal navigation can retry a failed local load. */ }
      }
    }
    if (typeof router.afterEach === 'function') unsubscribe = router.afterEach(schedule);
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prepare, { once: true });
  else prepare();
})();
