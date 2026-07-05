// TORCA Service Worker
// アプリシェルをキャッシュしてオフライン起動と再訪の高速化を実現する。
// /api はキャッシュしない（常にネットワーク）。

const CACHE = 'torca-v2.3.1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 同一オリジンの GET のみ対象。API は常にネットワーク
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

  // ナビゲーション: ネットワーク優先（デプロイ後の stale 化防止）、オフライン時はキャッシュ
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // アセット: キャッシュ優先（Vite のハッシュ付きファイル名前提）
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok && (res.type === 'basic' || res.type === 'default')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
