const test=require('node:test');
const assert=require('node:assert/strict');
const {validateDocument}=require('../preflight.js');

test('正常な本文は合格する',()=>{
  const result=validateDocument({
    title:'最初の報酬は39円でした',
    body:'## 最初の仕事\n継続依頼もかなりありましたが、何件だったかまでは記録していません。'
  });
  assert.equal(result.ok,true);
  assert.equal(result.issues.length,0);
});

test('目次と有料ラインの位置を保持し、コピー本文から除外する',()=>{
  const result=validateDocument({
    title:'有料記事',
    body:'## 無料部分\n無料の最後です。\n［目次挿入位置］\nここまで無料です。\n［ここから有料］\n## 第1章\n有料本文です。'
  });
  assert.equal(result.ok,true);
  assert.deepEqual(result.placements.map(item=>item.id),['toc','paid']);
  assert.equal(result.publishableBody.includes('［目次挿入位置］'),false);
  assert.equal(result.publishableBody.includes('［ここから有料］'),false);
  assert.equal(result.placements[1].before.text,'ここまで無料です。');
  assert.equal(result.placements[1].after.text,'## 第1章');
});

test('AI的な制作側メタ表現を検出して不合格にする',()=>{
  const result=validateDocument({
    title:'検証',
    body:'## 実績\n正確な件数は記録していないため、ここでは数を作りません。'
  });
  assert.equal(result.ok,false);
  assert.equal(result.issues.some(item=>item.id==='fake-number'),true);
});

test('OS禁止の地の文を検出し、見出し内は許可する',()=>{
  const blocked=validateDocument({title:'検証',body:'## 見出し\n成功法ではなく、判断基準です。'});
  const allowed=validateDocument({title:'検証',body:'## 高単価ならよい仕事、ではなかった\n単価が高くても、自分に合うとは限りません。'});
  assert.equal(blocked.ok,false);
  assert.equal(blocked.issues.some(item=>item.id==='os-dewanai-style'),true);
  assert.equal(allowed.ok,true);
});

test('作業用マーカーと管理情報を検出する',()=>{
  const result=validateDocument({
    title:'検証',
    body:'## 本文\n［要確認：公式情報］\n［証拠画像候補①：匿名化］\n## 初稿後レビュー'
  });
  assert.equal(result.ok,false);
  assert.equal(result.issues.some(item=>item.id==='confirm-marker'),true);
  assert.equal(result.issues.some(item=>item.id==='evidence-marker'),true);
  assert.equal(result.issues.some(item=>item.id==='review-section'),true);
});

test('タイトルまたは本文が空なら不合格にする',()=>{
  const noTitle=validateDocument({title:'',body:'## 本文\n内容'});
  const noBody=validateDocument({title:'記事',body:''});
  assert.equal(noTitle.ok,false);
  assert.equal(noTitle.issues.some(item=>item.id==='missing-title'),true);
  assert.equal(noBody.ok,false);
  assert.equal(noBody.issues.some(item=>item.id==='empty-body'),true);
});
