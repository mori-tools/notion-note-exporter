(function(){
  const originalParse=window.parseNotionMarkdown;
  if(typeof originalParse!=='function')return;

  window.parseNotionMarkdown=function(md){
    const parsed=originalParse(md);
    const lines=(parsed.body||'').split(/\r?\n/);
    let publishIndex=-1;

    lines.forEach((line,index)=>{
      const t=line.trim();
      if(/^#{1,6}\s+.*公開稿(?:候補)?/.test(t))publishIndex=index;
    });

    if(publishIndex>=0){
      parsed.body=lines.slice(publishIndex+1).join('\n').trim();
      parsed.publishSectionFound=true;
    }else{
      parsed.publishSectionFound=false;
    }
    return parsed;
  };

  const beta=document.querySelector('.beta');
  if(beta)beta.textContent='β 0.8.2';

  const bodyNote=document.querySelector('#pane-body .note');
  if(bodyNote){
    bodyNote.insertAdjacentText('beforeend',' 「公開稿」「公開稿候補」を含む最後の見出しがある場合は、その下だけを本文として抽出します。');
  }
})();