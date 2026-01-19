/**
 * 管理员模块
 * 处理管理员功能，包括内容管理、用户管理、系统设置
 */

// 管理员状态
let adminState = {
    isAdmin: false,
    isInitialized: false,
    currentSection: 'dashboard',
    stats: null,
    loading: false,
    realtimeEnabled: true
};

// 管理员常量
const ADMIN_SECTIONS = {
    DASHBOARD: 'dashboard',
    PHOTOS: 'photos',
    USERS: 'users',
    REPORTS: 'reports',
    COMMENTS: 'comments',
    SETTINGS: 'settings',
    MODERATION: 'moderation'
};

// 初始化管理员模块
async function initAdminModule() {
    console.log('正在初始化管理员模块...');
    
    // 检查用户是否是管理员
    await checkAdminStatus();
    
    // 如果用户是管理员，设置事件监听器
    if (adminState.isAdmin) {
        setupAdminEventListeners();
        setupAdminRealTime();
        setupAdminShortcuts();
    }
    
    adminState.isInitialized = true;
    console.log('管理员模块初始化完成');
}

// 检查用户是否是管理员
async function checkAdminStatus() {
    try {
        const currentUser = window.auth?.getCurrentUser();
        
        if (!currentUser) {
            adminState.isAdmin = false;
            return;
        }
        
        // 检查用户是否是管理员
        const isAdmin = await window.supabaseFunctions.checkIfAdmin(currentUser.id);
        adminState.isAdmin = isAdmin;
        
        // 如果用户是管理员，在导航栏添加管理员入口
        if (isAdmin) {
            addAdminLinkToNavigation();
        }
        
    } catch (error) {
        console.error('检查管理员状态错误:', error);
        adminState.isAdmin = false;
    }
}

// 在导航栏添加管理员入口
function addAdminLinkToNavigation() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;
    
    // 检查是否已存在管理员链接
    if (document.getElementById('adminLink')) return;
    
    const adminLink = document.createElement('a');
    adminLink.id = 'adminLink';
    adminLink.href = '#';
    adminLink.className = 'nav-link';
    adminLink.innerHTML = '<i class="fas fa-shield-alt"></i> 管理';
    adminLink.addEventListener('click', (e) => {
        e.preventDefault();
        showAdminPanel();
    });
    
    // 插入到用户菜单之前
    const userMenu = navLinks.querySelector('.user-menu');
    if (userMenu) {
        navLinks.insertBefore(adminLink, userMenu);
    } else {
        navLinks.appendChild(adminLink);
    }
}

// 显示管理员面板
function showAdminPanel() {
    // 验证管理员权限
    if (!adminState.isAdmin) {
        showNotification('您没有管理员权限', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal admin-modal';
    modal.innerHTML = `
        <div class="modal-content admin-content">
            <span class="close-modal">&times;</span>
            <div class="admin-header">
                <h2><i class="fas fa-shield-alt"></i> 管理员面板</h2>
                <div class="admin-stats-bar">
                    <span class="stat"><i class="fas fa-users"></i> 用户: <span id="totalUsers">0</span></span>
                    <span class="stat"><i class="fas fa-images"></i> 照片: <span id="totalPhotos">0</span></span>
                    <span class="stat"><i class="fas fa-flag"></i> 举报: <span id="totalReports">0</span></span>
                </div>
            </div>
            
            <div class="admin-container">
                <div class="admin-sidebar">
                    <nav class="admin-nav">
                        <button class="admin-nav-btn active" data-section="dashboard">
                            <i class="fas fa-tachometer-alt"></i> 仪表板
                        </button>
                        <button class="admin-nav-btn" data-section="photos">
                            <i class="fas fa-images"></i> 照片管理
                        </button>
                        <button class="admin-nav-btn" data-section="users">
                            <i class="fas fa-users"></i> 用户管理
                        </button>
                        <button class="admin-nav-btn" data-section="reports">
                            <i class="fas fa-flag"></i> 举报管理
                        </button>
                        <button class="admin-nav-btn" data-section="comments">
                            <i class="fas fa-comments"></i> 评论管理
                        </button>
                        <button class="admin-nav-btn" data-section="moderation">
                            <i class="fas fa-gavel"></i> 内容审核
                        </button>
                        <button class="admin-nav-btn" data-section="settings">
                            <i class="fas fa-cog"></i> 系统设置
                        </button>
                    </nav>
                    
                    <div class="admin-quick-actions">
                        <h4>快速操作</h4>
                        <button class="btn btn-sm btn-outline" id="refreshStatsBtn">
                            <i class="fas fa-sync-alt"></i> 刷新统计
                        </button>
                        <button class="btn btn-sm btn-outline" id="clearCacheBtn">
                            <i class="fas fa-broom"></i> 清理缓存
                        </button>
                        <button class="btn btn-sm btn-outline" id="exportDataBtn">
                            <i class="fas fa-download"></i> 导出数据
                        </button>
                    </div>
                </div>
                
                <div class="admin-main">
                    <div class="admin-section active" id="dashboardSection">
                        <div class="dashboard-header">
                            <h3><i class="fas fa-tachometer-alt"></i> 系统仪表板</h3>
                            <div class="time-range-selector">
                                <select id="statsTimeRange">
                                    <option value="today">今天</option>
                                    <option value="week" selected>本周</option>
                                    <option value="month">本月</option>
                                    <option value="year">今年</option>
                                    <option value="all">全部时间</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="dashboard-stats">
                            <div class="stat-card">
                                <div class="stat-icon">
                                    <i class="fas fa-users"></i>
                                </div>
                                <div class="stat-info">
                                    <span class="stat-label">活跃用户</span>
                                    <span class="stat-value" id="activeUsers">0</span>
                                </div>
                            </div>
                            
                            <div class="stat-card">
                                <div class="stat-icon">
                                    <i class="fas fa-upload"></i>
                                </div>
                                <div class="stat-info">
                                    <span class="stat-label">今日上传</span>
                                    <span class="stat-value" id="uploadsToday">0</span>
                                </div>
                            </div>
                            
                            <div class="stat-card">
                                <div class="stat-icon">
                                    <i class="fas fa-heart"></i>
                                </div>
                                <div class="stat-info">
                                    <span class="stat-label">今日点赞</span>
                                    <span class="stat-value" id="likesToday">0</span>
                                </div>
                            </div>
                            
                            <div class="stat-card">
                                <div class="stat-icon">
                                    <i class="fas fa-comment"></i>
                                </div>
                                <div class="stat-info">
                                    <span class="stat-label">今日评论</span>
                                    <span class="stat-value" id="commentsToday">0</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="dashboard-charts">
                            <div class="chart-container">
                                <h4>用户增长趋势</h4>
                                <canvas id="usersChart"></canvas>
                            </div>
                            
                            <div class="chart-container">
                                <h4>内容上传趋势</h4>
                                <canvas id="uploadsChart"></canvas>
                            </div>
                        </div>
                        
                        <div class="recent-activity">
                            <h4>最近活动</h4>
                            <div class="activity-list" id="activityList">
                                <div class="loading-spinner">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <p>加载中...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="admin-section" id="photosSection">
                        <div class="section-header">
                            <h3><i class="fas fa-images"></i> 照片管理</h3>
                            <div class="section-actions">
                                <input type="text" id="searchPhotosAdmin" placeholder="搜索照片...">
                                <select id="photosFilter">
                                    <option value="all">所有照片</option>
                                    <option value="reported">被举报的</option>
                                    <option value="recent">最近上传</option>
                                    <option value="popular">最受欢迎</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="photos-list" id="adminPhotosList">
                            <div class="loading-spinner">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p>加载中...</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="admin-section" id="usersSection">
                        <div class="section-header">
                            <h3><i class="fas fa-users"></i> 用户管理</h3>
                            <div class="section-actions">
                                <input type="text" id="searchUsersAdmin" placeholder="搜索用户...">
                                <select id="usersFilter">
                                    <option value="all">所有用户</option>
                                    <option value="recent">最近注册</option>
                                    <option value="active">活跃用户</option>
                                    <option value="inactive">不活跃用户</option>
                                    <option value="admins">管理员</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="users-list" id="adminUsersList">
                            <div class="loading-spinner">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p>加载中...</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="admin-section" id="reportsSection">
                        <div class="section-header">
                            <h3><i class="fas fa-flag"></i> 举报管理</h3>
                            <div class="section-actions">
                                <select id="reportsFilter">
                                    <option value="all">所有举报</option>
                                    <option value="pending">待处理</option>
                                    <option value="resolved">已处理</option>
                                    <option value="dismissed">已忽略</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="reports-list" id="adminReportsList">
                            <div class="loading-spinner">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p>加载中...</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="admin-section" id="commentsSection">
                        <div class="section-header">
                            <h3><i class="fas fa-comments"></i> 评论管理</h3>
                            <div class="section-actions">
                                <input type="text" id="searchCommentsAdmin" placeholder="搜索评论...">
                                <select id="commentsFilter">
                                    <option value="all">所有评论</option>
                                    <option value="reported">被举报的</option>
                                    <option value="recent">最近的</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="comments-list" id="adminCommentsList">
                            <div class="loading-spinner">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p>加载中...</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="admin-section" id="moderationSection">
                        <div class="section-header">
                            <h3><i class="fas fa-gavel"></i> 内容审核</h3>
                            <div class="section-actions">
                                <button class="btn btn-primary" id="startModerationBtn">
                                    <i class="fas fa-play"></i> 开始审核
                                </button>
                            </div>
                        </div>
                        
                        <div class="moderation-queue" id="moderationQueue">
                            <div class="queue-info">
                                <p>内容审核队列显示需要审核的照片和评论。</p>
                                <p>点击"开始审核"按钮开始审核内容。</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="admin-section" id="settingsSection">
                        <div class="section-header">
                            <h3><i class="fas fa-cog"></i> 系统设置</h3>
                        </div>
                        
                        <div class="settings-form">
                            <div class="setting-group">
                                <h4>站点设置</h4>
                                <div class="setting-item">
                                    <label>
                                        <input type="checkbox" id="siteMaintenance" ${adminState.stats?.site_settings?.maintenance_mode ? 'checked' : ''}>
                                        维护模式
                                    </label>
                                    <small>启用维护模式时，只有管理员可以访问站点</small>
                                </div>
                                
                                <div class="setting-item">
                                    <label>
                                        <input type="checkbox" id="siteRegistration" ${adminState.stats?.site_settings?.registration_enabled !== false ? 'checked' : ''}>
                                        开放注册
                                    </label>
                                    <small>允许新用户注册账户</small>
                                </div>
                                
                                <div class="setting-item">
                                    <label>
                                        <input type="checkbox" id="siteUploads" ${adminState.stats?.site_settings?.uploads_enabled !== false ? 'checked' : ''}>
                                        允许上传
                                    </label>
                                    <small>允许用户上传照片</small>
                                </div>
                            </div>
                            
                            <div class="setting-group">
                                <h4>内容设置</h4>
                                <div class="setting-item">
                                    <label>最大文件大小 (MB)</label>
                                    <input type="number" id="maxFileSize" min="1" max="100" value="${adminState.stats?.site_settings?.max_file_size || 25}">
                                </div>
                                
                                <div class="setting-item">
                                    <label>内容审核</label>
                                    <select id="contentModeration">
                                        <option value="none" ${adminState.stats?.site_settings?.moderation_level === 'none' ? 'selected' : ''}>无需审核</option>
                                        <option value="reported" ${adminState.stats?.site_settings?.moderation_level === 'reported' ? 'selected' : ''}>仅审核被举报内容</option>
                                        <option value="all" ${adminState.stats?.site_settings?.moderation_level === 'all' ? 'selected' : ''}>审核所有新内容</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="setting-group">
                                <h4>管理员设置</h4>
                                <div class="setting-item">
                                    <label>管理员列表</label>
                                    <div class="admins-list" id="adminsList">
                                        <div class="loading-spinner">
                                            <i class="fas fa-spinner fa-spin"></i>
                                            <p>加载中...</p>
                                        </div>
                                    </div>
                                    <button class="btn btn-sm btn-outline" id="addAdminBtn">
                                        <i class="fas fa-plus"></i> 添加管理员
                                    </button>
                                </div>
                            </div>
                            
                            <div class="setting-actions">
                                <button class="btn btn-primary" id="saveSettingsBtn">
                                    <i class="fas fa-save"></i> 保存设置
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // 阻止背景滚动
    document.body.style.overflow = 'hidden';
    
    // 初始化管理员面板
    initAdminPanel(modal);
}

// 初始化管理员面板
function initAdminPanel(modal) {
    // 关闭按钮
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = '';
        });
    }
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    });
    
    // ESC键关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.parentNode) {
            modal.remove();
            document.body.style.overflow = '';
        }
    });
    
    // 导航按钮点击
    const navButtons = modal.querySelectorAll('.admin-nav-btn');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const section = button.getAttribute('data-section');
            switchAdminSection(section, modal);
        });
    });
    
    // 快速操作按钮
    setupQuickActions(modal);
    
    // 初始化仪表板
    loadDashboardData(modal);
    
    // 统计时间范围选择
    const timeRangeSelect = modal.querySelector('#statsTimeRange');
    if (timeRangeSelect) {
        timeRangeSelect.addEventListener('change', () => {
            loadDashboardData(modal);
        });
    }
    
    // 加载其他数据
    setTimeout(() => {
        loadPhotosForAdmin(modal);
        loadUsersForAdmin(modal);
        loadReportsForAdmin(modal);
        loadCommentsForAdmin(modal);
        loadAdminsList(modal);
    }, 1000);
}

// 切换管理员部分
function switchAdminSection(section, modal) {
    adminState.currentSection = section;
    
    // 更新导航按钮
    const navButtons = modal.querySelectorAll('.admin-nav-btn');
    navButtons.forEach(button => {
        const btnSection = button.getAttribute('data-section');
        if (btnSection === section) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // 显示对应部分
    const sections = modal.querySelectorAll('.admin-section');
    sections.forEach(sectionElement => {
        if (sectionElement.id === `${section}Section`) {
            sectionElement.classList.add('active');
        } else {
            sectionElement.classList.remove('active');
        }
    });
    
    // 加载对应部分的数据
    switch (section) {
        case 'photos':
            loadPhotosForAdmin(modal);
            break;
        case 'users':
            loadUsersForAdmin(modal);
            break;
        case 'reports':
            loadReportsForAdmin(modal);
            break;
        case 'comments':
            loadCommentsForAdmin(modal);
            break;
        case 'settings':
            loadSettingsData(modal);
            break;
    }
}

// 设置快速操作
function setupQuickActions(modal) {
    // 刷新统计按钮
    const refreshBtn = modal.querySelector('#refreshStatsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadDashboardData(modal);
        });
    }
    
    // 清理缓存按钮
    const clearCacheBtn = modal.querySelector('#clearCacheBtn');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', () => {
            clearAdminCache();
        });
    }
    
    // 导出数据按钮
    const exportDataBtn = modal.querySelector('#exportDataBtn');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', () => {
            exportAdminData();
        });
    }
}

// 加载仪表板数据
async function loadDashboardData(modal) {
    try {
        // 获取统计数据
        const stats = await getAdminStats();
        adminState.stats = stats;
        
        // 更新统计显示
        updateStatsDisplay(modal, stats);
        
        // 加载活动列表
        await loadRecentActivity(modal);
        
        // 加载图表数据
        await loadChartsData(modal);
        
    } catch (error) {
        console.error('加载仪表板数据错误:', error);
        showAdminNotification('加载统计数据失败', 'error');
    }
}

// 获取管理员统计数据
async function getAdminStats() {
    try {
        // 获取照片统计
        const photoStats = await window.supabaseFunctions.getPhotoStats();
        
        // 获取用户统计
        const { count: userCount } = await supabaseClient
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        
        // 获取今日统计数据
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count: uploadsToday } = await supabaseClient
            .from('photos')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());
        
        const { count: likesToday } = await supabaseClient
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());
        
        const { count: commentsToday } = await supabaseClient
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());
        
        // 获取举报统计
        const { count: reportsCount } = await supabaseClient
            .from('reports')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        
        // 获取活跃用户（最近7天有活动的用户）
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { count: activeUsers } = await supabaseClient
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('last_active_at', sevenDaysAgo.toISOString())
            .not('last_active_at', 'is', null);
        
        // 获取站点设置
        const { data: siteSettings } = await supabaseClient
            .from('site_settings')
            .select('*')
            .single();
        
        return {
            totalPhotos: photoStats.totalPhotos || 0,
            totalLikes: photoStats.totalLikes || 0,
            totalComments: photoStats.totalComments || 0,
            totalUsers: userCount || 0,
            totalReports: reportsCount || 0,
            uploadsToday: uploadsToday || 0,
            likesToday: likesToday || 0,
            commentsToday: commentsToday || 0,
            activeUsers: activeUsers || 0,
            site_settings: siteSettings || {}
        };
        
    } catch (error) {
        console.error('获取统计数据错误:', error);
        throw error;
    }
}

// 更新统计显示
function updateStatsDisplay(modal, stats) {
    // 顶部统计栏
    const totalUsers = modal.querySelector('#totalUsers');
    const totalPhotos = modal.querySelector('#totalPhotos');
    const totalReports = modal.querySelector('#totalReports');
    
    if (totalUsers) totalUsers.textContent = stats.totalUsers;
    if (totalPhotos) totalPhotos.textContent = stats.totalPhotos;
    if (totalReports) totalReports.textContent = stats.totalReports;
    
    // 仪表板统计卡片
    const activeUsers = modal.querySelector('#activeUsers');
    const uploadsToday = modal.querySelector('#uploadsToday');
    const likesToday = modal.querySelector('#likesToday');
    const commentsToday = modal.querySelector('#commentsToday');
    
    if (activeUsers) activeUsers.textContent = stats.activeUsers;
    if (uploadsToday) uploadsToday.textContent = stats.uploadsToday;
    if (likesToday) likesToday.textContent = stats.likesToday;
    if (commentsToday) commentsToday.textContent = stats.commentsToday;
}

// 加载最近活动
async function loadRecentActivity(modal) {
    const activityList = modal.querySelector('#activityList');
    if (!activityList) return;
    
    try {
        // 获取最近活动（照片上传、评论、点赞等）
        const { data: recentPhotos, error: photosError } = await supabaseClient
            .from('photos')
            .select(`
                *,
                profiles (
                    username,
                    avatar_url
                )
            `)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (photosError) throw photosError;
        
        // 获取最近评论
        const { data: recentComments, error: commentsError } = await supabaseClient
            .from('comments')
            .select(`
                *,
                profiles (
                    username,
                    avatar_url
                ),
                photos (
                    id,
                    thumbnail_url
                )
            `)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (commentsError) throw commentsError;
        
        // 合并和排序活动
        const activities = [];
        
        if (recentPhotos) {
            recentPhotos.forEach(photo => {
                activities.push({
                    type: 'photo_upload',
                    user: photo.profiles?.username || '未知用户',
                    avatar: photo.profiles?.avatar_url,
                    content: photo.title || '照片上传',
                    photo_url: photo.thumbnail_url,
                    time: photo.created_at,
                    target_id: photo.id
                });
            });
        }
        
        if (recentComments) {
            recentComments.forEach(comment => {
                activities.push({
                    type: 'comment',
                    user: comment.profiles?.username || '未知用户',
                    avatar: comment.profiles?.avatar_url,
                    content: comment.content.substring(0, 50) + (comment.content.length > 50 ? '...' : ''),
                    photo_url: comment.photos?.thumbnail_url,
                    time: comment.created_at,
                    target_id: comment.id
                });
            });
        }
        
        // 按时间排序
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));
        
        // 只取最近的10个活动
        const recentActivities = activities.slice(0, 10);
        
        // 渲染活动列表
        renderActivityList(activityList, recentActivities);
        
    } catch (error) {
        console.error('加载最近活动错误:', error);
        activityList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>加载活动失败</p>
            </div>
        `;
    }
}

// 渲染活动列表
function renderActivityList(container, activities) {
    if (!activities || activities.length === 0) {
        container.innerHTML = `
            <div class="no-activities">
                <i class="fas fa-inbox"></i>
                <p>没有最近活动</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = activities.map(activity => {
        const timeAgo = formatTimeAgo(activity.time);
        let icon = '';
        let actionText = '';
        
        switch (activity.type) {
            case 'photo_upload':
                icon = '<i class="fas fa-camera"></i>';
                actionText = '上传了照片';
                break;
            case 'comment':
                icon = '<i class="fas fa-comment"></i>';
                actionText = '发表了评论';
                break;
            default:
                icon = '<i class="fas fa-circle"></i>';
                actionText = '进行了操作';
        }
        
        return `
            <div class="activity-item" data-type="${activity.type}" data-id="${activity.target_id}">
                <div class="activity-avatar">
                    <img src="${activity.avatar || 'https://ui-avatars.com/api/?name=User&background=bb86fc&color=fff'}" 
                         alt="${activity.user}">
                </div>
                <div class="activity-content">
                    <div class="activity-header">
                        <span class="activity-user">${activity.user}</span>
                        <span class="activity-action">${actionText}</span>
                    </div>
                    <div class="activity-text">${activity.content}</div>
                    <div class="activity-footer">
                        <span class="activity-time">${timeAgo}</span>
                        ${activity.photo_url ? 
                            `<img src="${activity.photo_url}" alt="预览" class="activity-preview">` : ''}
                    </div>
                </div>
                <div class="activity-icon">${icon}</div>
            </div>
        `;
    }).join('');
    
    // 添加点击事件
    const activityItems = container.querySelectorAll('.activity-item');
    activityItems.forEach(item => {
        item.addEventListener('click', () => {
            const type = item.getAttribute('data-type');
            const id = item.getAttribute('data-id');
            
            switch (type) {
                case 'photo_upload':
                    showImageDetail(id);
                    break;
                case 'comment':
                    // 跳转到评论所在的照片
                    const photoId = id; // 这里需要根据评论获取照片ID
                    if (photoId) {
                        showImageDetail(photoId);
                    }
                    break;
            }
        });
    });
}

// 加载图表数据
async function loadChartsData(modal) {
    // 这里实现图表数据的加载
    // 由于Chart.js需要额外的库，这里只显示占位符
    console.log('图表数据加载');
}

// 加载管理员照片
async function loadPhotosForAdmin(modal) {
    const photosList = modal.querySelector('#adminPhotosList');
    if (!photosList) return;
    
    try {
        photosList.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>加载中...</p>
            </div>
        `;
        
        // 获取所有照片
        const photos = await window.supabaseFunctions.getAllPhotos(0, 50);
        
        // 渲染照片列表
        renderAdminPhotosList(photosList, photos);
        
        // 设置搜索和筛选
        setupPhotosFilter(modal, photos);
        
    } catch (error) {
        console.error('加载管理员照片错误:', error);
        photosList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>加载照片失败: ${error.message}</p>
            </div>
        `;
    }
}

// 渲染管理员照片列表
function renderAdminPhotosList(container, photos) {
    if (!photos || photos.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-images"></i>
                <p>没有照片</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = photos.map(photo => {
        const uploadDate = new Date(photo.created_at).toLocaleDateString('zh-CN');
        const reportCount = photo.report_count || 0;
        
        return `
            <div class="admin-photo-item" data-photo-id="${photo.id}">
                <div class="photo-thumbnail">
                    <img src="${photo.thumbnail_url}" alt="${photo.title || '照片'}">
                    ${reportCount > 0 ? `<span class="report-badge">${reportCount} 举报</span>` : ''}
                </div>
                <div class="photo-info">
                    <div class="photo-header">
                        <h4>${photo.title || '无标题'}</h4>
                        <span class="photo-date">${uploadDate}</span>
                    </div>
                    <div class="photo-stats">
                        <span><i class="fas fa-user"></i> ${photo.profiles?.username || '未知用户'}</span>
                        <span><i class="fas fa-heart"></i> ${photo.likes_count || 0}</span>
                        <span><i class="fas fa-comment"></i> ${photo.comments_count || 0}</span>
                    </div>
                    <div class="photo-actions">
                        <button class="btn btn-sm btn-outline view-btn" data-photo-id="${photo.id}">
                            <i class="fas fa-eye"></i> 查看
                        </button>
                        <button class="btn btn-sm btn-outline delete-btn" data-photo-id="${photo.id}">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                        ${reportCount > 0 ? `
                            <button class="btn btn-sm btn-outline reports-btn" data-photo-id="${photo.id}">
                                <i class="fas fa-flag"></i> 查看举报
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // 添加事件监听器
    const photoItems = container.querySelectorAll('.admin-photo-item');
    photoItems.forEach(item => {
        // 查看按钮
        const viewBtn = item.querySelector('.view-btn');
        if (viewBtn) {
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const photoId = viewBtn.getAttribute('data-photo-id');
                showImageDetail(photoId);
            });
        }
        
        // 删除按钮
        const deleteBtn = item.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const photoId = deleteBtn.getAttribute('data-photo-id');
                showDeletePhotoConfirmation(photoId, container);
            });
        }
        
        // 举报按钮
        const reportsBtn = item.querySelector('.reports-btn');
        if (reportsBtn) {
            reportsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const photoId = reportsBtn.getAttribute('data-photo-id');
                showPhotoReports(photoId);
            });
        }
    });
}

// 设置照片筛选
function setupPhotosFilter(modal, photos) {
    const searchInput = modal.querySelector('#searchPhotosAdmin');
    const filterSelect = modal.querySelector('#photosFilter');
    
    if (!searchInput || !filterSelect) return;
    
    let currentPhotos = [...photos];
    
    // 搜索功能
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        filterAndDisplayPhotos(modal, currentPhotos, query, filterSelect.value);
    });
    
    // 筛选功能
    filterSelect.addEventListener('change', () => {
        filterAndDisplayPhotos(modal, currentPhotos, searchInput.value, filterSelect.value);
    });
}

// 筛选和显示照片
function filterAndDisplayPhotos(modal, photos, searchQuery, filter) {
    let filtered = [...photos];
    
    // 应用搜索
    if (searchQuery) {
        filtered = filtered.filter(photo => 
            (photo.title && photo.title.toLowerCase().includes(searchQuery)) ||
            (photo.description && photo.description.toLowerCase().includes(searchQuery)) ||
            (photo.profiles?.username && photo.profiles.username.toLowerCase().includes(searchQuery))
        );
    }
    
    // 应用筛选
    switch (filter) {
        case 'reported':
            // 筛选有举报的照片
            filtered = filtered.filter(photo => photo.report_count > 0);
            break;
        case 'recent':
            // 最近上传（24小时内）
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            filtered = filtered.filter(photo => new Date(photo.created_at) > yesterday);
            break;
        case 'popular':
            // 最受欢迎（点赞最多）
            filtered.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
            break;
        // 'all' 不应用额外筛选
    }
    
    // 重新渲染
    const photosList = modal.querySelector('#adminPhotosList');
    if (photosList) {
        renderAdminPhotosList(photosList, filtered);
    }
}

// 显示删除照片确认
function showDeletePhotoConfirmation(photoId, container) {
    if (confirm('确定要删除这张照片吗？这个操作不可撤销，所有相关数据（点赞、评论）也将被删除。')) {
        deletePhotoAsAdmin(photoId, container);
    }
}

// 以管理员身份删除照片
async function deletePhotoAsAdmin(photoId, container) {
    const currentUser = window.auth?.getCurrentUser();
    if (!currentUser) return;
    
    try {
        showAdminNotification('正在删除照片...', 'info');
        
        // 获取照片信息
        const { data: photo, error: fetchError } = await supabaseClient
            .from('photos')
            .select('cloudinary_id, user_id')
            .eq('id', photoId)
            .single();
        
        if (fetchError) throw fetchError;
        
        // 删除照片（使用管理员权限）
        const result = await window.supabaseFunctions.deletePhoto(photoId, currentUser.id);
        
        if (result.success) {
            // 从Cloudinary删除
            if (photo.cloudinary_id) {
                try {
                    await window.cloudinary.deleteImageFromCloudinary(photo.cloudinary_id);
                } catch (cloudinaryError) {
                    console.error('从Cloudinary删除错误:', cloudinaryError);
                }
            }
            
            // 从UI中移除
            const photoItem = container.querySelector(`[data-photo-id="${photoId}"]`);
            if (photoItem) {
                photoItem.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    photoItem.remove();
                }, 300);
            }
            
            showAdminNotification('照片删除成功', 'success');
            
            // 更新统计
            if (adminState.stats) {
                adminState.stats.totalPhotos = Math.max(0, adminState.stats.totalPhotos - 1);
                updateStatsDisplay(document.querySelector('.admin-modal'), adminState.stats);
            }
            
        } else {
            throw new Error('删除失败');
        }
        
    } catch (error) {
        console.error('管理员删除照片错误:', error);
        showAdminNotification('删除失败: ' + error.message, 'error');
    }
}

// 显示照片举报
async function showPhotoReports(photoId) {
    try {
        // 获取照片举报
        const { data: reports, error } = await supabaseClient
            .from('reports')
            .select(`
                *,
                reporter:profiles!reports_reporter_id_fkey(username, avatar_url)
            `)
            .eq('target_id', photoId)
            .eq('target_type', 'photo')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!reports || reports.length === 0) {
            showAdminNotification('此照片没有举报', 'info');
            return;
        }
        
        // 显示举报详情
        showReportsModal(reports, 'photo', photoId);
        
    } catch (error) {
        console.error('获取照片举报错误:', error);
        showAdminNotification('加载举报失败', 'error');
    }
}

// 加载管理员用户
async function loadUsersForAdmin(modal) {
    const usersList = modal.querySelector('#adminUsersList');
    if (!usersList) return;
    
    try {
        usersList.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>加载中...</p>
            </div>
        `;
        
        // 获取所有用户
        const users = await window.supabaseFunctions.getAllUsers(0, 50);
        
        // 渲染用户列表
        renderAdminUsersList(usersList, users);
        
        // 设置搜索和筛选
        setupUsersFilter(modal, users);
        
    } catch (error) {
        console.error('加载管理员用户错误:', error);
        usersList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>加载用户失败: ${error.message}</p>
            </div>
        `;
    }
}

// 渲染管理员用户列表
function renderAdminUsersList(container, users) {
    if (!users || users.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-users"></i>
                <p>没有用户</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = users.map(user => {
        const joinDate = new Date(user.created_at).toLocaleDateString('zh-CN');
        const lastActive = user.last_active_at ? 
            formatTimeAgo(user.last_active_at) : '从未活动';
        
        return `
            <div class="admin-user-item" data-user-id="${user.id}">
                <div class="user-avatar">
                    <img src="${user.avatar_url || 'https://ui-avatars.com/api/?name=User&background=bb86fc&color=fff'}" 
                         alt="${user.username}">
                    ${user.is_admin ? '<span class="admin-badge">管理员</span>' : ''}
                </div>
                <div class="user-info">
                    <div class="user-header">
                        <h4>${user.username || '未知用户'}</h4>
                        <span class="user-email">${user.email || '无邮箱'}</span>
                    </div>
                    <div class="user-stats">
                        <span><i class="fas fa-calendar"></i> 加入: ${joinDate}</span>
                        <span><i class="fas fa-clock"></i> 最后活动: ${lastActive}</span>
                    </div>
                    <div class="user-meta">
                        <span class="meta-item">照片: ${user.photos_count || 0}</span>
                        <span class="meta-item">关注: ${user.following_count || 0}</span>
                        <span class="meta-item">粉丝: ${user.followers_count || 0}</span>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn btn-sm btn-outline view-btn" data-user-id="${user.id}">
                        <i class="fas fa-eye"></i> 查看
                    </button>
                    <button class="btn btn-sm btn-outline ${user.is_admin ? 'remove-admin-btn' : 'make-admin-btn'}" data-user-id="${user.id}">
                        <i class="fas fa-shield-alt"></i> ${user.is_admin ? '移除管理员' : '设为管理员'}
                    </button>
                    <button class="btn btn-sm btn-outline delete-btn" data-user-id="${user.id}">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // 添加事件监听器
    const userItems = container.querySelectorAll('.admin-user-item');
    userItems.forEach(item => {
        // 查看按钮
        const viewBtn = item.querySelector('.view-btn');
        if (viewBtn) {
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const userId = viewBtn.getAttribute('data-user-id');
                showUserProfile(userId);
            });
        }
        
        // 管理员权限按钮
        const adminBtn = item.querySelector('.make-admin-btn') || item.querySelector('.remove-admin-btn');
        if (adminBtn) {
            adminBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const userId = adminBtn.getAttribute('data-user-id');
                const isAdmin = adminBtn.classList.contains('remove-admin-btn');
                toggleAdminStatus(userId, isAdmin, item, adminBtn);
            });
        }
        
        // 删除按钮
        const deleteBtn = item.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const userId = deleteBtn.getAttribute('data-user-id');
                showDeleteUserConfirmation(userId, container);
            });
        }
    });
}

// 设置用户筛选
function setupUsersFilter(modal, users) {
    const searchInput = modal.querySelector('#searchUsersAdmin');
    const filterSelect = modal.querySelector('#usersFilter');
    
    if (!searchInput || !filterSelect) return;
    
    let currentUsers = [...users];
    
    // 搜索功能
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        filterAndDisplayUsers(modal, currentUsers, query, filterSelect.value);
    });
    
    // 筛选功能
    filterSelect.addEventListener('change', () => {
        filterAndDisplayUsers(modal, currentUsers, searchInput.value, filterSelect.value);
    });
}

// 筛选和显示用户
function filterAndDisplayUsers(modal, users, searchQuery, filter) {
    let filtered = [...users];
    
    // 应用搜索
    if (searchQuery) {
        filtered = filtered.filter(user => 
            (user.username && user.username.toLowerCase().includes(searchQuery)) ||
            (user.email && user.email.toLowerCase().includes(searchQuery))
        );
    }
    
    // 应用筛选
    const now = new Date();
    switch (filter) {
        case 'recent':
            // 最近注册（7天内）
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            filtered = filtered.filter(user => new Date(user.created_at) > weekAgo);
            break;
        case 'active':
            // 活跃用户（最近30天有活动）
            const monthAgo = new Date();
            monthAgo.setDate(monthAgo.getDate() - 30);
            filtered = filtered.filter(user => 
                user.last_active_at && new Date(user.last_active_at) > monthAgo
            );
            break;
        case 'inactive':
            // 不活跃用户（超过30天没有活动）
            const inactiveThreshold = new Date();
            inactiveThreshold.setDate(inactiveThreshold.getDate() - 30);
            filtered = filtered.filter(user => 
                !user.last_active_at || new Date(user.last_active_at) < inactiveThreshold
            );
            break;
        case 'admins':
            // 管理员
            filtered = filtered.filter(user => user.is_admin);
            break;
        // 'all' 不应用额外筛选
    }
    
    // 重新渲染
    const usersList = modal.querySelector('#adminUsersList');
    if (usersList) {
        renderAdminUsersList(usersList, filtered);
    }
}

// 切换管理员状态
async function toggleAdminStatus(userId, isCurrentlyAdmin, userItem, button) {
    const currentUser = window.auth?.getCurrentUser();
    if (!currentUser) return;
    
    // 不能修改自己的管理员状态
    if (userId === currentUser.id) {
        showAdminNotification('不能修改自己的管理员状态', 'warning');
        return;
    }
    
    const action = isCurrentlyAdmin ? '移除管理员' : '设为管理员';
    const confirmMessage = isCurrentlyAdmin ? 
        '确定要移除此用户的管理员权限吗？' : 
        '确定要将此用户设为管理员吗？管理员将拥有系统管理权限。';
    
    if (!confirm(confirmMessage)) return;
    
    try {
        showAdminNotification(`正在${action}...`, 'info');
        
        // 更新管理员状态
        const { error } = await supabaseClient
            .from('profiles')
            .update({ is_admin: !isCurrentlyAdmin })
            .eq('id', userId);
        
        if (error) throw error;
        
        // 更新UI
        const adminBadge = userItem.querySelector('.admin-badge');
        if (isCurrentlyAdmin) {
            // 移除管理员
            button.innerHTML = '<i class="fas fa-shield-alt"></i> 设为管理员';
            button.classList.remove('remove-admin-btn');
            button.classList.add('make-admin-btn');
            
            if (adminBadge) {
                adminBadge.remove();
            }
        } else {
            // 设为管理员
            button.innerHTML = '<i class="fas fa-shield-alt"></i> 移除管理员';
            button.classList.remove('make-admin-btn');
            button.classList.add('remove-admin-btn');
            
            // 添加管理员徽章
            const avatarContainer = userItem.querySelector('.user-avatar');
            if (avatarContainer && !adminBadge) {
                const badge = document.createElement('span');
                badge.className = 'admin-badge';
                badge.textContent = '管理员';
                avatarContainer.appendChild(badge);
            }
        }
        
        showAdminNotification(`${action}成功`, 'success');
        
        // 更新管理员列表
        const modal = document.querySelector('.admin-modal');
        if (modal) {
            loadAdminsList(modal);
        }
        
    } catch (error) {
        console.error('切换管理员状态错误:', error);
        showAdminNotification(`${action}失败: ${error.message}`, 'error');
    }
}

// 显示删除用户确认
function showDeleteUserConfirmation(userId, container) {
    const currentUser = window.auth?.getCurrentUser();
    if (userId === currentUser?.id) {
        showAdminNotification('不能删除自己的账户', 'error');
        return;
    }
    
    if (confirm('确定要删除此用户吗？这个操作将：\n• 永久删除用户账户\n• 删除用户上传的所有照片\n• 删除用户的所有评论和点赞\n• 移除用户的关注关系\n\n此操作不可撤销！')) {
        deleteUserAsAdmin(userId, container);
    }
}

// 以管理员身份删除用户
async function deleteUserAsAdmin(userId, container) {
    try {
        showAdminNotification('正在删除用户...', 'info');
        
        // 注意：直接删除用户可能需要服务器端函数
        // 这里使用Supabase的级联删除功能
        
        // 首先获取用户照片，从Cloudinary删除
        const { data: userPhotos, error: photosError } = await supabaseClient
            .from('photos')
            .select('cloudinary_id')
            .eq('user_id', userId);
        
        if (photosError) throw photosError;
        
        // 从Cloudinary删除所有照片
        if (userPhotos && userPhotos.length > 0) {
            for (const photo of userPhotos) {
                if (photo.cloudinary_id) {
                    try {
                        await window.cloudinary.deleteImageFromCloudinary(photo.cloudinary_id);
                    } catch (cloudinaryError) {
                        console.error('从Cloudinary删除错误:', cloudinaryError);
                    }
                }
            }
        }
        
        // 删除用户（Supabase的级联删除会处理相关数据）
        const { error } = await supabaseClient
            .from('profiles')
            .delete()
            .eq('id', userId);
        
        if (error) throw error;
        
        // 从UI中移除
        const userItem = container.querySelector(`[data-user-id="${userId}"]`);
        if (userItem) {
            userItem.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                userItem.remove();
            }, 300);
        }
        
        showAdminNotification('用户删除成功', 'success');
        
        // 更新统计
        if (adminState.stats) {
            adminState.stats.totalUsers = Math.max(0, adminState.stats.totalUsers - 1);
            updateStatsDisplay(document.querySelector('.admin-modal'), adminState.stats);
        }
        
    } catch (error) {
        console.error('管理员删除用户错误:', error);
        showAdminNotification('删除失败: ' + error.message, 'error');
    }
}

// 加载举报
async function loadReportsForAdmin(modal) {
    const reportsList = modal.querySelector('#adminReportsList');
    if (!reportsList) return;
    
    try {
        reportsList.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>加载中...</p>
            </div>
        `;
        
        // 获取举报
        const reports = await getAdminReports();
        
        // 渲染举报列表
        renderAdminReportsList(reportsList, reports);
        
        // 设置筛选
        setupReportsFilter(modal, reports);
        
    } catch (error) {
        console.error('加载管理员举报错误:', error);
        reportsList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>加载举报失败: ${error.message}</p>
            </div>
        `;
    }
}

// 获取管理员举报
async function getAdminReports() {
    try {
        const { data: reports, error } = await supabaseClient
            .from('reports')
            .select(`
                *,
                reporter:profiles!reports_reporter_id_fkey(username, avatar_url),
                target_user:profiles!reports_target_user_id_fkey(username)
            `)
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        // 为照片举报获取照片信息
        const photoReports = reports.filter(r => r.target_type === 'photo');
        const photoIds = photoReports.map(r => r.target_id);
        
        let photos = [];
        if (photoIds.length > 0) {
            const { data: photosData } = await supabaseClient
                .from('photos')
                .select('id, thumbnail_url, title')
                .in('id', photoIds);
            
            photos = photosData || [];
        }
        
        // 为评论举报获取评论信息
        const commentReports = reports.filter(r => r.target_type === 'comment');
        const commentIds = commentReports.map(r => r.target_id);
        
        let comments = [];
        if (commentIds.length > 0) {
            const { data: commentsData } = await supabaseClient
                .from('comments')
                .select('id, content, photo_id')
                .in('id', commentIds);
            
            comments = commentsData || [];
        }
        
        // 合并信息
        return reports.map(report => {
            const enrichedReport = { ...report };
            
            if (report.target_type === 'photo') {
                const photo = photos.find(p => p.id === report.target_id);
                if (photo) {
                    enrichedReport.photo = photo;
                }
            } else if (report.target_type === 'comment') {
                const comment = comments.find(c => c.id === report.target_id);
                if (comment) {
                    enrichedReport.comment = comment;
                }
            }
            
            return enrichedReport;
        });
        
    } catch (error) {
        console.error('获取举报错误:', error);
        throw error;
    }
}

// 渲染管理员举报列表
function renderAdminReportsList(container, reports) {
    if (!reports || reports.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-flag"></i>
                <p>没有举报</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = reports.map(report => {
        const reportDate = new Date(report.created_at).toLocaleDateString('zh-CN');
        let targetInfo = '';
        let targetPreview = '';
        
        switch (report.target_type) {
            case 'photo':
                targetInfo = '照片举报';
                if (report.photo) {
                    targetPreview = `
                        <div class="report-target-preview">
                            <img src="${report.photo.thumbnail_url}" alt="照片预览">
                            <span>${report.photo.title || '无标题'}</span>
                        </div>
                    `;
                }
                break;
            case 'comment':
                targetInfo = '评论举报';
                if (report.comment) {
                    targetPreview = `
                        <div class="report-target-preview">
                            <i class="fas fa-comment"></i>
                            <span>${report.comment.content.substring(0, 50)}${report.comment.content.length > 50 ? '...' : ''}</span>
                        </div>
                    `;
                }
                break;
            case 'user':
                targetInfo = '用户举报';
                targetPreview = `
                    <div class="report-target-preview">
                        <i class="fas fa-user"></i>
                        <span>用户: ${report.target_user?.username || '未知用户'}</span>
                    </div>
                `;
                break;
            default:
                targetInfo = '未知类型举报';
        }
        
        const statusBadge = getReportStatusBadge(report.status);
        
        return `
            <div class="admin-report-item" data-report-id="${report.id}" data-status="${report.status}">
                <div class="report-header">
                    <div class="reporter-info">
                        <img src="${report.reporter?.avatar_url || 'https://ui-avatars.com/api/?name=User&background=bb86fc&color=fff'}" 
                             alt="${report.reporter?.username}">
                        <div>
                            <span class="reporter-name">${report.reporter?.username || '匿名用户'}</span>
                            <span class="report-date">${reportDate}</span>
                        </div>
                    </div>
                    <div class="report-meta">
                        <span class="report-type">${targetInfo}</span>
                        <span class="report-reason">理由: ${report.reason}</span>
                        ${statusBadge}
                    </div>
                </div>
                
                <div class="report-content">
                    <p class="report-description">${report.description || '无详细描述'}</p>
                    ${targetPreview}
                </div>
                
                <div class="report-actions">
                    <button class="btn btn-sm btn-outline view-target-btn" data-target-type="${report.target_type}" data-target-id="${report.target_id}">
                        <i class="fas fa-eye"></i> 查看内容
                    </button>
                    
                    ${report.status === 'pending' ? `
                        <button class="btn btn-sm btn-primary resolve-btn" data-report-id="${report.id}">
                            <i class="fas fa-check"></i> 标记为已处理
                        </button>
                        <button class="btn btn-sm btn-outline dismiss-btn" data-report-id="${report.id}">
                            <i class="fas fa-times"></i> 忽略举报
                        </button>
                    ` : ''}
                    
                    <button class="btn btn-sm btn-outline delete-btn" data-report-id="${report.id}">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // 添加事件监听器
    const reportItems = container.querySelectorAll('.admin-report-item');
    reportItems.forEach(item => {
        // 查看内容按钮
        const viewBtn = item.querySelector('.view-target-btn');
        if (viewBtn) {
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetType = viewBtn.getAttribute('data-target-type');
                const targetId = viewBtn.getAttribute('data-target-id');
                
                switch (targetType) {
                    case 'photo':
                        showImageDetail(targetId);
                        break;
                    case 'comment':
                        // 跳转到评论所在的照片
                        const commentId = targetId;
                        const reportId = item.getAttribute('data-report-id');
                        showCommentInContext(commentId, reportId);
                        break;
                    case 'user':
                        showUserProfile(targetId);
                        break;
                }
            });
        }
        
        // 处理举报按钮
        const resolveBtn = item.querySelector('.resolve-btn');
        if (resolveBtn) {
            resolveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const reportId = resolveBtn.getAttribute('data-report-id');
                resolveReport(reportId, item);
            });
        }
        
        // 忽略举报按钮
        const dismissBtn = item.querySelector('.dismiss-btn');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const reportId = dismissBtn.getAttribute('data-report-id');
                dismissReport(reportId, item);
            });
        }
        
        // 删除举报按钮
        const deleteBtn = item.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const reportId = deleteBtn.getAttribute('data-report-id');
                deleteReport(reportId, item);
            });
        }
    });
}

// 获取举报状态徽章
function getReportStatusBadge(status) {
    let badgeClass = '';
    let badgeText = '';
    
    switch (status) {
        case 'pending':
            badgeClass = 'status-pending';
            badgeText = '待处理';
            break;
        case 'resolved':
            badgeClass = 'status-resolved';
            badgeText = '已处理';
            break;
        case 'dismissed':
            badgeClass = 'status-dismissed';
            badgeText = '已忽略';
            break;
        default:
            badgeClass = 'status-unknown';
            badgeText = '未知';
    }
    
    return `<span class="report-status ${badgeClass}">${badgeText}</span>`;
}

// 设置举报筛选
function setupReportsFilter(modal, reports) {
    const filterSelect = modal.querySelector('#reportsFilter');
    if (!filterSelect) return;
    
    let currentReports = [...reports];
    
    filterSelect.addEventListener('change', () => {
        const filter = filterSelect.value;
        let filtered = [...currentReports];
        
        if (filter !== 'all') {
            filtered = filtered.filter(report => report.status === filter);
        }
        
        const reportsList = modal.querySelector('#adminReportsList');
        if (reportsList) {
            renderAdminReportsList(reportsList, filtered);
        }
    });
}

// 处理举报
async function resolveReport(reportId, reportItem) {
    try {
        showAdminNotification('正在处理举报...', 'info');
        
        // 更新举报状态
        const { error } = await supabaseClient
            .from('reports')
            .update({ 
                status: 'resolved',
                resolved_at: new Date().toISOString(),
                resolved_by: window.auth?.getCurrentUser()?.id
            })
            .eq('id', reportId);
        
        if (error) throw error;
        
        // 更新UI
        reportItem.setAttribute('data-status', 'resolved');
        const statusBadge = reportItem.querySelector('.report-status');
        if (statusBadge) {
            statusBadge.className = 'report-status status-resolved';
            statusBadge.textContent = '已处理';
        }
        
        // 移除处理按钮
        const resolveBtn = reportItem.querySelector('.resolve-btn');
        const dismissBtn = reportItem.querySelector('.dismiss-btn');
        if (resolveBtn) resolveBtn.remove();
        if (dismissBtn) dismissBtn.remove();
        
        showAdminNotification('举报已标记为已处理', 'success');
        
        // 更新统计
        if (adminState.stats) {
            adminState.stats.totalReports = Math.max(0, adminState.stats.totalReports - 1);
            updateStatsDisplay(document.querySelector('.admin-modal'), adminState.stats);
        }
        
    } catch (error) {
        console.error('处理举报错误:', error);
        showAdminNotification('处理失败: ' + error.message, 'error');
    }
}

// 忽略举报
async function dismissReport(reportId, reportItem) {
    try {
        showAdminNotification('正在忽略举报...', 'info');
        
        // 更新举报状态
        const { error } = await supabaseClient
            .from('reports')
            .update({ 
                status: 'dismissed',
                resolved_at: new Date().toISOString(),
                resolved_by: window.auth?.getCurrentUser()?.id
            })
            .eq('id', reportId);
        
        if (error) throw error;
        
        // 更新UI
        reportItem.setAttribute('data-status', 'dismissed');
        const statusBadge = reportItem.querySelector('.report-status');
        if (statusBadge) {
            statusBadge.className = 'report-status status-dismissed';
            statusBadge.textContent = '已忽略';
        }
        
        // 移除处理按钮
        const resolveBtn = reportItem.querySelector('.resolve-btn');
        const dismissBtn = reportItem.querySelector('.dismiss-btn');
        if (resolveBtn) resolveBtn.remove();
        if (dismissBtn) dismissBtn.remove();
        
        showAdminNotification('举报已忽略', 'success');
        
        // 更新统计
        if (adminState.stats) {
            adminState.stats.totalReports = Math.max(0, adminState.stats.totalReports - 1);
            updateStatsDisplay(document.querySelector('.admin-modal'), adminState.stats);
        }
        
    } catch (error) {
        console.error('忽略举报错误:', error);
        showAdminNotification('忽略失败: ' + error.message, 'error');
    }
}

// 删除举报
async function deleteReport(reportId, reportItem) {
    if (!confirm('确定要删除此举报吗？')) return;
    
    try {
        showAdminNotification('正在删除举报...', 'info');
        
        // 删除举报
        const { error } = await supabaseClient
            .from('reports')
            .delete()
            .eq('id', reportId);
        
        if (error) throw error;
        
        // 从UI移除
        reportItem.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            reportItem.remove();
        }, 300);
        
        showAdminNotification('举报删除成功', 'success');
        
    } catch (error) {
        console.error('删除举报错误:', error);
        showAdminNotification('删除失败: ' + error.message, 'error');
    }
}

// 显示评论在上下文中
async function showCommentInContext(commentId, reportId) {
    try {
        // 获取评论详情
        const { data: comment, error } = await supabaseClient
            .from('comments')
            .select(`
                *,
                profiles (
                    username,
                    avatar_url
                ),
                photos (
                    id
                )
            `)
            .eq('id', commentId)
            .single();
        
        if (error) throw error;
        
        // 显示照片详情，并聚焦到该评论
        if (comment.photos?.id) {
            showImageDetail(comment.photos.id, true); // 第二个参数表示聚焦评论
            
            // 标记举报为已读
            await supabaseClient
                .from('reports')
                .update({ viewed: true })
                .eq('id', reportId);
        }
        
    } catch (error) {
        console.error('显示评论错误:', error);
        showAdminNotification('无法显示评论', 'error');
    }
}

// 显示举报模态框
function showReportsModal(reports, targetType, targetId) {
    const modal = document.createElement('div');
    modal.className = 'modal reports-detail-modal';
    
    let targetTitle = '';
    switch (targetType) {
        case 'photo':
            targetTitle = '照片举报详情';
            break;
        case 'comment':
            targetTitle = '评论举报详情';
            break;
        case 'user':
            targetTitle = '用户举报详情';
            break;
        default:
            targetTitle = '举报详情';
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h3><i class="fas fa-flag"></i> ${targetTitle}</h3>
            
            <div class="reports-detail-list" id="reportsDetailList">
                ${reports.map(report => `
                    <div class="report-detail-item">
                        <div class="reporter-header">
                            <img src="${report.reporter?.avatar_url || 'https://ui-avatars.com/api/?name=User&background=bb86fc&color=fff'}" 
                                 alt="${report.reporter?.username}">
                            <div>
                                <strong>${report.reporter?.username || '匿名用户'}</strong>
                                <span>${new Date(report.created_at).toLocaleString('zh-CN')}</span>
                            </div>
                            <span class="report-reason">${report.reason}</span>
                        </div>
                        <div class="report-description">
                            <p>${report.description || '无详细描述'}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="reports-actions">
                <button class="btn btn-primary" id="resolveAllBtn">
                    <i class="fas fa-check"></i> 全部标记为已处理
                </button>
                <button class="btn btn-outline" id="dismissAllBtn">
                    <i class="fas fa-times"></i> 全部忽略
                </button>
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
    
    // 全部处理按钮
    const resolveAllBtn = modal.querySelector('#resolveAllBtn');
    if (resolveAllBtn) {
        resolveAllBtn.addEventListener('click', () => {
            if (confirm('确定要将所有举报标记为已处理吗？')) {
                resolveAllReports(reports.map(r => r.id));
                modal.remove();
            }
        });
    }
    
    // 全部忽略按钮
    const dismissAllBtn = modal.querySelector('#dismissAllBtn');
    if (dismissAllBtn) {
        dismissAllBtn.addEventListener('click', () => {
            if (confirm('确定要忽略所有举报吗？')) {
                dismissAllReports(reports.map(r => r.id));
                modal.remove();
            }
        });
    }
}

// 处理所有举报
async function resolveAllReports(reportIds) {
    try {
        showAdminNotification('正在处理所有举报...', 'info');
        
        const { error } = await supabaseClient
            .from('reports')
            .update({ 
                status: 'resolved',
                resolved_at: new Date().toISOString(),
                resolved_by: window.auth?.getCurrentUser()?.id
            })
            .in('id', reportIds);
        
        if (error) throw error;
        
        showAdminNotification('所有举报已标记为已处理', 'success');
        
        // 刷新举报列表
        const adminModal = document.querySelector('.admin-modal');
        if (adminModal) {
            loadReportsForAdmin(adminModal);
        }
        
    } catch (error) {
        console.error('处理所有举报错误:', error);
        showAdminNotification('处理失败: ' + error.message, 'error');
    }
}

// 忽略所有举报
async function dismissAllReports(reportIds) {
    try {
        showAdminNotification('正在忽略所有举报...', 'info');
        
        const { error } = await supabaseClient
            .from('reports')
            .update({ 
                status: 'dismissed',
                resolved_at: new Date().toISOString(),
                resolved_by: window.auth?.getCurrentUser()?.id
            })
            .in('id', reportIds);
        
        if (error) throw error;
        
        showAdminNotification('所有举报已忽略', 'success');
        
        // 刷新举报列表
        const adminModal = document.querySelector('.admin-modal');
        if (adminModal) {
            loadReportsForAdmin(adminModal);
        }
        
    } catch (error) {
        console.error('忽略所有举报错误:', error);
        showAdminNotification('忽略失败: ' + error.message, 'error');
    }
}

// 加载评论
async function loadCommentsForAdmin(modal) {
    const commentsList = modal.querySelector('#adminCommentsList');
    if (!commentsList) return;
    
    try {
        commentsList.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>加载中...</p>
            </div>
        `;
        
        // 获取评论
        const comments = await getAdminComments();
        
        // 渲染评论列表
        renderAdminCommentsList(commentsList, comments);
        
        // 设置搜索和筛选
        setupCommentsFilter(modal, comments);
        
    } catch (error) {
        console.error('加载管理员评论错误:', error);
        commentsList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>加载评论失败: ${error.message}</p>
            </div>
        `;
    }
}

// 获取管理员评论
async function getAdminComments() {
    try {
        const { data: comments, error } = await supabaseClient
            .from('comments')
            .select(`
                *,
                profiles (
                    username,
                    avatar_url
                ),
                photos (
                    id,
                    thumbnail_url,
                    title
                )
            `)
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        // 获取评论的举报数量
        const commentIds = comments.map(c => c.id);
        let reportCounts = {};
        
        if (commentIds.length > 0) {
            const { data: reports } = await supabaseClient
                .from('reports')
                .select('target_id')
                .eq('target_type', 'comment')
                .in('target_id', commentIds)
                .eq('status', 'pending');
            
            if (reports) {
                reportCounts = reports.reduce((acc, report) => {
                    acc[report.target_id] = (acc[report.target_id] || 0) + 1;
                    return acc;
                }, {});
            }
        }
        
        // 合并举报数量
        return comments.map(comment => ({
            ...comment,
            report_count: reportCounts[comment.id] || 0
        }));
        
    } catch (error) {
        console.error('获取评论错误:', error);
        throw error;
    }
}

// 渲染管理员评论列表
function renderAdminCommentsList(container, comments) {
    if (!comments || comments.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-comments"></i>
                <p>没有评论</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = comments.map(comment => {
        const commentDate = new Date(comment.created_at).toLocaleDateString('zh-CN');
        const reportCount = comment.report_count || 0;
        
        return `
            <div class="admin-comment-item" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <div class="comment-author">
                        <img src="${comment.profiles?.avatar_url || 'https://ui-avatars.com/api/?name=User&background=bb86fc&color=fff'}" 
                             alt="${comment.profiles?.username}">
                        <div>
                            <span class="author-name">${comment.profiles?.username || '未知用户'}</span>
                            <span class="comment-date">${commentDate}</span>
                        </div>
                    </div>
                    ${reportCount > 0 ? `<span class="report-badge">${reportCount} 举报</span>` : ''}
                </div>
                
                <div class="comment-content">
                    <p>${comment.content}</p>
                </div>
                
                <div class="comment-context">
                    <div class="comment-photo">
                        <img src="${comment.photos?.thumbnail_url}" alt="相关照片">
                        <span>${comment.photos?.title || '相关照片'}</span>
                    </div>
                </div>
                
                <div class="comment-actions">
                    <button class="btn btn-sm btn-outline view-context-btn" data-photo-id="${comment.photos?.id}" data-comment-id="${comment.id}">
                        <i class="fas fa-eye"></i> 查看上下文
                    </button>
                    <button class="btn btn-sm btn-outline delete-btn" data-comment-id="${comment.id}">
                        <i class="fas fa-trash"></i> 删除评论
                    </button>
                    ${reportCount > 0 ? `
                        <button class="btn btn-sm btn-outline reports-btn" data-comment-id="${comment.id}">
                            <i class="fas fa-flag"></i> 查看举报
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    // 添加事件监听器
    const commentItems = container.querySelectorAll('.admin-comment-item');
    commentItems.forEach(item => {
        // 查看上下文按钮
        const viewBtn = item.querySelector('.view-context-btn');
        if (viewBtn) {
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const photoId = viewBtn.getAttribute('data-photo-id');
                const commentId = viewBtn.getAttribute('data-comment-id');
                if (photoId) {
                    showImageDetail(photoId, true, commentId);
                }
            });
        }
        
        // 删除评论按钮
        const deleteBtn = item.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const commentId = deleteBtn.getAttribute('data-comment-id');
                showDeleteCommentConfirmation(commentId, item);
            });
        }
        
        // 举报按钮
        const reportsBtn = item.querySelector('.reports-btn');
        if (reportsBtn) {
            reportsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const commentId = reportsBtn.getAttribute('data-comment-id');
                showCommentReports(commentId);
            });
        }
    });
}

// 设置评论筛选
function setupCommentsFilter(modal, comments) {
    const searchInput = modal.querySelector('#searchCommentsAdmin');
    const filterSelect = modal.querySelector('#commentsFilter');
    
    if (!searchInput || !filterSelect) return;
    
    let currentComments = [...comments];
    
    // 搜索功能
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        filterAndDisplayComments(modal, currentComments, query, filterSelect.value);
    });
    
    // 筛选功能
    filterSelect.addEventListener('change', () => {
        filterAndDisplayComments(modal, currentComments, searchInput.value, filterSelect.value);
    });
}

// 筛选和显示评论
function filterAndDisplayComments(modal, comments, searchQuery, filter) {
    let filtered = [...comments];
    
    // 应用搜索
    if (searchQuery) {
        filtered = filtered.filter(comment => 
            comment.content.toLowerCase().includes(searchQuery) ||
            comment.profiles?.username.toLowerCase().includes(searchQuery)
        );
    }
    
    // 应用筛选
    switch (filter) {
        case 'reported':
            // 筛选有举报的评论
            filtered = filtered.filter(comment => comment.report_count > 0);
            break;
        case 'recent':
            // 最近的评论（24小时内）
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            filtered = filtered.filter(comment => new Date(comment.created_at) > yesterday);
            break;
        // 'all' 不应用额外筛选
    }
    
    // 重新渲染
    const commentsList = modal.querySelector('#adminCommentsList');
    if (commentsList) {
        renderAdminCommentsList(commentsList, filtered);
    }
}

// 显示删除评论确认
function showDeleteCommentConfirmation(commentId, commentItem) {
    if (confirm('确定要删除此评论吗？这个操作不可撤销。')) {
        deleteCommentAsAdmin(commentId, commentItem);
    }
}

// 以管理员身份删除评论
async function deleteCommentAsAdmin(commentId, commentItem) {
    try {
        showAdminNotification('正在删除评论...', 'info');
        
        // 删除评论
        const { error } = await supabaseClient
            .from('comments')
            .delete()
            .eq('id', commentId);
        
        if (error) throw error;
        
        // 从UI中移除
        commentItem.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            commentItem.remove();
        }, 300);
        
        showAdminNotification('评论删除成功', 'success');
        
    } catch (error) {
        console.error('管理员删除评论错误:', error);
        showAdminNotification('删除失败: ' + error.message, 'error');
    }
}

// 显示评论举报
async function showCommentReports(commentId) {
    try {
        // 获取评论举报
        const { data: reports, error } = await supabaseClient
            .from('reports')
            .select(`
                *,
                reporter:profiles!reports_reporter_id_fkey(username, avatar_url)
            `)
            .eq('target_id', commentId)
            .eq('target_type', 'comment')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!reports || reports.length === 0) {
            showAdminNotification('此评论没有举报', 'info');
            return;
        }
        
        // 显示举报详情
        showReportsModal(reports, 'comment', commentId);
        
    } catch (error) {
        console.error('获取评论举报错误:', error);
        showAdminNotification('加载举报失败', 'error');
    }
}

// 加载管理员列表
async function loadAdminsList(modal) {
    const adminsList = modal.querySelector('#adminsList');
    if (!adminsList) return;
    
    try {
        // 获取所有管理员
        const { data: admins, error } = await supabaseClient
            .from('profiles')
            .select('id, username, avatar_url, email, created_at')
            .eq('is_admin', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        adminsList.innerHTML = '';
        
        if (!admins || admins.length === 0) {
            adminsList.innerHTML = '<p>没有管理员</p>';
            return;
        }
        
        admins.forEach(admin => {
            const adminItem = document.createElement('div');
            adminItem.className = 'admin-item';
            adminItem.innerHTML = `
                <img src="${admin.avatar_url || 'https://ui-avatars.com/api/?name=User&background=bb86fc&color=fff'}" 
                     alt="${admin.username}" 
                     class="avatar-sm">
                <div class="admin-info">
                    <span class="admin-name">${admin.username}</span>
                    <span class="admin-email">${admin.email || '无邮箱'}</span>
                </div>
                <button class="btn btn-sm btn-outline remove-admin-btn" data-user-id="${admin.id}">
                    <i class="fas fa-user-minus"></i> 移除
                </button>
            `;
            
            adminsList.appendChild(adminItem);
            
            // 添加移除按钮事件
            const removeBtn = adminItem.querySelector('.remove-admin-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    const userId = removeBtn.getAttribute('data-user-id');
                    removeAdmin(userId, adminItem);
                });
            }
        });
        
        // 添加管理员按钮
        const addAdminBtn = modal.querySelector('#addAdminBtn');
        if (addAdminBtn) {
            addAdminBtn.addEventListener('click', () => {
                showAddAdminModal(modal);
            });
        }
        
        // 保存设置按钮
        const saveSettingsBtn = modal.querySelector('#saveSettingsBtn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                saveAdminSettings(modal);
            });
        }
        
    } catch (error) {
        console.error('加载管理员列表错误:', error);
        adminsList.innerHTML = '<p class="error">加载失败</p>';
    }
}

// 移除管理员
async function removeAdmin(userId, adminItem) {
    const currentUser = window.auth?.getCurrentUser();
    if (!currentUser) return;
    
    if (userId === currentUser.id) {
        showAdminNotification('不能移除自己的管理员权限', 'warning');
        return;
    }
    
    if (!confirm('确定要移除此用户的管理员权限吗？')) return;
    
    try {
        showAdminNotification('正在移除管理员...', 'info');
        
        // 更新管理员状态
        const { error } = await supabaseClient
            .from('profiles')
            .update({ is_admin: false })
            .eq('id', userId);
        
        if (error) throw error;
        
        // 从UI移除
        adminItem.remove();
        
        showAdminNotification('管理员移除成功', 'success');
        
        // 刷新用户列表
        const adminModal = document.querySelector('.admin-modal');
        if (adminModal) {
            loadUsersForAdmin(adminModal);
        }
        
    } catch (error) {
        console.error('移除管理员错误:', error);
        showAdminNotification('移除失败: ' + error.message, 'error');
    }
}

// 显示添加管理员模态框
function showAddAdminModal(modal) {
    const addModal = document.createElement('div');
    addModal.className = 'modal add-admin-modal';
    addModal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h3><i class="fas fa-user-plus"></i> 添加管理员</h3>
            
            <div class="form-group">
                <label>搜索用户</label>
                <input type="text" id="searchUserForAdmin" placeholder="输入用户名或邮箱...">
                <div class="user-search-results" id="adminUserSearchResults"></div>
            </div>
            
            <div class="selected-user" id="selectedUserForAdmin" style="display: none;">
                <h4>已选择的用户</h4>
                <div class="user-info" id="selectedUserInfo"></div>
            </div>
            
            <div class="form-actions">
                <button class="btn btn-outline" id="cancelAddAdmin">取消</button>
                <button class="btn btn-primary" id="confirmAddAdmin" disabled>添加为管理员</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(addModal);
    addModal.style.display = 'flex';
    
    // 关闭按钮
    const closeBtn = addModal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            addModal.remove();
        });
    }
    
    // 点击背景关闭
    addModal.addEventListener('click', (e) => {
        if (e.target === addModal) {
            addModal.remove();
        }
    });
    
    // 取消按钮
    const cancelBtn = addModal.querySelector('#cancelAddAdmin');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            addModal.remove();
        });
    }
    
    // 搜索用户
    const searchInput = addModal.querySelector('#searchUserForAdmin');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            searchUsersForAdmin(searchInput.value, addModal);
        }, 300));
    }
    
    // 确认添加按钮
    const confirmBtn = addModal.querySelector('#confirmAddAdmin');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const userId = confirmBtn.getAttribute('data-user-id');
            if (userId) {
                addUserAsAdmin(userId, addModal, modal);
            }
        });
    }
}

// 搜索用户用于添加管理员
async function searchUsersForAdmin(query, modal) {
    const resultsDiv = modal.querySelector('#adminUserSearchResults');
    if (!resultsDiv) return;
    
    if (!query || query.length < 2) {
        resultsDiv.innerHTML = '';
        return;
    }
    
    try {
        const { data: users, error } = await supabaseClient
            .from('profiles')
            .select('id, username, avatar_url, email, is_admin')
            .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(10);
        
        if (error) throw error;
        
        if (!users || users.length === 0) {
            resultsDiv.innerHTML = '<div class="no-results">未找到用户</div>';
            return;
        }
        
        resultsDiv.innerHTML = users.map(user => `
            <div class="user-search-result ${user.is_admin ? 'is-admin' : ''}" data-user-id="${user.id}">
                <img src="${user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}&background=bb86fc&color=fff`}" 
                     alt="${user.username}" 
                     class="avatar-sm">
                <div class="user-info">
                    <span class="user-name">${user.username}</span>
                    <span class="user-email">${user.email || '无邮箱'}</span>
                </div>
                ${user.is_admin ? '<span class="admin-tag">管理员</span>' : ''}
            </div>
        `).join('');
        
        // 添加点击事件
        const resultItems = resultsDiv.querySelectorAll('.user-search-result:not(.is-admin)');
        resultItems.forEach(item => {
            item.addEventListener('click', () => {
                const userId = item.getAttribute('data-user-id');
                const userName = item.querySelector('.user-name').textContent;
                const userEmail = item.querySelector('.user-email').textContent;
                const userAvatar = item.querySelector('img').src;
                
                selectUserForAdmin(userId, userName, userEmail, userAvatar, modal);
            });
        });
        
    } catch (error) {
        console.error('搜索用户错误:', error);
        resultsDiv.innerHTML = '<div class="error">搜索失败</div>';
    }
}

// 选择用户作为管理员
function selectUserForAdmin(userId, username, email, avatar, modal) {
    const selectedDiv = modal.querySelector('#selectedUserForAdmin');
    const selectedInfo = modal.querySelector('#selectedUserInfo');
    const confirmBtn = modal.querySelector('#confirmAddAdmin');
    
    if (!selectedDiv || !selectedInfo || !confirmBtn) return;
    
    selectedInfo.innerHTML = `
        <img src="${avatar}" alt="${username}" class="avatar-md">
        <div>
            <strong>${username}</strong>
            <p>${email}</p>
        </div>
    `;
    
    selectedDiv.style.display = 'block';
    confirmBtn.disabled = false;
    confirmBtn.setAttribute('data-user-id', userId);
    
    // 清空搜索结果
    const resultsDiv = modal.querySelector('#adminUserSearchResults');
    if (resultsDiv) {
        resultsDiv.innerHTML = '';
    }
}

// 添加用户为管理员
async function addUserAsAdmin(userId, addModal, mainModal) {
    try {
        showAdminNotification('正在添加管理员...', 'info');
        
        // 更新用户为管理员
        const { error } = await supabaseClient
            .from('profiles')
            .update({ is_admin: true })
            .eq('id', userId);
        
        if (error) throw error;
        
        // 关闭添加模态框
        addModal.remove();
        
        showAdminNotification('管理员添加成功', 'success');
        
        // 刷新管理员列表
        loadAdminsList(mainModal);
        
        // 刷新用户列表
        loadUsersForAdmin(mainModal);
        
    } catch (error) {
        console.error('添加管理员错误:', error);
        showAdminNotification('添加失败: ' + error.message, 'error');
    }
}

// 加载设置数据
async function loadSettingsData(modal) {
    // 设置已经在前端加载了
    // 这里可以加载额外的设置数据
    console.log('加载设置数据');
}

// 保存管理员设置
async function saveAdminSettings(modal) {
    try {
        showAdminNotification('正在保存设置...', 'info');
        
        const settings = {
            maintenance_mode: modal.querySelector('#siteMaintenance')?.checked || false,
            registration_enabled: modal.querySelector('#siteRegistration')?.checked !== false,
            uploads_enabled: modal.querySelector('#siteUploads')?.checked !== false,
            max_file_size: parseInt(modal.querySelector('#maxFileSize')?.value) || 25,
            moderation_level: modal.querySelector('#contentModeration')?.value || 'reported'
        };
        
        // 保存设置到数据库
        // 注意：这里需要创建site_settings表
        const { error } = await supabaseClient
            .from('site_settings')
            .upsert([settings], { onConflict: 'id' });
        
        if (error) throw error;
        
        showAdminNotification('设置保存成功', 'success');
        
        // 更新本地状态
        if (adminState.stats) {
            adminState.stats.site_settings = settings;
        }
        
    } catch (error) {
        console.error('保存设置错误:', error);
        showAdminNotification('保存失败: ' + error.message, 'error');
    }
}

// 设置管理员事件监听器
function setupAdminEventListeners() {
    // 这里可以添加全局管理员事件监听器
    console.log('设置管理员事件监听器');
}

// 设置管理员实时更新
function setupAdminRealTime() {
    console.log('设置管理员实时更新');
    
    // 监听照片变化
    supabaseClient
        .channel('admin-photos')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'photos' }, 
            (payload) => {
                console.log('管理员: 照片变化', payload);
                // 刷新照片列表
                const adminModal = document.querySelector('.admin-modal');
                if (adminModal && adminState.currentSection === 'photos') {
                    loadPhotosForAdmin(adminModal);
                }
            }
        )
        .subscribe();
    
    // 监听用户变化
    supabaseClient
        .channel('admin-users')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'profiles' }, 
            (payload) => {
                console.log('管理员: 用户变化', payload);
                // 刷新用户列表
                const adminModal = document.querySelector('.admin-modal');
                if (adminModal && adminState.currentSection === 'users') {
                    loadUsersForAdmin(adminModal);
                }
            }
        )
        .subscribe();
    
    // 监听举报变化
    supabaseClient
        .channel('admin-reports')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'reports' }, 
            (payload) => {
                console.log('管理员: 举报变化', payload);
                // 刷新举报列表
                const adminModal = document.querySelector('.admin-modal');
                if (adminModal && adminState.currentSection === 'reports') {
                    loadReportsForAdmin(adminModal);
                }
            }
        )
        .subscribe();
}

// 设置管理员快捷键
function setupAdminShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+Shift+A 打开管理员面板
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            if (adminState.isAdmin) {
                showAdminPanel();
            }
        }
    });
}

// 清理管理员缓存
function clearAdminCache() {
    if (window.feed && typeof window.feed.clearAllCache === 'function') {
        window.feed.clearAllCache();
    }
    
    // 清理本地存储的管理员数据
    localStorage.removeItem('admin_stats_cache');
    
    showAdminNotification('缓存清理完成', 'success');
}

// 导出管理员数据
async function exportAdminData() {
    try {
        showAdminNotification('正在准备数据导出...', 'info');
        
        // 获取所有数据
        const [
            usersData,
            photosData,
            commentsData,
            reportsData
        ] = await Promise.all([
            supabaseClient.from('profiles').select('*'),
            supabaseClient.from('photos').select('*'),
            supabaseClient.from('comments').select('*'),
            supabaseClient.from('reports').select('*')
        ]);
        
        const exportData = {
            export_date: new Date().toISOString(),
            export_type: 'admin_full',
            users: usersData.data || [],
            photos: photosData.data || [],
            comments: commentsData.data || [],
            reports: reportsData.data || []
        };
        
        // 转换为JSON
        const jsonString = JSON.stringify(exportData, null, 2);
        
        // 创建下载
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showAdminNotification('数据导出成功', 'success');
        
    } catch (error) {
        console.error('导出数据错误:', error);
        showAdminNotification('导出失败: ' + error.message, 'error');
    }
}

// 显示管理员通知
function showAdminNotification(message, type = 'info') {
    // 使用系统的通知功能
    if (window.feed && typeof window.feed.showNotification === 'function') {
        window.feed.showNotification(`[管理员] ${message}`, type);
    } else {
        console.log(`[管理员] ${type}: ${message}`);
    }
}

// 显示图片详情
function showImageDetail(photoId, focusComment = false, commentId = null) {
    if (window.feed && typeof window.feed.showImageDetail === 'function') {
        window.feed.showImageDetail(photoId, focusComment);
        
        // 如果指定了评论ID，可以滚动到该评论
        if (commentId) {
            // 这里可以在图片详情页面高亮显示指定评论
            console.log('需要滚动到评论:', commentId);
        }
    }
}

// 显示用户个人主页
function showUserProfile(userId) {
    if (window.profile && typeof window.profile.showUserProfile === 'function') {
        window.profile.showUserProfile(userId);
    }
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 格式化时间间隔
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 7) {
        return date.toLocaleDateString('zh-CN');
    } else if (diffDay > 0) {
        return `${diffDay}天前`;
    } else if (diffHour > 0) {
        return `${diffHour}小时前`;
    } else if (diffMin > 0) {
        return `${diffMin}分钟前`;
    } else {
        return '刚刚';
    }
}

// 导出管理员模块
window.admin = {
    init: initAdminModule,
    showAdminPanel,
    checkAdminStatus,
    getState: () => ({ ...adminState })
};

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    // 延迟初始化，等待认证模块
    setTimeout(() => {
        initAdminModule();
    }, 5000);
});

console.log('管理员模块完整加载完成');