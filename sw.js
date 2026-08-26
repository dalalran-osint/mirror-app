const CACHE = "mirror-v3";
const SHELL = ["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png"];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

// דף הבית: קודם מהרשת, כדי שעדכון גרסה יגיע מיד. נכשל — מהמטמון.
// שאר הקבצים: קודם מהמטמון, מהיר וגם בלי רשת.
self.addEventListener("fetch", e=>{
  if(e.request.method !== "GET") return;
  const isDoc = e.request.mode === "navigate" || e.request.destination === "document";
  if(isDoc){
    e.respondWith(
      fetch(e.request).then(res=>{
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put("./index.html",copy)).catch(()=>{});
        return res;
      }).catch(()=>caches.match("./index.html").then(h=>h||caches.match("./")))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(hit=> hit || fetch(e.request).then(res=>{
      const copy = res.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
      return res;
    }))
  );
});
