const CACHE_PREFIX='studio47-webapp-';
const CACHE_NAME=CACHE_PREFIX+'2026-09-15-1';
const CORE=['./','./admin.html','./admin-manifest.webmanifest','./admin-services-enhancements.css','./admin-services-enhancements.js','./images/logo.png','./studio47-app-icon.png'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE).catch(()=>{})));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith(CACHE_PREFIX)&&name!==CACHE_NAME).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  const isFreshAsset=req.mode==='navigate'||/\.(?:html|js|css|webmanifest)(?:$|\?)/i.test(url.pathname);
  if(isFreshAsset){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req,{cache:'no-store'});
        if(fresh&&fresh.ok){
          const cache=await caches.open(CACHE_NAME);
          cache.put(req,fresh.clone()).catch(()=>{});
        }
        return fresh;
      }catch(error){
        const cached=await caches.match(req);
        if(cached)return cached;
        if(req.mode==='navigate')return caches.match('./admin.html');
        throw error;
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached)return cached;
    const fresh=await fetch(req);
    if(fresh&&fresh.ok){
      const cache=await caches.open(CACHE_NAME);
      cache.put(req,fresh.clone()).catch(()=>{});
    }
    return fresh;
  })());
});