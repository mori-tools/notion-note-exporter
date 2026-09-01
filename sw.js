const C='notion-note-beta094-v1';
const A=['./','./index.html','./manifest.webmanifest','./icon.svg','./banner-haru-tools.png','./banner-x.png','./banner-question.png','./preflight.js','./marker-normalizer.js','./publish-extractor.js','./version.json'];
const APP_VERSION='0.9.4';

function injectExtractor(response){
  if(!response)return response;
  return response.text().then(text=>{
    if(!text.includes('preflight.js')){
      text=text.replace('<script src="./publish-extractor.js"></script>','<script src="./preflight.js"></script><script src="./marker-normalizer.js"></script><script src="./publish-extractor.js"></script>');
    }
    if(!text.includes('marker-normalizer.js')){
      text=text.replace('<script src="./publish-extractor.js"></script>','<script src="./marker-normalizer.js"></script><script src="./publish-extractor.js"></script>');
    }
    if(!text.includes('publish-extractor.js')){
      text=text.replace('</body>','<script src="./preflight.js"></script><script src="./marker-normalizer.js"></script><script src="./publish-extractor.js"></script></body>');
    }
    text=text
      .replace(/β 0\.9\.\d+/g,`β ${APP_VERSION}`)
      .replace(/const APP_VERSION='0\.9\.\d+';/,`const APP_VERSION='${APP_VERSION}';`)
      .replace('data-copy-text="https://haru-tools.booth.pm/"','data-copy-text="https://haru-tools.booth.pm/?utm_source=note&utm_medium=referral&utm_campaign=haru_tools"')
      .replace('<div class="bannerurl">https://haru-tools.booth.pm/</div>','<div class="bannerurl">https://haru-tools.booth.pm/?utm_source=note&utm_medium=referral&utm_campaign=haru_tools</div>');
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    return new Response(text,{status:response.status,statusText:response.statusText,headers});
  });
}

function injectRuntimeVersion(response){
  if(!response)return response;
  return response.text().then(text=>{
    const patch=`\n;(()=>{const sync=()=>{const el=document.querySelector('.beta');if(el)el.textContent='β ${APP_VERSION}';};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();})();\n`;
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    return new Response(patch+text,{status:response.status,statusText:response.statusText,headers});
  });
}

self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});

async function precacheFresh(){
  const cache=await caches.open(C);
  await Promise.all(A.map(async path=>{
    const join=path.includes('?')?'&':'?';
    const response=await fetch(`${path}${join}v=0941`,{cache:'reload'});
    if(!response.ok)throw new Error(`Precache failed: ${path}`);
    await cache.put(path,response);
  }));
}

self.addEventListener('install',e=>e.waitUntil(precacheFresh().then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(xs=>Promise.all(xs.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));

self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  const isAppPage=e.request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/');
  if(isAppPage){
    e.respondWith(fetch('./index.html',{cache:'no-store'}).then(r=>{
      if(r&&r.ok){const copy=r.clone();caches.open(C).then(c=>c.put('./index.html',copy));return r;}
      return caches.match('./index.html');
    }).then(injectExtractor).catch(()=>caches.match('./index.html').then(injectExtractor)));
    return;
  }
  if(url.pathname.endsWith('/publish-extractor.js')){
    e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request)).then(injectRuntimeVersion));
    return;
  }
  if(url.pathname.endsWith('/version.json')||url.pathname.endsWith('/preflight.js')||url.pathname.endsWith('/marker-normalizer.js')||url.pathname.endsWith('/sw.js')){
    e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const copy=res.clone();caches.open(C).then(c=>c.put(e.request,copy));return res;}).catch(()=>caches.match('./index.html'))));
});
