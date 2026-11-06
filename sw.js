// Service worker do Gestor Gráfico Pro (GitHub Pages /Gestor-Gr-fica-Pro/ ou localhost).
// 1) Permite instalar como app no Chrome (botão "Instalar" na barra de endereço).
// 2) Guarda uma cópia dos arquivos do sistema: se o "Iniciar Site.bat" não estiver
//    aberto, o app instalado ainda abre (os dados vêm do Supabase, pela internet).
// Sempre tenta a versão nova primeiro (rede); a cópia só é usada se o servidor local
// estiver desligado. Só arquivos do próprio sistema; CDN e Supabase passam direto.
const CACHE = "grafico-pro-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
);

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((r) =>
          r || (req.mode === "navigate" ? caches.match(new URL("index.html", self.registration.scope).href) : undefined) || Response.error()
        )
      )
  );
});
