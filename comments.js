// 评论功能模块
class CommentsManager {
    constructor() {
        this.currentPhoto = null;
        this.comments = [];
        this.init();
    }
    
    // 初始化评论模块
    init() {
        // 评论相关的事件监听器在主脚本中设置
    }
    
    // 加载照片详情和评论
    async loadPhotoDetail(photo) {
        this.currentPhoto = photo;
        
        // 格式化日期
        const date = new Date(photo.created_at);
        const formattedDate = date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // 用户头像颜色
        const userColor = galleryManager.getUserColor(photo.user_id || photo.user_email);
        
        // 构建关键词标签
        let keywordsHTML = '';
        if (photo.keywords && photo.keywords.length > 0) {
            // 如果是字符串，转换为数组
            const keywords = Array.isArray(photo.keywords) ? photo.keywords : [photo.keywords];
            keywordsHTML = keywords.map(keyword => 
                `<span class="keyword-tag">${keyword}</span>`
            ).join('');
        }
        
        // 构建照片详情HTML
        const detailContainer = document.getElementById('photo-detail-container');
        detailContainer.innerHTML = `
            <div class="photo-detail">
                <div class="detail-image">
                    <img src="${photo.image_url}" alt="${photo.title || '照片'}" id="detail-photo-image">
                </div>
                
                <div class="detail-info">
                    <div class="detail-header">
                        <h2 class="detail-title">${photo.title || '未命名照片'}</h2>
                        <div class="detail-meta">
                            <div class="detail-user" data-user-id="${photo.user_id}">
                                <div class="user-avatar-small" style="background-color: ${userColor};">
                                    ${galleryManager.getUserInitial(photo.user_name)}
                                </div>
                                <div class="user-name-small">${photo.user_name || '匿名用户'}</div>
                            </div>
                            <div class="detail-date">${formattedDate}</div>
                        </div>
                    </div>
                    
                    <div class="detail-description">
                        <h3>描述</h3>
                        <p>${photo.description || '暂无描述'}</p>
                    </div>
                    
                    <div class="detail-keywords">
                        <h3>关键词</h3>
                        <div class="keywords-list">
                            ${keywordsHTML}
                        </div>
                    </div>
                    
                    <div class="comments-section">
                        <div class="comments-header">
                            <i class="fas fa-comments"></i>
                            <h3>评论</h3>
                        </div>
                        
                        <div class="comment-form" id="comment-form">
                            <textarea class="comment-input" id="comment-input" placeholder="写下你的评论..." ${!authManager.isLoggedIn() ? 'disabled' : ''}></textarea>
                            <div class="form-actions">
                                <button class="btn btn-primary" id="submit-comment-btn" ${!authManager.isLoggedIn() ? 'disabled' : ''}>
                                    <i class="fas fa-paper-plane"></i> 发表评论
                                </button>
                            </div>
                            ${!authManager.isLoggedIn() ? '<p class="form-hint">请先登录才能发表评论</p>' : ''}
                        </div>
                        
                        <div class="comment-list" id="comment-list">
                            <div class="loading-spinner">
                                <div class="spinner"></div>
                                <p>加载评论中...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加事件监听器
        this.addDetailEventListeners();
        
        // 加载评论
        await this.loadComments(photo.id);
        
        // 图片点击放大
        const detailImage = document.getElementById('detail-photo-image');
        detailImage.addEventListener('click', () => {
            this.showFullSizeImage(photo.image_url, photo.title);
        });
        
        // 用户点击进入主页
        const userElement = detailContainer.querySelector('.detail-user');
        userElement.addEventListener('click', () => {
            galleryManager.showUserProfile(photo.user_id, photo.user_name);
        });
    }
    
    // 添加详情页面事件监听器
    addDetailEventListeners() {
        // 提交评论按钮
        const submitCommentBtn = document.getElementById('submit-comment-btn');
        if (submitCommentBtn) {
            submitCommentBtn.addEventListener('click', () => {
                this.submitComment();
            });
        }
        
        // 评论输入框回车提交
        const commentInput = document.getElementById('comment-input');
        if (commentInput) {
            commentInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    this.submitComment();
                }
            });
        }
    }
    
    // 加载评论
    async loadComments(photoId) {
        try {
            const commentList = document.getElementById('comment-list');
            
            const { data: comments, error } = await supabase
                .from('comments')
                .select('*')
                .eq('photo_id', photoId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            this.comments = comments || [];
            this.displayComments();
            
        } catch (error) {
            console.error('加载评论失败:', error);
            this.showCommentsError();
        }
    }
    
    // 显示评论
    displayComments() {
        const commentList = document.getElementById('comment-list');
        
        if (this.comments.length === 0) {
            commentList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comment-slash"></i>
                    <h3>暂无评论</h3>
                    <p>成为第一个评论的人吧！</p>
                </div>
            `;
            return;
        }
        
        commentList.innerHTML = '';
        
        this.comments.forEach(comment => {
            const commentItem = this.createCommentItem(comment);
            commentList.appendChild(commentItem);
        });
    }
    
    // 创建评论项
    createCommentItem(comment) {
        const item = document.createElement('div');
        item.className = 'comment-item';
        item.dataset.commentId = comment.id;
        
        // 格式化日期
        const date = new Date(comment.created_at);
        const formattedDate = date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // 用户头像颜色
        const userColor = galleryManager.getUserColor(comment.user_id);
        
        // 获取用户名
        const userName = comment.user_name || comment.user_email?.split('@')[0] || '匿名用户';
        
        item.innerHTML = `
            <div class="comment-header">
                <div class="comment-user">
                    <div class="user-avatar-small" style="background-color: ${userColor};">
                        ${galleryManager.getUserInitial(userName)}
                    </div>
                    <div class="comment-user-info">
                        <div class="comment-user-name">${userName}</div>
                        <div class="comment-date">${formattedDate}</div>
                    </div>
                </div>
                
                ${this.getCommentDeleteButton(comment)}
            </div>
            
            <div class="comment-content">
                ${comment.content}
            </div>
        `;
        
        // 添加事件监听器
        const deleteBtn = item.querySelector('.comment-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteComment(comment.id);
            });
        }
        
        // 用户点击进入主页
        const userElement = item.querySelector('.comment-user');
        userElement.addEventListener('click', () => {
            galleryManager.showUserProfile(comment.user_id, userName);
        });
        
        return item;
    }
    
    // 获取评论删除按钮
    getCommentDeleteButton(comment) {
        const currentUser = authManager.getCurrentUser();
        
        // 如果是评论所有者或管理员，显示删除按钮
        if (currentUser && (currentUser.id === comment.user_id || authManager.isUserAdmin())) {
            return `<button class="comment-delete">
                <i class="fas fa-trash"></i>
            </button>`;
        }
        
        return '';
    }
    
    // 提交评论
    async submitComment() {
        // 检查是否登录
        if (!authManager.isLoggedIn()) {
            authManager.showToast('请先登录再发表评论', 'error');
            return;
        }
        
        const commentInput = document.getElementById('comment-input');
        const content = commentInput.value.trim();
        
        if (!content) {
            authManager.showToast('评论内容不能为空', 'error');
            return;
        }
        
        try {
            authManager.showLoading(true);
            
            const user = authManager.getCurrentUser();
            
            const { data, error } = await supabase
                .from('comments')
                .insert([
                    {
                        photo_id: this.currentPhoto.id,
                        user_id: user.id,
                        user_name: user.user_metadata?.username || user.email?.split('@')[0],
                        user_email: user.email,
                        content: content,
                        created_at: new Date().toISOString()
                    }
                ]);
            
            if (error) throw error;
            
            // 清空输入框
            commentInput.value = '';
            
            // 重新加载评论
            await this.loadComments(this.currentPhoto.id);
            
            authManager.showToast('评论发表成功', 'success');
            
        } catch (error) {
            console.error('发表评论失败:', error);
            authManager.showToast('发表评论失败', 'error');
        } finally {
            authManager.showLoading(false);
        }
    }
    
    // 删除评论
    async deleteComment(commentId) {
        const confirmDelete = confirm('确定要删除这条评论吗？');
        if (!confirmDelete) return;
        
        try {
            authManager.showLoading(true);
            
            const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', commentId);
            
            if (error) throw error;
            
            // 从列表中移除评论
            const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
            if (commentItem) {
                commentItem.remove();
            }
            
            // 更新评论数组
            this.comments = this.comments.filter(comment => comment.id !== commentId);
            
            // 如果所有评论都被删除了，显示空状态
            if (this.comments.length === 0) {
                this.displayComments();
            }
            
            authManager.showToast('评论删除成功', 'success');
            
        } catch (error) {
            console.error('删除评论失败:', error);
            authManager.showToast('删除评论失败', 'error');
        } finally {
            authManager.showLoading(false);
        }
    }
    
    // 显示全尺寸图片
    showFullSizeImage(imageUrl, title) {
        const viewer = document.getElementById('image-viewer');
        const fullSizeImage = document.getElementById('full-size-image');
        const imageInfo = document.getElementById('viewer-image-info');
        
        fullSizeImage.src = imageUrl;
        fullSizeImage.alt = title || '照片';
        imageInfo.textContent = title || '照片';
        
        viewer.classList.add('active');
        
        // 点击关闭
        const closeBtn = document.getElementById('viewer-close');
        closeBtn.addEventListener('click', () => {
            viewer.classList.remove('active');
        });
        
        // 点击背景关闭
        viewer.addEventListener('click', (e) => {
            if (e.target === viewer) {
                viewer.classList.remove('active');
            }
        });
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                viewer.classList.remove('active');
            }
        });
    }
    
    // 显示评论错误
    showCommentsError() {
        const commentList = document.getElementById('comment-list');
        commentList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>加载评论失败</h3>
                <p>无法加载评论，请稍后重试</p>
                <button class="btn btn-outline" id="retry-load-comments">
                    <i class="fas fa-redo"></i> 重试
                </button>
            </div>
        `;
        
        // 添加事件监听器
        const retryBtn = document.getElementById('retry-load-comments');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.loadComments(this.currentPhoto.id);
            });
        }
    }
}

// 创建全局评论管理器实例
window.commentsManager = new CommentsManager();