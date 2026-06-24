// MARKET WATCH 서비스워커
// 앱 셸(정적 파일)만 캐시. 시세 데이터(외부 API)는 항상 네트워크.
const CACHE = 'mw-v2';
// './index.html'은 Cloudflare Pages가 './'로 308 리다이렉트하므로 캐시 목록에서 제외
const SHELL = [
  './',
  './style.css',
  './script.js',
  './config.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // 같은 오리진(앱 셸)만 캐시 처리. 외부 API(Binance/Worker/환율 등)는 건드리지 않음 -> 항상 네트워크
  if (url.origin !== self.location.origin) return;

  // stale-while-revalidate: 캐시 우선 + 백그라운드 갱신
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res && res.status === 200 && !res.redirected) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
