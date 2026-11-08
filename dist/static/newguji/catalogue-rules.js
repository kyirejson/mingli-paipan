/* Independently mapped public editions. Remote service page numbers are not reused. */
(function(global){
  'use strict';
  var stems='甲乙丙丁戊己庚辛壬癸',months='寅卯辰巳午未申酉戌亥子丑',elements='木木火火土土金金水水';
  var qiong=[[2,3,4,5,6,6,7,8,9,10,11,12],Array.from({length:12},function(_,i){return i+13;}),Array.from({length:12},function(_,i){return i+25;}),[37,38,39,40,41,42,43,44,44,45,46,46],[48,48,49,50,51,52,53,54,55,56,57,57],[58,59,60,61,61,61,62,62,62,63,63,63],Array.from({length:12},function(_,i){return i+65;}),Array.from({length:12},function(_,i){return i+77;}),Array.from({length:12},function(_,i){return i+90;}),Array.from({length:12},function(_,i){return i+102;})];
  function tabs(view,book,api){
    var data=global.BaziPublicCatalog;if(!data)throw Error('古籍目录未加载');
    var b=view.gjData.bzArr,stem=stems.indexOf(b[4]),month=months.indexOf(b[3]),out=[],seen=new Set();
    function put(code,key,mode,target){
      var entry=(data.books[code]||[]).find(function(e){return typeof key==='number'?e.chapter===key:e.title===key;});if(!entry)return;
      var id=entry.url+'|'+(mode||'chapter')+'|'+(target||'');if(seen.has(id))return;seen.add(id);
      var source={url:entry.url,expected:entry.title,book:book.name,mode:mode||'chapter',target:target||'',bazi:b.slice(),label:entry.title};
      out.push({index:out.length,value:entry.title+(target?' · '+target:''),publicSource:source});
    }
    var geju=String(view.gjData.geju||''),raw=[];
    if([2,5,6,9].includes(book.id)&&api&&api['getGuji'+book.id+'_branch'])raw=api['getGuji'+book.id+'_branch'](b,geju)||[];
    if(book.id===1&&stem>=0&&month>=0)put('004',qiong[stem][month]);
    else if(book.id===2){
      if(stem>=0)put('007','天干','stemSection',b[4]+elements[stem]);
      if(/官|杀|煞/.test(geju))put('007','官杀');if(/伤官/.test(geju))put('007','伤官');
      put('007','体用');put('007','月令');
    }else if(book.id===5){
      raw.forEach(function(t){var name=t.value;if(/弃命从|专旺/.test(name))name='论杂格';put('002',name);});
      if(!out.length){put('002','论用神');put('002','论用神成败救应');}
      put('002','论用神配气候得失');
    }else if(book.id===6){
      raw.filter(function(t){return t.index===0;}).forEach(function(t){
        var plain=t.value.replace(/^论/,'');var entry=data.books['001'].find(function(e){return e.title===t.value||e.title===plain+'论'||e.title.replace(/^(?:内|外)十八格-/,'')===plain;});
        if(entry)put('001',entry.chapter);
      });
      if(stem>=0)put('001','十干体象','stemSection',b[4]+elements[stem]);put('001','论月令');if(month>=0)put('001',203+month);
    }else if(book.id===7&&stem>=0){
      var token=b[4]+elements[stem];
      (data.books.tianyuan||[]).filter(function(e){return e.title.includes(token);}).forEach(function(e){put('tianyuan',e.chapter,'tianyuan');});
      if(b[4]==='戊')put('tianyuan',20,'tianyuan');
    }else if(book.id===8){put('008','金不换骨髓歌断');if(stem>=0)put('008','十天干体象全编论','stemSection',b[4]+elements[stem]);
    }else if(book.id===9){
      if(/禄|刃|比|劫/.test(geju))put('003','比劫禄刃篇');put('003','格局篇');put('003','六神篇');put('003','运限篇');
    }else if(book.id===10){
      put('013',17);put('013',b[4]==='甲'||b[4]==='乙'?8:b[4]==='戊'||b[4]==='己'?9:b[4]==='庚'||b[4]==='辛'?10:b[4]==='壬'||b[4]==='癸'?11:7);put('013',19);put('013',2);put('013',4);
    }else if(book.id===11){
      [b[0]+b[1],b[4]+b[5]].forEach(function(target){if(out.some(function(t){return t.publicSource.target===target;}))return;out.push({index:out.length,value:'干支纳音 · '+target,publicSource:{url:encodeURI('https://libokang.com/classics/bazi/李虚中命书/'),expected:'李虚中命书',book:book.name,mode:'pairedPillar',target:target,bazi:b.slice()}});});
    }
    else if(book.id===4&&b[7]==='*'&&stem>=0&&month>=0)out.push({index:0,value:b[3]+'月'+b[4]+'日 · 各时辰原章',publicSource:{url:'https://luckclub.cn/bazi/015/'+String(month*10+stem+1).padStart(3,'0')+'/',expected:b[4]+'日',book:book.name,mode:'chapter',target:'',bazi:b.slice()}});
    else if([3,4].includes(book.id))return null;
    return out;
  }
  global.BaziClassicsCatalogue=Object.freeze({tabs:tabs});
})(window);
