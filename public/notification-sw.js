self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL('./#/?timer=open', self.registration.scope).href

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    })
    const existing = windows.find((client) => client.url.startsWith(self.registration.scope))

    if (existing) {
      await existing.focus()
      if ('navigate' in existing) await existing.navigate(targetUrl)
      return
    }
    await self.clients.openWindow(targetUrl)
  })())
})
