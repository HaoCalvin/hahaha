// 论坛功能模块
import { supabase } from './config.js';
import { authManager } from './auth.js';
import { showNotification, showLoading, hideLoading, escapeHtml, formatDate, showConfirm } from './utils.js';

class ForumManager {
    constructor() {
        this.currentCategory = 'all';
        this.currentSort = 'newest';
        this.currentPage = 1;
        this.postsPerPage = 20;
        this.init();
    }

    async init() {
        // 检查当前页面是否是论坛页面
        if (!window.location.pathname.includes('forum.html')) {
            return;
        }
        
        await this.loadForumData();
        this.bindEvents();
    }

    async loadForumData() {
        try {
            showLoading();
            
            // 加载论坛统计数据
            await this.loadForumStats();
            
            // 加载帖子列表
            await this.loadPosts();
            
            // 加载热门话题
            await this.loadHotTopics();
            
            hideLoading();
        } catch (error) {
            console.error('加载论坛数据失败:', error);
            hideLoading();
            showNotification('加载论坛数据失败', 'error');
        }
    }

    async loadForumStats() {
        try {
            // 获取论坛统计数据
            const [
                totalPosts,
                totalComments,
                activeUsers,
                recentPosts
            ] = await Promise.all([
                supabase.from('forum_posts').select('id', { count: 'exact' }),
                supabase.from('forum_comments').select('id', { count: 'exact' }),
                supabase
                    .from('profiles')
                    .select('id')
                    .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
                supabase
                    .from('forum_posts')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(5)
            ]);
            
            // 更新UI
            this.updateForumStats({
                totalPosts: totalPosts.count || 0,
                totalComments: totalComments.count || 0,
                activeUsers: activeUsers.length || 0,
                recentPosts: recentPosts.data || []
            });
            
        } catch (error) {
            console.error('加载论坛统计失败:', error);
        }
    }

    updateForumStats(stats) {
        const statsContainer = document.getElementById('forum-stats');
        if (!statsContainer) return;
        
        statsContainer.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">总帖子数</span>
                <span class="stat-value">${stats.totalPosts}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">总评论数</span>
                <span class="stat-value">${stats.totalComments}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">活跃用户</span>
                <span class="stat-value">${stats.activeUsers}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">今日帖子</span>
                <span class="stat-value">${this.getTodayPostsCount(stats.recentPosts)}</span>
            </div>
        `;
    }

    getTodayPostsCount(posts) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return posts.filter(post => {
            const postDate = new Date(post.created_at);
            postDate.setHours(0, 0, 0, 0);
            return postDate.getTime() === today.getTime();
        }).length;
    }

    async loadPosts() {
        try {
            let query = supabase
                .from('forum_posts')
                .select(`
                    *,
                    profiles!user_id (
                        username,
                        avatar_url
                    ),
                    forum_comments!forum_posts (id)
                `)
                .order('created_at', { ascending: false });
            
            // 应用分类过滤器
            if (this.currentCategory !== 'all') {
                query = query.contains('tags', [this.currentCategory]);
            }
            
            // 应用排序
            switch (this.currentSort) {
                case 'newest':
                    query = query.order('created_at', { ascending: false });
                    break;
                case 'popular':
                    query = query.order('likes_count', { ascending: false });
                    break;
                case 'comments':
                    query = query.order('comments_count', { ascending: false });
                    break;
            }
            
            // 分页
            const from = (this.currentPage - 1) * this.postsPerPage;
            const to = from + this.postsPerPage - 1;
            
            const { data: posts, error, count } = await query
                .range(from, to)
                .limit(this.postsPerPage);
            
            if (error) throw error;
            
            this.renderPosts(posts || []);
            
            // 更新分页
            this.updatePagination(count || 0);
            
        } catch (error) {
            console.error('加载帖子失败:', error);
            this.showPostsError('加载帖子失败，请刷新重试');
        }
    }

    renderPosts(posts) {
        const postsList = document.getElementById('forum-posts-list');
        if (!postsList) return;
        
        if (posts.length === 0) {
            postsList.innerHTML = `
                <div class="empty-posts">
                    <i class="fas fa-comments"></i>
                    <p>还没有帖子</p>
                    ${authManager.isAuthenticated() ? `
                        <p class="empty-state-sub">
                            <button class="btn btn-primary btn-small" id="create-first-post-btn">
                                <i class="fas fa-plus"></i>
                                创建第一个帖子
                            </button>
                        </p>
                    ` : ''}
                </div>
            `;
            
            // 绑定创建第一个帖子按钮
            const createFirstPostBtn = document.getElementById('create-first-post-btn');
            if (createFirstPostBtn) {
                createFirstPostBtn.addEventListener('click', () => {
                    this.openCreatePostModal();
                });
            }
            
            return;
        }
        
        postsList.innerHTML = posts.map(post => `
            <div class="forum-post" data-post-id="${post.id}">
                <div class="post-header">
                    <img src="${post.profiles.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(post.profiles.username || '用户')}" 
                         alt="${post.profiles.username}"
                         class="post-author-avatar"
                         data-user-id="${post.user_id}">
                    <div class="post-author-info">
                        <div class="post-author-name" data-user-id="${post.user_id}">
                            ${escapeHtml(post.profiles.username || '匿名用户')}
                        </div>
                        <div class="post-time">
                            ${formatDate(post.created_at, 'relative')}
                            ${post.updated_at !== post.created_at ? ' · 已编辑' : ''}
                        </div>
                    </div>
                    ${authManager.isAuthenticated() ? `
                        <div class="post-actions">
                            ${post.user_id === authManager.getCurrentUser().id ? `
                                <button class="post-action-btn edit-post-btn" data-post-id="${post.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                            ` : ''}
                            ${authManager.isAuthenticated() ? `
                                <button class="post-action-btn like-post-btn ${this.userHasLiked(post.id) ? 'liked' : ''}" 
                                        data-post-id="${post.id}">
                                    <i class="fas fa-heart"></i>
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
                
                <h3 class="post-title">${escapeHtml(post.title)}</h3>
                
                <div class="post-content">
                    <p>${escapeHtml(post.content.substring(0, 200))}${post.content.length > 200 ? '...' : ''}</p>
                </div>
                
                ${post.tags && post.tags.length > 0 ? `
                    <div class="post-tags">
                        ${post.tags.map(tag => `
                            <span class="post-tag" data-tag="${escapeHtml(tag)}">
                                ${escapeHtml(tag)}
                            </span>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div class="post-footer">
                    <div class="post-stats">
                        <div class="post-stat">
                            <i class="fas fa-heart"></i>
                            <span>${post.likes_count || 0}</span>
                        </div>
                        <div class="post-stat">
                            <i class="fas fa-comment"></i>
                            <span>${post.forum_comments?.length || 0}</span>
                        </div>
                        <div class="post-stat">
                            <i class="fas fa-eye"></i>
                            <span>${post.views_count || 0}</span>
                        </div>
                    </div>
                    <button class="btn btn-outline btn-small view-post-btn" data-post-id="${post.id}">
                        <i class="fas fa-comments"></i>
                        <span>查看讨论</span>
                    </button>
                </div>
            </div>
        `).join('');
        
        // 绑定帖子事件
        this.bindPostEvents();
    }

    async userHasLiked(postId) {
        if (!authManager.isAuthenticated()) return false;
        
        try {
            const { data } = await supabase
                .from('forum_post_likes')
                .select('id')
                .eq('user_id', authManager.getCurrentUser().id)
                .eq('post_id', postId)
                .single();
            
            return !!data;
        } catch (error) {
            return false;
        }
    }

    bindPostEvents() {
        // 作者头像和用户名点击
        document.querySelectorAll('.post-author-avatar, .post-author-name').forEach(element => {
            element.addEventListener('click', (e) => {
                const userId = e.target.closest('[data-user-id]').dataset.userId;
                if (userId) {
                    window.location.href = `profile.html?user=${userId}`;
                }
            });
        });
        
        // 查看帖子按钮
        document.querySelectorAll('.view-post-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const postId = e.currentTarget.dataset.postId;
                this.viewPostDetail(postId);
            });
        });
        
        // 编辑帖子按钮
        document.querySelectorAll('.edit-post-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const postId = e.currentTarget.dataset.postId;
                await this.editPost(postId);
            });
        });
        
        // 点赞帖子按钮
        document.querySelectorAll('.like-post-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const postId = e.currentTarget.dataset.postId;
                await this.togglePostLike(postId);
            });
        });
        
        // 标签点击
        document.querySelectorAll('.post-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                const tagName = e.currentTarget.dataset.tag;
                this.filterByTag(tagName);
            });
        });
    }

    async togglePostLike(postId) {
        if (!authManager.isAuthenticated()) {
            showNotification('请先登录', 'warning');
            return;
        }
        
        try {
            const userId = authManager.getCurrentUser().id;
            
            // 检查是否已经点赞
            const { data: existingLike } = await supabase
                .from('forum_post_likes')
                .select('id')
                .eq('user_id', userId)
                .eq('post_id', postId)
                .single();
            
            if (existingLike) {
                // 取消点赞
                const { error } = await supabase
                    .from('forum_post_likes')
                    .delete()
                    .eq('id', existingLike.id);
                
                if (error) throw error;
                
                // 更新帖子点赞数
                await this.decrementPostLikes(postId);
                
                // 更新UI
                this.updatePostLikeUI(postId, false);
                
                showNotification('取消点赞', 'success');
            } else {
                // 添加点赞
                const { error } = await supabase
                    .from('forum_post_likes')
                    .insert({
                        user_id: userId,
                        post_id: postId
                    });
                
                if (error) throw error;
                
                // 更新帖子点赞数
                await this.incrementPostLikes(postId);
                
                // 更新UI
                this.updatePostLikeUI(postId, true);
                
                showNotification('点赞成功', 'success');
            }
            
        } catch (error) {
            console.error('点赞操作失败:', error);
            showNotification('操作失败，请重试', 'error');
        }
    }

    async incrementPostLikes(postId) {
        const { data: post } = await supabase
            .from('forum_posts')
            .select('likes_count')
            .eq('id', postId)
            .single();
        
        if (post) {
            await supabase
                .from('forum_posts')
                .update({ likes_count: (post.likes_count || 0) + 1 })
                .eq('id', postId);
        }
    }

    async decrementPostLikes(postId) {
        const { data: post } = await supabase
            .from('forum_posts')
            .select('likes_count')
            .eq('id', postId)
            .single();
        
        if (post && post.likes_count > 0) {
            await supabase
                .from('forum_posts')
                .update({ likes_count: Math.max((post.likes_count || 0) - 1, 0) })
                .eq('id', postId);
        }
    }

    updatePostLikeUI(postId, isLiked) {
        document.querySelectorAll(`[data-post-id="${postId}"]`).forEach(postElement => {
            const likeBtn = postElement.querySelector('.like-post-btn');
            const likeCount = postElement.querySelector('.post-stat .fa-heart + span');
            
            if (likeBtn) {
                likeBtn.classList.toggle('liked', isLiked);
            }
            
            if (likeCount) {
                const currentCount = parseInt(likeCount.textContent) || 0;
                likeCount.textContent = isLiked ? currentCount + 1 : Math.max(currentCount - 1, 0);
            }
        });
    }

    async viewPostDetail(postId) {
        // 在新页面打开帖子详情
        window.location.href = `forum-post.html?id=${postId}`;
    }

    async editPost(postId) {
        try {
            const { data: post, error } = await supabase
                .from('forum_posts')
                .select('*')
                .eq('id', postId)
                .single();
            
            if (error) throw error;
            
            // 打开编辑模态框
            this.openEditPostModal(post);
            
        } catch (error) {
            console.error('获取帖子详情失败:', error);
            showNotification('获取帖子失败', 'error');
        }
    }

    filterByTag(tagName) {
        this.currentCategory = tagName;
        this.currentPage = 1;
        
        // 更新UI
        this.updateCategoryFilter();
        this.loadPosts();
    }

    updateCategoryFilter() {
        // 更新分类按钮状态
        document.querySelectorAll('.forum-category').forEach(category => {
            const categoryName = category.dataset.category;
            category.classList.toggle('active', categoryName === this.currentCategory);
        });
    }

    async loadHotTopics() {
        try {
            // 获取热门话题（24小时内评论最多的帖子）
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            
            const { data: hotPosts } = await supabase
                .from('forum_posts')
                .select(`
                    id,
                    title,
                    comments_count,
                    profiles!user_id (username)
                `)
                .gte('created_at', twentyFourHoursAgo.toISOString())
                .order('comments_count', { ascending: false })
                .limit(5);
            
            this.renderHotTopics(hotPosts || []);
            
        } catch (error) {
            console.error('加载热门话题失败:', error);
        }
    }

    renderHotTopics(posts) {
        const hotTopicsContainer = document.getElementById('hot-topics');
        if (!hotTopicsContainer) return;
        
        if (posts.length === 0) {
            hotTopicsContainer.innerHTML = '<p class="empty-state-sub">暂无热门话题</p>';
            return;
        }
        
        hotTopicsContainer.innerHTML = posts.map(post => `
            <div class="hot-topic" data-post-id="${post.id}">
                <div class="hot-topic-title">
                    <i class="fas fa-fire"></i>
                    <span>${escapeHtml(post.title)}</span>
                </div>
                <div class="hot-topic-meta">
                    <span>${escapeHtml(post.profiles.username || '匿名用户')}</span>
                    <span>${post.comments_count || 0} 评论</span>
                </div>
            </div>
        `).join('');
        
        // 绑定热门话题点击事件
        hotTopicsContainer.querySelectorAll('.hot-topic').forEach(topic => {
            topic.addEventListener('click', () => {
                const postId = topic.dataset.postId;
                this.viewPostDetail(postId);
            });
        });
    }

    updatePagination(totalPosts) {
        const paginationContainer = document.getElementById('forum-pagination');
        if (!paginationContainer) return;
        
        const totalPages = Math.ceil(totalPosts / this.postsPerPage);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // 上一页按钮
        if (this.currentPage > 1) {
            paginationHTML += `
                <button class="pagination-btn prev-btn" data-page="${this.currentPage - 1}">
                    <i class="fas fa-chevron-left"></i>
                    <span>上一页</span>
                </button>
            `;
        }
        
        // 页码按钮
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                        data-page="${i}">
                    ${i}
                </button>
            `;
        }
        
        // 下一页按钮
        if (this.currentPage < totalPages) {
            paginationHTML += `
                <button class="pagination-btn next-btn" data-page="${this.currentPage + 1}">
                    <span>下一页</span>
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }
        
        paginationContainer.innerHTML = paginationHTML;
        
        // 绑定分页事件
        this.bindPaginationEvents();
    }

    bindPaginationEvents() {
        document.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.currentTarget.dataset.page);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this.loadPosts();
                    
                    // 滚动到顶部
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    showPostsError(message) {
        const postsList = document.getElementById('forum-posts-list');
        if (postsList) {
            postsList.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <button class="btn btn-outline btn-small" id="retry-load-posts">
                        <i class="fas fa-redo"></i>
                        <span>重试</span>
                    </button>
                </div>
            `;
            
            document.getElementById('retry-load-posts').addEventListener('click', () => {
                this.loadPosts();
            });
        }
    }

    bindEvents() {
        // 分类筛选
        document.querySelectorAll('.forum-category').forEach(category => {
            category.addEventListener('click', (e) => {
                const categoryName = e.currentTarget.dataset.category;
                this.setCategory(categoryName);
            });
        });
        
        // 排序筛选
        const sortSelect = document.getElementById('forum-sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.setSort(e.target.value);
            });
        }
        
        // 创建帖子按钮
        const createPostBtn = document.getElementById('create-post-btn');
        if (createPostBtn) {
            createPostBtn.addEventListener('click', () => {
                this.openCreatePostModal();
            });
        }
        
        // 搜索帖子
        const searchInput = document.getElementById('forum-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.searchPosts(searchInput.value);
            }, 300));
        }
    }

    setCategory(category) {
        this.currentCategory = category;
        this.currentPage = 1;
        this.updateCategoryFilter();
        this.loadPosts();
    }

    setSort(sort) {
        this.currentSort = sort;
        this.currentPage = 1;
        this.loadPosts();
    }

    async searchPosts(query) {
        if (!query || query.trim().length < 2) {
            // 如果没有搜索词，恢复显示所有帖子
            this.currentPage = 1;
            await this.loadPosts();
            return;
        }
        
        try {
            showLoading();
            
            const { data: posts, error } = await supabase
                .from('forum_posts')
                .select(`
                    *,
                    profiles!user_id (
                        username,
                        avatar_url
                    ),
                    forum_comments!forum_posts (id)
                `)
                .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
                .order('created_at', { ascending: false })
                .limit(this.postsPerPage);
            
            if (error) throw error;
            
            this.renderPosts(posts || []);
            
            // 隐藏分页
            const paginationContainer = document.getElementById('forum-pagination');
            if (paginationContainer) {
                paginationContainer.innerHTML = '';
            }
            
            hideLoading();
            
        } catch (error) {
            console.error('搜索帖子失败:', error);
            hideLoading();
            this.showPostsError('搜索失败，请重试');
        }
    }

    openCreatePostModal() {
        if (!authManager.isAuthenticated()) {
            showNotification('请先登录', 'warning');
            return;
        }
        
        // 创建帖子模态框
        this.createPostModal();
    }

    createPostModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'create-post-modal';
        modal.innerHTML = `
            <div class="modal-content modal-wide">
                <div class="modal-header">
                    <h2><i class="fas fa-edit"></i> 创建新帖子</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="create-post-form">
                        <div class="form-group">
                            <label for="post-title">
                                <i class="fas fa-heading"></i> 标题 *
                            </label>
                            <input type="text" id="post-title" required maxlength="200" placeholder="输入帖子标题">
                            <div class="char-count">
                                <span id="post-title-length">0</span>/200
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="post-content">
                                <i class="fas fa-align-left"></i> 内容 *
                            </label>
                            <textarea id="post-content" required rows="10" placeholder="输入帖子内容..."></textarea>
                            <div class="char-count">
                                <span id="post-content-length">0</span>/5000
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <i class="fas fa-tags"></i> 标签
                            </label>
                            <div class="tags-container">
                                <div class="tags-tags" id="post-tags-tags">
                                    <!-- 标签将通过JS动态生成 -->
                                </div>
                                <div class="tags-input-container" id="post-tags-input-container">
                                    <input type="text" 
                                           class="tag-input" 
                                           id="post-tag-input"
                                           placeholder="输入标签 (按Enter添加)"
                                           maxlength="20">
                                </div>
                                <p class="form-help">最多添加5个标签，每个标签最多20个字符</p>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox">
                                <input type="checkbox" id="post-pinned">
                                <i class="fas fa-thumbtack"></i>
                                <span>置顶帖子</span>
                            </label>
                            <p class="form-help">只有管理员可以置顶帖子</p>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" id="cancel-post-btn">
                                取消
                            </button>
                            <button type="submit" class="btn btn-primary">
                                发布帖子
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定事件
        this.bindPostModalEvents(modal);
        
        // 初始化标签系统
        this.initPostTags();
        
        // 字符计数
        this.initPostCharCount();
    }

    bindPostModalEvents(modal) {
        // 关闭按钮
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // 取消按钮
        const cancelBtn = modal.querySelector('#cancel-post-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.remove();
            });
        }
        
        // 表单提交
        const form = modal.querySelector('#create-post-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.submitPost();
            });
        }
    }

    initPostTags() {
        const tagInput = document.getElementById('post-tag-input');
        const tagsContainer = document.getElementById('post-tags-tags');
        
        if (!tagInput || !tagsContainer) return;
        
        tagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addPostTag();
            }
        });
    }

    initPostCharCount() {
        const titleInput = document.getElementById('post-title');
        const contentInput = document.getElementById('post-content');
        const titleLength = document.getElementById('post-title-length');
        const contentLength = document.getElementById('post-content-length');
        
        if (titleInput && titleLength) {
            titleInput.addEventListener('input', () => {
                titleLength.textContent = titleInput.value.length;
            });
        }
        
        if (contentInput && contentLength) {
            contentInput.addEventListener('input', () => {
                contentLength.textContent = contentInput.value.length;
            });
        }
    }

    addPostTag() {
        const tagInput = document.getElementById('post-tag-input');
        const tag = tagInput.value.trim();
        
        if (!tag) return;
        
        // 检查标签数量
        const tagsContainer = document.getElementById('post-tags-tags');
        const currentTags = tagsContainer.querySelectorAll('.tag-tag');
        
        if (currentTags.length >= 5) {
            showNotification('最多只能添加5个标签', 'warning');
            return;
        }
        
        // 检查标签长度
        if (tag.length > 20) {
            showNotification('标签不能超过20个字符', 'warning');
            return;
        }
        
        // 检查是否已存在
        const existingTags = Array.from(currentTags).map(tagEl => tagEl.dataset.tag);
        if (existingTags.includes(tag)) {
            showNotification('标签已存在', 'warning');
            return;
        }
        
        // 添加标签
        const tagHTML = `
            <span class="tag-tag" data-tag="${escapeHtml(tag)}">
                ${escapeHtml(tag)}
                <button type="button" class="remove-tag-btn">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `;
        
        tagsContainer.insertAdjacentHTML('beforeend', tagHTML);
        
        // 绑定移除按钮事件
        const newTag = tagsContainer.lastElementChild;
        const removeBtn = newTag.querySelector('.remove-tag-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                newTag.remove();
            });
        }
        
        // 清空输入框
        tagInput.value = '';
    }

    async submitPost() {
        if (!authManager.isAuthenticated()) {
            showNotification('请先登录', 'warning');
            return;
        }
        
        try {
            const title = document.getElementById('post-title').value.trim();
            const content = document.getElementById('post-content').value.trim();
            const isPinned = document.getElementById('post-pinned').checked;
            
            // 验证输入
            if (!title) {
                throw new Error('请输入标题');
            }
            
            if (!content) {
                throw new Error('请输入内容');
            }
            
            if (title.length > 200) {
                throw new Error('标题不能超过200个字符');
            }
            
            if (content.length > 5000) {
                throw new Error('内容不能超过5000个字符');
            }
            
            // 获取标签
            const tags = [];
            document.querySelectorAll('#post-tags-tags .tag-tag').forEach(tagEl => {
                tags.push(tagEl.dataset.tag);
            });
            
            // 检查是否有置顶权限
            const user = authManager.getCurrentUser();
            const canPin = user.profile?.is_admin || false;
            
            showLoading('发布中...');
            
            // 创建帖子
            const { data: post, error } = await supabase
                .from('forum_posts')
                .insert({
                    user_id: user.id,
                    title,
                    content,
                    tags: tags.length > 0 ? tags : null,
                    is_pinned: canPin && isPinned,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) throw error;
            
            // 关闭模态框
            document.getElementById('create-post-modal')?.remove();
            
            // 重新加载帖子列表
            await this.loadPosts();
            
            hideLoading();
            showNotification('帖子发布成功', 'success');
            
            // 跳转到新帖子
            setTimeout(() => {
                this.viewPostDetail(post.id);
            }, 1000);
            
        } catch (error) {
            hideLoading();
            console.error('发布帖子失败:', error);
            showNotification(error.message || '发布帖子失败，请重试', 'error');
        }
    }

    openEditPostModal(post) {
        // 创建编辑帖子模态框（类似创建模态框）
        // 这里简化实现，实际应该复用创建模态框的逻辑
        showNotification('编辑功能开发中', 'info');
    }

    debounce(func, wait) {
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

    // 订阅实时更新
    subscribeToRealtimeUpdates() {
        // 订阅新帖子
        this.postsSubscription = supabase
            .channel('forum-posts-realtime')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'forum_posts' },
                (payload) => {
                    console.log('新帖子:', payload);
                    this.handleNewPost(payload.new);
                }
            )
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'forum_posts' },
                (payload) => {
                    console.log('帖子更新:', payload);
                    this.handleUpdatedPost(payload.new);
                }
            )
            .subscribe();
        
        // 订阅新评论
        this.commentsSubscription = supabase
            .channel('forum-comments-realtime')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'forum_comments' },
                (payload) => {
                    console.log('新评论:', payload);
                    this.handleNewComment(payload.new);
                }
            )
            .subscribe();
    }

    handleNewPost(post) {
        // 显示新帖子通知
        const notification = document.createElement('div');
        notification.className = 'notification info';
        notification.innerHTML = `
            <i class="fas fa-comment"></i>
            <div class="notification-content">
                <h4>新帖子</h4>
                <p>${escapeHtml(post.title)}</p>
            </div>
            <button class="btn btn-small" data-post-id="${post.id}">
                查看
            </button>
        `;
        
        const notificationContainer = document.getElementById('notification-container');
        if (notificationContainer) {
            notificationContainer.appendChild(notification);
            
            // 自动移除
            setTimeout(() => {
                notification.remove();
            }, 5000);
            
            // 绑定查看按钮
            notification.querySelector('button').addEventListener('click', () => {
                this.viewPostDetail(post.id);
                notification.remove();
            });
        }
    }

    handleUpdatedPost(post) {
        // 更新帖子列表中的对应帖子
        document.querySelectorAll(`[data-post-id="${post.id}"]`).forEach(postElement => {
            const likeCount = postElement.querySelector('.post-stat .fa-heart + span');
            const commentCount = postElement.querySelector('.post-stat .fa-comment + span');
            
            if (likeCount) {
                likeCount.textContent = post.likes_count || 0;
            }
            
            if (commentCount) {
                commentCount.textContent = post.comments_count || 0;
            }
        });
    }

    handleNewComment(comment) {
        // 更新对应帖子的评论数
        document.querySelectorAll(`[data-post-id="${comment.post_id}"]`).forEach(postElement => {
            const commentCount = postElement.querySelector('.post-stat .fa-comment + span');
            if (commentCount) {
                const currentCount = parseInt(commentCount.textContent) || 0;
                commentCount.textContent = currentCount + 1;
            }
        });
    }
}

// 初始化论坛管理器
let forumManager = null;

document.addEventListener('DOMContentLoaded', () => {
    forumManager = new ForumManager();
    
    // 如果是论坛页面，开始实时订阅
    if (window.location.pathname.includes('forum.html')) {
        forumManager.subscribeToRealtimeUpdates();
    }
});

// 导出
export { forumManager };