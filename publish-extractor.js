(function(){
  const START_HEADING_PATTERNS=[
    /公開稿(?:候補)?/,
    /(?:note\s*)?本文初稿/
  ];

  function isStartHeading(line){
    const t=line.trim();
    return /^#{1,6}\s+/.test(t)&&START_HEADING_PATTERNS.some(pattern=>pattern.test(t));
  }

  function removeInternalDraftMarkers(text){
    return text.split(/\r?\n/).filter(line=>{
      const t=line.trim();
      if(/^#{1,6}\s+(?:無料部分|有料部分)\s*$/.test(t))return false;
      if(/^>\s*[（(]?編集メモ[:：].*有料ライン.*[）)]?\s*$/.test(t))return false;
      return true;
    }).join('\n').replace(/\n{3,}/g,'\n\n').trim();
  }

  function trimToPublishedDraft(){
    const body=document.querySelector('#body');
    if(!body)return false;

    const lines=(body.value||'').split(/\r?\n/);
    let publishIndex=-1;

    lines.forEach((line,index)=>{
      if(isStartHeading(line))publishIndex=index;
    });

    if(publishIndex<0)return false;

    const trimmed=removeInternalDraftMarkers(lines.slice(publishIndex+1).join('\n'));
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
  if(beta)beta.textContent='β 0.8.5';

  const bodyNote=document.querySelector('#pane-body .note');
  if(bodyNote){
    const base='Notionの\`<aside>\`、色付き\`<span>\`、\`<empty-block/>\`などは自動除去します。画像Markdownは本文コピーから外し、画像タブに分離します。';
    bodyNote.textContent=base+' 「公開稿」「公開稿候補」「note本文初稿」を含む最後の見出しから記事本文だけを抽出し、管理用の「無料部分」「有料部分」と有料ライン設定メモも除去します。';
  }
})();