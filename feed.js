/**
 * 动态流管理模块
 * 处理照片动态的加载、显示、排序和搜索
 */

// 动态流状态
let feedState = {
    currentPage: 0,
    isLoading: false,
    hasMore: true,
    currentSort: 'newest',
    currentSearch: '',
    photos: [],
    totalPhotos: 0,
    lastLoadTime: null
};

// 初始化动态流
function initFeedModule() {
    console.log('正在初始化动态流模块...');
    
    // 获取DOM元素
    const sortSelect = document.getElementById('sortSelect');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const feedGrid = document.getElementById('feedGrid');
    
    // 设置排序事件
    if (sortSelect) {
        sortSelect.addEventListener('change', handleSortChange);
    }
    
    // 设置搜索事件
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }
    
    // 设置加载更多事件
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMorePhotos);
    }
    
    // 设置无限滚动
    setupInfiniteScroll();
    
    // 初始化加载第一页
    resetFeed();
    loadFeed();
    
    console.log('动态流模块初始化完成');
}

// 重置动态流
function resetFeed() {
    feedState = {
        currentPage: 0,
        isLoading: false,
        hasMore: true,
        currentSort: document.getElementById('sortSelect')?.value || 'newest',
        currentSearch: document.getElementById('searchInput')?.value || '',
        photos: [],
        totalPhotos: 0,
        lastLoadTime: null
    };
    
    // 清空动态网格
    const feedGrid = document.getElementById('feedGrid');
    if (feedGrid) {
        feedGrid.innerHTML = `
            <div class="loading-spinner" id="loadingSpinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>加载中...</p>
            </div>
        `;
    }
    
    // 隐藏加载更多按钮
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    if (loadMoreContainer) {
        loadMoreContainer.style.display = 'none';
    }
    
    // 隐藏空状态
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
        emptyState.style.display = 'none';
    }
}

// 加载动态流
async function loadFeed() {
    if (feedState.isLoading) return;
    
    feedState.isLoading = true;
    showLoadingSpinner();
    
    try {
        let photos = [];
        
        if (feedState.currentSearch) {
            // 执行搜索
            photos = await searchPhotos(feedState.currentSearch, feedState.currentPage);
        } else {
            // 获取照片
            photos = await getPhotos(feedState.currentPage, 12, feedState.currentSort);
        }
        
        // 处理结果
        handlePhotosLoaded(photos);
        
    } catch (error) {
        console.error('加载动态流错误:', error);
        showError('加载失败，请重试');
    } finally {
        feedState.isLoading = false;
        hideLoadingSpinner();
    }
}

// 获取照片
async function getPhotos(page, limit, sortBy) {
    try {
        return await window.supabaseFunctions.getPhotos(page, limit, sortBy);
    } catch (error) {
        console.error('获取照片错误:', error);
        return [];
    }
}

// 搜索照片
async function searchPhotos(query, page) {
    try {
        return await window.supabaseFunctions.smartSearchPhotos(query, page, 12);
    } catch (error) {
        console.error('搜索照片错误:', error);
        return [];
    }
}

// 处理照片加载
function handlePhotosLoaded(photos) {
    if (!photos || photos.length === 0) {
        if (feedState.currentPage === 0) {
            showEmptyState();
        } else {
            feedState.hasMore = false;
            hideLoadMoreButton();
        }
        return;
    }
    
    // 更新状态
    feedState.photos = [...feedState.photos, ...photos];
    feedState.totalPhotos = feedState.photos.length;
    feedState.lastLoadTime = new Date();
    feedState.currentPage++;
    feedState.hasMore = photos.length === 12; // 如果返回满12张，假设还有更多
    
    // 渲染照片
    renderPhotos(photos, feedState.currentPage === 1);
    
    // 更新UI
    updateFeedUI();
}

// 渲染照片
function renderPhotos(photos, isFirstPage = false) {
    const feedGrid = document.getElementById('feedGrid');
    if (!feedGrid) return;
    
    // 如果是第一页，清空网格
    if (isFirstPage) {
        feedGrid.innerHTML = '';
    }
    
    // 隐藏空状态
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    // 创建照片卡片
    photos.forEach((photo, index) => {
        const photoCard = createPhotoCard(photo, feedState.photos.length + index);
        feedGrid.appendChild(photoCard);
    });
    
    // 显示加载更多按钮（如果有更多照片）
    if (feedState.hasMore && photos.length > 0) {
        showLoadMoreButton();
    }
}

// 创建照片卡片
function createPhotoCard(photo, animationDelay = 0) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.style.animationDelay = `${animationDelay * 0.1}s`;
    card.setAttribute('data-photo-id', photo.id);
    
    // 解析关键词
    let keywords = [];
    if (typeof photo.keywords === 'string') {
        keywords = photo.keywords.split(',').map(k => k.trim());
    } else if (Array.isArray(photo.keywords)) {
        keywords = photo.keywords;
    }
    
    // 格式化时间
    const timeAgo = formatTimeAgo(photo.created_at);
    
    // 创建卡片HTML
    card.innerHTML = `
        <img src="${photo.thumbnail_url || photo.image_url}" 
             alt="${photo.title || '照片'}" 
             class="image-thumbnail"
             data-photo-id="${photo.id}"
             loading="lazy">
        
        <div class="image-info">
            <div class="image-author">
                <img src="${photo.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${photo.profiles?.username || 'User'}&background=bb86fc&color=fff`}" 
                     alt="${photo.profiles?.username || '用户'}" 
                     class="avatar-sm"
                     data-user-id="${photo.user_id}">
                <span class="author-name" data-user-id="${photo.user_id}">
                    ${photo.profiles?.username || '未知用户'}
                </span>
            </div>
            
            <div class="image-keywords">
                ${keywords.slice(0, 3).map(keyword => 
                    `<span class="keyword-tag">${keyword}</span>`
                ).join('')}
                ${keywords.length > 3 ? `<span class="keyword-tag">+${keywords.length - 3}</span>` : ''}
            </div>
            
            <div class="image-stats">
                <span class="post-time">${timeAgo}</span>
                <div class="image-actions">
                    <button class="btn-like" data-photo-id="${photo.id}">
                        <i class="far fa-heart"></i>
                        <span>${photo.likes_count || 0}</span>
                    </button>
                    <button class="btn-comment" data-photo-id="${photo.id}">
                        <i class="far fa-comment"></i>
                        <span>${photo.comments_count || 0}</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 添加事件监听器
    addPhotoCardEventListeners(card, photo);
    
    return card;
}

// 添加照片卡片事件监听器
function addPhotoCardEventListeners(card, photo) {
    // 点击图片查看详情
    const thumbnail = card.querySelector('.image-thumbnail');
    if (thumbnail) {
        thumbnail.addEventListener('click', () => {
            showImageDetail(photo.id);
        });
    }
    
    // 点击用户头像或用户名查看个人主页
    const authorElements = card.querySelectorAll('[data-user-id]');
    authorElements.forEach(element => {
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            showUserProfile(photo.user_id);
        });
    });
    
    // 点赞按钮
    const likeBtn = card.querySelector('.btn-like');
    if (likeBtn) {
        likeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await handleLike(photo.id, likeBtn);
        });
    }
    
    // 评论按钮
    const commentBtn = card.querySelector('.btn-comment');
    if (commentBtn) {
        commentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showImageDetail(photo.id, true); // 打开详情并聚焦评论
        });
    }
}

// 处理点赞
async function handleLike(photoId, likeButton) {
    const currentUser = window.auth?.getCurrentUser();
    
    if (!currentUser) {
        showNotification('请先登录后再点赞', 'warning');
        showAuthModal();
        return;
    }
    
    try {
        const heartIcon = likeButton.querySelector('i');
        const likeCountSpan = likeButton.querySelector('span');
        
        // 切换视觉状态
        const isLiked = heartIcon.classList.contains('fas');
        
        if (isLiked) {
            heartIcon.classList.remove('fas');
            heartIcon.classList.add('far');
            const currentCount = parseInt(likeCountSpan.textContent) || 0;
            likeCountSpan.textContent = Math.max(0, currentCount - 1);
        } else {
            heartIcon.classList.remove('far');
            heartIcon.classList.add('fas');
            heartIcon.style.color = '#ff4757';
            const currentCount = parseInt(likeCountSpan.textContent) || 0;
            likeCountSpan.textContent = currentCount + 1;
        }
        
        // 发送API请求
        const result = await window.supabaseFunctions.toggleLike(photoId, currentUser.id);
        
        // 如果API失败，恢复状态
        if (!result.liked !== isLiked) {
            setTimeout(() => {
                if (result.liked) {
                    heartIcon.classList.remove('far');
                    heartIcon.classList.add('fas');
                    heartIcon.style.color = '#ff4757';
                } else {
                    heartIcon.classList.remove('fas');
                    heartIcon.classList.add('far');
                    heartIcon.style.color = '';
                }
                
                const currentCount = parseInt(likeCountSpan.textContent) || 0;
                likeCountSpan.textContent = result.likes_count || currentCount;
            }, 300);
        }
        
    } catch (error) {
        console.error('点赞操作错误:', error);
        showNotification('点赞失败，请重试', 'error');
    }
}

// 处理排序变化
function handleSortChange(e) {
    const newSort = e.target.value;
    
    if (newSort !== feedState.currentSort) {
        feedState.currentSort = newSort;
        resetFeed();
        loadFeed();
    }
}

// 处理搜索
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchQuery = searchInput?.value?.trim() || '';
    
    if (searchQuery !== feedState.currentSearch) {
        feedState.currentSearch = searchQuery;
        resetFeed();
        loadFeed();
    }
}

// 加载更多照片
function loadMorePhotos() {
    if (!feedState.isLoading && feedState.hasMore) {
        loadFeed();
    }
}

// 设置无限滚动
function setupInfiniteScroll() {
    let isScrolling = false;
    
    window.addEventListener('scroll', () => {
        if (isScrolling) return;
        
        isScrolling = true;
        
        setTimeout(() => {
            checkScrollPosition();
            isScrolling = false;
        }, 100);
    });
}

// 检查滚动位置
function checkScrollPosition() {
    if (feedState.isLoading || !feedState.hasMore) return;
    
    const scrollPosition = window.innerHeight + window.scrollY;
    const pageHeight = document.documentElement.scrollHeight;
    const threshold = 500; // 距离底部500px时加载
    
    if (scrollPosition >= pageHeight - threshold) {
        loadMorePhotos();
    }
}

// 显示加载更多按钮
function showLoadMoreButton() {
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    if (loadMoreContainer) {
        loadMoreContainer.style.display = 'block';
    }
}

// 隐藏加载更多按钮
function hideLoadMoreButton() {
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    if (loadMoreContainer) {
        loadMoreContainer.style.display = 'none';
    }
}

// 显示加载动画
function showLoadingSpinner() {
    const feedGrid = document.getElementById('feedGrid');
    if (!feedGrid) return;
    
    let spinner = feedGrid.querySelector('.loading-spinner');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            <p>加载中...</p>
        `;
        feedGrid.appendChild(spinner);
    }
    spinner.style.display = 'block';
}

// 隐藏加载动画
function hideLoadingSpinner() {
    const spinner = document.querySelector('.loading-spinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
}

// 显示空状态
function showEmptyState() {
    const feedGrid = document.getElementById('feedGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!feedGrid || !emptyState) return;
    
    feedGrid.innerHTML = '';
    emptyState.style.display = 'block';
    feedGrid.appendChild(emptyState);
}

// 显示错误
function showError(message) {
    const feedGrid = document.getElementById('feedGrid');
    if (!feedGrid) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-state';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <h3>加载失败</h3>
        <p>${message}</p>
        <button class="btn btn-outline retry-btn">重试</button>
    `;
    
    feedGrid.innerHTML = '';
    feedGrid.appendChild(errorDiv);
    
    // 添加重试按钮事件
    const retryBtn = errorDiv.querySelector('.retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            resetFeed();
            loadFeed();
        });
    }
}

// 更新动态UI
function updateFeedUI() {
    // 更新标题
    const feedHeader = document.querySelector('.feed-header h2');
    if (feedHeader) {
        if (feedState.currentSearch) {
            feedHeader.innerHTML = `<i class="fas fa-search"></i> 搜索结果: ${feedState.currentSearch}`;
        } else {
            feedHeader.innerHTML = `<i class="fas fa-fire"></i> ${getSortLabel(feedState.currentSort)}`;
        }
    }
    
    // 更新照片数量
    const photoCount = document.getElementById('photoCount');
    if (photoCount) {
        photoCount.textContent = feedState.totalPhotos;
    }
}

// 获取排序标签
function getSortLabel(sort) {
    switch (sort) {
        case 'newest': return '最新照片';
        case 'popular': return '热门照片';
        case 'oldest': return '最早照片';
        default: return '照片动态';
    }
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

// 显示图片详情
async function showImageDetail(photoId, focusComment = false) {
    try {
        // 获取照片详情
        const photo = await window.supabaseFunctions.getPhotoById(photoId);
        if (!photo) {
            showNotification('照片不存在', 'error');
            return;
        }
        
        // 获取评论
        const comments = await window.supabaseFunctions.getComments(photoId);
        
        // 获取当前用户
        const currentUser = window.auth?.getCurrentUser();
        
        // 获取点赞状态
        const likeStatus = currentUser ? 
            await window.supabaseFunctions.getUserLikeStatus(photoId, currentUser.id) : 
            { liked: false };
        
        // 获取关注状态
        const followStatus = currentUser && currentUser.id !== photo.user_id ?
            await window.supabaseFunctions.getUserFollowStatus(currentUser.id, photo.user_id) :
            { following: false };
        
        // 更新模态框内容
        updateImageDetailModal(photo, comments, likeStatus, followStatus, focusComment);
        
        // 显示模态框
        const modal = document.getElementById('imageDetailModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // 防止背景滚动
        }
        
    } catch (error) {
        console.error('显示图片详情错误:', error);
        showNotification('加载照片详情失败', 'error');
    }
}

// 更新图片详情模态框
function updateImageDetailModal(photo, comments, likeStatus, followStatus, focusComment = false) {
    const detailImage = document.getElementById('detailImage');
    const detailAuthorAvatar = document.getElementById('detailAuthorAvatar');
    const detailAuthorName = document.getElementById('detailAuthorName');
    const detailPostTime = document.getElementById('detailPostTime');
    const detailDescription = document.getElementById('detailDescription');
    const detailKeywords = document.getElementById('detailKeywords');
    const likeButton = document.getElementById('likeButton');
    const likeCount = document.getElementById('likeCount');
    const followButton = document.getElementById('followButton');
    const commentsList = document.getElementById('commentsList');
    const commentInput = document.getElementById('commentInput');
    const submitComment = document.getElementById('submitComment');
    
    if (!detailImage) return;
    
    // 设置图片
    detailImage.src = photo.image_url;
    detailImage.alt = photo.title || '照片详情';
    
    // 设置作者信息
    if (detailAuthorAvatar) {
        detailAuthorAvatar.src = photo.profiles?.avatar_url || 
                               `https://ui-avatars.com/api/?name=${photo.profiles?.username || 'User'}&background=bb86fc&color=fff`;
        detailAuthorAvatar.setAttribute('data-user-id', photo.user_id);
    }
    
    if (detailAuthorName) {
        detailAuthorName.textContent = photo.profiles?.username || '未知用户';
        detailAuthorName.setAttribute('data-user-id', photo.user_id);
    }
    
    if (detailPostTime) {
        detailPostTime.textContent = formatTimeAgo(photo.created_at);
    }
    
    // 设置描述
    if (detailDescription) {
        detailDescription.textContent = photo.description || '没有描述';
    }
    
    // 设置关键词
    if (detailKeywords) {
        let keywords = [];
        if (typeof photo.keywords === 'string') {
            keywords = photo.keywords.split(',').map(k => k.trim());
        } else if (Array.isArray(photo.keywords)) {
            keywords = photo.keywords;
        }
        
        detailKeywords.innerHTML = keywords.map(keyword => 
            `<span class="keyword-tag">${keyword}</span>`
        ).join('');
    }
    
    // 设置点赞按钮
    if (likeButton) {
        const heartIcon = likeButton.querySelector('i');
        if (likeStatus.liked) {
            heartIcon.classList.remove('far');
            heartIcon.classList.add('fas');
            heartIcon.style.color = '#ff4757';
        } else {
            heartIcon.classList.remove('fas');
            heartIcon.classList.add('far');
            heartIcon.style.color = '';
        }
        
        likeButton.setAttribute('data-photo-id', photo.id);
        
        // 移除现有事件监听器并添加新的
        likeButton.replaceWith(likeButton.cloneNode(true));
        const newLikeButton = document.getElementById('likeButton');
        newLikeButton.addEventListener('click', async () => {
            await handleLike(photo.id, newLikeButton);
        });
    }
    
    if (likeCount) {
        likeCount.textContent = photo.likes_count || 0;
    }
    
    // 设置关注按钮
    if (followButton) {
        const currentUser = window.auth?.getCurrentUser();
        
        if (!currentUser || currentUser.id === photo.user_id) {
            followButton.style.display = 'none';
        } else {
            followButton.style.display = 'flex';
            followButton.setAttribute('data-following-id', photo.user_id);
            
            if (followStatus.following) {
                followButton.innerHTML = '<i class="fas fa-user-check"></i><span>已关注</span>';
                followButton.classList.add('following');
            } else {
                followButton.innerHTML = '<i class="fas fa-user-plus"></i><span>关注</span>';
                followButton.classList.remove('following');
            }
            
            // 移除现有事件监听器并添加新的
            followButton.replaceWith(followButton.cloneNode(true));
            const newFollowButton = document.getElementById('followButton');
            newFollowButton.addEventListener('click', async () => {
                await handleFollow(photo.user_id, newFollowButton);
            });
        }
    }
    
    // 设置评论列表
    if (commentsList) {
        commentsList.innerHTML = comments.length > 0 ? 
            comments.map(comment => createCommentElement(comment)).join('') :
            '<div class="no-comments">还没有评论，快来发表第一个评论吧！</div>';
    }
    
    // 设置评论输入
    if (commentInput && submitComment) {
        commentInput.setAttribute('data-photo-id', photo.id);
        
        // 移除现有事件监听器并添加新的
        submitComment.replaceWith(submitComment.cloneNode(true));
        const newSubmitComment = document.getElementById('submitComment');
        newSubmitComment.addEventListener('click', async () => {
            await handleAddComment(photo.id, commentInput, commentsList);
        });
        
        commentInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                await handleAddComment(photo.id, commentInput, commentsList);
            }
        });
        
        // 如果需要聚焦评论
        if (focusComment) {
            setTimeout(() => {
                commentInput.focus();
            }, 300);
        }
    }
    
    // 添加作者头像和名字的点击事件
    const authorElements = document.querySelectorAll('#imageDetailModal [data-user-id]');
    authorElements.forEach(element => {
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            showUserProfile(photo.user_id);
        });
    });
}

// 创建评论元素
function createCommentElement(comment) {
    const timeAgo = formatTimeAgo(comment.created_at);
    
    return `
        <div class="comment-item" data-comment-id="${comment.id}">
            <div class="comment-author">
                <img src="${comment.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${comment.profiles?.username || 'User'}&background=bb86fc&color=fff`}" 
                     alt="${comment.profiles?.username || '用户'}" 
                     class="avatar-xs"
                     data-user-id="${comment.user_id}">
                <span class="comment-author-name" data-user-id="${comment.user_id}">
                    ${comment.profiles?.username || '未知用户'}
                </span>
                <span class="comment-time">${timeAgo}</span>
            </div>
            <div class="comment-text">${escapeHtml(comment.content)}</div>
        </div>
    `;
}

// 处理关注
async function handleFollow(followingId, followButton) {
    const currentUser = window.auth?.getCurrentUser();
    
    if (!currentUser) {
        showNotification('请先登录后再关注', 'warning');
        showAuthModal();
        return;
    }
    
    try {
        const result = await window.supabaseFunctions.toggleFollow(currentUser.id, followingId);
        
        if (result.following) {
            followButton.innerHTML = '<i class="fas fa-user-check"></i><span>已关注</span>';
            followButton.classList.add('following');
            showNotification('关注成功', 'success');
        } else {
            followButton.innerHTML = '<i class="fas fa-user-plus"></i><span>关注</span>';
            followButton.classList.remove('following');
            showNotification('已取消关注', 'info');
        }
        
    } catch (error) {
        console.error('关注操作错误:', error);
        showNotification('关注失败，请重试', 'error');
    }
}

// 处理添加评论
async function handleAddComment(photoId, commentInput, commentsList) {
    const currentUser = window.auth?.getCurrentUser();
    
    if (!currentUser) {
        showNotification('请先登录后再评论', 'warning');
        showAuthModal();
        return;
    }
    
    const content = commentInput.value.trim();
    if (!content) {
        showNotification('请输入评论内容', 'warning');
        commentInput.focus();
        return;
    }
    
    if (content.length > 500) {
        showNotification('评论内容不能超过500个字符', 'warning');
        return;
    }
    
    try {
        // 添加评论到数据库
        const comment = await window.supabaseFunctions.addComment(photoId, currentUser.id, content);
        
        // 清空输入框
        commentInput.value = '';
        
        // 添加评论到列表
        if (commentsList) {
            const noComments = commentsList.querySelector('.no-comments');
            if (noComments) {
                noComments.remove();
            }
            
            const commentElement = createCommentElement(comment);
            commentsList.insertAdjacentHTML('beforeend', commentElement);
            
            // 滚动到最新评论
            commentsList.scrollTop = commentsList.scrollHeight;
            
            // 添加作者点击事件
            const newComment = commentsList.lastElementChild;
            const authorElements = newComment.querySelectorAll('[data-user-id]');
            authorElements.forEach(element => {
                element.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showUserProfile(comment.user_id);
                });
            });
        }
        
        showNotification('评论发表成功', 'success');
        
    } catch (error) {
        console.error('添加评论错误:', error);
        showNotification('评论发表失败，请重试', 'error');
    }
}

// 显示用户个人主页
function showUserProfile(userId) {
    // 这个功能将在profile.js中实现
    if (window.profile && typeof window.profile.showUserProfile === 'function') {
        window.profile.showUserProfile(userId);
    }
}

// 显示认证模态框
function showAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.style.display = 'flex';
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    if (window.upload && typeof window.upload.showNotification === 'function') {
        window.upload.showNotification(message, type);
    } else {
        console.log(`${type}: ${message}`);
    }
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 获取动态状态
function getFeedState() {
    return { ...feedState };
}

// 刷新动态
function refreshFeed() {
    resetFeed();
    loadFeed();
}

// 导出函数
window.feed = {
    init: initFeedModule,
    loadFeed,
    refreshFeed,
    getState: getFeedState,
    showImageDetail,
    handleSearch,
    handleSortChange
};

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    // 延迟初始化
    setTimeout(() => {
        initFeedModule();
    }, 2000);
});

console.log('动态流模块完整加载完成');