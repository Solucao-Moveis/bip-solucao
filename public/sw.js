/* ============================================================
   SMERP — Service Worker do BIP (Expedição) — PWA.
   ADITIVO: permite instalar o BIP na tela inicial e abrir rápido/
   offline a casca do app. NUNCA cacheia o Supabase (cross-origin)
   nem chamadas dinâmicas do servidor — só os estáticos do app.
   Pra forçar atualização geral, suba o número do CACHE (v1 -> v2).
   ============================================================ */
const CACHE = 'smerp-bip-v1';

// Estáticos previsíveis. Os JS/CSS com hash entram sozinhos (via /assets/).
const STATIC = new Set([
  '/', '/apontar', '/manifest.webmanifest',
  '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png',
]);
const PRECACHE = Array.from(STATIC);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // allSettled: se um item falhar, a instalação não quebra.
      .then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                       // POST etc. (inclui funções de servidor) -> rede

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // Supabase / fontes / CDN -> rede direto

  // Navegação (abrir páginas): rede primeiro, cache como rede de segurança.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match('/apontar') || caches.match('/')))
    );
    return;
  }

  // Só estáticos do app (assets com hash, ícones, manifesto): cache + revalida.
  // Qualquer outro GET dinâmico same-origin vai direto pra rede (não cacheia).
  const isStatic = url.pathname.startsWith('/assets/') || STATIC.has(url.pathname);
  if (!isStatic) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
