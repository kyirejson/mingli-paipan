/* 六爻艮卦纳甲、指定动爻去重与午夜换日口径修正。 */
(function (global) {
  'use strict';
  var engine = global.FiveArtsEngine;
  if (!engine) throw new Error('FiveArtsEngine must load first');
  // 艮为阳卦，地支顺行：初至上为辰午申、戌子寅。
  // NAJIA 是六爻装卦所用的共享表，修正后本卦、变卦和伏神均使用同一套表。
  engine.NAJIA['艮'][0][1] = '辰午申';
  engine.NAJIA['艮'][1][1] = '戌子寅';
  function correctLateZi(calendar) {
    if (!calendar || calendar.solar.getHour() !== 23) return calendar;
    var dayIndex = engine.GAN.indexOf(calendar.dayGan);
    if (dayIndex < 0) throw new Error('无法确定晚子时日干');
    var hourGan = engine.GAN[(dayIndex % 5) * 2], hourGz = hourGan + '子';
    var hourXun = engine.LunarUtil.getXun(hourGz), hourVoid = engine.LunarUtil.getXunKong(hourGz);
    calendar.eight.getTime = function () { return hourGz; };
    calendar.eight.getTimeGan = function () { return hourGan; };
    calendar.eight.getTimeZhi = function () { return '子'; };
    calendar.eight.getTimeXun = function () { return hourXun; };
    calendar.eight.getTimeXunKong = function () { return hourVoid; };
    calendar.pillars[3] = hourGz;
    calendar.hourVoid = hourVoid;
    return calendar;
  }
  ['liuyao', 'meihua'].forEach(function (type) {
    var calculate = engine[type];
    engine[type] = function () {
      var args = Array.prototype.slice.call(arguments), options = args[1];
      if (options && options.method === 'specified' && Array.isArray(options.moving)) {
        args[1] = Object.assign({}, options, { moving: Array.from(new Set(options.moving.map(Number))) });
      }
      var result = calculate.apply(this, args);
      correctLateZi(result.calendar);
      return result;
    };
  });
})(window);
