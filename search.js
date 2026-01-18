// 高级搜索功能模块
import { supabase } from './config.js';
import { showNotification, showLoading, hideLoading, escapeHtml, debounce } from './utils.js';

class AdvancedSearch {
    constructor() {
        this.searchResults = [];
        this.currentQuery = '';
        this.currentFilters = {
            type: 'all',
            sort: 'relevance',
            dateRange: 'all',
            privacy: 'all'
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupSearchPage();
    }

    setupSearchPage() {
        // 如果当前页面是搜索页面，设置高级搜索界面
        if (window.location.pathname.includes('search.html')) {
            this.createAdvancedSearchUI();
        }
    }

    createAdvancedSearchUI() {
        const searchContainer = document.querySelector('.search-page');
        if (!searchContainer) return;
        
        searchContainer.innerHTML = `
            <div class="advanced-search-container">
                <div class="search-header">
                    <h1><i class="fas fa-search"></i> 高级搜索</h1>
                    <p class="search-subtitle">使用高级过滤器精确查找照片和用户</p>
                </div>
                
                <div class="search-content">
                    <div class="search-sidebar">
                        <div class="search-filters">
                            <h3><i class="fas fa-filter"></i> 过滤器</h3>
                            
                            <div class="filter-section">
                                <h4><i class="fas fa-image"></i> 搜索类型</h4>
                                <div class="filter-options">
                                    <label class="filter-option">
                                        <input type="radio" name="search-type" value="all" checked>
                                        <span>全部</span>
                                    </label>
                                    <label class="filter-option">
                                        <input type="radio" name="search-type" value="photos">
                                        <span>照片</span>
                                    </label>
                                    <label class="filter-option">
                                        <input type="radio" name="search-type" value="users">
                                        <span>用户</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="filter-section">
                                <h4><i class="fas fa-sort"></i> 排序方式</h4>
                                <div class="filter-options">
                                    <label class="filter-option">
                                        <input type="radio" name="search-sort" value="relevance" checked>
                                        <span>相关性</span>
                                    </label>
                                    <label class="filter-option">
                                        <input type="radio" name="search-sort" value="newest">
                                        <span>最新</span>
                                    </label>
                                    <label class="filter-option">
                                        <input type="radio" name="search-sort" value="popular">
                                        <span>最受欢迎</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="filter-section">
                                <h4><i class="fas fa-calendar"></i> 时间范围</h4>
                                <div class="filter-options">
                                    <label class="filter-option">
                                        <input type="radio" name="search-date" value="all" checked>
                                        <span>全部时间</span>
                                    </label>
                                    <label class="filter-option">
                                        <input type="radio" name="search-date" value="today">
                                        <span>今天</span>
                                    </label>
                                    <label class="filter-option">
                                        <input type="radio" name="search-date" value="week">
                                        <span>本周</span>
                                    </label>
                                    <label class="filter-option">
                                        <input type="radio" name="search-date" value="month">
                                        <span>本月</span>
                                    </label>
                                    <label class="filter-option">
                                        <input type="radio" name="search-date" value="year">
                                        <span>今年</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="filter-section">
                                <h4><i class="fas fa-lock"></i> 隐私设置</h4>
                                <div class="filter-options">
                                    <label class="filter-option">
                                        <input type="radio" name="search-privacy" value="all" checked>
                                        <span>全部</span>
                                    </label>
                                    <label class="filter-option">
                                        <input type="radio" name="search-privacy" value="public">
                                        <span>公开</span>
                                    </label>
                                    <label class="filter-option">
                                        <input type="radio" name="search-privacy" value="private">
                                        <span>私密</span>
                                    </label>
                                </div>
                            </div>
                            
                            <button class="btn btn-primary btn-block" id="apply-filters-btn">
                                <i class="fas fa-check"></i>
                                <span>应用过滤器</span>
                            </button>
                            <button class="btn btn-outline btn-block" id="reset-filters-btn">
                                <i class="fas fa-redo"></i>
                                <span>重置过滤器</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="search-results-area">
                        <div class="search-input-container">
                            <div class="search-input-wrapper">
                                <i class="fas fa-search"></i>
                                <input type="text" 
                                       id="advanced-search-input" 
                                       placeholder="搜索照片、用户或关键词..."
                                       autocomplete="off">
                                <button class="btn btn-primary" id="search-button">
                                    <i class="fas fa-search"></i>
                                    <span>搜索</span>
                                </button>
                            </div>
                            
                            <div class="search-suggestions" id="search-suggestions">
                                <div class="suggestions-header">
                                    <h4>热门搜索</h4>
                                </div>
                                <div class="suggestions-list">
                                    <button class="suggestion-item" data-query="风景">
                                        <i class="fas fa-mountain"></i>
                                        <span>风景</span>
                                    </button>
                                    <button class="suggestion-item" data-query="人像">
                                        <i class="fas fa-user"></i>
                                        <span>人像</span>
                                    </button>
                                    <button class="suggestion-item" data-query="城市">
                                        <i class="fas fa-city"></i>
                                        <span>城市</span>
                                    </button>
                                    <button class="suggestion-item" data-query="动物">
                                        <i class="fas fa-paw"></i>
                                        <span>动物</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="search-results-header">
                            <h3 id="results-title">输入关键词开始搜索</h3>
                            <div class="results-stats" id="results-stats">
                                <span id="results-count">0</span> 个结果
                            </div>
                        </div>
                        
                        <div class="search-tabs" id="search-tabs">
                            <button class="search-tab-btn active" data-type="all">
                                <i class="fas fa-th"></i>
                                <span>全部</span>
                            </button>
                            <button class="search-tab-btn" data-type="photos">
                                <i class="fas fa-image"></i>
                                <span>照片</span>
                            </button>
                            <button class="search-tab-btn" data-type="users">
                                <i class="fas fa-user"></i>
                                <span>用户</span>
                            </button>
                        </div>
                        
                        <div class="search-results-container">
                            <div class="search-results-grid" id="search-results-grid">
                                <div class="empty-search">
                                    <i class="fas fa-search"></i>
                                    <p>输入关键词开始搜索照片和用户</p>
                                    <p class="empty-state-sub">试试搜索"风景"、"人像"或用户名</p>
                                </div>
                            </div>
                            
                            <div class="search-loading" id="search-loading">
                                <div class="loading-spinner">
                                    <div class="spinner"></div>
                                    <p>搜索中...</p>
                                </div>
                            </div>
                            
                            <div class="search-pagination" id="search-pagination">
                                <!-- 分页按钮将通过JS动态生成 -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.bindAdvancedSearchEvents();
        
        // 如果有URL参数，自动搜索
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        if (query) {
            document.getElementById('advanced-search-input').value = query;
            this.performSearch(query);
        }
    }

    bindEvents() {
        // 绑定全局搜索事件（如果不在搜索页面）
        if (!window.location.pathname.includes('search.html')) {
            const globalSearch = document.getElementById('global-search');
            if (globalSearch) {
                globalSearch.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && globalSearch.value.trim()) {
                        this.redirectToSearchPage(globalSearch.value.trim());
                    }
                });
            }
        }
    }

    bindAdvancedSearchEvents() {
        // 搜索输入
        const searchInput = document.getElementById('advanced-search-input');
        if (searchInput) {
            // 输入时实时搜索建议
            searchInput.addEventListener('input', debounce(() => {
                const query = searchInput.value.trim();
                if (query.length >= 2) {
                    this.showSearchSuggestions(query);
                } else {
                    this.hideSearchSuggestions();
                }
            }, 300));
            
            // Enter键搜索
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch(searchInput.value.trim());
                }
            });
        }
        
        // 搜索按钮
        const searchButton = document.getElementById('search-button');
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                const query = document.getElementById('advanced-search-input').value.trim();
                this.performSearch(query);
            });
        }
        
        // 应用过滤器按钮
        const applyFiltersBtn = document.getElementById('apply-filters-btn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.updateFilters();
                if (this.currentQuery) {
                    this.performSearch(this.currentQuery);
                }
            });
        }
        
        // 重置过滤器按钮
        const resetFiltersBtn = document.getElementById('reset-filters-btn');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                this.resetFilters();
            });
        }
        
        // 搜索建议点击
        document.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const query = e.currentTarget.dataset.query;
                document.getElementById('advanced-search-input').value = query;
                this.performSearch(query);
            });
        });
        
        // 搜索标签切换
        document.querySelectorAll('.search-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.switchSearchTab(type);
            });
        });
        
        // 过滤器选项改变
        document.querySelectorAll('input[name="search-type"], input[name="search-sort"], input[name="search-date"], input[name="search-privacy"]').forEach(input => {
            input.addEventListener('change', () => {
                this.updateFilters();
            });
        });
    }

    updateFilters() {
        // 获取选中的过滤器值
        this.currentFilters = {
            type: document.querySelector('input[name="search-type"]:checked')?.value || 'all',
            sort: document.querySelector('input[name="search-sort"]:checked')?.value || 'relevance',
            dateRange: document.querySelector('input[name="search-date"]:checked')?.value || 'all',
            privacy: document.querySelector('input[name="search-privacy"]:checked')?.value || 'all'
        };
    }

    resetFilters() {
        // 重置所有过滤器为默认值
        document.querySelectorAll('input[name="search-type"]').forEach(input => {
            input.checked = input.value === 'all';
        });
        document.querySelectorAll('input[name="search-sort"]').forEach(input => {
            input.checked = input.value === 'relevance';
        });
        document.querySelectorAll('input[name="search-date"]').forEach(input => {
            input.checked = input.value === 'all';
        });
        document.querySelectorAll('input[name="search-privacy"]').forEach(input => {
            input.checked = input.value === 'all';
        });
        
        this.updateFilters();
        
        if (this.currentQuery) {
            this.performSearch(this.currentQuery);
        }
    }

    async showSearchSuggestions(query) {
        const suggestionsContainer = document.getElementById('search-suggestions');
        if (!suggestionsContainer) return;
        
        try {
            // 搜索照片标题和描述
            const { data: photoResults } = await supabase
                .from('photos')
                .select('title')
                .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
                .eq('is_private', false)
                .limit(5);
            
            // 搜索用户
            const { data: userResults } = await supabase
                .from('profiles')
                .select('username')
                .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
                .limit(5);
            
            // 搜索关键词
            const { data: keywordResults } = await supabase
                .from('photos')
                .select('keywords')
                .eq('is_private', false)
                .limit(10);
            
            // 提取唯一关键词
            const keywords = new Set();
            if (keywordResults) {
                keywordResults.forEach(photo => {
                    if (photo.keywords) {
                        photo.keywords.forEach(keyword => {
                            if (keyword.toLowerCase().includes(query.toLowerCase())) {
                                keywords.add(keyword);
                            }
                        });
                    }
                });
            }
            
            // 构建建议列表
            let suggestionsHTML = '<div class="suggestions-header"><h4>搜索建议</h4></div>';
            suggestionsHTML += '<div class="suggestions-list">';
            
            // 添加照片建议
            if (photoResults && photoResults.length > 0) {
                suggestionsHTML += '<div class="suggestion-category"><h5>照片</h5></div>';
                photoResults.slice(0, 3).forEach(photo => {
                    suggestionsHTML += `
                        <button class="suggestion-item" data-query="${escapeHtml(photo.title)}">
                            <i class="fas fa-image"></i>
                            <span>${escapeHtml(photo.title)}</span>
                        </button>
                    `;
                });
            }
            
            // 添加用户建议
            if (userResults && userResults.length > 0) {
                suggestionsHTML += '<div class="suggestion-category"><h5>用户</h5></div>';
                userResults.slice(0, 3).forEach(user => {
                    suggestionsHTML += `
                        <button class="suggestion-item" data-query="${escapeHtml(user.username)}">
                            <i class="fas fa-user"></i>
                            <span>${escapeHtml(user.username)}</span>
                        </button>
                    `;
                });
            }
            
            // 添加关键词建议
            if (keywords.size > 0) {
                suggestionsHTML += '<div class="suggestion-category"><h5>关键词</h5></div>';
                Array.from(keywords).slice(0, 3).forEach(keyword => {
                    suggestionsHTML += `
                        <button class="suggestion-item" data-query="${escapeHtml(keyword)}">
                            <i class="fas fa-tag"></i>
                            <span>${escapeHtml(keyword)}</span>
                        </button>
                    `;
                });
            }
            
            suggestionsHTML += '</div>';
            suggestionsContainer.innerHTML = suggestionsHTML;
            suggestionsContainer.classList.add('active');
            
            // 绑定建议项点击事件
            suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const query = e.currentTarget.dataset.query;
                    document.getElementById('advanced-search-input').value = query;
                    this.performSearch(query);
                    suggestionsContainer.classList.remove('active');
                });
            });
            
        } catch (error) {
            console.error('获取搜索建议失败:', error);
        }
    }

    hideSearchSuggestions() {
        const suggestionsContainer = document.getElementById('search-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.classList.remove('active');
        }
    }

    async performSearch(query) {
        if (!query || query.trim().length === 0) {
            this.showEmptySearch();
            return;
        }
        
        this.currentQuery = query.trim();
        
        // 更新URL
        this.updateSearchURL(query);
        
        // 显示加载状态
        this.showLoading();
        
        try {
            // 根据过滤器执行搜索
            const results = await this.executeSearch(query);
            
            // 显示结果
            this.displaySearchResults(results);
            
        } catch (error) {
            console.error('搜索失败:', error);
            this.showError('搜索失败，请重试');
        } finally {
            this.hideLoading();
        }
    }

    async executeSearch(query) {
        const results = {
            photos: [],
            users: [],
            total: 0
        };
        
        // 根据搜索类型决定搜索什么
        const searchType = this.currentFilters.type;
        
        // 搜索照片
        if (searchType === 'all' || searchType === 'photos') {
            let photoQuery = supabase
                .from('photos')
                .select(`
                    *,
                    profiles!user_id (
                        username,
                        avatar_url
                    )
                `)
                .or(`title.ilike.%${query}%,description.ilike.%${query}%`);
            
            // 应用隐私过滤器
            if (this.currentFilters.privacy === 'public') {
                photoQuery = photoQuery.eq('is_private', false);
            } else if (this.currentFilters.privacy === 'private') {
                photoQuery = photoQuery.eq('is_private', true);
            }
            
            // 应用时间范围过滤器
            if (this.currentFilters.dateRange !== 'all') {
                const date = new Date();
                switch (this.currentFilters.dateRange) {
                    case 'today':
                        date.setDate(date.getDate() - 1);
                        break;
                    case 'week':
                        date.setDate(date.getDate() - 7);
                        break;
                    case 'month':
                        date.setMonth(date.getMonth() - 1);
                        break;
                    case 'year':
                        date.setFullYear(date.getFullYear() - 1);
                        break;
                }
                photoQuery = photoQuery.gte('created_at', date.toISOString());
            }
            
            // 应用排序
            switch (this.currentFilters.sort) {
                case 'newest':
                    photoQuery = photoQuery.order('created_at', { ascending: false });
                    break;
                case 'popular':
                    photoQuery = photoQuery.order('likes_count', { ascending: false });
                    break;
                case 'relevance':
                    // 默认按相关性排序（按创建时间降序）
                    photoQuery = photoQuery.order('created_at', { ascending: false });
                    break;
            }
            
            const { data: photos, error: photoError } = await photoQuery.limit(50);
            
            if (!photoError) {
                results.photos = photos || [];
            }
        }
        
        // 搜索用户
        if (searchType === 'all' || searchType === 'users') {
            let userQuery = supabase
                .from('profiles')
                .select('*')
                .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,email.ilike.%${query}%`);
            
            const { data: users, error: userError } = await userQuery.limit(50);
            
            if (!userError) {
                results.users = users || [];
            }
        }
        
        // 计算总数
        results.total = results.photos.length + results.users.length;
        
        return results;
    }

    displaySearchResults(results) {
        const resultsGrid = document.getElementById('search-results-grid');
        const resultsTitle = document.getElementById('results-title');
        const resultsCount = document.getElementById('results-count');
        const resultsStats = document.getElementById('results-stats');
        
        if (!resultsGrid || !resultsTitle || !resultsCount) return;
        
        // 更新结果统计
        resultsCount.textContent = results.total;
        resultsTitle.textContent = `"${escapeHtml(this.currentQuery)}" 的搜索结果`;
        
        if (results.total === 0) {
            this.showNoResults();
            return;
        }
        
        // 根据当前标签显示内容
        const activeTab = document.querySelector('.search-tab-btn.active')?.dataset.type || 'all';
        
        let resultsHTML = '';
        
        if (activeTab === 'all' || activeTab === 'photos') {
            if (results.photos.length > 0) {
                if (activeTab === 'all') {
                    resultsHTML += '<div class="results-category"><h4><i class="fas fa-images"></i> 照片</h4></div>';
                }
                
                resultsHTML += '<div class="search-photos-grid">';
                resultsHTML += results.photos.map(photo => `
                    <div class="search-photo-card" data-photo-id="${photo.id}">
                        <img src="${photo.image_url}" 
                             alt="${photo.title}"
                             class="search-photo-image"
                             loading="lazy">
                        <div class="search-photo-overlay">
                            <div class="search-photo-info">
                                <h5>${escapeHtml(photo.title)}</h5>
                                <div class="search-photo-author">
                                    <img src="${photo.profiles.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(photo.profiles.username || '用户')}" 
                                         alt="${photo.profiles.username}">
                                    <span>${escapeHtml(photo.profiles.username || '匿名用户')}</span>
                                </div>
                                <div class="search-photo-stats">
                                    <span><i class="fas fa-heart"></i> ${photo.likes_count || 0}</span>
                                    <span><i class="fas fa-comment"></i> ${photo.comments_count || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');
                resultsHTML += '</div>';
            }
        }
        
        if (activeTab === 'all' || activeTab === 'users') {
            if (results.users.length > 0) {
                if (activeTab === 'all') {
                    resultsHTML += '<div class="results-category"><h4><i class="fas fa-users"></i> 用户</h4></div>';
                }
                
                resultsHTML += '<div class="search-users-grid">';
                resultsHTML += results.users.map(user => `
                    <div class="search-user-card" data-user-id="${user.id}">
                        <img src="${user.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username || user.email)}" 
                             alt="${user.username}"
                             class="search-user-avatar">
                        <div class="search-user-info">
                            <h5>${escapeHtml(user.username || '匿名用户')}</h5>
                            ${user.full_name ? `<p class="search-user-fullname">${escapeHtml(user.full_name)}</p>` : ''}
                            ${user.bio ? `<p class="search-user-bio">${escapeHtml(user.bio.substring(0, 80))}${user.bio.length > 80 ? '...' : ''}</p>` : ''}
                            <button class="btn btn-outline btn-small view-profile-btn" data-user-id="${user.id}">
                                <i class="fas fa-user"></i>
                                <span>查看资料</span>
                            </button>
                        </div>
                    </div>
                `).join('');
                resultsHTML += '</div>';
            }
        }
        
        resultsGrid.innerHTML = resultsHTML;
        
        // 绑定结果点击事件
        this.bindResultsEvents();
        
        // 显示/隐藏分页
        this.updatePagination();
    }

    bindResultsEvents() {
        // 照片点击
        document.querySelectorAll('.search-photo-card').forEach(card => {
            card.addEventListener('click', async (e) => {
                const photoId = e.currentTarget.dataset.photoId;
                if (window.app && window.app.showPhotoDetail) {
                    await window.app.showPhotoDetail(photoId);
                }
            });
        });
        
        // 用户资料按钮
        document.querySelectorAll('.view-profile-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const userId = e.currentTarget.dataset.userId;
                window.location.href = `profile.html?user=${userId}`;
            });
        });
    }

    switchSearchTab(type) {
        // 更新标签按钮状态
        document.querySelectorAll('.search-tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.type === type) {
                btn.classList.add('active');
            }
        });
        
        // 重新显示结果（如果有搜索结果）
        if (this.searchResults && this.searchResults.total > 0) {
            this.displaySearchResults(this.searchResults);
        }
    }

    updatePagination() {
        // 这里可以添加分页逻辑
        // 目前显示所有结果，不进行分页
    }

    showLoading() {
        const loadingElement = document.getElementById('search-loading');
        const resultsGrid = document.getElementById('search-results-grid');
        
        if (loadingElement) loadingElement.style.display = 'flex';
        if (resultsGrid) resultsGrid.style.display = 'none';
    }

    hideLoading() {
        const loadingElement = document.getElementById('search-loading');
        const resultsGrid = document.getElementById('search-results-grid');
        
        if (loadingElement) loadingElement.style.display = 'none';
        if (resultsGrid) resultsGrid.style.display = 'block';
    }

    showEmptySearch() {
        const resultsGrid = document.getElementById('search-results-grid');
        if (resultsGrid) {
            resultsGrid.innerHTML = `
                <div class="empty-search">
                    <i class="fas fa-search"></i>
                    <p>输入关键词开始搜索照片和用户</p>
                    <p class="empty-state-sub">试试搜索"风景"、"人像"或用户名</p>
                </div>
            `;
        }
    }

    showNoResults() {
        const resultsGrid = document.getElementById('search-results-grid');
        if (resultsGrid) {
            resultsGrid.innerHTML = `
                <div class="empty-search">
                    <i class="fas fa-search-minus"></i>
                    <p>没有找到匹配的结果</p>
                    <p class="empty-state-sub">尝试使用不同的关键词或调整过滤器</p>
                </div>
            `;
        }
    }

    showError(message) {
        const resultsGrid = document.getElementById('search-results-grid');
        if (resultsGrid) {
            resultsGrid.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    updateSearchURL(query) {
        const url = new URL(window.location);
        url.searchParams.set('q', query);
        window.history.pushState({}, '', url);
    }

    redirectToSearchPage(query) {
        window.location.href = `search.html?q=${encodeURIComponent(query)}`;
    }
}

// 初始化高级搜索
let advancedSearch = null;

document.addEventListener('DOMContentLoaded', () => {
    advancedSearch = new AdvancedSearch();
});

// 导出
export { advancedSearch };