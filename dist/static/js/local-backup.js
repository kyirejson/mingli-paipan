(function(global){
  'use strict';
  var keys=['wzbz_local_userlist_v14','wzbz_local_groups_v14','wzbz_local_notes_v14','wzbz_note_drafts_v1','wzbz_fivearts_record_data_v1','wzbz_fivearts_preferences_v1','wzbz_local_tiku_v14','wzbz_notes_migration_backup_v1'];
  var settings=['setting_age','setting_changenz','setting_desc','setting_dizhizg','setting_fenzhu','setting_geju','setting_jqtype','setting_midnight','setting_other','setting_rysl','setting_shensha','setting_shensha_detail','setting_shensha_sys','setting_showEye','setting_suntime'];
  keys=keys.concat(settings,['wzbz_preferenceIsShow']);
  var oldKeys=keys.slice();
  keys=keys.concat(['wzbz_local_hepan_v14','wzbz_local_caiyun_v14','wzbz_recovery_conflicts_v1']);
  var limit=25*1024*1024;
  function validate(value){
    if(!value||value.format!=='zaohua-local-backup'||![1,2].includes(value.version)||!value.data||Array.isArray(value.data))throw Error('不是受支持的造化元钥备份');
    var expected=value.version===1?oldKeys:keys;
    if(Object.keys(value.data).length!==expected.length||expected.some(function(k){return !Object.prototype.hasOwnProperty.call(value.data,k);}))throw Error('备份内容不完整');
    Object.keys(value.data).forEach(function(k){
      if(keys.indexOf(k)<0)throw Error('备份包含不支持的数据项');
      var raw=value.data[k];if(raw===null)return;if(typeof raw!=='string')throw Error('备份数据格式错误');
      if(settings.indexOf(k)>=0)return;
      var parsed;try{parsed=JSON.parse(raw);}catch(_){throw Error('备份中的本地记录无法解析：'+k);}
      var array=['wzbz_local_userlist_v14','wzbz_local_groups_v14','wzbz_local_hepan_v14','wzbz_local_caiyun_v14'].includes(k);
      if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)!==array)throw Error('备份数据类型错误：'+k);
    });
    return value;
  }
  function parse(text){if(typeof text!=='string'||text.length>limit)throw Error('备份超过25MB或内容无效');return validate(JSON.parse(text));}
  function exportText(){var data={};keys.forEach(function(k){data[k]=localStorage.getItem(k);});return JSON.stringify(validate({format:'zaohua-local-backup',version:2,createdAt:new Date().toISOString(),data:data}),null,2);}
  function restore(text){
    var backup=parse(text),before=keys.map(function(k){return localStorage.getItem(k);}),written=[];
    function write(){keys.forEach(function(k){var raw=backup.data[k],current=localStorage.getItem(k);if(raw==null)return;
      if(global.WZBZDataProtection)raw=global.WZBZDataProtection.mergeValue(k,current,raw);
      else if(current!==null){var a,b;try{a=JSON.parse(current);b=JSON.parse(raw);}catch(_){return;}
        if(Array.isArray(a)&&Array.isArray(b)){var seen=new Set(a.map(function(x){return String(x.guid||x.id||x.orderid);}));b.forEach(function(x){var id=String(x.guid||x.id||x.orderid);if(!seen.has(id)){a.push(x);seen.add(id);}});raw=JSON.stringify(a);}
        else if(a&&b&&typeof a==='object'&&typeof b==='object')raw=JSON.stringify(Object.assign({},b,a));else return;}
      if(raw!==current){localStorage.setItem(k,raw);written.push(k);}
    });}
    try{if(global.WZBZDataProtection)global.WZBZDataProtection.transaction(keys,write);else write();}
    catch(error){var rollbackFailed=false;written.reverse().forEach(function(k){try{var raw=before[keys.indexOf(k)];if(raw===null)localStorage.removeItem(k);else localStorage.setItem(k,raw);}catch(_){rollbackFailed=true;}});throw Error(rollbackFailed?'恢复未完成且回滚失败，请保留备份文件，停止编辑并联系维护者。':'恢复失败，已还原原有记录；请检查存储空间。');}
    return true;
  }
  function open(){
    if(document.getElementById('zaohua-backup'))return;
    var overlay=document.createElement('div');overlay.id='zaohua-backup';overlay.className='pf-detail-overlay';
    var panel=document.createElement('section');panel.className='pf-detail-dialog pf-backup-panel';panel.style.cssText='max-height:90dvh;overflow-y:auto;padding:20px;box-sizing:border-box;';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','数据备份');
    var heading=document.createElement('h2');heading.textContent='数据备份与恢复';panel.appendChild(heading);
    var note=document.createElement('p');note.textContent='备份含命例、笔记、草稿、分组、五盘设置和题库记录。恢复时合并资料，保留本机已有记录；请将备份另存到手机以外。';panel.appendChild(note);
    var area=document.createElement('textarea');area.rows=12;area.style.cssText='width:100%;box-sizing:border-box;';area.setAttribute('aria-label','备份内容');area.placeholder='点击生成备份，或粘贴已有备份内容';panel.appendChild(area);
    var status=document.createElement('p');status.setAttribute('role','status');panel.appendChild(status);
    if(global.WZBZDataProtection){var protection=global.WZBZDataProtection;status.textContent=protection.status.native?'已启用覆盖升级自动保护；卸载或清除应用数据仍需外部备份。':'当前为网页预览，请导出备份文件保存。';}
    function action(label,fn){var b=document.createElement('button');b.type='button';b.className='pf-detail-button';b.textContent=label;b.onclick=async function(){try{await fn();}catch(e){status.textContent=e.message;}};panel.appendChild(b);}
    action('生成备份',function(){area.value=exportText();status.textContent='备份已生成，请下载或完整复制内容，确认保存后再卸载。';});
    action('导出原始保护资料',function(){
      if(!global.WZBZDataProtection)throw Error('当前版本尚未加载保护组件');var raw=global.WZBZDataProtection.exportRaw();area.value=raw;
      var url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='造化元钥原始保护资料-'+new Date().toISOString().slice(0,10)+'.json';panel.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},30000);
      area.focus();area.select();status.textContent='已发起下载并选中原始文本；即使有损坏条目也保留原内容。请确认文件保存，或复制选中的文本另存。此文件用于资料修复，不直接替换当前命盘。';
    });
    action('下载备份文件',function(){var text=area.value;parse(text);var url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='造化元钥备份-'+new Date().toISOString().slice(0,10)+'.json';panel.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},30000);status.textContent='已发起下载，请确认文件确实保存；若手机不支持下载，请完整复制上方内容到安全文件。';});
    action('复制备份内容',async function(){parse(area.value);if(global.navigator&&global.navigator.clipboard){await global.navigator.clipboard.writeText(area.value);status.textContent='已复制备份，请粘贴到手机以外的安全位置。';}else{area.focus();area.select();status.textContent=document.execCommand('copy')?'已复制备份内容。':'请长按文本框，全选并复制完整备份。';}});
    var input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.setAttribute('aria-label','选择备份文件');input.onchange=async function(){try{var file=input.files[0];if(!file)return;if(file.size>limit)throw Error('备份超过25MB');var text=await file.text();parse(text);area.value=text;status.textContent='文件已读入，尚未恢复。';}catch(e){status.textContent=e.message;}};panel.appendChild(input);
    action('检查并恢复',async function(){var data=parse(area.value).data,cases=JSON.parse(data.wzbz_local_userlist_v14||'[]');if(!global.confirm('备份包含 '+cases.length+' 条命例，将合并恢复并保留本机已有资料。是否继续？'))return;restore(area.value);if(global.WZBZDataProtection)await global.WZBZDataProtection.flush();global.location.reload();});
    action('找回旧记录',async function(){var protection=global.WZBZDataProtection;if(!protection)throw Error('当前版本尚未加载保护组件');await protection.ready;var count=protection.recoverableCount();if(!count){status.textContent='未发现可恢复的旧记录缓存；没有删除或覆盖当前资料。';return;}if(!global.confirm('发现 '+count+' 条历史缓存，可能包含曾排过但未保存的命盘。合并恢复且保留当前记录？'))return;await protection.recoverLegacy();global.location.reload();});
    action('关闭',function(){overlay.remove();});overlay.appendChild(panel);document.body.appendChild(overlay);
  }
  global.WZBZBackup=Object.freeze({exportText:exportText,restore:restore,parse:parse,open:open});
})(window);
