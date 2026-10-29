(function(global) {
  'use strict';
  var pending = Object.create(null);
  var assets = {
    quiz: { path: 'static/js/tiku-data.js', ready: function() { return !!global.__WZBZ_TILIN_ALL__; } }
  };
  function ensure(name) {
    var asset = assets[name];
    if (!asset) return Promise.reject(new Error('未知资源'));
    if (asset.ready()) return Promise.resolve();
    if (pending[name]) return pending[name];
    pending[name] = new Promise(function(resolve, reject) {
      var script = document.createElement('script'), timer;
      function finish(error) {
        clearTimeout(timer);
        script.onload = script.onerror = null;
        if (error) { delete pending[name]; script.remove(); reject(error); }
        else resolve();
      }
      script.async = true;
      script.src = new URL(asset.path, document.baseURI).href;
      script.onload = function() { finish(asset.ready() ? null : new Error('资源内容不完整')); };
      script.onerror = function() { finish(new Error('资源加载失败')); };
      timer = setTimeout(function() { finish(new Error('资源加载超时')); }, 15000);
      document.head.appendChild(script);
    });
    return pending[name];
  }
  global.WZBZAssets = Object.freeze({ ensure: ensure });
})(window);
