// 服务工作者（Service Worker） - 纯Supabase实现
const CACHE_NAME = 'photo-share-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/auth.js',
  '/config.js',
  '/utils.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap'
];

// 安装Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 安装中...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 缓存核心文件');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] 安装完成');
        return self.skipWaiting();
      })
  );
});

// 激活Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 激活中...');
  
  // 清理旧缓存
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] 激活完成');
      return self.clients.claim();
    })
  );
});

// 获取请求（缓存优先策略）
self.addEventListener('fetch', (event) => {
  // 跳过非GET请求
  if (event.request.method !== 'GET') return;
  
  // 跳过API请求，实时获取
  const url = new URL(event.request.url);
  if (url.hostname.includes('supabase.co') || 
      url.hostname.includes('cloudinary.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('cdnjs.cloudflare.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // 如果缓存中有，返回缓存
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // 否则从网络获取
        return fetch(event.request)
          .then((response) => {
            // 检查响应是否有效
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 克隆响应以进行缓存
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // 网络失败时，返回离线页面
            if (event.request.destination === 'document') {
              return caches.match('/offline.html');
            }
            return null;
          });
      })
  );
});

// 监听通知点击（使用Web Push API）
self.addEventListener('push', (event) => {
  console.log('[Service Worker] 收到推送消息');
  
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const title = data.title || '光影分享';
    const options = {
      body: data.body || '您有新的消息',
      icon: data.icon || '/icon-192x192.png',
      badge: '/icon-96x96.png',
      tag: data.tag || 'general',
      data: data.data || {},
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || []
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('解析推送数据失败:', error);
    
    // 如果无法解析JSON，尝试作为文本处理
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('光影分享', {
        body: text || '您有新的消息',
        icon: '/icon-192x192.png'
      })
    );
  }
});

// 监听通知点击
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] 通知被点击:', event.notification.tag);
  
  // 关闭通知
  event.notification.close();
  
  // 处理通知点击
  const notificationData = event.notification.data || {};
  let urlToOpen = '/';
  
  if (notificationData.url) {
    urlToOpen = notificationData.url;
  } else if (notificationData.photoId) {
    urlToOpen = `/?photo=${notificationData.photoId}`;
  } else if (notificationData.userId) {
    urlToOpen = `/profile.html?user=${notificationData.userId}`;
  }
  
  // 打开或聚焦对应的窗口
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // 查找已打开的窗口
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // 如果没有找到，打开新窗口
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// 监听消息（与主线程通信）
self.addEventListener('message', (event) => {
  console.log('[Service Worker] 收到消息:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'UPDATE_CACHE') {
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(event.data.urls || []);
      })
      .then(() => {
        event.ports[0].postMessage({ success: true });
      })
      .catch((error) => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
  }
});

// 后台同步（用于离线数据同步）
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] 后台同步:', event.tag);
  
  if (event.tag === 'sync-offline-photos') {
    event.waitUntil(syncOfflinePhotos());
  }
});

async function syncOfflinePhotos() {
  console.log('[Service Worker] 同步离线照片数据');
  
  try {
    // 从IndexedDB获取离线照片
    const offlinePhotos = await getOfflinePhotos();
    
    if (offlinePhotos.length === 0) {
      console.log('[Service Worker] 没有离线照片需要同步');
      return;
    }
    
    console.log(`[Service Worker] 需要同步 ${offlinePhotos.length} 张照片`);
    
    // 这里可以实现上传离线照片的逻辑
    // 注意：需要用户登录后才能同步
    
  } catch (error) {
    console.error('[Service Worker] 同步失败:', error);
  }
}

async function getOfflinePhotos() {
  // 这里可以从IndexedDB获取缓存的离线照片
  return [];
}

// 定期清理旧缓存
self.addEventListener('periodicsync', (event) => {
  console.log('[Service Worker] 定期后台任务:', event.tag);
  
  if (event.tag === 'cleanup-cache') {
    event.waitUntil(cleanupOldCache());
  }
});

async function cleanupOldCache() {
  console.log('[Service Worker] 清理旧缓存');
  
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const date = response.headers.get('date');
        if (date && new Date(date).getTime() < weekAgo) {
          await cache.delete(request);
          console.log(`[Service Worker] 删除旧缓存: ${request.url}`);
        }
      }
    }
  } catch (error) {
    console.error('[Service Worker] 缓存清理失败:', error);
  }
}