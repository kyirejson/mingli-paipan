export async function connectBrowser(port='9330') {
  const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target=targets.find(t=>t.type==='page');
  if(!target)throw Error('No isolated browser page');
  const ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  let sequence=0;const pending=new Map(),listeners=new Set();
  ws.addEventListener('message',({data})=>{
    const message=JSON.parse(data),entry=pending.get(message.id);
    if(entry){clearTimeout(entry.timer);pending.delete(message.id);message.error?entry.reject(Error(message.error.message)):entry.resolve(message.result);}
    for(const listener of listeners)listener(message);
  });
  function call(method,params={}){return new Promise((resolve,reject)=>{
    const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'));},30000);
    pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));
  });}
  async function evaluate(expression){
    const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
    return result.result.value;
  }
  async function wait(expression){for(let i=0;i<150;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out: '+expression);}
  return {call,evaluate,wait,on:listener=>listeners.add(listener),close(){for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Browser connection closed'));}pending.clear();ws.close();}};
}
