const CACHE = "mirror-v4";
const STATIC = ["./manifest.webmanifest","./icon-192.png","./icon-512.png"];
const DOC = "./index.html";

// בקשה שעוקפת את המטמון הפנימי של הדפדפן.
// בלי זה גיטהאב מורה לדפדפן לשמור את הדף ל-10 דקות, ועדכוני גרסה לא מגיעים.
function fresh(url){ return new Request(url, {cache:"reload", credentials:"same-origin"}); }

self.addEventListener("install", e=>{
  e.waitUntil((async ()=>{
    const c = await caches.open(CACHE);
    await c.addAll(STATIC);
    try{
      const res = await fetch(fresh(DOC));
      if(res && res.ok) await c.put(DOC, res.clone());
    }catch(_){}
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e=>{
  e.waitUntil((async ()=>{
    const ks = await caches.keys();
    await Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e=>{
  if(e.request.method !== "GET") return;
  const isDoc = e.request.mode === "navigate" || e.request.destination === "document";

  if(isDoc){
    // תמיד מהרשת ובלי מטמון דפדפן. אין רשת — מגישים את הגרסה השמורה.
    e.respondWith((async ()=>{
      try{
        const res = await fetch(fresh(e.request.url));
        if(res && res.ok){
          const c = await caches.open(CACHE);
          c.put(DOC, res.clone()).catch(()=>{});
        }
        return res;
      }catch(_){
        const hit = await caches.match(DOC);
        return hit || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async ()=>{
    const hit = await caches.match(e.request);
    if(hit) return hit;
    const res = await fetch(e.request);
    const c = await caches.open(CACHE);
    c.put(e.request, res.clone()).catch(()=>{});
    return res;
  })());
});
