// Rebuild the ancient-text portion without changing hexagrams or other books.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const input=JSON.parse(fs.readFileSync(path.join(root,'content/haidiyan-yiranzhai-transcription.json'),'utf8'));
const output=path.join(root,'dist/static/js/fivearts-readings.js');
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync(output,'utf8'),context);
const data=context.window.FiveArtsReadingsData,book=data.books.haidiyan;
if(input.sections.length!==64||input.sections.some(s=>!s.paragraphs.length||s.paragraphs.length!==s.traditionalParagraphs.length))throw Error('Incomplete original-text import');
const excerpts=book.sections.filter(s=>!s.title.startsWith('正文·')).map(s=>({...s,title:s.title.startsWith('引文·')?s.title:'引文·'+s.title}));
book.sections=input.sections.map(s=>({title:'正文·'+s.title,paragraphs:s.paragraphs,sourcePage:input.source+'#'+s.anchor})).concat(excerpts);
book.source=input.source;
data.sources.classical='随包《易经》《断易天机》《易隐》《黄金策》及注释，维基文库《火珠林》，怡然斋藏版《卜易秘诀海底眼》古文转录';
book.edition='怡然斋藏版古文转录（转简）；保留正文与随文旧注；另附《断易天机》《易隐》引文';
fs.writeFileSync(output,'window.FiveArtsReadingsData='+JSON.stringify(data)+';\n');
console.log(JSON.stringify({originalSections:input.sections.length,excerptSections:excerpts.length,otherBooksUnchanged:true}));
