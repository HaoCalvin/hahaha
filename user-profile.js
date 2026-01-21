// 用户主页功能模块
class UserProfileManager {
    constructor() {
        this.init();
    }
    
    // 初始化用户主页模块
    init() {
        // 主页链接点击事件
        const profileLink = document.getElementById('profile-link');
        if (profileLink) {
            profileLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showCurrentUserProfile();
            });
        }
    }
    
    // 显示当前用户主页
    async showCurrentUserProfile() {
        const user = authManager.getCurrentUser();
        
        if (!user) {
            authManager.showToast('请先登录查看主页', 'error');
            return;
        }
        
        this.loadUserProfile(user.id, user.user_metadata?.username || user.email?.split('@')[0]);
    }
    
    // 加载用户主页
    async loadUserProfile(userId, userName) {
        try {
            authManager.showLoading(true);
            
            // 隐藏所有部分
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
                section.style.display = 'none';
            });
            
            // 显示用户主页部分
            const profileSection = document.getElementById('profile-section');
            profileSection.classList.add('active');
            profileSection.style.display = 'block';
            
            // 获取用户照片
            const { data: photos, error } = await supabase
                .from('photos')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // 显示用户信息
            this.displayUserProfile(userId, userName, photos || []);
            
        } catch (error) {
            console.error('加载用户主页失败:', error);
            this.showProfileError();
        } finally {
            authManager.showLoading(false);
        }
    }
    
    // 显示用户信息
    displayUserProfile(userId, userName, photos) {
        const profileContainer = document.getElementById('profile-container');
        
        // 用户头像颜色
        const userColor = galleryManager.getUserColor(userId);
        
        // 构建用户信息HTML
        profileContainer.innerHTML = `
            <div class="profile-header">
                <div class="profile-avatar-large" style="background-color: ${userColor};">
                    ${galleryManager.getUserInitial(userName)}
                </div>
                
                <div class="profile-info">
                    <h2>${userName}</h2>
                    <p>照片分享者</p>
                    
                    <div class="profile-stats">
                        <div class="stat-item">
                            <div class="stat-value">${photos.length}</div>
                            <div class="stat-label">照片</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${this.getTotalLikes(photos)}</div>
                            <div class="stat-label">获赞</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${this.getTotalComments(photos)}</div>
                            <div class="stat-label">评论</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="profile-content">
                <h3 class="profile-photos-title">${userName}的照片 (${photos.length})</h3>
                
                <div class="photo-grid" id="user-photos-grid">
                    ${this.getUserPhotosHTML(photos)}
                </div>
            </div>
        `;
        
        // 如果没有照片，显示空状态
        if (photos.length === 0) {
            const userPhotosGrid = document.getElementById('user-photos-grid');
            userPhotosGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-camera"></i>
                    <h3>暂无照片</h3>
                    <p>该用户还没有上传过照片</p>
                </div>
            `;
        } else {
            // 添加照片卡片事件监听器
            this.addUserPhotosEventListeners(photos);
        }
    }
    
    // 获取用户照片HTML
    getUserPhotosHTML(photos) {
        if (photos.length === 0) return '';
        
        return photos.map(photo => {
            // 格式化日期
            const date = new Date(photo.created_at);
            const formattedDate = date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            return `
                <div class="photo-card" data-photo-id="${photo.id}">
                    <div class="photo-image">
                        <img src="${photo.image_url}" alt="${photo.title || '照片'}" loading="lazy">
                    </div>
                    <div class="photo-info">
                        <h3 class="photo-title">${photo.title || '未命名照片'}</h3>
                        <p class="photo-description">${photo.description || '暂无描述'}</p>
                        
                        <div class="photo-meta">
                            <div class="photo-date">${formattedDate}</div>
                        </div>
                        
                        <div class="photo-actions">
                            <button class="comment-btn" data-photo-id="${photo.id}">
                                <i class="fas fa-comment"></i>
                                <span>评论</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // 添加用户照片事件监听器
    addUserPhotosEventListeners(photos) {
        photos.forEach(photo => {
            const photoCard = document.querySelector(`.photo-card[data-photo-id="${photo.id}"]`);
            if (!photoCard) return;
            
            // 点击照片进入详情
            const photoImage = photoCard.querySelector('.photo-image');
            photoImage.addEventListener('click', () => {
                galleryManager.showPhotoDetail(photo);
            });
            
            // 点击评论按钮
            const commentBtn = photoCard.querySelector('.comment-btn');
            commentBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                galleryManager.showPhotoDetail(photo);
            });
        });
    }
    
    // 获取总点赞数
    getTotalLikes(photos) {
        // 这里简化处理，实际应该从数据库查询
        // 暂时返回一个估计值
        return photos.length * 3;
    }
    
    // 获取总评论数
    getTotalComments(photos) {
        // 这里简化处理，实际应该从数据库查询
        // 暂时返回一个估计值
        return photos.length * 2;
    }
    
    // 显示主页错误
    showProfileError() {
        const profileContainer = document.getElementById('profile-container');
        profileContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>加载用户主页失败</h3>
                <p>无法加载用户信息，请稍后重试</p>
                <button class="btn btn-outline" id="retry-load-profile">
                    <i class="fas fa-redo"></i> 重试
                </button>
            </div>
        `;
        
        // 添加事件监听器
        const retryBtn = document.getElementById('retry-load-profile');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                // 这里需要知道重试哪个用户，暂时返回到首页
                galleryManager.showHomeSection();
            });
        }
    }
}

// 创建全局用户主页管理器实例
window.userProfileManager = new UserProfileManager();