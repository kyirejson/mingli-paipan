const fs=require('node:fs'),vm=require('node:vm');
function setup(fetchImpl){
 const c={Date,Intl,Math,JSON,Set,Map,WeakMap,URL,AbortController,setTimeout,clearTimeout,Promise,Object,document:{baseURI:'https://localhost/'},fetch:fetchImpl};c.window=c;vm.createContext(c);
 for(const n of ['time-policy','fivearts-engine','ziwei-patterns','ziwei-interpretation','ziwei-reading'])vm.runInContext(fs.readFileSync('dist/static/js/'+n+'.js','utf8'),c);
 return {c,api:c.WZBZInterpretation,loader:c.WZBZReading,data:JSON.parse(fs.readFileSync('dist/static/data/ziwei-reading.json','utf8'))};
}
function chart(){return {palaces:'命宫 兄弟 夫妻 子女 财帛 疾厄 迁移 仆役 官禄 田宅 福德 父母'.split(' ').map((name,i)=>({name,earthlyBranch:'子丑寅卯辰巳午未申酉戌亥'[i],heavenlyStem:'甲',majorStars:[],minorStars:[],adjectiveStars:[]}))};}
function add(x,palace,name,brightness='',mutagen='',minor=false){x.palaces.find(p=>p.name===palace)[minor?'minorStars':'majorStars'].push({name,brightness,mutagen});return x;}
const clean=x=>JSON.parse(JSON.stringify(x));
const snapshot=x=>JSON.stringify(x.palaces.map(p=>({name:p.name,branch:p.earthlyBranch,stem:p.heavenlyStem,body:p.isBodyPalace,original:p.isOriginalPalace,major:p.majorStars.map(s=>[s.name,s.brightness,s.mutagen]),minor:p.minorStars.map(s=>[s.name,s.brightness,s.mutagen]),extra:p.adjectiveStars.map(s=>[s.name,s.brightness,s.mutagen])})));
module.exports={setup,chart,add,clean,snapshot};
