const C='notion-note-beta085-v1';
const A=['./','./index.html','./manifest.webmanifest','./icon.svg','./banner-haru-tools.png','./banner-x.png','./banner-question.png','./publish-extractor.js','./version.json'];

function injectExtractor(response){
  if(!response)return response;
  return response.text().then(text=>{
    if(!text.includes('publish-extractor.js')){
      text=text.replace('</body>','<script src="./publish-extractor.js"></script></body>');
    }
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    return new Response(text,{status:response.status,statusText:response.statusText,headers});
  });
}

self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});

self.addEventListener('install',e=>e.waitUntil(
  caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(xs=>Promise.all(xs.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())
));

self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  const isAppPage=e.request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/');

  if(isAppPage){
    e.respondWith(
      caches.match('./index.html')
        .then(r=>r||fetch('./index.html'))
        .then(injectExtractor)
        .catch(()=>caches.match('./index.html').then(injectExtractor))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
      const copy=res.clone();
      caches.open(C).then(c=>c.put(e.request,copy));
      return res;
    }).catch(()=>caches.match('./index.html')))
  );
});