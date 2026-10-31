import fs from 'node:fs/promises';
import {connectBrowser} from '../../tests/helpers/browser-cdp.mjs';
export async function createAudit(){
const initial=JSON.parse(await fs.readFile('docs/ui-audit-2026-10-30/inventory.json','utf8'));
const b=await connectBrowser(),{call,evaluate:ev,wait}=b,out='docs/ui-audit-2026-10-30',screens=initial.screens||[],errors=initial.errors||[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
b.on(m=>{if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>String(a.description||a.value||'')).join(' '));});
const finder=`function find(v,name){if((v.$options.name||v.$options._componentTag)===name&&v.$el?.isConnected&&!v._inactive)return v;for(const c of v.$children||[]){let r=find(c,name);if(r)return r;}}`;
async function size(width,height=932){await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await pause(120);}
async function capture(name){
 await pause(350);
 const data=await ev(`(()=>{
 const width=innerWidth,height=innerHeight,texts=[],smallTargets=[],blockedTargets=[],clipped=[];
 const rect=r=>({x:r.x,y:r.y,w:r.width,h:r.height});
 function visible(el){if(!el||!el.getClientRects().length)return false;if(el.checkVisibility&&!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))return false;let r=el.getBoundingClientRect();if(r.right<0||r.bottom<0||r.left>width||r.top>height||!r.width||!r.height)return false;for(let a=el.parentElement;a&&a!==document.body&&a!==document.documentElement;a=a.parentElement){const s=getComputedStyle(a),p=a.getBoundingClientRect();if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0')return false;if(/hidden|clip|auto|scroll/.test(s.overflowX)&& (r.right<=p.left||r.left>=p.right))return false;if(/hidden|clip|auto|scroll/.test(s.overflowY)&& (r.bottom<=p.top||r.top>=p.bottom))return false;}return true;}
 function identity(el){return (el.tagName||'')+(el.id?'#'+el.id:'')+'.'+String(el.className?.baseVal??el.className??'').split(' ').join('.');}
 for(const el of document.querySelectorAll('button,a,input,select,textarea,[role=button]')){
  if(!visible(el)||el.disabled)continue;let r=el.getBoundingClientRect(),text=(el.innerText||el.getAttribute('aria-label')||el.placeholder||el.tagName).trim().slice(0,70);
  if(r.width<32||r.height<28)smallTargets.push({text,el:identity(el),rect:rect(r)});
  let x=Math.max(0,Math.min(width-1,r.left+r.width/2)),y=Math.max(0,Math.min(height-1,r.top+r.height/2)),hit=document.elementFromPoint(x,y);
  if(hit&&!el.contains(hit)&&getComputedStyle(el).pointerEvents!=='none')blockedTargets.push({text,el:identity(el),rect:rect(r),hit:identity(hit)});
 }
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
 while(node=walker.nextNode()){
  const value=node.textContent.trim(),el=node.parentElement;if(!value||value.length>180||!visible(el)||['SCRIPT','STYLE','OPTION'].includes(el.tagName))continue;
  const range=document.createRange();range.selectNodeContents(node);const r=range.getBoundingClientRect();if(r.width<=0||r.height<=0||r.right<0||r.bottom<0||r.left>width||r.top>height)continue;
  const item={text:value,el:identity(el),rect:rect(r),font:getComputedStyle(el).fontSize};texts.push(item);
  for(let a=el.parentElement;a&&a!==document.body;a=a.parentElement){const s=getComputedStyle(a),p=a.getBoundingClientRect();if(/hidden|clip/.test(s.overflowX)&&(r.left<p.left-2||r.right>p.right+2)&&r.right>p.left&&r.left<p.right){clipped.push({...item,axis:'x',ancestor:identity(a),container:rect(p)});break;}if(/hidden|clip/.test(s.overflowY)&&(r.top<p.top-2||r.bottom>p.bottom+2)&&r.bottom>p.top&&r.top<p.bottom){clipped.push({...item,axis:'y',ancestor:identity(a),container:rect(p)});break;}}
 }
 const overlaps=[];for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){let a=texts[i],z=texts[j],x=Math.min(a.rect.x+a.rect.w,z.rect.x+z.rect.w)-Math.max(a.rect.x,z.rect.x),y=Math.min(a.rect.y+a.rect.h,z.rect.y+z.rect.h)-Math.max(a.rect.y,z.rect.y);if(x>3&&y>3&&x*y>0.18*Math.min(a.rect.w*a.rect.h,z.rect.w*z.rect.h))overlaps.push({a,b:z,area:x*y});}
 return {width,height,url:location.href.split('?')[0],theme:document.documentElement.getAttribute('data-theme'),text:document.body.innerText.slice(-15000),texts,smallTargets,blockedTargets,clipped,overlaps,bodyWidth:document.body.scrollWidth};
 })()`);
 const image=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(out+'/'+name+'.png',Buffer.from(image.data,'base64'));await fs.writeFile(out+'/'+name+'.json',JSON.stringify(data,null,2));screens.push({name,width:data.width,height:data.height,clipped:data.clipped.length,overlaps:data.overlaps.length,smallTargets:data.smallTargets.length,blockedTargets:data.blockedTargets.length});await fs.writeFile(out+'/inventory.json',JSON.stringify({screens,errors},null,2));console.log(name,JSON.stringify(screens.at(-1)));
}
async function tab(kind){await ev(`(()=>{document.querySelector('.fa-result-host').__vue__.change('${kind}');return true})()`);await wait(`document.querySelector('.fa-result-host').__vue__.active==='${kind}'&&!document.querySelector('.fa-result-host').__vue__._slideTimer`);}
return {b,call,ev,wait,out,screens,errors,pause,size,capture,tab,finder};
}
