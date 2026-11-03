/* Read legacy note rows into an isolated view model. Never writes or deletes stored notes. */
(function(global){
  'use strict';
  function read(value,fallback){
    var rows;
    try{rows=typeof value==='string'?JSON.parse(value):value;}catch(_){}
    if(!Array.isArray(rows))rows=fallback||[];
    rows=JSON.parse(JSON.stringify(rows)).filter(function(row){return row&&typeof row==='object'&&typeof row.name==='string';});
    rows.forEach(function(row){
      if(typeof row.items!=='string'&&!Array.isArray(row.items))row.items=[];
      if(Number(row.type)===2){
        if(typeof row.data!=='string')row.data='';
        if(row.data&&row.name.includes('大运')){
          try{
            var detail=JSON.parse(row.data);
            if(!detail||typeof detail.data!=='string'||!Array.isArray(detail.list)||detail.list.some(function(item){return !item||typeof item.name!=='string'||typeof item.data!=='string';}))row.data='';
          }catch(_){row.data='';}
        }
      }
    });
    return rows;
  }
  global.WZBZNoteRows=Object.freeze({read:read});
})(window);
