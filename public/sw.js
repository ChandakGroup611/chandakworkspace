// Chandak Workspace & Messenger Enterprise Service Worker
// Provides high-reliability OS/device notifications when browser is in background or closed

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push notifications
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : 'You have a new message on Chandak Messenger' };
  }

  const title = data.title || 'Chandak Messenger';
  const options = {
    body: data.body || 'You have received a new message',
    icon: data.icon || '/chandak-40-icon.png',
    badge: '/chandak-40-icon.png',
    data: {
      url: data.url || '/#messenger:' + (data.conversationId || ''),
    },
    vibrate: [150, 50, 150],
    tag: data.tag || 'chandak-notification',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle user clicking on the notification on their device
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (client.navigate && targetUrl) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

