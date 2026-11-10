const JOUR = /\/mariage\/[0-9a-f-]{36}\/jour\/?$/;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !JOUR.test(url.pathname)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open("vow-jour-v1");
      try {
        const response = await fetch(event.request);
        if (response.ok && event.request.mode === "navigate") await cache.put(event.request, response.clone());
        return response;
      } catch {
        const cached =
          (await cache.match(event.request, { ignoreSearch: true, ignoreVary: true })) ||
          (await cache.match(url.pathname));
        if (cached) return cached;
        return new Response("Le jour J n'est pas encore enregistré sur cet appareil.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })(),
  );
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "VOW";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon.svg",
      data: { url: data.url || "/alertes" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/alertes";
  event.waitUntil(self.clients.openWindow(url));
});
