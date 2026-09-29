const CACHE = "quest-dashboard-pwa-v1";
const ASSETS = ["./", "index.html", "style.css", "app.js", "config.js", "cloud.js", "pwa.js", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener("message", event => {
    if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("activate", event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("quest-dashboard-pwa-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
    const url = new URL(event.request.url);
    // Never cache cloud/auth requests or personal data.
    if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
    const root = new URL("./", self.location.href);
    const path = url.pathname.slice(root.pathname.length);
    if (!url.pathname.startsWith(root.pathname) || !(path === "" || ASSETS.includes(path))) return;
    event.respondWith(caches.open(CACHE).then(async cache => {
        const key = event.request.mode === "navigate" ? new URL("index.html", root).href : new URL(path || "index.html", root).href;
        const saved = await cache.match(key);
        if (saved) return saved;
        return fetch(event.request);
    }));
});