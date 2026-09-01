(function(){
  'use strict';

  const RANGE_START='▼▼▼ note公開本文｜ここから ▼▼▼';
  const RANGE_END='▲▲▲ note公開本文｜ここまで ▲▲▲';

  function normalizeMarkerLines(value){
    if(typeof value!=='string')return value;
    return value.split(/\r?\n/).map(line=>{
      const trimmed=line.trim();
      if(trimmed===RANGE_START||trimmed===RANGE_END){
        const indent=line.match(/^\s*/)?.[0]||'';
        return `${indent}# ${trimmed}`;
      }
      return line;
    }).join('\n');
  }

  const descriptor=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
  if(!descriptor?.get||!descriptor?.set)return;

  Object.defineProperty(HTMLTextAreaElement.prototype,'value',{
    configurable:descriptor.configurable,
    enumerable:descriptor.enumerable,
    get:descriptor.get,
    set:function(next){
      if(this.id==='body')next=normalizeMarkerLines(next);
      return descriptor.set.call(this,next);
    }
  });
})();
