// FBA-BIP 통합 도구 Service Worker v1.2.0
// Stale-While-Revalidate: 캐시로 빠르게 표시 + 백그라운드에서 새 버전 받아오기

const CACHE_VERSION = 'fba-bip-v1.2.0';
const CORE_ASSETS = [
  './',
  './index.html',
  './social-story.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 설치
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// 활성화: 옛 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 패치: Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (!req.url.startsWith('http')) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.match(req).then((cached) => {
        // 백그라운드에서 새 버전 다운로드
        const fetchPromise = fetch(req).then((networkRes) => {
          if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
            cache.put(req, networkRes.clone());
          }
          return networkRes;
        }).catch(() => null);

        // 캐시가 있으면 즉시 반환, 없으면 네트워크 응답 대기
        return cached || fetchPromise.then((res) =>
          res || cache.match('./index.html')
        );
      });
    })
  );
});
