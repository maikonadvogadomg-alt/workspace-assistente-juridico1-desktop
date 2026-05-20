/**
 * SK Jurídico — Service Worker v3
 * Offline mode + Push Notifications (Firebase FCM)
 * Background Sync para documentos
 */

const CACHE_VERSION = "sk-juridico-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

const CACHEABLE_API = [
  "/api/ementas",
  "/api/custom-actions",
  "/api/prompt-templates",
  "/api/doc-templates",
];

// ─── Install ─────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
    ).then(() => self.skipWaiting())
  );
});

// ─── Activate ────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("sk-juridico-") && !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const path = url.pathname;

  if (path.includes("/stream") || path.includes("/tts") ||
      event.request.headers.get("accept") === "text/event-stream") return;
  if (event.request.method !== "GET") return;

  if (path.startsWith("/api/")) {
    if (CACHEABLE_API.some((r) => path.startsWith(r))) {
      event.respondWith(networkFirstWithCache(event.request, API_CACHE));
    }
    return;
  }

  if (path.match(/\.(js|css|woff2?|png|jpg|ico|svg)$/)) {
    event.respondWith(cacheFirstWithNetwork(event.request, STATIC_CACHE));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        if (resp.ok) {
          caches.open(DYNAMIC_CACHE).then((c) => c.put(event.request, resp.clone()));
        }
        return resp;
      })
      .catch(() =>
        caches.match(event.request).then((cached) =>
          cached || caches.match("/index.html")
        )
      )
  );
});

async function networkFirstWithCache(request, cacheName) {
  try {
    const resp = await fetch(request);
    if (resp.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, resp.clone());
    }
    return resp;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ offline: true }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const resp = await fetch(request);
    if (resp.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, resp.clone());
    }
    return resp;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  let data = { title: "SK Jurídico", body: "Nova notificação", tipo: "geral" };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch {}

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tipo || "sk-juridico",
    requireInteraction: data.tipo === "prazo_urgente" || data.tipo === "prazo_vencido",
    actions: [
      { action: "abrir", title: "Abrir SK Jurídico" },
      { action: "dispensar", title: "Dispensar" },
    ],
    data: { url: "/", prazoId: data.prazoId, tipo: data.tipo },
    vibrate: data.tipo === "prazo_urgente" ? [200, 100, 200, 100, 200] : [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ─── Notification Click ───────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dispensar") return;

  const targetUrl = event.notification.data?.prazoId
    ? `/prazos?id=${event.notification.data.prazoId}`
    : event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({ type: "NAVIGATE", url: targetUrl });
          return;
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

// ─── Background Sync ──────────────────────────────────────────────────────────

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-documents") {
    event.waitUntil(
      self.clients.matchAll().then((cls) =>
        cls.forEach((c) => c.postMessage({ type: "SYNC_DOCUMENTS" }))
      )
    );
  }
  if (event.tag === "sync-prazos") {
    event.waitUntil(
      fetch("/api/prazos/alertas").then(async (resp) => {
        if (!resp.ok) return;
        const prazos = await resp.json();
        if (prazos.length > 0) {
          const p = prazos[0];
          await self.registration.showNotification("⚠️ Prazo: " + p.titulo, {
            body: `Vence: ${new Date(p.dataVencimento).toLocaleDateString("pt-BR")}`,
            icon: "/icon-192.png",
            tag: "prazo-sync",
            data: { prazoId: p.id },
          });
        }
      }).catch(() => {})
    );
  }
});

// ─── Message ──────────────────────────────────────────────────────────────────

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
