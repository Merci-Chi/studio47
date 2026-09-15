const CACHE_NAME='studio47-webapp-runtime';
const CORE=[
  './',
  './admin.html',
  './admin-manifest.webmanifest',
  './admin-services-enhancements.css',
  './admin-services-enhancements.js',
  './admin-appointment-time-picker.js',
  './images/logo.png',
  './studio47-app-icon.png'
];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.all(CORE.map(async path=>{
      try{
        const response=await fetch(path,{cache:'no-store'});
        if(response.ok)await cache.put(path,response.clone());
      }catch{}
    }));
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name!==CACHE_NAME).map(name=>caches.delete(name)));
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

  const alwaysFresh=
    req.mode==='navigate' ||
    /\.(?:html|js|css|webmanifest)(?:$|\?)/i.test(url.pathname);

  if(alwaysFresh){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req,{cache:'no-store'});
        if(fresh?.ok){
          const cache=await caches.open(CACHE_NAME);
          cache.put(req,fresh.clone()).catch(()=>{});
        }
        return fresh;
      }catch(error){
        const cached=await caches.match(req,{ignoreSearch:true});
        if(cached)return cached;
        if(req.mode==='navigate'){
          const fallback=await caches.match('./admin.html',{ignoreSearch:true});
          if(fallback)return fallback;
        }
        throw error;
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(req,{ignoreSearch:true});
    if(cached)return cached;

    const fresh=await fetch(req,{cache:'no-cache'});
    if(fresh?.ok){
      const cache=await caches.open(CACHE_NAME);
      cache.put(req,fresh.clone()).catch(()=>{});
    }
    return fresh;
  })());
});
