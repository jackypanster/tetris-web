/**
 * Service Worker for offline support and background sync
 */

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'tetris-web-v1';
const OFFLINE_QUEUE_STORE = 'offline-scores';

// Assets to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/main.js',
  '/assets/main.css',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Handle API requests differently
  if (request.url.includes('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else {
    // Handle static assets
    event.respondWith(
      caches.match(request)
        .then(response => {
          // Return cached version or fetch from network
          return response || fetch(request);
        })
        .catch(() => {
          // Return offline fallback for navigation requests
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
        })
    );
  }
});

// Handle API requests with offline queueing
async function handleApiRequest(request: Request): Promise<Response> {
  try {
    // Try network first
    const response = await fetch(request);

    // If successful, process any pending offline queue
    if (response.ok && navigator.onLine) {
      processPendingQueue();
    }

    return response;
  } catch (error) {
    // Network failed - handle score submission offline
    if (request.method === 'POST' && request.url.includes('/scores')) {
      return handleOfflineScoreSubmission(request);
    }

    // For other requests, return a generic offline response
    return new Response(
      JSON.stringify({ error: 'Network unavailable' }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle score submission when offline
async function handleOfflineScoreSubmission(request: Request): Promise<Response> {
  try {
    const requestData = await request.json();

    // Store in IndexedDB for later sync
    await storeOfflineScore(requestData);

    // Return success response to indicate queuing
    return new Response(
      JSON.stringify({
        message: 'Score queued for submission when online',
        queued: true
      }),
      {
        status: 202,
        statusText: 'Accepted',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Failed to queue offline score:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to queue score' }),
      {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Store score in IndexedDB for offline sync
async function storeOfflineScore(scoreData: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tetris-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([OFFLINE_QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(OFFLINE_QUEUE_STORE);

      const queuedScore = {
        ...scoreData,
        queuedAt: Date.now(),
        id: `offline-${Date.now()}-${Math.random()}`
      };

      store.add(queuedScore);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
        db.createObjectStore(OFFLINE_QUEUE_STORE, { keyPath: 'id' });
      }
    };
  });
}

// Process pending offline scores when back online
async function processPendingQueue(): Promise<void> {
  try {
    const pendingScores = await getPendingScores();

    if (pendingScores.length === 0) return;

    // Submit scores in bulk
    const response = await fetch('/api/scores/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: pendingScores })
    });

    if (response.ok) {
      const result = await response.json();

      // Remove successfully submitted scores
      await clearSuccessfullySubmitted(result.accepted);

      console.log(`Successfully synced ${result.accepted.length} offline scores`);
    }
  } catch (error) {
    console.error('Failed to process offline queue:', error);
  }
}

// Get pending scores from IndexedDB
async function getPendingScores(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tetris-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([OFFLINE_QUEUE_STORE], 'readonly');
      const store = transaction.objectStore(OFFLINE_QUEUE_STORE);
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
  });
}

// Clear successfully submitted scores from queue
async function clearSuccessfullySubmitted(submittedScores: any[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tetris-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([OFFLINE_QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(OFFLINE_QUEUE_STORE);

      // Clear all for simplicity - in production, match by correlation ID
      store.clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

// Background sync for score submission
self.addEventListener('sync', (event) => {
  if (event.tag === 'score-sync') {
    event.waitUntil(processPendingQueue());
  }
});

// Message handling for manual sync triggers
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_SCORES') {
    processPendingQueue()
      .then(() => {
        event.ports[0]?.postMessage({ success: true });
      })
      .catch((error) => {
        event.ports[0]?.postMessage({ success: false, error: error.message });
      });
  }
});