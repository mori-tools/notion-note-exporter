(function(){
  const RANGE_START='▼▼▼ note公開本文｜ここから ▼▼▼';
  const RANGE_END='▲▲▲ note公開本文｜ここまで ▲▲▲';
  const START_HEADING_PATTERNS=[
    /公開稿(?:候補)?/,
    /(?:note\s*)?本文初稿/
  ];

  function headingText(line){
    const match=line.trim().match(/^#{1,6}\s+(.+?)\s*$/);
    return match?match[1].trim():null;
  }

  function isStartHeading(line){
    const text=headingText(line);
    return text!==null&&START_HEADING_PATTERNS.some(pattern=>pattern.test(text));
  }

  function findPublishedRange(lines){
    const starts=[];
    const ends=[];

    lines.forEach((line,index)=>{
      const text=headingText(line);
      if(text===RANGE_START)starts.push(index);
      if(text===RANGE_END)ends.push(index);
    });

    if(starts.length===0&&ends.length===0)return{state:'none'};

    if(starts.length!==1||ends.length!==1){
      return{
        state:'invalid',
        message:`開始マーカーは${starts.length}個、終了マーカーは${ends.length}個です。各1個にしてください`
      };
    }

    if(ends[0]<=starts[0]){
      return{state:'invalid',message:'終了マーカーが開始マーカーより前にあります'};
    }

    return{state:'valid',start:starts[0],end:ends[0]};
  }

  function removeInternalDraftMarkers(text){
    return text.split(/\r?\n/).filter(line=>{
      const t=line.trim();
      if(/^#{1,6}\s+(?:無料部分|有料部分)\s*$/.test(t))return false;
      if(/^>\s*[（(]?編集メモ[:：].*有料ライン.*[）)]?\s*$/.test(t))return false;
      return true;
    }).join('\n').replace(/\n{3,}/g,'\n\n').trim();
  }

  function setCopyEnabled(enabled){
    document.querySelectorAll('#copyBody,#copyPlain').forEach(button=>{
      button.disabled=!enabled;
    });
  }

  function showMarkerError(message){
    const status=document.querySelector('#status');
    if(status){
      status.innerHTML=`<span class="bad">本文抽出を停止しました：${message}。Notion側のマーカーを直して、ZIPを読み込み直してください。</span>`;
    }
  }

  function applyTrimmedBody(body,trimmed){
    if(trimmed===body.value.trim())return true;
    body.value=trimmed;
    body.dispatchEvent(new Event('input',{bubbles:true}));
    return true;
  }

  function trimToPublishedDraft(){
    const body=document.querySelector('#body');
    if(!body)return false;

    setCopyEnabled(true);
    const lines=(body.value||'').split(/\r?\n/);
    const range=findPublishedRange(lines);

    if(range.state==='valid'){
      const trimmed=removeInternalDraftMarkers(lines.slice(range.start+1,range.end).join('\n'));
      if(!trimmed){
        setCopyEnabled(false);
        showMarkerError('開始・終了マーカーの間に本文がありません');
        return false;
      }
      return applyTrimmedBody(body,trimmed);
    }

    if(range.state==='invalid'){
      setCopyEnabled(false);
      showMarkerError(range.message);
      return false;
    }

    let publishIndex=-1;
    lines.forEach((line,index)=>{
      if(isStartHeading(line))publishIndex=index;
    });

    if(publishIndex<0)return false;

    const trimmed=removeInternalDraftMarkers(lines.slice(publishIndex+1).join('\n'));
    return applyTrimmedBody(body,trimmed);
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
  if(beta)beta.textContent='β 0.8.8';

  const bodyNote=document.querySelector('#pane-body .note');
  if(bodyNote){
    const base='Notionの\`<aside>\`、色付き\`<span>\`、\`<empty-block/>\`などは自動除去します。画像Markdownは本文コピーから外し、画像タブに分離します。';
    bodyNote.textContent=base+' 「▼▼▼ note公開本文｜ここから ▼▼▼」と「▲▲▲ note公開本文｜ここまで ▲▲▲」の間だけを抽出します。片方の欠損・重複・順序逆転がある場合はコピーを停止します。旧記事は「公開稿」「公開稿候補」「note本文初稿」にも対応します。';
  }
})();