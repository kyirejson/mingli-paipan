(function() {
  'use strict';

  // Retired library pages must not reopen from an older installation's reader session.
  try {
    var previousReader = JSON.parse(localStorage.getItem('wzbz_bookIframe') || 'null');
    if (previousReader && /(?:^|\/)book\/xv\d+\//i.test(String(previousReader.src || ''))) {
      localStorage.removeItem('wzbz_bookIframe');
    }
  } catch (_) {}

  // Polyfill window.injectedObject for school & ancient books
  window.injectedObject = {
    tiku_back: function(arg) {
      if (window.__WZBZ_ROUTER__) {
        window.__WZBZ_ROUTER__.back();
      } else if (window.history.length > 1) {
        window.history.back();
      }
    },
    tiku_open: function(url) {
      console.log('[NativeBridge] tiku_open:', url);
      if (url && url.indexOf('#') >= 0) {
        var hash = url.split('#')[1];
        if (window.__WZBZ_ROUTER__) {
          window.__WZBZ_ROUTER__.push(hash);
        } else {
          window.location.hash = '#' + hash;
        }
      }
    },
    tiku_popup: function(type) {
      console.log('[NativeBridge] tiku_popup bypassed:', type);
    },
    tiku_jump: function(type) {
      console.log('[NativeBridge] tiku_jump bypassed:', type);
    },
    smartbooksOpenminpaipan: function() {},
    smartbooksHeight: function() {},
    smartbooksFeedback: function() {},
    gujiJump: function() {},
    gujiBookid: function() {},
    gejuSet: function() {}
  };

  var VIP_GUID = 'wzbz-vip-888888';
  var VIP_SESSION = 'wzbz-vip-session-2099';
  var VIP_PHONE = '13800138003';
  var VIP_NAME = '八字排盘';
  var VIP_EXPIRES = '2099-12-31';

  // Protect VIP credentials from being wiped by logout/session expiration
  try {
    var origRemoveItem = localStorage.removeItem.bind(localStorage);
    localStorage.removeItem = function(k) {
      if (k === 'wzbz_viplevel' || k === 'wzbz_userguid' || k === 'wzbz_session' || k === 'wzbz_username' || k === 'wzbz_account' || k === 'wzbz_phone') {
        return;
      }
      return origRemoveItem(k);
    };
  } catch (e) {}

  // Pre-boot localStorage setup so Vuex initializes VIP 3 & clean UI synchronously
  try {
    localStorage.setItem('wzbz_pc', '');
    localStorage.setItem('wzbz_userguid', VIP_GUID);
    localStorage.setItem('wzbz_session', VIP_SESSION);
    localStorage.setItem('wzbz_username', VIP_NAME);
    localStorage.setItem('wzbz_phone', VIP_PHONE);
    localStorage.setItem('wzbz_account', VIP_PHONE);
    localStorage.setItem('wzbz_expires', VIP_EXPIRES);
    localStorage.setItem('wzbz_viplevel', '3');
    localStorage.setItem('wzbz_studyNum', '999');
    localStorage.setItem('wzbz_studyName', '易学宗师');
    localStorage.setItem('wzbz_apistr', 'bzapi3');
    localStorage.setItem('wzbz_guide_version', JSON.stringify({ ios: '1.2.3', android: '2.3.6', beta: '2.5.6' }));
    localStorage.setItem('wzbz_fenzhu_paipan_guide', 'true');
    localStorage.setItem('wzbz_fenzhu_float_guide', 'true');
    localStorage.setItem('wzbz_count_ai', '2');
    localStorage.setItem('wzbz_guide_bookSearch', '1');
    localStorage.setItem('wzbz_guide_tiku', '1');
    localStorage.setItem('newBookCount', '2');
    localStorage.setItem('tiku_guide', '-1');
    localStorage.setItem('jjrs_guide', '-1');
    localStorage.setItem('wzbz_count_jjrs', '1');
    localStorage.setItem('paipan_basepan_showtips', 'false');
    var tipsUserObj = {};
    tipsUserObj[VIP_GUID] = false;
    localStorage.setItem('paipan_basepan_showtips-user', JSON.stringify(tipsUserObj));
    if (!localStorage.getItem('wzbz_preferenceIsShow')) {
      localStorage.setItem('wzbz_preferenceIsShow', JSON.stringify({
        nightMode: 1,
        zhengtiActive: false,
        sizhuActive: false,
        liunianActive: false,
        sizhuyanse: true,
        cangganyanse: true,
        yangzhegnyinxie: false,
        zhijiexipan: false,
        '120dayun': true,
        littleKnowledge: true,
        shijuezhangai: false,
        suiyunyanse: false,
        tabs: 'first',
        suirelation01: true,
        suirelation02: true,
        suirelation03: true,
        suirelation02_y: false,
        suirelation02_m: true,
        suirelation02_d: true,
        suirelation02_h: false,
        suirelation03_y: false,
        suirelation03_m: true,
        suirelation03_d: true,
        suirelation03_h: false
      }));
    }
  } catch (e) {}

  var WX_MAP = {
    '甲': '木', '乙': '木', '寅': '木', '卯': '木',
    '丙': '火', '丁': '火', '巳': '火', '午': '火',
    '戊': '土', '己': '土', '丑': '土', '辰': '土', '未': '土', '戌': '土',
    '庚': '金', '辛': '金', '申': '金', '酉': '金',
    '壬': '水', '癸': '水', '子': '水', '亥': '水'
  };
  var SHENG_NEXT = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  var KE_NEXT = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
  var TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  function localError(code, message) {
    var error = new Error(message);
    error.localCode = code;
    return error;
  }

  function requireBazi(value) {
    var chars = String(value || '').replace(/\s+/g, '').split('');
    if (chars.length !== 8 || chars.some(function(c, i) {
      return (i % 2 ? DIZHI : TIANGAN).indexOf(c) < 0;
    })) throw localError(400, '请输入完整有效的四柱八字');
    for (var i = 0; i < 8; i += 2) {
      if (TIANGAN.indexOf(chars[i]) % 2 !== DIZHI.indexOf(chars[i + 1]) % 2) {
        throw localError(400, '四柱包含无效的干支组合');
      }
    }
    return chars;
  }
  var SHISHEN_TABLE = [
    ['比肩','劫财','食神','伤官','偏财','正财','七杀','正官','偏印','正印'],
    ['劫财','比肩','伤官','食神','正财','偏财','正官','七杀','正印','偏印'],
    ['偏印','正印','比肩','劫财','食神','伤官','偏财','正财','七杀','正官'],
    ['正印','偏印','劫财','比肩','伤官','食神','正财','偏财','正官','七杀'],
    ['七杀','正官','偏印','正印','比肩','劫财','食神','伤官','偏财','正财'],
    ['正官','七杀','正印','偏印','劫财','比肩','伤官','食神','正财','偏财'],
    ['偏财','正财','七杀','正官','偏印','正印','比肩','劫财','食神','伤官'],
    ['正财','偏财','正官','七杀','正印','偏印','劫财','比肩','伤官','食神'],
    ['食神','伤官','偏财','正财','七杀','正官','偏印','正印','比肩','劫财'],
    ['伤官','食神','正财','偏财','正官','七杀','正印','偏印','劫财','比肩']
  ];

  function getShiShenLocal(gan, rizhu) {
    var rIdx = TIANGAN.indexOf(rizhu);
    var gIdx = TIANGAN.indexOf(gan);
    if (rIdx < 0 || gIdx < 0) return '';
    return SHISHEN_TABLE[rIdx][gIdx];
  }

  var CANG_GAN_WEIGHTS = {
    '子': [['癸', 1.0]],
    '丑': [['己', 0.6], ['癸', 0.3], ['辛', 0.1]],
    '寅': [['甲', 0.6], ['丙', 0.3], ['戊', 0.1]],
    '卯': [['乙', 1.0]],
    '辰': [['戊', 0.6], ['乙', 0.3], ['癸', 0.1]],
    '巳': [['丙', 0.6], ['戊', 0.3], ['庚', 0.1]],
    '午': [['丁', 0.7], ['己', 0.3]],
    '未': [['己', 0.6], ['丁', 0.3], ['乙', 0.1]],
    '申': [['庚', 0.6], ['壬', 0.3], ['戊', 0.1]],
    '酉': [['辛', 1.0]],
    '戌': [['戊', 0.6], ['辛', 0.3], ['丁', 0.1]],
    '亥': [['壬', 0.7], ['甲', 0.3]]
  };

  var SEASON_MULTIPLIER = {
    '寅': { '木': 1.35, '火': 1.15, '水': 0.9, '金': 0.75, '土': 0.65 },
    '卯': { '木': 1.4, '火': 1.15, '水': 0.9, '金': 0.7, '土': 0.65 },
    '辰': { '土': 1.3, '金': 1.15, '木': 1.0, '火': 0.85, '水': 0.8 },
    '巳': { '火': 1.35, '土': 1.15, '木': 0.9, '水': 0.75, '金': 0.7 },
    '午': { '火': 1.4, '土': 1.2, '木': 0.85, '水': 0.7, '金': 0.65 },
    '未': { '土': 1.35, '金': 1.1, '火': 1.05, '木': 0.75, '水': 0.7 },
    '申': { '金': 1.35, '水': 1.15, '土': 0.9, '火': 0.75, '木': 0.65 },
    '酉': { '金': 1.4, '水': 1.15, '土': 0.9, '火': 0.7, '木': 0.65 },
    '戌': { '土': 1.35, '金': 1.15, '火': 0.9, '水': 0.75, '木': 0.7 },
    '亥': { '水': 1.35, '木': 1.15, '金': 0.9, '土': 0.75, '火': 0.65 },
    '子': { '水': 1.4, '木': 1.15, '金': 0.9, '土': 0.7, '火': 0.65 },
    '丑': { '土': 1.3, '金': 1.15, '水': 1.0, '木': 0.75, '火': 0.7 }
  };

  function computeWXPW(bzstr) {
    var chars = requireBazi(bzstr);
    var scores = { '水': 0, '木': 0, '火': 0, '土': 0, '金': 0 };
    var stemWeights = [8, 12, 10, 10];
    var branchWeights = [10, 38, 16, 12];
    var yz = chars[3];
    var mult = SEASON_MULTIPLIER[yz] || { '木': 1, '火': 1, '土': 1, '金': 1, '水': 1 };

    [chars[0], chars[2], chars[4], chars[6]].forEach(function(g, idx) {
      var wx = WX_MAP[g];
      if (wx) scores[wx] += stemWeights[idx] * (mult[wx] || 1);
    });

    [chars[1], chars[3], chars[5], chars[7]].forEach(function(z, idx) {
      var cgList = CANG_GAN_WEIGHTS[z] || [];
      cgList.forEach(function(pair) {
        var wx = WX_MAP[pair[0]];
        if (wx) scores[wx] += branchWeights[idx] * pair[1] * (mult[wx] || 1);
      });
    });

    var total = (scores['水'] + scores['木'] + scores['火'] + scores['土'] + scores['金']) || 100;
    var norm = {
      '水': Math.max(1, Math.round((scores['水'] / total) * 100)),
      '木': Math.max(1, Math.round((scores['木'] / total) * 100)),
      '火': Math.max(1, Math.round((scores['火'] / total) * 100)),
      '土': Math.max(1, Math.round((scores['土'] / total) * 100)),
      '金': Math.max(1, Math.round((scores['金'] / total) * 100))
    };

    var rzwx = WX_MAP[chars[4]] || '木';
    var yinwx = Object.keys(SHENG_NEXT).find(function(k) { return SHENG_NEXT[k] === rzwx; }) || '水';
    var normTotal = norm['水'] + norm['木'] + norm['火'] + norm['土'] + norm['金'];
    var samePartyRatio = ((norm[rzwx] + norm[yinwx]) / normTotal) * 100;

    var label = '日元平和';
    if (samePartyRatio < 14) label = '日元极弱';
    else if (samePartyRatio < 28) label = '日元太弱';
    else if (samePartyRatio < 45) label = '日元偏弱';
    else if (samePartyRatio <= 55) label = '日元平和';
    else if (samePartyRatio <= 72) label = '日元偏旺';
    else if (samePartyRatio <= 86) label = '日元太旺';
    else label = '日元极旺';

    return {
      code: 0,
      data: label + ' [' + norm['水'] + ',' + norm['木'] + ',' + norm['火'] + ',' + norm['土'] + ',' + norm['金'] + ']'
    };
  }

  function computeGeJu(bz) {
    var chars = requireBazi(bz);
    var yangGans = { '甲': 1, '丙': 1, '戊': 1, '庚': 1, '壬': 1 };
    var yangZhis = { '子': 1, '寅': 1, '辰': 1, '午': 1, '申': 1, '戌': 1 };
    var rawYangCount = 0;
    var yyScore = 0;
    for (var i = 0; i < 8; i++) {
      var c = chars[i];
      if (i % 2 === 0) {
        if (yangGans[c]) { rawYangCount++; yyScore += 1.0; }
        else yyScore -= 1.0;
      } else {
        if (yangZhis[c]) rawYangCount++;
        if (c === '寅' || c === '申') yyScore += 1.2;
        else if (c === '辰' || c === '戌') yyScore += 0.6;
        else if (c === '巳' || c === '亥') yyScore += 0.3;
        else if (c === '子' || c === '午') yyScore -= 0.3;
        else yyScore -= 1.2;
      }
    }
    var yz = chars[3];
    if (['巳', '午', '未'].indexOf(yz) >= 0) yyScore += 1.0;
    else if (['寅', '卯', '辰'].indexOf(yz) >= 0) yyScore += 0.3;
    else if (['申', '酉', '戌'].indexOf(yz) >= 0) yyScore -= 0.3;
    else if (['亥', '子', '丑'].indexOf(yz) >= 0) yyScore -= 1.0;

    var yyText = '平和';
    if (rawYangCount === 8) yyText = '纯阳';
    else if (rawYangCount === 0) yyText = '纯阴';
    else if (yyScore >= 3.5) yyText = '太阳';
    else if (yyScore >= 1.0) yyText = '偏阳';
    else if (yyScore > -1.0) yyText = '平和';
    else if (yyScore > -3.5) yyText = '偏阴';
    else yyText = '太阴';

    var rg = chars[4];
    var outerStems = [chars[0], chars[2], chars[6]];
    var luMap = { '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳', '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子' };
    var renMap = { '甲': '卯', '丙': '午', '戊': '午', '庚': '酉', '壬': '子' };
    var patterns = [];
    var cangList = (CANG_GAN_WEIGHTS[yz] || []).map(function(x) { return x[0]; });

    for (var j = 0; j < cangList.length; j++) {
      var cg = cangList[j];
      if (outerStems.indexOf(cg) >= 0) {
        var ss = getShiShenLocal(cg, rg);
        if (ss && ss !== '比肩' && ss !== '劫财' && patterns.indexOf(ss) < 0) {
          patterns.push(ss);
        }
      }
    }
    if (luMap[rg] === yz && patterns.indexOf('建禄') < 0) patterns.push('建禄');
    else if (renMap[rg] === yz && patterns.indexOf('羊刃') < 0) patterns.push('羊刃');

    if (patterns.length === 0 && cangList.length > 0) {
      var mainSS = getShiShenLocal(cangList[0], rg);
      if (mainSS === '比肩') patterns.push('建禄');
      else if (mainSS === '劫财') patterns.push('羊刃');
      else if (mainSS) patterns.push(mainSS);
    }
    if (patterns.length === 0) patterns.push('正官');

    return {
      code: 0,
      data: yyText + ';' + patterns.slice(0, 2).join(',')
    };
  }

  function computeLiuTong(bz) {
    var chars = requireBazi(bz);
    var gans = [chars[0], chars[2], chars[4], chars[6]];
    var zhis = [chars[1], chars[3], chars[5], chars[7]];
    var stemHe = { '甲己':1,'己甲':1,'乙庚':1,'庚乙':1,'丙辛':1,'辛丙':1,'丁壬':1,'壬丁':1,'戊癸':1,'癸戊':1 };
    var stemChong = { '甲庚':1,'庚甲':1,'乙辛':1,'辛乙':1,'丙壬':1,'壬丙':1,'丁癸':1,'癸丁':1 };
    var zhiHe = { '子丑':1,'丑子':1,'寅亥':1,'亥寅':1,'卯戌':1,'戌卯':1,'辰酉':1,'酉辰':1,'巳申':1,'申巳':1,'午未':1,'未午':1 };
    var zhiChong = { '子午':1,'午子':1,'丑未':1,'未丑':1,'寅申':1,'申寅':1,'卯酉':1,'酉卯':1,'辰戌':1,'戌辰':1,'巳亥':1,'亥巳':1 };
    var zhiXing = { '寅巳':1,'巳寅':1,'巳申':1,'申巳':1,'寅申':1,'申寅':1,'丑戌':1,'戌丑':1,'戌未':1,'未戌':1,'丑未':1,'未丑':1,'子卯':1,'卯子':1,'辰辰':1,'午午':1,'酉酉':1,'亥亥':1 };

    function getHoriRel(a, b, isGan) {
      var pair = a + b;
      if (isGan) {
        if (stemHe[pair]) return 'lt_h';
        if (stemChong[pair]) return 'lt_ch';
      } else {
        if (zhiHe[pair]) return 'lt_h';
        if (zhiChong[pair]) return 'lt_ch';
        if (zhiXing[pair]) return 'lt_xh';
      }
      var wxA = WX_MAP[a], wxB = WX_MAP[b];
      if (!wxA || !wxB || wxA === wxB) return 'lt_zh';
      if (SHENG_NEXT[wxA] === wxB) return 'lt_sy';
      if (SHENG_NEXT[wxB] === wxA) return 'lt_sz';
      return 'lt_kh';
    }
    function getVertRel(g, z) {
      var wxG = WX_MAP[g], wxZ = WX_MAP[z];
      if (!wxG || !wxZ || wxG === wxZ) return 'lt_zs';
      if (SHENG_NEXT[wxG] === wxZ) return 'lt_sx';
      if (SHENG_NEXT[wxZ] === wxG) return 'lt_ss';
      return 'lt_ks';
    }
    var result = [
      getHoriRel(gans[0], gans[1], true),
      getHoriRel(gans[1], gans[2], true),
      getHoriRel(gans[2], gans[3], true),
      getVertRel(gans[0], zhis[0]),
      getVertRel(gans[1], zhis[1]),
      getVertRel(gans[2], zhis[2]),
      getVertRel(gans[3], zhis[3]),
      getHoriRel(zhis[0], zhis[1], false),
      getHoriRel(zhis[1], zhis[2], false),
      getHoriRel(zhis[2], zhis[3], false)
    ];
    return { code: 0, data: result.join(',') };
  }

  var NAYIN_TABLE = {
    '甲子': '海中金', '乙丑': '海中金', '丙寅': '炉中火', '丁卯': '炉中火', '戊辰': '大林木', '己巳': '大林木',
    '庚午': '路旁土', '辛未': '路旁土', '壬申': '剑锋金', '癸酉': '剑锋金', '甲戌': '山头火', '乙亥': '山头火',
    '丙子': '涧下水', '丁丑': '涧下水', '戊寅': '城头土', '己卯': '城头土', '庚辰': '白蜡金', '辛巳': '白蜡金',
    '壬午': '杨柳木', '癸未': '杨柳木', '甲申': '泉中水', '乙酉': '泉中水', '丙戌': '屋上土', '丁亥': '屋上土',
    '戊子': '霹雳火', '己丑': '霹雳火', '庚寅': '松柏木', '辛卯': '松柏木', '壬辰': '长流水', '癸巳': '长流水',
    '甲午': '沙中金', '乙未': '沙中金', '丙申': '山下火', '丁酉': '山下火', '戊戌': '平地木', '己亥': '平地木',
    '庚子': '壁上土', '辛丑': '壁上土', '壬寅': '金箔金', '癸卯': '金箔金', '甲辰': '覆灯火', '乙巳': '覆灯火',
    '丙午': '天河水', '丁未': '天河水', '戊申': '大驿土', '己酉': '大驿土', '庚戌': '钗钏金', '辛亥': '钗钏金',
    '壬子': '桑柘木', '癸丑': '桑柘木', '甲寅': '大溪水', '乙卯': '大溪水', '丙辰': '沙中土', '丁巳': '沙中土',
    '戊午': '天上火', '己未': '天上火', '庚申': '石榴木', '辛酉': '石榴木', '壬戌': '大海水', '癸亥': '大海水'
  };
  var SX_MAP = { '子':'鼠','丑':'牛','寅':'虎','卯':'兔','辰':'龙','巳':'蛇','午':'马','未':'羊','申':'猴','酉':'鸡','戌':'狗','亥':'猪' };

  function checkTGLocal(a, b) {
    if (!a || !b || a === b) return '相同';
    var pair = [a, b].sort().join('');
    if (pair === '己甲') return '五合,甲己合化土';
    if (pair === '乙庚') return '五合,乙庚合化金';
    if (pair === '丙辛') return '五合,丙辛合化水';
    if (pair === '丁壬') return '五合,丁壬合化木';
    if (pair === '戊癸') return '五合,戊癸合化火';
    if (pair === '庚甲' || pair === '乙辛' || pair === '丙壬' || pair === '丁癸') return '相冲';
    var wxA = WX_MAP[a], wxB = WX_MAP[b];
    if (!wxA || !wxB || wxA === wxB) return '比和';
    if (SHENG_NEXT[wxA] === wxB || SHENG_NEXT[wxB] === wxA) return '相生';
    return '相克';
  }

  function checkDZLocal(a, b) {
    if (!a || !b) return '相同';
    if (a === b) {
      if (['辰', '午', '酉', '亥'].indexOf(a) >= 0) return '自刑,相同';
      return '相同';
    }
    var pair = [a, b].sort().join('');
    var res = [];
    if (['丑子','亥寅','卯戌','辰酉','巳申','午未'].indexOf(pair) >= 0) res.push('六合');
    if (['午子','丑未','寅申','卯酉','戌辰','亥巳'].indexOf(pair) >= 0) res.push('相冲');
    if (pair === '卯子' || ['寅巳','巳申','寅申','丑戌','戌未','丑未'].indexOf(pair) >= 0) res.push('相刑');
    if (['子未','丑午','寅巳','卯辰','亥申','戌酉'].indexOf(pair) >= 0) res.push('相害');
    if (['子酉','午卯','丑辰','戌未','亥寅','巳申'].indexOf(pair) >= 0) res.push('相破');
    if (['丑寅','亥午','卯申','子巳'].indexOf(pair) >= 0) res.push('暗合');
    if (res.length > 0) return res.join(',');
    var wxA = WX_MAP[a], wxB = WX_MAP[b];
    if (wxA === wxB) return '相同';
    if (SHENG_NEXT[wxA] === wxB || SHENG_NEXT[wxB] === wxA) return '相生';
    return '相克';
  }

  function checkNaYinLocal(ny1, ny2) {
    if (!ny1 || !ny2) return '相同';
    var w1 = ny1.slice(-1), w2 = ny2.slice(-1);
    if (w1 === w2) return '相同';
    if (SHENG_NEXT[w1] === w2 || SHENG_NEXT[w2] === w1) return '相生';
    return '相克';
  }

  function computeHepan3(bz1Raw, bz2Raw) {
    var bz1 = requireBazi(bz1Raw).join('');
    var bz2 = requireBazi(bz2Raw).join('');
    var g1 = [bz1[0], bz1[2], bz1[4], bz1[6]];
    var z1 = [bz1[1], bz1[3], bz1[5], bz1[7]];
    var g2 = [bz2[0], bz2[2], bz2[4], bz2[6]];
    var z2 = [bz2[1], bz2[3], bz2[5], bz2[7]];

    var nyNian1 = NAYIN_TABLE[g1[0] + z1[0]] || '海中金';
    var nyNian2 = NAYIN_TABLE[g2[0] + z2[0]] || '海中金';
    var nyRi1 = NAYIN_TABLE[g1[2] + z1[2]] || '炉中火';
    var nyRi2 = NAYIN_TABLE[g2[2] + z2[2]] || '炉中火';

    var pw1 = computeWXPW(bz1);
    var pw2 = computeWXPW(bz2);
    var maxW1 = '木', minW1 = '木', maxV1 = -1, minV1 = 999;
    var maxW2 = '木', minW2 = '木', maxV2 = -1, minV2 = 999;
    var order = ['水', '木', '火', '土', '金'];
    if (pw1 && pw1.data) {
      var arr1 = pw1.data.replace(/.*\[/, '').replace(/\].*/, '').split(',').map(Number);
      order.forEach(function(w, idx) {
        var v = arr1[idx] || 20;
        if (v > maxV1) { maxV1 = v; maxW1 = w; }
        if (v < minV1) { minV1 = v; minW1 = w; }
      });
    }
    if (pw2 && pw2.data) {
      var arr2 = pw2.data.replace(/.*\[/, '').replace(/\].*/, '').split(',').map(Number);
      order.forEach(function(w, idx) {
        var v = arr2[idx] || 20;
        if (v > maxV2) { maxV2 = v; maxW2 = w; }
        if (v < minV2) { minV2 = v; minW2 = w; }
      });
    }
    function getRole(targetWx, selfGan) {
      var selfWx = WX_MAP[selfGan] || '木';
      if (targetWx === selfWx) return '比劫';
      if (SHENG_NEXT[selfWx] === targetWx) return '食伤';
      if (SHENG_NEXT[targetWx] === selfWx) return '印绶';
      if (KE_NEXT[selfWx] === targetWx) return '财星';
      return '官杀';
    }
    function findShenSha(srcBz, targetRiGan, targetYueZhi) {
      var list = [];
      var tgs = [srcBz[0], srcBz[2], srcBz[4], srcBz[6]];
      var dzs = [srcBz[1], srcBz[3], srcBz[5], srcBz[7]];
      var tianYiMap = {
        '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
        '乙': ['子', '申'], '己': ['子', '申'],
        '丙': ['亥', '酉'], '丁': ['亥', '酉'],
        '壬': ['卯', '巳'], '癸': ['卯', '巳'],
        '辛': ['午', '寅']
      };
      var ty = tianYiMap[targetRiGan] || [];
      dzs.forEach(function(z) { if (ty.indexOf(z) >= 0) list.push(z + ':天乙贵人'); });
      var tcMap = { '甲': '巳', '乙': '午', '丙': '子', '丁': '巳', '戊': '午', '己': '申', '庚': '寅', '辛': '午', '壬': '酉', '癸': '亥' };
      if (tcMap[targetRiGan] && dzs.indexOf(tcMap[targetRiGan]) >= 0) list.push(tcMap[targetRiGan] + ':天厨贵人');
      var ydMap = { '寅': '丙', '午': '丙', '戌': '丙', '申': '壬', '子': '壬', '辰': '壬', '亥': '甲', '卯': '甲', '未': '甲', '巳': '庚', '酉': '庚', '丑': '庚' };
      if (ydMap[targetYueZhi] && tgs.indexOf(ydMap[targetYueZhi]) >= 0) list.push(ydMap[targetYueZhi] + ':月德贵人');
      var thMap = { '申': '酉', '子': '酉', '辰': '酉', '寅': '卯', '午': '卯', '戌': '卯', '巳': '午', '酉': '午', '丑': '午', '亥': '子', '卯': '子', '未': '子' };
      var thZhi = thMap[targetYueZhi] || '子';
      if (dzs.indexOf(thZhi) >= 0) list.push(thZhi + ':桃花');
      var yrMap = { '甲': '卯', '乙': '辰', '丙': '午', '戊': '午', '丁': '未', '己': '未', '庚': '酉', '辛': '戌', '壬': '子', '癸': '丑' };
      if (yrMap[targetRiGan] && dzs.indexOf(yrMap[targetRiGan]) >= 0) list.push(yrMap[targetRiGan] + ':羊刃');
      return Array.from(new Set(list)).join(',');
    }

    var mutual1 = findShenSha(bz1, g2[2], z2[1]);
    var mutual2 = findShenSha(bz2, g1[2], z1[1]);

    return {
      item1: [SX_MAP[z1[0]] || '鼠', SX_MAP[z2[0]] || '牛', checkDZLocal(z1[0], z2[0])],
      item2: [g1[2], g2[2], checkTGLocal(g1[2], g2[2])],
      item3: [z1[2], z2[2], checkDZLocal(z1[2], z2[2])],
      item4: [g1[0], g2[0], checkTGLocal(g1[0], g2[0])],
      item5: [z1[0], z2[0], checkDZLocal(z1[0], z2[0])],
      item6: [g1[1], g2[1], checkTGLocal(g1[1], g2[1])],
      item7: [z1[1], z2[1], checkDZLocal(z1[1], z2[1])],
      item8: [g1[2], g2[2], checkTGLocal(g1[2], g2[2])],
      item9: [z1[2], z2[2], checkDZLocal(z1[2], z2[2])],
      item10: [g1[3], g2[3], checkTGLocal(g1[3], g2[3])],
      item11: [z1[3], z2[3], checkDZLocal(z1[3], z2[3])],
      item12: [nyNian1, nyNian2, checkNaYinLocal(nyNian1, nyNian2)],
      item13: [nyRi1, nyRi2, checkNaYinLocal(nyRi1, nyRi2)],
      item14: ['', '', '本地版暂不支持此项分析'],
      item15: [maxW1 + '(' + getRole(maxW1, g2[2]) + ')', maxW2 + '(' + getRole(maxW2, g1[2]) + ')', ''],
      item16: [minW1 + '(' + getRole(minW1, g2[2]) + ')', minW2 + '(' + getRole(minW2, g1[2]) + ')', ''],
      item17: [mutual1, mutual2, ''],
      item18: ['', '', '本地版暂不支持此项分析'],
      localOnly: true,
      unsupportedItems: ['item14', 'item18']
    };
  }

  // Local storage cases management
  var USER_LIST_KEY = 'wzbz_local_userlist_v14';
  var DEFAULT_CASES = [
    {
      guid: 'case-sample-001',
      parentGuid: VIP_GUID,
      name: '乾造示例（庚金日主）',
      pinyin: 'QianZaoShiLi',
      isLeapMonth: false,
      leapMonth: 0,
      sex: 1,
      birthDay: '1990-05-15 10:30',
      solarTime: '1990-05-15 10:30',
      sunTime: '1990-05-15 10:30',
      strSunTime: '1990-05-15 10:30',
      lunarTime: '1990-04-21 10:30',
      location: '北京市 北京市 东城区',
      groupGuid: '00000000-0000-0000-0000-000000000000',
      type: 1,
      bz: '庚 午 辛 巳 庚 辰 辛 巳',
      tg: '庚 辛 庚 辛',
      dz: '午 巳 辰 巳',
      wxData: ['火旺', '土相', '木休', '水囚', '金死'],
      animal: 7,
      time: '1990年05月15日',
      star: true,
      isdel: 0,
      unknowhour: 0,
      xls: 0,
      hw: 0,
      bjtime: 0,
      timetype: 0,
      fenzhu: '',
      unknowminute: 0,
      editdate: '2026-10-13 10:00:00'
    },
    {
      guid: 'case-sample-002',
      parentGuid: VIP_GUID,
      name: '坤造示例（乙木日主）',
      pinyin: 'KunZaoShiLi',
      isLeapMonth: false,
      leapMonth: 0,
      sex: 0,
      birthDay: '1995-08-22 14:15',
      solarTime: '1995-08-22 14:15',
      sunTime: '1995-08-22 14:15',
      strSunTime: '1995-08-22 14:15',
      lunarTime: '1995-07-27 14:15',
      location: '上海市 上海市 黄浦区',
      groupGuid: '00000000-0000-0000-0000-000000000000',
      type: 1,
      bz: '乙 亥 甲 申 乙 酉 癸 未',
      tg: '乙 甲 乙 癸',
      dz: '亥 申 酉 未',
      wxData: ['金旺', '水相', '土休', '火囚', '木死'],
      animal: 12,
      time: '1995年08月22日',
      star: false,
      isdel: 0,
      unknowhour: 0,
      xls: 0,
      hw: 0,
      bjtime: 0,
      timetype: 0,
      fenzhu: '',
      unknowminute: 0,
      editdate: '2026-10-13 09:30:00'
    }
  ];

  function getLocalCases() {
    var list = readLocalJson(USER_LIST_KEY, DEFAULT_CASES, 'array');
    // Only repair untouched bundled samples; never rewrite an edited user case.
    return list.map(function(item) {
      var original = item.guid === 'case-sample-001' && item.name === '乾造示例（丙火日主）' && item.solarTime === '1990-05-15 10:30' && item.bz === '庚 午 辛 巳 丙 辰 癸 巳';
      var second = item.guid === 'case-sample-002' && item.name === '坤造示例（甲木日主）' && item.solarTime === '1995-08-22 14:15' && item.bz === '乙 亥 甲 申 甲 子 辛 未';
      if (original || second) {
        var sample = DEFAULT_CASES[second ? 1 : 0];
        return Object.assign({}, item, { name: sample.name, bz: sample.bz, tg: sample.tg, dz: sample.dz });
      }
      return item;
    });
  }

  function saveLocalCases(list) {
    writeLocalJson(USER_LIST_KEY, list);
  }

  function readLocalJson(key, fallback, kind) {
    var raw;
    try { raw = localStorage.getItem(key); }
    catch (e) { throw localError(503, '无法读取本地存储，请稍后重试'); }
    if (raw == null) return JSON.parse(JSON.stringify(fallback));
    var value;
    try { value = JSON.parse(raw); }
    catch (e) { throw localError(422, '本地数据损坏，已保留原数据，请先导出备份'); }
    if ((kind === 'array' && !Array.isArray(value)) ||
        (kind === 'object' && (!value || typeof value !== 'object' || Array.isArray(value)))) {
      throw localError(422, '本地数据格式错误，已保留原数据');
    }
    return value;
  }

  function writeLocalJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { throw localError(507, '本地保存失败，请检查存储空间后重试'); }
  }

  function writeLocalBatch(entries) {
    var before;
    try { before = entries.map(function(entry) { return localStorage.getItem(entry[0]); }); }
    catch (e) { throw localError(503, '无法读取本地存储，请稍后重试'); }
    var written = 0;
    try {
      entries.forEach(function(entry) { localStorage.setItem(entry[0], JSON.stringify(entry[1])); written++; });
    } catch (e) {
      for (var i = written - 1; i >= 0; i--) {
        try {
          if (before[i] == null) localStorage.removeItem(entries[i][0]);
          else localStorage.setItem(entries[i][0], before[i]);
        } catch (restoreError) { console.warn('[NativeBridge] local transaction restore failed'); }
      }
      throw localError(507, '本地保存失败，请检查存储空间后重试');
    }
  }

  var localSequence = 0;
  function localId(prefix, list, field) {
    var id;
    do { id = prefix + Date.now() + '-' + (++localSequence); }
    while (list.some(function(item) { return String(item[field]) === id; }));
    return id;
  }

  function localTimestamp() {
    var d = new Date();
    function pad(n) { return ('0' + n).slice(-2); }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function hasOwn(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }

  function caseFields(data) {
    var names = ['guid','name','pinyin','isLeapMonth','leapMonth','sex','birthDay','solarTime','sunTime','strSunTime','lunarTime','location','groupGuid','type','star','unknowhour','xls','hw','bjtime','timetype','fenzhu','unknowminute'];
    var result = {};
    Object.keys(data).forEach(function(key) {
      var name = names.find(function(n) { return n.toLowerCase() === key.toLowerCase(); });
      if (name) result[name] = data[key];
    });
    return result;
  }

  function flagValue(value) {
    if (value === true || value === 1 || value === '1' || value === 'true') return 1;
    if (value === false || value === 0 || value === '0' || value === 'false' || value === '') return 0;
    throw localError(400, '时间选项必须为有效的开关值');
  }

  function solarFromString(dateStr) {
    if (!window.Solar) throw localError(501, '历法组件未加载，暂不能计算或保存命例');
    var match = String(dateStr || '').trim().match(/^(\d{1,4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (!match) throw localError(400, '请输入有效的出生日期时间');
    var y = Number(match[1]), m = Number(match[2]), d = Number(match[3]);
    var h = Number(match[4] || 0), minute = Number(match[5] || 0), second = Number(match[6] || 0);
    var days = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31,30,31,30,31,31,30,31,30,31];
    if (y < 1 || m < 1 || m > 12 || d < 1 || d > days[m - 1] || h > 23 || minute > 59 || second > 59) {
      throw localError(400, '出生日期时间超出有效范围');
    }
    try { return window.Solar.fromYmdHms(y, m, d, h, minute, second); }
    catch (e) { throw localError(400, '历法不支持该日期时间'); }
  }

  function buildLocalCase(post, previous, guid) {
    var old = previous || {};
    var unknown = hasOwn(post, 'unknowhour') ? flagValue(post.unknowhour) : Number(old.unknowhour || 0);
    function dateInput(value) { return String(value || '').trim().replace(unknown ? /\s*时辰未知$/ : /$^/, ' 00:00').trim(); }
    var clockChanged = hasOwn(post, 'solarTime') || hasOwn(post, 'birthDay');
    var clock = dateInput(post.solarTime || post.birthDay || old.solarTime || old.birthDay);
    var sun = dateInput(post.sunTime || post.strSunTime || (clockChanged ? clock : old.sunTime || old.strSunTime || clock));
    solarFromString(clock);
    var solar = solarFromString(sun), lunar = solar.getLunar();
    var bz = computeEightCharFromSolarStr(sun);
    var parts = bz.split(' ');
    var item = Object.assign({}, old, post, {
      guid: guid, parentGuid: old.parentGuid || VIP_GUID,
      name: String(hasOwn(post, 'name') ? post.name : old.name || '未命名').trim() || '未命名',
      solarTime: clock, birthDay: dateInput(post.birthDay || (clockChanged ? clock : old.birthDay) || clock),
      sunTime: sun, strSunTime: dateInput(post.strSunTime || post.sunTime || sun),
      bz: bz, tg: [parts[0], parts[2], parts[4], parts[6]].join(' '), dz: [parts[1], parts[3], parts[5], parts[7]].join(' '),
      unknowhour: unknown, isdel: old.isdel || 0, editdate: localTimestamp()
    });
    item.sex = Number(hasOwn(post, 'sex') ? post.sex : old.sex == null ? 1 : old.sex);
    if (item.sex !== 0 && item.sex !== 1) throw localError(400, '请选择有效的性别');
    item.pinyin = hasOwn(post, 'pinyin') ? post.pinyin : hasOwn(post, 'name') ? item.name : old.pinyin || item.name;
    item.location = hasOwn(post, 'location') ? String(post.location) : old.location || '未知地 北京时间 --';
    item.groupGuid = String(hasOwn(post, 'groupGuid') ? post.groupGuid : old.groupGuid || '00000000-0000-0000-0000-000000000000');
    item.type = Number(hasOwn(post, 'type') ? post.type : old.type == null ? 1 : old.type);
    item.isLeapMonth = hasOwn(post, 'isLeapMonth') ? !!flagValue(post.isLeapMonth) : !!old.isLeapMonth;
    item.leapMonth = Number(hasOwn(post, 'leapMonth') ? post.leapMonth : old.leapMonth || 0);
    item.star = hasOwn(post, 'star') ? !!flagValue(post.star) : !!old.star;
    ['xls','hw','bjtime','timetype','unknowminute'].forEach(function(key) {
      item[key] = hasOwn(post, key) ? flagValue(post[key]) : Number(old[key] || 0);
    });
    item.fenzhu = hasOwn(post, 'fenzhu') ? String(post.fenzhu || '') : old.fenzhu || '';
    item.lunarTime = post.lunarTime || (clockChanged || hasOwn(post, 'sunTime') || !old.lunarTime ? lunar.getYear() + '-' + Math.abs(lunar.getMonth()) + '-' + lunar.getDay() + ' ' + sun.split(/[ T]/)[1] : old.lunarTime);
    item.animal = DIZHI.indexOf(parts[1]) + 1;
    item.time = clock.split(/[ T]/)[0].replace(/^(\d+)-(\d+)-(\d+)$/, '$1年$2月$3日');
    var season = '辰未戌丑'.indexOf(parts[3]) >= 0 ? '土' : '寅卯'.indexOf(parts[3]) >= 0 ? '木' : '巳午'.indexOf(parts[3]) >= 0 ? '火' : '申酉'.indexOf(parts[3]) >= 0 ? '金' : '水';
    item.wxData = { '木':['木旺','火相','水休','金囚','土死'], '火':['火旺','土相','木休','水囚','金死'], '土':['土旺','金相','火休','木囚','水死'], '金':['金旺','水相','土休','火囚','木死'], '水':['水旺','木相','金休','土囚','火死'] }[season];
    return item;
  }

  function guidList(value) {
    if (typeof value === 'string' && /^\s*\[/.test(value)) {
      try { value = JSON.parse(value); } catch (e) { throw localError(400, '命例 ID 列表格式错误'); }
    }
    var values = Array.isArray(value) ? value : [value];
    var result = [];
    values.forEach(function(v) { String(v == null ? '' : v).split(',').forEach(function(id) { id = id.trim(); if (id && result.indexOf(id) < 0) result.push(id); }); });
    if (!result.length) throw localError(400, '请先选择命例');
    return result;
  }

  function getLocalGroups() {
    var defaults = ['亲友','客户','名流'].map(function(name, i) { return { id:'group-' + (i + 1), guid:'group-' + (i + 1), name:name, orderindex:i + 1 }; });
    return readLocalJson('wzbz_local_groups_v14', defaults, 'array').map(function(group) {
      var id = String(group.id || group.guid || group.groupId || '');
      return Object.assign({}, group, { id:id, guid:id, name:String(group.name || group.text || ''), orderindex:Number(group.orderindex || 0) });
    }).sort(function(a, b) { return a.orderindex - b.orderindex; });
  }

  function noteKey(value) {
    var key = String(value || '').trim();
    if (!key || ['__proto__','constructor','prototype'].indexOf(key) >= 0) throw localError(400, '缺少有效的命例 ID');
    return key;
  }

  var TIKU_KEY = 'wzbz_local_tiku_v14';
  function questionId(value) {
    var id = String(value == null ? '' : value);
    if (!/^\d{1,12}$/.test(id)) throw localError(400, '题目或目录 ID 无效');
    return id;
  }

  function levelId(value) {
    var id = questionId(value);
    while (id.length < 7) id = '0' + id;
    return id;
  }

  function localQuestions(id) {
    var map = window.__WZBZ_TILIN_ALL__ || {};
    return map[levelId(id)] || null;
  }

  function tikuData(q) {
    var all = readLocalJson(TIKU_KEY, {}, 'object');
    var user = noteKey(q.userguid || q.userGuid || VIP_GUID);
    var data = hasOwn(all, user) ? all[user] : { levels:{}, answers:{}, collections:{}, terms:{} };
    if (!data || typeof data !== 'object' || ['levels','answers','collections','terms'].some(function(key) { return !data[key] || typeof data[key] !== 'object' || Array.isArray(data[key]); })) throw localError(422, '本地题库记录格式错误，已保留原数据');
    return { all:all, user:user, data:data };
  }

  function saveTiku(state) {
    state.all[state.user] = state.data;
    writeLocalJson(TIKU_KEY, state.all);
  }

  function nonnegative(value, label) {
    var n = Number(value == null || value === '' ? 0 : value);
    if (!isFinite(n) || n < 0) throw localError(400, label + '无效');
    return n;
  }

  function collectFlag(value) {
    if (String(value) === '1') return true;
    if (String(value) === '2' || String(value) === '0') return false;
    throw localError(400, '收藏操作无效');
  }

  // Initialize recentlyList on first boot
  try {
    if (!localStorage.getItem('wzbz_recentlyList')) {
      localStorage.setItem('wzbz_recentlyList', JSON.stringify(getLocalCases().map(function(x) {
        return Object.assign({}, x, { check: false });
      })));
    }
  } catch (e) {}

  function computeEightCharFromSolarStr(dateStr) {
      var solar = solarFromString(dateStr);
      var bazi = solar.getLunar().getEightChar();
      bazi.setSect(2);
      window.WZBZTimePolicy.correctEightChar(solar,bazi,true);
      return [
        bazi.getYearGan(), bazi.getYearZhi(),
        bazi.getMonthGan(), bazi.getMonthZhi(),
        bazi.getDayGan(), bazi.getDayZhi(),
        bazi.getTimeGan(), bazi.getTimeZhi()
      ].join(' ');
  }

  function parsePostData(data) {
    var obj = {};
    if (!data) return obj;
    if (typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams) {
      data.forEach(function(v, k) { if (hasOwn(obj, k)) obj[k] = [].concat(obj[k], v); else obj[k] = v; });
    } else if (typeof data === 'string') {
      if (/^\s*[{[]/.test(data)) {
        try { obj = JSON.parse(data); } catch (e) { throw localError(400, '请求 JSON 格式错误'); }
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw localError(400, '请求数据必须为对象');
      } else {
        var sp = new URLSearchParams(data);
        sp.forEach(function(v, k) { if (hasOwn(obj, k)) obj[k] = [].concat(obj[k], v); else obj[k] = v; });
      }
    } else if (typeof data === 'object') {
      obj = Object.assign({}, data);
    }
    return obj;
  }

  function encUserField(str) {
    try {
      return 'AA' + btoa(unescape(encodeURIComponent(String(str))));
    } catch (e) {
      return String(str);
    }
  }

  // 未核实的名人生日已从可用数据中撤下，待逐条补齐来源。
  var MINGREN_CSV = '';

  var DEFAULT_BZ_STRUCT = [
    { name: '旺衰', data: '', items: '从强,身旺,偏旺,平和,偏弱,身弱,从弱', type: 0 },
    { name: '格局', data: '', items: '正官格,七杀格,正印格,偏印格,正财格,偏财格,食神格,伤官格,建禄格,羊刃格,专旺格,从弱格,从财格,从杀格,从儿格,曲直格,炎上格,稼穑格,从革格,润下格', type: 0 },
    { name: '用神', data: '', items: '木,火,土,金,水', type: 1 },
    { name: '喜神', data: '', items: '木,火,土,金,水', type: 1 },
    { name: '忌神', data: '', items: '木,火,土,金,水', type: 1 },
    { name: '仇神', data: '', items: '木,火,土,金,水', type: 1 },
    { name: '闲神', data: '', items: '木,火,土,金,水', type: 1 }
  ];
  var DEFAULT_FEEDBACK_STRUCT = [
    { name: '命主反馈', list: [{ name: '性格', data: '' }, { name: '事业', data: '' }, { name: '财运', data: '' }, { name: '婚姻', data: '' }, { name: '健康', data: '' }], type: 0 }
  ];

  function getQueryParams(url) {
    var q = {};
    var idx = url.indexOf('?');
    if (idx < 0) return q;
    var sp = new URLSearchParams(url.substring(idx + 1));
    sp.forEach(function(v, k) { if (hasOwn(q, k)) q[k] = [].concat(q[k], v); else q[k] = v; });
    return q;
  }

  function okResponse(cfg, data) {
    return Promise.resolve({
      status: 200,
      statusText: 'OK',
      headers: {},
      config: cfg,
      data: data
    });
  }

  function dispatchLocal(cfg, origDispatch) {
    var url = String((cfg && cfg.url) || '');
    var q = Object.assign({}, getQueryParams(url), parsePostData(cfg && cfg.params), parsePostData(cfg && cfg.data));
    // The shipped hepan caller appends raw JSON at the end of the URL. Preserve
    // literal '+' and '&' inside names instead of interpreting them as form data.
    if (url.indexOf('createhepan.php') >= 0 && !(cfg && cfg.data)) {
      var rawHepan = url.match(/[?&]parms=(\{[\s\S]*\})$/);
      if (rawHepan) q.parms = rawHepan[1];
    }

    // 1. VIP & User Info
    if (url.indexOf('getvipinfo') >= 0) {
      return okResponse(cfg, {
        code: 0,
        data: {
          vipLevel: 3,
          expires: VIP_EXPIRES,
          session: VIP_SESSION,
          apistr: 'bzapi3',
          wxno2: 'zhongshenke009',
          wxno3: 'zhen202128',
          wxno4: ''
        }
      });
    }
    if (url.indexOf('getnewuserinfo') >= 0) {
      return okResponse(cfg, {
        code: 1,
        data: {
          cName: encUserField(VIP_NAME),
          wxName: encUserField(VIP_NAME),
          cSex: encUserField('男'),
          cDate: encUserField('-'),
          cArea: encUserField('-'),
          suntime: encUserField('-'),
          calendartype: 1,
          remindid: '-',
          phone: encUserField(VIP_PHONE),
          account: encUserField(VIP_PHONE)
        }
      });
    }
    if (url.indexOf('getuserlevel') >= 0) {
      return okResponse(cfg, { code: 0, data: '999,易学宗师' });
    }
    if (url.indexOf('updateuserinfoitem') >= 0) {
      throw localError(501, '本地版暂不支持修改账户资料');
    }

    // 2. Xiaozhen Intelligent System: WXPW, GeJu, OtherGeJu, LiuTong
    if (url.indexOf('getWXPW_nv1') >= 0 || url.indexOf('getwxnl.php') >= 0) {
      var parm = q.parm || '';
      var parts = parm.split('|');
      var bz = parts[parts.length - 1] || '';
      return okResponse(cfg, computeWXPW(bz));
    }
    if (url.indexOf('getgeju3.php') >= 0) {
      return okResponse(cfg, computeGeJu(q.bz || ''));
    }
    if (url.indexOf('getothergeju.php') >= 0) {
      throw localError(501, '本地版暂不支持其他格局分析');
    }
    if (url.indexOf('getliutong.php') >= 0) {
      return okResponse(cfg, computeLiuTong(q.bz || ''));
    }

    // 3. Hepan & Caiyun
    if (url.indexOf('hepan3.php') >= 0) {
      var hpData = computeHepan3(q.bz1 || '', q.bz2 || '');
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve(okResponse(cfg, hpData));
        }, 30);
      });
    }
    if (url.indexOf('createhepan.php') >= 0) {
      var hpList = readLocalJson('wzbz_local_hepan_v14', [], 'array');
      var hpId = localId('hp_', hpList, 'orderid');
      if (!q.parms) throw localError(400, '缺少合盘资料');
      var hpParms;
      try { hpParms = typeof q.parms === 'object' ? q.parms : JSON.parse(q.parms); }
      catch (e) { throw localError(400, '合盘资料格式错误'); }
      if (!hpParms || typeof hpParms !== 'object' || Array.isArray(hpParms)) throw localError(400, '合盘资料格式错误');
      ['info1','info2'].forEach(function(key) {
        var info = hpParms[key];
        if (!info || typeof info !== 'object' || !String(info.name || '').trim() || [0,1].indexOf(Number(info.sex)) < 0) throw localError(400, '请提供两位命主的完整合盘资料');
        solarFromString(info.datastr || info.datestr);
      });
      hpList.unshift({ orderid: hpId, parms: typeof q.parms === 'string' ? q.parms : JSON.stringify(hpParms), userGuid: q.guid || '', editdate: localTimestamp() });
      writeLocalJson('wzbz_local_hepan_v14', hpList);
      return okResponse(cfg, { code: 0, orderid: hpId });
    }
    if (url.indexOf('gethepanlist.php') >= 0) {
      return okResponse(cfg, readLocalJson('wzbz_local_hepan_v14', [], 'array').filter(function(item) { return !q.guid || !item.userGuid || item.userGuid === q.guid; }));
    }
    if (url.indexOf('delhepan.php') >= 0) {
      var curHp = readLocalJson('wzbz_local_hepan_v14', [], 'array');
      if (!curHp.some(function(item) { return item.orderid === q.orderid; })) throw localError(404, '未找到此合盘记录');
      curHp = curHp.filter(function(x) { return x.orderid !== q.orderid; });
      writeLocalJson('wzbz_local_hepan_v14', curHp);
      return okResponse(cfg, { code: 0 });
    }
    if (url.indexOf('createcy.php') >= 0) {
      solarFromString(q.date);
      var cyList = readLocalJson('wzbz_local_caiyun_v14', [], 'array');
      var cyId = localId('cy_local_', cyList, 'orderid');
      var cyRecord = Object.assign({}, q, { orderid: cyId, datestr: q.date, userGuid: q.guid || '', localOnly: true, reportSupported: false, editdate: localTimestamp() });
      cyList.unshift(cyRecord);
      writeLocalJson('wzbz_local_caiyun_v14', cyList);
      return okResponse(cfg, { code: 0, orderid: cyId, localOnly: true, reportSupported: false, message: '已保存本地记录，当前版本暂不提供财富报告' });
    }
    if (url.indexOf('getcylist.php') >= 0) {
      return okResponse(cfg, readLocalJson('wzbz_local_caiyun_v14', [], 'array').filter(function(item) { return !q.guid || !item.userGuid || item.userGuid === q.guid; }));
    }
    if (url.indexOf('delcy.php') >= 0) {
      var cyItems = readLocalJson('wzbz_local_caiyun_v14', [], 'array');
      var cyIds = guidList(q.orderid);
      if (!cyIds.every(function(id) { return cyItems.some(function(item) { return item.orderid === id; }); })) throw localError(404, '未找到财富分析记录');
      writeLocalJson('wzbz_local_caiyun_v14', cyItems.filter(function(item) { return cyIds.indexOf(item.orderid) < 0; }));
      return okResponse(cfg, { code: 0, data: 'ok' });
    }

    // 4. Celebrity Library
    if (url.indexOf('mingren4.php') >= 0) {
      return okResponse(cfg, MINGREN_CSV);
    }

    // 5. User Cases CRUD
    if (url.indexOf('SubUserH5') >= 0) {
      return okResponse(cfg, {
        code: 0,
        message: '',
        data: {
          items: [
            {
              userList: {
                items: getLocalCases()
              }
            }
          ]
        }
      });
    }
    if (url.indexOf('AddsubuserH5_8') >= 0) {
      var postObj = caseFields(q);
      var cases = getLocalCases();
      var newGuid = localId('case-', cases, 'guid');
      var newItem = buildLocalCase(postObj, null, newGuid);
      cases.unshift(newItem);
      saveLocalCases(cases);
      return okResponse(cfg, { code: 0, data: newGuid, item: newItem });
    }
    if (url.indexOf('updatesubuser8') >= 0) {
      var upObj = caseFields(q);
      var targetGuid = upObj.guid;
      var curCases = getLocalCases();
      var idx = curCases.findIndex(function(x) { return x.guid === targetGuid; });
      if (idx < 0) throw localError(404, '未找到此命例，保存未执行');
      curCases[idx] = buildLocalCase(upObj, curCases[idx], targetGuid);
      saveLocalCases(curCases);
      return okResponse(cfg, { code: 0, data: targetGuid, item: curCases[idx] });
    }
    if (url.indexOf('DeleteSubUser') >= 0 || url.indexOf('unDeleteSubUser') >= 0) {
      var isUnDel = url.indexOf('unDelete') >= 0;
      var permanent = !isUnDel && url.indexOf('DeleteSubUser2') >= 0;
      var guids = guidList(q.guid || q.Guid);
      var beforeDel = getLocalCases();
      if (!guids.every(function(id) { return beforeDel.some(function(item) { return item.guid === id; }); })) throw localError(404, '部分命例不存在，删除或还原未执行');
      if (permanent && beforeDel.some(function(item) { return guids.indexOf(item.guid) >= 0 && Number(item.isdel) !== 1; })) throw localError(409, '请先将命例移到回收站');
      var listAfterDel = beforeDel.filter(function(item) { return !permanent || guids.indexOf(item.guid) < 0; }).map(function(item) {
        if (guids.indexOf(item.guid) >= 0) {
          item.isdel = isUnDel ? 0 : 1;
          item.deldate = isUnDel ? '' : localTimestamp();
        }
        return item;
      });
      saveLocalCases(listAfterDel);
      return okResponse(cfg, { code: 0, data: 'ok' });
    }
    if (url.indexOf('/user/star') >= 0) {
      var starGuid = q.userGuid;
      var op = Number(q.op || 0);
      var starCases = getLocalCases();
      if (!starCases.some(function(item) { return item.guid === starGuid; })) throw localError(404, '未找到此命例');
      starCases.forEach(function(item) {
        if (item.guid === starGuid) item.star = op === 1;
      });
      saveLocalCases(starCases);
      return okResponse(cfg, { code: 0, data: 'ok' });
    }

    // 6. Custom Groups
    if (url.indexOf('customGroupList2') >= 0) {
      return okResponse(cfg, { code: 0, data: { items: getLocalGroups() }, isSuccess: true });
    }
    if (url.indexOf('addCustomGroupH5') >= 0) {
      var groups = getLocalGroups();
      var groupName = String(q.groupName || '').trim();
      if (groupName.length < 2) throw localError(400, '分组名称至少需要两个字');
      if (groups.some(function(group) { return group.name === groupName; })) throw localError(409, '该分组名称已存在');
      var newGrpId = localId('group-', groups, 'id');
      var newGroup = { id:newGrpId, guid:newGrpId, name:groupName, orderindex:groups.reduce(function(n, group) { return Math.max(n, group.orderindex); }, 0) + 1 };
      groups.push(newGroup);
      writeLocalJson('wzbz_local_groups_v14', groups);
      return okResponse(cfg, { code: 0, data: newGroup, isSuccess: true });
    }
    if (url.indexOf('deleteCustomGroup') >= 0 || url.indexOf('updateCustomGroup') >= 0) {
      var editGroups = getLocalGroups();
      if (url.indexOf('updateCustomGroupIndex') >= 0) {
        var orderGuids = guidList(q.groupGuid);
        var orderValues = (Array.isArray(q.orderindex) ? q.orderindex : String(q.orderindex).split(',')).map(Number);
        if (orderGuids.length !== orderValues.length || orderValues.some(function(index) { return !isFinite(index) || Math.floor(index) !== index || index < 0; })) throw localError(400, '分组排序值无效');
        if (!orderGuids.every(function(id) { return editGroups.some(function(group) { return group.id === id; }); })) throw localError(404, '部分分组不存在，排序未保存');
        editGroups.forEach(function(group) { var index = orderGuids.indexOf(group.id); if (index >= 0) group.orderindex = orderValues[index]; });
        writeLocalJson('wzbz_local_groups_v14', editGroups);
        return okResponse(cfg, { code:0, data:'ok', isSuccess:true });
      }
      var groupIndex = editGroups.findIndex(function(group) { return group.id === q.groupGuid; });
      if (groupIndex < 0) throw localError(404, '未找到此分组');
      if (url.indexOf('deleteCustomGroup') >= 0) {
        editGroups.splice(groupIndex, 1);
        var movedCases = getLocalCases().map(function(item) {
          return item.groupGuid === q.groupGuid ? Object.assign({}, item, { groupGuid:'00000000-0000-0000-0000-000000000000', editdate:localTimestamp() }) : item;
        });
        writeLocalBatch([['wzbz_local_groups_v14', editGroups], [USER_LIST_KEY, movedCases]]);
      } else {
        var renameGroup = String(q.groupName || '').trim();
        if (renameGroup.length < 2) throw localError(400, '分组名称至少需要两个字');
        if (editGroups.some(function(group, i) { return i !== groupIndex && group.name === renameGroup; })) throw localError(409, '该分组名称已存在');
        editGroups[groupIndex].name = renameGroup;
        writeLocalJson('wzbz_local_groups_v14', editGroups);
      }
      return okResponse(cfg, { code: 0, data: 'ok', isSuccess: true });
    }

    // 7. Notes (断事笔记)
    if (url.indexOf('/user/note2') >= 0 || url.indexOf('/user/usernote2') >= 0) {
      if(window.PaperForestDetails) window.PaperForestDetails.migrateNotes();
      var readNoteKey = noteKey(q.userGuid);
      var allNotes = readLocalJson('wzbz_local_notes_v14', {}, 'object');
      var savedNote = allNotes[readNoteKey] || {
        userGuid: readNoteKey,
        content: '',
        bzData: '',
        bzStruct: '',
        feedbackData: '',
        feedbackStruct: ''
      };
      return okResponse(cfg, { code: 0, data: savedNote });
    }
    if (url.indexOf('/user/updateNote2') >= 0 || url.indexOf('/user/updateUserNote2') >= 0) {
      var notePost = parsePostData(cfg.data);
      var nKey = noteKey(notePost.userGuid || q.userGuid);
      var notesMap = readLocalJson('wzbz_local_notes_v14', {}, 'object');
      notesMap[nKey] = Object.assign({}, notesMap[nKey] || {}, notePost, { userGuid: nKey, editdate:localTimestamp() });
      writeLocalJson('wzbz_local_notes_v14', notesMap);
      return okResponse(cfg, { code: 0, data: 'ok' });
    }
    if (url.indexOf('/user/notesearch') >= 0) {
      var searchableNotes = readLocalJson('wzbz_local_notes_v14', {}, 'object');
      var searchNames = [['职业'],['学历'],['财富','财运'],['婚姻'],['格局'],['旺衰','旺弱'],['喜神'],['忌神']];
      var keyword = String(q.keyword || q.key || q.content || '').trim().toLowerCase();
      var matchingCases = getLocalCases().filter(function(item) {
        if (Number(item.isdel) === 1 || !hasOwn(searchableNotes, item.guid)) return false;
        var note = searchableNotes[item.guid];
        var structured = [];
        function gather(value) {
          if (typeof value === 'string') { try { value = JSON.parse(value); } catch (e) { return; } }
          if (Array.isArray(value)) return value.forEach(gather);
          if (value && typeof value === 'object') {
            if (value.name && hasOwn(value, 'data')) structured.push({ name:String(value.name), data:String(value.data || '') });
            if (value.list) gather(value.list);
          }
        }
        ['bzData','bzStruct','feedbackData','feedbackStruct'].forEach(function(key) { gather(note[key]); });
        if (keyword && JSON.stringify(note).toLowerCase().indexOf(keyword) < 0) return false;
        return searchNames.every(function(names, index) {
          var selected = q['d' + (index + 1)];
          if (selected == null || selected === '') return true;
          var choices = (Array.isArray(selected) ? selected : String(selected).split(/[,，|]/)).filter(Boolean);
          return choices.length === 0 || structured.some(function(field) {
            return names.some(function(name) { return field.name.indexOf(name) >= 0; }) && choices.some(function(choice) { return field.data.indexOf(String(choice)) >= 0; });
          });
        });
      }).map(function(item) { return item.guid; });
      // The shipped list filter consumes a comma-separated GUID string.
      return okResponse(cfg, { code: 0, data: matchingCases.join(',') });
    }

    // 8. Ads, Blackwords, Reminders, Settings, Tracking
    if (url.indexOf('getcontrolparm.php') >= 0) return okResponse(cfg, {code:0,data:{is_show_ai_copy:false},localOnly:true});
    if (url.indexOf('getordercomshow.php') >= 0) return okResponse(cfg, {code:0,data:{is_show:false},localOnly:true});
    if (url.indexOf('newgetad2') >= 0) {
      return okResponse(cfg, { code: 0, data: [] });
    }
    if (url.indexOf('getblackyear.php') >= 0 || url.indexOf('getblackword2.php') >= 0) {
      return okResponse(cfg, []);
    }
    if (url.indexOf('Remind') >= 0 || url.indexOf('remind') >= 0) {
      throw localError(501, '本地版暂不支持提醒服务');
    }
    if (url.indexOf('UserSetting/get') >= 0 || url.indexOf('getallsetting') >= 0) {
      return okResponse(cfg, { code: 1, data: null });
    }
    if (url.indexOf('UserSetting/') >= 0 || url.indexOf('UpdateSheShaRemark') >= 0 || url.indexOf('getShenShaRemark') >= 0) {
      throw localError(501, '本地版暂不支持此项云端设置或备注');
    }
    if (url.indexOf('tracking') >= 0 || url.indexOf('installcount') >= 0 || url.indexOf('addcount') >= 0) {
      return okResponse(cfg, { code: 0, data: 'ok' });
    }

    // 8.5 Question Bank (题库 / 题林探索 / 知识百科 / 习题作战 / 智能古籍)
    if (url.indexOf('getTKMaxLevel') >= 0) {
      var levelsState = tikuData(q).data.levels;
      var passedLevels = Object.keys(levelsState).filter(function(id) { return Number(levelsState[id].score) >= 60; });
      return okResponse(cfg, { code: 0, data: passedLevels.length ? Math.max.apply(Math, passedLevels.map(Number)) : 0, isSuccess: true, localOnly:true });
    }
    if (url.indexOf('getLevelPass') >= 0) {
      var localLevels = tikuData(q).data.levels;
      var passList = Object.keys(localLevels).map(function(id) { return { levelid:Number(id), count:Number(localLevels[id].score) >= 60 ? 1 : 0 }; });
      return okResponse(cfg, { code: 0, data: passList, isSuccess: true, localOnly:true });
    }
    if (url.indexOf('getTKLevel') >= 0) {
      var levelRecord = tikuData(q).data.levels[levelId(q.levelid)];
      return okResponse(cfg, {
        code: 0,
        data: Object.assign({ score:0, usetime:0, correct:0, wrong:0, mytotal:0, mycorrect:0, alltotal:0, allcorrect:0 }, levelRecord || {}),
        isSuccess: true, localOnly:true
      });
    }
    if (url.indexOf('getQuestionsOfLevel') >= 0) {
      var qLevelMap = localQuestions(q.levelid);
      if (!qLevelMap || !Object.keys(qLevelMap).length) throw localError(501, '当前版本尚未提供此关题目');
      return okResponse(cfg, { code: 0, data: Object.keys(qLevelMap), isSuccess: true, localOnly:true });
    }
    if (url.indexOf('getQuestions.php') >= 0) {
      var qDataObj = localQuestions(q.cid);
      if (!qDataObj || !Object.keys(qDataObj).length) throw localError(501, '当前版本尚未提供此目录题目');
      return okResponse(cfg, { code: 0, data: qDataObj, isSuccess: true, localOnly:true });
    }
    if (url.indexOf('postSubmitLevel') >= 0) {
      var submitState = tikuData(q);
      var submitLevelId = levelId(q.levelid);
      if (!localQuestions(submitLevelId)) throw localError(501, '当前版本尚未提供此关，不能提交成绩');
      var priorLevel = submitState.data.levels[submitLevelId] || {};
      var correct = nonnegative(q.correct, '答对数量'), wrong = nonnegative(q.wrong, '答错数量');
      submitState.data.levels[submitLevelId] = {
        levelid:submitLevelId, score:nonnegative(q.score, '分数'), usetime:nonnegative(q.usetime, '用时'), correct:correct, wrong:wrong,
        mytotal:Number(priorLevel.mytotal || 0) + correct + wrong, mycorrect:Number(priorLevel.mycorrect || 0) + correct,
        alltotal:0, allcorrect:0, content:String(q.content || ''), editdate:localTimestamp()
      };
      saveTiku(submitState);
      return okResponse(cfg, { code:0, data:'ok', isSuccess:true, localOnly:true });
    }
    if (url.indexOf('postSubmitExercise') >= 0) {
      var exerciseState = tikuData(q);
      var topicId = questionId(q.topicid), catalogId = questionId(q.catalogid);
      var answer = String(q.ans || '').toUpperCase(), status = String(q.status);
      if (!/^[A-Z]$/.test(answer) || ['0','1'].indexOf(status) < 0) throw localError(400, '请选择答案后再提交');
      var previousAnswer = exerciseState.data.answers[topicId] || {};
      exerciseState.data.answers[topicId] = Object.assign({}, previousAnswer, {
        topicid:topicId, catalogid:catalogId, answer:answer, status:status, submitTime:localTimestamp(),
        total:Number(previousAnswer.total || 0) + 1, correct:Number(previousAnswer.correct || 0) + Number(status)
      });
      saveTiku(exerciseState);
      return okResponse(cfg, { code:0, data:'ok', isSuccess:true, localOnly:true });
    }
    if (url.indexOf('postCollectQuestion') >= 0) {
      var collectState = tikuData(q), collectedId = questionId(q.topicid);
      if (collectFlag(q.flag)) collectState.data.collections[collectedId] = localTimestamp();
      else delete collectState.data.collections[collectedId];
      saveTiku(collectState);
      return okResponse(cfg, { code:0, data:'ok', isSuccess:true, localOnly:true });
    }
    if (url.indexOf('postCollectTerm') >= 0) {
      var termState = tikuData(q), articleId = questionId(q.articleid);
      if (collectFlag(q.flag)) termState.data.terms[articleId] = { catalogid:questionId(q.catalogid), editdate:localTimestamp() };
      else delete termState.data.terms[articleId];
      saveTiku(termState);
      return okResponse(cfg, { code:0, data:'ok', isSuccess:true, localOnly:true });
    }
    if (url.indexOf('postCorrectQuestion') >= 0 || url.indexOf('postCorrectAnalysis') >= 0) {
      throw localError(501, '本地版暂不支持向题库提交纠错');
    }
    if (url.indexOf('postRedoQuestions') >= 0) {
      var redoState = tikuData(q), redoCatalogId = questionId(q.catalogid);
      Object.keys(redoState.data.answers).forEach(function(id) {
        var record = redoState.data.answers[id];
        if (record.catalogid === redoCatalogId) { record.answer = ''; record.status = ''; record.submitTime = ''; }
      });
      saveTiku(redoState);
      return okResponse(cfg, { code:0, data:'ok', isSuccess:true, localOnly:true });
    }
    if (url.indexOf('getTerms') >= 0) {
      return okResponse(cfg, { code:0, data:Object.keys(tikuData(q).data.terms), isSuccess:true, localOnly:true });
    }
    if (url.indexOf('getExercises') >= 0) {
      var answerGroups = {}, localAnswers = tikuData(q).data.answers;
      Object.keys(localAnswers).forEach(function(id) {
        var record = localAnswers[id], key = record.catalogid;
        if (!answerGroups[key]) answerGroups[key] = { id:key, rightcount:0, errcount:0 };
        if (record.answer) { if (record.status === '1') answerGroups[key].rightcount++; else if (record.status === '0') answerGroups[key].errcount++; }
      });
      return okResponse(cfg, { code:0, data:Object.keys(answerGroups).map(function(id) { return answerGroups[id]; }), isSuccess:true, localOnly:true });
    }
    if (url.indexOf('getQuestionsOfTerm') >= 0 || url.indexOf('getQuestionsOfExercise') >= 0) {
      var questionState = tikuData(q).data, queryCatalog = questionId(q.catalogid);
      var savedQuestions = Object.keys(questionState.answers).filter(function(id) { return questionState.answers[id].catalogid === queryCatalog; }).map(function(id) {
        return Object.assign({}, questionState.answers[id], { collectTime:questionState.collections[id] || '' });
      });
      // Collection requests contain only topicid; include these states so the
      // caller can apply them by ID even before a question has an answer.
      Object.keys(questionState.collections).forEach(function(id) {
        if (!savedQuestions.some(function(item) { return item.topicid === id; })) savedQuestions.push({ topicid:id, answer:'', status:'', collectTime:questionState.collections[id] });
      });
      return okResponse(cfg, { code:0, data:savedQuestions, isSuccess:true, localOnly:true });
    }
    if (url.indexOf('getQuestionOfDetail') >= 0) {
      var detailState = tikuData(q).data, detailId = questionId(q.topicid), detail = detailState.answers[detailId] || {};
      return okResponse(cfg, { code:0, data:{ mytotal:Number(detail.total || 0), mycorrect:Number(detail.correct || 0), alltotal:0, allcorrect:0, allcollect:0,
        iscollect:hasOwn(detailState.collections, detailId) ? 1 : 0, answer:detail.answer || '', status:detail.status || '' }, isSuccess:true, localOnly:true });
    }

    // Unimplemented legacy APIs must not silently send user data to the old service.
    var target;
    try { target = new URL(String(cfg.url || ''), cfg.baseURL || window.location.href).hostname; } catch (_) { target = ''; }
    var corePath;try { corePath=new URL(String(cfg.url||''),cfg.baseURL||window.location.href).pathname; }catch(_){corePath='';}
    if (/(^|\.)(iwzbz|iwzwh)\.com$/i.test(target) && !(target==='bzapi3.iwzbz.com'&&corePath==='/getbasebz8.php')) {
      return okResponse(cfg, {code:501,data:null,isSuccess:false,localOnly:true,message:'此功能尚未完成本地适配，未向原第三方服务发送数据。'});
    }

    return origDispatch(cfg);
  }

  function localDispatchFailure(cfg, error) {
    if (!error.localCode) return Promise.reject(error);
    error.isAxiosError = true;
    error.config = cfg;
    error.response = { status:error.localCode, config:cfg, data:{ code:error.localCode, data:null, isSuccess:false, message:error.message, localOnly:true } };
    return Promise.reject(error);
  }
  function runLocalDispatch(cfg, origDispatch) {
    try { return dispatchLocal(cfg, origDispatch); }
    catch (error) { return localDispatchFailure(cfg, error); }
  }
  window.__WZBZ_AXIOS_INTERCEPT__ = function(cfg, origDispatch) {
    var url = String(cfg && cfg.url || '');
    if (!window.__WZBZ_TILIN_ALL__ && ['getQuestionsOfLevel', 'getQuestions.php', 'postSubmitLevel'].some(function(path) { return url.indexOf(path) >= 0; })) {
      return window.WZBZAssets.ensure('quiz').then(function() {
        return runLocalDispatch(cfg, origDispatch);
      }, function() {
        return localDispatchFailure(cfg, localError(503, '题库加载失败，请重试'));
      });
    }
    return runLocalDispatch(cfg, origDispatch);
  };

  // Intercept window.fetch for static/data/<year>-<month>.json (加减日时 JJRS calendar grid)
  if (typeof window.fetch === 'function') {
    var origFetch = window.fetch.bind(window);
    window.fetch = function(input, init) {
      var u = typeof input === 'string' ? input : (input && input.url) || '';
      var m = u.match(/static\/data\/(\d+)-(\d+)\.json/);
      if (m && window.Solar) {
        try {
          var yr = parseInt(m[1], 10);
          var mo = parseInt(m[2], 10);
          if (yr < 1 || yr > 9999 || mo < 1 || mo > 12) throw localError(400, '月历日期超出有效范围');
          var firstDate = new Date(2000, 0, 1);
          firstDate.setFullYear(yr, mo - 1, 1);
          var startDow = firstDate.getDay(); // 0=Sunday
          var cur = new Date(firstDate.getTime());
          cur.setDate(1 - startDow);
          var nextMonth = new Date(firstDate.getTime());
          nextMonth.setMonth(mo);
          var numberOfDays = Math.round((nextMonth.getTime() - firstDate.getTime()) / 86400000);
          var weekCount = Math.ceil((startDow + numberOfDays) / 7);
          var weeks = [];
          for (var w = 0; w < weekCount; w++) {
            var row = [];
            for (var d = 0; d < 7; d++) {
              var sy = cur.getFullYear();
              var sm = cur.getMonth() + 1;
              var sd = cur.getDate();
              var solar = window.Solar.fromYmd(sy, sm, sd);
              var lunar = solar.getLunar();
              var jq = lunar.getJieQi();
              row.push({
                sD: [sy, sm, sd],
                cN: jq ? 'x-j' : '',
                l1: jq || lunar.getDayInChinese(),
                l2: lunar.getDayInGanZhi()
              });
              cur.setDate(cur.getDate() + 1);
            }
            weeks.push(row);
          }
          return Promise.resolve(new Response(JSON.stringify(weeks), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        } catch (e) {
          return Promise.resolve(new Response(JSON.stringify({ code:e.localCode || 422, message:e.message || '月历生成失败' }), { status:e.localCode || 422, headers:{ 'Content-Type':'application/json' } }));
        }
      } else if (m) {
        return Promise.resolve(new Response(JSON.stringify({ code:501, message:'历法组件未加载，暂不能生成月历' }), { status:501, headers:{ 'Content-Type':'application/json' } }));
      }
      return origFetch(input, init);
    };
  }

  // Keep Vuex Store synchronized with VIP 3 and local imgPath
  function syncStore() {
    try {
      var appEl = document.getElementById('app');
      if (appEl && appEl.__vue__ && appEl.__vue__.$store) {
        if (appEl.__vue__.$router && !window.__WZBZ_ROUTER__) { window.__WZBZ_ROUTER__ = appEl.__vue__.$router; }
        var store = appEl.__vue__.$store;
        if (store.state) {
          if (store.state.imgPath !== './static/bzimgs/') {
            store.state.imgPath = './static/bzimgs/';
          }
          if (store.state.appLoading && store.state.appLoading.show) {
            store.state.appLoading.show = false;
          }
          if (store.state.userInfo) {
            store.state.userInfo.viplevel = 3;
            store.state.userInfo.advip = 1;
            store.state.userInfo.expires = VIP_EXPIRES;
            if (!store.state.userInfo.userguid) {
              store.state.userInfo.userguid = VIP_GUID;
              store.state.userInfo.username = VIP_NAME;
              store.state.userInfo.phone = VIP_PHONE;
            }
          }
          if (!store.__wzbz_subscribed && store.subscribe) {
            store.__wzbz_subscribed = true;
            store.subscribe(function(mutation, state) {
              if (state && state.userInfo && state.userInfo.viplevel !== 3) {
                state.userInfo.viplevel = 3;
                state.userInfo.advip = 1;
                state.userInfo.expires = VIP_EXPIRES;
                state.userInfo.userguid = VIP_GUID;
                state.userInfo.username = VIP_NAME;
              }
            });
          }
        }
      }
    } catch (e) {}
  }
  var syncTimer = setInterval(function() {
    syncStore();
    var appEl = document.getElementById('app');
    if (appEl && appEl.__vue__ && appEl.__vue__.$store && appEl.__vue__.$store.state && appEl.__vue__.$store.state.userInfo && appEl.__vue__.$store.state.userInfo.viplevel === 3) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  }, 500);
  document.addEventListener('DOMContentLoaded', syncStore);

  // Global hardware back-button handler (called by Android native MainActivity)
  window.__WZBZ_HANDLE_HARDWARE_BACK__ = function() {
    try {
      // 1. If ancient book iframe is visible, close it
      var bookIframe = document.getElementById('bookIframe');
      if (bookIframe && !bookIframe.classList.contains('hideClass') && bookIframe.style.display !== 'none') {
        if (window.__WZBZ_BOOK_IFRAME__ && typeof window.__WZBZ_BOOK_IFRAME__.close === 'function') {
          window.__WZBZ_BOOK_IFRAME__.close();
          return true;
        }
        bookIframe.classList.add('hideClass');
        bookIframe.style.display = 'none';
        bookIframe.style.pointerEvents = 'none';
        bookIframe.src = 'about:blank';
        var readingApp = document.getElementById('app');
        var readingStore = readingApp && readingApp.__vue__ && readingApp.__vue__.$store;
        if (readingStore) {
          readingStore.dispatch('book/setBookIframe', null);
          readingStore.dispatch('book/setBookLoading', false);
        }
        var bookLoading = document.getElementById('bookLoading');
        if (bookLoading) {
          bookLoading.classList.add('bookLoading_hide');
          bookLoading.style.display = 'none';
        }
        return true;
      }

      // 2. If any popup/overlay is open, close it
      var overlays = document.querySelectorAll('.van-overlay, .van-popup--center, .van-dialog');
      for (var i = 0; i < overlays.length; i++) {
        if (overlays[i].offsetParent !== null && overlays[i].style.display !== 'none') {
          overlays[i].click();
          return true;
        }
      }

      // 3. Check current route
      var currentPath = '';
      var appEl = document.getElementById('app');
      if (appEl && appEl.__vue__ && appEl.__vue__.$route) {
        currentPath = appEl.__vue__.$route.path || '';
      } else {
        var hash = window.location.hash || '';
        if (hash.indexOf('#') === 0) hash = hash.slice(1);
        if (hash.indexOf('?') >= 0) hash = hash.split('?')[0];
        currentPath = hash;
      }

      var rootTabs = [
        '/main/wznavigation/wzindex',
        '/main/wznavigation/wzuserlist',
        '/main/wznavigation/wzbook',
        '/main/wznavigation/wzmy',
        '/home/index',
        '/'
      ];

      var isRoot = false;
      for (var j = 0; j < rootTabs.length; j++) {
        if (currentPath === rootTabs[j] || currentPath === '') {
          isRoot = true;
          break;
        }
      }

      if (currentPath === '/main/paipan' && appEl && appEl.__vue__ &&
          appEl.__vue__.$store && appEl.__vue__.$store.getters.bookIframe &&
          window.__WZBZ_BOOK_IFRAME__ && window.__WZBZ_ROUTER__) {
        window.__WZBZ_BOOK_IFRAME__.resume();
        window.__WZBZ_ROUTER__.replace('/main/wznavigation/wzbook');
        return true;
      }

      if (!isRoot) {
        if (window.__WZBZ_ROUTER__) {
          window.__WZBZ_ROUTER__.back();
          return true;
        } else if (window.history.length > 1) {
          window.history.back();
          return true;
        }
      }

      // At root tabs, return false to trigger Android native 2-second double exit
      return false;
    } catch (err) {
      console.warn('[NativeBridge] hardware back err:', err);
      return false;
    }
  };

})();
