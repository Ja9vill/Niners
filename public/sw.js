/*
 * Custom Web Push Service Worker for NINE Talent Management Dashboard
 */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'NINE Talent Management';
    const options = {
      body: payload.body || '',
      icon: payload.icon || '/logo.jpg',
      badge: payload.badge || '/logo.jpg',
      data: {
        url: payload.url || '/dashboard'
      },
      vibrate: [100, 50, 100],
      actions: [
        { action: 'open', title: 'Open Dashboard' }
      ]
    };

    const promiseChain = self.registration.showNotification(title, options)
      .then(() => {
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      })
      .then((windowClients) => {
        windowClients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_RECEIVED',
            payload: {
              title,
              body: payload.body,
              url: payload.url
            }
          });
        });
      });

    event.waitUntil(promiseChain);
  } catch (err) {
    console.error('Failed to handle push event:', err);
    
    const text = event.data.text();
    const promiseChain = self.registration.showNotification('NINE Talent Management', {
      body: text,
      icon: '/logo.jpg',
      data: { url: '/dashboard' }
    }).then(() => {
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    }).then((windowClients) => {
      windowClients.forEach((client) => {
        client.postMessage({
          type: 'PUSH_RECEIVED',
          payload: {
            title: 'NINE Talent Management',
            body: text,
            url: '/dashboard'
          }
        });
      });
    });

    event.waitUntil(promiseChain);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the same target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // Focus client if matches, or navigate to page
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            if (focusedClient.url !== targetUrl && 'navigate' in focusedClient) {
              return focusedClient.navigate(targetUrl);
            }
          });
        }
      }
      // If no open client exists, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
