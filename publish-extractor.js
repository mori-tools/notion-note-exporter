(function(){
  function trimToPublishedDraft(){
    const body=document.querySelector('#body');
    if(!body)return false;

    const lines=(body.value||'').split(/\r?\n/);
    let publishIndex=-1;

    lines.forEach((line,index)=>{
      const t=line.trim();
      if(/^#{1,6}\s+.*公開稿(?:候補)?/.test(t))publishIndex=index;
    });

    if(publishIndex<0)return false;

    const trimmed=lines.slice(publishIndex+1).join('\n').trim();
    if(trimmed===body.value.trim())return true;

    body.value=trimmed;
    body.dispatchEvent(new Event('input',{bubbles:true}));
    return true;
  }

  function waitForZipLoad(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const status=document.querySelector('#status')?.textContent||'';
      if(status.includes('読み込み完了')){
        clearInterval(timer);
        trimToPublishedDraft();
      }else if(tries>=100){
        clearInterval(timer);
      }
    },100);
  }

  const file=document.querySelector('#file');
  if(file)file.addEventListener('change',waitForZipLoad);

  setTimeout(trimToPublishedDraft,300);
  setTimeout(trimToPublishedDraft,1000);

  const beta=document.querySelector('.beta');
  if(beta)beta.textContent='β 0.8.3';

  const bodyNote=document.querySelector('#pane-body .note');
  if(bodyNote){
    const base='Notionの`<aside>`、色付き`<span>`、`<empty-block/>`などは自動除去します。画像Markdownは本文コピーから外し、画像タブに分離します。';
    bodyNote.textContent=base+' 「公開稿」「公開稿候補」を含む最後の見出しがある場合は、ZIP読込完了後にその下だけを本文として残します。';
  }
})();