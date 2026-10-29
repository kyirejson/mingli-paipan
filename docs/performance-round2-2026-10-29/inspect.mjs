import fs from 'node:fs/promises';
import {connectBrowser} from '../../tests/helpers/browser-cdp.mjs';
const b=await connectBrowser();
try{
 const readers=await b.evaluate(`(()=>{return [...document.querySelectorAll('.smart-book-box')].map(el=>{let nodes=[],components=[],a=el,v=el.__vue__;while(a){let s=getComputedStyle(a);nodes.push({cls:a.className,tag:a.tagName,display:s.display,visibility:s.visibility,opacity:s.opacity});a=a.parentElement;}while(v){components.push({name:v.$options.name,tabIndex:v.tabIndex,active:v.active,route:v.$route?.path,isInactive:v._inactive});v=v.$parent;}return {nodes,components};});})()`);
 await b.call('Profiler.enable');await b.call('Profiler.start');
 const engine=await b.evaluate(`(()=>{const h=document.querySelector('.fa-result-host').__vue__,t=h.session.baseTime,E=window.FiveArtsEngine;return ['qimen','liuyao','meihua'].map(k=>{let start=performance.now();E[k](t,h.session.modules[k]);return {kind:k,ms:performance.now()-start};})})()`);
 const profile=(await b.call('Profiler.stop')).profile;
 await fs.writeFile('docs/performance-round2-2026-10-29/engine.cpuprofile',JSON.stringify(profile));
 await fs.writeFile('docs/performance-round2-2026-10-29/inspection.json',JSON.stringify({readers,engine},null,2));
 console.log(JSON.stringify({readers,engine},null,2));
}finally{b.close();}
