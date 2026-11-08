/* Local, evidence-based chart reading. No network calls or user-record writes. */
(function(global){
  'use strict';
  var E=global.FiveArtsEngine,FIVE=['木','火','土','金','水'],NAMES={huozhulin:'火珠林',haidiyan:'海底眼',huangjince:'黄金策'};
  var PAIRS={
  "父母父母": [
    "父化父兮文不实",
    "父母化父母：文件不实，办理反复",
    "合同、证明、批文仍化父母。按原条，文件反复修改，手续重复办理，办事难一次办妥。"
  ],
  "父母子孙": [
    "父化子兮宜退散",
    "父母化子孙：宜解约退散，不利催办文书",
    "问解约、撤销、结束纠纷，原条取宜退散；问合同签署、证照批复，文书转为子孙，不利把原定手续办成。"
  ],
  "父母兄弟": [
    "父化同人多口舌",
    "父母化兄弟：文书起争议，办理须重来",
    "父母主文件，兄弟主同辈争执。原条说多口舌、须重叠；问签约、办证，文件反复商议，办事中有人提出异议。"
  ],
  "父母妻财": [
    "父化财兮交易利",
    "父母化妻财：交易先难后易，文书受财克",
    "问交易，手续在前、收款在后，取先难后易。问文件本身，财爻回头克父母，付款与金额约定反过来阻碍签署、批复。"
  ],
  "父母官鬼": [
    "求官必得迁高职",
    "父母化官鬼：利求官进职，散忧反添事",
    "问求职、升职，原条取进职；问撤销责任、结束麻烦，文件转官鬼，手续之后又添责任与烦忧。"
  ],
  "子孙子孙": [
    "子化子兮阴小凶",
    "子孙化子孙：争讼求官不利",
    "子孙制官，原条对举讼、求官取不利。问求财，子孙为财源，本条只说明财源延续，收款仍以财爻空破旺衰为准。"
  ],
  "子孙官鬼": [
    "子化官兮防祸患",
    "子孙化官鬼：忧事再起，先松后紧",
    "原条说防祸患。原本解忧的子孙变成官鬼，事情从解除麻烦转为增加约束，问息事、解忧不利。"
  ],
  "子孙父母": [
    "无中生有多头绪",
    "子孙化父母：财源受克，手续增多",
    "父母回头克子孙。问经营，产出与财源受文书、手续阻碍；问解忧，原事未了又添手续，原条称多头绪。"
  ],
  "子孙兄弟": [
    "子化兄兮事不圆",
    "子孙化兄弟：办事收尾不全，人情托付生疑",
    "原条取事不圆、托人有疑。子孙转兄弟，问求财是财源转为分耗，问办事是收尾有争执，托人办事不利。"
  ],
  "子孙妻财": [
    "子化财兮好望财",
    "子孙化妻财：财源转为财款，利求财",
    "子孙生财，又变出妻财。原条取好望财，问买卖是有产出而见财款；变财若逢空破，钱款延付或受阻。"
  ],
  "妻财妻财": [
    "财化财兮妇主灾",
    "妻财化妻财：财事反复，进退依变支",
    "财事仍化财事；本条没有财必增加的断意。实际变支化进，财事渐增；化退，财事渐减；空破则收款受阻。"
  ],
  "妻财官鬼": [
    "财化官兮防走失",
    "妻财化官鬼：财有耗散，得财后又有支出",
    "财爻生官而化官，原条防走失。问求财，所收钱款又转为支出、耗费，重点在钱能否留住。"
  ],
  "妻财父母": [
    "财化文书用可谐",
    "妻财化父母：先易后难，收款转入手续",
    "钱款转成合同、票据、批文。《火珠林》取先易后难：交易先谈成，后续收款受文件手续拖延。"
  ],
  "妻财兄弟": [
    "财化兄兮财少成",
    "妻财化兄弟：先聚后散，钱款受分耗",
    "兄弟回头克财，原条财少成。《火珠林》称先聚后散；问回款、买卖，款项后续遭分成、扣减或费用侵占。"
  ],
  "妻财子孙": [
    "财化子兮宜守旧",
    "妻财化子孙：宜守旧业，不利托人求新",
    "子孙回头生财，原条仍取宜守旧、托人不如意。问经营，延续已有生意、产品与财源，胜于另托人情开新局。"
  ],
  "兄弟兄弟": [
    "兄化兄兮家不足",
    "兄弟化兄弟：分耗不退，同辈争执延续",
    "兄弟仍化兄弟，原条取家不足。问财，费用、分成与同辈争利持续；化进则分耗增加，化退则分耗减轻。"
  ],
  "兄弟妻财": [
    "兄化财兮财反覆",
    "兄弟化妻财：先散后聚，财款反复",
    "《火珠林》取先散后聚，《海底眼》取财反复。问生意，先有投入或分耗，随后转为收款，过程反复。"
  ],
  "兄弟官鬼": [
    "兄化官兮休下状",
    "兄弟化官鬼：不利主动起讼",
    "官鬼回头克兄弟，原条劝休下状。问争执，分争转成官事与责任追究，主动兴讼不利。"
  ],
  "兄弟父母": [
    "兄化文书和改救",
    "兄弟化父母：争议可调解，宜改约补文书",
    "原条和改救、主无忧。兄弟转父母，问争执可通过和解、改约处理，文书凭据成为解决争议的办法。"
  ],
  "兄弟子孙": [
    "兄化子兮忧可散",
    "兄弟化子孙：烦忧消散，等人有信",
    "兄弟生子孙，原条忧可散。问争执，分争转为解忧；问等人、等信，原条取行人有消息。"
  ],
  "官鬼官鬼": [
    "见贵求官事尽难",
    "官鬼化官鬼：官事反复，求职多阻",
    "原条见贵求官事尽难。问求职、求任用，官事反复，旧事之后又有新事；官鬼化进在此解释为官事增多。"
  ],
  "官鬼父母": [
    "官化文书官未顺",
    "官鬼化父母：求职未顺，文件有争议",
    "官鬼转父母，原条官未顺、交加争竞。问任用、签约，职位落实卡在材料、合同或批文的争议。"
  ],
  "官鬼子孙": [
    "官化子兮忧自除",
    "官鬼化子孙：忧事消退，求官受克",
    "子孙回头克官。问解除麻烦，取忧自除；问求职、保职，职位所用之官被克，反为不利。"
  ],
  "官鬼兄弟": [
    "官化兄兮朋友诈",
    "官鬼化兄弟：委托不可靠，原答复生变",
    "原条朋友诈、委托人心不似初。问托人办事，受托人的答复与做法改变，原先承诺难照办。"
  ],
  "官鬼妻财": [
    "官化财兮财自得",
    "官鬼化妻财：一般求财有得，赌博另论",
    "原条一般求财取财自得，同时明确赌博抽拈不利。财生官，不把这条通用于赌博；变财空破时，钱款仍未收成。"
  ]
};
  function copy(x){return JSON.parse(JSON.stringify(x));}
  function snapshot(r){
    return copy({main:r.main,changed:r.changed,rows:r.rows,changedRows:r.changedRows,moving:r.moving,
      calendar:{solarText:r.calendar.solarText,lunarText:r.calendar.lunarText,pillars:r.calendar.pillars,dayVoid:r.calendar.dayVoid},annotations:E.liuyaoAnnotations(r)});
  }
  function lineName(n){return ['初爻','二爻','三爻','四爻','五爻','上爻'][n-1];}
  function label(r){return lineName(r.index)+' '+r.role+r.ganzhi+r.element+(r.shi?'（'+r.shi+'）':'');}
  function relation(a,b){var x=FIVE.indexOf(a),y=FIVE.indexOf(b);if(x<0||y<0)throw Error('五行资料不完整');return x===y?'比和':(x+1)%5===y?'生':(x+2)%5===y?'克':(y+1)%5===x?'受生':'受克';}
  function reference(data,book,needle){
    var item=data.books[book],found;
    if(!item)throw Error('缺少《'+NAMES[book]+'》资料');
    item.sections.some(function(s,ci){return s.paragraphs.some(function(p,pi){if(p.includes(needle)){found={book:book,name:NAMES[book],chapter:ci,chapterTitle:s.title,paragraph:pi,quote:needle};return true;}return false;});});
    if(!found)throw Error('条文出处缺失：'+needle);
    return found;
  }
  function analyze(c,options,data){
    options=options||{};
    var book=options.book||'huozhulin',n=Number(options.index)||6,side=options.side==='changed'?'changed':'main',yong=Number(options.yongIndex)||6;
    if(!NAMES[book]||!c||!Array.isArray(c.rows)||c.rows.length!==6||!Number.isInteger(n)||n<1||n>6||!Number.isInteger(yong)||yong<1||yong>6)throw Error('六爻解读参数不完整');
    var useChanges=book!=='haidiyan'||c.moving.length===1;
    var rows=c.rows,a=c.annotations,shi=rows.find(function(r){return r.shi==='世';}),ying=rows.find(function(r){return r.shi==='应';}),cards=[],topics=[];
    var view=side==='main'?rows[n-1]:c.changedRows[n-1];
    function ref(id,q){return reference(data,id,q);}
    function unique(refs){var seen=new Set();return refs.filter(function(r){var k=r.book+'|'+r.chapter+'|'+r.paragraph+'|'+r.quote;if(seen.has(k))return false;seen.add(k);return true;});}
    function tags(r){return a.rows[r.index-1].tags;}
    function changes(r){return useChanges?a.rows[r.index-1].changes:[];}
    function has(r,t){return tags(r).includes(t);}
    function changed(r){return c.changedRows[r.index-1];}
    function state(r){
      var broken=has(r,'月破'),empty=has(r,'旬空'),support=tags(r).filter(function(t){return ['月生','月扶','临月','日生','日扶','临日'].includes(t);});
      var monthStrong=['旺','相'].includes(r.season)&&!broken;
      var change=changes(r),hit=tags(r).filter(function(t){return ['日冲','日克','月克','日害','月害'].includes(t);});
      var rooted=monthStrong||support.some(function(t){return ['日生','日扶','临日'].includes(t);});
      var tied=r.moving&&(change.includes('化合')||has(r,'日合')||has(r,'月合'));
      var harmfulHit=hit.filter(function(t){return t!=='日冲'||r.moving||!monthStrong||empty;});
      var severe=broken||(!rooted&&hit.length>0),futureBad=r.moving&&change.some(function(t){return ['回头克','化空','化月破','化墓','化绝','化退'].includes(t);});
      return {broken:broken,empty:empty,support:support,rooted:rooted,strong:monthStrong,severe:severe,hit:hit,change:change,futureBad:futureBad,
        tied:tied,usable:rooted&&!broken&&!empty&&!futureBad&&!tied&&!harmfulHit.some(function(t){return t==='日冲'||t==='日克';}),clean:rooted&&!broken&&!empty&&!futureBad&&!tied&&!harmfulHit.length};
    }
    function status(r){var t=tags(r),ch=r.moving?changes(r):[];return label(r)+'：'+r.season+(t.length?'，'+t.join('、'):'')+(ch.length?'；'+ch.join('、'):'');}
    function list(xs){return xs.map(function(r){return lineName(r.index)+r.ganzhi+r.element;}).join('、');}
    function note(r){
      var st=state(r),parts=[];
      if(st.broken)parts.push('月破，当月办事受阻');
      if(st.empty)parts.push(st.strong?'旺而逢空，有其事但未落实':'休囚逢空，所求难成');
      if(st.support.length)parts.push(st.support.join('、')+'，得日月生扶');
      if(st.hit.length)parts.push(st.hit.join('、')+'，另受冲克害');
      if(st.tied)parts.push('发动逢合，事情被绊住');
      if(r.moving&&changes(r).includes('回头克'))parts.push('动化回头克，后续受制');
      if(r.moving&&changes(r).includes('回头生'))parts.push('动化回头生，后续得助');
      if(r.moving&&changes(r).includes('化进'))parts.push('化进，所主事项渐增');
      if(r.moving&&changes(r).includes('化退'))parts.push('化退，所主事项渐减');
      if(!parts.length)parts.push(st.strong?'本月旺相，得月令之助':'本月休囚，得时不利');
      return parts.join('；')+'。';
    }
    function brief(r){return note(r).replace(/[。；]+$/,'');}
    function add(id,title,verdict,meaning,evidence,refs,score){
      refs=unique(refs||[]);cards.push({id:id,title:title,verdict:verdict,meaning:meaning,evidence:evidence,references:refs,reference:refs[0]||null,score:score||0});
    }
    function topic(id,title,verdict,meaning,evidence,refs){refs=unique(refs);topics.push({id:id,title:title,verdict:verdict,meaning:meaning,evidence:evidence,references:refs,reference:refs[0]||null});}
    var moving=rows.filter(function(r){return r.moving;}),wealth=rows.filter(function(r){return r.role==='妻财';}),offspring=rows.filter(function(r){return r.role==='子孙';}),official=rows.filter(function(r){return r.role==='官鬼';}),papers=rows.filter(function(r){return r.role==='父母';}),brothers=rows.filter(function(r){return r.role==='兄弟';});
    // The same change has different meanings for different questions. Keep both explicit.
    moving.forEach(function(r){
      if(!useChanges)return;
      var x=changed(r),ch=changes(r),st=state(r),pair=PAIRS[r.role+x.role],ev=[status(r),'变出'+x.role+x.ganzhi+x.element+'：'+(a.rows[r.index-1].changedTags.join('、')||'无日月冲合空破标记')],refs=[],title,verdict,meaning,score=60;
      if(book==='haidiyan'&&moving.length===1){
        refs.push(ref('haidiyan',pair[0]));title=lineName(r.index)+'独发 · '+pair[1];verdict=pair[1].split('：')[1];meaning=pair[2];score=95;
      }else if(book==='huozhulin'&&['父母妻财','妻财父母','妻财兄弟','兄弟妻财'].includes(r.role+x.role)){
        var q={'父母妻财':'父母化财，先难后易','妻财父母':'财化父母，先易后难','妻财兄弟':'财化兄弟，先聚后散','兄弟妻财':'兄弟化财，先散后聚'}[r.role+x.role];
        refs.push(ref('huozhulin',q));title=lineName(r.index)+' · '+r.role+'化'+x.role;verdict=q.split('，')[1];meaning=pair[2];score=104;
      }else if(book==='huozhulin'&&moving.length===1){
        var soloQ={父母:'父母独发，重迭艰辛',子孙:'子孙独发，为退为散',兄弟:'兄弟独发，为诈为虚',官鬼:'官鬼独发，为欺为盗',妻财:'妻财独发，生鬼伤父'}[r.role];
        refs.push(ref('huozhulin',soloQ));title=lineName(r.index)+' · '+r.role+'独发';score=102;
        verdict=r.role==='父母'?(st.usable?'旺相独发，文书手续可成':'父母独发，办事手续繁重'):r.role==='子孙'?(st.usable?'旺相独发，解忧且利求财':'子孙独发，利退散而不利求官'):r.role==='兄弟'?'兄弟独发，防虚诈与钱财破耗':r.role==='官鬼'?(st.usable?'官鬼有气独发，利求职任用':'官鬼独发，防欺瞒与烦忧'):'妻财独发，利交易而损文书';
        meaning=r.role+r.ganzhi+r.element+'一爻独发，变出'+x.role+x.ganzhi+x.element+'。'+pair[2]+(st.usable?'本爻得生扶无空破，按旺相有气断。':'');
      }else if(ch.includes('回头克')){
        refs.push(ref('huangjince','戒回头之克我'));title=lineName(r.index)+' · '+r.role+'化回头克';score=90;
      verdict=r.role==='官鬼'?'解忧有利，求官受阻':r.role==='兄弟'?'同辈分争受制，求财分耗减轻':'事情先动，后续受克';
      meaning=x.ganzhi+x.element+'回克本爻'+r.ganzhi+r.element+'。'+(r.role==='妻财'?'问求财，款项后续遭扣减、分成，钱财难留。':r.role==='父母'?'问合同、批文，付款、金额约定反过来阻碍签署与批复。':r.role==='子孙'?'问经营，财源受文书手续阻碍；问解忧，旧事未了又添手续。':r.role==='官鬼'?'子孙制官，解除烦忧有利，求职、保职不利。':'官鬼制兄弟，同辈争执与分耗受到管束。');
      }else if(ch.includes('回头生')){
        refs.push(ref('huangjince','有助有扶，衰弱休囚亦吉'));title=lineName(r.index)+' · '+r.role+'得回头生';score=78;
        verdict=r.role==='官鬼'?'求职得助，解忧反不利':r.role==='兄弟'?'分耗增加，求财不利':r.role==='妻财'?'财得生扶，利继续收款':r.role==='父母'?'文书得助，利办理手续':'财源与解忧得助';
      meaning=x.ganzhi+x.element+'回生本爻'+r.ganzhi+r.element+'。'+(r.role==='妻财'?'问求财，财源接续，利继续收款。':r.role==='父母'?'问文书审批，文件办理得助。':r.role==='官鬼'?'问求职，官爻得助；问消除烦忧，则烦忧反而延续。':r.role==='子孙'?'问经营，产出与财源得助；问解忧，利事情消退。':'问求财，兄弟得生，同辈分成、费用支出增加。');
      }else if(ch.includes('化进')||ch.includes('化退')){
        var advancing=ch.includes('化进');refs.push(ref('huangjince','动变比和，当明进退'));title=lineName(r.index)+' · '+r.role+(advancing?'化进':'化退');score=82;verdict=(advancing?'由小渐大，事情在扩展':'由盛渐减，事情在回缩');
      meaning=r.ganzhi+'变'+x.ganzhi+'，同五行化'+(advancing?'进':'退')+'。'+(r.role==='妻财'?'问求财，财款、财事规模渐'+(advancing?'增':'减')+'。':r.role==='兄弟'?'问求财，分成、费用与竞争渐'+(advancing?'增，财受分耗':'减，财受分耗减轻')+'。':r.role==='官鬼'?'问职位，官事渐'+(advancing?'增':'减')+'；问解忧，烦忧渐'+(advancing?'增':'减')+'。':r.role==='父母'?'问手续、文件，办理事项渐'+(advancing?'增':'减')+'。':'问产出、财源，来源渐'+(advancing?'增':'减')+'。');
      }else if(ch.some(function(t){return ['化空','化月破','化墓','化绝'].includes(t);})){
        refs.push(ref('huangjince','用爻变动，忌遭死墓绝空'));title=lineName(r.index)+' · 变端'+ch.filter(function(t){return /化空|化月破|化墓|化绝/.test(t);}).join('、');score=80;
      var harms=ch.filter(function(t){return /化空|化月破|化墓|化绝/.test(t);});verdict=harms.join('、')+'，事情收尾受阻';meaning=r.role+r.ganzhi+r.element+'发动，变出'+x.role+x.ganzhi+x.element+'，见'+harms.join('、')+'。'+harms.map(function(t){return ({化空:'化空：后续所指之事未落实。',化月破:'化月破：变爻受月建冲破，后续受阻。',化墓:'化墓：本爻入变支之墓，事情被收住、难继续。',化绝:'化绝：本爻到变支绝地，事情后续断续、难成。'})[t];}).join('');
      }else if(ch.includes('化合')||has(r,'日合')||has(r,'月合')){
      refs.push(ref('huangjince','动值合而绊住'));title=lineName(r.index)+' · 动而逢合';score=58;verdict='事情已动，却被关系或约定绊住';meaning=r.role+r.ganzhi+r.element+'发动，又'+(ch.includes('化合')?'与变支相合':'与日月相合')+'。动合为绊，事情进行中被关系、约定牵住，原定进度拖延。';
      }else if(book==='huangjince'&&pair){
      refs.push(ref('huangjince','占事以动爻为事之始，以变出爻为事之终'));title=lineName(r.index)+' · '+pair[1].split('：')[0];verdict=pair[1].split('：')[1];meaning=r.role+r.ganzhi+r.element+'发动为始，变出'+x.role+x.ganzhi+x.element+'为终。'+pair[2];score=62;
      }else{return;}
      var future=a.rows[r.index-1].changedTags,changedMatter=({兄弟:'同辈分耗与争执',妻财:'钱款到账',父母:'文件手续',子孙:'财源或解忧',官鬼:'职位或烦忧'})[x.role];
      var pureHarm=!ch.includes('回头克')&&!ch.includes('回头生')&&!ch.includes('化进')&&!ch.includes('化退')&&ch.some(function(t){return ['化空','化月破'].includes(t);});
      if(!pureHarm&&(future.includes('月破')||future.includes('旬空'))){
        var futureState=future.filter(function(t){return t==='月破'||t==='旬空';}).join('、');
        meaning+='变出的'+x.role+x.ganzhi+'见'+futureState+'，所指'+changedMatter+(future.includes('旬空')?'未落实':'受月建冲阻')+'。';
        verdict+='；变'+x.role+futureState+'，后事'+(future.includes('旬空')?'未实':'受冲');
      }
      if(st.support.length&&ch.includes('回头克'))meaning+='本爻得'+st.support.join('、')+'生扶，原事有助；动化回克则后续受阻，两项同时存在。';
      add('change-'+r.index,title,verdict,meaning,ev,refs,score);
    });
    // Empty/weak/supported are separate branches, never a single summed score.
    rows.filter(function(r){return ['世','应'].includes(r.shi)||r.moving;}).forEach(function(r){
      var st=state(r);
      if(st.empty){
        var strong=st.strong,refs=[book==='haidiyan'?ref('haidiyan',strong?'旺相空亡过一旬':'囚死空亡必不成'):ref('huangjince',strong?'带旺匪空':st.hit.length||st.broken?'主象徒存更被伤，凡谋不遂':'无故勿空')];
      add('empty-'+r.index,lineName(r.index)+' · '+r.role+(strong?'旺相逢空':'休囚逢空'),strong?'旺空待实，事情延后落实':'休囚又空，当前所求难成',
      r.ganzhi+r.element+'本月'+r.season+'，又落'+c.calendar.dayVoid+'空亡。'+(strong?'旺相保留本爻生机，空亡表示所主之事未实，按旺空待实解释。':'本爻休囚又空，所主之事既不得时又未实，按弱空难成解释。'),[status(r)],refs,strong?65:68);
      }
      if(st.broken)add('broken-'+r.index,lineName(r.index)+' · '+r.role+'月破','当月受冲，所主之事难成',r.ganzhi+'与月建'+a.month+'相冲。'+(r.shi==='应'?'应位月破，对方的约定难落实。':r.shi==='世'?'世位月破，自己办事受阻。':r.role==='妻财'?'财爻月破，当前收款受阻。':r.role==='父母'?'父母月破，文件手续受阻。':r.role==='官鬼'?'官鬼月破，问职位不利。':'本爻月破，所主之事当月受阻。')+(st.support.length?'本爻另得'+st.support.join('、')+'，有生扶而同时受冲。':''),[status(r)],[ref('haidiyan','月破空亡未可凭')],72);
      if(!r.moving&&has(r,'日冲')&&!st.broken){
        var up=st.strong;add('day-hit-'+r.index,lineName(r.index)+' · 静爻受日冲',up?'旺静逢冲，静事被催起':'衰静逢冲，所主之事被冲散',r.ganzhi+r.element+'本月'+r.season+'，本爻安静而受日冲。'+(up?'旺而静，日冲为暗动，原本静止的事被催动。':'衰而静，日冲为破，本爻所主之事受损、难办。'),[status(r)],[book==='haidiyan'?ref('haidiyan',up?'旺相用爻冲必发':'休囚冲散脱疏空'):ref('huangjince',up?'静得冲而暗兴':'别衰旺以明克合，辨动静以定刑冲')],67);
      }
    });
    if(book==='haidiyan'&&moving.length>1){
      var ready=moving.filter(function(r){return state(r).usable;}),hurt=moving.filter(function(r){return state(r).broken||state(r).empty||state(r).severe;});
      add('haidi-multiple','海底眼乱动取法：取本卦旺相有情',ready.length?'动爻中'+list(ready)+'有力':'动爻多而空破衰伤，事情难定',
      '本卦'+moving.length+'爻发动，依本篇只取本卦旺衰、生扶，不逐爻套变断。'+(ready.length?list(ready)+'得生扶、无空破，问这些爻所主之事有利。':'动爻没有同时满足得生扶且无空破的爻，事情虽动而难定。')+(hurt.length?list(hurt)+'见空破或衰伤，问这些爻所主之事受阻。':''),moving.map(status),[ref('haidiyan','两爻三爻至六爻动，切不可看变')],120);
    }
    if(book==='haidiyan'&&(shi.moving||ying.moving))add('haidi-parties','世应发动：人事意向正在变',ying.moving?'所托之人易改意，事情宜自己过问':'自己有进退，做成也费磨折',
      ying.moving?'应位'+ying.ganzhi+ying.element+'发动，本篇取托人心易变。问委托、合作，对方答复反复，宜自己过问办理。':'世位'+shi.ganzhi+shi.element+'发动，本篇取身动有忧事，问办事是自己反复进退；旺相时费力而成。',[status(shi),status(ying)],[ref('haidiyan',ying.moving?'应动托人心易变':'身动有忧事')],95);
    var se=relation(ying.element,shi.element),ss=state(shi),ys=state(ying);
    var branchPair=[shi.branch,ying.branch].sort().join(''),branchClash=['子午','丑未','寅申','卯酉','辰戌','巳亥'].some(function(p){return p.split('').sort().join('')===branchPair;}),branchHarm=['子未','丑午','寅巳','卯辰','申亥','酉戌'].some(function(p){return p.split('').sort().join('')===branchPair;});
      if(shi.void&&ying.void)add('shi-ying-empty','世应俱空','双方未实定，口头约定难兑现','世位'+shi.ganzhi+'、应位'+ying.ganzhi+'同逢空亡。问合作、婚约、往来，双方都未实定，口头约定难兑现。',[status(shi),status(ying)],[ref('huangjince','世应俱空，人无准实')],88);
    var lo=Math.min(shi.index,ying.index),hi=Math.max(shi.index,ying.index),middle=moving.filter(function(r){return r.index>lo&&r.index<hi;});
      if(middle.length)add('middle-moving','间爻发动：双方之间有阻隔','中间人或往来手续阻事',list(middle)+'位于世应之间且发动。按间发阻隔论，双方往来受中间人、传话、递件或手续拖延。',[middle.map(status).join('；')],[ref('huangjince','事阻隔兮间发')],61);
    var sideHit=moving.filter(function(r){return r.index!==shi.index&&state(r).usable&&relation(r.element,shi.element)==='克';}),sideHelp=moving.filter(function(r){return r.index!==shi.index&&state(r).usable&&relation(r.element,shi.element)==='生';});
    if(sideHit.length){
      var allWealthHit=sideHit.every(function(r){return r.role==='妻财';});
      var hitRefs=[book==='huozhulin'?ref('huozhulin',allWealthHit&&!shi.moving?'若世安静，财爻发动，生我、克我，此财来逐我之象':'应与动爻，不克方是'):book==='haidiyan'?ref('haidiyan','动爻克世路艰难'):ref('huangjince',allWealthHit&&!shi.moving?'杀生身莫将吉断，用克世勿作凶看':'忌神发动，凡事不利')];
      add('moving-to-shi',allWealthHit&&!shi.moving?'财爻发动就世':'旁爻有力克世',allWealthHit&&!shi.moving?'问求财取财来就我，问文书出行受牵制':ss.support.length?'外事动而克世，赖日月生扶解救':'动爻有力克世，自身办事受阻',
        list(sideHit)+'得气发动，五行直克世位'+shi.ganzhi+shi.element+'。'+(allWealthHit&&!shi.moving?'世爻安静而财爻动来克世，问求财属财来逐我、易得之象；问文书审批、远行办事，仍防财动破文与行程受牵制。':(ss.support.length?'世位另得'+ss.support.join('、')+'生扶，虽受外事施压仍有凭依，办事费力方成。':'世位缺少日月直接生扶，动爻克静爻，外事或他人施压明显，宜守不宜强进。')),sideHit.map(status).concat([status(shi)]),hitRefs,84);
    }else if(sideHelp.length){
      var allGhostHelp=sideHelp.every(function(r){return r.role==='官鬼';});
      var helpRefs=[book==='huozhulin'?ref('huozhulin','发动要生世'):book==='haidiyan'?ref('haidiyan','扶事生身所作主'):ref('huangjince','杀生身莫将吉断，用克世勿作凶看')];
      add('moving-to-shi',allGhostHelp?'官鬼发动生世':'旁爻发动生世',allGhostHelp?'问求职得职位相扶，问病讼防官事牵连':'动爻有气生世，办事得外力相助',
        list(sideHelp)+'得气发动，五行来生世位'+shi.ganzhi+shi.element+'。'+(allGhostHelp?'官鬼动而生世，问求职、升迁得职位与上官相扶；问解忧、词讼或病体，按杀生身莫将吉断，仍防官事压力缠身。':'旁爻有根气而动生世位，所谋之事得外力或相应人事扶助。'),sideHelp.map(status).concat([status(shi)]),helpRefs,76);
    }
    if(book!=='haidiyan'){
      [{b:['申','子','辰'],e:'水',n:'申子辰'},{b:['寅','午','戌'],e:'火',n:'寅午戌'},{b:['巳','酉','丑'],e:'金',n:'巳酉丑'},{b:['亥','卯','未'],e:'木',n:'亥卯未'}].forEach(function(g){
        var picked=g.b.map(function(br){return rows.find(function(r){return r.branch===br&&r.moving&&!state(r).broken&&!state(r).empty;})||rows.find(function(r){return r.branch===br&&!state(r).broken&&!state(r).empty;});});
        if(picked.every(Boolean)&&picked.filter(function(r){return r.moving;}).length>=2){
          var relPalace=relation(c.main.palace.element,g.e),roleName=relPalace==='比和'?'兄弟':relPalace==='生'?'子孙':relPalace==='克'?'妻财':relPalace==='受克'?'官鬼':'父母',relShi=relation(g.e,shi.element);
          add('sanhe-'+g.e,'三合成局 · '+g.n+'合'+roleName+g.e+'局',relShi==='生'||relShi==='比和'?'合局生扶世位，合力助事':relShi==='克'?(roleName==='妻财'?'三合财局克世，利求财而滞文书':'合局克制世位，外方合力施压'):'三合成'+roleName+'局，所主之事聚力成形',
            list(picked)+'三支齐见且两爻以上发动、无空破，构成'+g.n+'三合'+roleName+g.e+'局。'+(relShi==='生'||relShi==='比和'?'合局五行'+relShi+'世位'+shi.ganzhi+shi.element+'，多方力量汇聚扶助自身。':relShi==='克'?'合局五行克世位'+shi.ganzhi+shi.element+'，'+(roleName==='妻财'?'问求财主财气汇聚就我，问文书官事则受财局牵制。':'多方人事合力施压，办事阻力较重。'):'合局聚起'+roleName+'之气，问'+roleName+'所主事项力量集中而持久。'),picked.map(status),[book==='huozhulin'?ref('huozhulin','申子辰三合也'):ref('huangjince','三合成局')],book==='huozhulin'?101:92);
        }
      });
    }
    var clash6={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'},harm6={子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
    var mainChong=[0,1,2].every(function(i){return clash6[rows[i].branch]===rows[i+3].branch;}),mainHe=[0,1,2].every(function(i){return harm6[rows[i].branch]===rows[i+3].branch;});
    var chgChong=useChanges&&moving.length>0&&[0,1,2].every(function(i){return clash6[c.changedRows[i].branch]===c.changedRows[i+3].branch;}),chgHe=useChanges&&moving.length>0&&[0,1,2].every(function(i){return harm6[c.changedRows[i].branch]===c.changedRows[i+3].branch;});
    var pKind=c.main.palace.kind;
    if((mainChong||mainHe)&&(book==='huangjince'||mainChong&&pKind==='本宫')){
      var patRef=book==='huangjince'?ref('huangjince',mainChong?'六冲则难而又凶':'六合则易而且吉'):book==='huozhulin'?ref('huozhulin','八纯主宾不和'):ref('haidiyan','八纯之卦，不宜远行');
      add('hexagram-pattern',mainChong?(chgHe?'本卦六冲变六合':chgChong?'本变俱为六冲卦':'本卦六冲（'+c.main.name+'）'):(chgChong?'本卦六合变六冲':'本卦六合（'+c.main.name+'）'),
        mainChong?(chgHe?'先冲后合，历波折而后成':'主宾不投，利散忧解约而不利聚事'):(chgChong?'先合后冲，始顺而终散':'人事投契，利合作定约而忌病讼缠绵'),
        mainChong?'本卦初四、二五、三上爻地支两两相冲。'+(chgHe?'变卦转为六合，事情起初冲突阻滞，后续经协调得以合拢。':'六冲主散、主急，问解约、散忧易散，问聚财、婚约、远行合作则难聚易散。'):'本卦初四、二五、三上爻地支两两相合。'+(chgChong?'但动而变为六冲卦，前期商谈投契，后期防中途生变拆散。':'六合主和顺凝聚，问合作、交易、婚约易得配合；问词讼、病体则缠绵难结。'),['本卦'+c.main.name+'（'+pKind+'）'+(moving.length?'，变卦'+c.changed.name:'')],[patRef],63);
    }else if(pKind==='游魂'||pKind==='归魂'){
      var soulYou=pKind==='游魂',soulRef=book==='huangjince'?ref('huangjince',soulYou?'卦得游魂，漂泊他方无定迹':'凡遇归魂卦，人有还乡意'):book==='huozhulin'?ref('huozhulin',soulYou?'游魂主忘返':'归魂主自归'):ref('haidiyan',soulYou?'绝命游魂休举步':'归魂不久还乡井');
      add('hexagram-pattern',soulYou?'游魂之卦（'+c.main.name+'）':'归魂之卦（'+c.main.name+'）',soulYou?'心意浮动，事多迁改或往外奔波':'事归原位，宜守熟地旧业而不宜远求',
        soulYou?'本卦属'+c.main.palace.trigram+'宫游魂卦。游魂主变更、外移与心意不定，问驻守、定约易生反复，问出行、行人多在外流连。':'本卦属'+c.main.palace.trigram+'宫归魂卦。归魂主收敛回返，问行人、失物易归原处，问经营宜守成，问远行拓新则受拘束。',['本卦'+c.main.name+' · '+c.main.palace.trigram+'宫'+pKind],[soulRef],59);
    }
    if(useChanges&&moving.length>0){
      var fuyinRows=moving.filter(function(r){return changes(r).includes('伏吟');}),fanyinRows=moving.filter(function(r){return changes(r).includes('反吟');});
      if(fuyinRows.length){
        var fyInner=[0,1,2].every(function(i){return rows[i].branch===c.changedRows[i].branch;}),fyOuter=[3,4,5].every(function(i){return rows[i].branch===c.changedRows[i].branch;}),fyFull=fyInner&&fyOuter||fyInner&&fuyinRows.some(function(r){return r.index<=3;})||fyOuter&&fuyinRows.some(function(r){return r.index>3;}),fyKey=fuyinRows.some(function(r){return r.shi==='世'||options.manualUse&&r.index===yong;});
        add('fuyin-pattern',fyFull?'卦变伏吟':'动爻化伏吟（'+list(fuyinRows)+'）',fyFull?'内外停滞呻吟，欲动难移':'动而复归原支，进展迟滞不前',
          list(fuyinRows)+'发动而变出同支'+fuyinRows.map(function(r){return changed(r).ganzhi;}).join('、')+'，构成'+(fyFull?'卦变伏吟':'爻变伏吟')+'。按化自身或卦变伏吟无用之条，所谋之事困守原地、呻吟难展，须待冲开伏吟地支之日方见转机。',fuyinRows.map(status),[ref('huangjince','化自身或卦变伏吟无用')],fyKey||fyFull?85:73);
      }
      if(fanyinRows.length){
        var fanInner=[0,1,2].every(function(i){return clash6[rows[i].branch]===c.changedRows[i].branch;}),fanOuter=[3,4,5].every(function(i){return clash6[rows[i].branch]===c.changedRows[i].branch;}),fanFull=fanInner&&fanOuter||fanInner&&fanyinRows.some(function(r){return r.index<=3;})||fanOuter&&fanyinRows.some(function(r){return r.index>3;}),fanKey=fanyinRows.some(function(r){return r.shi==='世'||options.manualUse&&r.index===yong;});
        add('fanyin-pattern',fanFull?'卦变反吟':'动爻化反吟（'+list(fanyinRows)+'）',fanFull?'卦势往返冲荡，事多成而复变':'动变六冲反吟，过程反复折腾',
          list(fanyinRows)+'发动而变支'+fanyinRows.map(function(r){return changed(r).ganzhi;}).join('、')+'两两对冲，构成'+(fanFull?'卦变反吟':'爻变反吟')+'。动变相冲主往返拉锯、定而复改，办事防半途反复，待合住冲支方得安定。',fanyinRows.map(status),[ref('huangjince','动逢冲而事散')],fanKey||fanFull?85:73);
      }
    }
    var movTomb=moving.filter(function(r){return a.rows[r.index-1].dayLife==='墓'&&!state(r).broken;});
    if(movTomb.length&&book!=='haidiyan'){
      add('tomb-moving','动爻入于日墓（'+list(movTomb)+'）','动爻入墓受困，当前难施生克',
        list(movTomb)+'发动，于'+a.day+'日逢十二长生墓地。按动爻入墓难克之条，本爻虽动却被日墓收束，当前难去生扶或克制他爻，须待冲开墓库之日方能发力。',movTomb.map(function(r){return status(r)+' · 日墓';}),[book==='huozhulin'?ref('huozhulin','墓，藏也；绝，止也'):ref('huangjince','入墓难克')],77);
    }
    if(a.rows[shi.index-1].dayLife==='墓'&&!ss.strong&&!ss.broken){
      var shiGhost=shi.role==='官鬼',shiTombRef=book==='haidiyan'?ref('haidiyan',shiGhost?'鬼爻入墓吉丰隆':'更嫌身世入墓内犹重'):book==='huozhulin'?ref('huozhulin','墓，藏也；绝，止也'):ref('huangjince',shiGhost?'世随鬼入墓':'墓中人不冲不发');
      add('tomb-shi',shiGhost?'世临官鬼入日墓':'世位休囚入日墓',shiGhost?'世随鬼爻入墓，谨防困顿纠缠':'世爻入墓沉滞，诸事待冲方发',
        '世位'+shi.role+shi.ganzhi+shi.element+'本月'+shi.season+'，又于'+a.day+'日落入墓库。'+(shiGhost?(book==='haidiyan'?'官鬼持世逢日墓，问散忧除患取鬼入墓收敛，问本身进取、病体与词讼则防身世受困。':'官鬼持世而失令入日墓，按世随鬼入墓论，问病讼、行事主沉滞受困，不宜强行冒进。'):'世爻休囚入墓主暗昧沉滞、行动受拘，须待冲破墓库之日方得舒展。'),[status(shi)+' · 日墓'],[shiTombRef],79);
    }
    var godMov=options.manualUse&&rows[yong-1].moving?rows[yong-1]:moving.length===1?moving[0]:shi.moving?shi:moving[0];
    if(godMov&&book==='haidiyan'&&(moving.length===1||shi.moving)){
      var hdGod={
        青龙:['青龙发动万物通','青龙发动，主喜庆进益与和顺','青龙属木主喜庆仁和，本爻得气则进财旺禄、化凶生吉；唯临金爻受克或落旬空时喜力减损。'],
        朱雀:['朱雀交重文印旺','朱雀发动，利文书而防口舌争执','朱雀属火主文书言辞，文印得气则利公门书信；若并凶煞或克世，防因言语招惹是非口舌。'],
        勾陈:['勾陈发动忧田主','勾陈发动，主田土旧事牵连迟滞','勾陈属土主田产与牵连，发动多主旧事盘桓、进展迟缓；唯临木爻制土或落旬空时反得脱洒。'],
        螣蛇:['蛇发动忧索绊','螣蛇发动，防虚惊牵绊与思虑反复','螣蛇主惊疑索绊，发动易生意外挂碍或心神不宁；若临木爻或逢旬空则虚惊自散。'],
        白虎:['白虎交重惊怪事','白虎发动，势急刚猛，求官临鬼反利','白虎属金主刚猛迅疾，问求官任用临旺官反主威权显达；问常事克世受伤则防惊扰耗损。'],
        玄武:['玄武动摇多闇昧','玄武发动，防暗昧隐情与私下耗失','玄武属水主幽暗不明，发动多有隐情遮蔽或财物失脱之防；逢土爻制水或旬空则邪暗难侵。']
      }[godMov.god];
      if(hdGod)add('six-god-move',lineName(godMov.index)+' · '+godMov.god+'临'+godMov.role+'发动',hdGod[1],lineName(godMov.index)+godMov.role+godMov.ganzhi+'带'+godMov.god+'发动。'+hdGod[2],[status(godMov)+' · 六神'+godMov.god],[ref('haidiyan',hdGod[0])],71);
    }else if(book==='huozhulin'){
      var dragonChild=moving.filter(function(r){return r.role==='子孙'&&r.god==='青龙';}),tigerWealth=wealth.filter(function(r){return r.god==='白虎';});
      if(dragonChild.length)add('six-god-move','青龙加子孙发动（'+list(dragonChild)+'）','喜神辅财源发动，求谋进财大吉',list(dragonChild)+'子孙带青龙发动。按《火珠林》求财章，子孙为财源，再加青龙吉神同发，财路亨通而解烦忧，利经营谋望。',dragonChild.map(function(r){return status(r)+' · 青龙';}),[ref('huozhulin','若加青龙发动，不问财爻衰旺，决可求谋')],91);
      else if(tigerWealth.length&&tigerWealth.some(function(r){return r.moving||r.shi==='应';}))add('six-god-move','白虎临财（'+list(tigerWealth)+'）','财带刚煞，交涉初期防先起嗔争',list(tigerWealth)+'妻财临白虎'+(tigerWealth.some(function(r){return r.shi==='应';})?'居应位':'发动')+'。按原书白虎临财先嗔之条，求财交涉初期对方言辞生硬或条件苛急，比和得生时尚可徐图。',tigerWealth.map(function(r){return status(r)+' · 白虎';}),[ref('huozhulin','白虎临财已先嗔')],70);
    }else if(godMov&&book==='huangjince'){
      var hjGod={青龙:'青龙主喜庆礼仪与酒食和悦',朱雀:'朱雀主文书契约、音信与口舌争辩',勾陈:'勾陈主田土房产、旧事盘桓与牵连',螣蛇:'螣蛇主虚惊疑虑、怪异挂碍与反复',白虎:'白虎主刚猛急迫、惊扰刑伤与威权',玄武:'玄武主暗昧隐情、私谋遮蔽与遗失'}[godMov.god],gmUsable=state(godMov).usable;
      add('six-god-move',lineName(godMov.index)+' · '+godMov.god+'附'+godMov.role+'发动',gmUsable?'本爻得气发动，参'+godMov.god+'辨事类细节':'本爻休囚受制，防'+godMov.god+'所主负面事象',
        lineName(godMov.index)+godMov.role+godMov.ganzhi+'临'+godMov.god+'发动。《黄金策》论六神重在附助五行生克以辨事象：'+hjGod+'。本爻'+(gmUsable?'得生扶有气，从正向取其事类之应。':'见空破或衰伤，宜防其所主阻滞与烦扰。'),[status(godMov)+' · 六神'+godMov.god],[ref('huangjince','大体神杀有附助的作用')],57);
    }
    var hiddenViews={};
    rows.filter(function(r){return !!r.hidden;}).forEach(function(r){
      var f=r.hidden,rr=relation(r.element,f.element),empty=has(r,'旬空');
      var monthElement=({寅:'木',卯:'木',巳:'火',午:'火',辰:'土',戌:'土',丑:'土',未:'土',申:'金',酉:'金',亥:'水',子:'水'})[a.month],fBroken=({子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'})[a.month]===f.branch,fStrong=['生','比和'].includes(relation(monthElement,f.element))&&!fBroken,fEmpty=c.calendar.dayVoid.includes(f.branch),fAtDay=f.branch===a.day,underSelf=r.shi==='世';
      var q=rr==='生'?'飞生伏下得长生':rr==='克'?'用遭飞克事难行':rr==='受生'?'卦见伏生飞是脱':rr==='受克'?'伏克飞神为出暴':'飞伏比和';
      var refs=[ref('haidiyan',q)];if(empty)refs.unshift(ref('huangjince','空下伏神，易于引拔'));
      var verdict=empty?'飞神空，伏神便于引出':rr==='克'?'飞神克伏，所求被压住':rr==='生'?'飞神生伏，所求虽藏而得生':rr==='受生'?'伏神生飞，所求被耗泄':rr==='受克'?'伏神克飞，所求欲冲出遮挡':'飞伏比和，所求得同类相助';
      var body=f.role+f.ganzhi+f.element+'伏在'+r.role+r.ganzhi+r.element+'下。'+(empty?'飞神旬空，遮挡不实，伏神便于引出。':rr==='克'?'飞神克伏神，'+f.role+'受压，问其所主之事难办。':rr==='生'?'飞神生伏神，'+f.role+'虽未出现却得生扶。':rr==='受生'?'伏神生飞神，'+f.role+'向外耗泄，所求损耗。':rr==='受克'?'按《海底眼》伏克飞为出暴，伏下之事欲冲破遮挡而出。':'飞伏同五行，相互扶助。');
      if(book==='huozhulin'){
        var own=f.role==='妻财'?{'官鬼':['财伏鬼乡，买卖遭伤','财伏官下，财生官而耗泄','伏财去生官鬼，财被耗泄，原书取买卖受损；子孙有力制官、生财时才有解救。'],'兄弟':['用财伏兄，口舌相侵','财伏兄下，钱被他人把住','伏财受兄弟所克，原书解释为钱被他人把住而起口舌。只有伏世下、财又旺相等条件成立时，原书才另许可得。'],'父母':['财伏父母，旺相得半','财伏父下，财源受制，所得有限','父母克子孙财源，伏财缺少财源接续。原书对财旺相者论得半，意为有原财而续财不足。'],'子孙':['财伏子孙，有气必满','财伏子下，财有来源','飞神子孙生伏财，原书取财有来源；子孙有气且未被世应所克时，求财有利。']}[r.role]:f.role==='官鬼'?{'兄弟':['用鬼伏兄，同类欺凌','官伏兄下，同辈阻事','原书取同类欺凌、人不一心。问任用、办官事，有同辈阻挠；另见旺官持世、临日才作解救。'],'妻财':['鬼伏财乡，因财有伤','官伏财下，钱款阻碍任用文书','财虽生官，却克官的辅助父母。原书指钱款阻住文书，问任用是款项问题拖住手续。'],'父母':['鬼伏父母，举状经官','官伏父下，办官事须凭文书','原书取经官、补名目。官伏在世位父母下，或官旺、父母临日，才取文书有助；伏在其他位置则办理艰辛。'],'子孙':['鬼伏子孙，去路无门','官伏子下，解忧有利，求官受制','子孙克伏官。问解除烦忧有利，问求职、保职不利；伏官旺相且能透出日辰时，原书另论可用。'],'官鬼':['官鬼伏官，小人作难','官伏官下，任用受中间人阻挡','原书区分伏官为所求之官、飞官为遮挡的吏役。问任用、见负责人，中间人阻挡，亲自见负责人是本条所说的解法。']}[r.role]:null;
        if(own){
          refs.unshift(ref('huozhulin',own[0]));verdict=own[1];body=f.role+f.ganzhi+f.element+'伏在'+r.role+r.ganzhi+r.element+'下。';
          if(f.role==='妻财'&&r.role==='官鬼'){var rescue=rows.filter(function(x){return x.role==='子孙'&&state(x).usable&&(x.shi==='世'||has(x,'临日'));});body+='财去生官，钱财耗泄。'+(rescue.length?'本局'+list(rescue)+'子孙得生扶且持世或临日，能够制官、生财，符合本条解救。':'本局未见有力子孙持世或临日，未合本条制官生财的解救，买卖受损。');}
          else if(f.role==='妻财'&&r.role==='兄弟'){var canGet=underSelf&&fStrong&&!fEmpty&&fAtDay;verdict=canGet?'财伏世下旺而临日，争后仍可得财':'财伏兄下，钱被他人把住';body+='兄弟克财，钱财被把住而起口舌。'+(canGet?'本局伏财在世下、得月令又临日，符合旺相透出可成之条。':'本局伏财'+(underSelf?'在世下':'未在世下')+'，'+(fStrong?'得月令':'本月失令')+'，'+(fAtDay?'临日':'未临日')+'，按当前钱被把住、求财有争解释。');}
          else if(f.role==='妻财'&&r.role==='父母'){body+='父母克子孙，财源不续。伏财'+(fStrong&&!fEmpty?'得月令而不空，原书论旺相得半，即有原财而续财不足。':(fBroken?'月破':fEmpty?'旬空':'本月失令')+'，当前连原财也难实收。');}
          else if(f.role==='妻财'&&r.role==='子孙'){var sourceStrong=state(r).usable&&(state(r).strong||![shi,ying].some(function(x){return relation(x.element,r.element)==='克'&&state(x).usable;}));verdict=sourceStrong?'财伏子下，财源有助，利求财':'财伏子下，但财源受损';body+='子孙为财源而生伏财。'+(sourceStrong?'本局子孙得助、无空破，且无有力世应制住财源，按财有来源论求财有利。':'本局子孙见'+note(r)+'财源受损，求财不利。');}
          else if(f.role==='官鬼'&&r.role==='父母'){var documentHelp=underSelf||(fStrong&&!fEmpty)||has(r,'临日');verdict=documentHelp?'官伏父下，文书有助办官事':'官伏父下，办官事文书重叠';body+='官事伏在文书之下。'+(documentHelp?'本局'+(underSelf?'伏官贴世':fStrong&&!fEmpty?'伏官得月令而不空':'父母临日')+'，符合原书利经官、补名目之条，办理有文书之助。':'本局未见贴世、旺官或父母临日，办理文书反复费力。');}
          else if(f.role==='官鬼'&&r.role==='子孙'){body+='子孙克官，问解忧是忧事消退，问任用则受制。'+(fStrong&&!fEmpty&&fAtDay?'本局伏官得月令且临日，符合官旺透出的解救。':'本局伏官未同时得月令而临日，未合官旺透出的解救。');}
          else if(f.role==='官鬼'&&r.role==='妻财'){body+='飞财生官，却克官的辅助父母，钱款阻住任用文书。'+(underSelf&&fStrong&&!fEmpty?'本局官伏世下且得月令，符合原书所列解救之一。':'本局未合旺官伏世下这一项解救，文书仍受钱款牵制。');}
          else if(f.role==='官鬼'&&r.role==='兄弟'){body+='同辈阻挠任用，人事不一心。'+(fStrong&&!fEmpty&&(underSelf||fAtDay)?'本局伏官得月令且贴世或临日，原书另许可用。':'本局未合旺官贴世或临日的解救，按同辈阻事论。');}
          else body+=own[2];
          if(empty)body+='飞神另逢旬空，按旁参条文，遮挡不实、伏神便于引出。';
        }
      }
      if(fEmpty||fBroken){body+='伏神另见'+(fEmpty?'旬空':'')+(fEmpty&&fBroken?'、':'')+(fBroken?'月破':'')+(fEmpty&&fBroken?'，伏下所求未落实且受月建冲阻。':fEmpty?'，伏下所求未落实。':'，伏下所求受月建冲阻。');verdict+='，伏神'+(fBroken?'月破':'旬空')+'未成';}
      hiddenViews[r.index]={verdict:verdict,meaning:body,references:refs};
      add('hidden-'+r.index,lineName(r.index)+'下伏'+f.role,verdict,body,[status(r),'伏神 '+f.role+f.ganzhi+f.element+' · '+(fBroken?'月破':fStrong?'得月令':'失月令')+(fEmpty?' · 旬空':'')+(fAtDay?' · 临日':'')],refs,empty?64:56);
    });
    // Finance: distinguish receiving money from the generation/control vocabulary.
    var fw=wealth.map(function(r){var st=state(r),x=changed(r),route=relation(r.element,shi.element),head,body,refs=[];
      if(useChanges&&r.moving&&r.role==='妻财'&&x.role==='兄弟'){
        head='先聚后散，款项或利润受分耗';body='财爻发动后化出兄弟，且兄弟回头克财。原本可聚的钱，随后受分成、费用、扣减或争执侵占。';refs=[ref('huozhulin','财化兄弟，先聚后散'),ref('haidiyan','财化兄兮财少成')];
      }else if(st.broken){head='财爻月破，当月收款受阻';body=r.ganzhi+'财爻被月建'+a.month+'冲破，问回款、交易，当前收款受阻。'+(st.support.length?'本爻另得'+st.support.join('、')+'，有生扶但同时遭冲破。':'本爻也无日月直接生扶，求财不利。');refs=[ref('haidiyan','月破空亡未可凭')];
      }else if(st.empty){head=st.strong?'财旺逢空，应收款未到手':'财衰逢空，当前求财难成';body=st.strong?'财爻本月旺相又落旬空。旺为财有生机，空为钱未实收；问回款，按有财待收解释。':'财爻本月休囚又落旬空，财既弱又未实，按当前求财难成解释。';refs=[ref('huangjince',st.strong?'带旺匪空':st.hit.length||st.broken?'主象徒存更被伤，凡谋不遂':'无故勿空'),ref('haidiyan','月破空亡未可凭')];
      }else if(useChanges&&r.moving&&x.role==='父母'){head='先易后难，款项卡在文书手续';body='财化父母，《火珠林》取先易后难。问交易、回款，前面商谈顺利，后续结算转入合同、票据或批文，手续拖住收款。';refs=[ref('huozhulin','财化父母，先易后难')];
      }else if(useChanges&&r.moving&&x.role==='官鬼'){head='财化官，得财后又有耗散';body='财生官而化官，原条防走失。问求财，款项收入后又转为支出、耗费，钱难留住。';refs=[ref('haidiyan','财化官兮防走失')];
      }else if(st.clean&&r.shi==='世'){head='财有生扶持世，利得财';body='财爻持世，钱财归到自己；本爻得日月生扶，无空破、回头克等伤财标记，按财来归己解释。';refs=[ref('haidiyan','占财旺相喜持世')];
      }else if(st.clean&&r.moving&&!shi.moving&&(route==='生'||route==='克')){head='财来就我，求财易得';body='世爻安静，'+r.ganzhi+'财爻发动来'+route+'世。按《火珠林》求财篇，财生世、财克世均为财来逐我，主财来就人、求财易得。';refs=[ref('huozhulin','若世安静，财爻发动，生我、克我，此财来逐我之象')];
      }else if(changes(r).includes('化进')){head='财化进，财事渐增';body=r.ganzhi+'变'+x.ganzhi+'，财爻同类化进，问求财取财款、周转规模渐增。';refs=[ref('huangjince','动变比和，当明进退')];
      }else if(changes(r).includes('化退')){head='财化退，财事渐减';body=r.ganzhi+'变'+x.ganzhi+'，财爻同类化退，问求财取财款、周转规模渐减。';refs=[ref('huangjince','动变比和，当明进退')];
      }else if(st.tied){head='财动逢合，收款被绊住';body='财爻发动，却与日月或变爻相合。动合为绊，问交易、回款，原定收款拖延，按解合后再成解释。';refs=[ref('huangjince','动值合而绊住')];
      }else if(st.futureBad){head='财在变后受伤，收款收尾受阻';body='财爻发动见'+changes(r).filter(function(t){return ['回头克','化空','化月破','化墓','化绝','化退'].includes(t);}).join('、')+'，财在后续变化中受伤，问收款是收尾不顺、款项难留。';refs=[ref('huangjince','用爻变动，忌遭死墓绝空')];
      }else if(st.usable){head=r.moving?'财有生扶而动，利卖货变现':'财有生扶而静，宜守旧业';body=r.moving?'财爻有生扶又发动，问脱货、变现，取货物转成财款之利。':'财爻有生扶而安静，问开店、营运，取维持已有生意、持续收款之利。';refs=[ref('haidiyan',r.moving?'脱货求财要用兴':'开店财爻安者利')];
      }else{head='财弱或受伤，当前求财不利';body='财爻本月'+r.season+'，'+(st.hit.length?'又见'+st.hit.join('、'):'日月直接生扶不足')+'。按财弱少得、财受伤则难求解释，当前钱款难收。';refs=[ref('huozhulin','财爻无气，虽有亦无多')];}
      if(st.empty&&!body.includes('空'))body+='财爻又落旬空，当前款项未实收。';
      if(useChanges&&r.moving&&(a.rows[r.index-1].changedTags.includes('旬空')||a.rows[r.index-1].changedTags.includes('月破'))){var futureTags=a.rows[r.index-1].changedTags.filter(function(t){return t==='旬空'||t==='月破';}).join('、');head+='；变'+x.role+futureTags;body+='变出的'+x.role+x.ganzhi+'另见'+futureTags+'，其所指'+({兄弟:'分耗争执',子孙:'财源接续',父母:'文书手续',妻财:'后续款项',官鬼:'后续官事'})[x.role]+(a.rows[r.index-1].changedTags.includes('旬空')?'未落实。':'受月建冲阻。');}
      if(st.support.length&&st.futureBad&&!body.includes('生扶'))body+='本爻见'+st.support.join('、')+'，已有生扶；但动变受伤，财款后续受阻。';
      return {r:r,head:head,body:body,refs:refs};
    });
    var childGood=offspring.filter(function(r){return r.moving&&state(r).usable;}),fatherBad=papers.filter(function(r){return r.moving&&state(r).usable;}),brotherBad=brothers.filter(function(r){return r.moving&&state(r).usable;});
    var extra='',extraEv=[],extraRefs=[];
      if(brotherBad.length&&childGood.length){extra='兄弟'+list(brotherBad)+'动而克财，子孙'+list(childGood)+'亦有力发动，构成兄生子、子生财：兄弟之气转去生财源，减轻直接劫财。';extraEv=[brotherBad.map(status).join('；'),childGood.map(status).join('；')];extraRefs=[ref('huangjince','贪生贪合，刑冲克害皆忘')];
      add('finance-bridge','兄动而子孙通关',fatherBad.length?'兄子相生，但父动克子，财源仍受损':'兄弟之气转生财源，减轻劫财',extra+(fatherBad.length?'但'+list(fatherBad)+'父母有力发动克子孙，财源仍受损。':''),extraEv.concat(fatherBad.map(status)),extraRefs.concat(fatherBad.length?[ref('huozhulin','父母动则子受伤，不能生财')]:[]),88);
    }else if(brotherBad.length){extra='另见'+list(brotherBad)+'兄弟发动而有气，财爻面临同辈、分成与费用侵占，钱款不易独留。';extraEv=brotherBad.map(status);extraRefs=[ref('huozhulin','兄弟为劫财之神')];}
      if(fatherBad.length&&offspring.length){extra+=' '+list(fatherBad)+'父母有力发动，克子孙财源。问经营，文书手续阻碍产出，影响后续收款来源。';extraRefs.push(ref('huozhulin','父母动则子受伤，不能生财'));}
    if(fw.length)topic('finance','求财与交易',fw.map(function(x){return lineName(x.r.index)+'：'+x.head;}).join('；'),fw.map(function(x){return label(x.r)+'。'+x.body;}).join('\n\n')+(extra?'\n\n'+extra:''),fw.map(function(x){return status(x.r);}).concat(extraEv),fw.flatMap(function(x){return x.refs;}).concat(extraRefs));
    else{
      var hiddenWealth=rows.filter(function(r){return r.hidden&&r.hidden.role==='妻财';});
      topic('finance','求财与交易',hiddenWealth.length?hiddenWealth.map(function(r){return lineName(r.index)+'：'+hiddenViews[r.index].verdict;}).join('；'):'本卦无明财，现钱未见',hiddenWealth.length?hiddenWealth.map(function(r){return hiddenViews[r.index].meaning;}).join('\n\n'):'本卦六爻未见妻财；此局不显示现钱，另按子孙财源与伏财论求财。',hiddenWealth.length?hiddenWealth.map(function(r){return status(r)+'；伏财'+r.hidden.ganzhi+r.hidden.element;}):['本卦六亲中妻财未明现'],hiddenWealth.length?hiddenWealth.flatMap(function(r){return hiddenViews[r.index].references;}):[ref('huozhulin','出现旺相，为久为远')]);
    }
    // Office and documents are both required; one is not a replacement for the other.
    var goodOff=official.filter(function(r){return state(r).usable;}),goodPaper=papers.filter(function(r){return state(r).usable;}),offRetreat=official.filter(function(r){return useChanges&&r.moving&&changed(r).role==='子孙';});
    var workHead,workBody,jobChild=offspring.filter(function(r){return r.moving&&state(r).usable;}),jobWealth=wealth.filter(function(r){return r.moving&&state(r).usable;});
      if(book==='huangjince'&&moving.length===6){workHead='六爻竞发，求名求职难成';workBody='本卦六爻全动。《求名》篇取功名恍惚难成；官与文书虽有生扶，六爻竞发仍主职位、材料和相关人事反复。';}
      else if(offRetreat.length){
        var blockedRetreat=offRetreat.filter(function(r){return a.rows[r.index-1].changedTags.some(function(t){return t==='月破'||t==='旬空';});});
        workHead=blockedRetreat.length?'官化子孙而变子空破，解忧未成，求职受克':'官化子孙，解忧有利，求职不利';
        workBody=offRetreat.map(function(r){var tag=a.rows[r.index-1].changedTags.filter(function(t){return t==='月破'||t==='旬空';});return label(r)+'化子孙'+changed(r).ganzhi+'，子孙回头克官。'+(tag.length?'原条忧自除，但本局变子'+tag.join('、')+'，解忧之事未成；问求职、保职，仍见官受回克。':'问解除麻烦，取忧事消退；问求职、保职，取职位受克。');}).join('\n\n');
      }
      else if(jobChild.length||jobWealth.length){workHead=(jobChild.length?'子孙动而伤官':'')+(jobChild.length&&jobWealth.length?'、':'')+(jobWealth.length?'妻财动而破文':'')+'，求职有阻';workBody=(jobChild.length?list(jobChild)+'子孙有力发动克官，职位受伤。':'')+(jobWealth.length?list(jobWealth)+'妻财有力发动克父母，任用文书受伤。':'')+'问求职、考试，分别以官、父母为用，所列动爻是本局阻事之处。';}
      else if(goodOff.length&&goodPaper.length){workHead='官文有气，利求职与任用';workBody='官鬼'+list(goodOff)+'、父母'+list(goodPaper)+'均有生扶且未空破。官为职位，父母为材料与任用文书，两者有助，利办任用。'+goodOff.concat(goodPaper).filter(function(r){return state(r).hit.length;}).map(function(r){return label(r)+'另见'+state(r).hit.join('、')+'，但得'+state(r).support.join('、')+'生扶，按受制而有救解释。';}).join('');}
      else if(goodOff.length&&papers.length){workHead='官有气而父母受损，任用卡在文书';workBody='官鬼'+list(goodOff)+'得生扶，父母文书却见：'+papers.map(function(r){return label(r)+'，'+brief(r);}).join('；')+'问求职、任用，职位有气，材料、合同或批文办理不利。';}
      else if(goodPaper.length&&official.length){workHead='文书有助而官受损，任用仍阻';workBody='父母'+list(goodPaper)+'有生扶，官鬼却见：'+official.map(function(r){return label(r)+'，'+brief(r);}).join('；')+'文件手续有助，职位、名额或任用受阻。';}
      else{workHead=official.length?'官文弱或受伤，求职不利':'官爻未明，职位藏于伏神';workBody=(official.length?official.map(function(r){return label(r)+'，'+brief(r);}).join('；'):'本卦主爻没有官鬼，任用之事先按伏官论。')+(papers.length?'文书所用父母为：'+papers.map(function(r){return label(r)+'，'+brief(r);}).join('；'):'本卦父母也未明现，任用文件没有明爻可取。');}
    topic('work','工作、求职与晋升',workHead,workBody,official.length||papers.length||jobChild.length||jobWealth.length?official.concat(papers,jobChild,jobWealth).map(status):['本卦官鬼、父母均未明现'],[ref('huozhulin','官与文书俱旺相'),ref('huozhulin','官用，官鬼为主')].concat(jobChild.length||jobWealth.length?[ref('haidiyan','财动文书空费力，子动伤官事不亨')]:[]).concat(offRetreat.length?[ref('haidiyan','官化子兮忧自除')]:[]));
    // Relationships are read as two parties. Do not turn generic 相克 into allegations.
    var marriageHead,marriageBody,marriageRefs=[ref('huozhulin','喜合婚姻，世应宜静')];
      if(shi.void&&ying.void){marriageHead='世应俱空，双方约定未实';marriageBody='世位'+shi.ganzhi+'、应位'+ying.ganzhi+'均逢旬空。自己与对方都未实定，问订婚、成约，口头承诺难兑现。';marriageRefs.push(ref('huangjince','世应俱空，人无准实'));}
      else if(shi.moving&&ying.moving){marriageHead='世应俱动，双方进退反复';marriageBody='世位'+shi.ganzhi+'、应位'+ying.ganzhi+'同时发动。双方都在改变主意或安排，问订婚、定约，事情反复、难一次定下。';}
      else if(shi.moving){marriageHead='世动应静，自己反复进退';marriageBody='世位'+shi.ganzhi+'发动，应位'+ying.ganzhi+'安静。按本条，自己改意或改变安排，问定亲、成约，是自己反复。';}
      else if(ying.moving){marriageHead='应动世静，对方反复进退';marriageBody='应位'+ying.ganzhi+'发动，世位'+shi.ganzhi+'安静。按本条，对方改意或改变安排，问定亲、成约，是对方反复。';}
      else if(branchClash||branchHarm){marriageHead=branchClash?'世应相冲，双方安排不合':'世应相害，相处有隐碍';marriageBody='世位'+shi.ganzhi+'与应位'+ying.ganzhi+(branchClash?'地支相冲，双方安排、立场冲突，定约多争执。':'地支相害，问相处有不协调之事，定约受阻。')+(['生','受生','比和'].includes(se)?'两爻五行虽相生或比和，地支冲害仍同时存在。':'');marriageRefs.push(ref('huangjince','盖生中有刑害之两防'));}
      else if(['生','受生','比和'].includes(se)&&ss.clean&&ys.clean){marriageHead='世应静而相扶，利定亲成约';marriageBody='世位'+shi.ganzhi+'、应位'+ying.ganzhi+'安静，相生或比和，且得生扶、无空破冲害。按世应宜静、两家相成之条，利定亲、维持婚约。';}
      else if(se==='克'||se==='受克'){marriageHead='世应相克，双方要求冲突';marriageBody='世位'+shi.ganzhi+shi.element+'与应位'+ying.ganzhi+ying.element+'五行相克。问定亲、相处，双方要求相制，争执多、成约费力。'+(ys.broken?'应位另逢月破，对方安排受冲。':ss.broken?'世位另逢月破，自己安排受冲。':'');}
      else{marriageHead='世应有空破衰伤，定约受阻';marriageBody='世位'+shi.ganzhi+'：'+note(shi)+'应位'+ying.ganzhi+'：'+note(ying)+'双方虽无明动，所列空破、衰伤仍阻碍定亲与成约。';}
    if(book==='haidiyan'){
      var spouse=function(rs,name){return !rs.length?name+'未明现，婚配所用藏于伏神':rs.map(function(r){var st=state(r);return label(r)+'，'+(st.broken?'月破，婚配受阻':st.empty?'逢空，婚配未定':st.clean?'得生扶而无冲伤，婚配有利':note(r)+'婚配不利');}).join('；');};
      marriageBody='按本书婚姻篇，问娶妻以妻财为主，问嫁夫以官鬼为主。\n\n问娶妻：'+spouse(wealth,'妻财')+'。\n\n问嫁夫：'+spouse(official,'官鬼')+'。\n\n世应再看双方：'+marriageBody;
      marriageRefs.unshift(ref('haidiyan','娶妻先向财中觅，嫁夫可类鬼爻推'));
      marriageHead='妻财论妻、官鬼论夫；'+marriageHead;
    }
    topic('relationship','感情、婚约与相处',marriageHead,marriageBody,[status(shi),status(ying)].concat(book==='haidiyan'?wealth.concat(official).map(status):[]),marriageRefs);
    // Contracts have 父母 as primary. A financial change can help trade but damage papers.
    var paperViews=papers.map(function(r){var st=state(r),x=changed(r),h,t;
      if(useChanges&&r.moving&&x.role==='妻财'){h='父化财回克，文书受财款牵制';t='父母化妻财，财回头克父。问合同、证照，金额、付款约定阻碍签署与批复；问买卖，则另按父化财、先难后易论。';}
      else if(st.broken||st.empty){h=st.broken?'手续有破口，文件难落稳':'文件未落实，批文或承诺待实';t=note(r)+'问签署、办证、审批，关口正落在文件能否正式成立，而不是只看有没有口头答复。';}
      else if(st.usable){h=r.moving?'父母有生扶发动，利文件办理':'父母有生扶安静，利维持原约';t=r.moving?'父母得生扶且发动，问签约、办证，文件与手续有助，利继续办理。':'父母有生扶而静，问已有合同、约定，取原约维持之利；本条所指是文书稳定。';}
      else{h='父母弱或受伤，文件办理不利';t=note(r)+'问合同、审批，材料、凭据或办理手续受阻。';}
      return {r:r,h:h,t:t};});
      topic('papers','合同、证照与文书',paperViews.length?paperViews.map(function(x){return lineName(x.r.index)+'：'+x.h;}).join('；'):'父母未明，文书藏于伏神',paperViews.length?paperViews.map(function(x){return label(x.r)+'。'+x.t;}).join('\n\n'):'本卦主爻没有父母，文书所用未明现；按伏父论文件手续，不能以其他六亲代替父母判成约。',papers.length?papers.map(status):['本卦主爻父母未明现'],[ref('huangjince','究父母，推为体统')].concat(papers.some(function(r){return useChanges&&r.moving&&changed(r).role==='妻财';})?[ref('huozhulin','父母化财，先难后易')]:[]));
    var trouble=moving.filter(function(r){return relation(r.element,shi.element)==='克'&&state(r).usable;}),tripHead,tripBody;
      if(ss.broken||ss.empty){tripHead=ss.broken?'世位月破，行程受阻':'世位逢空，行意未实，难动身';tripBody='世为出行者，本卦世位'+shi.ganzhi+(ss.broken?'与月建相冲，原定行程受阻。':'逢旬空，按世空去不成解释。')+(trouble.length?'另见'+list(trouble)+'有力发动克世，出行又受外事阻碍。':'');}
      else if(trouble.length){tripHead='动爻克世，出行有阻';tripBody=list(trouble)+'有力发动，克出行者的世爻'+shi.ganzhi+'。按动克世、路艰难论，行程受阻；本卦克世的是'+trouble.map(function(r){return r.role;}).join('、')+'。';}
      else if(ss.usable&&shi.role==='子孙'){tripHead='子孙得生扶持世，出行顺利';tripBody='子孙'+shi.ganzhi+'持世，得生扶，无空破与有力动爻克世。按子孙持世利出行之条，行旅顺利、烦忧减轻。';}
      else if(ss.clean){tripHead='世得生扶、无空破，利出行';tripBody='世位'+shi.ganzhi+'得生扶，无空破与有力动爻克世，按世旺出行有利解释。'+(middle.length?'但'+list(middle)+'间爻发动，途中衔接有拖延。':'');}
      else if(ss.usable){tripHead='世虽休囚而得助，出行有救';tripBody='世位'+shi.ganzhi+'见'+tags(shi).join('、')+'。虽受所列日月牵制，仍得生扶，按衰而有救解释出行。';}
      else{tripHead='世弱或受伤，行旅劳顿';tripBody='世位'+shi.ganzhi+'本月'+shi.season+'，见'+(tags(shi).join('、')||'无日月直接生扶')+'。按出行以世为行人，世衰则旅途劳顿、办事不利。';}
    topic('travel','出行与办事',tripHead,tripBody,[status(shi)].concat(trouble.map(status)),[ref('haidiyan','动爻克世路艰难'),ref('huangjince','世如衰弱，那堪水宿风餐')]);
    var goods=wealth.map(function(r){var st=state(r),where=r.index<=3?'内卦，原条指家中':'外卦，原条指家外',head,body;
      if(st.broken||st.empty){head=st.broken?'财爻月破，当前难寻':'财爻旬空，物信未实';body=label(r)+'处'+where+'，又'+(st.broken?'月破，财爻受冲，按物散难寻解释。':'旬空，物的消息未实，按当前难寻解释。');}
      else if(!r.moving){head=r.index<=3?'财静在内，从家中原处找':'财静在外，从外出经手处找';body=label(r)+'处'+where+'，且安静。原条财静宜寻，按此爻指向原放置处、原经手范围寻找。';}
      else{head=r.index<=3?'内财发动，家中物件有搬移':'外财发动，物件经外出移转';body=label(r)+'处'+where+'，又发动。按此爻从搬动、携带、转交的经过寻找。';}
      return {r:r,head:head,body:body};
    });
    var lostHidden=rows.filter(function(r){return r.hidden&&r.hidden.role==='妻财';});
    topic('lost','失物与寻找',goods.length?goods.map(function(x){return lineName(x.r.index)+'：'+x.head;}).join('；'):'财藏伏神，物在收藏遮盖之处',goods.length?goods.map(function(x){return x.body;}).join('\n\n'):lostHidden.map(function(r){return '伏财'+r.hidden.ganzhi+'在'+lineName(r.index)+r.role+r.ganzhi+'下。按伏财论物件被收藏、遮盖；本局飞伏关系为'+hiddenViews[r.index].verdict+'。';}).join(''),wealth.length?wealth.map(status):lostHidden.map(function(r){return lineName(r.index)+'下伏财'+r.hidden.ganzhi+r.hidden.element;}),[ref('haidiyan','财爻在内不出屋'),ref('haidiyan','财爻不动宜寻觅')]);
    var finance=topics.find(function(t){return t.id==='finance';}),work=topics.find(function(t){return t.id==='work';});
    if(book==='huozhulin'){
      finance.meaning+='\n\n《火珠林》以子孙辅助财爻，代表财源。'+(offspring.length?offspring.map(function(r){return label(r)+'，'+(state(r).usable?'得生扶且无空破，财源有助':note(r)+'财源受其所列状态影响');}).join('；'):'本卦明爻无子孙；'+rows.filter(function(r){return r.hidden&&r.hidden.role==='子孙';}).map(function(r){return '子孙'+r.hidden.ganzhi+r.hidden.element+'伏在'+lineName(r.index)+r.role+r.ganzhi+'下，'+hiddenViews[r.index].verdict;}).join('；'))+'。';
      finance.references.push(ref('huozhulin','用妻财以子孙辅之'));
      rows.filter(function(r){return r.hidden&&r.hidden.role==='子孙';}).forEach(function(r){finance.references=finance.references.concat(hiddenViews[r.index].references);});
      var goodW=wealth.filter(function(r){return state(r).usable;}),goodC=offspring.filter(function(r){return state(r).usable;});
      var fwVerdict=goodW.length&&goodC.length?'财福两旺，财源与财爻相生有气':goodW.length&&!offspring.length?'明财有气，唯子孙财源伏藏':goodW.length?'妻财有气而子孙受制，利现财乏续源':goodC.length&&wealth.length?'子孙财源有气，妻财受困待扶':!wealth.length&&goodC.length?'明财未现而子孙得气，源头尚存':'财福俱弱或受制，财源与收款两阻';
      var fwMeaning='《火珠林》论财首重子孙生财之源。本局'+(wealth.length?'妻财见'+list(wealth)+'（'+(goodW.length?'得生扶有气':'逢空破或休囚受制')+'）':'明爻不见妻财，财星藏于伏神')+'；'+(offspring.length?'子孙见'+list(offspring)+'（'+(goodC.length?'有气生财，源头相续':'失令受伤，生财乏力')+'）':'明爻无子孙，财源伏于飞爻之下')+'。'+(brotherBad.length&&!childGood.length?'局中兄弟'+list(brotherBad)+'发动劫财而无子孙通关，防分夺耗损。':fatherBad.length?'局中父母'+list(fatherBad)+'发动克制子孙，防文书手续截断财源。':'参看妻财对世位'+shi.ganzhi+shi.element+'之向背定得失。');
      add('fire-wealth','财用结构 · 子孙财源与妻财',fwVerdict,fwMeaning,wealth.concat(offspring).length?wealth.concat(offspring).map(status):[status(shi)],[ref('huozhulin','用妻财以子孙辅之'),ref('huozhulin','财来扶世，求之不难')],89);
      var foVerdict=goodOff.length&&goodPaper.length?'官印相生俱旺，名位与凭据齐备':goodOff.length?'官鬼有气而父母乏力，有位缺文凭相辅':goodPaper.length?'父母文书有气而官鬼弱，手续备而名位难立':'官鬼与父母失气或藏伏，官印两缺';
      var foMeaning='《火珠林》论官必兼察官鬼与父母印绶。本局'+(official.length?'官鬼见'+list(official)+'（'+(goodOff.length?'得气可用':'休囚或逢空破受制')+'）':'明爻不见官鬼，官星藏于伏神')+'；'+(papers.length?'父母见'+list(papers)+'（'+(goodPaper.length?'有气护官主文书顺遂':'受制乏力，文凭难凭')+'）':'明爻无父母，印绶伏藏')+'。'+(jobChild.length?'局中子孙'+list(jobChild)+'发动克官，不利求名任用。':jobWealth.length?'局中妻财'+list(jobWealth)+'发动克父，文书印信受阻。':'参看官父两爻与世位'+shi.ganzhi+shi.element+'之生克定成败。');
      add('fire-office','官用结构 · 官鬼与父母相辅',foVerdict,foMeaning,official.concat(papers).length?official.concat(papers).map(status):[status(shi)],[ref('huozhulin','用官鬼以父母辅之'),ref('huozhulin','官与文书俱旺相')],87);
    }
      if(book==='huangjince'&&fatherBad.length&&brotherBad.length&&!childGood.length){finance.verdict='父兄同动，财源与财款俱伤；'+finance.verdict;finance.meaning+='\n\n父母、兄弟均有力发动，又无有力子孙发动通关。本书求财篇取父克子、兄克财，财源与财款同时受损，求财不利。';finance.references.push(ref('huangjince','父兄皆动，无殊缘木以求鱼'));}
    if(book==='huangjince'&&moving.length===6)work.references.push(ref('huangjince','六爻竞发，功名恍惚以难成'));
    var ownTopicQuotes={huozhulin:{finance:'财来扶世，求之不难',work:'官与文书俱旺相',relationship:'喜合婚姻，世应宜静',papers:'占官必用父母',travel:'世空去不成',lost:'但看财爻伏何爻之下'},haidiyan:{finance:'占财旺相喜持世',work:'官旺文书有气前',relationship:'娶妻先向财中觅',papers:'文书不动及时辰',travel:'动爻克世路艰难',lost:'财爻不动宜寻觅'},huangjince:{finance:'要问吉凶，但看财福',work:'父爻旺相，文成掷地金声',relationship:'世为己，应为人',papers:'究父母，推为体统',travel:'世如衰弱，那堪水宿风餐',lost:'世合世冲，须用遣人寻觅'}};
    topics.forEach(function(t){t.references=unique([ref(book,ownTopicQuotes[book][t.id])].concat(t.references));t.reference=t.references[0];});
      if(options.manualUse){
        var chosen=rows[yong-1],cs=state(chosen),yuanMov=moving.filter(function(r){return r.index!==chosen.index&&state(r).usable&&relation(r.element,chosen.element)==='生';}),jiMov=moving.filter(function(r){return r.index!==chosen.index&&state(r).usable&&relation(r.element,chosen.element)==='克';});
        var useQuote=book==='huozhulin'?'旺爻即用神也':book==='haidiyan'?'若见用爻生得地，无刑无克方有气':'用爻有气无他故，所作皆成';
        var useVerdict=jiMov.length&&!yuanMov.length?'忌神动而克用，所求受阻':cs.clean?(yuanMov.length?'用神得气且元神动生，所求有利':'用神得助无伤，所求有利'):cs.broken?'用神月破，当前所求受阻':cs.empty?(cs.strong?'用神旺空，所求未落实':'用神弱空，当前所求难成'):cs.futureBad?'用神变端受伤，办事后续受阻':yuanMov.length?'用神虽弱而元神动生，困中有救':'用神有衰伤，所求不顺';
        var useMeaning=note(chosen)+(yuanMov.length?'卦中元神'+list(yuanMov)+'得气发动生扶用神，源头有力。':'')+(jiMov.length?'卦中忌神'+list(jiMov)+'得气发动克制用神，'+(yuanMov.length?'赖元神通关化忌生用。':'宜防阻滞伤损。'):'');
        add('manual-use','指定用神 · '+label(chosen),useVerdict,useMeaning,[status(chosen)].concat(yuanMov.map(status),jiMov.map(status)),[ref(book,useQuote)],125);
      }
    // Keep other books visibly separate: a book name cannot turn another book's rule into its own.
    cards.forEach(function(card){card.references.sort(function(x,y){return Number(y.book===book)-Number(x.book===book);});card.reference=card.references[0]||null;if(card.references.some(function(r){return r.book===book;}))card.score+=1000;});
    cards.sort(function(x,y){return y.score-x.score||x.id.localeCompare(y.id);});
    var supplementary=cards.filter(function(card){return !card.references.some(function(r){return r.book===book;});});
    cards=cards.filter(function(card){return card.references.some(function(r){return r.book===book;});});
      if(!cards.length){add('finance-basis','按求财看本卦',finance.verdict,finance.meaning,finance.evidence,finance.references,10);add('work-basis','按求职看本卦',work.verdict,work.meaning,work.evidence,work.references,9);}
    var leadCard=cards[0],bookFocus=book==='huozhulin'?'《火珠林》重财福官印相辅与飞伏根源：':book==='haidiyan'?'《海底眼》重日辰旺衰、世应向背与动静分途：':'《黄金策》重日月纲领、动变救应与分占主用：';
    var summary=c.main.name+(moving.length?'变'+c.changed.name+'（'+moving.length+'爻动）':'六爻安静')+'，世居'+lineName(shi.index)+shi.role+shi.ganzhi+'（'+(ss.broken?'月破':ss.empty?'旬空':ss.strong?'得月令':'本月'+shi.season)+'），应居'+lineName(ying.index)+ying.role+ying.ganzhi+'。'+bookFocus+(leadCard?leadCard.verdict+'。':'参看分占六亲。');
    var focus='参看'+(side==='main'?'本卦':'变卦')+' '+label(view),overview=c.main.name+(moving.length?' → '+c.changed.name:'（静卦）');
    var facts=['世：'+status(shi),'应：'+status(ying),'月建'+a.month+'，日辰'+a.day+'，日空'+c.calendar.dayVoid,moving.length?'动爻：'+moving.map(label).join('；'):'六爻无明动','本宫'+c.main.palace.trigram+'宫'+c.main.palace.element];
    if(side==='changed'&&!rows[n-1].moving)facts.push('参看位置本爻未动，其变卦纳甲为随全卦重排的位置。');
    var profile={huozhulin:{title:'财官取用与飞伏',text:'财以子孙为辅助，官以父母为辅助；对照本卦财官、飞伏与世应列断语。'},haidiyan:{title:'日辰、世应与独发乱动',text:moving.length===1?'本卦独发，按一爻动变并日辰旺衰读；各占事按正文分类篇分别取用。':moving.length>1?'本卦多动，依所据版本乱动篇取本卦旺相有情，不采用变卦逐爻动化断语。':'六爻安静，按日辰、世应、旺衰与飞伏读，不套独发动变口诀。'},huangjince:{title:'旺衰、动变与成败救应',text:'合看日月、实际动变、空破及救应；再依不同占事取相应六亲。'}}[book];
    return {version:2,profile:profile,usesChangedJudgments:useChanges,book:book,bookName:NAMES[book],overview:overview,focus:focus,summary:summary,facts:facts,cards:cards,supplementary:supplementary,topics:topics,selected:{side:side,index:n},useIndex:options.manualUse?yong:null,topic:options.topic||'all',signature:JSON.stringify([c.main.value,c.changed.value,c.calendar.pillars,c.moving,n,side,options.manualUse?yong:null,book,options.topic||'all'])};
  }
  global.LiuyaoReading=Object.freeze({snapshot:snapshot,analyze:analyze,lineName:lineName,relation:relation,reference:reference,pairs:PAIRS});
})(window);
