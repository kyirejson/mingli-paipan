(function(global){
  'use strict';
  var CASES='wzbz_local_userlist_v14',CONFLICTS='wzbz_recovery_conflicts_v1',VERSIONS='wzbz_local_revision_v1';
  var storage=global.localStorage,proto=global.Storage?global.Storage.prototype:storage;
  var original={get:proto.getItem,set:proto.setItem,remove:proto.removeItem,clear:proto.clear};
  var active=false,internal=false,timer=null,queue=Promise.resolve(),queuedData='',revision=0,flushedRevision=-1;
  var status={ready:false,native:false,error:'',recovered:0};
  var nonce=null;
  if(global.crypto&&global.crypto.getRandomValues){var bytes=new Uint8Array(32);global.crypto.getRandomValues(bytes);nonce=Array.from(bytes,function(n){return n.toString(16).padStart(2,'0');}).join('');}
  function protectedKey(k){return /^wzbz_local_/.test(k)||/^setting_/.test(k)||/^wzbz_notes?_/.test(k)||/^wzbz_fivearts_/.test(k)||k==='wzbz_preferenceIsShow'||k===CONFLICTS;}
  function get(k){return original.get.call(storage,k);}
  function set(k,v){original.set.call(storage,k,v);}
  function keys(){var result=[];for(var i=0;i<storage.length;i++)result.push(storage.key(i));return result.filter(function(k){return typeof k==='string';}).sort();}
  function collect(){var result={};keys().filter(protectedKey).forEach(function(k){var raw=get(k);if(raw!==null)result[k]=raw;});return result;}
  var initial=collect(),restored=new Set();
  function parse(raw,kind){
    var value=JSON.parse(raw);
    if(!value||typeof value!=='object'||kind==='array'&&!Array.isArray(value)||kind==='object'&&Array.isArray(value))throw Error('本机记录格式异常，已保留原始资料');
    return value;
  }
  function conflicts(key,raw){
    var all=JSON.parse(get(CONFLICTS)||'{}'),items=all[key]||[];
    if(items.indexOf(raw)<0){items.push(raw);all[key]=items;set(CONFLICTS,JSON.stringify(all));}
  }
  function mergeValue(key,current,incoming){
    if(incoming==null||incoming===current)return current;
    if(current==null)return incoming;
    if(key===CONFLICTS){var conflictsA=parse(current,'object'),conflictsB=parse(incoming,'object');Object.keys(conflictsB).forEach(function(k){if(['__proto__','constructor','prototype'].includes(k))return;conflictsA[k]=Array.from(new Set([].concat(conflictsA[k]||[],conflictsB[k])));});return JSON.stringify(conflictsA);}
    if(key===CASES){
      var rows=parse(current,'array'),other=parse(incoming,'array'),found=new Map();
      rows.forEach(function(item){if(item&&item.guid!=null)found.set(String(item.guid),item);});
      other.forEach(function(item){
        if(!item||item.guid==null)return;
        var previous=found.get(String(item.guid));
        if(!previous){rows.push(item);found.set(String(item.guid),item);status.recovered++;}
        else if(JSON.stringify(previous)!==JSON.stringify(item))conflicts(key,JSON.stringify(item));
      });return JSON.stringify(rows);
    }
    if(/^wzbz_local_(?:notes|groups|hepan|caiyun)|^wzbz_note_drafts|^wzbz_fivearts_record/.test(key)){
      var first=parse(current),second=parse(incoming);
      if(Array.isArray(first)&&Array.isArray(second)){
        var seen=new Set(first.map(function(item){return String(item.guid||item.id||item.orderid||JSON.stringify(item));}));
        second.forEach(function(item){var id=String(item.guid||item.id||item.orderid||JSON.stringify(item));if(!seen.has(id)){seen.add(id);first.push(item);}else if(!first.some(function(x){return JSON.stringify(x)===JSON.stringify(item);}))conflicts(key,JSON.stringify(item));});
      }else if(!Array.isArray(first)&&!Array.isArray(second)){
        Object.keys(second).forEach(function(id){if(['__proto__','constructor','prototype'].includes(id))return;if(!Object.prototype.hasOwnProperty.call(first,id))first[id]=second[id];else if(JSON.stringify(first[id])!==JSON.stringify(second[id]))conflicts(key,JSON.stringify({id:id,value:second[id]}));});
      }else throw Error('本机记录格式不一致，原资料已保留');
      return JSON.stringify(first);
    }
    return current; // Existing settings are never reset during upgrade.
  }
  function mergeData(data){
    var incomingVersions=JSON.parse(data[VERSIONS]||'{}'),versions=JSON.parse(get(VERSIONS)||'{}');
    Object.keys(data).filter(function(k){return protectedKey(k)&&k!==VERSIONS;}).forEach(function(key){
      if(typeof data[key]!=='string')return;var current=get(key);if(!active&&initial[key]==null&&!restored.has(key))current=null;
      var newer=Number(incomingVersions[key]||0)>Number(versions[key]||0);
      var merged=newer?mergeValue(key,data[key],current):mergeValue(key,current,data[key]);
      if(merged!==get(key))set(key,merged);restored.add(key);versions[key]=Math.max(Number(incomingVersions[key]||0),Number(versions[key]||0));
    });
    if(Object.keys(versions).length)set(VERSIONS,JSON.stringify(versions));
  }
  function errorState(error){status.error=error&&error.message||'本机保护备份失败';if(global.dispatchEvent&&global.CustomEvent)global.dispatchEvent(new CustomEvent('wzbz:data-protection-error',{detail:status.error}));}
  function plugin(){return global.Capacitor&&global.Capacitor.Plugins&&global.Capacitor.Plugins.DataVault;}
  function snapshot(data){return JSON.stringify({format:'zaohua-data-vault',schema:1,origin:global.location.origin,savedAt:new Date().toISOString(),data:data});}
  function flush(){
    if(timer){clearTimeout(timer);timer=null;}
    if(!active)return ready.then(flush);
    var seq=revision;
    if(status.ready&&seq===flushedRevision&&queuedData)return queue;
    var data=collect(),fingerprint=JSON.stringify(data);
    if(fingerprint===queuedData){flushedRevision=seq;return queue;}
    queuedData=fingerprint;
    var payload=snapshot(data),native=plugin();
    var operation=queue.catch(function(){}).then(function(){
      if(native)return native.save({token:nonce,payload:payload}).then(function(result){if(!result||result.ok!==true)throw Error('本机保护备份未确认写入');});
      // Browser preview protection only. Android uses app-private native storage.
      set('zaohua_web_vault_previous_v1',get('zaohua_web_vault_v1')||'');set('zaohua_web_vault_v1',payload);
    }).then(function(){flushedRevision=seq;if(seq===revision)status.error='';});
    queue=operation;operation.catch(function(error){if(queue===operation){queuedData='';flushedRevision=-1;}errorState(error);});return operation;
  }
  function schedule(){revision++;if(!active)return;if(timer)clearTimeout(timer);timer=setTimeout(function(){timer=null;flush().catch(function(){});},350);}
  function checkWrite(key,value){
    var old=get(key);if(old==null||old===value)return;
    if(key===CASES){
      var before=parse(old,'array'),next=parse(value,'array'),ids=new Set(next.map(function(item){return item&&String(item.guid);}));
      if(before.some(function(item){return item&&item.guid!=null&&!ids.has(String(item.guid));}))throw Error('已阻止覆盖或清空已有命盘，请使用合并恢复');
    }
    if(/^wzbz_local_notes|^wzbz_note_drafts|^wzbz_fivearts_record/.test(key)){
      var previous=parse(old,'object'),after=parse(value,'object'),savedNotes=null;
      if(/^wzbz_note_drafts/.test(key)){try{savedNotes=parse(get('wzbz_local_notes_v14')||'{}','object');}catch(_){savedNotes={};}}
      if(Object.keys(previous).some(function(id){return !Object.prototype.hasOwnProperty.call(after,id)&&!(savedNotes&&Object.prototype.hasOwnProperty.call(savedNotes,id));}))throw Error('已阻止移除已有笔记或排盘记录');
    }
  }
  proto.setItem=function(key,value){
    key=String(key);value=String(value);
    if(this===storage&&protectedKey(key)&&!internal){
      checkWrite(key,value);var previous=get(VERSIONS),versions=JSON.parse(previous||'{}');
      if(key!==VERSIONS&&get(key)!==value){versions[key]=Number(versions[key]||0)+1;set(VERSIONS,JSON.stringify(versions));}
      try{original.set.call(this,key,value);}catch(error){if(previous===null)original.remove.call(storage,VERSIONS);else set(VERSIONS,previous);throw error;}
      schedule();return;
    }
    return original.set.call(this,key,value);
  };
  proto.removeItem=function(key){if(this===storage&&protectedKey(String(key))&&!internal)throw Error('已阻止清除命盘、笔记或本机设置');return original.remove.call(this,key);};
  proto.clear=function(){if(this!==storage)return original.clear.call(this);keys().forEach(function(k){if(!protectedKey(k))original.remove.call(storage,k);});};
  function restoreSnapshot(raw){
    if(!raw)return;
    var value=JSON.parse(raw);if(value.format!=='zaohua-data-vault'||value.schema!==1||!value.data||typeof value.data!=='object'||Array.isArray(value.data))throw Error('升级保护备份格式异常，原备份未删除');
    mergeData(value.data);
  }
  async function start(){
    var native=plugin(),backup;
    var isAndroid=global.Capacitor&&typeof global.Capacitor.getPlatform==='function'&&global.Capacitor.getPlatform()==='android';
    if(isAndroid&&!native)throw Error('命盘保护组件未加载，已停止初始化，未清除原资料');
    if(native&&!nonce)throw Error('命盘保护访问校验未就绪，原资料未清除');
    status.native=!!native;
    if(native){
      var timeout;try{backup=await Promise.race([native.read({token:nonce}),new Promise(function(_,reject){timeout=setTimeout(function(){reject(Error('读取命盘保护备份超时，原资料未改动'));},12000);})]);}finally{clearTimeout(timeout);}
    }else backup={current:get('zaohua_web_vault_v1'),previous:get('zaohua_web_vault_previous_v1')};
    internal=true;
    try{
      // Prefer current, retain older records by GUID; tombstones in current win.
      var errors=[],valid=0;['current','previous'].forEach(function(key){if(!backup||!backup[key])return;try{restoreSnapshot(backup[key]);valid++;}catch(error){errors.push(error);conflicts('unreadable-native:'+key,backup[key]);}});
      if(errors.length&&!valid)throw errors[0];
      keys().filter(function(k){return k!==CASES&&/^wzbz_local_userlist_v\d+$/.test(k);}).forEach(function(k){var raw=get(k);parse(raw,'array');set(CASES,mergeValue(CASES,get(CASES),raw));});
      // Old Vuex caches are candidates, not authoritative saved records: preserve raw bytes.
      ['userArr','wzbz_userlist','wzbz_recentlyList'].forEach(function(k){var raw=get(k);if(raw)conflicts('legacy:'+k,raw);});
    }finally{internal=false;}
    active=true;await flush();status.ready=true;
  }
  function exportRaw(){return JSON.stringify({format:'zaohua-preserved-raw',data:collect()},null,2);}
  function transaction(items,write){
    var names=Array.from(new Set(items.concat([CONFLICTS,VERSIONS]))),before=names.map(get);
    try{return write();}catch(error){
      var failed=false;names.forEach(function(key,index){try{if(before[index]===null)original.remove.call(storage,key);else set(key,before[index]);}catch(_){failed=true;}});
      if(failed)throw Error('恢复失败，部分回滚未完成；原升级备份已保留，请停止编辑并导出资料');
      throw error;
    }
  }
  function candidates(){
    var cache=JSON.parse(get(CONFLICTS)||'{}'),rows=[],found=new Set();
    ['userArr','wzbz_userlist','wzbz_recentlyList'].forEach(function(key){
      [get(key)].concat(cache['legacy:'+key]||[]).filter(Boolean).forEach(function(raw){
        try{var list=JSON.parse(raw);if(!Array.isArray(list))return;list.forEach(function(item){if(item&&item.guid!=null&&item.name&&(item.solarTime||item.birthDay)&&!/^case-sample-/.test(String(item.guid))&&!found.has(String(item.guid))){found.add(String(item.guid));rows.push(item);}});}catch(_){}
      });
    });
    var saved=parse(get(CASES)||'[]','array'),existing=new Set(saved.map(function(item){return String(item.guid);}));
    return rows.filter(function(item){return !existing.has(String(item.guid));});
  }
  async function recoverLegacy(){await ready;var rows=candidates(),next=mergeValue(CASES,get(CASES)||'[]',JSON.stringify(rows));storage.setItem(CASES,next);await flush();return rows.length;}
  async function checkpoint(){
    await ready;await flush();var native=plugin();if(!native)return true;
    var saved=await native.read({token:nonce}),document=JSON.parse(saved.current||'null'),current=collect();
    if(!document||!document.data||Object.keys(current).some(function(key){return document.data[key]!==current[key];}))throw Error('升级前备份核对未完成，请停止编辑后重试');
    return true;
  }
  var ready=Promise.resolve().then(start);ready.catch(errorState);
  global.WZBZDataProtection=Object.freeze({ready:ready,flush:flush,checkpoint:checkpoint,status:status,protectedKey:protectedKey,mergeValue:mergeValue,transaction:transaction,exportRaw:exportRaw,authorize:function(value){return !!nonce&&value===nonce;},recoverableCount:function(){return candidates().length;},recoverLegacy:recoverLegacy});
  global.addEventListener('pagehide',function(){if(active)flush().catch(function(){});});
  global.addEventListener('visibilitychange',function(){if(global.document.hidden&&active)flush().catch(function(){});});
})(window);
