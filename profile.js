/**
 * 用户个人主页管理模块
 * 处理用户资料显示、照片展示、关注管理
 */

// 个人主页状态
let profileState = {
    currentUserId: null,
    currentProfile: null,
    currentTab: 'uploads',
    photos: [],
    likedPhotos: [],
    followers: [],
    following: [],
    isLoading: false,
    isCurrentUser: false
};

// 初始化个人主页模块
function initProfileModule() {
    console.log('正在初始化个人主页模块...');
    
    // 设置事件监听器
    setupProfileEventListeners();
    
    // 设置个人主页模态框事件
    setupProfileModalEvents();
    
    console.log('个人主页模块初始化完成');
}

// 设置个人主页事件监听器
function setupProfileEventListeners() {
    // 我的主页链接
    const profileLink = document.getElementById('profileLink');
    const myProfileLink = document.getElementById('myProfileLink');
    
    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            showCurrentUserProfile();
        });
    }
    
    if (myProfileLink) {
        myProfileLink.addEventListener('click', (e) => {
            e.preventDefault();
            showCurrentUserProfile();
        });
    }
    
    // 我的上传链接
    const myUploadsLink = document.getElementById('myUploadsLink');
    if (myUploadsLink) {
        myUploadsLink.addEventListener('click', (e) => {
            e.preventDefault();
            showCurrentUserProfile('uploads');
        });
    }
}

// 设置个人主页模态框事件
function setupProfileModalEvents() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    
    // 关闭按钮
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeProfileModal);
    }
    
    // 点击模态框背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeProfileModal();
        }
    });
    
    // ESC键关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeProfileModal();
        }
    });
    
    // 标签切换
    const tabs = modal.querySelectorAll('.profile-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', handleProfileTabClick);
    });
}

// 显示当前用户个人主页
async function showCurrentUserProfile(defaultTab = 'uploads') {
    const currentUser = window.auth?.getCurrentUser();
    const currentProfile = window.auth?.getCurrentProfile();
    
    if (!currentUser || !currentProfile) {
        showNotification('请先登录', 'warning');
        showAuthModal();
        return;
    }
    
    await showUserProfile(currentUser.id, defaultTab, true);
}

// 显示用户个人主页
async function showUserProfile(userId, defaultTab = 'uploads', isCurrentUser = false) {
    try {
        // 重置状态
        profileState = {
            currentUserId: userId,
            currentProfile: null,
            currentTab: defaultTab,
            photos: [],
            likedPhotos: [],
            followers: [],
            following: [],
            isLoading: true,
            isCurrentUser: isCurrentUser
        };
        
        // 显示加载状态
        showProfileLoading();
        
        // 获取用户资料
        const profile = await window.supabaseFunctions.getUserProfile(userId);
        if (!profile) {
            throw new Error('用户不存在');
        }
        
        profileState.currentProfile = profile;
        
        // 获取用户统计
        const stats = await window.supabaseFunctions.getUserStats(userId);
        
        // 获取关注状态（如果不是当前用户）
        let followStatus = { following: false };
        if (!isCurrentUser) {
            const currentUser = window.auth?.getCurrentUser();
            if (currentUser) {
                followStatus = await window.supabaseFunctions.getUserFollowStatus(currentUser.id, userId);
            }
        }
        
        // 更新模态框内容
        updateProfileModal(profile, stats, followStatus);
        
        // 加载初始数据
        await loadProfileData(defaultTab);
        
        // 显示模态框
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
        
    } catch (error) {
        console.error('显示用户个人主页错误:', error);
        showNotification('加载个人主页失败', 'error');
        closeProfileModal();
    } finally {
        profileState.isLoading = false;
        hideProfileLoading();
    }
}

// 显示个人主页加载状态
function showProfileLoading() {
    const profileGallery = document.getElementById('profileGallery');
    if (profileGallery) {
        profileGallery.innerHTML = `
            <div class="profile-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>加载中...</p>
            </div>
        `;
    }
}

// 隐藏个人主页加载状态
function hideProfileLoading() {
    const loading = document.querySelector('.profile-loading');
    if (loading) {
        loading.remove();
    }
}

// 更新个人主页模态框
function updateProfileModal(profile, stats, followStatus) {
    const profileAvatar = document.getElementById('profileAvatar');
    const profileUsername = document.getElementById('profileUsername');
    const postCount = document.getElementById('postCount');
    const followerCount = document.getElementById('followerCount');
    const followingCount = document.getElementById('followingCount');
    const followProfileBtn = document.getElementById('followProfileBtn');
    
    // 更新头像
    if (profileAvatar) {
        profileAvatar.src = profile.avatar_url || 
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=bb86fc&color=fff`;
        profileAvatar.alt = profile.username;
    }
    
    // 更新用户名
    if (profileUsername) {
        profileUsername.textContent = profile.username || '用户';
    }
    
    // 更新统计
    if (postCount) {
        postCount.textContent = stats.photosCount || 0;
        postCount.setAttribute('title', `${stats.photosCount} 张照片`);
    }
    
    if (followerCount) {
        followerCount.textContent = stats.followersCount || 0;
        followerCount.setAttribute('title', `${stats.followersCount} 个粉丝`);
    }
    
    if (followingCount) {
        followingCount.textContent = stats.followingCount || 0;
        followingCount.setAttribute('title', `关注了 ${stats.followingCount} 人`);
    }
    
    // 更新关注按钮
    if (followProfileBtn) {
        if (profileState.isCurrentUser) {
            followProfileBtn.style.display = 'none';
        } else {
            followProfileBtn.style.display = 'block';
            
            if (followStatus.following) {
                followProfileBtn.innerHTML = '<i class="fas fa-user-check"></i> 已关注';
                followProfileBtn.classList.add('following');
            } else {
                followProfileBtn.innerHTML = '<i class="fas fa-user-plus"></i> 关注';
                followProfileBtn.classList.remove('following');
            }
            
            // 移除现有事件监听器并添加新的
            followProfileBtn.replaceWith(followProfileBtn.cloneNode(true));
            const newFollowBtn = document.getElementById('followProfileBtn');
            newFollowBtn.addEventListener('click', () => {
                handleProfileFollow(profile.id, newFollowBtn);
            });
        }
    }
    
    // 更新标签状态
    updateProfileTabs();
    
    // 添加统计点击事件
    setupStatsClickEvents();
}

// 更新个人主页标签
function updateProfileTabs() {
    const tabs = document.querySelectorAll('.profile-tab');
    tabs.forEach(tab => {
        const tabType = tab.getAttribute('data-tab');
        
        if (tabType === profileState.currentTab) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
}

// 设置统计点击事件
function setupStatsClickEvents() {
    // 作品数点击
    const postCount = document.getElementById('postCount');
    if (postCount) {
        postCount.addEventListener('click', () => {
            switchTab('uploads');
        });
    }
    
    // 粉丝数点击
    const followerCount = document.getElementById('followerCount');
    if (followerCount) {
        followerCount.addEventListener('click', async () => {
            await showFollowersList();
        });
    }
    
    // 关注数点击
    const followingCount = document.getElementById('followingCount');
    if (followingCount) {
        followingCount.addEventListener('click', async () => {
            await showFollowingList();
        });
    }
}

// 切换标签
function switchTab(tab) {
    if (profileState.currentTab === tab) return;
    
    profileState.currentTab = tab;
    updateProfileTabs();
    loadProfileData(tab);
}

// 处理标签点击
function handleProfileTabClick(e) {
    const tab = e.currentTarget;
    const tabType = tab.getAttribute('data-tab');
    
    switchTab(tabType);
}

// 加载个人主页数据
async function loadProfileData(tab) {
    if (!profileState.currentUserId) return;
    
    profileState.isLoading = true;
    showProfileLoading();
    
    try {
        switch (tab) {
            case 'uploads':
                await loadUserPhotos();
                break;
            case 'likes':
                await loadUserLikedPhotos();
                break;
            default:
                await loadUserPhotos();
                break;
        }
    } catch (error) {
        console.error(`加载${tab}数据错误:`, error);
        showProfileError(`加载失败: ${error.message}`);
    } finally {
        profileState.isLoading = false;
        hideProfileLoading();
    }
}

// 加载用户照片
async function loadUserPhotos() {
    try {
        const photos = await window.supabaseFunctions.getPhotos(0, 50, 'newest', profileState.currentUserId);
        profileState.photos = photos;
        
        renderProfileGallery(photos, 'uploads');
    } catch (error) {
        throw error;
    }
}

// 加载用户喜欢的照片
async function loadUserLikedPhotos() {
    try {
        const currentUser = window.auth?.getCurrentUser();
        const userId = profileState.isCurrentUser ? currentUser?.id : profileState.currentUserId;
        
        if (!userId) {
            throw new Error('无法获取用户ID');
        }
        
        const likes = await window.supabaseFunctions.getUserLikes(userId);
        const photoIds = likes.map(like => like.photo_id).filter(id => id);
        
        let likedPhotos = [];
        if (photoIds.length > 0) {
            likedPhotos = await window.supabaseFunctions.batchGetPhotos(photoIds);
        }
        
        profileState.likedPhotos = likedPhotos;
        
        renderProfileGallery(likedPhotos, 'likes');
    } catch (error) {
        throw error;
    }
}

// 渲染个人主页画廊
function renderProfileGallery(photos, type) {
    const profileGallery = document.getElementById('profileGallery');
    if (!profileGallery) return;
    
    if (!photos || photos.length === 0) {
        showProfileEmptyState(type);
        return;
    }
    
    profileGallery.innerHTML = '';
    
    photos.forEach((photo, index) => {
        const photoElement = createProfilePhotoElement(photo, index);
        profileGallery.appendChild(photoElement);
    });
}

// 创建个人主页照片元素
function createProfilePhotoElement(photo, index) {
    const div = document.createElement('div');
    div.className = 'profile-photo-item';
    div.style.animationDelay = `${index * 0.05}s`;
    
    div.innerHTML = `
        <img src="${photo.thumbnail_url || photo.image_url}" 
             alt="${photo.title || '照片'}" 
             class="profile-image"
             data-photo-id="${photo.id}"
             loading="lazy">
        <div class="photo-overlay">
            <div class="photo-stats">
                <span><i class="fas fa-heart"></i> ${photo.likes_count || 0}</span>
                <span><i class="fas fa-comment"></i> ${photo.comments_count || 0}</span>
            </div>
        </div>
    `;
    
    // 添加点击事件
    const img = div.querySelector('.profile-image');
    if (img) {
        img.addEventListener('click', () => {
            showImageDetail(photo.id);
        });
    }
    
    return div;
}

// 显示个人主页空状态
function showProfileEmptyState(type) {
    const profileGallery = document.getElementById('profileGallery');
    if (!profileGallery) return;
    
    let message = '';
    let icon = '';
    
    switch (type) {
        case 'uploads':
            message = profileState.isCurrentUser ? 
                '你还没有上传过照片，快来上传第一张吧！' : 
                '这个用户还没有上传过照片';
            icon = 'fas fa-camera';
            break;
        case 'likes':
            message = profileState.isCurrentUser ? 
                '你还没有喜欢的照片，快去发现喜欢的作品吧！' : 
                '这个用户还没有喜欢的照片';
            icon = 'fas fa-heart';
            break;
        default:
            message = '暂无内容';
            icon = 'fas fa-inbox';
            break;
    }
    
    profileGallery.innerHTML = `
        <div class="profile-empty-state">
            <i class="${icon}"></i>
            <h4>${message}</h4>
            ${type === 'uploads' && profileState.isCurrentUser ? 
                '<button class="btn btn-primary upload-from-profile">上传照片</button>' : ''}
        </div>
    `;
    
    // 添加上传按钮事件
    const uploadBtn = profileGallery.querySelector('.upload-from-profile');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            closeProfileModal();
            showUploadModal();
        });
    }
}

// 显示个人主页错误
function showProfileError(message) {
    const profileGallery = document.getElementById('profileGallery');
    if (!profileGallery) return;
    
    profileGallery.innerHTML = `
        <div class="profile-error-state">
            <i class="fas fa-exclamation-circle"></i>
            <h4>加载失败</h4>
            <p>${message}</p>
            <button class="btn btn-outline retry-btn">重试</button>
        </div>
    `;
    
    // 添加重试按钮事件
    const retryBtn = profileGallery.querySelector('.retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            loadProfileData(profileState.currentTab);
        });
    }
}

// 处理个人主页关注
async function handleProfileFollow(userId, followButton) {
    const currentUser = window.auth?.getCurrentUser();
    
    if (!currentUser) {
        showNotification('请先登录后再关注', 'warning');
        closeProfileModal();
        showAuthModal();
        return;
    }
    
    try {
        const result = await window.supabaseFunctions.toggleFollow(currentUser.id, userId);
        
        if (result.following) {
            followButton.innerHTML = '<i class="fas fa-user-check"></i> 已关注';
            followButton.classList.add('following');
            showNotification('关注成功', 'success');
            
            // 更新粉丝数
            updateFollowerCount(1);
        } else {
            followButton.innerHTML = '<i class="fas fa-user-plus"></i> 关注';
            followButton.classList.remove('following');
            showNotification('已取消关注', 'info');
            
            // 更新粉丝数
            updateFollowerCount(-1);
        }
        
    } catch (error) {
        console.error('个人主页关注操作错误:', error);
        showNotification('关注失败，请重试', 'error');
    }
}

// 更新粉丝数
function updateFollowerCount(change) {
    const followerCount = document.getElementById('followerCount');
    if (followerCount) {
        const currentCount = parseInt(followerCount.textContent) || 0;
        const newCount = Math.max(0, currentCount + change);
        followerCount.textContent = newCount;
    }
}

// 显示粉丝列表
async function showFollowersList() {
    if (!profileState.currentUserId) return;
    
    try {
        const followers = await window.supabaseFunctions.getFollowers(profileState.currentUserId);
        profileState.followers = followers;
        
        showUserListModal('followers', '粉丝', followers.map(f => f.profiles));
    } catch (error) {
        console.error('获取粉丝列表错误:', error);
        showNotification('加载粉丝列表失败', 'error');
    }
}

// 显示关注列表
async function showFollowingList() {
    if (!profileState.currentUserId) return;
    
    try {
        const following = await window.supabaseFunctions.getFollowing(profileState.currentUserId);
        profileState.following = following;
        
        showUserListModal('following', '关注', following.map(f => f.profiles));
    } catch (error) {
        console.error('获取关注列表错误:', error);
        showNotification('加载关注列表失败', 'error');
    }
}

// 显示用户列表模态框
function showUserListModal(type, title, users) {
    const modal = document.createElement('div');
    modal.className = 'modal user-list-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h3>${title} (${users.length})</h3>
            <div class="user-list" id="userList">
                ${users.length > 0 ? 
                    users.map(user => createUserListItem(user)).join('') :
                    `<div class="empty-list">暂无${title}</div>`
                }
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
    
    // ESC键关闭
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape' && modal.parentNode) {
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        }
    });
    
    // 添加用户点击事件
    const userItems = modal.querySelectorAll('.user-list-item');
    userItems.forEach(item => {
        const userId = item.getAttribute('data-user-id');
        item.addEventListener('click', () => {
            modal.remove();
            showUserProfile(userId);
        });
    });
}

// 创建用户列表项
function createUserListItem(user) {
    return `
        <div class="user-list-item" data-user-id="${user.id}">
            <img src="${user.avatar_url || `https://ui-avatars.com/api/?name=${user.username || 'User'}&background=bb86fc&color=fff`}" 
                 alt="${user.username}" 
                 class="avatar-md">
            <div class="user-info">
                <h4>${user.username || '用户'}</h4>
                ${user.bio ? `<p class="user-bio">${user.bio.substring(0, 50)}${user.bio.length > 50 ? '...' : ''}</p>` : ''}
            </div>
            <button class="btn btn-outline btn-sm follow-btn" data-user-id="${user.id}">关注</button>
        </div>
    `;
}

// 关闭个人主页模态框
function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        
        // 清理事件监听器
        cleanupProfileModalListeners();
        
        // 重置状态
        profileState.currentUserId = null;
        profileState.currentProfile = null;
    }
}

// 清理个人主页模态框事件监听器
function cleanupProfileModalListeners() {
    // 清理关注按钮事件
    const followBtn = document.getElementById('followProfileBtn');
    if (followBtn) {
        const newFollowBtn = followBtn.cloneNode(true);
        followBtn.parentNode.replaceChild(newFollowBtn, followBtn);
    }
    
    // 清理标签事件
    const tabs = document.querySelectorAll('.profile-tab');
    tabs.forEach(tab => {
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);
    });
}

// 显示认证模态框
function showAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.style.display = 'flex';
    }
}

// 显示上传模态框
function showUploadModal() {
    if (window.upload && typeof window.upload.showModal === 'function') {
        window.upload.showModal();
    }
}

// 显示图片详情
function showImageDetail(photoId) {
    if (window.feed && typeof window.feed.showImageDetail === 'function') {
        window.feed.showImageDetail(photoId);
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    if (window.feed && typeof window.feed.showNotification === 'function') {
        window.feed.showNotification(message, type);
    } else {
        console.log(`${type}: ${message}`);
    }
}

// 获取个人主页状态
function getProfileState() {
    return { ...profileState };
}

// 刷新个人主页
function refreshProfile() {
    if (profileState.currentUserId) {
        showUserProfile(profileState.currentUserId, profileState.currentTab, profileState.isCurrentUser);
    }
}

// 添加CSS样式
function addProfileStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .profile-content {
            max-width: 800px;
            max-height: 90vh;
            overflow-y: auto;
        }
        
        .profile-header {
            display: flex;
            gap: 30px;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, rgba(187, 134, 252, 0.1), rgba(3, 218, 198, 0.1));
            border-radius: 12px;
            border: 1px solid rgba(187, 134, 252, 0.2);
        }
        
        .profile-info {
            flex: 1;
        }
        
        .profile-info h2 {
            margin-bottom: 10px;
            background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .profile-stats {
            display: flex;
            gap: 30px;
            margin: 20px 0;
        }
        
        .stat {
            text-align: center;
            cursor: pointer;
            padding: 10px 15px;
            border-radius: 8px;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .stat:hover {
            background: rgba(187, 134, 252, 0.1);
            border-color: var(--primary-color);
            transform: translateY(-2px);
        }
        
        .stat-number {
            display: block;
            font-size: 24px;
            font-weight: 600;
            color: var(--primary-color);
        }
        
        .stat-label {
            color: #888;
            font-size: 14px;
        }
        
        .profile-tabs {
            display: flex;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 20px;
            background: rgba(30, 30, 30, 0.8);
            border-radius: 8px;
            padding: 5px;
        }
        
        .profile-tab {
            flex: 1;
            padding: 12px 24px;
            background: none;
            border: none;
            color: var(--on-surface);
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .profile-tab.active {
            background: linear-gradient(45deg, rgba(187, 134, 252, 0.2), rgba(3, 218, 198, 0.2));
            color: var(--primary-color);
        }
        
        .profile-tab::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            width: 0;
            height: 2px;
            background: var(--primary-color);
            transition: all 0.3s ease;
            transform: translateX(-50%);
        }
        
        .profile-tab.active::after {
            width: 80%;
        }
        
        .profile-gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            padding: 10px;
            min-height: 300px;
        }
        
        .profile-photo-item {
            position: relative;
            border-radius: 8px;
            overflow: hidden;
            cursor: pointer;
            animation: fadeIn 0.5s ease;
        }
        
        .profile-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
            transition: transform 0.3s ease;
        }
        
        .profile-photo-item:hover .profile-image {
            transform: scale(1.05);
        }
        
        .photo-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
            padding: 10px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .profile-photo-item:hover .photo-overlay {
            opacity: 1;
        }
        
        .photo-stats {
            display: flex;
            gap: 15px;
            color: white;
            font-size: 14px;
        }
        
        .photo-stats i {
            margin-right: 5px;
        }
        
        .profile-loading, .profile-empty-state, .profile-error-state {
            grid-column: 1 / -1;
            text-align: center;
            padding: 60px 20px;
        }
        
        .profile-loading i {
            font-size: 32px;
            color: var(--primary-color);
            margin-bottom: 10px;
        }
        
        .profile-empty-state i, .profile-error-state i {
            font-size: 48px;
            margin-bottom: 20px;
        }
        
        .profile-empty-state i {
            color: var(--primary-color);
        }
        
        .profile-error-state i {
            color: var(--error-color);
        }
        
        .profile-empty-state h4, .profile-error-state h4 {
            margin-bottom: 10px;
            color: var(--on-surface);
        }
        
        .profile-empty-state p, .profile-error-state p {
            color: #888;
            margin-bottom: 20px;
        }
        
        .user-list-modal .modal-content {
            max-width: 500px;
            max-height: 70vh;
            overflow-y: auto;
        }
        
        .user-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .user-list-item {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .user-list-item:hover {
            background: rgba(187, 134, 252, 0.1);
            border-color: var(--primary-color);
        }
        
        .user-info {
            flex: 1;
        }
        
        .user-info h4 {
            margin-bottom: 5px;
        }
        
        .user-bio {
            color: #888;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .empty-list {
            text-align: center;
            padding: 40px 20px;
            color: #888;
            font-style: italic;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @media (max-width: 768px) {
            .profile-header {
                flex-direction: column;
                text-align: center;
                gap: 15px;
            }
            
            .profile-stats {
                justify-content: center;
                gap: 20px;
            }
            
            .profile-gallery {
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            }
        }
    `;
    document.head.appendChild(style);
}

// 导出函数
window.profile = {
    init: initProfileModule,
    showUserProfile,
    showCurrentUserProfile,
    closeProfileModal,
    getState: getProfileState,
    refreshProfile
};

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    // 延迟初始化
    setTimeout(() => {
        initProfileModule();
        addProfileStyles();
    }, 2500);
});

console.log('个人主页模块完整加载完成');