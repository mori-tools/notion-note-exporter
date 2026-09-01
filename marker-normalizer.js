(function(){
  'use strict';

  const RANGE_START='▼▼▼ note公開本文｜ここから ▼▼▼';
  const RANGE_END='▲▲▲ note公開本文｜ここまで ▲▲▲';
  const START_KEY='note公開本文｜ここから';
  const END_KEY='note公開本文｜ここまで';

  function normalizeMarkerLines(value){
    if(typeof value!=='string')return value;
    return value.split(/\r?\n/).map(line=>{
      const plain=line
        .replace(/<[^>]+>/g,'')
        .replace(/^[\s>#*_`~\-]+/,'')
        .replace(/[\s*_`~]+$/,'')
        .trim();
      if(plain.includes(START_KEY))return `# ${RANGE_START}`;
      if(plain.includes(END_KEY))return `# ${RANGE_END}`;
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
