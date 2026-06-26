/* Service worker — cache the app shell so it works fully offline. */
const CACHE = "mdpwa-v21";
const ASSETS = [
  "./", "./index.html", "./app.js", "./config.js", "./cloud.js", "./manifest.json",
  "./marked.min.js", "./purify.min.js", "./hljs.min.js",
  "./hljs-theme.css", "./hljs-light.css",
  "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // only handle our own assets; let cloud SDK / API calls go straight to network
  if (new URL(e.request.url).origin !== location.origin) return;
  // NETWORK-FIRST: always try to fetch the latest; fall back to cache only when offline.
  // (cache-first caused stale app code to persist forever on the phone.)
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
      return res;
    }).catch(()=> caches.match(e.request).then(hit => hit || caches.match("./index.html")))
  );
});
