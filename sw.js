const C="ledger-v17";
const FILES=["./", "index.html", "manifest.json", "icon-192.png", "css/style.css", "js/config.js", "js/core.js", "js/prices.js", "js/sync.js", "js/app.js", "js/tabs/dashboard.js", "js/tabs/ledger.js", "js/tabs/income.js", "js/tabs/expenses.js",  "js/tabs/investments.js", "js/tabs/liabilities.js", "js/tabs/transfers.js", "js/tabs/allocation.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin)return;
e.respondWith(fetch(e.request).then(r=>{const k=r.clone();caches.open(C).then(c=>c.put(e.request,k));return r}).catch(()=>caches.match(e.request).then(m=>m||caches.match("./"))))});
