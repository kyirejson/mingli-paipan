import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const targets=await(await fetch('http://127.0.0.1:9330/json/list')).json();
const ws=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let seq=0;const pending=new Map();
ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(pending.has(m.id)){const p=pending.get(m.id);clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}});
function call(method,params={}){return new Promise((resolve,reject)=>{let id=++seq,timer=setTimeout(()=>reject(Error(method+' timeout')),30000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});}
try {
 const result=await call('Runtime.evaluate',{returnByValue:true,awaitPromise:true,expression:`(async()=>{
  const host=document.querySelector('.fa-result-host').__vue__;host.change('ziwei');await host.$nextTick();
  const chart=host.result('ziwei').chart,original=chart.horoscope;let calls=0;const updates=[];
  chart.horoscope=function(){calls++;return original.apply(this,arguments)};
  try{for(const date of ['2026-11-07','2026-11-08','2026-11-09']){calls=0;host.flowDate=date;await host.$nextTick();updates.push({date,fullHoroscopeCalls:calls});}}
  finally{chart.horoscope=original;}
  return {updates,caches:window.WZBZFlowData.stats(chart)};
 })()`});
 if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));
 const evidence=result.result.value;
 for(const update of evidence.updates)assert.ok(update.fullHoroscopeCalls<=2,JSON.stringify(update));
 await fs.writeFile('docs/performance-optimization-2026-10-29/flow-calls.json',JSON.stringify(evidence,null,2));
 console.log(JSON.stringify(evidence,null,2));
}finally{ws.close();}
