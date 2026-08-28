(function(){
  'use strict';

  const RANGE_START='▼▼▼ note公開本文｜ここから ▼▼▼';
  const RANGE_END='▲▲▲ note公開本文｜ここまで ▲▲▲';
  const VERSION='0.9.1';
  const START_HEADING_PATTERNS=[/公開稿(?:候補)?/,/(?:note\s*)?本文初稿/];
  let markerState='checking';
  let markerMessage='本文範囲を確認しています';
  const FINGERPRINT_KEY='notion-note-preflight-source';
  let currentResult=null;
  let manualKey='';

  function headingText(line){
    const match=line.trim().match(/^#{1,6}\s+(.+?)\s*$/);
    return match?match[1].trim():null;
  }
  function isStartHeading(line){
    const text=headingText(line);
    return text!==null&&START_HEADING_PATTERNS.some(pattern=>pattern.test(text));
  }
  function findPublishedRange(lines){
    const starts=[],ends=[];
    lines.forEach((line,index)=>{
      const text=headingText(line);
      if(text===RANGE_START)starts.push(index);
      if(text===RANGE_END)ends.push(index);
    });
    if(starts.length===0&&ends.length===0)return{state:'none'};
    if(starts.length!==1||ends.length!==1)return{state:'invalid',message:`開始マーカーは${starts.length}個、終了マーカーは${ends.length}個です。各1個にしてください`};
    if(ends[0]<=starts[0])return{state:'invalid',message:'終了マーカーが開始マーカーより前にあります'};
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
  function findArticleHeading(lines){
    for(let i=0;i<lines.length;i++){
      const match=lines[i].trim().match(/^#\s+(.+?)\s*$/);
      if(match)return{index:i,title:match[1].trim()};
    }
    return null;
  }
  function setCopyEnabled(enabled){
    document.querySelectorAll('#copyBody,#copyPlain').forEach(button=>{
      button.disabled=!enabled;
      button.title=enabled?'':'OS本文コピーゲートに合格するまでコピーできません';
    });
  }
  function fingerprint(title,body){
    const source=`${title}\n${body}`;
    let hash=2166136261;
    for(let i=0;i<source.length;i++){
      hash^=source.charCodeAt(i);
      hash=Math.imul(hash,16777619);
    }
    return `${source.length}:${hash>>>0}`;
  }
  function rememberExtractedSource(){
    const title=document.querySelector('#title')?.value||'',body=document.querySelector('#body')?.value||'';
    localStorage.setItem(FINGERPRINT_KEY,fingerprint(title,body));
  }
  function isRememberedSource(){
    const title=document.querySelector('#title')?.value||'',body=document.querySelector('#body')?.value||'';
    return Boolean(body)&&localStorage.getItem(FINGERPRINT_KEY)===fingerprint(title,body);
  }
  function escHtml(value){
    return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }
  function ensurePanel(){
    let panel=document.querySelector('#preflightPanel');
    if(panel)return panel;
    panel=document.createElement('div');
    panel.id='preflightPanel';
    panel.className='preflight-panel';
    panel.innerHTML=`
      <div class="preflight-head"><h3>OS本文コピーゲート</h3><span id="preflightBadge" class="gate-badge gate-wait">検査中</span></div>
      <div id="preflightSummary" class="preflight-summary">本文を検査しています。</div>
      <div id="preflightChecks" class="gate-checks"></div>
      <div id="preflightIssues" class="gate-issues"></div>
      <div id="preflightPlacements" class="gate-placements"></div>
      <div class="manual-gate">
        <div class="manual-title">note入稿後の手動確認</div>
        <div id="manualChecks" class="manual-checks"></div>
        <div id="manualStatus" class="manual-status">未確認</div>
      </div>
      <button id="copyGateReport" type="button" class="btn tiny">検査結果をコピー</button>`;
    const note=document.querySelector('#pane-body .note');
    if(note)note.insertAdjacentElement('afterend',panel);else document.querySelector('#pane-body')?.appendChild(panel);
    panel.querySelector('#copyGateReport').onclick=copyGateReport;
    return panel;
  }
  function placementText(placement){
    const before=placement.before?.text?`「${placement.before.text}」の後`:'本文冒頭';
    const after=placement.after?.text?`／「${placement.after.text}」の前`:'';
    return `${placement.label}：${before}${after}`;
  }
  function manualItems(result){
    const items=[];
    if(result?.placements?.some(item=>item.id==='toc'))items.push({id:'toc',label:'noteで目次を指定位置に挿入した'});
    if(result?.placements?.some(item=>item.id==='paid'))items.push({id:'paid',label:'noteで有料ラインを指定位置に設定した'});
    if(document.querySelectorAll('#images .imgcard').length)items.push({id:'alt',label:'すべての画像にALTを設定した'});
    items.push({id:'date',label:'noteの公開日・予約日時を設定した'});
    if(result?.placements?.some(item=>item.id==='paid'))items.push({id:'price',label:'noteの販売価格を設定した'});
    items.push({id:'links',label:'本文内リンクを実際に開いて確認した'});
    items.push({id:'mobile',label:'スマホ実機で最後まで通読した'});
    return items;
  }
  function renderManualChecks(result){
    const box=document.querySelector('#manualChecks'),status=document.querySelector('#manualStatus');
    if(!box||!status)return;
    const nextKey=`${result?.title||''}|${result?.publishableBody?.length||0}|${result?.placements?.map(x=>x.id).join(',')||''}`;
    if(nextKey!==manualKey){manualKey=nextKey;box.innerHTML='';}
    const items=manualItems(result);
    const prior=new Map([...box.querySelectorAll('input')].map(input=>[input.dataset.id,input.checked]));
    box.innerHTML=items.map(item=>`<label><input type="checkbox" data-id="${escHtml(item.id)}" ${prior.get(item.id)?'checked':''}> <span>${escHtml(item.label)}</span></label>`).join('');
    function update(){
      const inputs=[...box.querySelectorAll('input')],done=inputs.filter(input=>input.checked).length;
      status.textContent=done===inputs.length?'公開前の手動確認：完了':`公開前の手動確認：${done}/${inputs.length}`;
      status.className='manual-status '+(done===inputs.length?'manual-ok':'manual-pending');
    }
    box.querySelectorAll('input').forEach(input=>input.addEventListener('change',update));
    update();
  }
  function markerIsOk(){
    return markerState==='valid'||markerState==='legacy'||markerState==='restored'||markerState==='auto';
  }
  function renderPreflight(result){
    ensurePanel();
    const badge=document.querySelector('#preflightBadge'),summary=document.querySelector('#preflightSummary');
    const checks=document.querySelector('#preflightChecks'),issues=document.querySelector('#preflightIssues'),placements=document.querySelector('#preflightPlacements');
    const markerOk=markerIsOk(),ok=Boolean(markerOk&&result?.ok);
    badge.textContent=ok?'コピー可':'コピー停止';
    badge.className='gate-badge '+(ok?'gate-ok':'gate-bad');
    summary.textContent=ok?'自動検査に合格しました。コピー時は目次・有料ラインの位置マーカーを本文から自動除外します。':'違反または未確認項目が残っています。修正するまで本文コピーを停止します。';
    const markerLabel=markerState==='legacy'?'旧形式の本文範囲を認識':markerState==='restored'?'検査済みの端末保存本文を復元':markerState==='auto'?'記事タイトルから公開本文を自動認識':'開始・終了マーカーが各1個あり、順序が正しい';
    const markerCheck={label:markerLabel,ok:markerOk};
    checks.innerHTML=[markerCheck,...(result?.checks||[])].map(item=>`<div class="gate-check ${item.ok?'pass':'fail'}"><span>${item.ok?'✓':'×'}</span>${escHtml(item.label)}</div>`).join('');
    const allIssues=[];
    if(!markerOk)allIssues.push({message:markerMessage,line:null,excerpt:''});
    allIssues.push(...(result?.issues||[]));
    issues.innerHTML=allIssues.length?`<div class="issue-title">修正が必要</div>${allIssues.map(item=>`<div class="gate-issue"><div>${item.line?`L${item.line}　`:''}${escHtml(item.message)}</div>${item.excerpt?`<code>${escHtml(item.excerpt)}</code>`:''}</div>`).join('')}`:'';
    placements.innerHTML=result?.placements?.length?`<div class="placement-title">note編集画面での設定位置</div>${result.placements.map(item=>`<div class="placement-row">${escHtml(placementText(item))}</div>`).join('')}`:'';
    renderManualChecks(result);
    setCopyEnabled(ok);
  }
  function runPreflight(){
    const title=document.querySelector('#title')?.value||'',body=document.querySelector('#body')?.value||'';
    currentResult=window.NotePreflight?window.NotePreflight.validateDocument({title,body}):{ok:false,checks:[],issues:[{message:'OS検査モジュールを読み込めません',line:null,excerpt:''}],placements:[],publishableBody:''};
    if(currentResult.ok&&markerIsOk())rememberExtractedSource();
    renderPreflight(currentResult);
    return currentResult;
  }
  function showMarkerError(message){
    markerState='invalid';markerMessage=message;
    const status=document.querySelector('#status');
    if(status)status.innerHTML=`<span class="bad">本文抽出を停止しました：${escHtml(message)}。Notion側を直して、ZIPを読み込み直してください。</span>`;
    runPreflight();
  }
  function applyTrimmedBody(body,trimmed){
    if(trimmed!==body.value.trim()){body.value=trimmed;body.dispatchEvent(new Event('input',{bubbles:true}));}
    runPreflight();
    return true;
  }
  function trimToPublishedDraft(){
    const body=document.querySelector('#body');if(!body)return false;
    markerState='checking';markerMessage='本文範囲を確認しています';setCopyEnabled(false);
    const lines=(body.value||'').split(/\r?\n/),range=findPublishedRange(lines);
    if(range.state==='valid'){
      const trimmed=removeInternalDraftMarkers(lines.slice(range.start+1,range.end).join('\n'));
      if(!trimmed){showMarkerError('開始・終了マーカーの間に本文がありません');return false;}
      markerState='valid';markerMessage='開始・終了マーカーを確認しました';return applyTrimmedBody(body,trimmed);
    }
    if(range.state==='invalid'){showMarkerError(range.message);return false;}
    let publishIndex=-1;lines.forEach((line,index)=>{if(isStartHeading(line))publishIndex=index;});
    if(publishIndex>=0){
      const trimmed=removeInternalDraftMarkers(lines.slice(publishIndex+1).join('\n'));
      if(!trimmed){showMarkerError('旧形式の公開本文見出しより後に本文がありません');return false;}
      markerState='legacy';markerMessage='旧形式の公開本文見出しを認識しました';return applyTrimmedBody(body,trimmed);
    }
    const article=findArticleHeading(lines);
    if(article){
      const title=document.querySelector('#title');
      if(title&&article.title&&title.value.trim()!==article.title){title.value=article.title;title.dispatchEvent(new Event('input',{bubbles:true}));}
      const trimmed=removeInternalDraftMarkers(lines.slice(article.index+1).join('\n'));
      if(!trimmed){showMarkerError('記事タイトルより後に本文がありません');return false;}
      markerState='auto';markerMessage='記事タイトルから公開本文を自動認識しました';return applyTrimmedBody(body,trimmed);
    }
    if(isRememberedSource()){
      markerState='restored';markerMessage='検査済みの端末保存本文を復元しました';runPreflight();return true;
    }
    showMarkerError('公開本文を自動認識できませんでした');return false;
  }
  function waitForZipLoad(){
    markerState='checking';markerMessage='ZIPの読み込み完了を待っています';setCopyEnabled(false);
    renderPreflight({ok:false,checks:[],issues:[],placements:[],publishableBody:''});
    let tries=0;const timer=setInterval(()=>{
      tries++;const status=document.querySelector('#status')?.textContent||'';
      if(status.includes('読み込み完了')){clearInterval(timer);trimToPublishedDraft();}
      else if(status.includes('読み込み失敗')){clearInterval(timer);showMarkerError('ZIPを読み込めませんでした');}
      else if(tries>=100){clearInterval(timer);showMarkerError('ZIPの読み込み確認がタイムアウトしました');}
    },100);
  }
  async function copyPublishable(rich){
    const result=runPreflight(),markerOk=markerIsOk();
    if(!markerOk||!result.ok){document.querySelector('#preflightPanel')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    const text=result.publishableBody;
    if(rich)await clipboardRich(mdToHtml(text),text);else await navigator.clipboard.writeText(text);
    const button=document.querySelector(rich?'#copyBody':'#copyPlain'),label=rich?'本文をnote用にコピー':'プレーンコピー';
    button.textContent='コピー済み ✓';setTimeout(()=>button.textContent=label,1000);
  }
  function reportText(){
    const result=currentResult||runPreflight(),markerOk=markerIsOk();
    const lines=[`OS本文コピーゲート：${markerOk&&result.ok?'合格':'不合格'}`,`本文範囲：${markerOk?'合格':'不合格'}${markerMessage?`（${markerMessage}）`:''}`,...result.checks.map(item=>`${item.ok?'✓':'×'} ${item.label}`)];
    if(result.issues.length){lines.push('','修正が必要：');result.issues.forEach(item=>lines.push(`- ${item.line?`L${item.line} `:''}${item.message}${item.excerpt?`｜${item.excerpt}`:''}`));}
    if(result.placements.length){lines.push('','note編集画面での設定位置：');result.placements.forEach(item=>lines.push(`- ${placementText(item)}`));}
    const manual=[...document.querySelectorAll('#manualChecks label')].map(label=>{const input=label.querySelector('input');return `${input.checked?'✓':'□'} ${label.querySelector('span').textContent}`;});
    if(manual.length)lines.push('','手動確認：',...manual);
    return lines.join('\n');
  }
  async function copyGateReport(){
    const button=document.querySelector('#copyGateReport');
    try{await navigator.clipboard.writeText(reportText());const old=button.textContent;button.textContent='コピー済み ✓';setTimeout(()=>button.textContent=old,1000);}catch(e){alert('検査結果のコピーに失敗しました');}
  }

  const file=document.querySelector('#file');if(file)file.addEventListener('change',waitForZipLoad);
  document.querySelector('#title')?.addEventListener('input',runPreflight);
  document.querySelector('#body')?.addEventListener('input',runPreflight);
  const copyBody=document.querySelector('#copyBody'),copyPlain=document.querySelector('#copyPlain');
  if(copyBody)copyBody.onclick=()=>copyPublishable(true);if(copyPlain)copyPlain.onclick=()=>copyPublishable(false);
  ensurePanel();setCopyEnabled(false);setTimeout(trimToPublishedDraft,300);setTimeout(trimToPublishedDraft,1000);
  const beta=document.querySelector('.beta');if(beta)beta.textContent=`β ${VERSION}`;
  const bodyNote=document.querySelector('#pane-body .note');
  if(bodyNote)bodyNote.textContent='公開範囲マーカーがある場合はその範囲を優先し、ない場合は記事タイトルから公開本文を自動認識します。目次・有料ラインの位置マーカーは、設定位置を別表示したうえでコピー本文から自動除外します。';
})();