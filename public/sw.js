// Service Worker for PWA
const CACHE_NAME = 'nutri-app-v1';

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
