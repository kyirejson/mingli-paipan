// Run only against an explicitly forwarded emulator WebView. Never clears data.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {connectBrowser} from './helpers/browser-cdp.mjs';
const mode=process.argv[2],path=process.env.ZAOHUA_UPGRADE_FIXTURE,targetVersion=process.env.ZAOHUA_EXPECTED_VERSION||'1.0.15';
assert.ok(path,'Set ZAOHUA_UPGRADE_FIXTURE to a D: test fixture file');
const browser=await connectBrowser(process.env.ZAOHUA_CDP_PORT||'9331');
try{
 assert.equal(await browser.evaluate('location.origin'),'https://localhost');
 await browser.wait('!!window.__WZBZ_AXIOS_INTERCEPT__');
 if(mode==='seed'){
  const result=await browser.evaluate(`(async function(){
   var status=await Capacitor.Plugins.GitHubUpdater.getStatus();if(status.currentVersion!=='1.0.14')throw Error('Baseline must be released v1.0.14');
   var rows=JSON.parse(localStorage.getItem('wzbz_local_userlist_v14')||'[]');
   if(rows.some(function(r){return !/^case-sample-/.test(r.guid)&&r.name!=='upgrade-retention-fixture';}))throw Error('Existing emulator cases found; no fixture added');
   var saved=rows.find(function(r){return r.name==='upgrade-retention-fixture';});
   if(!saved){var response=await __WZBZ_AXIOS_INTERCEPT__({url:'/AddsubuserH5_8',data:{name:'upgrade-retention-fixture',sex:1,solarTime:'2001-01-09 01:29',birthDay:'2001-01-09 01:29',sunTime:'2001-01-09 01:29',groupGuid:'00000000-0000-0000-0000-000000000000'}},function(){throw Error('No external save endpoint');});saved=response.data.item;}
   await __WZBZ_AXIOS_INTERCEPT__({url:'/user/updateNote2',data:{userGuid:saved.guid,content:'upgrade-keep-note-20261103',feedbackData:'original-feedback'}},function(){throw Error('No external save endpoint');});
   localStorage.setItem('wzbz_note_drafts_v1',JSON.stringify({[saved.guid]:{content:'unsaved-draft-preserved'}}));
   return {version:status.currentVersion,guid:saved.guid,values:Object.fromEntries(['wzbz_local_userlist_v14','wzbz_local_notes_v14','wzbz_note_drafts_v1'].map(function(k){return [k,localStorage.getItem(k)];}))};
  })()`);
  fs.writeFileSync(path,JSON.stringify(result,null,2));console.log(JSON.stringify({seeded:true,baseline:result.version,guid:result.guid}));
 }else if(mode==='native-save'){
  await browser.wait('window.WZBZDataProtection&&WZBZDataProtection.status.ready');
  const expected=JSON.parse(fs.readFileSync(path,'utf8'));
  const result=await browser.evaluate(`(async function(){await __WZBZ_AXIOS_INTERCEPT__({url:'/user/updateNote2',data:{userGuid:${JSON.stringify(expected.guid)},content:'immediate-exit-native-preserved'}},function(){throw Error('No external endpoint');});await WZBZDataProtection.checkpoint();var installed=await Capacitor.Plugins.GitHubUpdater.getStatus();return {version:installed.currentVersion,guid:${JSON.stringify(expected.guid)},values:Object.fromEntries(${JSON.stringify(Object.keys(expected.values))}.map(function(k){return [k,localStorage.getItem(k)];}))};})()`);
  fs.writeFileSync(path.replace(/\.json$/,'-native.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({nativeWriteConfirmed:true,immediateExitFixturePrepared:true}));
 }else if(mode==='baseline-check'){
  const expected=JSON.parse(fs.readFileSync(path,'utf8'));
  const actual=await browser.evaluate(`Object.fromEntries(${JSON.stringify(Object.keys(expected.values))}.map(function(k){return [k,localStorage.getItem(k)];}))`);
  assert.deepEqual(actual,expected.values);console.log(JSON.stringify({baselineColdRestartRetained:true,version:'1.0.14'}));
 }else if(mode==='check'){
  const expected=JSON.parse(fs.readFileSync(path,'utf8'));
  await browser.wait('window.WZBZDataProtection&&WZBZDataProtection.status.ready&&!!document.getElementById("app")?.__vue__');
  const actual=await browser.evaluate(`(async function(){var confirmed=await WZBZDataProtection.checkpoint();return {status:await Capacitor.Plugins.GitHubUpdater.getStatus(),protection:WZBZDataProtection.status,values:Object.fromEntries(${JSON.stringify(Object.keys(expected.values))}.map(function(k){return [k,localStorage.getItem(k)];})),nativeConfirmed:confirmed,appReady:!!document.getElementById('app').__vue__};})()`);
  assert.equal(actual.status.currentVersion,targetVersion);assert.equal(actual.appReady,true);
  assert.equal(actual.protection.native,true);assert.deepEqual(actual.values,expected.values);
  assert.equal(actual.nativeConfirmed,true);
  console.log(JSON.stringify({upgrade:'v'+expected.version+' → v'+actual.status.currentVersion,originalValuesUnchanged:true,nativeBackupMatches:true,appReady:true,guid:expected.guid}));
 }else throw Error('Use seed or check');
}finally{browser.close();}
