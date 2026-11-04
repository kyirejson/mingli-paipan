(function(global){
  'use strict';
  var BRANCHES='子丑寅卯辰巳午未申酉戌亥',HUA='禄权科忌';
  var MAJORS='紫微 天机 太阳 武曲 天同 廉贞 天府 太阴 贪狼 巨门 天相 天梁 七杀 破军'.split(' ');
  var PALACES='命宫 兄弟 夫妻 子女 财帛 疾厄 迁移 仆役 官禄 田宅 福德 父母'.split(' ');
  var SHA=['擎羊','陀罗','火星','铃星','地空','地劫'];
  var PAIRS=['紫微天府','紫微贪狼','紫微天相','紫微七杀','紫微破军','天机太阴','天机巨门','天机天梁','太阳太阴','太阳巨门','太阳天梁','武曲天府','武曲贪狼','武曲天相','武曲七杀','武曲破军','天同太阴','天同巨门','天同天梁','廉贞天府','廉贞贪狼','廉贞天相','廉贞七杀','廉贞破军'];
  var factsCache=new WeakMap();
  var LEGAL_HUA={禄:['廉贞','天机','天同','太阴','贪狼','武曲','太阳','巨门','天梁','破军'],权:['破军','天梁','天机','天同','太阴','贪狼','武曲','太阳','紫微','巨门'],科:['武曲','紫微','文昌','天机','右弼','天梁','太阴','文曲','左辅'],忌:['太阳','太阴','廉贞','巨门','天机','文曲','天同','文昌','武曲','贪狼']};
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
    rows.forEach(function(r){r.cards=palaceCards(d,r);r.natal=natalCards(d,r);r.contexts=r.stars.map(function(s){return d.contexts[r.name+':'+s.name];}).filter(Boolean);r.misc=r.stars.filter(function(s){return !!d.misc[s.name];}).map(function(s){return trace(card('misc-'+r.name+'-'+s.name,'杂曜象义',s.name+'在'+r.title,d.misc[s.name],r.title+'实际坐守'+s.name,['misc']),d,['misc:'+s.name]);});});
    return rows;
  }
  function describe(d,r){
    var pair=r.major.length===2?d.pairs.find(function(p){return p.stars.every(function(n){return r.major.includes(n);});}):null;
    if(pair)return pair.palaces[r.name];
    return r.major.map(function(n){return d.profiles[n][r.name];}).join('');
  }
  function palaceCards(d,r){
    var out=[],evidence=r.title+' '+r.ganzhi+' · '+(r.major.join('、')||'无十四主星');
    if(r.major.length)out.push(trace(card('core-'+r.name,'本宫星系',r.major.join('、')+(r.major.length>1?'同守':'守')+r.title,describe(d,r),evidence),d,[r.major.length===2?'pair:'+r.name+':'+MAJORS.filter(function(n){return r.major.includes(n);}).join(''):'profile:'+r.name+':'+r.major[0]]));
    else if(r.opposite&&r.opposite.major.length){
      var borrowed={name:r.name,major:r.opposite.major};
      var b=card('borrow-'+r.name,'空宫借曜','参看对宫'+r.opposite.major.join('、'),describe(d,borrowed),'本宫无十四主星；参看'+r.opposite.title+' '+r.opposite.ganzhi+'。星曜仍在对宫。',['quanshu','palace']);
      b.extra=r.opposite.title+'实际状态：'+r.opposite.stars.filter(function(s){return r.opposite.major.includes(s.name);}).map(function(s){return s.name+(s.brightness?'（'+s.brightness+'）':'')+(s.mutagen?'生年化'+s.mutagen:'');}).join('、')+'。这些标记留在对宫，未复制到'+r.title+'。';out.push(b);
    }
    r.stars.filter(function(s){return MAJORS.includes(s.name);}).forEach(function(s){
      var level=['庙','旺'].includes(s.brightness)?'strong':['不','陷'].includes(s.brightness)?'weak':null;
      var detail=level&&d.details.find(function(o){return o.type==='brightness'&&o.palace===r.name&&o.star===s.name&&o.value===level&&(!o.brightnessValues||o.brightnessValues.includes(s.brightness));});
      if(level)out.push(trace(card('bright-'+r.name+'-'+s.name,'庙旺落陷',detail?detail.title:s.name+' · '+s.brightness,detail?detail.text:d.brightness[s.name][level],s.name+'实际在'+r.title+'，亮度为'+s.brightness,['quanshu','stars']),d,[detail?'detail:'+detail.id:'brightness:'+s.name+':'+level]));
      else if(d.brightnessLevels[s.brightness])out.push(card('bright-'+r.name+'-'+s.name,'亮度定位',s.name+' · '+s.brightness,d.brightnessLevels[s.brightness],s.name+'实际在'+r.title+'，沿用排盘亮度表',['stars']));
    });
    r.stars.forEach(function(s){var text=d.auxiliary[s.name]&&d.auxiliary[s.name][r.name];if(text)out.push(trace(card('aux-'+r.name+'-'+s.name,'辅曜煞曜',s.name+'在'+r.title,text,r.title+'实际坐守'+s.name,['quanshu','minor']),d,['aux:'+r.name+':'+s.name]));});
    if(r.major.length&&out[0]){
      var modifiers=[];
      r.stars.filter(function(s){return r.major.includes(s.name);}).forEach(function(s){
        var level=['庙','旺'].includes(s.brightness)?'strong':['不','陷'].includes(s.brightness)?'weak':null;
        var bright=level&&d.details.find(function(o){return o.type==='brightness'&&o.palace===r.name&&o.star===s.name&&o.value===level&&(!o.brightnessValues||o.brightnessValues.includes(s.brightness));});
        if(bright){modifiers.push(s.name+'为'+s.brightness+'：'+bright.text);out[0].trace.push(d.provenance['detail:'+bright.id]);}
        if(s.mutagen){var detail=d.details.find(function(o){return o.type==='mutagen'&&o.palace===r.name&&o.star===s.name&&o.value===s.mutagen;});modifiers.push(s.name+'生年化'+s.mutagen+'：'+(detail?detail.text:d.starMutagens[s.name+s.mutagen]+' '+d.hua[r.name][s.mutagen]));out[0].trace.push(d.provenance[detail?'detail:'+detail.id:'mutagen:'+s.name+s.mutagen]);}
      });
      if(modifiers.length)out[0].text+='\n'+r.title+'本盘合读：'+modifiers.join('\n');
    }
    return out;
  }
  function natalCards(d,r){
    var out=[];
    r.stars.filter(function(s){return HUA.includes(s.mutagen)&&s.mutagen;}).forEach(function(s){
      var note=d.starMutagens[s.name+s.mutagen];
      var detail=d.details.find(function(o){return o.type==='mutagen'&&o.palace===r.name&&o.star===s.name&&o.value===s.mutagen;});
      out.push(trace(card('natal-'+r.name+'-'+s.name,'生年四化',detail?detail.title:s.name+'化'+s.mutagen+'在'+r.title,detail?detail.text:(note?note+'\n':'')+d.hua[r.name][s.mutagen],s.name+'实际在'+r.title+'，生年标记：'+s.mutagen,['quanshu','mutagen']),d,detail?['detail:'+detail.id]:['mutagen:'+s.name+s.mutagen,'hua:'+r.name+':'+s.mutagen]));
    });
    var present=unique(r.stars.map(function(s){return s.mutagen;}).filter(function(m){return m&&HUA.includes(m);}));
    Object.keys(d.huaPairs).forEach(function(key){if(key.split('').every(function(m){return present.includes(m);}))out.push(card('hua-pair-'+r.name+'-'+key,'四化并存',key.split('').map(function(m){return '化'+m;}).join('与')+'同宫',d.huaPairs[key],r.stars.filter(function(s){return key.includes(s.mutagen)&&s.mutagen;}).map(function(s){return s.name+'化'+s.mutagen;}).join('、'),['mutagen']));});
    return out;
  }
  function has(r,n){return r.stars.some(function(s){return s.name===n;});}
  function relationCards(d,r){
    var out=[],sf=[r].concat(r.trines,[r.opposite]);
    [['左辅','右弼','辅弼会照','协助与配合进入同一阅读范围，相关事务较能有人分担，组织与团队的承接是重点。'],['文昌','文曲','昌曲会照','文字、条理、才艺与表达共同参与，知识与表现能力成为这一宫事务的支持。'],['天魁','天钺','魁钺会照','引荐与照应进入相关宫位，支持多来自长辈、上级或有经验者的搭桥。'],['禄存','天马','禄马交会','已有资源与行动相连，钱财或实际条件随走动、流通和环境变化而被调动。'],['擎羊','陀罗','羊陀会照','直接阻力与反复拖延同时进入，事情既有需要正面争取的部分，也有不易一次解决的牵连。'],['火星','铃星','火铃会照','急变与内在压力同时参与，临时事务、反应节奏和累积的紧绷感相互影响。'],['地空','地劫','空劫会照','期待、投入与实际留存存在落差，计划能否落实、资源能否承接是这一宫的重要问题。']].forEach(function(g){
      if(g.slice(0,2).every(function(n){return sf.some(function(q){return has(q,n);});})){
        var positions=g.slice(0,2).map(function(n){var q=sf.find(function(q){return has(q,n);});return {star:n,palace:q.name,relation:q===r?'同宫':q===r.opposite?'对拱':'三合'};});
        var c=card('rel-'+r.name+'-'+g[0],'三方四正',g[2]+' · '+r.title,g[3]+'\n本盘形态：'+positions.map(function(o){return o.star+'在'+title(o.palace)+'，对'+r.title+'为'+o.relation;}).join('；')+'。',g.slice(0,2).map(function(n){return sf.filter(function(q){return has(q,n);}).map(function(q){return n+'在'+q.title;}).join('、');}).join('；'),['quanshu','minor']);c.conditions={center:r.name,positions:positions};out.push(c);
      }
    });
    var lu=sf.flatMap(function(q){return q.stars.filter(function(s){return s.mutagen==='禄';}).map(function(s){return s.name+'化禄在'+q.title;});});
    if(lu.length&&sf.some(function(q){return has(q,'天马');})&&!sf.some(function(q){return has(q,'禄存');}))out.push(card('rel-hualu-ma-'+r.name,'禄马关系','化禄会天马','增加的资源与行动相连，机会需要经过走动、流通或环境变化取得；这里的禄来自实际化曜，与禄存的本钱之义分开。',lu.join('；')+'；'+sf.filter(function(q){return has(q,'天马');}).map(function(q){return '天马在'+q.title;}).join('、'),['mutagen','minor']));
    var ji=sf.flatMap(function(q){return q.stars.filter(function(s){return s.mutagen==='忌';}).map(function(s){return s.name+'化忌在'+q.title;});}),sha=sf.flatMap(function(q){return q.stars.filter(function(s){return SHA.includes(s.name);}).map(function(s){return s.name+'在'+q.title;});});
    if(ji.length&&sha.length)out.push(card('rel-shaji-'+r.name,'煞忌合参','化忌与煞曜同会','牵挂与实际阻力进入同一阅读范围。化忌强调在意与反复，煞曜分别带来直接冲突、拖延、急变或耗损，二者不能用吉星数量简单抵消。',ji.concat(sha).join('；'),['quanshu','mutagen']));
    [['左辅','右弼','辅弼','两侧有协助与配合，本宫事务能得到邻近关系的支持。'],['文昌','文曲','昌曲','文字、才艺与表达从两侧形成支持，本宫事务与学习、文书及表现联系加强。'],['天魁','天钺','魁钺','两侧有引荐与照应，本宫能通过长辈、前辈和有经验者取得支持。'],['紫微','天府','紫府','两侧有主导与资源支持，本宫较重身份、秩序和现有条件的承接。'],['太阳','太阴','日月','公开带领与细致照应从两侧作用，外在支持与内在感受共同影响本宫。'],['擎羊','陀罗','羊陀','两侧有直接阻力与拖延，本宫事务承受夹制，不能把会到一颗煞星误当此结构。'],['火星','铃星','火铃','两侧有急变与隐性压力，本宫事务容易带突发性与紧绷感。'],['地空','地劫','空劫','两侧有落空与耗损，本宫投入与实际留存之间的落差较明显。']].forEach(function(g){
      var left=r.neighbors[0],right=r.neighbors[1];
      if(has(left,g[0])&&has(right,g[1])||has(left,g[1])&&has(right,g[0]))out.push(card('flank-'+r.name+'-'+g[0],'夹宫',g[2]+'夹'+r.title,g[3],left.title+'：'+left.stars.filter(function(s){return g.slice(0,2).includes(s.name);}).map(function(s){return s.name;}).join('、')+'；'+right.title+'：'+right.stars.filter(function(s){return g.slice(0,2).includes(s.name);}).map(function(s){return s.name;}).join('、'),['quanshu','pattern']));
    });
    return out;
  }
  function patternCards(d,rows){
    if(!global.WZBZPatternRules)return [];
    var ming=rows.find(function(r){return r.name==='命宫';}),body=rows.find(function(r){return r.body;});
    var adapted={mingGongBranch:ming.branch,shenGongBranch:body?body.branch:ming.branch,palaces:rows.map(function(r){return {name:r.name,branch:r.branch,stem:'甲乙丙丁戊己庚辛壬癸'.indexOf(r.ganzhi[0]),stars:r.stars.map(function(s){return {name:s.name,type:MAJORS.includes(s.name)?'major':SHA.includes(s.name)?'sha':'minor',siHua:s.mutagen||undefined,brightness:['庙','旺'].includes(s.brightness)?'bright':['陷','不'].includes(s.brightness)?'dim':'normal',brightnessRaw:s.brightness};})};})};
    // The pinned detector calls an empty 未宫 borrowing 丑宫日月 “明珠出海”.
    // Keep upstream intact, but use the reviewed 卯日/亥月 three-harmony form here.
    var found=global.WZBZPatternRules.detect(adapted).filter(function(p){return !['明珠出海','马头带箭'].includes(p.name);});
    var sun=rows.find(function(r){return r.branch===3&&has(r,'太阳');}),moon=rows.find(function(r){return r.branch===11&&has(r,'太阴');});
    if(ming.branch===7&&!ming.major.length&&sun&&moon){var sf=[ming].concat(ming.trines,[ming.opposite]);found.push({name:'明珠出海',variant:'未空卯日亥月',palaces:['命宫',sun.name,moon.name],conditions:{required:['命宫未宫无十四主星','太阳在卯、太阴在亥，三合会命'],breaking:sf.flatMap(function(r){return r.stars.filter(function(s){return SHA.includes(s.name)||s.mutagen==='忌';}).map(function(s){return r.title+'见'+s.name+(s.mutagen==='忌'?'化忌':'');});})}});}
    if(ming.branch===6&&has(ming,'擎羊')){
      var actual=['天同','太阴'].every(function(n){return ming.major.includes(n);}),borrow=!ming.major.length&&['天同','太阴'].every(function(n){return ming.opposite.major.includes(n);});
      if(actual||borrow)found.push({name:'马头带箭',palaces:borrow?['命宫',ming.opposite.name]:['命宫'],variant:actual?'同阴实坐':'空宫借同阴',readingText:(actual?'午宫天同太阴同守，擎羊同宫。':'午宫命宫无主星，擎羊坐命；天同太阴实际在对宫'+ming.opposite.title+'，按借曜取法参看。')+'天同重安定，擎羊带竞争与执行压力；此组合读为安逸倾向受到推动，行动与承担加重。',conditions:{required:['命宫在午','擎羊坐命',actual?'天同太阴同守午宫':'命宫空宫，对宫天同太阴'],breaking:ming.stars.filter(function(s){return s.mutagen==='忌';}).map(function(s){return s.name+'生年化忌';})}});
      else if(ming.stars.some(function(s){return s.name==='贪狼'&&s.mutagen==='禄';}))found.push({name:'马头带箭 · 贪狼旁格',palaces:['命宫'],variant:'午贪化禄遇羊旁格',readingText:'午宫贪狼化禄与擎羊同坐，按贪狼旁格单列。贪狼的欲求、经营与交际被化禄放大，擎羊使取得资源的过程带有直接竞争。',conditions:{required:['命宫午宫','贪狼生年化禄','擎羊同宫']}});
    }
    return found.map(function(p,i){
      var locations=unique((p.palaces||['命宫']).map(name)).map(function(n){return rows.find(function(r){return r.name===n;});}).filter(Boolean);
      var anchor=locations.length===1?locations[0]:null;
      var localPair=anchor&&anchor.major.length===2&&['紫府同宫','廉贞天相格','武曲七杀','天同天梁格','日月同宫','巨日同宫'].includes(p.name);
      var text=p.readingText||(localPair?anchor.title+'的'+anchor.major.join('、')+'同宫：'+describe(d,anchor):d.patternMeanings[p.name]);
      if(!text&&p.name.endsWith('化禄入命')){var note=d.starMutagens[p.name.replace('入命','').replace('化','')];text=(note?note+'\n':'')+d.hua['命宫']['禄'];}
      if(!text&&/化忌入[命迁]$/.test(p.name)){var n=p.name.endsWith('入命')?'命宫':'迁移',detail=d.starMutagens[p.name.replace(/入[命迁]$/,'').replace('化','')];text=(detail?detail+'\n':'')+d.hua[n]['忌'];}
      if(!text)return null;
      var evidence=(p.conditions&&p.conditions.required||[]).join('；');
      evidence+='；实际涉及：'+locations.map(function(r){return r.title+' '+r.ganzhi+'（'+r.major.join('、')+'）';}).join('、');
      if(p.name==='科权双会')evidence+='；'+[ming].concat(ming.trines,[ming.opposite]).flatMap(function(r){return r.stars.filter(function(s){return ['科','权'].includes(s.mutagen);}).map(function(s){return s.name+'化'+s.mutagen+'在'+r.title;});}).join('、');
      var c=trace(card('pattern-'+i,localPair?'同宫星系':p.conditions?'格局条件':'基础配置',p.name,text,evidence,['upstream','pattern']),d,[localPair?'pair:'+anchor.name+':'+MAJORS.filter(function(n){return anchor.major.includes(n);}).join(''):'pattern:'+p.name]);
      c.palaces=locations.map(function(r){return r.name;});c.variant=p.variant||'';c.ruleId='pattern:'+p.name+(c.variant?':'+c.variant:'');
      c.bonus=p.conditions&&p.conditions.bonus||[];c.breaking=p.conditions&&p.conditions.breaking||[];c.originalSource=p.source||'';return c;
    }).filter(Boolean);
  }
  function flightCards(d,chart,rows,r,mode,edges){
    if(mode==='sanhe'||!global.FiveArtsEngine||typeof global.FiveArtsEngine.transformations!=='function')return [];
    var out=[],all=edges||rows.flatMap(function(q){return global.FiveArtsEngine.transformations(chart,q.index);});
    function row(i){return rows.find(function(q){return q.index===i;});}
    all.forEach(function(f){
      if(f.target<0||f.source!==r.index&&f.target!==r.index)return;
      var from=row(f.source),to=row(f.target),mut=f.mutagen||HUA['ABCD'.indexOf(f.code)];if(!from||!to||!mut)return;
      var evidence=from.title+'宫干'+from.ganzhi[0]+'使'+to.title+'的'+f.star+'化'+mut;
      var text,tech,heading;
      if(from===to){tech=mode==='qintian'?'离心自化':'宫干自化';heading=to.title+'自化'+mut+' · '+f.star;text=to.title+'宫干使该宫的'+f.star+'化'+mut+'。'+d.self[mut].replace(/本宫/g,to.title);}
      else if(from.branch===(to.branch+6)%12){tech=mode==='qintian'?'向心自化':'对宫化入';heading=from.title+' → '+to.title+' · '+(mode==='qintian'?'向心':'化')+mut;text=from.title+'与'+to.title+'互为对宫，由'+from.title+'宫干使'+to.title+'的'+f.star+'化'+mut+'。'+d.incoming[mut].replace(/本宫/g,to.title).replace(/对宫/g,from.title);}
      else{
        tech=f.source===r.index?'本宫飞出':'别宫飞入';heading=from.title+'化'+mut+'入'+to.title;
        var people={命宫:'本人',兄弟:'手足与同辈',夫妻:'伴侣',子女:'子女与晚辈',仆役:'朋友与合作对象',父母:'长辈'},affairs={财帛:'取财与收支',疾厄:'身体感受与消耗',迁移:'外部环境与出行',官禄:'职责与事业推进',田宅:'家宅与家业',福德:'内在满足与精神活动'};
        var source=people[from.name]?'与'+people[from.name]+'有关的关系':affairs[from.name],target=people[to.name]?'与'+people[to.name]+'的互动':affairs[to.name];
        var acts={禄:'把满足感和投入带向',权:people[to.name]?'在关系中要求回应、承担和主导，着重于':'把管理、责任和掌握的需求带向',科:'把认同、名声与求助的期待带向',忌:'把牵挂、反复投入和不满足带向'};
        text=from.title+'对应'+source+'，这条飞化'+acts[mut]+to.title+'所代表的'+target+'。';
      }
      var note=d.starMutagens[f.star+mut];if(note)text+='\n化曜是'+f.star+'：'+note;
      var c=trace(card('flight-'+f.source+'-'+f.target+'-'+mut,tech,heading,text,evidence,['mutagen']),d,['mutagen:'+f.star+mut]);
      c.sourcePalace=from.name;c.targetPalace=to.name;c.layer='palace-stem';c.school=mode;c.ruleId='flight:'+mode+':'+tech+':'+mut;c.conditions={source:from.index,target:to.index,star:f.star,mutagen:mut};
      if(mut==='忌'&&from!==to){c.extra='忌入'+to.title+'，对宫受冲位置为'+to.opposite.title+'（'+to.opposite.ganzhi+'）。';}
      var natal=to.stars.find(function(s){return s.name===f.star&&s.mutagen;});if(natal)c.overlay='同一星另有生年化'+natal.mutagen+'；生年标记与'+from.title+'宫干引出的化'+mut+'分别保留。';
      out.push(c);
    });
    return out;
  }
  function flowCards(d,rows,options){
    var scope=options.flowScope,flow=options.flow;if(!scope||!flow||!Array.isArray(flow.mutagen)||flow.mutagen.length!==4||!Array.isArray(flow.palaceNames)||flow.palaceNames.length!==12)return [];
    var label=flow.name||({decadal:'大限',yearly:'流年',monthly:'流月',daily:'流日',hourly:'流时',age:'小限'})[scope]||'运限',out=[];
    flow.mutagen.forEach(function(star,j){var target=rows.find(function(r){return r.stars.some(function(s){return s.name===star;});});if(!target)return;var flowName=name(flow.palaceNames[target.index]);if(!PALACES.includes(flowName))return;
      var mut=HUA[j],actual=target.stars.find(function(s){return s.name===star;}),note=d.starMutagens[star+mut]||'';
      var text=label+title(flowName)+'叠本命'+target.title+'，实际化曜为'+star+'化'+mut+'。\n'+note+'\n'+label+title(flowName)+'的作用：'+d.hua[flowName][mut];
      text+='\n承接位置为本命'+target.title+' '+target.ganzhi+'，'+star+(actual.brightness?'原盘亮度为'+actual.brightness:'在原盘此宫')+'；原有星系为'+(target.major.join('、')||'无十四主星')+'。';
      var c=trace(card('flow-'+scope+'-'+star,'运限四化',label+' · '+star+'化'+mut,text,(options.flowDate||'')+' · '+label+title(flowName)+'叠本命'+target.title+' '+target.ganzhi,['mutagen','palace']),d,['mutagen:'+star+mut,'hua:'+flowName+':'+mut]);
      c.layer=scope;c.ruleId='flow:'+scope+':'+mut;c.conditions={star:star,mutagen:mut,natalPalace:target.name,flowPalace:flowName};
      var n=target.stars.find(function(s){return s.name===star&&s.mutagen;});if(n)c.overlay='生年'+n.mutagen+'与'+label+mut+'同在'+star+'：本命层与所选运限层并存，不改写原生年四化。';
      c.index=target.index;out.push(c);
    });return out;
  }
  function lifeCards(d,rows,chart,options){
    var out=[],ming=rows.find(function(r){return r.name==='命宫';}),body=rows.find(function(r){return r.body;}),original=rows.find(function(r){return r.original;});
    if(body)out.push(card('body','命身合读',body===ming?'命身同宫':'身宫在'+body.title,body===ming?'先天行事方式与后天投入集中在同一宫，个人特质与实际行动较一致。':'后天较多精力投入'+body.title+'所代表的事务。\n'+(describe(d,body)||d.palaceNotes[body.name]),'命宫：'+ming.ganzhi+'；身宫：'+body.title+' '+body.ganzhi,['palace']));
    if(options.mode==='qintian'&&original)out.push(card('original','来因宫','来因在'+original.title,'生年四化的发端在此宫，阅读时把这一宫代表的人事关系与四化去向合看。\n'+d.palaceNotes[original.name],original.title+' '+original.ganzhi+' · 本盘来因标记',['mutagen']));
    [['soul','命主'],['body','身主']].forEach(function(g){var star=name(chart[g[0]]);if(!star)return;var at=rows.find(function(r){return has(r,star);});if(at)out.push(card('master-'+g[0],'命主身主',g[1]+' · '+star,g[1]+'是按命盘规则取出的代表星名称，实际'+star+'位于'+at.title+' '+at.ganzhi+'。\n'+(d.profiles[star]?d.profiles[star][at.name]:d.auxiliary[star]?d.auxiliary[star][at.name]:d.misc[star]||''),g[1]+'与身宫是不同字段；此处没有把'+star+'移到命宫或身宫。',['palace','stars']));});
    if(chart.fiveElementsClass)out.push(card('five-elements','五行局',chart.fiveElementsClass,'本盘采用'+chart.fiveElementsClass+'，用于紫微星定位与大限起始年龄。'+(ming.decadal&&ming.decadal.range?'首个大限为'+ming.decadal.range.join('—')+'虚岁。':''),'读取本盘五行局与命宫大限字段',['palace']));
    return out.concat(flowCards(d,rows,options));
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
  global.WZBZInterpretation=Object.freeze({validate:validate,validChart:validChart,match:makeRows,analyse:analyse,relations:relationCards,patterns:patternCards,flights:flightCards,flow:flowCards,title:title});
})(window);
