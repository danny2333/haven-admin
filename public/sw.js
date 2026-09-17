self.addEventListener("push", event => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Haven Admin", {
      body: data.body ?? "",
      icon: "/apple-icon",
      badge: "/apple-icon",
      data: data.data ?? {},
      requireInteraction: true,
    })
  )
})

self.addEventListener("notificationclick", event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus()
        }
      }
      return clients.openWindow("/")
    })
  )
})
