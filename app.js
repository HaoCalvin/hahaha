// 照片分享应用主逻辑 - 无Firebase版本
import { supabase, cloudinaryConfig, ADMIN_EMAIL, APP_CONFIG } from './config.js';
import { showNotification, showLoading, hideLoading, escapeHtml, debounce } from './utils.js';
import { authManager } from './auth.js';

// 应用状态管理
class AppState {
    constructor() {
        this.currentUser = null;
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.photos = [];
        this.trendingPhotos = [];
        this.latestPhotos = [];
        this.users = [];
        this.currentPhotoDetail = null;
        this.realtimeSubscriptions = [];
    }

    setUser(user) {
        this.currentUser = user;
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }

    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        
        // 更新主题按钮图标
        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            const icon = themeBtn.querySelector('i');
            if (theme === 'dark') {
                icon.className = 'fas fa-moon';
            } else if (theme === 'light') {
                icon.className = 'fas fa-sun';
            } else {
                icon.className = 'fas fa-adjust';
            }
        }
    }

    toggleTheme() {
        const themes = ['dark', 'light', 'white'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.setTheme(themes[nextIndex]);
    }

    // 初始化实时订阅
    async initRealtimeSubscriptions() {
        if (!this.currentUser) return;

        try {
            // 订阅照片更新
            const photosChannel = supabase
                .channel('public:photos')
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'photos' 
                    },
                    (payload) => {
                        this.handlePhotoRealtimeUpdate(payload);
                    }
                )
                .subscribe();

            // 订阅点赞更新
            const likesChannel = supabase
                .channel('public:likes')
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'likes' 
                    },
                    (payload) => {
                        this.handleLikeRealtimeUpdate(payload);
                    }
                )
                .subscribe();

            // 订阅评论更新
            const commentsChannel = supabase
                .channel('public:comments')
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'comments' 
                    },
                    (payload) => {
                        this.handleCommentRealtimeUpdate(payload);
                    }
                )
                .subscribe();

            this.realtimeSubscriptions = [photosChannel, likesChannel, commentsChannel];

        } catch (error) {
            console.error('初始化实时订阅失败:', error);
        }
    }

    // 清理实时订阅
    cleanupRealtimeSubscriptions() {
        this.realtimeSubscriptions.forEach(channel => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        });
        this.realtimeSubscriptions = [];
    }

    handlePhotoRealtimeUpdate(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        switch (eventType) {
            case 'INSERT':
                // 新照片发布，添加到最新照片列表
                if (newRecord && !newRecord.is_private) {
                    this.latestPhotos.unshift(newRecord);
                    if (this.latestPhotos.length > 12) {
                        this.latestPhotos = this.latestPhotos.slice(0, 12);
                    }
                    this.dispatchEvent('photosUpdated', { photos: this.latestPhotos });
                }
                break;
                
            case 'UPDATE':
                // 照片更新，更新相关UI
                this.dispatchEvent('photoUpdated', { photo: newRecord });
                break;
                
            case 'DELETE':
                // 照片删除，从UI中移除
                this.dispatchEvent('photoDeleted', { photoId: oldRecord.id });
                break;
        }
    }

    handleLikeRealtimeUpdate(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        switch (eventType) {
            case 'INSERT':
                // 新增点赞
                this.dispatchEvent('likeAdded', { 
                    photoId: newRecord.photo_id, 
                    userId: newRecord.user_id 
                });
                break;
                
            case 'DELETE':
                // 取消点赞
                this.dispatchEvent('likeRemoved', { 
                    photoId: oldRecord.photo_id, 
                    userId: oldRecord.user_id 
                });
                break;
        }
    }

    handleCommentRealtimeUpdate(payload) {
        const { eventType, new: newRecord } = payload;
        
        if (eventType === 'INSERT') {
            // 新增评论
            this.dispatchEvent('commentAdded', { 
                photoId: newRecord.photo_id, 
                comment: newRecord 
            });
        }
    }

    // 事件分发系统
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        window.dispatchEvent(event);
    }
}

// 初始化应用状态
const appState = new AppState();

// DOM 元素
const DOM = {
    // 导航
    navUser: document.getElementById('nav-user'),
    mobileAuthButtons: document.getElementById('mobile-auth-buttons'),
    heroButtons: document.getElementById('hero-buttons'),
    
    // 内容区域
    trendingPhotos: document.getElementById('trending-photos'),
    latestPhotos: document.getElementById('latest-photos'),
    featuredUsers: document.getElementById('featured-users'),
    
    // 模态框
    modals: {
        login: document.getElementById('login-modal'),
        signup: document.getElementById('signup-modal'),
        forgotPassword: document.getElementById('forgot-password-modal'),
        photoDetail: document.getElementById('photo-detail-modal')
    },
    
    // 表单
    forms: {
        login: document.getElementById('login-form'),
        signup: document.getElementById('signup-form'),
        forgotPassword: document.getElementById('forgot-password-form')
    },
    
    // 搜索
    globalSearch: document.getElementById('global-search'),
    searchResults: document.getElementById('search-results'),
    
    // 按钮
    themeToggle: document.getElementById('theme-toggle'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    uploadLink: document.getElementById('upload-link'),
    mobileUploadLink: document.getElementById('mobile-upload-link'),
    
    // 其他
    mobileMenu: document.getElementById('mobile-menu')
};

// 应用初始化
class PhotoShareApp {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    async init() {
        if (this.isInitialized) return;
        
        try {
            // 设置初始主题
            appState.setTheme(appState.currentTheme);
            
            // 检查用户认证状态
            await this.checkAuthentication();
            
            // 绑定事件
            this.bindEvents();
            
            // 加载初始数据
            await this.loadInitialData();
            
            // 初始化实时订阅
            this.setupRealtimeListeners();
            
            this.isInitialized = true;
            
        } catch (error) {
            console.error('应用初始化失败:', error);
            showNotification('应用初始化失败，请刷新页面', 'error');
        }
    }

    setupRealtimeListeners() {
        // 监听照片更新事件
        window.addEventListener('photosUpdated', (event) => {
            this.renderLatestPhotos(event.detail.photos);
        });
        
        window.addEventListener('photoUpdated', (event) => {
            this.updatePhotoInUI(event.detail.photo);
        });
        
        window.addEventListener('photoDeleted', (event) => {
            this.removePhotoFromUI(event.detail.photoId);
        });
        
        window.addEventListener('likeAdded', (event) => {
            this.handleLikeAdded(event.detail.photoId, event.detail.userId);
        });
        
        window.addEventListener('likeRemoved', (event) => {
            this.handleLikeRemoved(event.detail.photoId, event.detail.userId);
        });
        
        window.addEventListener('commentAdded', async (event) => {
            await this.handleCommentAdded(event.detail.photoId, event.detail.comment);
        });
    }

    async checkAuthentication() {
        const user = authManager.getCurrentUser();
        
        if (user) {
            const profile = await authManager.getUserProfile(user.id);
            appState.setUser({
                ...user,
                profile: profile || {}
            });
            
            // 初始化实时订阅
            await appState.initRealtimeSubscriptions();
            
            this.updateUIForAuthenticatedUser();
        } else {
            appState.setUser(null);
            this.updateUIForGuest();
        }
    }

    updateUIForAuthenticatedUser() {
        const user = appState.currentUser;
        
        // 更新导航栏用户区域
        if (DOM.navUser) {
            DOM.navUser.innerHTML = `
                <div class="user-dropdown">
                    <img src="${user.profile.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.profile.username || user.email)}" 
                         alt="${user.profile.username || '用户'}" 
                         class="user-avatar"
                         id="user-avatar-btn">
                    <div class="user-dropdown-menu" id="user-dropdown-menu">
                        <a href="profile.html?user=${user.id}" class="dropdown-item" data-user-id="${user.id}">
                            <i class="fas fa-user"></i>
                            <span>我的资料</span>
                        </a>
                        <a href="upload.html" class="dropdown-item">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <span>上传照片</span>
                        </a>
                        <a href="#settings" class="dropdown-item" id="settings-btn">
                            <i class="fas fa-cog"></i>
                            <span>设置</span>
                        </a>
                        ${user.profile.is_admin ? `
                            <a href="#admin" class="dropdown-item" id="admin-panel-btn">
                                <i class="fas fa-shield-alt"></i>
                                <span>管理面板</span>
                            </a>
                        ` : ''}
                        <div class="dropdown-divider"></div>
                        <a href="#logout" class="dropdown-item" id="logout-btn">
                            <i class="fas fa-sign-out-alt"></i>
                            <span>退出登录</span>
                        </a>
                    </div>
                </div>
            `;
        }
        
        // 隐藏登录/注册按钮
        if (DOM.mobileAuthButtons) {
            DOM.mobileAuthButtons.innerHTML = '';
        }
        
        if (DOM.heroButtons) {
            DOM.heroButtons.innerHTML = `
                <button class="btn btn-primary" id="hero-upload">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <span>上传照片</span>
                </button>
                <button class="btn btn-secondary" id="hero-explore">
                    <i class="fas fa-compass"></i>
                    <span>探索照片</span>
                </button>
            `;
        }
    }

    updateUIForGuest() {
        // 更新导航栏用户区域
        if (DOM.navUser) {
            DOM.navUser.innerHTML = `
                <button class="btn btn-outline btn-small" id="nav-login-btn">
                    <i class="fas fa-sign-in-alt"></i>
                    <span>登录</span>
                </button>
            `;
        }
        
        // 更新移动端认证按钮
        if (DOM.mobileAuthButtons) {
            DOM.mobileAuthButtons.innerHTML = `
                <button class="btn btn-primary btn-block" id="mobile-login-btn">
                    <i class="fas fa-sign-in-alt"></i>
                    <span>登录</span>
                </button>
                <button class="btn btn-outline btn-block" id="mobile-signup-btn">
                    <i class="fas fa-user-plus"></i>
                    <span>注册</span>
                </button>
            `;
        }
        
        // 更新英雄区域按钮
        if (DOM.heroButtons) {
            DOM.heroButtons.innerHTML = `
                <button class="btn btn-primary" id="hero-signup">
                    <i class="fas fa-user-plus"></i>
                    <span>免费注册</span>
                </button>
                <button class="btn btn-secondary" id="hero-explore">
                    <i class="fas fa-compass"></i>
                    <span>探索照片</span>
                </button>
            `;
        }
    }

    bindEvents() {
        // 主题切换
        if (DOM.themeToggle) {
            DOM.themeToggle.addEventListener('click', () => {
                appState.toggleTheme();
            });
        }
        
        // 移动端菜单
        if (DOM.mobileMenuBtn) {
            DOM.mobileMenuBtn.addEventListener('click', () => {
                DOM.mobileMenu.classList.toggle('active');
            });
        }
        
        // 全局搜索 - 输入时显示建议
        if (DOM.globalSearch) {
            DOM.globalSearch.addEventListener('input', debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));
            
            DOM.globalSearch.addEventListener('focus', () => {
                DOM.searchResults.classList.add('active');
            });
            
            // 点击外部关闭搜索结果
            document.addEventListener('click', (e) => {
                if (!DOM.globalSearch.contains(e.target) && !DOM.searchResults.contains(e.target)) {
                    DOM.searchResults.classList.remove('active');
                }
            });
            
            // 新增：Enter 键跳转到搜索页面
            DOM.globalSearch.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                    e.preventDefault();
                    window.location.href = `search.html?q=${encodeURIComponent(e.target.value.trim())}`;
                }
            });
        }
        
        // 模态框关闭按钮
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeAllModals();
            });
        });
        
        // 点击模态框背景关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAllModals();
                }
            });
        });
        
        // 登录/注册链接
        this.bindAuthEvents();
        
        // 上传链接
        if (DOM.uploadLink) {
            DOM.uploadLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openUploadPage();
            });
        }
        
        if (DOM.mobileUploadLink) {
            DOM.mobileUploadLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openUploadPage();
            });
        }
        
        // 类别卡片点击事件
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', () => {
                const category = card.dataset.category;
                this.searchByCategory(category);
            });
        });
        
        // 窗口大小变化时关闭移动菜单
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                DOM.mobileMenu.classList.remove('active');
            }
        });
        
        // 监听认证状态变化
        window.addEventListener('authChange', async (event) => {
            await this.checkAuthentication();
        });
    }

    bindAuthEvents() {
        // 导航登录按钮
        document.addEventListener('click', (e) => {
            if (e.target.id === 'nav-login-btn' || e.target.closest('#nav-login-btn')) {
                e.preventDefault();
                this.openModal('login');
            }
            
            if (e.target.id === 'mobile-login-btn' || e.target.closest('#mobile-login-btn')) {
                e.preventDefault();
                this.openModal('login');
                DOM.mobileMenu.classList.remove('active');
            }
            
            if (e.target.id === 'mobile-signup-btn' || e.target.closest('#mobile-signup-btn')) {
                e.preventDefault();
                this.openModal('signup');
                DOM.mobileMenu.classList.remove('active');
            }
            
            if (e.target.id === 'hero-signup' || e.target.closest('#hero-signup')) {
                e.preventDefault();
                this.openModal('signup');
            }
            
            if (e.target.id === 'hero-explore' || e.target.closest('#hero-explore')) {
                e.preventDefault();
                document.querySelector('#latest-section').scrollIntoView({ behavior: 'smooth' });
            }
            
            if (e.target.id === 'hero-upload' || e.target.closest('#hero-upload')) {
                e.preventDefault();
                this.openUploadPage();
            }
            
            // 用户下拉菜单
            if (e.target.id === 'user-avatar-btn' || e.target.closest('#user-avatar-btn')) {
                e.preventDefault();
                const dropdown = document.getElementById('user-dropdown-menu');
                if (dropdown) dropdown.classList.toggle('active');
            }
            
            // 退出登录
            if (e.target.id === 'logout-btn' || e.target.closest('#logout-btn')) {
                e.preventDefault();
                this.handleLogout();
            }
            
            // 设置按钮
            if (e.target.id === 'settings-btn' || e.target.closest('#settings-btn')) {
                e.preventDefault();
                this.openSettings();
            }
            
            // 管理面板按钮
            if (e.target.id === 'admin-panel-btn' || e.target.closest('#admin-panel-btn')) {
                e.preventDefault();
                this.openAdminPanel();
            }
        });
        
        // 点击外部关闭下拉菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-dropdown')) {
                const dropdown = document.getElementById('user-dropdown-menu');
                if (dropdown) dropdown.classList.remove('active');
            }
        });
        
        // 模态框切换链接
        document.addEventListener('click', (e) => {
            if (e.target.id === 'signup-link' || e.target.closest('#signup-link')) {
                e.preventDefault();
                this.openModal('signup');
            }
            
            if (e.target.id === 'login-link' || e.target.closest('#login-link')) {
                e.preventDefault();
                this.openModal('login');
            }
            
            if (e.target.id === 'forgot-password-link' || e.target.closest('#forgot-password-link')) {
                e.preventDefault();
                this.openModal('forgotPassword');
            }
            
            if (e.target.id === 'back-to-login' || e.target.closest('#back-to-login')) {
                e.preventDefault();
                this.openModal('login');
            }
        });
        
        // 密码显示/隐藏切换
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('fa-eye') || e.target.classList.contains('fa-eye-slash')) {
                const toggle = e.target;
                const input = toggle.closest('.form-group').querySelector('input');
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                toggle.classList.toggle('fa-eye');
                toggle.classList.toggle('fa-eye-slash');
            }
        });
    }

    async loadInitialData() {
        try {
            showLoading();
            
            // 并行加载数据
            await Promise.all([
                this.loadTrendingPhotos(),
                this.loadLatestPhotos(),
                this.loadFeaturedUsers()
            ]);
            
            hideLoading();
        } catch (error) {
            console.error('加载初始数据失败:', error);
            hideLoading();
            showNotification('加载数据失败，请刷新页面重试', 'error');
        }
    }

    async loadTrendingPhotos() {
        try {
            const { data, error } = await supabase
                .from('photos')
                .select(`
                    *,
                    profiles!user_id (
                        username,
                        avatar_url,
                        full_name
                    )
                `)
                .eq('is_private', false)
                .order('likes_count', { ascending: false })
                .limit(9);
            
            if (error) throw error;
            
            appState.trendingPhotos = data || [];
            this.renderTrendingPhotos();
        } catch (error) {
            console.error('加载热门照片失败:', error);
            if (DOM.trendingPhotos) {
                DOM.trendingPhotos.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>加载热门照片失败</p>
                    </div>
                `;
            }
        }
    }

    async loadLatestPhotos() {
        try {
            const { data, error } = await supabase
                .from('photos')
                .select(`
                    *,
                    profiles!user_id (
                        username,
                        avatar_url,
                        full_name
                    )
                `)
                .eq('is_private', false)
                .order('created_at', { ascending: false })
                .limit(12);
            
            if (error) throw error;
            
            appState.latestPhotos = data || [];
            this.renderLatestPhotos(appState.latestPhotos);
        } catch (error) {
            console.error('加载最新照片失败:', error);
            if (DOM.latestPhotos) {
                DOM.latestPhotos.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>加载最新照片失败</p>
                    </div>
                `;
            }
        }
    }

    async loadFeaturedUsers() {
        try {
            // 获取照片数量最多的用户作为特色用户
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    photos!user_id (
                        id
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(6);
            
            if (error) throw error;
            
            appState.users = data || [];
            this.renderFeaturedUsers();
        } catch (error) {
            console.error('加载特色用户失败:', error);
            if (DOM.featuredUsers) {
                DOM.featuredUsers.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>加载特色用户失败</p>
                    </div>
                `;
            }
        }
    }

    renderTrendingPhotos() {
        if (!DOM.trendingPhotos) return;
        
        if (!appState.trendingPhotos.length) {
            DOM.trendingPhotos.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-fire"></i>
                    <p>还没有热门照片</p>
                    <p class="empty-state-sub">上传照片并获取点赞成为热门</p>
                </div>
            `;
            return;
        }
        
        DOM.trendingPhotos.innerHTML = appState.trendingPhotos.map(photo => this.createPhotoCard(photo)).join('');
        this.bindPhotoCardEvents(DOM.trendingPhotos);
    }

    renderLatestPhotos(photos = null) {
        if (!DOM.latestPhotos) return;
        
        const photosToRender = photos || appState.latestPhotos;
        
        if (!photosToRender.length) {
            DOM.latestPhotos.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-image"></i>
                    <p>还没有照片</p>
                    <p class="empty-state-sub">成为第一个上传照片的人</p>
                </div>
            `;
            return;
        }
        
        DOM.latestPhotos.innerHTML = photosToRender.map(photo => this.createPhotoCard(photo)).join('');
        this.bindPhotoCardEvents(DOM.latestPhotos);
    }

    renderFeaturedUsers() {
        if (!DOM.featuredUsers) return;
        
        if (!appState.users.length) {
            DOM.featuredUsers.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>还没有用户</p>
                    <p class="empty-state-sub">注册成为第一个用户</p>
                </div>
            `;
            return;
        }
        
        DOM.featuredUsers.innerHTML = appState.users.map(user => this.createUserCard(user)).join('');
        this.bindUserCardEvents();
    }

    createPhotoCard(photo) {
        const author = photo.profiles || {};
        const isCurrentUser = appState.currentUser && appState.currentUser.id === photo.user_id;
        
        return `
            <div class="photo-card" data-photo-id="${photo.id}">
                <div class="photo-actions">
                    ${!isCurrentUser ? `
                        <button class="photo-action-btn like-btn" 
                                data-photo-id="${photo.id}"
                                title="点赞">
                            <i class="far fa-heart"></i>
                        </button>
                    ` : ''}
                    <button class="photo-action-btn view-btn" 
                            data-photo-id="${photo.id}"
                            title="查看详情">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>
                <img src="${photo.image_url}" 
                     alt="${photo.title}"
                     class="photo-image"
                     loading="lazy">
                <div class="photo-content">
                    <div class="photo-header">
                        <h3 class="photo-title">${this.escapeHtml(photo.title)}</h3>
                        <span class="photo-privacy ${photo.is_private ? 'private' : 'public'}">
                            ${photo.is_private ? '<i class="fas fa-lock"></i>' : '<i class="fas fa-globe"></i>'}
                        </span>
                    </div>
                    ${photo.description ? `<p class="photo-description">${this.escapeHtml(photo.description.substring(0, 100))}${photo.description.length > 100 ? '...' : ''}</p>` : ''}
                    <div class="photo-keywords">
                        ${photo.keywords ? photo.keywords.slice(0, 3).map(keyword => `
                            <span class="keyword">${this.escapeHtml(keyword)}</span>
                        `).join('') : ''}
                        ${photo.keywords && photo.keywords.length > 3 ? `<span class="keyword">+${photo.keywords.length - 3}</span>` : ''}
                    </div>
                    <div class="photo-footer">
                        <div class="photo-author">
                            <img src="${author.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(author.username || '用户')}" 
                                 alt="${author.username || '用户'}"
                                 class="author-avatar"
                                 data-user-id="${photo.user_id}">
                            <span class="author-name" data-user-id="${photo.user_id}">${author.username || '匿名用户'}</span>
                        </div>
                        <div class="photo-stats">
                            <span class="photo-stat like-stat" data-photo-id="${photo.id}">
                                <i class="far fa-heart"></i>
                                <span>${photo.likes_count || 0}</span>
                            </span>
                            <span class="photo-stat">
                                <i class="fas fa-eye"></i>
                                <span>${photo.views_count || 0}</span>
                            </span>
                            <span class="photo-stat">
                                <i class="fas fa-comment"></i>
                                <span>${photo.comments_count || 0}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createUserCard(user) {
        const photoCount = user.photos ? user.photos.length : 0;
        
        return `
            <div class="user-card" data-user-id="${user.id}">
                <img src="${user.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username || user.email)}" 
                     alt="${user.username || '用户'}"
                     class="user-avatar-large"
                     data-user-id="${user.id}">
                <h3 data-user-id="${user.id}">${user.username || '匿名用户'}</h3>
                ${user.bio ? `<p class="user-bio">${this.escapeHtml(user.bio.substring(0, 80))}${user.bio.length > 80 ? '...' : ''}</p>` : ''}
                <div class="user-stats">
                    <div class="user-stat">
                        <div class="user-stat-value">${photoCount}</div>
                        <div class="user-stat-label">照片</div>
                    </div>
                    <div class="user-stat">
                        <div class="user-stat-value">${user.followers_count || 0}</div>
                        <div class="user-stat-label">粉丝</div>
                    </div>
                    <div class="user-stat">
                        <div class="user-stat-value">${user.following_count || 0}</div>
                        <div class="user-stat-label">关注</div>
                    </div>
                </div>
                ${appState.currentUser && appState.currentUser.id !== user.id ? `
                    <button class="btn btn-outline btn-small follow-btn" data-user-id="${user.id}">
                        <i class="fas fa-user-plus"></i>
                        <span>关注</span>
                    </button>
                ` : ''}
            </div>
        `;
    }

    bindPhotoCardEvents(container = document) {
        // 照片点击查看详情
        container.querySelectorAll('.photo-image, .view-btn').forEach(element => {
            element.addEventListener('click', async (e) => {
                const photoId = e.target.closest('[data-photo-id]').dataset.photoId;
                await this.showPhotoDetail(photoId);
            });
        });
        
        // 点赞按钮
        container.querySelectorAll('.like-btn, .like-stat').forEach(element => {
            element.addEventListener('click', async (e) => {
                e.stopPropagation();
                const photoId = e.target.closest('[data-photo-id]').dataset.photoId;
                await this.toggleLike(photoId);
            });
        });
        
        // 作者点击
        container.querySelectorAll('.author-avatar, .author-name').forEach(element => {
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                const userId = e.target.closest('[data-user-id]').dataset.userId;
                this.showUserProfile(userId);
            });
        });
    }

    bindUserCardEvents() {
        // 用户卡片点击
        document.querySelectorAll('.user-avatar-large, .user-card h3').forEach(element => {
            element.addEventListener('click', (e) => {
                const userId = e.target.closest('[data-user-id]').dataset.userId;
                this.showUserProfile(userId);
            });
        });
        
        // 关注按钮
        document.querySelectorAll('.follow-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const userId = e.target.closest('[data-user-id]').dataset.userId;
                await this.toggleFollow(userId);
            });
        });
    }

    async showPhotoDetail(photoId) {
        try {
            showLoading();
            
            // 获取照片详情
            const { data: photo, error } = await supabase
                .from('photos')
                .select(`
                    *,
                    profiles!user_id (
                        id,
                        username,
                        avatar_url,
                        full_name,
                        bio
                    ),
                    comments (
                        id,
                        content,
                        created_at,
                        user_id,
                        profiles!user_id (
                            username,
                            avatar_url
                        )
                    )
                `)
                .eq('id', photoId)
                .single();
            
            if (error) throw error;
            
            // 增加浏览次数
            await supabase
                .from('photos')
                .update({ views_count: (photo.views_count || 0) + 1 })
                .eq('id', photoId);
            
            // 检查当前用户是否已经点赞
            let userHasLiked = false;
            if (appState.currentUser) {
                const { data: like } = await supabase
                    .from('likes')
                    .select('id')
                    .eq('user_id', appState.currentUser.id)
                    .eq('photo_id', photoId)
                    .single();
                
                userHasLiked = !!like;
            }
            
            // 获取相关照片（基于关键词）
            let relatedPhotos = [];
            if (photo.keywords && photo.keywords.length > 0) {
                const { data: related } = await supabase
                    .from('photos')
                    .select('*')
                    .neq('id', photoId)
                    .eq('is_private', false)
                    .overlaps('keywords', photo.keywords.slice(0, 3))
                    .limit(6);
                
                relatedPhotos = related || [];
            }
            
            appState.currentPhotoDetail = { ...photo, userHasLiked, relatedPhotos };
            this.renderPhotoDetail();
            this.openModal('photoDetail');
            
            hideLoading();
        } catch (error) {
            console.error('加载照片详情失败:', error);
            hideLoading();
            showNotification('加载照片详情失败', 'error');
        }
    }

    renderPhotoDetail() {
        const photo = appState.currentPhotoDetail;
        const author = photo.profiles || {};
        const comments = photo.comments || [];
        
        const content = `
            <div class="photo-detail-image">
                <img src="${photo.image_url}" alt="${photo.title}" id="detail-photo-img">
                <div class="image-zoom-controls">
                    <button class="btn btn-small" id="zoom-in">
                        <i class="fas fa-search-plus"></i>
                    </button>
                    <button class="btn btn-small" id="zoom-out">
                        <i class="fas fa-search-minus"></i>
                    </button>
                    <button class="btn btn-small" id="zoom-reset">
                        <i class="fas fa-expand-arrows-alt"></i>
                    </button>
                </div>
            </div>
            <div class="photo-detail-content">
                <div class="photo-detail-header">
                    <h1 id="photo-detail-title">${this.escapeHtml(photo.title)}</h1>
                    <div class="photo-detail-meta">
                        <div class="photo-detail-author" data-user-id="${author.id}">
                            <img src="${author.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(author.username || '用户')}" 
                                 alt="${author.username || '用户'}">
                            <div class="author-info">
                                <h4>${author.username || '匿名用户'}</h4>
                                <span>${new Date(photo.created_at).toLocaleDateString('zh-CN')}</span>
                            </div>
                        </div>
                        ${appState.currentUser && appState.currentUser.id !== photo.user_id ? `
                            <button class="btn btn-outline btn-small follow-detail-btn" data-user-id="${author.id}">
                                <i class="fas fa-user-plus"></i>
                                <span>关注</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                ${photo.description ? `
                    <div class="photo-detail-description">
                        <p>${this.escapeHtml(photo.description)}</p>
                    </div>
                ` : ''}
                
                <div class="photo-detail-keywords">
                    ${photo.keywords ? photo.keywords.map(keyword => `
                        <span class="keyword">${this.escapeHtml(keyword)}</span>
                    `).join('') : ''}
                </div>
                
                <div class="photo-detail-stats">
                    <div class="photo-detail-stat like-detail-stat ${photo.userHasLiked ? 'liked' : ''}" data-photo-id="${photo.id}">
                        <i class="${photo.userHasLiked ? 'fas' : 'far'} fa-heart"></i>
                        <span>${photo.likes_count || 0}</span>
                    </div>
                    <div class="photo-detail-stat">
                        <i class="fas fa-eye"></i>
                        <span>${photo.views_count || 0}</span>
                    </div>
                    <div class="photo-detail-stat">
                        <i class="fas fa-comment"></i>
                        <span>${photo.comments_count || 0}</span>
                    </div>
                    ${appState.currentUser && appState.currentUser.id === photo.user_id ? `
                        <button class="btn btn-outline btn-small" id="edit-photo-btn" data-photo-id="${photo.id}">
                            <i class="fas fa-edit"></i>
                            <span>编辑</span>
                        </button>
                        <button class="btn btn-outline btn-small" id="delete-photo-btn" data-photo-id="${photo.id}">
                            <i class="fas fa-trash"></i>
                            <span>删除</span>
                        </button>
                    ` : ''}
                    ${appState.currentUser && appState.currentUser.profile.is_admin ? `
                        <button class="btn btn-danger btn-small" id="admin-delete-photo-btn" data-photo-id="${photo.id}">
                            <i class="fas fa-trash"></i>
                            <span>管理员删除</span>
                        </button>
                    ` : ''}
                </div>
                
                ${appState.currentUser ? `
                    <div class="photo-detail-actions">
                        <button class="btn btn-primary like-detail-btn ${photo.userHasLiked ? 'liked' : ''}" data-photo-id="${photo.id}">
                            <i class="${photo.userHasLiked ? 'fas' : 'far'} fa-heart"></i>
                            <span>${photo.userHasLiked ? '已点赞' : '点赞'}</span>
                        </button>
                        <button class="btn btn-outline" id="share-photo-btn" data-photo-id="${photo.id}">
                            <i class="fas fa-share"></i>
                            <span>分享</span>
                        </button>
                        <button class="btn btn-outline" id="download-photo-btn" data-photo-id="${photo.id}">
                            <i class="fas fa-download"></i>
                            <span>下载</span>
                        </button>
                    </div>
                ` : ''}
                
                <div class="comments-section">
                    <h3>评论 (${comments.length})</h3>
                    
                    ${appState.currentUser ? `
                        <div class="comment-form">
                            <textarea id="comment-input" placeholder="写下你的评论..." rows="3"></textarea>
                            <button class="btn btn-primary" id="submit-comment-btn" data-photo-id="${photo.id}">发表评论</button>
                        </div>
                    ` : `
                        <div class="comment-form">
                            <p class="comment-login-prompt">请<a href="#login" id="comment-login-link">登录</a>后发表评论</p>
                        </div>
                    `}
                    
                    <div class="comments-list" id="comments-list">
                        ${comments.length > 0 ? comments.map(comment => `
                            <div class="comment" data-comment-id="${comment.id}">
                                <div class="comment-header">
                                    <img src="${comment.profiles.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(comment.profiles.username || '用户')}" 
                                         alt="${comment.profiles.username || '用户'}"
                                         class="comment-avatar"
                                         data-user-id="${comment.user_id}">
                                    <div class="comment-info">
                                        <span class="comment-author" data-user-id="${comment.user_id}">${comment.profiles.username || '匿名用户'}</span>
                                        <span class="comment-time">${new Date(comment.created_at).toLocaleDateString('zh-CN')}</span>
                                    </div>
                                    ${appState.currentUser && (appState.currentUser.id === comment.user_id || appState.currentUser.profile.is_admin) ? `
                                        <button class="btn btn-small delete-comment-btn" data-comment-id="${comment.id}">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    ` : ''}
                                </div>
                                <div class="comment-content">
                                    <p>${this.escapeHtml(comment.content)}</p>
                                </div>
                            </div>
                        `).join('') : `
                            <div class="empty-comments">
                                <i class="fas fa-comment-slash"></i>
                                <p>还没有评论，成为第一个评论的人</p>
                            </div>
                        `}
                    </div>
                </div>
                
                ${photo.relatedPhotos && photo.relatedPhotos.length > 0 ? `
                    <div class="related-photos-section">
                        <h3>相关内容</h3>
                        <div class="related-photos-grid">
                            ${photo.relatedPhotos.slice(0, 4).map(related => `
                                <div class="related-photo" data-photo-id="${related.id}">
                                    <img src="${related.image_url}" alt="${related.title}">
                                    <div class="related-photo-overlay">
                                        <h4>${this.escapeHtml(related.title.substring(0, 20))}${related.title.length > 20 ? '...' : ''}</h4>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        document.getElementById('photo-detail-content').innerHTML = content;
        
        // 绑定详情页面的事件
        this.bindPhotoDetailEvents();
        
        // 设置图片缩放功能
        this.setupImageZoom();
    }

    bindPhotoDetailEvents() {
        // 点赞按钮
        const likeBtn = document.querySelector('.like-detail-btn');
        const likeStat = document.querySelector('.like-detail-stat');
        
        if (likeBtn) {
            likeBtn.addEventListener('click', async (e) => {
                const photoId = e.currentTarget.dataset.photoId;
                await this.toggleLike(photoId);
            });
        }
        
        if (likeStat) {
            likeStat.addEventListener('click', async (e) => {
                const photoId = e.currentTarget.dataset.photoId;
                await this.toggleLike(photoId);
            });
        }
        
        // 关注按钮
        const followBtn = document.querySelector('.follow-detail-btn');
        if (followBtn) {
            followBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const userId = e.currentTarget.dataset.userId;
                await this.toggleFollow(userId);
            });
        }
        
        // 作者点击
        document.querySelectorAll('.photo-detail-author, .comment-author, .comment-avatar').forEach(element => {
            element.addEventListener('click', (e) => {
                const userId = e.target.closest('[data-user-id]').dataset.userId;
                this.showUserProfile(userId);
            });
        });
        
        // 发表评论
        const submitCommentBtn = document.getElementById('submit-comment-btn');
        if (submitCommentBtn) {
            submitCommentBtn.addEventListener('click', async () => {
                await this.submitComment();
            });
            
            // 按Enter键提交评论（Ctrl+Enter或Cmd+Enter）
            const commentInput = document.getElementById('comment-input');
            if (commentInput) {
                commentInput.addEventListener('keydown', async (e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        await this.submitComment();
                    }
                });
            }
        }
        
        // 评论登录链接
        const commentLoginLink = document.getElementById('comment-login-link');
        if (commentLoginLink) {
            commentLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal('login');
            });
        }
        
        // 删除评论
        document.querySelectorAll('.delete-comment-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const commentId = e.target.closest('[data-comment-id]').dataset.commentId;
                await this.deleteComment(commentId);
            });
        });
        
        // 编辑照片
        const editPhotoBtn = document.getElementById('edit-photo-btn');
        if (editPhotoBtn) {
            editPhotoBtn.addEventListener('click', (e) => {
                const photoId = e.target.closest('[data-photo-id]').dataset.photoId;
                this.editPhoto(photoId);
            });
        }
        
        // 删除照片
        const deletePhotoBtn = document.getElementById('delete-photo-btn');
        if (deletePhotoBtn) {
            deletePhotoBtn.addEventListener('click', async (e) => {
                const photoId = e.target.closest('[data-photo-id]').dataset.photoId;
                await this.deletePhoto(photoId);
            });
        }
        
        // 管理员删除照片
        const adminDeletePhotoBtn = document.getElementById('admin-delete-photo-btn');
        if (adminDeletePhotoBtn) {
            adminDeletePhotoBtn.addEventListener('click', async (e) => {
                const photoId = e.target.closest('[data-photo-id]').dataset.photoId;
                await this.adminDeletePhoto(photoId);
            });
        }
        
        // 分享照片
        const sharePhotoBtn = document.getElementById('share-photo-btn');
        if (sharePhotoBtn) {
            sharePhotoBtn.addEventListener('click', (e) => {
                const photoId = e.target.closest('[data-photo-id]').dataset.photoId;
                this.sharePhoto(photoId);
            });
        }
        
        // 下载照片
        const downloadPhotoBtn = document.getElementById('download-photo-btn');
        if (downloadPhotoBtn) {
            downloadPhotoBtn.addEventListener('click', (e) => {
                const photoId = e.target.closest('[data-photo-id]').dataset.photoId;
                this.downloadPhoto(photoId);
            });
        }
        
        // 相关照片点击
        document.querySelectorAll('.related-photo').forEach(photo => {
            photo.addEventListener('click', async (e) => {
                const photoId = e.target.closest('[data-photo-id]').dataset.photoId;
                await this.showPhotoDetail(photoId);
            });
        });
    }

    setupImageZoom() {
        const img = document.getElementById('detail-photo-img');
        if (!img) return;
        
        let scale = 1;
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        const zoomResetBtn = document.getElementById('zoom-reset');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                scale = Math.min(scale + 0.25, 3);
                img.style.transform = `scale(${scale})`;
            });
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                scale = Math.max(scale - 0.25, 1);
                img.style.transform = `scale(${scale})`;
            });
        }
        
        if (zoomResetBtn) {
            zoomResetBtn.addEventListener('click', () => {
                scale = 1;
                img.style.transform = `scale(${scale})`;
            });
        }
        
        // 双击重置缩放
        img.addEventListener('dblclick', () => {
            scale = scale === 1 ? 2 : 1;
            img.style.transform = `scale(${scale})`;
        });
    }

    async toggleLike(photoId) {
        if (!appState.currentUser) {
            showNotification('请先登录后再点赞', 'warning');
            this.openModal('login');
            return;
        }
        
        try {
            // 检查是否已经点赞
            const { data: existingLike } = await supabase
                .from('likes')
                .select('id')
                .eq('user_id', appState.currentUser.id)
                .eq('photo_id', photoId)
                .single();
            
            if (existingLike) {
                // 取消点赞
                const { error } = await supabase
                    .from('likes')
                    .delete()
                    .eq('id', existingLike.id);
                
                if (error) throw error;
                
                showNotification('已取消点赞', 'success');
                this.updateLikeUI(photoId, false);
            } else {
                // 添加点赞
                const { error } = await supabase
                    .from('likes')
                    .insert({
                        user_id: appState.currentUser.id,
                        photo_id: photoId
                    });
                
                if (error) throw error;
                
                showNotification('点赞成功', 'success');
                this.updateLikeUI(photoId, true);
            }
            
            // 重新加载热门照片
            await this.loadTrendingPhotos();
            
        } catch (error) {
            console.error('点赞操作失败:', error);
            showNotification('操作失败，请重试', 'error');
        }
    }

    updateLikeUI(photoId, isLiked) {
        // 更新所有相关UI元素的点赞状态
        document.querySelectorAll(`[data-photo-id="${photoId}"]`).forEach(element => {
            // 更新点赞按钮
            const likeBtns = element.querySelectorAll('.like-btn, .like-detail-btn');
            likeBtns.forEach(btn => {
                btn.classList.toggle('liked', isLiked);
                const icon = btn.querySelector('i');
                const text = btn.querySelector('span');
                if (icon) icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
                if (text) text.textContent = isLiked ? '已点赞' : '点赞';
            });
            
            // 更新点赞统计
            const likeStats = element.querySelectorAll('.like-stat, .like-detail-stat');
            likeStats.forEach(stat => {
                stat.classList.toggle('liked', isLiked);
                const countSpan = stat.querySelector('span:last-child');
                if (countSpan) {
                    const currentCount = parseInt(countSpan.textContent) || 0;
                    countSpan.textContent = isLiked ? currentCount + 1 : Math.max(currentCount - 1, 0);
                }
                const icon = stat.querySelector('i');
                if (icon) icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
            });
        });
    }

    handleLikeAdded(photoId, userId) {
        // 实时更新点赞UI（如果当前用户不是点赞者）
        if (appState.currentUser && appState.currentUser.id !== userId) {
            this.updateLikeCount(photoId, 1);
        }
    }

    handleLikeRemoved(photoId, userId) {
        // 实时更新点赞UI（如果当前用户不是取消点赞者）
        if (appState.currentUser && appState.currentUser.id !== userId) {
            this.updateLikeCount(photoId, -1);
        }
    }

    updateLikeCount(photoId, change) {
        document.querySelectorAll(`[data-photo-id="${photoId}"] .like-stat span:last-child, [data-photo-id="${photoId}"] .like-detail-stat span:last-child`).forEach(span => {
            const currentCount = parseInt(span.textContent) || 0;
            span.textContent = Math.max(currentCount + change, 0);
        });
    }

    async toggleFollow(userId) {
        if (!appState.currentUser) {
            showNotification('请先登录后再关注', 'warning');
            this.openModal('login');
            return;
        }
        
        if (appState.currentUser.id === userId) {
            showNotification('不能关注自己', 'warning');
            return;
        }
        
        try {
            // 检查是否已经关注
            const { data: existingFollow } = await supabase
                .from('follows')
                .select('id')
                .eq('follower_id', appState.currentUser.id)
                .eq('following_id', userId)
                .single();
            
            if (existingFollow) {
                // 取消关注
                const { error } = await supabase
                    .from('follows')
                    .delete()
                    .eq('id', existingFollow.id);
                
                if (error) throw error;
                
                showNotification('已取消关注', 'success');
                this.updateFollowButton(userId, false);
            } else {
                // 添加关注
                const { error } = await supabase
                    .from('follows')
                    .insert({
                        follower_id: appState.currentUser.id,
                        following_id: userId
                    });
                
                if (error) throw error;
                
                showNotification('关注成功', 'success');
                this.updateFollowButton(userId, true);
            }
            
        } catch (error) {
            console.error('关注操作失败:', error);
            showNotification('操作失败，请重试', 'error');
        }
    }

    updateFollowButton(userId, isFollowing) {
        // 更新所有关注按钮
        document.querySelectorAll(`[data-user-id="${userId}"] .follow-btn, .follow-detail-btn`).forEach(btn => {
            const icon = btn.querySelector('i');
            const text = btn.querySelector('span');
            
            if (isFollowing) {
                btn.classList.remove('btn-outline');
                btn.classList.add('btn-primary');
                if (icon) icon.className = 'fas fa-user-check';
                if (text) text.textContent = '已关注';
            } else {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-outline');
                if (icon) icon.className = 'fas fa-user-plus';
                if (text) text.textContent = '关注';
            }
        });
    }

    async submitComment() {
        if (!appState.currentUser) {
            showNotification('请先登录后再评论', 'warning');
            this.openModal('login');
            return;
        }
        
        const commentInput = document.getElementById('comment-input');
        const content = commentInput.value.trim();
        
        if (!content) {
            showNotification('评论内容不能为空', 'warning');
            return;
        }
        
        if (content.length > 500) {
            showNotification('评论内容不能超过500字', 'warning');
            return;
        }
        
        try {
            const { error } = await supabase
                .from('comments')
                .insert({
                    user_id: appState.currentUser.id,
                    photo_id: appState.currentPhotoDetail.id,
                    content: content
                });
            
            if (error) throw error;
            
            // 清空输入框
            commentInput.value = '';
            
            showNotification('评论发表成功', 'success');
            
            // 评论会通过实时订阅自动更新UI
            
        } catch (error) {
            console.error('发表评论失败:', error);
            showNotification('评论发表失败，请重试', 'error');
        }
    }

    async handleCommentAdded(photoId, comment) {
        // 如果是当前查看的照片，添加新评论到UI
        if (appState.currentPhotoDetail && appState.currentPhotoDetail.id === photoId) {
            await this.addCommentToDetail(comment);
        }
    }

    async addCommentToDetail(comment) {
        // 获取用户资料
        const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', comment.user_id)
            .single();
        
        if (profile) {
            const commentHTML = `
                <div class="comment" data-comment-id="${comment.id}">
                    <div class="comment-header">
                        <img src="${profile.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.username || '用户')}" 
                             alt="${profile.username || '用户'}"
                             class="comment-avatar"
                             data-user-id="${comment.user_id}">
                        <div class="comment-info">
                            <span class="comment-author" data-user-id="${comment.user_id}">${profile.username || '匿名用户'}</span>
                            <span class="comment-time">${new Date(comment.created_at).toLocaleDateString('zh-CN')}</span>
                        </div>
                        ${appState.currentUser && (appState.currentUser.id === comment.user_id || appState.currentUser.profile.is_admin) ? `
                            <button class="btn btn-small delete-comment-btn" data-comment-id="${comment.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                    <div class="comment-content">
                        <p>${this.escapeHtml(comment.content)}</p>
                    </div>
                </div>
            `;
            
            const commentsList = document.getElementById('comments-list');
            if (commentsList) {
                // 移除"暂无评论"提示
                const emptyComments = commentsList.querySelector('.empty-comments');
                if (emptyComments) {
                    emptyComments.remove();
                }
                
                // 添加新评论
                commentsList.insertAdjacentHTML('afterbegin', commentHTML);
                
                // 绑定删除按钮事件
                const newComment = commentsList.firstElementChild;
                const deleteBtn = newComment.querySelector('.delete-comment-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', async (e) => {
                        const commentId = e.currentTarget.dataset.commentId;
                        await this.deleteComment(commentId);
                    });
                }
            }
        }
    }

    async deleteComment(commentId) {
        if (!confirm('确定要删除这条评论吗？')) {
            return;
        }
        
        try {
            const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', commentId);
            
            if (error) throw error;
            
            // 从UI中移除评论
            const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (commentElement) {
                commentElement.remove();
                
                // 如果删除后没有评论了，显示空状态
                const commentsList = document.getElementById('comments-list');
                if (commentsList && commentsList.children.length === 0) {
                    commentsList.innerHTML = `
                        <div class="empty-comments">
                            <i class="fas fa-comment-slash"></i>
                            <p>还没有评论，成为第一个评论的人</p>
                        </div>
                    `;
                }
            }
            
            showNotification('评论删除成功', 'success');
            
        } catch (error) {
            console.error('删除评论失败:', error);
            showNotification('删除评论失败，请重试', 'error');
        }
    }

    async deletePhoto(photoId) {
        if (!confirm('确定要删除这张照片吗？此操作不可撤销。')) {
            return;
        }
        
        try {
            // 获取照片信息
            const { data: photo } = await supabase
                .from('photos')
                .select('cloudinary_public_id')
                .eq('id', photoId)
                .single();
            
            // 从Cloudinary删除图片
            if (photo && photo.cloudinary_public_id) {
                await this.deleteFromCloudinary(photo.cloudinary_public_id);
            }
            
            // 从数据库删除照片记录
            const { error } = await supabase
                .from('photos')
                .delete()
                .eq('id', photoId);
            
            if (error) throw error;
            
            // 关闭模态框
            this.closeAllModals();
            
            // 重新加载照片
            await Promise.all([
                this.loadTrendingPhotos(),
                this.loadLatestPhotos()
            ]);
            
            showNotification('照片删除成功', 'success');
            
        } catch (error) {
            console.error('删除照片失败:', error);
            showNotification('删除照片失败，请重试', 'error');
        }
    }

    async adminDeletePhoto(photoId) {
        if (!appState.currentUser || !appState.currentUser.profile.is_admin) {
            showNotification('您没有管理员权限', 'error');
            return;
        }
        
        if (!confirm('确定要以管理员身份删除这张照片吗？此操作不可撤销。')) {
            return;
        }
        
        try {
            // 获取照片信息
            const { data: photo } = await supabase
                .from('photos')
                .select('cloudinary_public_id')
                .eq('id', photoId)
                .single();
            
            // 从Cloudinary删除图片
            if (photo && photo.cloudinary_public_id) {
                await this.deleteFromCloudinary(photo.cloudinary_public_id);
            }
            
            // 从数据库删除照片记录
            const { error } = await supabase
                .from('photos')
                .delete()
                .eq('id', photoId);
            
            if (error) throw error;
            
            // 关闭模态框
            this.closeAllModals();
            
            // 重新加载照片
            await Promise.all([
                this.loadTrendingPhotos(),
                this.loadLatestPhotos()
            ]);
            
            showNotification('照片已由管理员删除', 'success');
            
        } catch (error) {
            console.error('管理员删除照片失败:', error);
            showNotification('删除照片失败，请重试', 'error');
        }
    }

    async deleteFromCloudinary(publicId) {
        try {
            const formData = new FormData();
            formData.append('public_id', publicId);
            formData.append('api_key', cloudinaryConfig.api_key);
            formData.append('timestamp', Math.floor(Date.now() / 1000));
            
            // 生成签名
            const signatureString = `public_id=${publicId}&timestamp=${formData.get('timestamp')}${cloudinaryConfig.api_secret}`;
            const signature = await this.generateSHA1(signatureString);
            formData.append('signature', signature);
            
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloud_name}/image/destroy`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('删除图片失败');
            }
            
            return true;
        } catch (error) {
            console.error('Cloudinary删除失败:', error);
            return false;
        }
    }

    async generateSHA1(message) {
        // 简单的SHA1生成（生产环境应使用更安全的方法）
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    editPhoto(photoId) {
        // 跳转到编辑页面或打开编辑模态框
        showNotification('编辑功能开发中', 'info');
        // 实际实现中，这里可以打开一个编辑模态框或跳转到编辑页面
    }

    sharePhoto(photoId) {
        const url = `${window.location.origin}${window.location.pathname}?photo=${photoId}`;
        const title = document.getElementById('photo-detail-title').textContent;
        
        if (navigator.share) {
            navigator.share({
                title: title,
                text: '看看这张照片！',
                url: url
            });
        } else {
            // 复制到剪贴板
            navigator.clipboard.writeText(url).then(() => {
                showNotification('链接已复制到剪贴板', 'success');
            }).catch(err => {
                // 备用方法
                const textArea = document.createElement('textarea');
                textArea.value = url;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showNotification('链接已复制到剪贴板', 'success');
            });
        }
    }

    downloadPhoto(photoId) {
        const imgUrl = appState.currentPhotoDetail.image_url;
        const fileName = `photo_${photoId}_${Date.now()}.jpg`;
        
        // 创建下载链接
        const link = document.createElement('a');
        link.href = imgUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('照片下载开始', 'success');
    }

    async handleSearch(query) {
        if (!query || query.length < 2) {
            if (DOM.searchResults) {
                DOM.searchResults.innerHTML = '';
            }
            return;
        }
        
        try {
            // 搜索照片
            const { data: photos } = await supabase
                .from('photos')
                .select(`
                    *,
                    profiles!user_id (
                        username,
                        avatar_url
                    )
                `)
                .eq('is_private', false)
                .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
                .limit(5);
            
            // 搜索用户
            const { data: users } = await supabase
                .from('profiles')
                .select('*')
                .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
                .limit(5);
            
            // 渲染搜索结果
            let resultsHTML = '';
            
            if (photos && photos.length > 0) {
                resultsHTML += '<div class="search-result-section"><h4>照片</h4>';
                photos.forEach(photo => {
                    resultsHTML += `
                        <div class="search-result-item search-result-photo" data-photo-id="${photo.id}">
                            <img src="${photo.image_url}" alt="${photo.title}">
                            <div>
                                <h5>${this.escapeHtml(photo.title)}</h5>
                                <p>by ${photo.profiles.username || '匿名用户'}</p>
                            </div>
                        </div>
                    `;
                });
                resultsHTML += '</div>';
            }
            
            if (users && users.length > 0) {
                resultsHTML += '<div class="search-result-section"><h4>用户</h4>';
                users.forEach(user => {
                    resultsHTML += `
                        <div class="search-result-item search-result-user" data-user-id="${user.id}">
                            <img src="${user.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username || user.email)}" 
                                 alt="${user.username || '用户'}">
                            <div>
                                <h5>${user.username || '匿名用户'}</h5>
                                <p>${user.full_name || ''}</p>
                            </div>
                        </div>
                    `;
                });
                resultsHTML += '</div>';
            }
            
            if (!resultsHTML) {
                resultsHTML = '<div class="search-result-empty">没有找到相关结果</div>';
            }
            
            if (DOM.searchResults) {
                DOM.searchResults.innerHTML = resultsHTML;
                
                // 绑定搜索结果点击事件
                this.bindSearchResultEvents();
            }
            
        } catch (error) {
            console.error('搜索失败:', error);
            if (DOM.searchResults) {
                DOM.searchResults.innerHTML = '<div class="search-result-error">搜索失败，请重试</div>';
            }
        }
    }

    bindSearchResultEvents() {
        // 照片搜索结果点击
        DOM.searchResults.querySelectorAll('.search-result-photo').forEach(item => {
            item.addEventListener('click', async (e) => {
                const photoId = e.currentTarget.dataset.photoId;
                DOM.searchResults.classList.remove('active');
                DOM.globalSearch.value = '';
                await this.showPhotoDetail(photoId);
            });
        });
        
        // 用户搜索结果点击
        DOM.searchResults.querySelectorAll('.search-result-user').forEach(item => {
            item.addEventListener('click', (e) => {
                const userId = e.currentTarget.dataset.userId;
                DOM.searchResults.classList.remove('active');
                DOM.globalSearch.value = '';
                this.showUserProfile(userId);
            });
        });
    }

    searchByCategory(category) {
        // 跳转到搜索页面或显示搜索结果
        if (DOM.globalSearch) {
            DOM.globalSearch.value = category;
            this.handleSearch(category);
            DOM.searchResults.classList.add('active');
        }
    }

    showUserProfile(userId) {
        // 跳转到用户资料页面
        window.location.href = `profile.html?user=${userId}`;
    }

    openUploadPage() {
        if (!appState.currentUser) {
            showNotification('请先登录后再上传照片', 'warning');
            this.openModal('login');
            return;
        }
        
        // 跳转到上传页面
        window.location.href = 'upload.html';
    }

    async handleLogout() {
        try {
            const { error } = await supabase.auth.signOut();
            
            if (error) throw error;
            
            // 清理实时订阅
            appState.cleanupRealtimeSubscriptions();
            
            appState.setUser(null);
            this.updateUIForGuest();
            
            showNotification('已成功退出登录', 'success');
            
        } catch (error) {
            console.error('退出登录失败:', error);
            showNotification('退出登录失败，请重试', 'error');
        }
    }

    openSettings() {
        showNotification('设置功能开发中', 'info');
        // 这里可以打开设置模态框
    }

    openAdminPanel() {
        if (!appState.currentUser || !appState.currentUser.profile.is_admin) {
            showNotification('需要管理员权限', 'error');
            return;
        }
        
        // 加载管理员模块
        import('./admin.js').then(module => {
            if (module.adminManager) {
                module.adminManager.openAdminPanel();
            }
        }).catch(error => {
            console.error('加载管理员模块失败:', error);
            showNotification('加载管理员功能失败', 'error');
        });
    }

    openModal(modalName) {
        // 关闭所有模态框
        this.closeAllModals();
        
        // 打开指定的模态框
        const modal = DOM.modals[modalName];
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeAllModals() {
        Object.values(DOM.modals).forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    updatePhotoInUI(photo) {
        // 更新所有照片卡片中的对应照片
        document.querySelectorAll(`[data-photo-id="${photo.id}"]`).forEach(element => {
            const likeStat = element.querySelector('.like-stat');
            if (likeStat) {
                const countSpan = likeStat.querySelector('span:last-child');
                if (countSpan) {
                    countSpan.textContent = photo.likes_count || 0;
                }
            }
            
            const commentStat = element.querySelector('.photo-stat:has(.fa-comment)');
            if (commentStat) {
                const countSpan = commentStat.querySelector('span:last-child');
                if (countSpan) {
                    countSpan.textContent = photo.comments_count || 0;
                }
            }
        });
    }

    removePhotoFromUI(photoId) {
        document.querySelectorAll(`[data-photo-id="${photoId}"]`).forEach(element => {
            element.remove();
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PhotoShareApp();
    
    // 如果已经登录，初始化实时订阅
    const user = authManager.getCurrentUser();
    if (user) {
        appState.initRealtimeSubscriptions();
    }
});

// 导出应用实例
export { appState };
