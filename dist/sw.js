const VERSION = "0.86.0";
const CACHE_PREFIX = "rn-quest-" + new URL(self.registration.scope).pathname + "-v";
const CACHE_NAME = CACHE_PREFIX + VERSION;
const APP_SHELL = ["./", "index.html", "manifest.webmanifest",
  ...["css/styles.css", "js/version.js", "js/progress.js", "js/quiz.js", "js/cloud.js", "js/analytics.js", "js/app.js",
    "data/curriculum.json", "data/program-roadmap.json"].map(path => path + "?v=" + VERSION)];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    const response = await cache.match("data/curriculum.json?v=" + VERSION);
    const curriculum = await response.json();
    await cache.addAll(curriculum.lessons.flatMap(lesson =>
      [lesson.lessonFile, lesson.quizFile].map(path => path + "?v=" + VERSION)));
  })());
  // Existing clients opt in after finishing their current quiz.
});
self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME &&
      (key.startsWith(CACHE_PREFIX) || /^rn-quest-v\d/.test(key))).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (event.request.method !== "GET" || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  if (url.pathname.endsWith("/sw.js") || url.pathname.endsWith("/version.json")) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    if (event.request.mode === "navigate") {
      const shell = await cache.match(new URL("index.html", scope).href);
      if (shell) return shell;
    }
    // Do not cache unknown requests, failures, credentials or external resources.
    return fetch(event.request);
  })());
});
