/**
 * 应用程序主模块
 * 整合所有模块，处理全局事件和应用初始化
 */

// 应用状态
let appState = {
    isInitialized: false,
    isLoading: false,
    currentPage: 'home',
    isMobile: false,
    isOnline: true,
    theme: 'dark'
};

// 初始化应用程序
async function initApp() {
    console.log('正在初始化应用程序...');
    
    if (appState.isLoading || appState.isInitialized) {
        console.log('应用程序已经在初始化或已初始化');
        return;
    }
    
    appState.isLoading = true;
    
    try {
        // 1. 检测设备类型
        detectDeviceType();
        
        // 2. 检测网络状态
        setupNetworkDetection();
        
        // 3. 设置全局事件监听器
        setupGlobalEventListeners();
        
        // 4. 初始化所有模块
        await initializeAllModules();
        
        // 5. 设置主题
        setupTheme();
        
        // 6. 设置服务工作者（用于PWA）
        setupServiceWorker();
        
        // 7. 检查更新
        checkForUpdates();
        
        appState.isInitialized = true;
        appState.isLoading = false;
        
        console.log('应用程序初始化完成');
        
        // 显示欢迎消息
        setTimeout(() => {
            showWelcomeMessage();
        }, 2000);
        
    } catch (error) {
        console.error('应用程序初始化错误:', error);
        appState.isLoading = false;
        showError('应用程序初始化失败，请刷新页面重试。');
    }
}

// 检测设备类型
function detectDeviceType() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    appState.isMobile = isMobile;
    
    // 添加设备类到body
    if (isMobile) {
        document.body.classList.add('mobile-device');
    } else {
        document.body.classList.add('desktop-device');
    }
    
    console.log(`设备类型: ${isMobile ? '移动设备' : '桌面设备'}`);
}

// 设置网络检测
function setupNetworkDetection() {
    // 初始检测
    appState.isOnline = navigator.onLine;
    
    // 在线事件
    window.addEventListener('online', () => {
        appState.isOnline = true;
        showNotification('网络已恢复', 'success');
        console.log('网络状态: 在线');
    });
    
    // 离线事件
    window.addEventListener('offline', () => {
        appState.isOnline = false;
        showNotification('网络已断开，部分功能可能不可用', 'warning');
        console.log('网络状态: 离线');
    });
    
    // 更新网络状态显示
    updateNetworkStatus();
}

// 更新网络状态显示
function updateNetworkStatus() {
    const networkStatus = document.getElementById('networkStatus');
    if (!networkStatus) {
        // 创建网络状态指示器
        const statusDiv = document.createElement('div');
        statusDiv.id = 'networkStatus';
        statusDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 9999;
            display: none;
            background: var(--surface-color);
            border: 1px solid var(--border-color);
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(statusDiv);
    }
    
    const statusElement = document.getElementById('networkStatus');
    if (statusElement) {
        if (!appState.isOnline) {
            statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> 离线模式';
            statusElement.style.display = 'block';
            statusElement.style.color = 'var(--error-color)';
        } else {
            statusElement.style.display = 'none';
        }
    }
}

// 设置全局事件监听器
function setupGlobalEventListeners() {
    console.log('设置全局事件监听器...');
    
    // 1. 导航链接点击事件
    setupNavigationEvents();
    
    // 2. 认证按钮事件
    setupAuthButtonEvents();
    
    // 3. 模态框事件
    setupModalEvents();
    
    // 4. 键盘快捷键
    setupKeyboardShortcuts();
    
    // 5. 页面可见性变化
    setupPageVisibility();
    
    // 6. 错误处理
    setupErrorHandling();
    
    // 7. 图片错误处理
    setupImageErrorHandling();
    
    console.log('全局事件监听器设置完成');
}

// 设置导航事件
function setupNavigationEvents() {
    // 首页链接
    const homeLink = document.getElementById('homeLink');
    if (homeLink) {
        homeLink.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('home');
        });
    }
    
    // 上传链接
    const uploadLink = document.getElementById('uploadLink');
    if (uploadLink) {
        uploadLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.auth && window.auth.isAuthenticated()) {
                showUploadModal();
            } else {
                showNotification('请先登录后再上传照片', 'warning');
                showAuthModal();
            }
        });
    }
    
    // 关于我们链接
    const aboutLink = document.getElementById('aboutLink');
    if (aboutLink) {
        aboutLink.addEventListener('click', (e) => {
            e.preventDefault();
            showAboutModal();
        });
    }
    
    // 联系我们链接
    const contactLink = document.getElementById('contactLink');
    if (contactLink) {
        contactLink.addEventListener('click', (e) => {
            e.preventDefault();
            showContactModal();
        });
    }
    
    // 隐私政策链接
    const privacyLink = document.getElementById('privacyLink');
    if (privacyLink) {
        privacyLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPrivacyModal();
        });
    }
    
    // 服务条款链接
    const termsLink = document.getElementById('termsLink');
    if (termsLink) {
        termsLink.addEventListener('click', (e) => {
            e.preventDefault();
            showTermsModal();
        });
    }
}

// 导航到页面
function navigateTo(page) {
    if (appState.currentPage === page) return;
    
    appState.currentPage = page;
    
    // 更新导航链接状态
    updateNavigationState(page);
    
    // 执行页面特定的操作
    switch (page) {
        case 'home':
            // 主页已经显示
            break;
        // 可以添加其他页面的导航逻辑
    }
    
    // 如果是移动设备，关闭菜单
    if (appState.isMobile) {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            navLinks.classList.remove('active');
        }
    }
    
    console.log(`导航到: ${page}`);
}

// 更新导航状态
function updateNavigationState(page) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`[data-page="${page}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

// 设置认证按钮事件
function setupAuthButtonEvents() {
    // 登录按钮
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            showAuthModal('login');
        });
    }
    
    // 注册按钮
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            showAuthModal('register');
        });
    }
    
    // 退出登录按钮
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await logoutUser();
        });
    }
    
    // 认证表单提交
    const submitLogin = document.getElementById('submitLogin');
    if (submitLogin) {
        submitLogin.addEventListener('click', async () => {
            await handleLoginSubmit();
        });
    }
    
    const submitRegister = document.getElementById('submitRegister');
    if (submitRegister) {
        submitRegister.addEventListener('click', async () => {
            await handleRegisterSubmit();
        });
    }
    
    // 认证标签切换
    const authTabs = document.querySelectorAll('.tab-btn');
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            switchAuthTab(tabName);
        });
    });
}

// 显示认证模态框
function showAuthModal(defaultTab = 'login') {
    const authModal = document.getElementById('authModal');
    if (!authModal) return;
    
    // 重置表单
    resetAuthForms();
    
    // 切换到指定标签
    switchAuthTab(defaultTab);
    
    // 显示模态框
    authModal.style.display = 'flex';
}

// 切换认证标签
function switchAuthTab(tabName) {
    const tabs = document.querySelectorAll('.tab-btn');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    forms.forEach(form => {
        if (form.id === `${tabName}Form`) {
            form.classList.add('active');
        } else {
            form.classList.remove('active');
        }
    });
}

// 重置认证表单
function resetAuthForms() {
    // 登录表单
    const loginIdentifier = document.getElementById('loginIdentifier');
    const loginPassword = document.getElementById('loginPassword');
    const loginError = document.getElementById('loginError');
    
    if (loginIdentifier) loginIdentifier.value = '';
    if (loginPassword) loginPassword.value = '';
    if (loginError) loginError.textContent = '';
    
    // 注册表单
    const registerUsername = document.getElementById('registerUsername');
    const registerEmail = document.getElementById('registerEmail');
    const registerPassword = document.getElementById('registerPassword');
    const registerError = document.getElementById('registerError');
    
    if (registerUsername) registerUsername.value = '';
    if (registerEmail) registerEmail.value = '';
    if (registerPassword) registerPassword.value = '';
    if (registerError) registerError.textContent = '';
}

// 处理登录提交
async function handleLoginSubmit() {
    const identifier = document.getElementById('loginIdentifier')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value?.trim();
    const errorElement = document.getElementById('loginError');
    
    // 验证输入
    if (!identifier || !password) {
        if (errorElement) {
            errorElement.textContent = '请输入用户名/邮箱和密码';
        }
        return;
    }
    
    try {
        // 调用认证模块的登录函数
        const result = await window.auth?.login({ identifier, password });
        
        if (result?.success) {
            // 关闭模态框
            const authModal = document.getElementById('authModal');
            if (authModal) {
                authModal.style.display = 'none';
            }
            
            // 显示成功消息
            showNotification('登录成功！', 'success');
            
        } else {
            throw new Error('登录失败');
        }
        
    } catch (error) {
        console.error('登录错误:', error);
        if (errorElement) {
            errorElement.textContent = error.message || '登录失败，请检查用户名/邮箱和密码';
        }
    }
}

// 处理注册提交
async function handleRegisterSubmit() {
    const username = document.getElementById('registerUsername')?.value?.trim();
    const email = document.getElementById('registerEmail')?.value?.trim();
    const password = document.getElementById('registerPassword')?.value?.trim();
    const errorElement = document.getElementById('registerError');
    
    // 验证输入
    if (!username || !password) {
        if (errorElement) {
            errorElement.textContent = '请输入用户名和密码';
        }
        return;
    }
    
    if (username.length < 3) {
        if (errorElement) {
            errorElement.textContent = '用户名至少需要3个字符';
        }
        return;
    }
    
    if (password.length < 6) {
        if (errorElement) {
            errorElement.textContent = '密码至少需要6个字符';
        }
        return;
    }
    
    try {
        // 调用认证模块的注册函数
        const result = await window.auth?.register({ username, email, password });
        
        if (result?.success) {
            // 关闭模态框
            const authModal = document.getElementById('authModal');
            if (authModal) {
                authModal.style.display = 'none';
            }
            
            // 显示成功消息
            showNotification(result.message || '注册成功！', 'success');
            
        } else {
            throw new Error('注册失败');
        }
        
    } catch (error) {
        console.error('注册错误:', error);
        if (errorElement) {
            errorElement.textContent = error.message || '注册失败，请稍后重试';
        }
    }
}

// 退出登录用户
async function logoutUser() {
    try {
        await window.auth?.logout();
        showNotification('已退出登录', 'info');
    } catch (error) {
        console.error('退出登录错误:', error);
        showNotification('退出登录失败', 'error');
    }
}

// 设置模态框事件
function setupModalEvents() {
    // 所有关闭按钮
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // 点击模态框背景关闭
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // ESC键关闭模态框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal[style*="display: flex"]');
            openModals.forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}

// 设置键盘快捷键
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // 忽略在输入框中的快捷键
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Ctrl + / 显示快捷键帮助
        if (e.ctrlKey && e.key === '/') {
            e.preventDefault();
            showKeyboardShortcutsHelp();
        }
        
        // Ctrl + F 聚焦搜索框
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }
        
        // Ctrl + U 显示上传模态框
        if (e.ctrlKey && e.key === 'u') {
            e.preventDefault();
            if (window.auth && window.auth.isAuthenticated()) {
                showUploadModal();
            } else {
                showNotification('请先登录后再上传照片', 'warning');
                showAuthModal();
            }
        }
        
        // ? 键显示帮助
        if (e.key === '?') {
            showKeyboardShortcutsHelp();
        }
    });
}

// 显示键盘快捷键帮助
function showKeyboardShortcutsHelp() {
    const modal = document.createElement('div');
    modal.className = 'modal shortcuts-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h3><i class="fas fa-keyboard"></i> 键盘快捷键</h3>
            
            <div class="shortcuts-list">
                <div class="shortcut-item">
                    <span class="shortcut-keys"><kbd>Ctrl</kbd> + <kbd>F</kbd></span>
                    <span class="shortcut-description">聚焦搜索框</span>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-keys"><kbd>Ctrl</kbd> + <kbd>U</kbd></span>
                    <span class="shortcut-description">上传照片</span>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-keys"><kbd>Ctrl</kbd> + <kbd>/</kbd></span>
                    <span class="shortcut-description">显示快捷键帮助</span>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-keys"><kbd>ESC</kbd></span>
                    <span class="shortcut-description">关闭模态框</span>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-keys"><kbd>?</kbd></span>
                    <span class="shortcut-description">显示帮助</span>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-keys"><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd></span>
                    <span class="shortcut-description">管理员面板（仅管理员）</span>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // 关闭按钮
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
    }
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 设置页面可见性变化
function setupPageVisibility() {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('页面不可见');
            // 页面隐藏时的处理
        } else {
            console.log('页面可见');
            // 页面重新显示时的处理
            updateFeedIfNeeded();
        }
    });
}

// 更新动态（如果需要）
function updateFeedIfNeeded() {
    // 如果页面隐藏超过5分钟，刷新动态
    if (window.feed && typeof window.feed.refreshFeed === 'function') {
        const lastUpdate = window.feed.getState?.()?.lastLoadTime;
        if (lastUpdate) {
            const now = new Date();
            const timeDiff = now - new Date(lastUpdate);
            const fiveMinutes = 5 * 60 * 1000;
            
            if (timeDiff > fiveMinutes) {
                window.feed.refreshFeed();
            }
        }
    }
}

// 设置错误处理
function setupErrorHandling() {
    // 全局错误处理
    window.addEventListener('error', (event) => {
        console.error('全局错误:', event.error);
        // 可以在这里发送错误到服务器
    });
    
    // Promise拒绝处理
    window.addEventListener('unhandledrejection', (event) => {
        console.error('未处理的Promise拒绝:', event.reason);
        // 可以在这里发送错误到服务器
    });
}

// 设置图片错误处理
function setupImageErrorHandling() {
    document.addEventListener('error', (e) => {
        if (e.target.tagName === 'IMG') {
            console.warn('图片加载失败:', e.target.src);
            
            // 替换为默认图片
            if (!e.target.hasAttribute('data-error-handled')) {
                e.target.setAttribute('data-error-handled', 'true');
                
                // 如果是头像，使用默认头像
                if (e.target.classList.contains('avatar-sm') || 
                    e.target.classList.contains('avatar-md') || 
                    e.target.classList.contains('avatar-lg')) {
                    const name = e.target.alt || 'User';
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=bb86fc&color=fff`;
                }
                // 如果是照片缩略图
                else if (e.target.classList.contains('image-thumbnail') || 
                         e.target.classList.contains('profile-image')) {
                    e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231e1e1e"/><text x="50" y="50" font-family="Arial" font-size="12" fill="%23888" text-anchor="middle" dy=".3em">图片加载失败</text></svg>';
                }
            }
        }
    }, true);
}

// 初始化所有模块
async function initializeAllModules() {
    console.log('初始化所有模块...');
    
    // 模块初始化顺序
    const modules = [
        { name: 'Supabase', init: () => window.supabaseFunctions?.finalizeSetup?.() },
        { name: '认证模块', init: () => window.auth?.init?.() },
        { name: '动态流模块', init: () => window.feed?.init?.() },
        { name: '上传模块', init: () => window.upload?.init?.() },
        { name: '个人主页模块', init: () => window.profile?.init?.() },
        { name: '管理员模块', init: () => window.admin?.init?.() }
    ];
    
    for (const module of modules) {
        try {
            console.log(`正在初始化 ${module.name}...`);
            if (typeof module.init === 'function') {
                await module.init();
                console.log(`${module.name} 初始化完成`);
            }
        } catch (error) {
            console.error(`${module.name} 初始化错误:`, error);
        }
    }
    
    console.log('所有模块初始化完成');
}

// 设置主题
function setupTheme() {
    // 从本地存储获取主题偏好
    const savedTheme = localStorage.getItem('theme') || 'dark';
    appState.theme = savedTheme;
    
    // 应用主题
    applyTheme(savedTheme);
    
    // 添加主题切换按钮
    addThemeToggleButton();
}

// 应用主题
function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    appState.theme = theme;
    
    console.log(`应用主题: ${theme}`);
}

// 添加主题切换按钮
function addThemeToggleButton() {
    // 检查是否已存在主题切换按钮
    if (document.getElementById('themeToggleBtn')) return;
    
    // 创建主题切换按钮
    const themeBtn = document.createElement('button');
    themeBtn.id = 'themeToggleBtn';
    themeBtn.className = 'btn btn-outline btn-sm theme-toggle';
    themeBtn.innerHTML = appState.theme === 'dark' ? 
        '<i class="fas fa-sun"></i>' : 
        '<i class="fas fa-moon"></i>';
    themeBtn.title = appState.theme === 'dark' ? '切换到浅色主题' : '切换到深色主题';
    
    themeBtn.style.cssText = `
        margin-left: 10px;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
    `;
    
    // 添加到导航栏
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        // 插入到用户菜单之前
        const userMenu = navLinks.querySelector('.user-menu');
        if (userMenu) {
            navLinks.insertBefore(themeBtn, userMenu);
        } else {
            navLinks.appendChild(themeBtn);
        }
    }
    
    // 添加点击事件
    themeBtn.addEventListener('click', () => {
        const newTheme = appState.theme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
        
        // 更新按钮图标
        themeBtn.innerHTML = newTheme === 'dark' ? 
            '<i class="fas fa-sun"></i>' : 
            '<i class="fas fa-moon"></i>';
        themeBtn.title = newTheme === 'dark' ? '切换到浅色主题' : '切换到深色主题';
        
        showNotification(`已切换到${newTheme === 'dark' ? '深色' : '浅色'}主题`, 'info');
    });
}

// 设置服务工作者（PWA支持）
function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then(registration => {
                console.log('ServiceWorker 注册成功:', registration.scope);
            }).catch(error => {
                console.log('ServiceWorker 注册失败:', error);
            });
        });
    }
}

// 检查更新
function checkForUpdates() {
    // 这里可以实现检查应用更新的逻辑
    // 例如：比较版本号、检查是否有新版本等
    console.log('检查更新...');
    
    // 可以设置定期检查
    setInterval(() => {
        // 检查更新逻辑
    }, 24 * 60 * 60 * 1000); // 每天检查一次
}

// 显示欢迎消息
function showWelcomeMessage() {
    // 检查是否已显示过欢迎消息
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome && window.auth && !window.auth.isAuthenticated()) {
        setTimeout(() => {
            showNotification('欢迎来到光影分享！开始探索精彩照片吧！', 'info');
            localStorage.setItem('hasSeenWelcome', 'true');
        }, 3000);
    }
}

// 显示上传模态框
function showUploadModal() {
    if (window.upload && typeof window.upload.showModal === 'function') {
        window.upload.showModal();
    }
}

// 显示关于我们模态框
function showAboutModal() {
    const modal = document.createElement('div');
    modal.className = 'modal about-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h3><i class="fas fa-info-circle"></i> 关于光影分享</h3>
            
            <div class="about-content">
                <p>光影分享是一个专业的照片分享平台，让每个人都能展示自己的摄影作品，发现世界的美好。</p>
                
                <div class="features-list">
                    <h4>主要功能：</h4>
                    <ul>
                        <li><i class="fas fa-camera"></i> 高质量照片上传和展示</li>
                        <li><i class="fas fa-search"></i> 智能关键词搜索</li>
                        <li><i class="fas fa-heart"></i> 点赞和评论互动</li>
                        <li><i class="fas fa-users"></i> 关注系统和用户主页</li>
                        <li><i class="fas fa-shield-alt"></i> 安全的内容管理</li>
                        <li><i class="fas fa-mobile-alt"></i> 响应式设计，支持手机和电脑</li>
                    </ul>
                </div>
                
                <div class="version-info">
                    <p><strong>版本:</strong> 1.0.0</p>
                    <p><strong>最后更新:</strong> 2024年1月</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // 关闭按钮
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
    }
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 显示联系我们模态框
function showContactModal() {
    const modal = document.createElement('div');
    modal.className = 'modal contact-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h3><i class="fas fa-envelope"></i> 联系我们</h3>
            
            <div class="contact-content">
                <p>如果您有任何问题、建议或反馈，请通过以下方式联系我们：</p>
                
                <div class="contact-methods">
                    <div class="contact-method">
                        <i class="fas fa-envelope"></i>
                        <div>
                            <h4>邮箱</h4>
                            <p>support@photosha.re</p>
                        </div>
                    </div>
                    
                    <div class="contact-method">
                        <i class="fas fa-comments"></i>
                        <div>
                            <h4>反馈系统</h4>
                            <p>使用应用内的反馈功能</p>
                            <button class="btn btn-outline btn-sm" id="openFeedbackBtn">
                                <i class="fas fa-comment-alt"></i> 打开反馈
                            </button>
                        </div>
                    </div>
                    
                    <div class="contact-method">
                        <i class="fas fa-question-circle"></i>
                        <div>
                            <h4>帮助中心</h4>
                            <p>查看常见问题和帮助文档</p>
                        </div>
                    </div>
                </div>
                
                <div class="response-time">
                    <p><i class="fas fa-clock"></i> 我们会在24小时内回复您的消息</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // 关闭按钮
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
    }
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // 打开反馈按钮
    const feedbackBtn = modal.querySelector('#openFeedbackBtn');
    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', () => {
            modal.remove();
            if (window.profile && typeof window.profile.showFeedbackModal === 'function') {
                window.profile.showFeedbackModal();
            }
        });
    }
}

// 显示隐私政策模态框
function showPrivacyModal() {
    const modal = document.createElement('div');
    modal.className = 'modal privacy-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h3><i class="fas fa-shield-alt"></i> 隐私政策</h3>
            
            <div class="privacy-content">
                <div class="privacy-section">
                    <h4>1. 信息收集</h4>
                    <p>我们收集您在使用光影分享时提供的信息，包括：</p>
                    <ul>
                        <li>注册信息（用户名、邮箱）</li>
                        <li>上传的照片和元数据（关键词、描述）</li>
                        <li>互动数据（点赞、评论、关注）</li>
                        <li>设备信息和使用数据</li>
                    </ul>
                </div>
                
                <div class="privacy-section">
                    <h4>2. 信息使用</h4>
                    <p>我们使用收集的信息来：</p>
                    <ul>
                        <li>提供和改进我们的服务</li>
                        <li>个性化用户体验</li>
                        <li>确保平台安全和合规</li>
                        <li>与用户沟通重要更新</li>
                    </ul>
                </div>
                
                <div class="privacy-section">
                    <h4>3. 信息共享</h4>
                    <p>我们不会出售您的个人信息。我们只在以下情况下共享信息：</p>
                    <ul>
                        <li>获得您的明确同意</li>
                        <li>遵守法律要求</li>
                        <li>保护用户和平台的安全</li>
                        <li>与处理数据服务的供应商（如Cloudinary）共享</li>
                    </ul>
                </div>
                
                <div class="privacy-section">
                    <h4>4. 数据安全</h4>
                    <p>我们采取合理的安全措施保护您的信息，但无法保证绝对安全。</p>
                </div>
                
                <div class="privacy-section">
                    <h4>5. 您的权利</h4>
                    <p>您可以：</p>
                    <ul>
                        <li>访问和更新您的个人信息</li>
                        <li>删除您的账户和数据</li>
                        <li>导出您的数据</li>
                        <li>联系我们处理隐私相关问题</li>
                    </ul>
                </div>
                
                <div class="privacy-update">
                    <p><strong>最后更新：</strong>2024年1月</p>
                    <p>我们可能会不时更新此隐私政策，更新后会在平台上通知您。</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // 关闭按钮
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
    }
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 显示服务条款模态框
function showTermsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal terms-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h3><i class="fas fa-file-contract"></i> 服务条款</h3>
            
            <div class="terms-content">
                <div class="terms-section">
                    <h4>1. 接受条款</h4>
                    <p>使用光影分享即表示您接受这些服务条款。如果您不同意，请不要使用我们的服务。</p>
                </div>
                
                <div class="terms-section">
                    <h4>2. 用户责任</h4>
                    <p>您同意：</p>
                    <ul>
                        <li>提供准确的信息</li>
                        <li>保护您的账户安全</li>
                        <li>不违反任何法律法规</li>
                        <li>不上传侵权、非法或有害内容</li>
                        <li>尊重其他用户的权利</li>
                    </ul>
                </div>
                
                <div class="terms-section">
                    <h4>3. 内容所有权</h4>
                    <p>您保留上传内容的所有权。通过上传内容，您授予我们展示和分发这些内容的许可。</p>
                </div>
                
                <div class="terms-section">
                    <h4>4. 服务可用性</h4>
                    <p>我们尽力保持服务可用，但不对中断或错误负责。</p>
                </div>
                
                <div class="terms-section">
                    <h4>5. 终止</h4>
                    <p>我们可以因违反条款而终止或暂停您的账户。</p>
                </div>
                
                <div class="terms-section">
                    <h4>6. 免责声明</h4>
                    <p>服务按"原样"提供，我们不提供任何保证。</p>
                </div>
                
                <div class="terms-section">
                    <h4>7. 法律适用</h4>
                    <p>这些条款受适用法律管辖。</p>
                </div>
                
                <div class="terms-update">
                    <p><strong>最后更新：</strong>2024年1月</p>
                    <p>我们可能会更新这些条款，重要更改会通知您。</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // 关闭按钮
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
    }
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 显示通知
function showNotification(message, type = 'info') {
    // 使用系统的通知功能
    if (window.feed && typeof window.feed.showNotification === 'function') {
        window.feed.showNotification(message, type);
    } else if (window.upload && typeof window.upload.showNotification === 'function') {
        window.upload.showNotification(message, type);
    } else {
        // 简单的控制台日志
        console.log(`${type}: ${message}`);
        
        // 或者创建一个简单的通知
        const notification = document.createElement('div');
        notification.className = `simple-notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 4px;
            background: ${type === 'error' ? 'var(--error-color)' : 
                        type === 'success' ? 'var(--primary-color)' : 
                        type === 'warning' ? '#ffa726' : 'var(--surface-color)'};
            color: white;
            z-index: 9999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // 自动消失
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 5000);
    }
}

// 显示错误
function showError(message) {
    showNotification(message, 'error');
}

// 获取应用状态
function getAppState() {
    return { ...appState };
}

// 添加CSS动画
function addAppStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }
        
        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
            }
        }
        
        .simple-notification {
            transition: all 0.3s ease;
        }
        
        .mobile-device .desktop-only {
            display: none !important;
        }
        
        .desktop-device .mobile-only {
            display: none !important;
        }
        
        /* 深色主题变量 */
        [data-theme="dark"] {
            --background-color: #121212;
            --surface-color: #1e1e1e;
            --on-background: #ffffff;
            --on-surface: #ffffff;
        }
        
        /* 浅色主题变量 */
        [data-theme="light"] {
            --background-color: #f5f5f5;
            --surface-color: #ffffff;
            --on-background: #000000;
            --on-surface: #000000;
            --border-color: #e0e0e0;
            --hover-color: #f0f0f0;
        }
        
        .theme-toggle:hover {
            background: rgba(187, 134, 252, 0.1);
        }
        
        .shortcuts-modal .modal-content {
            max-width: 500px;
        }
        
        .shortcuts-list {
            margin: 20px 0;
        }
        
        .shortcut-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid var(--border-color);
        }
        
        .shortcut-item:last-child {
            border-bottom: none;
        }
        
        .shortcut-keys kbd {
            background: var(--surface-color);
            border: 1px solid var(--border-color);
            border-radius: 3px;
            padding: 2px 6px;
            font-size: 12px;
            font-family: monospace;
            margin: 0 2px;
            box-shadow: 0 1px 1px rgba(0,0,0,0.1);
        }
        
        .shortcut-description {
            color: var(--on-surface);
        }
        
        .about-content, .contact-content, .privacy-content, .terms-content {
            max-height: 60vh;
            overflow-y: auto;
            padding-right: 10px;
        }
        
        .about-content::-webkit-scrollbar,
        .contact-content::-webkit-scrollbar,
        .privacy-content::-webkit-scrollbar,
        .terms-content::-webkit-scrollbar {
            width: 6px;
        }
        
        .about-content::-webkit-scrollbar-track,
        .contact-content::-webkit-scrollbar-track,
        .privacy-content::-webkit-scrollbar-track,
        .terms-content::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
        }
        
        .about-content::-webkit-scrollbar-thumb,
        .contact-content::-webkit-scrollbar-thumb,
        .privacy-content::-webkit-scrollbar-thumb,
        .terms-content::-webkit-scrollbar-thumb {
            background: var(--primary-color);
        }
        
        .features-list, .contact-methods, .privacy-section, .terms-section {
            margin: 20px 0;
        }
        
        .features-list ul, .privacy-section ul, .terms-section ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        
        .features-list li, .privacy-section li, .terms-section li {
            margin: 5px 0;
        }
        
        .contact-method {
            display: flex;
            align-items: center;
            gap: 15px;
            margin: 15px 0;
            padding: 15px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
        }
        
        .contact-method i {
            font-size: 24px;
            color: var(--primary-color);
        }
        
        .response-time {
            margin-top: 20px;
            padding: 10px;
            background: rgba(187, 134, 252, 0.1);
            border-radius: 4px;
            border-left: 3px solid var(--primary-color);
        }
        
        .version-info, .privacy-update, .terms-update {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid var(--border-color);
            color: #888;
        }
    `;
    document.head.appendChild(style);
}

// 导出应用模块
window.app = {
    init: initApp,
    showNotification,
    showError,
    getState: getAppState,
    navigateTo,
    showAuthModal,
    showUploadModal
};

// 自动初始化应用程序
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM已加载，开始初始化应用程序...');
    
    // 添加CSS样式
    addAppStyles();
    
    // 延迟初始化，确保其他资源加载
    setTimeout(() => {
        initApp();
    }, 100);
    
    // 移动端菜单按钮
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            const navLinks = document.querySelector('.nav-links');
            if (navLinks) {
                navLinks.classList.toggle('active');
            }
        });
    }
});

console.log('应用程序主模块加载完成');