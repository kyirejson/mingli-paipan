/* 六爻艮卦纳甲、指定动爻去重与午夜换日口径修正。 */
(function (global) {
  'use strict';
  var engine = global.FiveArtsEngine;
  if (!engine) throw new Error('FiveArtsEngine must load first');
  // 艮为阳卦，地支顺行：初至上为辰午申、戌子寅。
  // NAJIA 是六爻装卦所用的共享表，修正后本卦、变卦和伏神均使用同一套表。
  engine.NAJIA['艮'][0][1] = '辰午申';
  engine.NAJIA['艮'][1][1] = '戌子寅';
  ['liuyao', 'meihua'].forEach(function (type) {
    var calculate = engine[type];
    engine[type] = function () {
      var args = Array.prototype.slice.call(arguments), options = args[1];
      if (options && options.method === 'specified' && Array.isArray(options.moving)) {
        args[1] = Object.assign({}, options, { moving: Array.from(new Set(options.moving.map(Number))) });
      }
      var result = calculate.apply(this, args);
      return result;
    };
  });
})(window);
