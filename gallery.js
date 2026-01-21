// 画廊和搜索功能模块
class GalleryManager {
    constructor() {
        this.currentPage = 1;
        this.photosPerPage = 12;
        this.hasMorePhotos = true;
        this.currentSearchTerm = '';
        this.init();
    }
    
    // 初始化画廊模块
    init() {
        // 页面加载时加载照片
        document.addEventListener('DOMContentLoaded', () => {
            this.loadPhotos();
        });
        
        // 搜索功能
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        
        // 搜索按钮点击
        searchBtn.addEventListener('click', () => {
            this.searchPhotos();
        });
        
        // 搜索输入框回车
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchPhotos();
            }
        });
        
        // 刷新按钮
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshPhotos();
            });
        }
        
        // 加载更多按钮
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMorePhotos();
            });
        }
        
        // 返回首页按钮
        const backFromSearch = document.getElementById('back-from-search');
        if (backFromSearch) {
            backFromSearch.addEventListener('click', () => {
                this.showHomeSection();
            });
        }
        
        // 返回从详情页
        const backFromDetail = document.getElementById('back-from-detail');
        if (backFromDetail) {
            backFromDetail.addEventListener('click', () => {
                this.showHomeSection();
            });
        }
        
        // 返回从主页
        const backToHome = document.getElementById('back-to-home');
        if (backToHome) {
            backToHome.addEventListener('click', () => {
                this.showHomeSection();
            });
        }
    }
    
    // 显示首页部分
    showHomeSection() {
        // 隐藏所有部分
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        
        // 显示首页部分
        const homeSection = document.getElementById('home-section');
        homeSection.classList.add('active');
        homeSection.style.display = 'block';
        
        // 重置搜索
        this.currentSearchTerm = '';
        document.getElementById('search-input').value = '';
        
        // 刷新照片
        this.refreshPhotos();
    }
    
    // 加载照片
    async loadPhotos(page = 1) {
        try {
            authManager.showLoading(true);
            
            // 构建查询
            let query = supabase
                .from('photos')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range((page - 1) * this.photosPerPage, page * this.photosPerPage - 1);
            
            // 执行查询
            const { data: photos, error, count } = await query;
            
            if (error) throw error;
            
            // 更新分页状态
            this.hasMorePhotos = photos.length === this.photosPerPage;
            
            // 显示照片
            this.displayPhotos(photos, page === 1);
            
            // 更新加载更多按钮状态
            this.updateLoadMoreButton();
            
            return photos;
        } catch (error) {
            console.error('加载照片失败:', error);
            this.showErrorMessage('加载照片失败，请刷新页面重试');
            return [];
        } finally {
            authManager.showLoading(false);
        }
    }
    
    // 加载更多照片
    async loadMorePhotos() {
        this.currentPage++;
        await this.loadPhotos(this.currentPage);
    }
    
    // 刷新照片
    async refreshPhotos() {
        this.currentPage = 1;
        await this.loadPhotos(1);
    }
    
    // 搜索照片
    async searchPhotos() {
        const searchInput = document.getElementById('search-input');
        const searchTerm = searchInput.value.trim();
        
        if (!searchTerm) {
            authManager.showToast('请输入搜索关键词', 'warning');
            return;
        }
        
        this.currentSearchTerm = searchTerm;
        
        try {
            authManager.showLoading(true);
            
            // 构建搜索查询
            // 使用关键词数组的包含查询
            const { data: photos, error } = await supabase
                .from('photos')
                .select('*')
                .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // 显示搜索结果
            this.displaySearchResults(photos, searchTerm);
            
        } catch (error) {
            console.error('搜索失败:', error);
            authManager.showToast('搜索失败，请重试', 'error');
        } finally {
            authManager.showLoading(false);
        }
    }
    
    // 显示照片
    displayPhotos(photos, clear = true) {
        const photoGrid = document.getElementById('photo-grid');
        
        if (clear) {
            photoGrid.innerHTML = '';
        }
        
        if (photos.length === 0 && clear) {
            this.showEmptyState('暂无照片，成为第一个上传者吧！');
            return;
        }
        
        // 添加照片卡片
        photos.forEach(photo => {
            const photoCard = this.createPhotoCard(photo);
            photoGrid.appendChild(photoCard);
        });
    }
    
    // 显示搜索结果
    displaySearchResults(photos, searchTerm) {
        // 隐藏所有部分
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        
        // 显示搜索结果部分
        const searchSection = document.getElementById('search-section');
        searchSection.classList.add('active');
        searchSection.style.display = 'block';
        
        // 更新搜索信息
        const searchInfo = document.getElementById('search-info');
        searchInfo.innerHTML = `
            <h3>搜索结果: "${searchTerm}"</h3>
            <p>找到 ${photos.length} 张照片</p>
        `;
        
        // 显示搜索结果
        const searchResults = document.getElementById('search-results');
        searchResults.innerHTML = '';
        
        if (photos.length === 0) {
            searchResults.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>未找到相关照片</h3>
                    <p>没有找到与"${searchTerm}"相关的照片，请尝试其他关键词。</p>
                </div>
            `;
            return;
        }
        
        // 添加照片卡片
        photos.forEach(photo => {
            const photoCard = this.createPhotoCard(photo);
            searchResults.appendChild(photoCard);
        });
    }
    
    // 创建照片卡片
    createPhotoCard(photo) {
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.dataset.photoId = photo.id;
        
        // 格式化日期
        const date = new Date(photo.created_at);
        const formattedDate = date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // 用户头像颜色
        const userColor = this.getUserColor(photo.user_id || photo.user_email);
        
        // 构建关键词标签
        let keywordsHTML = '';
        if (photo.keywords && photo.keywords.length > 0) {
            // 如果是字符串，转换为数组
            const keywords = Array.isArray(photo.keywords) ? photo.keywords : [photo.keywords];
            keywordsHTML = keywords.map(keyword => 
                `<span class="keyword-tag">${keyword}</span>`
            ).join('');
        }
        
        // 构建卡片内容
        card.innerHTML = `
            <div class="photo-image">
                <img src="${photo.image_url}" alt="${photo.title || '照片'}" loading="lazy">
            </div>
            <div class="photo-info">
                <h3 class="photo-title">${photo.title || '未命名照片'}</h3>
                <p class="photo-description">${photo.description || '暂无描述'}</p>
                
                <div class="photo-meta">
                    <div class="photo-user" data-user-id="${photo.user_id}">
                        <div class="user-avatar-small" style="background-color: ${userColor};">
                            ${this.getUserInitial(photo.user_name)}
                        </div>
                        <div class="user-name-small">${photo.user_name || '匿名用户'}</div>
                    </div>
                    <div class="photo-date">${formattedDate}</div>
                </div>
                
                <div class="photo-keywords">
                    ${keywordsHTML}
                </div>
                
                <div class="photo-actions">
                    <button class="comment-btn" data-photo-id="${photo.id}">
                        <i class="fas fa-comment"></i>
                        <span>评论</span>
                    </button>
                    
                    ${this.getAdminActions(photo)}
                </div>
            </div>
        `;
        
        // 添加事件监听器
        this.addPhotoCardEventListeners(card, photo);
        
        return card;
    }
    
    // 添加照片卡片事件监听器
    addPhotoCardEventListeners(card, photo) {
        // 点击照片放大
        const photoImage = card.querySelector('.photo-image');
        photoImage.addEventListener('click', () => {
            this.showPhotoDetail(photo);
        });
        
        // 点击用户进入主页
        const userElement = card.querySelector('.photo-user');
        userElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showUserProfile(photo.user_id, photo.user_name);
        });
        
        // 点击评论按钮
        const commentBtn = card.querySelector('.comment-btn');
        commentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showPhotoDetail(photo);
        });
        
        // 点击删除按钮
        const deleteBtn = card.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deletePhoto(photo.id);
            });
        }
    }
    
    // 显示照片详情
    showPhotoDetail(photo) {
        // 隐藏所有部分
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        
        // 显示照片详情部分
        const detailSection = document.getElementById('photo-detail-section');
        detailSection.classList.add('active');
        detailSection.style.display = 'block';
        
        // 加载照片详情
        if (window.commentsManager) {
            window.commentsManager.loadPhotoDetail(photo);
        }
    }
    
    // 显示用户主页
    showUserProfile(userId, userName) {
        // 隐藏所有部分
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        
        // 显示用户主页部分
        const profileSection = document.getElementById('profile-section');
        profileSection.classList.add('active');
        profileSection.style.display = 'block';
        
        // 加载用户主页
        if (window.userProfileManager) {
            window.userProfileManager.loadUserProfile(userId, userName);
        }
    }
    
    // 删除照片
    async deletePhoto(photoId) {
        if (!authManager.isUserAdmin()) {
            authManager.showToast('只有管理员可以删除照片', 'error');
            return;
        }
        
        const confirmDelete = confirm('确定要删除这张照片吗？此操作不可撤销。');
        if (!confirmDelete) return;
        
        try {
            authManager.showLoading(true);
            
            const { error } = await supabase
                .from('photos')
                .delete()
                .eq('id', photoId);
            
            if (error) throw error;
            
            authManager.showToast('照片删除成功', 'success');
            
            // 从页面移除照片卡片
            const photoCard = document.querySelector(`.photo-card[data-photo-id="${photoId}"]`);
            if (photoCard) {
                photoCard.remove();
            }
            
            // 刷新照片列表
            this.refreshPhotos();
            
        } catch (error) {
            console.error('删除照片失败:', error);
            authManager.showToast('删除照片失败', 'error');
        } finally {
            authManager.showLoading(false);
        }
    }
    
    // 获取管理员操作按钮
    getAdminActions(photo) {
        if (!authManager.isUserAdmin()) {
            return '';
        }
        
        return `<button class="delete-btn" data-photo-id="${photo.id}">
            <i class="fas fa-trash"></i>
            <span>删除</span>
        </button>`;
    }
    
    // 获取用户颜色
    getUserColor(userId) {
        // 根据用户ID生成一致的颜色
        if (!userId) return '#6c63ff';
        
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const colors = [
            '#6c63ff', '#ff6584', '#4caf50', '#ff9800', 
            '#2196f3', '#9c27b0', '#00bcd4', '#ff5722'
        ];
        
        return colors[Math.abs(hash) % colors.length];
    }
    
    // 获取用户首字母
    getUserInitial(userName) {
        if (!userName) return '?';
        return userName.charAt(0).toUpperCase();
    }
    
    // 更新加载更多按钮状态
    updateLoadMoreButton() {
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            if (this.hasMorePhotos) {
                loadMoreBtn.style.display = 'block';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }
    }
    
    // 显示空状态
    showEmptyState(message) {
        const photoGrid = document.getElementById('photo-grid');
        photoGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-images"></i>
                <h3>暂无照片</h3>
                <p>${message}</p>
                <button class="btn btn-primary" id="upload-first-photo">
                    <i class="fas fa-cloud-upload-alt"></i> 上传第一张照片
                </button>
            </div>
        `;
        
        // 添加事件监听器
        const uploadFirstPhotoBtn = document.getElementById('upload-first-photo');
        if (uploadFirstPhotoBtn) {
            uploadFirstPhotoBtn.addEventListener('click', () => {
                document.getElementById('upload-link').click();
            });
        }
    }
    
    // 显示错误消息
    showErrorMessage(message) {
        const photoGrid = document.getElementById('photo-grid');
        photoGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>加载失败</h3>
                <p>${message}</p>
                <button class="btn btn-outline" id="retry-load-photos">
                    <i class="fas fa-redo"></i> 重试
                </button>
            </div>
        `;
        
        // 添加事件监听器
        const retryBtn = document.getElementById('retry-load-photos');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.refreshPhotos();
            });
        }
    }
}

// 创建全局画廊管理器实例
window.galleryManager = new GalleryManager();