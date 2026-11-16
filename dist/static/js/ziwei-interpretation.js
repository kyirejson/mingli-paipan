(function(global){
  'use strict';
  var BRANCHES='子丑寅卯辰巳午未申酉戌亥',HUA='禄权科忌';
  var MAJORS='紫微 天机 太阳 武曲 天同 廉贞 天府 太阴 贪狼 巨门 天相 天梁 七杀 破军'.split(' ');
  var PALACES='命宫 兄弟 夫妻 子女 财帛 疾厄 迁移 仆役 官禄 田宅 福德 父母'.split(' ');
  var SHA=['擎羊','陀罗','火星','铃星','地空','地劫'];
  var PAIRS=['紫微天府','紫微贪狼','紫微天相','紫微七杀','紫微破军','天机太阴','天机巨门','天机天梁','太阳太阴','太阳巨门','太阳天梁','武曲天府','武曲贪狼','武曲天相','武曲七杀','武曲破军','天同太阴','天同巨门','天同天梁','廉贞天府','廉贞贪狼','廉贞天相','廉贞七杀','廉贞破军'];
  var factsCache=new WeakMap();
  var LEGAL_HUA={禄:['廉贞','天机','天同','太阴','贪狼','武曲','太阳','巨门','天梁','破军'],权:['破军','天梁','天机','天同','太阴','贪狼','武曲','太阳','紫微','巨门'],科:['武曲','紫微','文昌','天机','右弼','天梁','太阴','文曲','左辅'],忌:['太阳','太阴','廉贞','巨门','天机','文曲','天同','文昌','武曲','贪狼']};
  var PAIR_BRANCH_NOTES={
    '太阳太阴:1':'丑宫日月同度：太阴入庙乘旺而太阳失辉，主内敛深沉、重幕后筹划与暗财积蓄。',
    '太阳太阴:7':'未宫日月同度：太阳得位而太阴渐弱，主先勤后稳、外圆内方，公开拓展力优于丑宫。',
    '太阳巨门:2':'寅宫巨日同度（旭日东升）：太阳乘旺驱散巨门暗气，名声与专业说服力极易打开局面。',
    '太阳巨门:8':'申宫巨日同度（日落西山）：太阳偏西而巨门暗曜渐显，行事宜防先热后冷、少争口舌。',
    '太阳天梁:3':'卯宫阳梁同度（日照雷门）：太阳天梁俱居庙旺，名声显达、长辈与贵人荫护极盛。',
    '太阳天梁:9':'酉宫阳梁同度（日沉西海）：太阳失辉，处事宜凭硬核专业稳扎稳打、戒孤芳自赏。',
    '天同太阴:0':'子宫同阴同度（水澄桂萼）：壬癸双水归垣入庙，清贵温润、福禄与人缘俱佳。',
    '天同太阴:6':'午宫同阴同度：双星居午失地，水火相激，早年多历奔波磨炼，逢吉化或擎羊激发方显破局之功。',
    '天机太阴:8':'申宫机月同度：太阴乘旺生扶天机，幕后筹谋与资产积蓄皆得地利。',
    '天机太阴:2':'寅宫机月同度：太阴失辉，思虑与走动较频，宜稳守专业定力。',
    '武曲天府:0':'子宫武府同度：水静藏库，精于长线守财、制度管理与稳健运筹。',
    '武曲天府:6':'午宫武府同度：火旺炼金，开创执行力与掌局气魄更盛。',
    '紫微天府:2':'寅宫紫府同度：木生火土，统筹之中兼备积极开拓进取之势。',
    '紫微天府:8':'申宫紫府同度：金水相生，稳健守成与持重掌库之力尤厚。',
    '廉贞七杀:7':'未宫廉杀同度：盘格清朗，得吉化合“雄宿乾元”积富兴业之象。',
    '廉贞七杀:1':'丑宫廉杀同度：金水寒滞，攻坚破局尤须防刚烈硬碰与行旅劳顿。'
  };
  var FIVE_BUREAU_NOTES={
    '水二局':'水二局主智慧灵动、适应力强、善随势导流，人脉与信息周转敏锐，忌随波逐流。',
    '木三局':'木三局主仁厚条达、生机勃发、重成长规划与向上攀升，条理分明，忌急于求成。',
    '金四局':'金四局主刚毅果决、重义守则、讲求效率与制度边界，执行力强，忌刚直少容。',
    '土五局':'土五局主厚重稳健、诚实守信、极具承载包容与蓄积守成定力，忌步调迟缓。',
    '火六局':'火六局主明快热烈、敢为争先、极具爆发感染力与开局冲劲，忌心浮气躁。'
  };
  function name(n){return ({交友:'仆役',交友宫:'仆役',奴仆:'仆役',截路:'截空',空亡:'副截'})[n]||String(n||'').replace(/(兄弟|夫妻|子女|财帛|疾厄|迁移|仆役|官禄|田宅|福德|父母)宫$/,'$1');}
  function title(n){return n==='命宫'?n:(n==='仆役'?'交友':n)+'宫';}
  function unique(xs){return Array.from(new Set(xs));}
  function validate(d){
    if(!d||d.schemaVersion!==4||!Array.isArray(d.palaceOrder)||d.palaceOrder.join('|')!==PALACES.join('|')||!Array.isArray(d.pairs)||d.pairs.length!==24||!d.sources||!d.contexts||!d.patternMeanings||!Array.isArray(d.details))throw Error('紫微解读资料格式有误');
    ['profiles','brightness','auxiliary','hua','starMutagens','self','incoming','huaPairs','misc','palaceNotes','provenance','schoolPolicy','brightnessLevels','cycleMeanings'].forEach(function(k){if(!d[k]||typeof d[k]!=='object')throw Error('解读资料缺失：'+k);});
    function complete(table,keys,cols){keys.forEach(function(k){if(!table[k])throw Error('缺少解读：'+k);cols.forEach(function(col){if(typeof table[k][col]!=='string'||!table[k][col].trim())throw Error('缺少释义：'+k+'/'+col);});});}
    complete(d.profiles,MAJORS,PALACES);complete(d.brightness,MAJORS,['strong','weak']);complete(d.hua,PALACES,HUA.split(''));
    if(Object.keys(d.auxiliary).length!==14)throw Error('辅曜资料不完整');complete(d.auxiliary,Object.keys(d.auxiliary),PALACES);
    var pairs=new Set();d.pairs.forEach(function(p){if(!p||!Array.isArray(p.stars)||p.stars.length!==2||p.stars[0]===p.stars[1]||p.stars.some(function(n){return !MAJORS.includes(n);})||!PAIRS.includes(MAJORS.filter(function(n){return p.stars.includes(n);}).join('')))throw Error('双星组合有误');var key=p.stars.slice().sort().join('|');if(pairs.has(key))throw Error('重复双星组合');pairs.add(key);complete({pair:p.palaces},['pair'],PALACES);});
    Object.keys(d.sources).forEach(function(k){if(!/^https:\/\//.test(d.sources[k].url)||!d.sources[k].title)throw Error('资料出处有误');});
    HUA.split('').forEach(function(k){if(!d.self[k]||!d.incoming[k])throw Error('自化资料不完整');});
    var detailIds=new Set(),predicates=new Set();d.details.forEach(function(o){var predicate=[o.school||'shared',o.layer||'natal',o.palace,o.star,o.type,o.value].join('|');if(detailIds.has(o.id)||predicates.has(predicate))throw Error('重复或冲突的细读条件：'+predicate);if(!o.id||!PALACES.includes(o.palace)||!MAJORS.includes(o.star)&&!d.auxiliary[o.star]||!o.title||!o.text||!['brightness','mutagen'].includes(o.type)||o.type==='brightness'&&!['strong','weak'].includes(o.value)||o.type==='mutagen'&&(!HUA.includes(o.value)||!d.starMutagens[o.star+o.value]))throw Error('组合细读条件有误');detailIds.add(o.id);predicates.add(predicate);});
    Object.keys(d.provenance).forEach(function(id){var p=d.provenance[id];if(p.id!==id||!p.version||!p.school||!p.layer||!Array.isArray(p.sourceRefs)||!p.sourceRefs.length||p.sourceRefs.some(function(k){return !d.sources[k];})||!Array.isArray(p.contextKeys)||p.contextKeys.some(function(k){return !d.contexts[k];})||!p.conditions||!Array.isArray(p.exclusions)||p.status!=='editorial-reference')throw Error('解读出处记录有误：'+id);});
    MAJORS.forEach(function(star){PALACES.forEach(function(p){if(!d.provenance['profile:'+p+':'+star])throw Error('缺少逐条出处：'+p+star);});});
    Object.keys(d.cycleMeanings).forEach(function(k){if(Object.keys(d.cycleMeanings[k].values||{}).length!==12||!d.sources[d.cycleMeanings[k].ref])throw Error('神煞系统资料有误：'+k);});
    return d;
  }
  function validChart(chart){
    if(!chart||!Array.isArray(chart.palaces)||chart.palaces.length!==12)return false;
    var names=[],branches=[],majors=[],mutagens=[];
    for(var i=0;i<12;i++){
      var p=chart.palaces[i];if(!p||!Array.isArray(p.majorStars)||!Array.isArray(p.minorStars)||!Array.isArray(p.adjectiveStars))return false;
      var n=name(p.name),b=BRANCHES.indexOf(p.earthlyBranch);if(!PALACES.includes(n)||b<0||String(p.earthlyBranch).length!==1)return false;
      names.push(n);branches.push(b);
      if(p.majorStars.some(function(s){return !s||!MAJORS.includes(name(s.name));})||p.majorStars.length>2)return false;
      majors=majors.concat(p.majorStars.map(function(s){return name(s.name);}));
      if(p.majorStars.length===2&&!PAIRS.includes(MAJORS.filter(function(n){return p.majorStars.some(function(s){return name(s.name)===n;});}).join('')))return false;
      if(p.minorStars.concat(p.adjectiveStars).some(function(s){return !s||typeof s.name!=='string';}))return false;
      if(p.majorStars.concat(p.minorStars,p.adjectiveStars).some(function(s){return s.mutagen&&(!LEGAL_HUA[s.mutagen]||!LEGAL_HUA[s.mutagen].includes(name(s.name)));}))return false;
      mutagens=mutagens.concat(p.majorStars.concat(p.minorStars,p.adjectiveStars).map(function(s){return s.mutagen;}).filter(Boolean));
    }
    return unique(names).length===12&&unique(branches).length===12&&unique(majors).length===majors.length&&unique(mutagens).length===mutagens.length;
  }
  function card(id,technique,heading,text,evidence,refs){return {id:id,technique:technique,title:heading,text:text,evidence:evidence||'',refs:refs||['quanshu'],kind:'reading',layer:'natal',derivation:'editorial-reference'};}
  function trace(c,d,keys){c.trace=(keys||[]).map(function(k){return d.provenance[k];}).filter(Boolean);return c;}
  function readStars(p){return p.majorStars.concat(p.minorStars,p.adjectiveStars).map(function(s){return {name:name(s.name),brightness:s.brightness||'',mutagen:s.mutagen||'',type:s.type||''};});}
  function makeRows(d,chart){
    if(!validChart(chart))return [];
    var rows=PALACES.map(function(n){var i=chart.palaces.findIndex(function(p){return name(p.name)===n;}),p=chart.palaces[i];return {index:i,name:n,title:title(n),branch:BRANCHES.indexOf(p.earthlyBranch),ganzhi:(p.heavenlyStem||'')+p.earthlyBranch,major:p.majorStars.map(function(s){return name(s.name);}),stars:readStars(p),body:!!p.isBodyPalace,original:!!p.isOriginalPalace,decadal:p.decadal,ages:p.ages||[],cycles:['changsheng12','boshi12','jiangqian12','suiqian12'].map(function(k){return {system:k,label:d.cycleMeanings[k].label,star:p[k],text:d.cycleMeanings[k].values[p[k]]||''};}).filter(function(o){return !!o.star;})};});
    rows.forEach(function(r){r.opposite=rows.find(function(q){return q.branch===(r.branch+6)%12;});r.trines=rows.filter(function(q){return [4,8].includes((q.branch-r.branch+12)%12);});r.neighbors=[rows.find(function(q){return q.branch===(r.branch+11)%12;}),rows.find(function(q){return q.branch===(r.branch+1)%12;})];});
    rows.forEach(function(r){
      var palFocus=(d.palaceNotes[r.name]||'').replace(/^看|。$/g,'');
      r.cards=palaceCards(d,r);r.natal=natalCards(d,r);
      r.contexts=r.stars.map(function(s){return d.contexts[r.name+':'+s.name];}).filter(Boolean);
      r.misc=r.stars.filter(function(s){return !!d.misc[s.name];}).map(function(s){
        var mText=d.misc[s.name]+(r.name==='命宫'?'坐守命垣，直接融入个人气质与行事风格。':'落入'+r.title+'，重点牵动'+palFocus+'。');
        return trace(card('misc-'+r.name+'-'+s.name,'杂曜象义',s.name+'在'+r.title,mText,r.title+'实际坐守'+s.name,['misc']),d,['misc:'+s.name]);
      });
    });
    return rows;
  }
  function describe(d,r){
    var pair=r.major.length===2?d.pairs.find(function(p){return p.stars.every(function(n){return r.major.includes(n);});}):null;
    if(pair)return pair.palaces[r.name];
    return r.major.map(function(n){return d.profiles[n][r.name];}).join('');
  }
  function has(r,n){return r.stars.some(function(s){return s.name===n;});}
  function realTimeStructureNote(r){
    var notes=[],sf=[r].concat(r.trines||[],r.opposite?[r.opposite]:[]);
    if(r.major.length===2){
      var pKey=MAJORS.filter(function(n){return r.major.includes(n);}).join('')+':'+r.branch;
      if(PAIR_BRANCH_NOTES[pKey])notes.push(PAIR_BRANCH_NOTES[pKey]);
    }
    if(r.major.includes('紫微')){
      var hasZuo=sf.some(function(q){return has(q,'左辅');}),hasYou=sf.some(function(q){return has(q,'右弼');});
      notes.push(hasZuo&&hasYou?'本盘紫微三方左辅右弼齐会，得百官朝拱之助。':hasZuo||hasYou?'本盘紫微三方见单星辅弼相佐，具一定团队协助力。':'本盘紫微三方不见左辅右弼，行事偏重独力亲为。');
    }
    if(r.major.includes('天府')){
      var hasLu=sf.some(function(q){return has(q,'禄存')||q.stars.some(function(s){return s.mutagen==='禄';});});
      var hasKj=sf.some(function(q){return has(q,'地空')||has(q,'地劫');});
      notes.push(hasLu&&!hasKj?'本盘天府三方得禄充库（实库），资源蓄积与托底力稳固。':hasKj&&!hasLu?'本盘天府三方不见禄而逢空劫（露库），宜严控现金流耗散与替人兜底。':hasLu&&hasKj?'本盘天府三方禄与空劫并见，进账虽活但宜及时置产锁财。':'本盘天府库位平稳，重守成调度。');
    }
    if(r.major.includes('天相')&&r.neighbors&&r.neighbors[0]&&r.neighbors[1]){
      var nb=r.neighbors,hasLiang=nb.some(function(q){return has(q,'天梁');});
      var hasCai=nb.some(function(q){return has(q,'禄存')||q.stars.some(function(s){return s.mutagen==='禄';});});
      var hasXing=nb.some(function(q){return has(q,'擎羊')||has(q,'陀罗')||q.stars.some(function(s){return s.mutagen==='忌';});});
      if(hasLiang&&hasCai)notes.push('本盘天相得左右邻宫“财荫夹印”，凭规则与贵人护持顺遂得力。');
      else if(hasXing&&(hasLiang||nb.every(function(q){return has(q,'擎羊')||has(q,'陀罗');})))notes.push('本盘天相受邻宫“刑忌夹印”牵制，凡事须合规留痕、忌替人背责。');
    }
    return notes.join('');
  }
  function palaceCards(d,r){
    var out=[],evidence=r.title+' '+r.ganzhi+' · '+(r.major.join('、')||'无十四主星'),palFocus=(d.palaceNotes[r.name]||'').replace(/^看|。$/g,'');
    if(r.major.length)out.push(trace(card('core-'+r.name,'本宫星系',r.major.join('、')+(r.major.length>1?'同守':'守')+r.title,describe(d,r),evidence),d,[r.major.length===2?'pair:'+r.name+':'+MAJORS.filter(function(n){return r.major.includes(n);}).join(''):'profile:'+r.name+':'+r.major[0]]));
    else if(r.opposite&&r.opposite.major.length){
      var borrowed={name:r.name,major:r.opposite.major};
      var b=card('borrow-'+r.name,'空宫借曜','参看对宫'+r.opposite.major.join('、'),describe(d,borrowed),'本宫无十四主星；参看'+r.opposite.title+' '+r.opposite.ganzhi+'。星曜仍在对宫。',['quanshu','palace']);
      var sitList=r.stars.map(function(s){return s.name+(s.mutagen?'化'+s.mutagen:'');});
      b.extra=r.opposite.title+'实际状态：'+r.opposite.stars.filter(function(s){return r.opposite.major.includes(s.name);}).map(function(s){return s.name+(s.brightness?'（'+s.brightness+'）':'')+(s.mutagen?'生年化'+s.mutagen:'');}).join('、')+'。借星安宫以对宫主星参看（原星标记仍留对宫，借入'+r.title+'时力量约折半，主该宫事务易受外部环境或对宫牵引）'+(sitList.length?'；'+r.title+'本位实坐'+sitList.join('、')+'，断事须以本位实坐星曜与对宫借曜合参。':'。');
      out.push(b);
    }
    r.stars.filter(function(s){return MAJORS.includes(s.name);}).forEach(function(s){
      var level=['庙','旺'].includes(s.brightness)?'strong':['不','陷'].includes(s.brightness)?'weak':null;
      var detail=level&&d.details.find(function(o){return o.type==='brightness'&&o.palace===r.name&&o.star===s.name&&o.value===level&&(!o.brightnessValues||o.brightnessValues.includes(s.brightness));});
      if(level){
        var bText=detail?detail.text:s.name+'坐守'+r.title+'（主'+palFocus+'）：'+d.brightness[s.name][level];
        out.push(trace(card('bright-'+r.name+'-'+s.name,'庙旺落陷',detail?detail.title:s.name+' · '+s.brightness,bText,s.name+'实际在'+r.title+'，亮度为'+s.brightness,['quanshu','stars']),d,[detail?'detail:'+detail.id:'brightness:'+s.name+':'+level]));
      }
    });
    r.stars.forEach(function(s){var text=d.auxiliary[s.name]&&d.auxiliary[s.name][r.name];if(text)out.push(trace(card('aux-'+r.name+'-'+s.name,'辅曜煞曜',s.name+'在'+r.title,text,r.title+'实际坐守'+s.name,['quanshu','minor']),d,['aux:'+r.name+':'+s.name]));});
    if(r.major.length&&out[0]){
      var modTags=[],hasStrong=false,hasWeak=false,hasJi=false,hasGoodHua=false;
      r.stars.filter(function(s){return r.major.includes(s.name);}).forEach(function(s){
        var level=['庙','旺'].includes(s.brightness)?'strong':['不','陷'].includes(s.brightness)?'weak':null;
        var bright=level&&d.details.find(function(o){return o.type==='brightness'&&o.palace===r.name&&o.star===s.name&&o.value===level&&(!o.brightnessValues||o.brightnessValues.includes(s.brightness));});
        if(level==='strong')hasStrong=true;if(level==='weak')hasWeak=true;if(level)modTags.push(s.name+s.brightness);if(bright)out[0].trace.push(d.provenance['detail:'+bright.id]);
        if(s.mutagen){if(s.mutagen==='忌')hasJi=true;else hasGoodHua=true;modTags.push(s.name+'生年化'+s.mutagen);var detail=d.details.find(function(o){return o.type==='mutagen'&&o.palace===r.name&&o.star===s.name&&o.value===s.mutagen;});out[0].trace.push(d.provenance[detail?'detail:'+detail.id:'mutagen:'+s.name+s.mutagen]);}
      });
      var structNote=realTimeStructureNote(r);
      var coupleNote=(hasStrong||hasWeak)&&(hasJi||hasGoodHua)?'本盘耦合：'+modTags.join('、')+'。'+(hasWeak&&hasJi?'主星失地又逢生年化忌，本宫事项阻力与消耗偏重，分项释义见下方专卡。':hasStrong&&hasJi?'主星得庙旺有根基，但带生年化忌仍多反复牵挂，分项释义见下方专卡。':hasWeak&&hasGoodHua?'主星虽处陷地，得生年吉化引动调和，劳中见成，分项释义见下方专卡。':'主星得庙旺且逢生年吉化，本宫星系正向发挥更稳固，分项释义见下方专卡。'):'';
      if(structNote||coupleNote)out[0].extra=[structNote,coupleNote].filter(Boolean).join(' ');
    }
    return out;
  }
  function natalCards(d,r){
    var out=[];
    r.stars.filter(function(s){return HUA.includes(s.mutagen)&&s.mutagen;}).forEach(function(s){
      var note=d.starMutagens[s.name+s.mutagen];
      var detail=d.details.find(function(o){return o.type==='mutagen'&&o.palace===r.name&&o.star===s.name&&o.value===s.mutagen;});
      var nText=detail?detail.text:(note?note+'\n':'')+'落入'+r.title+'（'+r.ganzhi+'）：'+d.hua[r.name][s.mutagen];
      out.push(trace(card('natal-'+r.name+'-'+s.name,'生年四化',detail?detail.title:s.name+'化'+s.mutagen+'在'+r.title,nText,s.name+'实际在'+r.title+'，生年标记：'+s.mutagen,['quanshu','mutagen']),d,detail?['detail:'+detail.id]:['mutagen:'+s.name+s.mutagen,'hua:'+r.name+':'+s.mutagen]));
    });
    var present=unique(r.stars.map(function(s){return s.mutagen;}).filter(function(m){return m&&HUA.includes(m);}));
    Object.keys(d.huaPairs).forEach(function(key){if(key.split('').every(function(m){return present.includes(m);}))out.push(card('hua-pair-'+r.name+'-'+key,'四化并存',key.split('').map(function(m){return '化'+m;}).join('与')+'同宫',d.huaPairs[key],r.stars.filter(function(s){return key.includes(s.mutagen)&&s.mutagen;}).map(function(s){return s.name+'化'+s.mutagen;}).join('、'),['mutagen']));});
    return out;
  }
  function relationCards(d,r){
    var out=[],sf=[r].concat(r.trines,[r.opposite]);
    [['左辅','右弼','辅弼会照','左辅与右弼在三方四正交会，主推进'+r.title+'事务时有同辈、副手或合作班底分担协同，无需独力硬扛。'],['文昌','文曲','昌曲会照','文昌与文曲在三方四正交会，文字契约、专业资质、口才表达与学术才情共同赋能'+r.title+'。'],['天魁','天钺','魁钺会照','天魁阳贵与天钺阴贵在三方四正交会，主'+r.title+'事务多得长辈、上司或行业前辈明暗提携与引荐。'],['禄存','天马','禄马交会','禄存正财与天马驿马在三方四正交会（禄马交驰），主资源随走动、异地拓展、外贸流通或环境变化而快速增值。'],['擎羊','陀罗','羊陀会照','擎羊刚刃与陀罗暗忌同时会入三方四正，主'+r.title+'事务既有正面硬碰硬的竞争阻力，又伴随慢性拖延拉锯，宜刚柔并济。'],['火星','铃星','火铃会照','火星暴发与铃星阴火同时会入三方四正，主'+r.title+'事务易遇突发性变故、急件赶办与内在焦灼压力，戒冲动行事。'],['地空','地劫','空劫会照','地空与地劫同时会入三方四正，主'+r.title+'在世俗钱财实物上易有半途折耗或预期落差，宜以专业创意、轻资产或精神修养应空。']].forEach(function(g){
      if(g.slice(0,2).every(function(n){return sf.some(function(q){return has(q,n);});})){
        var positions=g.slice(0,2).map(function(n){var q=sf.find(function(q){return has(q,n);});return {star:n,palace:q.name,relation:q===r?'同宫':q===r.opposite?'对拱':'三合'};});
        var c=card('rel-'+r.name+'-'+g[0],'三方四正',g[2]+' · '+r.title,g[3]+'\n本盘形态：'+positions.map(function(o){return o.star+'在'+title(o.palace)+'，对'+r.title+'为'+o.relation;}).join('；')+'。',g.slice(0,2).map(function(n){return sf.filter(function(q){return has(q,n);}).map(function(q){return n+'在'+q.title;}).join('、');}).join('；'),['quanshu','minor']);c.conditions={center:r.name,positions:positions};out.push(c);
      }
    });
    var lu=sf.flatMap(function(q){return q.stars.filter(function(s){return s.mutagen==='禄';}).map(function(s){return s.name+'化禄在'+q.title;});});
    if(lu.length&&sf.some(function(q){return has(q,'天马');})&&!sf.some(function(q){return has(q,'禄存');}))out.push(card('rel-hualu-ma-'+r.name,'禄马关系','化禄会天马','生年化禄之活财机缘与天马相连，主'+r.title+'的机会在奔走、差旅、跨界流通与市场变化中涌现（此处为化曜活禄，与禄存正禄区分）。',lu.join('；')+'；'+sf.filter(function(q){return has(q,'天马');}).map(function(q){return '天马在'+q.title;}).join('、'),['mutagen','minor']));
    var ji=sf.flatMap(function(q){return q.stars.filter(function(s){return s.mutagen==='忌';}).map(function(s){return s.name+'化忌在'+q.title;});}),sha=sf.flatMap(function(q){return q.stars.filter(function(s){return SHA.includes(s.name);}).map(function(s){return s.name+'在'+q.title;});});
    if(ji.length&&sha.length)out.push(card('rel-shaji-'+r.name,'煞忌合参','化忌与煞曜同会','生年化忌之执着牵挂与四煞空劫之刚性阻力同聚'+r.title+'三方四正。化忌主反复操心，煞曜主正面冲撞、拖延或耗损，须针对具体煞忌落点逐一排雷，不可仅凭吉星同会而掉以轻心。',ji.concat(sha).join('；'),['quanshu','mutagen']));
    var sanqi=['禄','权','科'].map(function(m){var q=sf.find(function(x){return x.stars.some(function(s){return s.mutagen===m;});});if(!q)return null;var st=q.stars.find(function(s){return s.mutagen===m;});return st.name+'化'+m+'在'+q.title;});
    if(sanqi.every(Boolean))out.push(card('rel-sanqi-'+r.name,'三方四正','科权禄会照 · '+r.title,'生年化禄、化权、化科齐会'+r.title+'三方四正，财源机缘（禄）、掌局执行（权）与清誉贵人（科）相互呼应，对'+r.title+'事项形成强力联动支持。',sanqi.join('；'),['quanshu','mutagen']));
    var lucunAt=sf.filter(function(q){return has(q,'禄存');});
    if(lucunAt.length&&!sf.some(function(q){return has(q,'天马');}))out.push(card('rel-lucun-'+r.name,'三方四正','禄存拱照 · '+r.title,'三方四正见禄存正禄而未会天马，偏重稳健积蓄与既有根基守成，推进'+r.title+'事务宜步步为营、厚积薄发。',lucunAt.map(function(q){return '禄存在'+q.title+'（'+(q===r?'同宫':q===r.opposite?'对拱':'三合')+'）';}).join('；'),['quanshu','minor']));
    var hasPairedSha=out.some(function(c){return /^rel-.*-(擎羊|火星|地空)$/.test(c.id);}),sfSha=sf.flatMap(function(q){return q.stars.filter(function(s){return SHA.includes(s.name);}).map(function(s){return {star:s.name,palace:q.title};});});
    if(sfSha.length>=2&&!hasPairedSha)out.push(card('rel-mixsha-'+r.name,'三方四正','多煞会照 · '+r.title,'三方四正同时交会多颗煞曜（'+unique(sfSha.map(function(x){return x.star;})).join('、')+'），刚猛竞争、突发变动或暗中耗损并见，推进'+r.title+'事务宜留足安全冗余。',sfSha.map(function(x){return x.star+'在'+x.palace;}).join('；'),['quanshu','minor']));
    [['左辅','右弼','辅弼','左右邻宫分守左辅、右弼相夹，同辈与团队助力从两侧自然聚拢，'+r.title+'事务极易借力成事。'],['文昌','文曲','昌曲','左右邻宫分守文昌、文曲相夹，书香才气与合规文书从两侧拱卫，利'+r.title+'凭专业声誉与条理推进。'],['天魁','天钺','魁钺','左右邻宫分守天魁、天钺阴阳双贵相夹，长辈与上级提携之力贴身护持'+r.title+'。'],['紫微','天府','紫府','左右邻宫分守紫微、天府帝库双星相夹，高阶平台与稳厚资源从两侧托举'+r.title+'。'],['太阳','太阴','日月','左右邻宫分守太阳、太阴昼夜双贵相夹，内外明暗助力兼备，护持'+r.title+'格局稳固。'],['擎羊','陀罗','羊陀','左右邻宫分守擎羊、陀罗相夹（因本宫坐禄存所致），主'+r.title+'在持守正禄资源的同时，承受外部直接竞争与慢性拉锯双重夹制。'],['火星','铃星','火铃','左右邻宫分守火星、铃星相夹，突发催逼与暗中焦灼从两侧施压，处理'+r.title+'事务切忌急躁冲动。'],['地空','地劫','空劫','左右邻宫分守地空、地劫相夹，世俗物质投入与实际留存间易见落差，'+r.title+'宜重虚灵才智而忌重仓豪赌。']].forEach(function(g){
      var left=r.neighbors[0],right=r.neighbors[1];
      if(has(left,g[0])&&has(right,g[1])||has(left,g[1])&&has(right,g[0]))out.push(card('flank-'+r.name+'-'+g[0],'夹宫',g[2]+'夹'+r.title,g[3],left.title+'：'+left.stars.filter(function(s){return g.slice(0,2).includes(s.name);}).map(function(s){return s.name;}).join('、')+'；'+right.title+'：'+right.stars.filter(function(s){return g.slice(0,2).includes(s.name);}).map(function(s){return s.name;}).join('、'),['quanshu','pattern']));
    });
    return out;
  }
  var SANFANG_PATTERN_STARS={
    '君臣庆会':['紫微','左辅','右弼'],
    '廉杀羊':['廉贞','七杀','擎羊'],
    '巨火羊':['巨门','火星','擎羊'],
    '铃昌陀武':['铃星','文昌','陀罗','武曲'],
    '昌曲同会':['文昌','文曲'],
    '昌曲坐命':['文昌','文曲'],
    '辅弼同会':['左辅','右弼'],
    '魁钺同会':['天魁','天钺'],
    '双禄朝垣':['禄存']
  };
  function patternCards(d,rows){
    if(!global.WZBZPatternRules)return [];
    var ming=rows.find(function(r){return r.name==='命宫';}),body=rows.find(function(r){return r.body;}),mingSf=[ming].concat(ming.trines,[ming.opposite]);
    var adapted={mingGongBranch:ming.branch,shenGongBranch:body?body.branch:ming.branch,palaces:rows.map(function(r){return {name:r.name,branch:r.branch,stem:'甲乙丙丁戊己庚辛壬癸'.indexOf(r.ganzhi[0]),stars:r.stars.map(function(s){return {name:s.name,type:MAJORS.includes(s.name)?'major':SHA.includes(s.name)?'sha':'minor',siHua:s.mutagen||undefined,brightness:['庙','旺'].includes(s.brightness)?'bright':['陷','不'].includes(s.brightness)?'dim':'normal',brightnessRaw:s.brightness};})};})};
    // The pinned detector calls an empty 未宫 borrowing 丑宫日月 “明珠出海”.
    // Keep upstream intact, but use the reviewed 卯日/亥月 three-harmony form here.
    var found=global.WZBZPatternRules.detect(adapted).filter(function(p){return !['明珠出海','马头带箭'].includes(p.name);});
    var sun=rows.find(function(r){return r.branch===3&&has(r,'太阳');}),moon=rows.find(function(r){return r.branch===11&&has(r,'太阴');});
    if(ming.branch===7&&!ming.major.length&&sun&&moon){found.push({name:'明珠出海',variant:'未空卯日亥月',palaces:['命宫',sun.name,moon.name],conditions:{required:['命宫未宫无十四主星','太阳在卯、太阴在亥，三合会命'],breaking:mingSf.flatMap(function(r){return r.stars.filter(function(s){return SHA.includes(s.name)||s.mutagen==='忌';}).map(function(s){return r.title+'见'+s.name+(s.mutagen==='忌'?'化忌':'');});})}});}
    if(ming.branch===6&&has(ming,'擎羊')){
      var actual=['天同','太阴'].every(function(n){return ming.major.includes(n);}),borrow=!ming.major.length&&['天同','太阴'].every(function(n){return ming.opposite.major.includes(n);});
      if(actual||borrow)found.push({name:'马头带箭',palaces:borrow?['命宫',ming.opposite.name]:['命宫'],variant:actual?'同阴实坐':'空宫借同阴',readingText:(actual?'午宫天同太阴同守，擎羊同宫。':'午宫命宫无主星，擎羊坐命；天同太阴实际在对宫'+ming.opposite.title+'，按借曜取法参看。')+'天同重安定，擎羊带竞争与执行压力；此组合读为安逸倾向受到推动，行动与承担加重。',conditions:{required:['命宫在午','擎羊坐命',actual?'天同太阴同守午宫':'命宫空宫，对宫天同太阴'],breaking:ming.stars.filter(function(s){return s.mutagen==='忌';}).map(function(s){return s.name+'生年化忌';})}});
      else if(ming.stars.some(function(s){return s.name==='贪狼'&&s.mutagen==='禄';}))found.push({name:'马头带箭 · 贪狼旁格',palaces:['命宫'],variant:'午贪化禄遇羊旁格',readingText:'午宫贪狼化禄与擎羊同坐，按贪狼旁格单列。贪狼的欲求、经营与交际被化禄放大，擎羊使取得资源的过程带有直接竞争。',conditions:{required:['命宫午宫','贪狼生年化禄','擎羊同宫']}});
    }
    [['紫微','贪狼','紫贪同宫'],['天机','天梁','机梁同宫'],['太阳','天梁','阳梁同宫'],['天同','太阴','同阴同宫']].forEach(function(g){
      [ming,body].filter(Boolean).forEach(function(target){
        if(target.major.length===2&&target.major.includes(g[0])&&target.major.includes(g[1])&&!found.some(function(p){return p.name===g[2];})){
          found.push({name:g[2],palaces:[target.name],conditions:{required:[g[0]+g[1]+'同守'+target.title]}});
        }
      });
    });
    return found.map(function(p,i){
      var rawNames=unique((p.palaces||['命宫']).map(function(n){return n==='身宫'&&body?body.name:name(n);}));
      var locations=rawNames.map(function(n){return rows.find(function(r){return r.name===n;});}).filter(Boolean);
      var targetStars=SANFANG_PATTERN_STARS[p.name];
      if(targetStars){
        var sfHits=mingSf.filter(function(r){return r.stars.some(function(s){return targetStars.includes(s.name)||(p.name==='双禄朝垣'&&s.mutagen==='禄');});});
        if(sfHits.length)locations=unique([ming].concat(sfHits));
      }else if(p.name==='三奇加会'||p.name==='科权双会'){
        var mutList=p.name==='三奇加会'?['禄','权','科']:['科','权'];
        var mutHits=mingSf.filter(function(r){return r.stars.some(function(s){return mutList.includes(s.mutagen);});});
        if(mutHits.length)locations=unique([ming].concat(mutHits));
      }
      var anchor=locations.length===1?locations[0]:null;
      var localPair=anchor&&anchor.major.length===2&&['紫府同宫','廉贞天相格','武曲七杀','天同天梁格','日月同宫','巨日同宫','紫贪同宫','机梁同宫','阳梁同宫','同阴同宫'].includes(p.name);
      var bKey=localPair?MAJORS.filter(function(n){return anchor.major.includes(n);}).join('')+':'+anchor.branch:'';
      var text=p.readingText||(localPair?anchor.title+'（'+anchor.ganzhi+'）'+anchor.major.join('、')+'同度成格，聚焦'+d.palaceNotes[anchor.name].replace(/^看|。$/g,'')+'。'+(PAIR_BRANCH_NOTES[bKey]?PAIR_BRANCH_NOTES[bKey]+' ':'')+describe(d,anchor).split('。')[0]+'。'+(anchor.name==='命宫'?'双星同坐命宫直立个人主轴格局，成色高低视三方吉辅与煞忌轻重而定。':'此格落于'+anchor.title+'，按该宫三方四正会照条件评定专项助力与阻力。'):d.patternMeanings[p.name]);
      if(!text&&p.name.endsWith('化禄入命')){var lStar=p.name.replace('化禄入命','');text=lStar+'生年化禄坐守命宫（'+ming.ganzhi+'），全盘生年禄元归入命垣，个人切入事务较易获得顺势机缘与人缘支持；三方四正若少煞忌冲破，则财官联动更为稳固。';}
      if(!text&&/化忌入[命迁]$/.test(p.name)){var jStar=p.name.replace(/化忌入[命迁]$/,''),inMing=p.name.endsWith('入命');text=inMing?jStar+'生年化忌坐守命宫（'+ming.ganzhi+'）并直冲对宫迁移宫（'+ming.opposite.ganzhi+'），构成命迁轴线带忌格局，主行事执着操心、凡事亲历而外缘变动较多，宜凭专长一艺深耕。':jStar+'生年化忌落迁移宫（'+ming.opposite.ganzhi+'）并由外向内直冲命宫（'+ming.ganzhi+'），主外出奔波或外部环境交接易生周折，宜稳守内功而不宜盲目远求冒进。';}
      if(!text)return null;
      var evidence=(p.conditions&&p.conditions.required||[]).join('；');
      evidence+='；实际涉及：'+locations.map(function(r){
        var extraStars=targetStars?r.stars.filter(function(s){return !r.major.includes(s.name)&&(targetStars.includes(s.name)||(p.name==='双禄朝垣'&&s.mutagen==='禄'));}).map(function(s){return s.name+(s.mutagen?'化'+s.mutagen:'');}):[];
        var starLabels=r.major.concat(extraStars);
        return r.title+' '+r.ganzhi+'（'+(starLabels.join('、')||'空宫')+'）';
      }).join('、');
      if(p.name==='科权双会'||p.name==='三奇加会')evidence+='；'+mingSf.flatMap(function(r){return r.stars.filter(function(s){return (p.name==='三奇加会'?['禄','权','科']:['科','权']).includes(s.mutagen);}).map(function(s){return s.name+'化'+s.mutagen+'在'+r.title;});}).join('、');
      var c=trace(card('pattern-'+i,localPair?'同宫星系':p.conditions?'格局条件':'基础配置',p.name,text,evidence,['upstream','pattern']),d,[localPair?'pair:'+anchor.name+':'+MAJORS.filter(function(n){return anchor.major.includes(n);}).join(''):'pattern:'+p.name]);
      c.palaces=locations.map(function(r){return r.name;});c.variant=p.variant||'';c.ruleId='pattern:'+p.name+(c.variant?':'+c.variant:'');
      c.bonus=p.conditions&&p.conditions.bonus||[];c.breaking=p.conditions&&p.conditions.breaking||[];c.originalSource=p.source||'';return c;
    }).filter(Boolean);
  }
  var FLIGHT_DOMAINS={
    命宫:'个人行事主轴与核心立场',兄弟:'手足同辈往来与现金流周转',夫妻:'伴侣婚姻互动与感情状态',
    子女:'子女培育、晚辈门生与合伙投入',财帛:'求财渠道、收支吞吐与现金支配',疾厄:'身心状态、日常劳顿与实体根基',
    迁移:'外部机缘、异地出行与社会形象',仆役:'朋友同僚、下属团队与客户协作',官禄:'事业推进、职场权责与专业发展',
    田宅:'家宅置业、不动产财库与家庭环境',福德:'精神心境、理念嗜好与深层福泽',父母:'父母长辈缘分、上司关系与文书契约'
  };
  function flightCards(d,chart,rows,r,mode,edges){
    if(mode==='sanhe'||!global.FiveArtsEngine||typeof global.FiveArtsEngine.transformations!=='function')return [];
    var out=[],all=edges||rows.flatMap(function(q){return global.FiveArtsEngine.transformations(chart,q.index);});
    function row(i){return rows.find(function(q){return q.index===i;});}
    all.forEach(function(f){
      var mut=f.mutagen||HUA['ABCD'.indexOf(f.code)];if(f.target<0||!mut)return;
      var isDirect=f.source===r.index||f.target===r.index;
      var isClash=mut==='忌'&&r.opposite&&f.target===r.opposite.index&&f.source!==r.index&&f.source!==r.opposite.index;
      if(!isDirect&&!isClash)return;
      var from=row(f.source),to=row(f.target);if(!from||!to)return;
      var evidence=from.title+'宫干'+from.ganzhi[0]+'使'+to.title+'的'+f.star+'化'+mut;
      var text,tech,heading;
      if(from===to){tech=mode==='qintian'?'离心自化':'宫干自化';heading=to.title+'自化'+mut+' · '+f.star;text=to.title+'宫干使该宫的'+f.star+'化'+mut+'。'+d.self[mut].replace(/本宫/g,to.title);}
      else if(from.branch===(to.branch+6)%12){tech=mode==='qintian'?'向心自化':'对宫化入';heading=from.title+' → '+to.title+' · '+(mode==='qintian'?'向心':'化')+mut;text=from.title+'与'+to.title+'互为对宫，由'+from.title+'宫干使'+to.title+'的'+f.star+'化'+mut+'。'+d.incoming[mut].replace(/本宫/g,to.title).replace(/对宫/g,from.title);}
      else if(isClash){
        tech='飞忌冲宫';heading=from.title+'化忌入'+to.title+'冲'+r.title;
        text=from.title+'（主'+FLIGHT_DOMAINS[from.name]+'）宫干引动'+to.title+'之'+f.star+'化忌，由对宫直冲'+r.title+'（飞星诀云“忌入犹可解，忌冲最难当”）。主'+from.title+'相关的压力或变动透过外境直接冲击'+r.title+'所辖之'+FLIGHT_DOMAINS[r.name]+'，涉及该轴线事项宜稳守避锋。';
      }else{
        tech=f.source===r.index?'本宫飞出':'别宫飞入';heading=from.title+'化'+mut+'入'+to.title;
        var srcDom=FLIGHT_DOMAINS[from.name],dstDom=FLIGHT_DOMAINS[to.name];
        var acts={
          禄:'将顺遂机缘、人情善意与资源增量挹注于'+to.title+'（'+dstDom+'），两宫事务形成正向互利联动。',
          权:'将主导意志、责任要求与执行压力推进至'+to.title+'（'+dstDom+'），促使其积极扩权担事。',
          科:'以声誉信誉、合规文书或温和协商连接'+to.title+'（'+dstDom+'），遇阻可借专业与贵人转圜。',
          忌:'将心力牵挂、执念投入或收支压力锁定在'+to.title+'（'+dstDom+'），该处往往是付出最多且最难放下的焦点。'
        };
        text=from.title+'（主'+srcDom+'）宫干使'+to.title+'之'+f.star+'化'+mut+'，'+acts[mut];
      }
      var note=d.starMutagens[f.star+mut];if(note)text+='\n化曜是'+f.star+'：'+note;
      var c=trace(card('flight-'+f.source+'-'+f.target+'-'+mut,tech,heading,text,evidence,['mutagen']),d,['mutagen:'+f.star+mut]);
      c.sourcePalace=from.name;c.targetPalace=to.name;c.layer='palace-stem';c.school=mode;c.ruleId='flight:'+mode+':'+tech+':'+mut;c.conditions={source:from.index,target:to.index,star:f.star,mutagen:mut};
      if(mut==='忌'&&from!==to){c.extra='忌入'+to.title+'，对宫受冲位置为'+to.opposite.title+'（'+to.opposite.ganzhi+'）。';}
      var overlays=[];
      var natal=to.stars.find(function(s){return s.name===f.star&&s.mutagen;});
      var otherNatal=to.stars.filter(function(s){return s.name!==f.star&&s.mutagen;});
      if(natal){
        var colDesc=mut==='忌'&&natal.mutagen==='忌'?'双忌同星交叠，压力与纠结成倍放大，切忌强求硬推':(mut==='忌'&&natal.mutagen==='禄')||(mut==='禄'&&natal.mutagen==='忌')?'禄忌同星交战，机缘之中暗藏损耗，宜见好就收':'飞化引动原局生年化'+natal.mutagen+'，吉凶动象显著放大';
        overlays.push(f.star+'同带生年化'+natal.mutagen+'与'+from.title+'飞化'+mut+'（'+colDesc+'）');
      }else if(otherNatal.length){
        var oDesc=mut==='忌'&&otherNatal.some(function(s){return s.mutagen==='忌';})?'构成双忌同宫，阻力与劳心加重':(mut==='忌'&&otherNatal.some(function(s){return s.mutagen==='禄';}))||(mut==='禄'&&otherNatal.some(function(s){return s.mutagen==='忌';}))?'构成同宫禄忌交战，得失起伏明显':'形成同宫四化共振';
        overlays.push(to.title+'另有'+otherNatal.map(function(s){return s.name+'生年化'+s.mutagen;}).join('、')+'（'+oDesc+'）');
      }
      if(from!==to){
        var selfEdge=all.find(function(e){return e.source===to.index&&e.target===to.index;});
        if(selfEdge){var sMut=selfEdge.mutagen||HUA['ABCD'.indexOf(selfEdge.code)];if(sMut)overlays.push(to.title+'自身逢宫干自化'+sMut+'（飞入逢自化），气机进入后易再生变数或外泄');}
      }
      if(overlays.length)c.overlay=overlays.join('；')+'。';
      out.push(c);
    });
    return out;
  }
  function flowCards(d,rows,options){
    var scope=options.flowScope,flow=options.flow;if(!scope||!flow||!Array.isArray(flow.mutagen)||flow.mutagen.length!==4||!Array.isArray(flow.palaceNames)||flow.palaceNames.length!==12)return [];
    var label=flow.name||({decadal:'大限',yearly:'流年',monthly:'流月',daily:'流日',hourly:'流时',age:'小限'})[scope]||'运限',out=[];
    flow.mutagen.forEach(function(star,j){var target=rows.find(function(r){return r.stars.some(function(s){return s.name===star;});});if(!target)return;var flowName=name(flow.palaceNames[target.index]);if(!PALACES.includes(flowName))return;
      var mut=HUA[j],actual=target.stars.find(function(s){return s.name===star;}),note=d.starMutagens[star+mut]||'',natalFocus=(d.palaceNotes[target.name]||'').replace(/^看|。$/g,'');
      var text=label+title(flowName)+'叠本命'+target.title+'，实际化曜为'+star+'化'+mut+'。\n'+note+'\n'+label+title(flowName)+'应象：'+d.hua[flowName][mut];
      text+='\n体用落点：以本命'+target.title+'（'+target.ganzhi+'，主'+natalFocus+'）为体承接此化曜，'+star+(actual.brightness?'原盘亮度'+actual.brightness:'坐守此宫')+'，同宫主星为'+(target.major.join('、')||'空宫借'+target.opposite.major.join('、'))+'。';
      var c=trace(card('flow-'+scope+'-'+star,'运限四化',label+' · '+star+'化'+mut,text,(options.flowDate||'')+' · '+label+title(flowName)+'叠本命'+target.title+' '+target.ganzhi,['mutagen','palace']),d,['mutagen:'+star+mut,'hua:'+flowName+':'+mut]);
      c.layer=scope;c.ruleId='flow:'+scope+':'+mut;c.conditions={star:star,mutagen:mut,natalPalace:target.name,flowPalace:flowName};
      var n=target.stars.find(function(s){return s.name===star&&s.mutagen;}),otherN=target.stars.filter(function(s){return s.name!==star&&s.mutagen;});
      if(n){
        var pairEffect=mut==='忌'&&n.mutagen==='忌'?'双忌同星叠加，当期该宫事务压力尤为集中，切忌冒进':(mut==='忌'&&n.mutagen==='禄')||(mut==='禄'&&n.mutagen==='忌')?'流化与生年禄忌交冲，顺境中须防突发破耗或人事反复':'运限引动原局生年化'+n.mutagen+'，吉凶应象显著增强';
        c.overlay='生年化'+n.mutagen+'与'+label+'化'+mut+'同在'+star+'：'+pairEffect+'。';
      }else if(otherN.length){
        var oEffect=mut==='忌'&&otherN.some(function(s){return s.mutagen==='忌';})?'形成同宫双忌交会，须防该宫事项多重受阻':(mut==='忌'&&otherN.some(function(s){return s.mutagen==='禄';}))||(mut==='禄'&&otherN.some(function(s){return s.mutagen==='忌';}))?'形成同宫禄忌碰撞，进退得失波动加剧':'与原局生年四化同宫呼应';
        c.overlay=target.title+'宫内另有'+otherN.map(function(s){return s.name+'生年化'+s.mutagen;}).join('、')+'，与'+label+star+'化'+mut+oEffect+'。';
      }
      if(mut==='忌'&&target.opposite){var oppF=name(flow.palaceNames[target.opposite.index]);c.extra=label+'化忌落本命'+target.title+'，直冲对宫本命'+target.opposite.title+'（'+target.opposite.ganzhi+(PALACES.includes(oppF)?' · '+label+title(oppF):'')+'）；坐忌宫防反复纠缠，受冲对宫尤防突发变动与外力冲击。';}
      c.index=target.index;out.push(c);
    });return out;
  }
  function lifeCards(d,rows,chart,options){
    var out=[],ming=rows.find(function(r){return r.name==='命宫';}),body=rows.find(function(r){return r.body;}),original=rows.find(function(r){return r.original;});
    if(body)out.push(card('body','命身合读',body===ming?'命身同宫':'身宫在'+body.title,body===ming?'命宫与身宫同坐'+ming.ganzhi+'（'+(ming.major.join('、')||'空宫借'+ming.opposite.major.join('、'))+'），先天行事取向与后天投入重心合一，一生目标感笃定，中晚年仍沿个人主轴深耕。':'先天命宫在'+ming.ganzhi+'（'+(ming.major.join('、')||'空宫借'+ming.opposite.major.join('、'))+'），后天身宫落入'+body.title+'（'+body.ganzhi+'，'+(body.major.join('、')||'空宫借'+body.opposite.major.join('、'))+'）。'+d.palaceNotes[body.name].replace(/^看/,'三十岁后精力与现实重心渐归于')+(body.stars.some(function(s){return !!s.mutagen;})?'身宫带生年'+body.stars.filter(function(s){return !!s.mutagen;}).map(function(s){return s.name+'化'+s.mutagen;}).join('、')+'，该宫事务对人生后半程牵引尤深。':'命为先天之体、身为后天之用，随阅历增长行事愈发看重'+body.title+'得失。'),'命宫：'+ming.ganzhi+'；身宫：'+body.title+' '+body.ganzhi,['palace']));
    if(options.mode==='qintian'&&original)out.push(card('original','来因宫','来因在'+original.title,'来因宫为生年天干所在之宫，即全盘生年四化气机发动之源头。本盘由'+original.title+'（'+original.ganzhi+'）化出全盘生年禄权科忌，阅读时须将'+original.title+'所主之事与四化落宫串联参看。\n'+d.palaceNotes[original.name],original.title+' '+original.ganzhi+' · 本盘来因标记',['mutagen']));
    [['soul','命主'],['body','身主']].forEach(function(g){var star=name(chart[g[0]]);if(!star)return;var at=rows.find(function(r){return has(r,star);});if(at){var st=at.stars.find(function(s){return s.name===star;});out.push(card('master-'+g[0],'命主身主',g[1]+' · '+star,g[1]+'为「'+star+'」，实盘落入'+at.title+'（'+at.ganzhi+(st&&st.brightness?'，亮度'+st.brightness:'')+(st&&st.mutagen?'，生年化'+st.mutagen:'')+'）。'+(g[0]==='soul'?'命主按命宫地支起星，代表先天魂魄底气与深层驱动力':'身主按生年地支起星，代表后天处世魄力与现实承载面')+'，落于'+at.title+'提示'+d.palaceNotes[at.name].replace(/^看/,'其力量多借由').replace(/。$/,'来兑现。'),g[1]+'星落入'+at.title+' '+at.ganzhi+'，参看该宫吉煞与四化联动。',['palace','stars']));}});
    if(chart.fiveElementsClass){
      var bNote=FIVE_BUREAU_NOTES[chart.fiveElementsClass]||'定紫微星位与大限起运岁数。';
      out.push(card('five-elements','五行局',chart.fiveElementsClass,'本盘命局为'+chart.fiveElementsClass+'：'+bNote+(ming.decadal&&ming.decadal.range?' 依此局数自'+ming.decadal.range[0]+'虚岁起行第一步十年大限（'+ming.decadal.range.join('—')+'虚岁在命宫）。':''),'命局五行：'+chart.fiveElementsClass+(ming.decadal&&ming.decadal.range?' · 起运'+ming.decadal.range[0]+'虚岁':''),['palace']));
    }
    return out.concat(flowExtraCards(d,rows,options),flowCards(d,rows,options));
  }
  function analyse(d,chart,options){
    options=options||{};var facts=cachedFacts(d,chart);if(!facts)return null;var rows=facts.rows;
    var current=rows.find(function(r){return r.index===options.selected;})||rows[0];
    var mode=options.mode||'sanhe',key=mode+':'+current.index;
    if(!facts.relations[current.index])facts.relations[current.index]=relationCards(d,current);
    if(mode!=='sanhe'&&!facts.edges)facts.edges=rows.flatMap(function(q){return global.FiveArtsEngine.transformations(chart,q.index);});
    if(!facts.flights[key])facts.flights[key]=flightCards(d,chart,rows,current,mode,facts.edges);
    return {rows:rows,current:current,relations:facts.relations[current.index],patterns:facts.patterns,flights:facts.flights[key],life:lifeCards(d,rows,chart,options),misc:current.misc,layer:'natal',scope:options.flowScope||'',policy:d.schoolPolicy[mode]};
  }
  function cachedFacts(d,chart){
    if(!validChart(chart))return null;
    var fingerprint=JSON.stringify(chart.palaces.map(function(p){return [p.name,p.earthlyBranch,p.heavenlyStem,p.isBodyPalace,p.isOriginalPalace,p.decadal,p.ages,p.changsheng12,p.boshi12,p.jiangqian12,p.suiqian12,readStars(p)];}));
    var old=factsCache.get(chart);if(old&&old.bank===d&&old.fingerprint===fingerprint)return old;
    var rows=makeRows(d,chart),facts={bank:d,fingerprint:fingerprint,rows:rows,patterns:patternCards(d,rows),relations:{},flights:{},edges:null};factsCache.set(chart,facts);return facts;
  }
  function flowStarNote(names){
    var notes=[];(names||[]).forEach(function(n){
      if(/禄$/.test(n))notes.push('添财源机缘');else if(/马$/.test(n))notes.push('主动迁奔走');else if(/羊$/.test(n))notes.push('防刚急争执');else if(/陀$/.test(n))notes.push('防拖延纠缠');else if(/[昌曲]$/.test(n))notes.push('利文书考学');else if(/[魁钺]$/.test(n))notes.push('得贵人提携');else if(/[鸾喜]$/.test(n))notes.push('添人缘喜庆');else if(/解$/.test(n))notes.push('助排忧解厄');
    });return unique(notes).join('、');
  }
  function flowExtraCards(d,rows,options){
    var scope=options.flowScope,flow=options.flow;if(!scope||!flow||!Array.isArray(flow.palaceNames)||flow.palaceNames.length!==12)return [];
    var label=flow.name||({decadal:'大限',yearly:'流年',monthly:'流月',daily:'流日',hourly:'流时',age:'小限'})[scope]||'运限',out=[];
    var fMingIdx=flow.palaceNames.findIndex(function(x){return name(x)==='命宫';}),fMing=rows.find(function(r){return r.index===fMingIdx;});
    var dec=options.horoscope&&options.horoscope.decadal,yr=options.horoscope&&options.horoscope.yearly;
    if(fMing&&dec&&scope!=='decadal'&&Array.isArray(dec.palaceNames)&&dec.palaceNames.length===12){
      var dMingIdx=dec.palaceNames.findIndex(function(x){return name(x)==='命宫';}),dMing=rows.find(function(r){return r.index===dMingIdx;}),dRole=name(dec.palaceNames[fMingIdx]);
      var yrClause='';
      if(['monthly','daily','hourly'].includes(scope)&&yr&&Array.isArray(yr.palaceNames)&&yr.palaceNames.length===12){
        var yMingIdx=yr.palaceNames.findIndex(function(x){return name(x)==='命宫';}),yMing=rows.find(function(r){return r.index===yMingIdx;}),yRole=name(yr.palaceNames[fMingIdx]);
        yrClause='流年命宫在'+(yMing?yMing.title+'（'+yMing.ganzhi+'）':'—')+'，当期'+label+'命宫同时叠作「流年'+(PALACES.includes(yRole)?title(yRole):'重点宫')+'」；';
      }
      var dJi=Array.isArray(dec.mutagen)&&dec.mutagen[3],fJi=Array.isArray(flow.mutagen)&&flow.mutagen[3],dJiAt=dJi&&rows.find(function(r){return has(r,dJi);}),fJiAt=fJi&&rows.find(function(r){return has(r,fJi);});
      var jiNote=dJiAt&&fJiAt?(dJiAt.index===fJiAt.index||dJiAt.opposite.index===fJiAt.index?'大限'+dJi+'化忌（本命'+dJiAt.title+'）与'+label+fJi+'化忌（本命'+fJiAt.title+'）同轴交冲，此轴线事务须格外谨守防变。':'大限'+dJi+'化忌在本命'+dJiAt.title+'，'+label+fJi+'化忌在本命'+fJiAt.title+'（冲'+fJiAt.opposite.title+'），留意两处压力呼应。'):'';
      var ax=card('flow-axis-'+scope,'运限叠宫','大限与'+label+' · 三层叠宫主轴','十年大限命宫叠本命'+(dMing?dMing.title+'（'+dMing.ganzhi+'）':'命盘')+'，十年基调重在'+(dMing?d.palaceNotes[dMing.name].replace(/^看|。$/g,''):'本命主轴')+'。\n'+yrClause+'当期'+label+'命宫落本命'+fMing.title+'（'+fMing.ganzhi+'），叠作「大限'+(PALACES.includes(dRole)?title(dRole):'重点宫')+'」，即以本命'+fMing.title+'所主人事回应大限'+(PALACES.includes(dRole)?title(dRole):'阶段')+'课题。'+(jiNote?'\n'+jiNote:''),(options.flowDate||'')+' · 大限命叠'+(dMing?dMing.title:'—')+'，'+label+'命叠'+fMing.title+'（大限'+(PALACES.includes(dRole)?title(dRole):'—')+'）',['palace','mutagen']);
      ax.layer=scope;out.push(ax);
    }else if(fMing){
      var roles=['财帛','官禄','迁移'].map(function(rn){var idx=flow.palaceNames.findIndex(function(x){return name(x)===rn;}),at=rows.find(function(r){return r.index===idx;});return at?label+title(rn)+'叠本命'+at.title:'';}).filter(Boolean);
      var ax2=card('flow-axis-'+scope,'运限叠宫',label+'命迁财官叠宫主轴',label+'命宫叠本命'+fMing.title+'（'+fMing.ganzhi+'，'+(fMing.major.join('、')||'空宫借'+fMing.opposite.major.join('、'))+'），当期重心转向'+d.palaceNotes[fMing.name].replace(/^看|。$/g,'')+'；三方同步牵动：'+roles.join('、')+'。',(options.flowDate||'')+' · '+label+'命宫在'+fMing.ganzhi,['palace']);
      ax2.layer=scope;out.push(ax2);
    }
    if(Array.isArray(flow.stars)&&flow.stars.length===12){
      var hits=[],evList=[];
      rows.forEach(function(r){
        var sList=(flow.stars[r.index]||[]).map(function(s){return s&&s.name;}).filter(Boolean);if(!sList.length)return;
        var fRole=name(flow.palaceNames[r.index]),fTitle=PALACES.includes(fRole)?label+title(fRole):r.title;
        var shaStack=sList.some(function(n){return /[羊陀]$/.test(n);})&&(r.stars.some(function(s){return SHA.includes(s.name)||s.mutagen==='忌';})),luMa=sList.some(function(n){return /禄$/.test(n);})&&(sList.some(function(n){return /马$/.test(n);})||has(r,'天马')||has(r,'禄存')),luanXi=sList.some(function(n){return /[鸾喜]$/.test(n);})&&['命宫','迁移','夫妻','子女'].includes(fRole);
        if(['命宫','财帛','官禄','迁移','夫妻'].includes(fRole)||shaStack||luMa||luanXi){
          var hint=flowStarNote(sList);
          hits.push(fTitle+'（本命'+r.title+'）见'+sList.join('、')+(shaStack?'，叠原局煞忌须防突发冲撞耗损':luMa?'，禄马同度利走动求财开拓':hint?'，'+hint:''));
          evList.push(r.title+'：'+sList.join('、'));
        }
      });
      if(hits.length){var sc=card('flow-stars-'+scope,'运限流曜',label+'流曜重点落宫',hits.slice(0,5).join('；')+'。',evList.slice(0,6).join('；'),['minor','palace']);sc.layer=scope;out.push(sc);}
    }
    return out;
  }
  global.WZBZInterpretation=Object.freeze({validate:validate,validChart:validChart,match:makeRows,analyse:analyse,relations:relationCards,patterns:patternCards,flights:flightCards,flow:flowCards,flowStarNote:flowStarNote,title:title});
})(window);
