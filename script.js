// ============================================
// 光影分享 - 主JavaScript文件
// 版本: 1.0.0
// 作者: 光影分享团队
// 最后更新: 2024-01-01
// ============================================

// 配置信息 - 请勿修改
const SUPABASE_URL = 'https://szrybhleozpzfwhaoiha.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cnliaGxlb3pwemZ3aGFvaWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzY2NDQsImV4cCI6MjA4NDI1MjY0NH0.d5xOftdoDnwiRLY8L81RDyj1dRc-LO3RE9n57KilwNU';
const CLOUDINARY_CLOUD_NAME = 'dy77idija';
const CLOUDINARY_UPLOAD_PRESET = 'photo-share-app';
const ADMIN_ID = 'd22a82b2-7343-43f9-a417-126bea312fdd'; // 管理员ID

// 初始化Supabase客户端
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// 全局变量
// ============================================
let currentUser = null;
let currentPage = 0;
let currentFilter = 'popular';
let isLoading = false;
let hasMore = true;
let currentPhotoId = null;
let likedPhotos = new Set();
let userFollows = new Set();
let realtimeSubscription = null;

// ============================================
// DOM加载完成后初始化
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('网站初始化...');
    
    try {
        // 1. 检查用户登录状态
        await checkAuthStatus();
        
        // 2. 加载照片
        await loadPhotos('popular');
        
        // 3. 设置事件监听器
        setupEventListeners();
        
        // 4. 设置键盘快捷键
        setupKeyboardShortcuts();
        
        // 5. 设置图片懒加载
        setupLazyLoading();
        
        // 6. 设置实时更新
        setupRealtimeUpdates();
        
        console.log('网站初始化完成');
    } catch (error) {
        console.error('初始化失败:', error);
        showNotification('网站初始化失败，请刷新页面重试', 'error');
    }
});

// ============================================
// 用户认证相关函数
// ============================================

/**
 * 检查用户登录状态
 */
async function checkAuthStatus() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('获取会话失败:', error);
            return;
        }
        
        if (session && session.user) {
            currentUser = session.user;
            console.log('用户已登录:', currentUser.email);
            
            // 更新UI
            updateUIForLoggedInUser();
            
            // 加载用户数据
            await Promise.all([
                loadLikedPhotos(),
                loadUserFollows()
            ]);
            
            // 检查是否为管理员
            checkAdminStatus();
        } else {
            console.log('用户未登录');
            updateUIForGuest();
        }
    } catch (error) {
        console.error('检查认证状态失败:', error);
    }
}

/**
 * 更新登录用户的UI
 */
function updateUIForLoggedInUser() {
    const userAvatar = document.getElementById('userAvatar');
    const authLink = document.getElementById('authLink');
    const mobileAuthLink = document.getElementById('mobileAuthLink');
    const profileLink = document.getElementById('profileLink');
    const mobileProfileLink = document.getElementById('mobileProfileLink');
    const myPhotosLink = document.getElementById('myPhotosLink');
    const mobileMyPhotosLink = document.getElementById('mobileMyPhotosLink');
    
    if (currentUser && userAvatar) {
        // 更新头像
        if (currentUser.user_metadata?.avatar_url) {
            userAvatar.src = currentUser.user_metadata.avatar_url;
        } else {
            const username = currentUser.user_metadata?.name || currentUser.email.split('@')[0];
            userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;
        }
        
        // 隐藏登录按钮，显示用户相关链接
        if (authLink) authLink.style.display = 'none';
        if (mobileAuthLink) mobileAuthLink.style.display = 'none';
        
        // 设置个人主页链接
        if (profileLink) {
            profileLink.href = 'profile.html';
            profileLink.style.display = 'block';
        }
        if (mobileProfileLink) {
            mobileProfileLink.href = 'profile.html';
            mobileProfileLink.style.display = 'block';
        }
        
        // 设置我的照片链接
        if (myPhotosLink) {
            myPhotosLink.onclick = () => {
                window.location.href = `profile.html?user=${currentUser.id}`;
                return false;
            };
            myPhotosLink.style.display = 'block';
        }
        if (mobileMyPhotosLink) {
            mobileMyPhotosLink.onclick = () => {
                window.location.href = `profile.html?user=${currentUser.id}`;
                return false;
            };
            mobileMyPhotosLink.style.display = 'block';
        }
    }
}

/**
 * 更新游客UI
 */
function updateUIForGuest() {
    const authLink = document.getElementById('authLink');
    const mobileAuthLink = document.getElementById('mobileAuthLink');
    
    if (authLink) authLink.style.display = 'block';
    if (mobileAuthLink) mobileAuthLink.style.display = 'block';
}

/**
 * 检查管理员状态
 */
function checkAdminStatus() {
    if (currentUser && currentUser.id === ADMIN_ID) {
        console.log('管理员已登录');
        // 在导航栏添加管理员链接（如果不存在）
        const navLinks = document.querySelector('.nav-links');
        if (navLinks && !document.querySelector('#adminLink')) {
            const adminLink = document.createElement('a');
            adminLink.id = 'adminLink';
            adminLink.href = 'admin.html';
            adminLink.className = 'admin-link';
            adminLink.innerHTML = '<i class="fas fa-user-shield"></i> 管理';
            adminLink.style.color = '#10b981';
            adminLink.style.fontWeight = 'bold';
            navLinks.insertBefore(adminLink, navLinks.querySelector('.dropdown'));
        }
    }
}

// ============================================
// 照片加载和显示函数
// ============================================

/**
 * 加载照片
 * @param {string} filter - 筛选类型: popular, recent, following
 * @param {boolean} reset - 是否重置加载
 */
async function loadPhotos(filter = 'popular', reset = true) {
    if (isLoading) return;
    
    isLoading = true;
    console.log(`正在加载照片，筛选: ${filter}, 重置: ${reset}`);
    
    if (reset) {
        currentPage = 0;
        hasMore = true;
        const photosGrid = document.getElementById('photosGrid');
        if (photosGrid) {
            photosGrid.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>加载中...</p>
                </div>
            `;
        }
    }
    
    currentFilter = filter;
    
    // 更新筛选按钮状态
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        const btnText = btn.textContent.toLowerCase();
        if ((filter === 'popular' && btnText.includes('热门')) ||
            (filter === 'recent' && btnText.includes('最新')) ||
            (filter === 'following' && btnText.includes('关注'))) {
            btn.classList.add('active');
        }
    });
    
    try {
        let query = supabase
            .from('photos')
            .select('*', { count: 'exact' })
            .eq('is_private', false)
            .order('created_at', { ascending: false });
        
        if (filter === 'popular') {
            query = query.order('likes_count', { ascending: false });
        } else if (filter === 'following') {
            if (!currentUser) {
                showNotification('请先登录查看关注内容', 'info');
                isLoading = false;
                return;
            }
            
            // 获取关注用户的ID列表
            const followingIds = await getFollowingUserIds();
            if (followingIds.length === 0) {
                showNotification('你还没有关注任何人，快去发现用户吧！', 'info');
                const photosGrid = document.getElementById('photosGrid');
                if (photosGrid) {
                    photosGrid.innerHTML = `
                        <div class="no-photos">
                            <i class="fas fa-user-plus" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                            <p>你还没有关注任何人</p>
                            <button class="btn-primary" onclick="openFollowModal()">去发现用户</button>
                        </div>
                    `;
                }
                isLoading = false;
                return;
            }
            
            query = query.in('user_id', followingIds);
        }
        
        const { data: photos, error, count } = await query
            .range(currentPage * 20, (currentPage + 1) * 20 - 1);
        
        if (error) {
            throw new Error(`加载照片失败: ${error.message}`);
        }
        
        isLoading = false;
        
        const photosGrid = document.getElementById('photosGrid');
        if (!photosGrid) return;
        
        if (reset) {
            photosGrid.innerHTML = '';
        }
        
        if (photos && photos.length > 0) {
            displayPhotos(photos);
            currentPage++;
            hasMore = photos.length === 20;
            
            // 如果照片数量少于预期，尝试再加载一次
            if (photos.length < 20 && hasMore) {
                hasMore = false;
            }
        } else {
            if (reset) {
                photosGrid.innerHTML = `
                    <div class="no-photos">
                        <i class="fas fa-camera" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <p>还没有照片</p>
                        <p>快来上传第一张照片吧！</p>
                        <a href="upload.html" class="btn-primary">上传照片</a>
                    </div>
                `;
            }
            hasMore = false;
        }
        
        updateLoadMoreButton();
    } catch (error) {
        console.error('加载照片失败:', error);
        showNotification('加载照片失败，请重试', 'error');
        isLoading = false;
        
        const photosGrid = document.getElementById('photosGrid');
        if (photosGrid) {
            photosGrid.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>加载失败: ${error.message}</p>
                    <button class="btn-secondary" onclick="loadPhotos('${filter}', true)">重试</button>
                </div>
            `;
        }
    }
}

/**
 * 显示照片
 * @param {Array} photos - 照片数组
 */
function displayPhotos(photos) {
    const photosGrid = document.getElementById('photosGrid');
    if (!photosGrid) return;
    
    photos.forEach(photo => {
        const photoCard = createPhotoCard(photo);
        photosGrid.appendChild(photoCard);
    });
}

/**
 * 创建照片卡片
 * @param {Object} photo - 照片对象
 * @returns {HTMLElement} 照片卡片元素
 */
function createPhotoCard(photo) {
    const card = document.createElement('div');
    card.className = 'photo-card';
    card.dataset.id = photo.id;
    
    const formattedDate = new Date(photo.created_at).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // 构建关键词HTML
    let keywordsHtml = '';
    if (photo.keywords && Array.isArray(photo.keywords)) {
        keywordsHtml = photo.keywords.map(keyword => 
            `<span class="keyword" onclick="searchKeyword('${keyword}')">${keyword}</span>`
        ).join('');
    }
    
    card.innerHTML = `
        <div class="photo-image-container">
            <img src="${photo.image_url}" alt="${photo.description || '照片'}" 
                 class="photo-img" loading="lazy">
            <div class="photo-overlay">
                <button class="quick-like-btn" onclick="event.stopPropagation(); quickLikePhoto('${photo.id}')">
                    <i class="${likedPhotos.has(photo.id) ? 'fas' : 'far'} fa-heart"></i>
                </button>
            </div>
        </div>
        <div class="photo-info">
            <div class="photo-header">
                <img src="${photo.user_avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(photo.username) + '&background=random'}" 
                     class="avatar-sm" alt="${photo.username}" 
                     onclick="event.stopPropagation(); goToUserProfile('${photo.user_id}')">
                <div>
                    <div class="photo-username" 
                         onclick="event.stopPropagation(); goToUserProfile('${photo.user_id}')">
                        ${photo.username}
                    </div>
                    <div class="photo-date">${formattedDate}</div>
                </div>
                ${currentUser && photo.user_id === currentUser.id ? 
                    `<button class="photo-privacy-btn" onclick="event.stopPropagation(); togglePhotoPrivacy('${photo.id}', ${photo.is_private})">
                        <i class="fas fa-${photo.is_private ? 'lock' : 'lock-open'}"></i>
                    </button>` : ''
                }
            </div>
            ${photo.description ? `<p class="photo-description">${photo.description}</p>` : ''}
            ${keywordsHtml ? `<div class="photo-keywords">${keywordsHtml}</div>` : ''}
            <div class="photo-stats">
                <span><i class="fas fa-heart"></i> ${photo.likes_count || 0}</span>
                <span><i class="fas fa-comment"></i> ${photo.comments_count || 0}</span>
                <span><i class="fas fa-eye"></i> ${photo.view_count || 0}</span>
                ${photo.is_private ? '<span><i class="fas fa-lock"></i> 私密</span>' : ''}
            </div>
        </div>
    `;
    
    // 添加点击事件
    card.addEventListener('click', () => openPhotoModal(photo.id));
    
    return card;
}

/**
 * 加载更多照片
 */
function loadMorePhotos() {
    if (!isLoading && hasMore) {
        loadPhotos(currentFilter, false);
    }
}

/**
 * 更新加载更多按钮
 */
function updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        if (!hasMore) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
            loadMoreBtn.disabled = isLoading;
            loadMoreBtn.innerHTML = isLoading ? 
                '<i class="fas fa-spinner fa-spin"></i> 加载中...' : 
                '<i class="fas fa-redo"></i> 加载更多';
        }
    }
}

// ============================================
// 搜索功能
// ============================================

/**
 * 搜索照片
 */
async function searchPhotos() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim();
    
    if (!searchTerm) {
        loadPhotos(currentFilter, true);
        return;
    }
    
    isLoading = true;
    
    const photosGrid = document.getElementById('photosGrid');
    if (photosGrid) {
        photosGrid.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>搜索中...</p>
            </div>
        `;
    }
    
    try {
        // 使用模糊搜索：在关键词、描述和用户名中搜索
        const { data: photos, error } = await supabase
            .from('photos')
            .select('*')
            .or(`description.ilike.%${searchTerm}%,keywords.cs.{${searchTerm}}`)
            .eq('is_private', false)
            .order('created_at', { ascending: false });
        
        if (error) {
            throw new Error(`搜索失败: ${error.message}`);
        }
        
        isLoading = false;
        
        if (photosGrid) {
            photosGrid.innerHTML = '';
        }
        
        if (photos && photos.length > 0) {
            displayPhotos(photos);
            showNotification(`找到 ${photos.length} 个结果`, 'success');
        } else {
            if (photosGrid) {
                photosGrid.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <h3>没有找到相关照片</h3>
                        <p>尝试其他关键词或上传你的照片</p>
                        <button class="btn-secondary" onclick="loadPhotos('popular', true)">查看所有照片</button>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('搜索失败:', error);
        showNotification('搜索失败，请重试', 'error');
        isLoading = false;
    }
}

/**
 * 搜索关键词
 * @param {string} keyword - 关键词
 */
function searchKeyword(keyword) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = keyword;
        searchPhotos();
    }
}

// ============================================
// 照片模态框相关函数
// ============================================

/**
 * 打开照片模态框
 * @param {string} photoId - 照片ID
 */
async function openPhotoModal(photoId) {
    currentPhotoId = photoId;
    
    try {
        // 获取照片详情
        const { data: photo, error } = await supabase
            .from('photos')
            .select('*')
            .eq('id', photoId)
            .single();
        
        if (error || !photo) {
            throw new Error('加载照片失败');
        }
        
        // 增加浏览量
        await supabase
            .from('photos')
            .update({ view_count: (photo.view_count || 0) + 1 })
            .eq('id', photoId);
        
        // 更新模态框内容
        updateModalContent(photo);
        
        // 显示模态框
        const modal = document.getElementById('imageModal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
        
        // 加载评论
        loadComments(photoId);
    } catch (error) {
        console.error('打开照片模态框失败:', error);
        showNotification('加载照片失败', 'error');
    }
}

/**
 * 更新模态框内容
 * @param {Object} photo - 照片对象
 */
function updateModalContent(photo) {
    const modalImage = document.getElementById('modalImage');
    const modalUsername = document.getElementById('modalUsername');
    const modalUserAvatar = document.getElementById('modalUserAvatar');
    const modalDate = document.getElementById('modalDate');
    const modalDescription = document.getElementById('modalDescription');
    const likeCount = document.getElementById('likeCount');
    const likeBtn = document.getElementById('likeBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const keywordsContainer = document.querySelector('.keywords');
    
    if (modalImage) modalImage.src = photo.image_url;
    if (modalUsername) {
        modalUsername.textContent = photo.username;
        modalUsername.onclick = () => {
            closeModal();
            goToUserProfile(photo.user_id);
        };
    }
    
    if (modalUserAvatar) {
        modalUserAvatar.src = photo.user_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(photo.username)}&background=random`;
        modalUserAvatar.onclick = () => {
            closeModal();
            goToUserProfile(photo.user_id);
        };
    }
    
    if (modalDate) {
        modalDate.textContent = new Date(photo.created_at).toLocaleString('zh-CN');
    }
    
    if (modalDescription) {
        modalDescription.textContent = photo.description || '';
    }
    
    if (likeCount) {
        likeCount.textContent = photo.likes_count || 0;
    }
    
    if (likeBtn) {
        updateLikeButton(likeBtn, photo.id);
    }
    
    if (deleteBtn) {
        // 如果是自己的照片或者是管理员，显示删除按钮
        const isOwner = currentUser && photo.user_id === currentUser.id;
        const isAdmin = currentUser && currentUser.id === ADMIN_ID;
        
        if (isOwner || isAdmin) {
            deleteBtn.style.display = 'block';
            deleteBtn.onclick = () => deletePhoto(photo.id, isAdmin);
        } else {
            deleteBtn.style.display = 'none';
        }
    }
    
    // 更新关键词
    if (keywordsContainer) {
        keywordsContainer.innerHTML = '';
        if (photo.keywords && Array.isArray(photo.keywords)) {
            photo.keywords.forEach(keyword => {
                const keywordElement = document.createElement('span');
                keywordElement.className = 'keyword';
                keywordElement.textContent = keyword;
                keywordElement.onclick = () => {
                    document.getElementById('searchInput').value = keyword;
                    searchPhotos();
                    closeModal();
                };
                keywordsContainer.appendChild(keywordElement);
            });
        }
    }
}

/**
 * 关闭模态框
 */
function closeModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    currentPhotoId = null;
}

// ============================================
// 点赞功能
// ============================================

/**
 * 加载已点赞的照片
 */
async function loadLikedPhotos() {
    if (!currentUser) return;
    
    try {
        const { data: likes, error } = await supabase
            .from('likes')
            .select('photo_id')
            .eq('user_id', currentUser.id);
        
        if (!error && likes) {
            likes.forEach(like => likedPhotos.add(like.photo_id));
        }
    } catch (error) {
        console.error('加载点赞失败:', error);
    }
}

/**
 * 更新点赞按钮状态
 * @param {HTMLElement} button - 点赞按钮
 * @param {string} photoId - 照片ID
 */
function updateLikeButton(button, photoId) {
    if (!button) return;
    
    const likeCount = button.querySelector('#likeCount') || button;
    
    if (likedPhotos.has(photoId)) {
        button.innerHTML = '<i class="fas fa-heart"></i> <span id="likeCount">已点赞</span>';
        button.classList.add('liked');
    } else {
        button.innerHTML = '<i class="far fa-heart"></i> <span id="likeCount">点赞</span>';
        button.classList.remove('liked');
    }
}

/**
 * 点赞/取消点赞
 */
async function toggleLike() {
    if (!currentUser) {
        showNotification('请先登录', 'info');
        return;
    }
    
    if (!currentPhotoId) return;
    
    const likeBtn = document.getElementById('likeBtn');
    const likeCount = document.getElementById('likeCount');
    
    if (!likeBtn || !likeCount) return;
    
    let currentCount = parseInt(likeCount.textContent) || 0;
    
    try {
        if (likedPhotos.has(currentPhotoId)) {
            // 取消点赞
            const { error } = await supabase
                .from('likes')
                .delete()
                .eq('user_id', currentUser.id)
                .eq('photo_id', currentPhotoId);
            
            if (error) throw error;
            
            likedPhotos.delete(currentPhotoId);
            currentCount--;
            
            // 更新照片的点赞数
            await supabase
                .from('photos')
                .update({ likes_count: currentCount })
                .eq('id', currentPhotoId);
            
            updateLikeButton(likeBtn, currentPhotoId);
            showNotification('已取消点赞', 'success');
        } else {
            // 点赞
            const { error } = await supabase
                .from('likes')
                .insert({
                    user_id: currentUser.id,
                    photo_id: currentPhotoId
                });
            
            if (error) throw error;
            
            likedPhotos.add(currentPhotoId);
            currentCount++;
            
            // 更新照片的点赞数
            await supabase
                .from('photos')
                .update({ likes_count: currentCount })
                .eq('id', currentPhotoId);
            
            updateLikeButton(likeBtn, currentPhotoId);
            showNotification('点赞成功', 'success');
        }
        
        likeCount.textContent = currentCount;
        
        // 更新照片卡片上的点赞数
        updatePhotoCardLikeCount(currentPhotoId, currentCount);
    } catch (error) {
        console.error('点赞操作失败:', error);
        showNotification('操作失败，请重试', 'error');
    }
}

/**
 * 快速点赞（在照片卡片上）
 * @param {string} photoId - 照片ID
 */
async function quickLikePhoto(photoId) {
    if (!currentUser) {
        showNotification('请先登录', 'info');
        return;
    }
    
    try {
        if (likedPhotos.has(photoId)) {
            // 取消点赞
            const { error } = await supabase
                .from('likes')
                .delete()
                .eq('user_id', currentUser.id)
                .eq('photo_id', photoId);
            
            if (error) throw error;
            
            likedPhotos.delete(photoId);
            
            // 获取当前点赞数
            const { data: photo } = await supabase
                .from('photos')
                .select('likes_count')
                .eq('id', photoId)
                .single();
            
            const newCount = (photo?.likes_count || 1) - 1;
            
            // 更新照片的点赞数
            await supabase
                .from('photos')
                .update({ likes_count: newCount })
                .eq('id', photoId);
            
            updatePhotoCardLikeCount(photoId, newCount);
        } else {
            // 点赞
            const { error } = await supabase
                .from('likes')
                .insert({
                    user_id: currentUser.id,
                    photo_id: photoId
                });
            
            if (error) throw error;
            
            likedPhotos.add(photoId);
            
            // 获取当前点赞数
            const { data: photo } = await supabase
                .from('photos')
                .select('likes_count')
                .eq('id', photoId)
                .single();
            
            const newCount = (photo?.likes_count || 0) + 1;
            
            // 更新照片的点赞数
            await supabase
                .from('photos')
                .update({ likes_count: newCount })
                .eq('id', photoId);
            
            updatePhotoCardLikeCount(photoId, newCount);
        }
    } catch (error) {
        console.error('快速点赞失败:', error);
    }
}

/**
 * 更新照片卡片的点赞数
 * @param {string} photoId - 照片ID
 * @param {number} count - 新的点赞数
 */
function updatePhotoCardLikeCount(photoId, count) {
    const photoCard = document.querySelector(`.photo-card[data-id="${photoId}"]`);
    if (photoCard) {
        const likeCountElement = photoCard.querySelector('.photo-stats span:first-child');
        if (likeCountElement) {
            likeCountElement.innerHTML = `<i class="fas fa-heart"></i> ${count}`;
        }
        
        // 更新快速点赞按钮
        const quickLikeBtn = photoCard.querySelector('.quick-like-btn');
        if (quickLikeBtn) {
            quickLikeBtn.innerHTML = `<i class="${likedPhotos.has(photoId) ? 'fas' : 'far'} fa-heart"></i>`;
        }
    }
}

// ============================================
// 评论功能
// ============================================

/**
 * 加载评论
 * @param {string} photoId - 照片ID
 */
async function loadComments(photoId) {
    const commentsList = document.getElementById('commentsList');
    const commentsCount = document.getElementById('commentsCount');
    
    if (!commentsList) return;
    
    commentsList.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    
    try {
        const { data: comments, error } = await supabase
            .from('comments')
            .select('*')
            .eq('photo_id', photoId)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        commentsList.innerHTML = '';
        
        if (comments && comments.length > 0) {
            comments.forEach(comment => {
                const commentElement = createCommentElement(comment);
                commentsList.appendChild(commentElement);
            });
            if (commentsCount) commentsCount.textContent = comments.length;
        } else {
            commentsList.innerHTML = '<p class="no-comments">还没有评论，快来第一个评论吧！</p>';
            if (commentsCount) commentsCount.textContent = '0';
        }
    } catch (error) {
        console.error('加载评论失败:', error);
        commentsList.innerHTML = '<p>加载评论失败</p>';
    }
}

/**
 * 创建评论元素
 * @param {Object} comment - 评论对象
 * @returns {HTMLElement} 评论元素
 */
function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.dataset.id = comment.id;
    
    const formattedDate = new Date(comment.created_at).toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    div.innerHTML = `
        <img src="${comment.user_avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(comment.username) + '&background=random'}" 
             class="avatar-sm" alt="${comment.username}"
             onclick="goToUserProfile('${comment.user_id}')">
        <div class="comment-content">
            <div class="comment-header">
                <span class="comment-username" onclick="goToUserProfile('${comment.user_id}')">
                    ${comment.username}
                </span>
                <span class="comment-time">${formattedDate}</span>
                ${currentUser && (comment.user_id === currentUser.id || currentUser.id === ADMIN_ID) ? 
                    `<button class="delete-comment-btn" onclick="deleteComment('${comment.id}')">
                        <i class="fas fa-trash"></i>
                    </button>` : ''
                }
            </div>
            <p>${comment.content}</p>
        </div>
    `;
    
    return div;
}

/**
 * 添加评论
 */
async function addComment() {
    if (!currentUser) {
        showNotification('请先登录', 'info');
        return;
    }
    
    if (!currentPhotoId) return;
    
    const commentInput = document.getElementById('commentInput');
    if (!commentInput) return;
    
    const content = commentInput.value.trim();
    
    if (!content) {
        showNotification('评论内容不能为空', 'error');
        return;
    }
    
    if (content.length > 500) {
        showNotification('评论内容不能超过500字', 'error');
        return;
    }
    
    try {
        // 获取当前照片信息以更新评论数
        const { data: photo } = await supabase
            .from('photos')
            .select('comments_count')
            .eq('id', currentPhotoId)
            .single();
        
        // 添加评论
        const { data: comment, error } = await supabase
            .from('comments')
            .insert({
                user_id: currentUser.id,
                photo_id: currentPhotoId,
                content: content,
                username: currentUser.user_metadata?.name || currentUser.email.split('@')[0],
                user_avatar: currentUser.user_metadata?.avatar_url
            })
            .select()
            .single();
        
        if (error) throw error;
        
        // 更新照片的评论数
        const newCount = (photo?.comments_count || 0) + 1;
        await supabase
            .from('photos')
            .update({ comments_count: newCount })
            .eq('id', currentPhotoId);
        
        // 添加评论到列表
        const commentsList = document.getElementById('commentsList');
        const commentsCount = document.getElementById('commentsCount');
        
        if (commentsList) {
            // 移除"没有评论"的提示
            const noCommentsMsg = commentsList.querySelector('.no-comments');
            if (noCommentsMsg) {
                noCommentsMsg.remove();
            }
            
            const commentElement = createCommentElement(comment);
            commentsList.appendChild(commentElement);
            
            // 滚动到底部
            commentsList.scrollTop = commentsList.scrollHeight;
        }
        
        if (commentsCount) {
            commentsCount.textContent = newCount;
        }
        
        // 更新照片卡片的评论数
        updatePhotoCardCommentCount(currentPhotoId, newCount);
        
        // 清空输入框
        commentInput.value = '';
        showNotification('评论成功', 'success');
    } catch (error) {
        console.error('评论失败:', error);
        showNotification('评论失败，请重试', 'error');
    }
}

/**
 * 删除评论
 * @param {string} commentId - 评论ID
 */
async function deleteComment(commentId) {
    if (!confirm('确定要删除这条评论吗？')) {
        return;
    }
    
    try {
        // 获取评论信息
        const { data: comment } = await supabase
            .from('comments')
            .select('photo_id')
            .eq('id', commentId)
            .single();
        
        if (!comment) return;
        
        // 删除评论
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);
        
        if (error) throw error;
        
        // 更新照片的评论数
        const { data: photo } = await supabase
            .from('photos')
            .select('comments_count')
            .eq('id', comment.photo_id)
            .single();
        
        if (photo) {
            const newCount = Math.max(0, (photo.comments_count || 1) - 1);
            await supabase
                .from('photos')
                .update({ comments_count: newCount })
                .eq('id', comment.photo_id);
            
            // 更新评论数显示
            const commentsCount = document.getElementById('commentsCount');
            if (commentsCount) commentsCount.textContent = newCount;
            
            // 更新照片卡片的评论数
            updatePhotoCardCommentCount(comment.photo_id, newCount);
        }
        
        // 从DOM中移除评论
        const commentElement = document.querySelector(`.comment-item[data-id="${commentId}"]`);
        if (commentElement) {
            commentElement.remove();
        }
        
        showNotification('评论已删除', 'success');
    } catch (error) {
        console.error('删除评论失败:', error);
        showNotification('删除失败，请重试', 'error');
    }
}

/**
 * 更新照片卡片的评论数
 * @param {string} photoId - 照片ID
 * @param {number} count - 新的评论数
 */
function updatePhotoCardCommentCount(photoId, count) {
    const photoCard = document.querySelector(`.photo-card[data-id="${photoId}"]`);
    if (photoCard) {
        const commentCountElement = photoCard.querySelector('.photo-stats span:nth-child(2)');
        if (commentCountElement) {
            commentCountElement.innerHTML = `<i class="fas fa-comment"></i> ${count}`;
        }
    }
}

// ============================================
// 关注功能
// ============================================

/**
 * 加载用户关注关系
 */
async function loadUserFollows() {
    if (!currentUser) return;
    
    try {
        const { data: follows, error } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', currentUser.id);
        
        if (!error && follows) {
            follows.forEach(follow => userFollows.add(follow.following_id));
        }
    } catch (error) {
        console.error('加载关注失败:', error);
    }
}

/**
 * 获取关注用户的ID列表
 * @returns {Promise<Array>} 关注用户ID数组
 */
async function getFollowingUserIds() {
    if (!currentUser) return [];
    
    try {
        const { data: follows, error } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', currentUser.id);
        
        if (error) throw error;
        
        return follows ? follows.map(f => f.following_id) : [];
    } catch (error) {
        console.error('获取关注用户失败:', error);
        return [];
    }
}

/**
 * 打开关注用户模态框
 */
function openFollowModal() {
    const modal = document.getElementById('followModal');
    if (modal) {
        modal.style.display = 'block';
        searchUsers('');
    }
}

/**
 * 关闭关注用户模态框
 */
function closeFollowModal() {
    const modal = document.getElementById('followModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * 搜索用户
 * @param {string} query - 搜索关键词
 */
async function searchUsers(query) {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
    usersList.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>加载中...</p></div>';
    
    try {
        let users = [];
        
        if (!query) {
            // 显示热门用户（按照片数量排序）
            const { data: userPhotos, error } = await supabase
                .from('photos')
                .select('user_id, username, user_avatar, count')
                .eq('is_private', false)
                .order('count', { ascending: false, foreignTable: 'photos' })
                .limit(20);
            
            if (error) throw error;
            
            // 去重并统计照片数量
            const userMap = new Map();
            userPhotos?.forEach(photo => {
                if (!userMap.has(photo.user_id)) {
                    userMap.set(photo.user_id, {
                        id: photo.user_id,
                        username: photo.username,
                        avatar: photo.user_avatar,
                        photoCount: 1
                    });
                } else {
                    userMap.get(photo.user_id).photoCount++;
                }
            });
            
            users = Array.from(userMap.values());
        } else {
            // 搜索用户
            const { data: photos, error } = await supabase
                .from('photos')
                .select('user_id, username, user_avatar')
                .ilike('username', `%${query}%`)
                .limit(20);
            
            if (error) throw error;
            
            // 去重
            const uniqueUsers = [];
            const seen = new Set();
            
            photos?.forEach(photo => {
                if (!seen.has(photo.user_id)) {
                    seen.add(photo.user_id);
                    uniqueUsers.push({
                        id: photo.user_id,
                        username: photo.username,
                        avatar: photo.user_avatar,
                        photoCount: 1
                    });
                }
            });
            
            users = uniqueUsers;
        }
        
        displayUsers(users);
    } catch (error) {
        console.error('搜索用户失败:', error);
        usersList.innerHTML = '<p>搜索失败，请重试</p>';
    }
}

/**
 * 显示用户列表
 * @param {Array} users - 用户数组
 */
function displayUsers(users) {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
    usersList.innerHTML = '';
    
    if (users.length === 0) {
        usersList.innerHTML = '<p class="no-users">没有找到用户</p>';
        return;
    }
    
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        
        const isFollowing = userFollows.has(user.id);
        const isCurrentUser = currentUser && user.id === currentUser.id;
        
        userItem.innerHTML = `
            <img src="${user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username) + '&background=random'}" 
                 class="avatar-md" alt="${user.username}"
                 onclick="goToUserProfile('${user.id}')">
            <div class="user-info">
                <h4 onclick="goToUserProfile('${user.id}')">${user.username}</h4>
                <p>${user.photoCount || 0} 张照片</p>
            </div>
            ${!isCurrentUser ? `
                <button class="follow-btn ${isFollowing ? 'following' : ''}" 
                        onclick="toggleFollow('${user.id}', this)">
                    ${isFollowing ? '已关注' : '关注'}
                </button>
            ` : ''}
        `;
        
        usersList.appendChild(userItem);
    });
}

/**
 * 关注/取消关注用户
 * @param {string} userId - 用户ID
 * @param {HTMLElement} button - 关注按钮
 */
async function toggleFollow(userId, button) {
    if (!currentUser) {
        showNotification('请先登录', 'info');
        return;
    }
    
    if (currentUser.id === userId) {
        showNotification('不能关注自己', 'error');
        return;
    }
    
    try {
        if (userFollows.has(userId)) {
            // 取消关注
            const { error } = await supabase
                .from('follows')
                .delete()
                .eq('follower_id', currentUser.id)
                .eq('following_id', userId);
            
            if (error) throw error;
            
            userFollows.delete(userId);
            button.textContent = '关注';
            button.classList.remove('following');
            showNotification('已取消关注', 'success');
        } else {
            // 关注
            const { error } = await supabase
                .from('follows')
                .insert({
                    follower_id: currentUser.id,
                    following_id: userId
                });
            
            if (error) throw error;
            
            userFollows.add(userId);
            button.textContent = '已关注';
            button.classList.add('following');
            showNotification('关注成功', 'success');
        }
        
        // 如果当前正在查看关注内容，重新加载
        if (currentFilter === 'following') {
            loadPhotos('following', true);
        }
    } catch (error) {
        console.error('关注操作失败:', error);
        showNotification('操作失败，请重试', 'error');
    }
}

// ============================================
// 用户主页相关
// ============================================

/**
 * 跳转到用户主页
 * @param {string} userId - 用户ID
 */
function goToUserProfile(userId) {
    window.location.href = `profile.html?user=${userId}`;
}

// ============================================
// 照片管理功能
// ============================================

/**
 * 删除照片
 * @param {string} photoId - 照片ID
 * @param {boolean} isAdmin - 是否为管理员操作
 */
async function deletePhoto(photoId, isAdmin = false) {
    if (!confirm('确定要删除这张照片吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        // 检查权限
        if (!isAdmin) {
            const { data: photo } = await supabase
                .from('photos')
                .select('user_id')
                .eq('id', photoId)
                .single();
            
            if (!photo || photo.user_id !== currentUser.id) {
                showNotification('无权删除此照片', 'error');
                return;
            }
        }
        
        // 删除照片
        const { error } = await supabase
            .from('photos')
            .delete()
            .eq('id', photoId);
        
        if (error) throw error;
        
        showNotification('删除成功', 'success');
        closeModal();
        loadPhotos(currentFilter, true);
    } catch (error) {
        console.error('删除照片失败:', error);
        showNotification('删除失败，请重试', 'error');
    }
}

/**
 * 切换照片隐私状态
 * @param {string} photoId - 照片ID
 * @param {boolean} isPrivate - 当前隐私状态
 */
async function togglePhotoPrivacy(photoId, isPrivate) {
    try {
        const { error } = await supabase
            .from('photos')
            .update({ is_private: !isPrivate })
            .eq('id', photoId);
        
        if (error) throw error;
        
        showNotification(`照片已${!isPrivate ? '设为私密' : '设为公开'}`, 'success');
        
        // 重新加载照片
        setTimeout(() => {
            if (currentFilter === 'following') {
                loadPhotos('following', true);
            } else {
                // 更新当前照片卡片
                const photoCard = document.querySelector(`.photo-card[data-id="${photoId}"]`);
                if (photoCard) {
                    const privacyBtn = photoCard.querySelector('.photo-privacy-btn');
                    if (privacyBtn) {
                        privacyBtn.innerHTML = `<i class="fas fa-${!isPrivate ? 'lock' : 'lock-open'}"></i>`;
                    }
                    
                    const privacyBadge = photoCard.querySelector('.photo-stats span:last-child');
                    if (!isPrivate) {
                        if (!privacyBadge || !privacyBadge.innerHTML.includes('私密')) {
                            const privacySpan = document.createElement('span');
                            privacySpan.innerHTML = '<i class="fas fa-lock"></i> 私密';
                            photoCard.querySelector('.photo-stats').appendChild(privacySpan);
                        }
                    } else if (privacyBadge && privacyBadge.innerHTML.includes('私密')) {
                        privacyBadge.remove();
                    }
                }
            }
        }, 500);
    } catch (error) {
        console.error('切换隐私状态失败:', error);
        showNotification('操作失败，请重试', 'error');
    }
}

// ============================================
// 分享功能
// ============================================

/**
 * 分享照片
 */
function sharePhoto() {
    if (!currentPhotoId) return;
    
    const shareUrl = `${window.location.origin}?photo=${currentPhotoId}`;
    const shareText = '我在光影分享发现了一张美丽的照片，快来看看吧！';
    
    if (navigator.share) {
        navigator.share({
            title: '光影分享 - 发现美好瞬间',
            text: shareText,
            url: shareUrl
        }).catch(err => {
            console.log('分享取消或失败:', err);
        });
    } else {
        // 复制链接到剪贴板
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => {
            showNotification('分享链接已复制到剪贴板', 'success');
        }).catch(err => {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = `${shareText} ${shareUrl}`;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('分享链接已复制到剪贴板', 'success');
        });
    }
}

// ============================================
// 通知系统
// ============================================

/**
 * 显示通知
 * @param {string} message - 通知消息
 * @param {string} type - 通知类型: success, error, info
 * @param {number} duration - 显示时长(毫秒)
 */
function showNotification(message, type = 'info', duration = 3000) {
    // 移除现有的通知
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 创建新的通知
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // 自动移除
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, duration);
}

// ============================================
// 事件监听器设置
// ============================================

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    console.log('设置事件监听器...');
    
    // 搜索框事件
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        // 输入防抖
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchPhotos();
            }, 500);
        });
        
        // 回车搜索
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchPhotos();
            }
        });
    }
    
    // 退出登录按钮
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', logout);
    }
    
    // 模态框点击外部关闭
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    });
    
    // 评论输入框回车事件
    const commentInput = document.getElementById('commentInput');
    if (commentInput) {
        commentInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addComment();
            }
        });
    }
    
    // 用户头像点击事件委托
    document.addEventListener('click', function(e) {
        // 用户头像点击
        if (e.target.classList.contains('avatar-sm') || 
            e.target.classList.contains('avatar-md') ||
            e.target.classList.contains('photo-username')) {
            const parent = e.target.closest('[onclick*="goToUserProfile"]');
            if (parent) {
                const userId = parent.getAttribute('onclick').match(/'([^']+)'/)[1];
                goToUserProfile(userId);
            }
        }
    });
    
    // 页面可见性变化
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            // 页面重新可见时刷新数据
            loadPhotos(currentFilter, true);
        }
    });
    
    console.log('事件监听器设置完成');
}

// ============================================
// 键盘快捷键
// ============================================

/**
 * 设置键盘快捷键
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // ESC 关闭模态框
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal');
            let modalClosed = false;
            modals.forEach(modal => {
                if (modal.style.display === 'block') {
                    modal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                    modalClosed = true;
                }
            });
            
            // 如果关闭了模态框，阻止默认行为
            if (modalClosed) {
                e.preventDefault();
            }
        }
        
        // Ctrl/Cmd + F 聚焦搜索框
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        
        // Ctrl/Cmd + U 上传页面
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
            e.preventDefault();
            if (currentUser) {
                window.location.href = 'upload.html';
            } else {
                showNotification('请先登录', 'info');
            }
        }
        
        // Ctrl/Cmd + H 返回首页
        if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
            e.preventDefault();
            window.location.href = 'index.html';
        }
        
        // Ctrl/Cmd + / 显示帮助
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            showKeyboardShortcutsHelp();
        }
    });
}

/**
 * 显示键盘快捷键帮助
 */
function showKeyboardShortcutsHelp() {
    const helpHtml = `
        <div class="keyboard-shortcuts-help">
            <h3><i class="fas fa-keyboard"></i> 键盘快捷键</h3>
            <ul>
                <li><kbd>ESC</kbd> - 关闭模态框</li>
                <li><kbd>Ctrl/Cmd + F</kbd> - 聚焦搜索框</li>
                <li><kbd>Ctrl/Cmd + U</kbd> - 上传照片</li>
                <li><kbd>Ctrl/Cmd + H</kbd> - 返回首页</li>
                <li><kbd>Ctrl/Cmd + /</kbd> - 显示此帮助</li>
            </ul>
        </div>
    `;
    
    showNotification(helpHtml, 'info', 5000);
}

// ============================================
// 图片懒加载
// ============================================

/**
 * 设置图片懒加载
 */
function setupLazyLoading() {
    if ('IntersectionObserver' in window) {
        const lazyImages = document.querySelectorAll('img[loading="lazy"]');
        
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.add('loaded');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => {
            if (!img.src && img.dataset.src) {
                imageObserver.observe(img);
            }
        });
    }
}

// ============================================
// 实时更新
// ============================================

/**
 * 设置实时更新
 */
function setupRealtimeUpdates() {
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
    }
    
    // 订阅照片更新
    realtimeSubscription = supabase
        .channel('public:photos')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'photos' }, 
            handleRealtimeUpdate
        )
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'likes' },
            handleLikeUpdate
        )
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'comments' },
            handleCommentUpdate
        )
        .subscribe();
    
    console.log('实时更新已启用');
}

/**
 * 处理实时更新
 * @param {Object} payload - 更新数据
 */
function handleRealtimeUpdate(payload) {
    console.log('收到实时更新:', payload);
    
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch (eventType) {
        case 'INSERT':
            // 新照片上传
            if (!newRecord.is_private || (currentUser && newRecord.user_id === currentUser.id)) {
                showNotification(`新照片: ${newRecord.description || '未命名'}`, 'info');
                // 如果当前在最新或热门页面，重新加载
                if (currentFilter === 'recent' || currentFilter === 'popular') {
                    setTimeout(() => loadPhotos(currentFilter, true), 1000);
                }
            }
            break;
            
        case 'UPDATE':
            // 照片更新
            if (newRecord.id === currentPhotoId) {
                // 更新模态框中的点赞数和评论数
                const likeCount = document.getElementById('likeCount');
                const commentsCount = document.getElementById('commentsCount');
                
                if (likeCount && newRecord.likes_count !== undefined) {
                    likeCount.textContent = newRecord.likes_count;
                }
                
                if (commentsCount && newRecord.comments_count !== undefined) {
                    commentsCount.textContent = newRecord.comments_count;
                }
            }
            
            // 更新照片卡片
            updatePhotoCardStats(newRecord.id, newRecord.likes_count, newRecord.comments_count);
            break;
            
        case 'DELETE':
            // 照片删除
            if (oldRecord.id === currentPhotoId) {
                closeModal();
            }
            
            // 从DOM中移除照片卡片
            const photoCard = document.querySelector(`.photo-card[data-id="${oldRecord.id}"]`);
            if (photoCard) {
                photoCard.remove();
            }
            break;
    }
}

/**
 * 处理点赞更新
 * @param {Object} payload - 更新数据
 */
function handleLikeUpdate(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    if (eventType === 'INSERT' && newRecord.user_id === currentUser?.id) {
        likedPhotos.add(newRecord.photo_id);
    } else if (eventType === 'DELETE' && oldRecord.user_id === currentUser?.id) {
        likedPhotos.delete(oldRecord.photo_id);
    }
}

/**
 * 处理评论更新
 * @param {Object} payload - 更新数据
 */
function handleCommentUpdate(payload) {
    const { eventType, new: newRecord } = payload;
    
    if (eventType === 'INSERT' && newRecord.photo_id === currentPhotoId) {
        // 新评论添加到当前照片
        loadComments(currentPhotoId);
    }
}

/**
 * 更新照片卡片统计信息
 * @param {string} photoId - 照片ID
 * @param {number} likes - 点赞数
 * @param {number} comments - 评论数
 */
function updatePhotoCardStats(photoId, likes, comments) {
    const photoCard = document.querySelector(`.photo-card[data-id="${photoId}"]`);
    if (photoCard) {
        const likeCountElement = photoCard.querySelector('.photo-stats span:first-child');
        const commentCountElement = photoCard.querySelector('.photo-stats span:nth-child(2)');
        
        if (likeCountElement && likes !== undefined) {
            likeCountElement.innerHTML = `<i class="fas fa-heart"></i> ${likes}`;
        }
        
        if (commentCountElement && comments !== undefined) {
            commentCountElement.innerHTML = `<i class="fas fa-comment"></i> ${comments}`;
        }
    }
}

// ============================================
// 用户界面功能
// ============================================

/**
 * 切换移动端菜单
 */
function toggleMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
        mobileMenu.classList.toggle('active');
        
        // 点击外部关闭菜单
        if (mobileMenu.classList.contains('active')) {
            setTimeout(() => {
                document.addEventListener('click', closeMenuOnClickOutside);
            }, 10);
        } else {
            document.removeEventListener('click', closeMenuOnClickOutside);
        }
    }
}

/**
 * 点击外部关闭移动端菜单
 * @param {Event} event - 点击事件
 */
function closeMenuOnClickOutside(event) {
    const mobileMenu = document.getElementById('mobileMenu');
    const menuToggle = document.querySelector('.menu-toggle');
    
    if (mobileMenu && 
        !mobileMenu.contains(event.target) && 
        !menuToggle.contains(event.target)) {
        mobileMenu.classList.remove('active');
        document.removeEventListener('click', closeMenuOnClickOutside);
    }
}

/**
 * 退出登录
 */
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        likedPhotos.clear();
        userFollows.clear();
        
        updateUIForGuest();
        showNotification('已退出登录', 'success');
        
        // 重定向到首页
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } catch (error) {
        console.error('退出登录失败:', error);
        showNotification('退出登录失败，请重试', 'error');
    }
}

// ============================================
// 错误处理
// ============================================

/**
 * 全局错误处理
 */
window.addEventListener('error', function(e) {
    console.error('全局错误:', e.error);
    showNotification('发生错误，请刷新页面重试', 'error');
});

/**
 * Promise拒绝处理
 */
window.addEventListener('unhandledrejection', function(e) {
    console.error('未处理的Promise拒绝:', e.reason);
    showNotification('操作失败，请重试', 'error');
});

// ============================================
// 网络状态检测
// ============================================

window.addEventListener('online', function() {
    showNotification('网络已恢复连接', 'success');
    // 重新加载数据
    loadPhotos(currentFilter, true);
});

window.addEventListener('offline', function() {
    showNotification('网络连接已断开，部分功能可能不可用', 'error');
});

// ============================================
// 页面卸载前清理
// ============================================

window.addEventListener('beforeunload', function() {
    // 取消实时订阅
    if (realtimeSubscription) {
        supabase.removeChannel(realtimeSubscription);
    }
});

// ============================================
// 辅助函数
// ============================================

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} delay - 延迟时间(毫秒)
 * @returns {Function} 防抖后的函数
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 限制时间(毫秒)
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ============================================
// 导出函数（如果需要）
// ============================================

// 将必要的函数导出到全局作用域
window.loadPhotos = loadPhotos;
window.searchPhotos = searchPhotos;
window.openPhotoModal = openPhotoModal;
window.closeModal = closeModal;
window.toggleLike = toggleLike;
window.addComment = addComment;
window.sharePhoto = sharePhoto;
window.deletePhoto = deletePhoto;
window.openFollowModal = openFollowModal;
window.closeFollowModal = closeFollowModal;
window.searchUsers = searchUsers;
window.toggleFollow = toggleFollow;
window.goToUserProfile = goToUserProfile;
window.searchKeyword = searchKeyword;
window.quickLikePhoto = quickLikePhoto;
window.togglePhotoPrivacy = togglePhotoPrivacy;
window.deleteComment = deleteComment;
window.loadMorePhotos = loadMorePhotos;
window.toggleMenu = toggleMenu;
window.logout = logout;
window.showNotification = showNotification;

console.log('script.js 加载完成');