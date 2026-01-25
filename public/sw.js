// Service Worker for PWA with Push Notifications
const CACHE_NAME = 'nutri-app-v2';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(clients.claim());
});

// Fetch event for caching (optional, for offline support)
self.addEventListener('fetch', (event) => {
  // Pass through all requests for now
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  let data = {
    title: '💧 Hora de beber água!',
    body: 'Mantenha-se hidratado!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'water-reminder',
    badgeCount: 1,
    data: { type: 'water-reminder', url: '/dashboard' }
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.log('[SW] Push data parse error:', e);
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-72x72.png',
    tag: data.tag || 'notification',
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
    data: data.data || { url: '/dashboard' },
    actions: data.actions || []
  };
  
  // Set app badge for iOS (requires a number)
  const badgePromises = [];
  if ('setAppBadge' in self.navigator) {
    const badgeCount = data.badgeCount || 1;
    console.log('[SW] Setting app badge:', badgeCount);
    badgePromises.push(
      self.navigator.setAppBadge(badgeCount).catch(err => {
        console.log('[SW] Badge error:', err);
      })
    );
  }
  
  badgePromises.push(self.registration.showNotification(data.title, options));
  
  event.waitUntil(Promise.all(badgePromises));
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action, event.notification.data);
  
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data || {};
  const notificationId = notificationData.notificationId;
  let targetUrl = notificationData.url || '/dashboard';
  
  // Append notificationId to URL so the app can mark it as read
  if (notificationId) {
    const separator = targetUrl.includes('?') ? '&' : '?';
    targetUrl = `${targetUrl}${separator}markAsRead=${notificationId}`;
  }
  
  console.log('[SW] Target URL:', targetUrl);
  
  if (action === 'add-water') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('/dashboard') && 'focus' in client) {
            client.focus();
            client.postMessage({ type: 'ADD_WATER', amount: 250, notificationId });
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(`/dashboard?action=add-water${notificationId ? `&markAsRead=${notificationId}` : ''}`);
        }
      })
    );
  } else if (action === 'open-feedback' || notificationData.type === 'meal-feedback') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            client.postMessage({ type: 'OPEN_FEEDBACK', notificationId });
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(`/dashboard?action=open-feedback${notificationId ? `&markAsRead=${notificationId}` : ''}`);
        }
      })
    );
  } else {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            // Send message to mark notification as read
            if (notificationId) {
              client.postMessage({ type: 'MARK_NOTIFICATION_READ', notificationId });
            }
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
    );
  }
});

// Message from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SCHEDULE_WATER_REMINDER') {
    const { delayMs, totalToday, dailyGoal } = event.data;
    
    // Schedule notification after delay
    setTimeout(() => {
      self.registration.showNotification('💧 Hora de beber água!', {
        body: `Você bebeu ${(totalToday / 1000).toFixed(1)}L de ${(dailyGoal / 1000).toFixed(1)}L hoje`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'water-reminder',
        requireInteraction: false,
        vibrate: [200, 100, 200],
        actions: [
          { action: 'add-water', title: '💧 +250ml' },
          { action: 'dismiss', title: 'Dispensar' }
        ]
      });
    }, delayMs);
  }
});
