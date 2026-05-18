// FBA-BIP 통합 도구 Service Worker
// 오프라인 우선(precache) + 네트워크 폴백

const CACHE_VERSION = 'fba-bip-v1.0.0';
const CORE_ASSETS = [
  './',
  './index.html',
  './social-story.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 설치: 핵심 자산 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW] 일부 자산 캐싱 실패:', err);
      });
    }).then(() => self.skipWaiting())
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

// 패치 전략: cache-first → network fallback → 캐시에 동적 추가
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // chrome-extension 등 비-http는 무시
  if (!req.url.startsWith('http')) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // 같은 출처 응답만 캐싱
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => {
        // 오프라인 폴백: HTML 요청이면 index.html로
        if (req.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
