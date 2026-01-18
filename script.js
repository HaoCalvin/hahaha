// 主应用逻辑
document.addEventListener('DOMContentLoaded', async function() {
    // 全局变量
    let currentPage = 'home';
    let currentViewingPhotoId = null;
    let photos = [];
    let currentPageNum = 1;
    const photosPerPage = 20;
    
    // 初始化Supabase客户端
    window.supabase = supabase.createClient(
        window.SUPABASE_CONFIG.supabaseUrl,
        window.SUPABASE_CONFIG.supabaseKey
    );
    
    // 初始化管理器
    if (!window.authManager) {
        window.authManager = new AuthManager();
    }
    
    if (!window.uploadManager) {
        window.uploadManager = new UploadManager();
    }
    
    // 初始化事件监听器
    initEventListeners();
    
    // 加载初始数据
    await loadInitialData();
    
    // 显示首页
    switchPage('home');
});

// 初始化事件监听器
function initEventListeners() {
    // 导航链接点击事件
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('href').substring(1);
            switchPage(page);
            
            // 更新活动状态
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
    
    // 移动菜单按钮
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('show');
        });
    }
    
    // 搜索功能
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    if (searchInput && searchBtn) {
        // 按钮搜索
        searchBtn.addEventListener('click', () => {
            performSearch(searchInput.value);
        });
        
        // 回车搜索
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch(searchInput.value);
            }
        });
        
        // 搜索建议
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (searchInput.value.length >= 2) {
                    showSearchSuggestions(searchInput.value);
                }
            }, 300);
        });
    }
    
    // 探索页面搜索
    const exploreSearch = document.getElementById('exploreSearch');
    if (exploreSearch) {
        exploreSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadExplorePhotos(exploreSearch.value);
            }
        });
    }
    
    // 排序选择
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            loadExplorePhotos();
        });
    }
    
    // 加载更多按钮
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMorePhotos);
    }
    
    // 开始探索按钮
    const getStartedBtn = document.getElementById('getStartedBtn');
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            switchPage('explore');
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelector('a[href="#explore"]').classList.add('active');
        });
    }
    
    // 新讨论按钮
    const newDiscussionBtn = document.getElementById('newDiscussionBtn');
    if (newDiscussionBtn) {
        newDiscussionBtn.addEventListener('click', () => {
            if (!authManager.isAuthenticated()) {
                showMessage('请先登录再创建话题', 'error');
                openAuthModal();
                return;
            }
            openNewDiscussionModal();
        });
    }
    
    // 提交讨论
    const submitDiscussionBtn = document.getElementById('submitDiscussionBtn');
    if (submitDiscussionBtn) {
        submitDiscussionBtn.addEventListener('click', submitDiscussion);
    }
    
    // 提交上传
    const submitUploadBtn = document.getElementById('submitUploadBtn');
    if (submitUploadBtn) {
        submitUploadBtn.addEventListener('click', () => {
            uploadManager.uploadPhotos();
        });
    }
    
    // 登录表单
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            if (!email || !password) {
                showMessage('请输入邮箱和密码', 'error');
                return;
            }
            
            const success = await authManager.signIn(email, password);
            if (success) {
                closeAuthModal();
            }
        });
    }
    
    // 注册表单
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            const username = document.getElementById('registerUsername').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            
            if (!username || !email || !password || !confirmPassword) {
                showMessage('请填写所有字段', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showMessage('两次输入的密码不一致', 'error');
                return;
            }
            
            if (password.length < 6) {
                showMessage('密码长度至少6位', 'error');
                return;
            }
            
            const success = await authManager.signUp(email, password, username);
            if (success) {
                closeAuthModal();
            }
        });
    }
    
    // 认证标签切换
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            // 更新标签状态
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // 显示对应表单
            document.getElementById('loginForm').style.display = 
                tabName === 'login' ? 'block' : 'none';
            document.getElementById('registerForm').style.display = 
                tabName === 'register' ? 'block' : 'none';
        });
    });
    
    // 关闭模态框
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // 关闭图片查看器
    const closeImageViewer = document.querySelector('.close-image-viewer');
    if (closeImageViewer) {
        closeImageViewer.addEventListener('click', () => {
            document.getElementById('imageViewer').style.display = 'none';
        });
    }
    
    // 图片查看器外部点击关闭
    window.addEventListener('click', (e) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // 保存设置
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }
    
    // 更换头像
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', () => {
            // 创建文件输入元素
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                // 检查文件大小和类型
                if (file.size > 5 * 1024 * 1024) { // 5MB限制
                    showMessage('头像大小不能超过5MB', 'error');
                    return;
                }
                
                if (!file.type.startsWith('image/')) {
                    showMessage('请选择图片文件', 'error');
                    return;
                }
                
                showLoading();
                
                try {
                    // 上传到Cloudinary
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('upload_preset', window.SUPABASE_CONFIG.cloudinaryUploadPreset);
                    formData.append('cloud_name', window.SUPABASE_CONFIG.cloudinaryCloudName);
                    
                    const response = await fetch(`https://api.cloudinary.com/v1_1/${window.SUPABASE_CONFIG.cloudinaryCloudName}/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await response.json();
                    
                    if (data.error) {
                        throw new Error(data.error.message);
                    }
                    
                    // 更新用户头像
                    const updates = {
                        avatar_url: data.secure_url,
                        updated_at: new Date().toISOString()
                    };
                    
                    const success = await authManager.updateProfile(updates);
                    if (success) {
                        // 更新设置模态框中的头像
                        document.getElementById('settingsAvatar').src = data.secure_url;
                        // 更新用户界面
                        authManager.updateUIForLoggedInUser();
                        showMessage('头像更新成功', 'success');
                    }
                    
                } catch (error) {
                    console.error('上传头像错误:', error);
                    showMessage('头像上传失败: ' + error.message, 'error');
                } finally {
                    hideLoading();
                }
            });
            
            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
        });
    }
    
    // 提交评论
    const submitCommentBtn = document.getElementById('submitCommentBtn');
    if (submitCommentBtn) {
        submitCommentBtn.addEventListener('click', submitComment);
    }
    
    // 点赞按钮
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.btn-like')) {
            const likeBtn = e.target.closest('.btn-like');
            const photoId = likeBtn.dataset.photoId;
            
            if (!authManager.isAuthenticated()) {
                showMessage('请先登录再点赞', 'error');
                openAuthModal();
                return;
            }
            
            if (photoId) {
                await toggleLike(photoId, likeBtn);
            }
        }
    });
    
    // 关注按钮
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.follow-btn')) {
            const followBtn = e.target.closest('.follow-btn');
            const userId = followBtn.dataset.userId;
            
            if (!authManager.isAuthenticated()) {
                showMessage('请先登录再关注', 'error');
                openAuthModal();
                return;
            }
            
            if (userId) {
                await toggleFollow(userId, followBtn);
            }
        }
    });
    
    // 管理员标签切换
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('admin-tab')) {
            const tabName = e.target.dataset.tab;
            
            // 更新标签状态
            document.querySelectorAll('.admin-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            e.target.classList.add('active');
            
            // 显示对应内容
            document.querySelectorAll('.admin-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabName).classList.add('active');
            
            // 加载对应数据
            if (tabName === 'managePhotos') {
                loadAdminPhotos();
            } else if (tabName === 'manageUsers') {
                loadAdminUsers();
            } else if (tabName === 'manageComments') {
                loadAdminComments();
            }
        }
    });
    
    // 用户资料标签切换
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('profile-tab')) {
            const tabName = e.target.dataset.tab;
            const userId = document.querySelector('.profile-avatar')?.dataset.userId || 
                          document.querySelector('.follow-btn')?.dataset.userId;
            
            if (!userId) return;
            
            // 更新标签状态
            document.querySelectorAll('.profile-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            e.target.classList.add('active');
            
            // 显示对应内容
            document.querySelectorAll('.profile-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabName).classList.add('active');
            
            // 加载对应数据
            if (tabName === 'userPhotos') {
                loadUserPhotos(userId);
            } else if (tabName === 'userLikes') {
                loadUserLikes(userId);
            } else if (tabName === 'userFollowing') {
                loadUserFollowing(userId);
            } else if (tabName === 'userFollowers') {
                loadUserFollowers(userId);
            }
        }
    });
    
    // 管理照片搜索
    const adminPhotoSearch = document.getElementById('adminPhotoSearch');
    if (adminPhotoSearch) {
        adminPhotoSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadAdminPhotos(adminPhotoSearch.value);
            }
        });
    }
    
    // 管理用户搜索
    const adminUserSearch = document.getElementById('adminUserSearch');
    if (adminUserSearch) {
        adminUserSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadAdminUsers(adminUserSearch.value);
            }
        });
    }
    
    // 管理评论搜索
    const adminCommentSearch = document.getElementById('adminCommentSearch');
    if (adminCommentSearch) {
        adminCommentSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadAdminComments(adminCommentSearch.value);
            }
        });
    }
}

// 页面切换
function switchPage(pageName) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 显示目标页面
    const targetPage = document.getElementById(pageName);
    if (targetPage) {
        targetPage.classList.add('active');
        currentPage = pageName;
        
        // 滚动到顶部
        window.scrollTo(0, 0);
        
        // 加载页面特定数据
        loadPageData(pageName);
    }
}

// 加载页面数据
async function loadPageData(pageName) {
    switch (pageName) {
        case 'home':
            await loadHomeData();
            break;
        case 'explore':
            await loadExplorePhotos();
            break;
        case 'discussions':
            await loadDiscussions();
            break;
    }
}

// 加载初始数据
async function loadInitialData() {
    showLoading();
    
    try {
        // 加载热门照片
        await loadPopularPhotos();
        
        // 加载最新照片
        await loadRecentPhotos();
        
        // 加载讨论区
        await loadDiscussions();
        
    } catch (error) {
        console.error('加载初始数据错误:', error);
    } finally {
        hideLoading();
    }
}

// 加载首页数据
async function loadHomeData() {
    await loadPopularPhotos();
    await loadRecentPhotos();
}

// 加载热门照片
async function loadPopularPhotos() {
    try {
        const { data, error } = await supabase
            .from('photos')
            .select(`
                *,
                profiles:user_id (
                    username,
                    avatar_url
                )
            `)
            .eq('is_private', false)
            .order('likes_count', { ascending: false })
            .limit(12);
        
        if (error) throw error;
        
        displayPhotos(data, 'popularPhotos');
    } catch (error) {
        console.error('加载热门照片错误:', error);
    }
}

// 加载最新照片
async function loadRecentPhotos() {
    try {
        const { data, error } = await supabase
            .from('photos')
            .select(`
                *,
                profiles:user_id (
                    username,
                    avatar_url
                )
            `)
            .eq('is_private', false)
            .order('created_at', { ascending: false })
            .limit(12);
        
        if (error) throw error;
        
        displayPhotos(data, 'recentPhotos');
    } catch (error) {
        console.error('加载最新照片错误:', error);
    }
}

// 加载探索照片
async function loadExplorePhotos(searchQuery = '') {
    currentPageNum = 1;
    
    try {
        let query = supabase
            .from('photos')
            .select(`
                *,
                profiles:user_id (
                    username,
                    avatar_url
                )
            `, { count: 'exact' })
            .eq('is_private', false);
        
        // 应用搜索
        if (searchQuery) {
            query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
                        .contains('keywords', [searchQuery]);
        }
        
        // 应用排序
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            const sortBy = sortSelect.value;
            
            if (sortBy === 'popular') {
                query = query.order('likes_count', { ascending: false });
            } else if (sortBy === 'most_viewed') {
                query = query.order('views_count', { ascending: false });
            } else {
                query = query.order('created_at', { ascending: false });
            }
        } else {
            query = query.order('created_at', { ascending: false });
        }
        
        // 应用分页
        query = query.range(
            (currentPageNum - 1) * photosPerPage,
            currentPageNum * photosPerPage - 1
        );
        
        const { data, error, count } = await query;
        
        if (error) throw error;
        
        photos = data || [];
        displayPhotos(photos, 'explorePhotos');
        
        // 显示加载更多按钮
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = count > photosPerPage ? 'block' : 'none';
        }
        
    } catch (error) {
        console.error('加载探索照片错误:', error);
    }
}

// 加载更多照片
async function loadMorePhotos() {
    currentPageNum++;
    
    try {
        let query = supabase
            .from('photos')
            .select(`
                *,
                profiles:user_id (
                    username,
                    avatar_url
                )
            `)
            .eq('is_private', false)
            .order('created_at', { ascending: false });
        
        // 应用搜索
        const exploreSearch = document.getElementById('exploreSearch');
        if (exploreSearch && exploreSearch.value) {
            query = query.or(`title.ilike.%${exploreSearch.value}%,description.ilike.%${exploreSearch.value}%`)
                        .contains('keywords', [exploreSearch.value]);
        }
        
        // 应用排序
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            const sortBy = sortSelect.value;
            
            if (sortBy === 'popular') {
                query = query.order('likes_count', { ascending: false });
            } else if (sortBy === 'most_viewed') {
                query = query.order('views_count', { ascending: false });
            }
        }
        
        query = query.range(
            (currentPageNum - 1) * photosPerPage,
            currentPageNum * photosPerPage - 1
        );
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            photos = [...photos, ...data];
            displayPhotos(photos, 'explorePhotos');
        } else {
            showMessage('没有更多照片了', 'info');
            document.getElementById('loadMoreBtn').style.display = 'none';
        }
        
    } catch (error) {
        console.error('加载更多照片错误:', error);
        currentPageNum--;
    }
}

// 显示照片
function displayPhotos(photos, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!photos || photos.length === 0) {
        container.innerHTML = '<p class="no-photos">暂时没有照片</p>';
        return;
    }
    
    container.innerHTML = photos.map(photo => `
        <div class="photo-card" data-photo-id="${photo.id}">
            <img src="${photo.image_url}" 
                 alt="${photo.title || '照片'}" 
                 class="photo-image"
                 onclick="openImageViewer('${photo.id}')">
            <div class="photo-content">
                <h3 class="photo-title">${photo.title || '未命名照片'}</h3>
                <div class="photo-author">
                    <img src="${photo.profiles.avatar_url || 'https://ui-avatars.com/api/?name=User&background=6c63ff&color=fff'}" 
                         alt="${photo.profiles.username}" 
                         class="author-avatar"
                         onclick="loadUserProfilePage('${photo.user_id}')"
                         style="cursor: pointer;">
                    <span class="author-name">${photo.profiles.username}</span>
                </div>
                <div class="photo-stats">
                    <span><i class="fas fa-eye"></i> ${photo.views_count || 0}</span>
                    <span><i class="fas fa-heart"></i> ${photo.likes_count || 0}</span>
                    <span><i class="fas fa-comment"></i> ${photo.comments_count || 0}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 搜索功能
async function performSearch(query) {
    if (!query.trim()) {
        showMessage('请输入搜索关键词', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        // 搜索照片
        const { data: photos, error: photosError } = await supabase
            .from('photos')
            .select(`
                *,
                profiles:user_id (
                    username,
                    avatar_url
                )
            `)
            .eq('is_private', false)
            .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
            .contains('keywords', [query])
            .limit(20);
        
        if (photosError) throw photosError;
        
        // 搜索用户
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('*')
            .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
            .limit(10);
        
        if (usersError) throw usersError;
        
        // 显示搜索结果
        if ((!photos || photos.length === 0) && (!users || users.length === 0)) {
            showMessage('没有找到相关结果', 'info');
        } else {
            // 切换到探索页面显示搜索结果
            switchPage('explore');
            
            // 更新搜索框
            const exploreSearch = document.getElementById('exploreSearch');
            if (exploreSearch) {
                exploreSearch.value = query;
            }
            
            // 显示照片结果
            displayPhotos(photos, 'explorePhotos');
            
            // 隐藏加载更多按钮
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (loadMoreBtn) {
                loadMoreBtn.style.display = 'none';
            }
        }
        
    } catch (error) {
        console.error('搜索错误:', error);
        showMessage('搜索失败，请重试', 'error');
    } finally {
        hideLoading();
    }
}

// 显示搜索建议
async function showSearchSuggestions(query) {
    // 这里可以实现搜索建议功能
    // 为了简化，暂时不实现
}

// 打开图片查看器
async function openImageViewer(photoId) {
    currentViewingPhotoId = photoId;
    
    showLoading();
    
    try {
        // 获取照片详情
        const { data: photo, error } = await supabase
            .from('photos')
            .select(`
                *,
                profiles:user_id (
                    id,
                    username,
                    avatar_url,
                    bio
                )
            `)
            .eq('id', photoId)
            .single();
        
        if (error) throw error;
        
        // 检查隐私设置
        if (photo.is_private && 
            (!authManager.isAuthenticated() || 
             authManager.currentUser.id !== photo.user_id)) {
            showMessage('这张照片是私密的', 'error');
            hideLoading();
            return;
        }
        
        // 增加浏览计数
        await supabase
            .from('photos')
            .update({ views_count: (photo.views_count || 0) + 1 })
            .eq('id', photoId);
        
        // 更新图片查看器内容
        document.getElementById('viewedImage').src = photo.image_url;
        document.getElementById('authorAvatar').src = photo.profiles.avatar_url;
        document.getElementById('authorName').textContent = photo.profiles.username;
        document.getElementById('imageDate').textContent = new Date(photo.created_at).toLocaleDateString('zh-CN');
        document.getElementById('imageDescription').textContent = photo.description || '暂无描述';
        document.getElementById('viewCount').textContent = (photo.views_count || 0) + 1;
        document.getElementById('likeCount').textContent = photo.likes_count || 0;
        document.getElementById('commentCount').textContent = photo.comments_count || 0;
        
        // 显示关键词
        const keywordsContainer = document.getElementById('imageKeywords');
        keywordsContainer.innerHTML = '';
        if (photo.keywords && photo.keywords.length > 0) {
            photo.keywords.forEach(keyword => {
                const span = document.createElement('span');
                span.className = 'keyword';
                span.textContent = keyword;
                keywordsContainer.appendChild(span);
            });
        }
        
        // 设置点赞按钮
        const likeBtn = document.getElementById('likeBtn');
        likeBtn.dataset.photoId = photoId;
        
        // 检查用户是否已经点赞
        if (authManager.isAuthenticated()) {
            const { data: like } = await supabase
                .from('likes')
                .select('id')
                .eq('user_id', authManager.currentUser.id)
                .eq('photo_id', photoId)
                .single();
            
            if (like) {
                likeBtn.classList.add('liked');
                likeBtn.innerHTML = '<i class="fas fa-heart"></i> 已点赞';
            } else {
                likeBtn.classList.remove('liked');
                likeBtn.innerHTML = '<i class="far fa-heart"></i> 点赞';
            }
        }
        
        // 设置下载按钮
        const downloadBtn = document.getElementById('downloadBtn');
        downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.href = photo.image_url;
            link.download = photo.title || 'photo';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        
        // 加载评论
        await loadComments(photoId);
        
        // 加载相关内容
        await loadRelatedPhotos(photoId, photo.keywords);
        
        // 显示图片查看器
        hideLoading();
        document.getElementById('imageViewer').style.display = 'block';
        
    } catch (error) {
        hideLoading();
        console.error('打开图片查看器错误:', error);
        showMessage('加载照片失败', 'error');
    }
}

// 加载评论
async function loadComments(photoId) {
    try {
        const { data: comments, error } = await supabase
            .from('comments')
            .select(`
                *,
                profiles:user_id (
                    username,
                    avatar_url
                )
            `)
            .eq('photo_id', photoId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const commentsList = document.getElementById('commentsList');
        if (!commentsList) return;
        
        if (!comments || comments.length === 0) {
            commentsList.innerHTML = '<p class="no-comments">暂无评论</p>';
            return;
        }
        
        commentsList.innerHTML = comments.map(comment => `
            <div class="comment">
                <img src="${comment.profiles.avatar_url}" 
                     alt="${comment.profiles.username}" 
                     class="comment-avatar"
                     onclick="loadUserProfilePage('${comment.user_id}')"
                     style="cursor: pointer;">
                <div class="comment-content">
                    <div class="comment-author" onclick="loadUserProfilePage('${comment.user_id}')" style="cursor: pointer;">
                        ${comment.profiles.username}
                    </div>
                    <div class="comment-date">${new Date(comment.created_at).toLocaleDateString('zh-CN')}</div>
                    <div class="comment-text">${comment.content}</div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('加载评论错误:', error);
    }
}

// 提交评论
async function submitComment() {
    if (!authManager.isAuthenticated()) {
        showMessage('请先登录再评论', 'error');
        openAuthModal();
        return;
    }
    
    const commentInput = document.getElementById('commentInput');
    const content = commentInput.value.trim();
    
    if (!content) {
        showMessage('请输入评论内容', 'error');
        return;
    }
    
    if (!currentViewingPhotoId) {
        showMessage('无法找到照片', 'error');
        return;
    }
    
    showLoading();
    
    try {
        // 插入评论
        const { error } = await supabase
            .from('comments')
            .insert([{
                user_id: authManager.currentUser.id,
                photo_id: currentViewingPhotoId,
                content: content
            }]);
        
        if (error) throw error;
        
        // 更新照片评论计数
        await supabase
            .from('photos')
            .update({ 
                comments_count: supabase.raw('COALESCE(comments_count, 0) + 1'),
                updated_at: new Date().toISOString()
            })
            .eq('id', currentViewingPhotoId);
        
        // 清空输入框
        commentInput.value = '';
        
        // 重新加载评论
        await loadComments(currentViewingPhotoId);
        
        // 更新评论计数显示
        const commentCount = document.getElementById('commentCount');
        const currentCount = parseInt(commentCount.textContent) || 0;
        commentCount.textContent = currentCount + 1;
        
        hideLoading();
        showMessage('评论发表成功', 'success');
        
    } catch (error) {
        hideLoading();
        console.error('提交评论错误:', error);
        showMessage('评论发表失败', 'error');
    }
}

// 加载相关内容
async function loadRelatedPhotos(photoId, keywords) {
    try {
        if (!keywords || keywords.length === 0) {
            document.getElementById('relatedPhotos').innerHTML = '<p>暂无相关内容</p>';
            return;
        }
        
        // 使用关键词搜索相关照片（排除当前照片）
        const { data: relatedPhotos, error } = await supabase
            .from('photos')
            .select(`
                *,
                profiles:user_id (
                    username,
                    avatar_url
                )
            `)
            .eq('is_private', false)
            .neq('id', photoId)
            .overlaps('keywords', keywords)
            .limit(6)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const relatedContainer = document.getElementById('relatedPhotos');
        if (!relatedContainer) return;
        
        if (!relatedPhotos || relatedPhotos.length === 0) {
            relatedContainer.innerHTML = '<p>暂无相关内容</p>';
            return;
        }
        
        relatedContainer.innerHTML = relatedPhotos.map(photo => `
            <div class="related-photo" onclick="openImageViewer('${photo.id}')">
                <img src="${photo.image_url}" alt="${photo.title || '照片'}" class="related-photo-img">
                <div class="related-photo-title">${photo.title || '未命名照片'}</div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('加载相关内容错误:', error);
        document.getElementById('relatedPhotos').innerHTML = '<p>加载相关内容失败</p>';
    }
}

// 点赞/取消点赞
async function toggleLike(photoId, likeBtn) {
    try {
        // 检查是否已经点赞
        const { data: existingLike } = await supabase
            .from('likes')
            .select('id')
            .eq('user_id', authManager.currentUser.id)
            .eq('photo_id', photoId)
            .single();
        
        if (existingLike) {
            // 取消点赞
            await supabase
                .from('likes')
                .delete()
                .eq('id', existingLike.id);
            
            // 更新计数
            await supabase
                .from('photos')
                .update({ 
                    likes_count: supabase.raw('GREATEST(COALESCE(likes_count, 0) - 1, 0)'),
                    updated_at: new Date().toISOString()
                })
                .eq('id', photoId);
            
            // 更新按钮状态
            likeBtn.classList.remove('liked');
            likeBtn.innerHTML = '<i class="far fa-heart"></i> 点赞';
            
            // 更新计数显示
            const likeCount = document.getElementById('likeCount');
            const currentCount = parseInt(likeCount.textContent) || 0;
            likeCount.textContent = Math.max(0, currentCount - 1);
            
        } else {
            // 点赞
            await supabase
                .from('likes')
                .insert([{
                    user_id: authManager.currentUser.id,
                    photo_id: photoId
                }]);
            
            // 更新计数
            await supabase
                .from('photos')
                .update({ 
                    likes_count: supabase.raw('COALESCE(likes_count, 0) + 1'),
                    updated_at: new Date().toISOString()
                })
                .eq('id', photoId);
            
            // 更新按钮状态
            likeBtn.classList.add('liked');
            likeBtn.innerHTML = '<i class="fas fa-heart"></i> 已点赞';
            
            // 更新计数显示
            const likeCount = document.getElementById('likeCount');
            const currentCount = parseInt(likeCount.textContent) || 0;
            likeCount.textContent = currentCount + 1;
        }
        
    } catch (error) {
        console.error('点赞操作错误:', error);
        showMessage('操作失败，请重试', 'error');
    }
}

// 加载讨论区
async function loadDiscussions() {
    try {
        const { data: discussions, error } = await supabase
            .from('discussions')
            .select(`
                *,
                profiles:user_id (
                    username,
                    avatar_url
                )
            `)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        
        const discussionsList = document.getElementById('discussionsList');
        if (!discussionsList) return;
        
        if (!discussions || discussions.length === 0) {
            discussionsList.innerHTML = '<p class="no-discussions">暂无讨论话题</p>';
            return;
        }
        
        discussionsList.innerHTML = discussions.map(discussion => `
            <div class="discussion-card">
                <div class="discussion-header">
                    <div class="discussion-author">
                        <img src="${discussion.profiles.avatar_url}" 
                             alt="${discussion.profiles.username}" 
                             class="author-avatar">
                        <span>${discussion.profiles.username}</span>
                    </div>
                    <div class="discussion-date">${new Date(discussion.created_at).toLocaleDateString('zh-CN')}</div>
                </div>
                <h3 class="discussion-title">${discussion.title}</h3>
                <p class="discussion-content">${discussion.content}</p>
                <div class="discussion-stats">
                    <span><i class="fas fa-heart"></i> ${discussion.likes_count || 0}</span>
                    <span><i class="fas fa-comment"></i> ${discussion.comments_count || 0}</span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('加载讨论区错误:', error);
    }
}

// 打开新讨论模态框
function openNewDiscussionModal() {
    const modal = document.getElementById('newDiscussionModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// 提交讨论
async function submitDiscussion() {
    const title = document.getElementById('discussionTitle').value.trim();
    const content = document.getElementById('discussionContent').value.trim();
    
    if (!title || !content) {
        showMessage('请填写标题和内容', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const { error } = await supabase
            .from('discussions')
            .insert([{
                user_id: authManager.currentUser.id,
                title: title,
                content: content
            }]);
        
        if (error) throw error;
        
        // 关闭模态框
        document.getElementById('newDiscussionModal').style.display = 'none';
        
        // 清空表单
        document.getElementById('discussionTitle').value = '';
        document.getElementById('discussionContent').value = '';
        
        // 重新加载讨论区
        await loadDiscussions();
        
        hideLoading();
        showMessage('话题发布成功', 'success');
        
    } catch (error) {
        hideLoading();
        console.error('提交讨论错误:', error);
        showMessage('话题发布失败', 'error');
    }
}

// 加载用户资料页面
async function loadUserProfilePage(userId) {
    showLoading();
    
    try {
        // 获取用户资料
        const user = await authManager.getUserById(userId);
        if (!user) {
            showMessage('用户不存在', 'error');
            hideLoading();
            return;
        }
        
        // 切换到资料页面
        switchPage('profile');
        
        // 更新资料页内容
        await displayUserProfile(user);
        
    } catch (error) {
        console.error('加载用户资料错误:', error);
        showMessage('加载用户资料失败', 'error');
    } finally {
        hideLoading();
    }
}

// 显示用户资料
async function displayUserProfile(user) {
    const profileHeader = document.getElementById('profileHeader');
    if (!profileHeader) return;
    
    // 获取用户的照片
    const { data: userPhotos, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_private', false)
        .order('created_at', { ascending: false });
    
    if (photosError) {
        console.error('获取用户照片错误:', photosError);
    }
    
    // 获取关注者数量
    const { count: followersCount, error: followersError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);
    
    // 获取关注数量
    const { count: followingCount, error: followingError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id);
    
    // 检查当前用户是否已关注此用户
    let isFollowing = false;
    if (authManager.isAuthenticated()) {
        const { data: follow } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', authManager.currentUser.id)
            .eq('following_id', user.id)
            .single();
        
        isFollowing = !!follow;
    }
    
    // 更新资料页头部
    profileHeader.innerHTML = `
        <img src="${user.avatar_url}" 
             alt="${user.username}" 
             class="profile-avatar"
             data-user-id="${user.id}">
        <div class="profile-info">
            <h2 class="profile-username">${user.username}</h2>
            <p class="profile-bio">${user.bio || '暂无简介'}</p>
            <div class="profile-stats">
                <div>
                    <span>${userPhotos?.length || 0}</span>
                    <label>照片</label>
                </div>
                <div>
                    <span>${followersCount || 0}</span>
                    <label>粉丝</label>
                </div>
                <div>
                    <span>${followingCount || 0}</span>
                    <label>关注</label>
                </div>
            </div>
            ${authManager.isAuthenticated() && authManager.currentUser.id !== user.id ? `
                <button class="follow-btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}" 
                        data-user-id="${user.id}"
                        style="margin-top: 15px;">
                    ${isFollowing ? '已关注' : '关注'}
                </button>
            ` : ''}
        </div>
    `;
    
    // 显示用户的照片
    if (userPhotos) {
        displayPhotos(userPhotos, 'userPhotosGrid');
    }
    
    // 添加关注按钮事件监听器
    setTimeout(() => {
        const followBtn = document.querySelector('.follow-btn');
        if (followBtn) {
            followBtn.addEventListener('click', async () => {
                await toggleFollow(user.id, followBtn);
            });
        }
    }, 100);
}

// 加载用户点赞的照片
async function loadUserLikes(userId) {
    try {
        const { data: likes, error } = await supabase
            .from('likes')
            .select(`
                photos!inner(*, 
                    profiles:user_id (
                        username,
                        avatar_url
                    )
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('userLikes');
        if (!container) return;
        
        if (!likes || likes.length === 0) {
            container.innerHTML = '<p class="no-data">暂无点赞</p>';
            return;
        }
        
        const photos = likes.map(like => like.photos).filter(photo => !photo.is_private);
        if (photos.length === 0) {
            container.innerHTML = '<p class="no-data">暂无公开的点赞照片</p>';
            return;
        }
        
        container.innerHTML = '<div class="photos-grid" id="userLikesGrid"></div>';
        displayPhotos(photos, 'userLikesGrid');
        
    } catch (error) {
        console.error('加载用户点赞错误:', error);
        document.getElementById('userLikes').innerHTML = '<p class="no-data">加载失败</p>';
    }
}

// 加载用户关注的人
async function loadUserFollowing(userId) {
    try {
        const { data: follows, error } = await supabase
            .from('follows')
            .select(`
                profiles!following_id(*)
            `)
            .eq('follower_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('userFollowing');
        if (!container) return;
        
        if (!follows || follows.length === 0) {
            container.innerHTML = '<p class="no-data">暂无关注</p>';
            return;
        }
        
        const users = follows.map(follow => follow.profiles);
        container.innerHTML = users.map(user => `
            <div class="user-list-item" onclick="loadUserProfilePage('${user.id}')">
                <img src="${user.avatar_url}" alt="${user.username}" class="user-list-avatar">
                <div class="user-list-info">
                    <h4>${user.username}</h4>
                    <p>${user.bio || '暂无简介'}</p>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('加载用户关注错误:', error);
        document.getElementById('userFollowing').innerHTML = '<p class="no-data">加载失败</p>';
    }
}

// 加载用户的粉丝
async function loadUserFollowers(userId) {
    try {
        const { data: followers, error } = await supabase
            .from('follows')
            .select(`
                profiles!follower_id(*)
            `)
            .eq('following_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('userFollowers');
        if (!container) return;
        
        if (!followers || followers.length === 0) {
            container.innerHTML = '<p class="no-data">暂无粉丝</p>';
            return;
        }
        
        const users = followers.map(follower => follower.profiles);
        container.innerHTML = users.map(user => `
            <div class="user-list-item" onclick="loadUserProfilePage('${user.id}')">
                <img src="${user.avatar_url}" alt="${user.username}" class="user-list-avatar">
                <div class="user-list-info">
                    <h4>${user.username}</h4>
                    <p>${user.bio || '暂无简介'}</p>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('加载用户粉丝错误:', error);
        document.getElementById('userFollowers').innerHTML = '<p class="no-data">加载失败</p>';
    }
}

// 加载用户的照片
async function loadUserPhotos(userId) {
    try {
        const { data: photos, error } = await supabase
            .from('photos')
            .select(`
                *,
                profiles:user_id (
                    username,
                    avatar_url
                )
            `)
            .eq('user_id', userId)
            .eq('is_private', false)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('userPhotosGrid');
        if (!container) return;
        
        if (!photos || photos.length === 0) {
            container.innerHTML = '<p class="no-data">暂无照片</p>';
            return;
        }
        
        displayPhotos(photos, 'userPhotosGrid');
        
    } catch (error) {
        console.error('加载用户照片错误:', error);
        document.getElementById('userPhotosGrid').innerHTML = '<p class="no-data">加载失败</p>';
    }
}

// 关注/取消关注
async function toggleFollow(userId, followBtn) {
    try {
        // 检查是否已经关注
        const { data: existingFollow } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', authManager.currentUser.id)
            .eq('following_id', userId)
            .single();
        
        if (existingFollow) {
            // 取消关注
            await supabase
                .from('follows')
                .delete()
                .eq('id', existingFollow.id);
            
            // 更新按钮状态
            followBtn.classList.remove('btn-secondary');
            followBtn.classList.add('btn-primary');
            followBtn.textContent = '关注';
            
            showMessage('已取消关注', 'success');
            
        } else {
            // 关注
            await supabase
                .from('follows')
                .insert([{
                    follower_id: authManager.currentUser.id,
                    following_id: userId
                }]);
            
            // 更新按钮状态
            followBtn.classList.remove('btn-primary');
            followBtn.classList.add('btn-secondary');
            followBtn.textContent = '已关注';
            
            showMessage('关注成功', 'success');
        }
        
    } catch (error) {
        console.error('关注操作错误:', error);
        showMessage('操作失败，请重试', 'error');
    }
}

// 打开设置模态框
function openSettingsModal() {
    const user = authManager.getCurrentUser();
    if (!user || !user.profile) {
        showMessage('请先登录', 'error');
        return;
    }
    
    const modal = document.getElementById('settingsModal');
    if (modal) {
        // 填充当前设置
        document.getElementById('settingsAvatar').src = user.profile.avatar_url;
        document.getElementById('settingsUsername').value = user.profile.username || '';
        document.getElementById('settingsBio').value = user.profile.bio || '';
        
        modal.style.display = 'block';
    }
}

// 保存设置
async function saveSettings() {
    const username = document.getElementById('settingsUsername').value.trim();
    const bio = document.getElementById('settingsBio').value.trim();
    
    if (!username) {
        showMessage('用户名不能为空', 'error');
        return;
    }
    
    const updates = {
        username: username,
        bio: bio,
        updated_at: new Date().toISOString()
    };
    
    const success = await authManager.updateProfile(updates);
    if (success) {
        // 关闭模态框
        document.getElementById('settingsModal').style.display = 'none';
        
        // 更新UI
        authManager.updateUIForLoggedInUser();
    }
}

// 打开管理面板
function openAdminPanel() {
    if (!authManager.isAdmin) {
        showMessage('您没有管理员权限', 'error');
        return;
    }
    
    // 切换到管理面板
    switchPage('admin');
    
    // 加载管理数据
    loadAdminStats();
    loadAdminPhotos();
}

// 管理员功能
async function loadAdminStats() {
    try {
        // 获取总用户数
        const { count: totalUsers, error: usersError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        
        // 获取总照片数
        const { count: totalPhotos, error: photosError } = await supabase
            .from('photos')
            .select('*', { count: 'exact', head: true });
        
        // 获取总评论数
        const { count: totalComments, error: commentsError } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true });
        
        // 更新统计显示
        document.getElementById('totalUsers').textContent = totalUsers || 0;
        document.getElementById('totalPhotos').textContent = totalPhotos || 0;
        document.getElementById('totalComments').textContent = totalComments || 0;
        
    } catch (error) {
        console.error('加载管理统计错误:', error);
    }
}

async function loadAdminPhotos(searchQuery = '') {
    try {
        let query = supabase
            .from('photos')
            .select(`
                *,
                profiles:user_id (
                    username,
                    avatar_url
                )
            `)
            .order('created_at', { ascending: false });
        
        if (searchQuery) {
            query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
        }
        
        const { data: photos, error } = await query;
        
        if (error) throw error;
        
        const photosList = document.getElementById('adminPhotosList');
        if (!photosList) return;
        
        if (!photos || photos.length === 0) {
            photosList.innerHTML = '<p class="no-data">暂无照片</p>';
            return;
        }
        
        photosList.innerHTML = photos.map(photo => `
            <div class="admin-item">
                <div class="admin-item-info">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                        <img src="${photo.image_url}" alt="${photo.title}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">
                        <div>
                            <strong>${photo.title || '未命名照片'}</strong>
                            <div style="font-size: 0.9rem; color: var(--text-secondary);">
                                作者: ${photo.profiles.username}
                            </div>
                        </div>
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-secondary);">
                        时间: ${new Date(photo.created_at).toLocaleDateString('zh-CN')}
                        | 浏览: ${photo.views_count || 0}
                        | 点赞: ${photo.likes_count || 0}
                        | 评论: ${photo.comments_count || 0}
                        ${photo.is_private ? '| <span style="color: var(--error-color);">私密</span>' : ''}
                    </div>
                </div>
                <div class="admin-item-actions">
                    <button class="btn-danger" onclick="deletePhotoAsAdmin('${photo.id}', '${photo.cloudinary_id}')">
                        删除
                    </button>
                    ${photo.is_private ? `
                    <button class="btn-secondary btn-small" onclick="togglePhotoPrivacy('${photo.id}', false)">
                        设为公开
                    </button>
                    ` : `
                    <button class="btn-secondary btn-small" onclick="togglePhotoPrivacy('${photo.id}', true)">
                        设为私密
                    </button>
                    `}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('加载管理照片错误:', error);
        document.getElementById('adminPhotosList').innerHTML = '<p class="no-data">加载失败</p>';
    }
}

async function loadAdminUsers(searchQuery = '') {
    try {
        let query = supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (searchQuery) {
            query = query.or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
        }
        
        const { data: users, error } = await query;
        
        if (error) throw error;
        
        const usersList = document.getElementById('adminUsersList');
        if (!usersList) return;
        
        if (!users || users.length === 0) {
            usersList.innerHTML = '<p class="no-data">暂无用户</p>';
            return;
        }
        
        usersList.innerHTML = users.map(user => `
            <div class="admin-item">
                <div class="admin-item-info">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                        <img src="${user.avatar_url}" alt="${user.username}" style="width: 40px; height: 40px; border-radius: 50%;">
                        <div>
                            <strong>${user.username}</strong>
                            <div style="font-size: 0.9rem; color: var(--text-secondary);">
                                ${user.full_name || '未设置姓名'}
                                ${user.is_admin ? ' | <span style="color: var(--primary-color);">管理员</span>' : ''}
                            </div>
                        </div>
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-secondary);">
                        注册时间: ${new Date(user.created_at).toLocaleDateString('zh-CN')}
                        | 简介: ${user.bio || '无'}
                    </div>
                </div>
                <div class="admin-item-actions">
                    <button class="btn-danger" onclick="deleteUserAsAdmin('${user.id}')">
                        删除用户
                    </button>
                    ${!user.is_admin ? `
                    <button class="btn-secondary btn-small" onclick="toggleAdminStatus('${user.id}', true)">
                        设为管理员
                    </button>
                    ` : `
                    <button class="btn-secondary btn-small" onclick="toggleAdminStatus('${user.id}', false)">
                        取消管理员
                    </button>
                    `}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('加载管理用户错误:', error);
        document.getElementById('adminUsersList').innerHTML = '<p class="no-data">加载失败</p>';
    }
}

async function loadAdminComments(searchQuery = '') {
    try {
        let query = supabase
            .from('comments')
            .select(`
                *,
                profiles:user_id (
                    username,
                    avatar_url
                ),
                photos:photo_id (
                    title,
                    image_url
                )
            `)
            .order('created_at', { ascending: false });
        
        if (searchQuery) {
            query = query.or(`content.ilike.%${searchQuery}%`);
        }
        
        const { data: comments, error } = await query;
        
        if (error) throw error;
        
        const commentsList = document.getElementById('adminCommentsList');
        if (!commentsList) return;
        
        if (!comments || comments.length === 0) {
            commentsList.innerHTML = '<p class="no-data">暂无评论</p>';
            return;
        }
        
        commentsList.innerHTML = comments.map(comment => `
            <div class="admin-item">
                <div class="admin-item-info">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                        <img src="${comment.profiles.avatar_url}" alt="${comment.profiles.username}" style="width: 40px; height: 40px; border-radius: 50%;">
                        <div>
                            <strong>${comment.profiles.username}</strong>
                            <div style="font-size: 0.9rem; color: var(--text-secondary);">
                                评论于: ${comment.photos.title || '未命名照片'}
                            </div>
                        </div>
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 5px;">
                        时间: ${new Date(comment.created_at).toLocaleDateString('zh-CN')}
                    </div>
                    <div style="background: var(--dark-bg); padding: 10px; border-radius: 5px;">
                        ${comment.content}
                    </div>
                </div>
                <div class="admin-item-actions">
                    <button class="btn-danger" onclick="deleteCommentAsAdmin('${comment.id}')">
                        删除评论
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('加载管理评论错误:', error);
        document.getElementById('adminCommentsList').innerHTML = '<p class="no-data">加载失败</p>';
    }
}

async function deletePhotoAsAdmin(photoId, cloudinaryId) {
    if (!confirm('确定要删除这张照片吗？此操作不可撤销。')) {
        return;
    }
    
    showLoading();
    
    try {
        const success = await uploadManager.deletePhoto(photoId, cloudinaryId);
        
        if (success) {
            showMessage('照片删除成功', 'success');
            await loadAdminPhotos(); // 重新加载列表
        } else {
            showMessage('照片删除失败', 'error');
        }
    } catch (error) {
        console.error('管理员删除照片错误:', error);
        showMessage('删除失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function togglePhotoPrivacy(photoId, makePrivate) {
    showLoading();
    
    try {
        const { error } = await supabase
            .from('photos')
            .update({ 
                is_private: makePrivate,
                updated_at: new Date().toISOString()
            })
            .eq('id', photoId);
        
        if (error) throw error;
        
        showMessage(`照片已${makePrivate ? '设为私密' : '设为公开'}`, 'success');
        await loadAdminPhotos(); // 重新加载列表
    } catch (error) {
        console.error('更改照片隐私设置错误:', error);
        showMessage('操作失败', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteUserAsAdmin(userId) {
    if (!confirm('确定要删除这个用户吗？此操作将删除用户的所有照片、评论、关注记录，且不可撤销。')) {
        return;
    }
    
    showLoading();
    
    try {
        // 注意：由于外键约束，删除用户会自动删除其相关的照片、评论、关注等
        const { error } = await supabase.auth.admin.deleteUser(userId);
        
        if (error) throw error;
        
        showMessage('用户删除成功', 'success');
        await loadAdminUsers(); // 重新加载列表
    } catch (error) {
        console.error('管理员删除用户错误:', error);
        showMessage('删除失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function toggleAdminStatus(userId, makeAdmin) {
    showLoading();
    
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ 
                is_admin: makeAdmin,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        
        if (error) throw error;
        
        showMessage(`用户已${makeAdmin ? '设为管理员' : '取消管理员权限'}`, 'success');
        await loadAdminUsers(); // 重新加载列表
    } catch (error) {
        console.error('更改用户管理员状态错误:', error);
        showMessage('操作失败', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteCommentAsAdmin(commentId) {
    if (!confirm('确定要删除这条评论吗？此操作不可撤销。')) {
        return;
    }
    
    showLoading();
    
    try {
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);
        
        if (error) throw error;
        
        showMessage('评论删除成功', 'success');
        await loadAdminComments(); // 重新加载列表
    } catch (error) {
        console.error('管理员删除评论错误:', error);
        showMessage('删除失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// 加载照片
async function loadPhotos() {
    // 重新加载首页数据
    if (currentPage === 'home') {
        await loadHomeData();
    } else if (currentPage === 'explore') {
        await loadExplorePhotos();
    }
}

// 暴露全局函数
window.switchPage = switchPage;
window.openImageViewer = openImageViewer;
window.loadUserProfilePage = loadUserProfilePage;
window.openSettingsModal = openSettingsModal;
window.performSearch = performSearch;
window.openAdminPanel = openAdminPanel;
window.deletePhotoAsAdmin = deletePhotoAsAdmin;
window.togglePhotoPrivacy = togglePhotoPrivacy;
window.deleteUserAsAdmin = deleteUserAsAdmin;
window.toggleAdminStatus = toggleAdminStatus;
window.deleteCommentAsAdmin = deleteCommentAsAdmin;