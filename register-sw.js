// 注册Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('Service Worker 注册成功:', registration);
            
            // 检查更新
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('Service Worker 更新发现:', newWorker);
                
                newWorker.addEventListener('statechange', () => {
                    console.log('Service Worker 状态变化:', newWorker.state);
                    
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // 新版本已安装，提示用户刷新
                        showUpdateNotification();
                    }
                });
            });
            
            // 监听Service Worker消息
            navigator.serviceWorker.addEventListener('message', (event) => {
                console.log('收到Service Worker消息:', event.data);
            });
            
        } catch (error) {
            console.error('Service Worker 注册失败:', error);
        }
    });
    
    // 监听网络状态
    window.addEventListener('online', () => {
        console.log('网络已连接');
        showNotification('网络连接已恢复', 'success');
    });
    
    window.addEventListener('offline', () => {
        console.log('网络已断开');
        showNotification('网络连接已断开', 'warning');
    });
}

// 显示更新通知
function showUpdateNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('光影分享更新', {
            body: '新版本已准备就绪，点击刷新页面',
            icon: '/icon-192x192.png',
            tag: 'update'
        });
        
        notification.onclick = () => {
            window.location.reload();
        };
    } else {
        // 使用自定义通知
        const updateDiv = document.createElement('div');
        updateDiv.className = 'update-notification';
        updateDiv.innerHTML = `
            <div class="update-content">
                <i class="fas fa-sync-alt"></i>
                <div>
                    <h4>新版本可用</h4>
                    <p>点击刷新以获取最新功能</p>
                </div>
                <button class="btn btn-primary btn-small" id="refresh-btn">刷新</button>
            </div>
        `;
        
        document.body.appendChild(updateDiv);
        
        document.getElementById('refresh-btn').addEventListener('click', () => {
            window.location.reload();
        });
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .update-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-lg);
                padding: 16px;
                box-shadow: var(--shadow-xl);
                z-index: 10000;
                max-width: 350px;
                animation: slideUp 0.3s ease;
            }
            
            .update-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .update-content i {
                font-size: 1.5rem;
                color: var(--accent-primary);
            }
            
            .update-content h4 {
                margin: 0 0 4px 0;
                font-size: 1rem;
            }
            
            .update-content p {
                margin: 0;
                font-size: 0.875rem;
                color: var(--text-secondary);
            }
            
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// 显示通知函数
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container') || createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <div class="notification-content">
            <h4>${getNotificationTitle(type)}</h4>
            <p>${message}</p>
        </div>
    `;
    
    container.appendChild(notification);
    
    // 自动移除
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getNotificationTitle(type) {
    const titles = {
        'success': '成功',
        'error': '错误',
        'warning': '警告',
        'info': '提示'
    };
    return titles[type] || '提示';
}

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    document.body.appendChild(container);
    return container;
}

// 请求通知权限
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            console.log('通知权限:', permission);
        });
    }
}

// 发送Web推送通知（使用Supabase Edge Functions）
async function sendWebNotification(title, body, data = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        
        registration.showNotification(title, {
            body,
            icon: '/icon-192x192.png',
            badge: '/icon-96x96.png',
            data,
            actions: [
                {
                    action: 'view',
                    title: '查看'
                },
                {
                    action: 'close',
                    title: '关闭'
                }
            ]
        });
    } else {
        // 回退到自定义通知
        showNotification(body, 'info');
    }
}

// 导出函数供其他模块使用
window.notificationUtils = {
    showNotification,
    requestNotificationPermission,
    sendWebNotification
};

// 页面加载时请求通知权限
document.addEventListener('DOMContentLoaded', () => {
    requestNotificationPermission();
});