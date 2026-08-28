(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.NotePreflight=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const EDITORIAL_MARKERS=[
    {id:'toc',label:'目次',pattern:/^\s*［目次挿入位置］\s*$/},
    {id:'paid',label:'有料ライン',pattern:/^\s*［ここから有料］\s*$/}
  ];

  const INTERNAL_PATTERNS=[
    {id:'confirm-marker',label:'要確認マーカー',pattern:/［要確認(?:：[^］]*)?］/},
    {id:'evidence-marker',label:'証拠画像候補',pattern:/［証拠画像候補[^］]*］/},
    {id:'diagram-marker',label:'図解・画像候補',pattern:/［(?:図解|画像候補)[^］]*］/},
    {id:'todo-marker',label:'TODO・FIXME',pattern:/^\s*(?:TODO|FIXME)(?:\s*[:：].*)?\s*$/i},
    {id:'review-section',label:'制作管理情報',pattern:/(?:初稿後レビュー|制作管理用|Claude本文制作仕様書)/},
    {id:'range-marker',label:'本文範囲マーカー',pattern:/(?:▼▼▼ note公開本文｜ここから ▼▼▼|▲▲▲ note公開本文｜ここまで ▲▲▲)/}
  ];

  const AI_META_PATTERNS=[
    {id:'fake-number',label:'制作側の数字管理表現',pattern:/ここでは数を作りません/},
    {id:'causality-proof',label:'AI的な免責表現',pattern:/因果関係を証明したものではありません/},
    {id:'rebuilt-guide',label:'制作側の整理表現',pattern:/経験から組み直した目安です/},
    {id:'recover-purpose',label:'コンサル的な抽象語',pattern:/目的を回収/},
    {id:'revenue-guarantee',label:'AI的な免責表現',pattern:/同じ行動をすれば同じ収益になるという保証ではありません/}
  ];

  function normalize(text){
    return String(text||'').replace(/\r\n?/g,'\n');
  }

  function lineExcerpt(line){
    const trimmed=line.trim();
    return trimmed.length>72?trimmed.slice(0,69)+'…':trimmed;
  }

  function nearestContent(lines,start,direction){
    for(let i=start+direction;i>=0&&i<lines.length;i+=direction){
      const text=lines[i].trim();
      if(text)return{text,line:i+1};
    }
    return null;
  }

  function extractEditorialMarkers(text){
    const lines=normalize(text).split('\n');
    const placements=[];
    const kept=[];

    lines.forEach((line,index)=>{
      const marker=EDITORIAL_MARKERS.find(item=>item.pattern.test(line));
      if(!marker){
        kept.push(line);
        return;
      }
      placements.push({
        id:marker.id,
        label:marker.label,
        line:index+1,
        before:nearestContent(lines,index,-1),
        after:nearestContent(lines,index,1)
      });
    });

    return{
      placements,
      body:kept.join('\n').replace(/\n{3,}/g,'\n\n').trim()
    };
  }

  function issue(rule,line,index,message){
    return{
      id:rule.id,
      label:rule.label,
      line:index+1,
      excerpt:lineExcerpt(line),
      message:message||`${rule.label}が残っています`
    };
  }

  function validateDocument(input){
    const title=String(input?.title||'').trim();
    const extracted=extractEditorialMarkers(input?.body||'');
    const body=extracted.body;
    const lines=body.split('\n');
    const issues=[];
    const checks=[];

    if(!title){
      issues.push({id:'missing-title',label:'タイトル',line:null,excerpt:'',message:'タイトルが空です'});
    }
    checks.push({id:'title',label:'タイトルがある',ok:Boolean(title)});

    if(!body){
      issues.push({id:'empty-body',label:'公開本文',line:null,excerpt:'',message:'公開本文が空です'});
    }
    checks.push({id:'body',label:'公開本文がある',ok:Boolean(body)});

    lines.forEach((line,index)=>{
      INTERNAL_PATTERNS.forEach(rule=>{
        if(rule.pattern.test(line))issues.push(issue(rule,line,index));
      });
      AI_META_PATTERNS.forEach(rule=>{
        if(rule.pattern.test(line))issues.push(issue(rule,line,index));
      });
    });

    const categories=[
      {id:'internal',label:'作業用マーカー・管理情報がない',ids:INTERNAL_PATTERNS.map(x=>x.id)},
      {id:'ai-meta',label:'制作側のメタ表現がない',ids:AI_META_PATTERNS.map(x=>x.id)}
    ];
    categories.forEach(category=>checks.push({
      id:category.id,
      label:category.label,
      ok:!issues.some(item=>category.ids.includes(item.id))
    }));

    return{
      ok:issues.length===0,
      title,
      publishableBody:body,
      placements:extracted.placements,
      issues,
      checks
    };
  }

  return{
    AI_META_PATTERNS,
    EDITORIAL_MARKERS,
    INTERNAL_PATTERNS,
    extractEditorialMarkers,
    validateDocument
  };
});