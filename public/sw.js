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

  // Resolve relative URLs to absolute URLs
  let absoluteTargetUrl = targetUrl;
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    absoluteTargetUrl = new URL(targetUrl, self.location.origin).href;
  }

  const isExternal = !absoluteTargetUrl.startsWith(self.location.origin);

  if (isExternal) {
    if (clients.openWindow) {
      event.waitUntil(clients.openWindow(absoluteTargetUrl));
    }
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open on this origin
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            if (focusedClient && focusedClient.url !== absoluteTargetUrl && 'navigate' in focusedClient) {
              try {
                return focusedClient.navigate(absoluteTargetUrl);
              } catch (err) {
                console.error("Navigation failed:", err);
                if (clients.openWindow) return clients.openWindow(absoluteTargetUrl);
              }
            }
          });
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(absoluteTargetUrl);
      }
    })
  );
});
