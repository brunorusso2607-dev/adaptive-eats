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
    data: { type: 'water-reminder' }
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
    tag: data.tag || 'water-reminder',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      { action: 'add-water', title: '💧 +250ml' },
      { action: 'dismiss', title: 'Dispensar' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data;
  
  if (action === 'add-water') {
    // Open app with action to add water
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // If app is already open, focus it and send message
        for (const client of clientList) {
          if (client.url.includes('/dashboard') && 'focus' in client) {
            client.focus();
            client.postMessage({ type: 'ADD_WATER', amount: 250 });
            return;
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow('/dashboard?action=add-water');
        }
      })
    );
  } else {
    // Default: just open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/dashboard');
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
