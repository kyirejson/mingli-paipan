const fs=require('node:fs'),vm=require('node:vm');
function classicsContext(fetch){
 const blobs=new Map(),messages=[],listeners=new Map();let id=0;
 class ReaderURL extends URL{}
 ReaderURL.createObjectURL=blob=>{const key='blob:test-'+(++id);blobs.set(key,blob);return key;};
 ReaderURL.revokeObjectURL=key=>blobs.delete(key);
 const frame={contentWindow:{}},parent={postMessage:(data)=>messages.push(data)},attrs={};
 const document={getElementById:key=>key==='bookbox'?frame:{offsetHeight:400},documentElement:{setAttribute:(k,v)=>attrs[k]=v},body:{setAttribute(){},removeAttribute(){}}};
 const media={matches:false,addEventListener(){},removeEventListener(){}};
 const c={n(){},console:{log(){},error(){}},URL:ReaderURL,Blob,AbortController,setTimeout,clearTimeout,document,parent,fetch:fetch||(()=>{throw Error('Unexpected network request')}),matchMedia:()=>media,location:{href:'https://localhost/static/newguji/index.html?nightMode=1'},addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:(key,fn)=>{if(listeners.get(key)===fn)listeners.delete(key);}};
 c.window=c;vm.createContext(c);
  for(const file of ['catalog','catalogue-rules','public-sources','layout'])vm.runInContext(fs.readFileSync('dist/static/newguji/'+file+'.js','utf8'),c);
 vm.runInContext(fs.readFileSync('dist/static/newguji/reader.js','utf8'),c);
 const s=fs.readFileSync('dist/static/newguji/index.js','utf8');
 c.render=vm.runInContext('('+s.slice(s.indexOf('f=(p.exports,')+'f=(p.exports,'.length,s.indexOf('),_=[]'))+')',c);
 vm.runInContext(s.slice(s.indexOf('const m='),s.indexOf('const Ie='))+';globalThis.api=De;globalThis.books=m;globalThis.tables={w,y,C,D,I,M,z,O,T,A};',c);
 c.v={A:{}};c.b={A:{}};c.l={A:{loading:()=>({clear(){}})}};
 vm.runInContext(s.slice(s.indexOf('const Ie='),s.indexOf(',Ae=Te'))+';globalThis.component=Te;',c);
 return {c,reader:c.BaziClassicsReader,blobs,messages,listeners,frame,attrs};
}
function view(context,bazi=['辛','巳','辛','丑','丁','丑','辛','丑'],geju='正官'){
 const data=context.c.component.data();
 const result={...data,...context.c.component.methods,$refs:{},$nextTick:fn=>fn(),gjData:{bzArr:bazi,cgArr:[],geju,guid:'audit-local-case',viplevel:0}};
 return result;
}
module.exports={classicsContext,view};
