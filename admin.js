// 管理员功能模块
import { supabase, ADMIN_EMAIL } from './config.js';
import { authManager } from './auth.js';
import { showNotification, showLoading, hideLoading, escapeHtml, showConfirm } from './utils.js';

class AdminManager {
    constructor() {
        this.isAdmin = false;
        this.init();
    }

    async init() {
        // 检查当前用户是否是管理员
        await this.checkAdminStatus();
        
        if (this.isAdmin) {
            this.setupAdminUI();
            this.loadAdminData();
        }
    }

    async checkAdminStatus() {
        const user = authManager.getCurrentUser();
        
        if (!user) {
            this.isAdmin = false;
            return;
        }
        
        // 检查邮箱是否是管理员邮箱
        if (user.email === ADMIN_EMAIL) {
            this.isAdmin = true;
            
            // 确保数据库中的管理员标志已设置
            await this.ensureAdminFlag(user.id);
            
            return;
        }
        
        // 检查数据库中的管理员标志
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();
        
        if (!error && profile && profile.is_admin) {
            this.isAdmin = true;
        }
    }

    async ensureAdminFlag(userId) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_admin: true })
                .eq('id', userId);
            
            if (error) throw error;
        } catch (error) {
            console.error('设置管理员标志失败:', error);
        }
    }

    setupAdminUI() {
        // 在导航栏添加管理员链接
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu) {
            const adminLink = document.createElement('a');
            adminLink.href = '#admin';
            adminLink.className = 'nav-link';
            adminLink.innerHTML = `
                <i class="fas fa-shield-alt"></i>
                <span class="nav-text">管理</span>
            `;
            adminLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openAdminPanel();
            });
            navMenu.appendChild(adminLink);
        }
        
        // 在移动菜单添加管理员链接
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu) {
            const mobileAdminLink = document.createElement('a');
            mobileAdminLink.href = '#admin';
            mobileAdminLink.className = 'mobile-nav-link';
            mobileAdminLink.innerHTML = `
                <i class="fas fa-shield-alt"></i>
                <span>管理</span>
            `;
            mobileAdminLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openAdminPanel();
            });
            mobileMenu.appendChild(mobileAdminLink);
        }
    }

    async openAdminPanel() {
        if (!this.isAdmin) {
            showNotification('需要管理员权限', 'error');
            return;
        }
        
        // 创建管理员面板模态框
        this.createAdminModal();
    }

    createAdminModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'admin-modal';
        modal.innerHTML = `
            <div class="modal-content modal-wide">
                <div class="modal-header">
                    <h2><i class="fas fa-shield-alt"></i> 管理面板</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="admin-tabs">
                        <button class="admin-tab-btn active" data-tab="photos">
                            <i class="fas fa-images"></i>
                            <span>照片管理</span>
                        </button>
                        <button class="admin-tab-btn" data-tab="users">
                            <i class="fas fa-users"></i>
                            <span>用户管理</span>
                        </button>
                        <button class="admin-tab-btn" data-tab="reports">
                            <i class="fas fa-flag"></i>
                            <span>举报管理</span>
                        </button>
                        <button class="admin-tab-btn" data-tab="stats">
                            <i class="fas fa-chart-bar"></i>
                            <span>统计</span>
                        </button>
                    </div>
                    
                    <div class="admin-tab-content">
                        <div class="admin-tab-pane active" id="admin-photos-tab">
                            <div class="admin-section-header">
                                <h3><i class="fas fa-images"></i> 照片管理</h3>
                                <div class="admin-filters">
                                    <select id="admin-photo-filter">
                                        <option value="all">所有照片</option>
                                        <option value="reported">被举报照片</option>
                                        <option value="private">私密照片</option>
                                        <option value="recent">最近上传</option>
                                    </select>
                                    <input type="text" id="admin-photo-search" placeholder="搜索照片...">
                                </div>
                            </div>
                            <div class="admin-photos-list" id="admin-photos-list">
                                <div class="loading-spinner">
                                    <div class="spinner"></div>
                                    <p>加载照片...</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="admin-tab-pane" id="admin-users-tab">
                            <div class="admin-section-header">
                                <h3><i class="fas fa-users"></i> 用户管理</h3>
                                <div class="admin-filters">
                                    <select id="admin-user-filter">
                                        <option value="all">所有用户</option>
                                        <option value="admin">管理员</option>
                                        <option value="active">活跃用户</option>
                                        <option value="banned">封禁用户</option>
                                    </select>
                                    <input type="text" id="admin-user-search" placeholder="搜索用户...">
                                </div>
                            </div>
                            <div class="admin-users-list" id="admin-users-list">
                                <div class="loading-spinner">
                                    <div class="spinner"></div>
                                    <p>加载用户...</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="admin-tab-pane" id="admin-reports-tab">
                            <div class="admin-section-header">
                                <h3><i class="fas fa-flag"></i> 举报管理</h3>
                                <div class="admin-filters">
                                    <select id="admin-report-filter">
                                        <option value="all">所有举报</option>
                                        <option value="pending">待处理</option>
                                        <option value="resolved">已处理</option>
                                    </select>
                                </div>
                            </div>
                            <div class="admin-reports-list" id="admin-reports-list">
                                <div class="loading-spinner">
                                    <div class="spinner"></div>
                                    <p>加载举报...</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="admin-tab-pane" id="admin-stats-tab">
                            <div class="admin-section-header">
                                <h3><i class="fas fa-chart-bar"></i> 统计信息</h3>
                            </div>
                            <div class="admin-stats-grid" id="admin-stats-grid">
                                <div class="loading-spinner">
                                    <div class="spinner"></div>
                                    <p>加载统计...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定事件
        this.bindAdminModalEvents(modal);
        
        // 加载初始数据
        this.loadAdminPhotos();
    }

    bindAdminModalEvents(modal) {
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
        
        // 标签切换
        modal.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchAdminTab(tabName);
            });
        });
        
        // 照片搜索
        const photoSearch = modal.querySelector('#admin-photo-search');
        if (photoSearch) {
            photoSearch.addEventListener('input', debounce(() => {
                this.searchAdminPhotos(photoSearch.value);
            }, 300));
        }
        
        // 照片过滤器
        const photoFilter = modal.querySelector('#admin-photo-filter');
        if (photoFilter) {
            photoFilter.addEventListener('change', () => {
                this.loadAdminPhotos();
            });
        }
        
        // 用户搜索
        const userSearch = modal.querySelector('#admin-user-search');
        if (userSearch) {
            userSearch.addEventListener('input', debounce(() => {
                this.searchAdminUsers(userSearch.value);
            }, 300));
        }
        
        // 用户过滤器
        const userFilter = modal.querySelector('#admin-user-filter');
        if (userFilter) {
            userFilter.addEventListener('change', () => {
                this.loadAdminUsers();
            });
        }
        
        // 举报过滤器
        const reportFilter = modal.querySelector('#admin-report-filter');
        if (reportFilter) {
            reportFilter.addEventListener('change', () => {
                this.loadAdminReports();
            });
        }
    }

    switchAdminTab(tabName) {
        // 更新标签按钮状态
        document.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });
        
        // 显示对应标签内容
        document.querySelectorAll('.admin-tab-pane').forEach(pane => {
            pane.classList.remove('active');
            if (pane.id === `admin-${tabName}-tab`) {
                pane.classList.add('active');
            }
        });
        
        // 加载对应标签的数据
        switch (tabName) {
            case 'photos':
                this.loadAdminPhotos();
                break;
            case 'users':
                this.loadAdminUsers();
                break;
            case 'reports':
                this.loadAdminReports();
                break;
            case 'stats':
                this.loadAdminStats();
                break;
        }
    }

    async loadAdminPhotos() {
        try {
            const filter = document.querySelector('#admin-photo-filter')?.value || 'all';
            let query = supabase
                .from('photos')
                .select(`
                    *,
                    profiles!user_id (
                        username,
                        avatar_url
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(50);
            
            switch (filter) {
                case 'reported':
                    // 这里需要举报表，暂时显示所有照片
                    break;
                case 'private':
                    query = query.eq('is_private', true);
                    break;
                case 'recent':
                    // 最近7天的照片
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    query = query.gte('created_at', sevenDaysAgo.toISOString());
                    break;
            }
            
            const { data: photos, error } = await query;
            
            if (error) throw error;
            
            this.renderAdminPhotos(photos || []);
            
        } catch (error) {
            console.error('加载管理照片失败:', error);
            const list = document.getElementById('admin-photos-list');
            if (list) {
                list.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>加载照片失败</p>
                    </div>
                `;
            }
        }
    }

    async searchAdminPhotos(searchTerm) {
        if (!searchTerm || searchTerm.length < 2) {
            this.loadAdminPhotos();
            return;
        }
        
        try {
            const { data: photos, error } = await supabase
                .from('photos')
                .select(`
                    *,
                    profiles!user_id (
                        username,
                        avatar_url
                    )
                `)
                .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (error) throw error;
            
            this.renderAdminPhotos(photos || []);
            
        } catch (error) {
            console.error('搜索管理照片失败:', error);
        }
    }

    renderAdminPhotos(photos) {
        const list = document.getElementById('admin-photos-list');
        if (!list) return;
        
        if (!photos.length) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-images"></i>
                    <p>没有找到照片</p>
                </div>
            `;
            return;
        }
        
        list.innerHTML = photos.map(photo => `
            <div class="admin-photo-item" data-photo-id="${photo.id}">
                <div class="admin-photo-preview">
                    <img src="${photo.image_url}" alt="${photo.title}">
                </div>
                <div class="admin-photo-info">
                    <h4>${escapeHtml(photo.title)}</h4>
                    <div class="admin-photo-meta">
                        <div class="admin-photo-author">
                            <img src="${photo.profiles.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(photo.profiles.username || '用户')}" 
                                 alt="${photo.profiles.username}">
                            <span>${escapeHtml(photo.profiles.username || '匿名用户')}</span>
                        </div>
                        <div class="admin-photo-stats">
                            <span><i class="fas fa-calendar"></i> ${new Date(photo.created_at).toLocaleDateString()}</span>
                            <span><i class="fas fa-heart"></i> ${photo.likes_count || 0}</span>
                            <span><i class="fas fa-comment"></i> ${photo.comments_count || 0}</span>
                            <span class="${photo.is_private ? 'private' : 'public'}">
                                ${photo.is_private ? '<i class="fas fa-lock"></i> 私密' : '<i class="fas fa-globe"></i> 公开'}
                            </span>
                        </div>
                    </div>
                    ${photo.description ? `
                        <p class="admin-photo-description">${escapeHtml(photo.description.substring(0, 100))}${photo.description.length > 100 ? '...' : ''}</p>
                    ` : ''}
                    <div class="admin-photo-actions">
                        <button class="btn btn-outline btn-small view-photo-btn" data-photo-id="${photo.id}">
                            <i class="fas fa-eye"></i> 查看
                        </button>
                        <button class="btn btn-outline btn-small edit-photo-btn" data-photo-id="${photo.id}">
                            <i class="fas fa-edit"></i> 编辑
                        </button>
                        <button class="btn btn-danger btn-small delete-photo-btn" data-photo-id="${photo.id}">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                        ${photo.is_private ? `
                            <button class="btn btn-success btn-small make-public-btn" data-photo-id="${photo.id}">
                                <i class="fas fa-globe"></i> 设为公开
                            </button>
                        ` : `
                            <button class="btn btn-warning btn-small make-private-btn" data-photo-id="${photo.id}">
                                <i class="fas fa-lock"></i> 设为私密
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `).join('');
        
        // 绑定照片操作事件
        this.bindAdminPhotoActions();
    }

    bindAdminPhotoActions() {
        // 查看照片
        document.querySelectorAll('.view-photo-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const photoId = e.currentTarget.dataset.photoId;
                if (window.app && window.app.showPhotoDetail) {
                    await window.app.showPhotoDetail(photoId);
                }
            });
        });
        
        // 删除照片
        document.querySelectorAll('.delete-photo-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const photoId = e.currentTarget.dataset.photoId;
                await this.deletePhotoAsAdmin(photoId);
            });
        });
        
        // 切换隐私状态
        document.querySelectorAll('.make-public-btn, .make-private-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const photoId = e.currentTarget.dataset.photoId;
                const makePublic = e.currentTarget.classList.contains('make-public-btn');
                await this.togglePhotoPrivacy(photoId, makePublic);
            });
        });
    }

    async deletePhotoAsAdmin(photoId) {
        const confirmed = await showConfirm('确定要删除这张照片吗？此操作不可撤销。', '删除照片');
        if (!confirmed) return;
        
        try {
            showLoading('删除照片中...');
            
            // 获取照片信息（用于删除Cloudinary图片）
            const { data: photo } = await supabase
                .from('photos')
                .select('cloudinary_public_id')
                .eq('id', photoId)
                .single();
            
            // 从数据库删除
            const { error } = await supabase
                .from('photos')
                .delete()
                .eq('id', photoId);
            
            if (error) throw error;
            
            // 从Cloudinary删除（可选）
            if (photo && photo.cloudinary_public_id) {
                try {
                    await this.deleteFromCloudinary(photo.cloudinary_public_id);
                } catch (cloudinaryError) {
                    console.warn('Cloudinary删除失败:', cloudinaryError);
                }
            }
            
            // 重新加载照片列表
            await this.loadAdminPhotos();
            
            hideLoading();
            showNotification('照片已删除', 'success');
            
        } catch (error) {
            hideLoading();
            console.error('删除照片失败:', error);
            showNotification('删除照片失败', 'error');
        }
    }

    async togglePhotoPrivacy(photoId, makePublic) {
        try {
            showLoading('更新中...');
            
            const { error } = await supabase
                .from('photos')
                .update({ is_private: !makePublic })
                .eq('id', photoId);
            
            if (error) throw error;
            
            // 重新加载照片列表
            await this.loadAdminPhotos();
            
            hideLoading();
            showNotification(`照片已设为${makePublic ? '公开' : '私密'}`, 'success');
            
        } catch (error) {
            hideLoading();
            console.error('更新照片隐私失败:', error);
            showNotification('更新失败', 'error');
        }
    }

    async deleteFromCloudinary(publicId) {
        const formData = new FormData();
        formData.append('public_id', publicId);
        formData.append('api_key', '263478638476192');
        formData.append('timestamp', Math.floor(Date.now() / 1000));
        
        // 生成签名
        const signatureString = `public_id=${publicId}&timestamp=${formData.get('timestamp')}eplFKZdw3w0jVl2RSaJmNK9tzo`;
        const signature = await this.generateSHA1(signatureString);
        formData.append('signature', signature);
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/dy77idija/image/destroy`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Cloudinary删除失败');
        }
        
        return true;
    }

    async generateSHA1(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    async loadAdminUsers() {
        try {
            const filter = document.querySelector('#admin-user-filter')?.value || 'all';
            let query = supabase
                .from('profiles')
                .select(`
                    *,
                    photos!user_id (id)
                `)
                .order('created_at', { ascending: false })
                .limit(50);
            
            switch (filter) {
                case 'admin':
                    query = query.eq('is_admin', true);
                    break;
                case 'active':
                    // 最近30天有活动的用户
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    query = query.gte('updated_at', thirtyDaysAgo.toISOString());
                    break;
                case 'banned':
                    // 这里需要封禁系统，暂时显示所有用户
                    break;
            }
            
            const { data: users, error } = await query;
            
            if (error) throw error;
            
            this.renderAdminUsers(users || []);
            
        } catch (error) {
            console.error('加载管理用户失败:', error);
            const list = document.getElementById('admin-users-list');
            if (list) {
                list.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>加载用户失败</p>
                    </div>
                `;
            }
        }
    }

    async searchAdminUsers(searchTerm) {
        if (!searchTerm || searchTerm.length < 2) {
            this.loadAdminUsers();
            return;
        }
        
        try {
            const { data: users, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    photos!user_id (id)
                `)
                .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (error) throw error;
            
            this.renderAdminUsers(users || []);
            
        } catch (error) {
            console.error('搜索管理用户失败:', error);
        }
    }

    renderAdminUsers(users) {
        const list = document.getElementById('admin-users-list');
        if (!list) return;
        
        if (!users.length) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>没有找到用户</p>
                </div>
            `;
            return;
        }
        
        list.innerHTML = users.map(user => `
            <div class="admin-user-item" data-user-id="${user.id}">
                <div class="admin-user-avatar">
                    <img src="${user.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username || user.email)}" 
                         alt="${user.username}">
                </div>
                <div class="admin-user-info">
                    <div class="admin-user-header">
                        <h4>
                            ${escapeHtml(user.username || '匿名用户')}
                            ${user.is_admin ? '<span class="admin-badge"><i class="fas fa-crown"></i> 管理员</span>' : ''}
                        </h4>
                        <span class="admin-user-email">${escapeHtml(user.email || '未设置邮箱')}</span>
                    </div>
                    <div class="admin-user-meta">
                        <div class="admin-user-stats">
                            <span><i class="fas fa-images"></i> ${user.photos?.length || 0} 照片</span>
                            <span><i class="fas fa-calendar"></i> ${new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="admin-user-bio">
                            ${user.bio ? escapeHtml(user.bio.substring(0, 100)) + (user.bio.length > 100 ? '...' : '') : '暂无简介'}
                        </div>
                    </div>
                    <div class="admin-user-actions">
                        <button class="btn btn-outline btn-small view-profile-btn" data-user-id="${user.id}">
                            <i class="fas fa-user"></i> 查看资料
                        </button>
                        ${!user.is_admin ? `
                            <button class="btn btn-success btn-small make-admin-btn" data-user-id="${user.id}">
                                <i class="fas fa-crown"></i> 设为管理员
                            </button>
                        ` : `
                            <button class="btn btn-warning btn-small remove-admin-btn" data-user-id="${user.id}">
                                <i class="fas fa-user"></i> 取消管理员
                            </button>
                        `}
                        <button class="btn btn-danger btn-small delete-user-btn" data-user-id="${user.id}">
                            <i class="fas fa-trash"></i> 删除用户
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // 绑定用户操作事件
        this.bindAdminUserActions();
    }

    bindAdminUserActions() {
        // 查看资料
        document.querySelectorAll('.view-profile-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.currentTarget.dataset.userId;
                window.location.href = `profile.html?user=${userId}`;
            });
        });
        
        // 设为管理员
        document.querySelectorAll('.make-admin-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = e.currentTarget.dataset.userId;
                await this.toggleAdminStatus(userId, true);
            });
        });
        
        // 取消管理员
        document.querySelectorAll('.remove-admin-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = e.currentTarget.dataset.userId;
                await this.toggleAdminStatus(userId, false);
            });
        });
        
        // 删除用户
        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = e.currentTarget.dataset.userId;
                await this.deleteUserAsAdmin(userId);
            });
        });
    }

    async toggleAdminStatus(userId, makeAdmin) {
        const action = makeAdmin ? '设为管理员' : '取消管理员权限';
        const confirmed = await showConfirm(`确定要${action}吗？`, `${action}`);
        if (!confirmed) return;
        
        try {
            showLoading('操作中...');
            
            const { error } = await supabase
                .from('profiles')
                .update({ is_admin: makeAdmin })
                .eq('id', userId);
            
            if (error) throw error;
            
            // 重新加载用户列表
            await this.loadAdminUsers();
            
            hideLoading();
            showNotification(`用户已${action}`, 'success');
            
        } catch (error) {
            hideLoading();
            console.error('更新管理员状态失败:', error);
            showNotification('操作失败', 'error');
        }
    }

    async deleteUserAsAdmin(userId) {
        const confirmed = await showConfirm('确定要删除这个用户吗？此操作将删除用户的所有照片和评论，不可撤销。', '删除用户');
        if (!confirmed) return;
        
        try {
            showLoading('删除用户中...');
            
            // 注意：这里实际上应该删除Supabase Auth用户
            // 但由于Supabase Auth API限制，这里只删除用户资料和关联数据
            
            // 先获取用户的所有照片
            const { data: userPhotos } = await supabase
                .from('photos')
                .select('cloudinary_public_id')
                .eq('user_id', userId);
            
            // 删除Cloudinary图片
            if (userPhotos && userPhotos.length > 0) {
                for (const photo of userPhotos) {
                    if (photo.cloudinary_public_id) {
                        try {
                            await this.deleteFromCloudinary(photo.cloudinary_public_id);
                        } catch (cloudinaryError) {
                            console.warn('Cloudinary删除失败:', cloudinaryError);
                        }
                    }
                }
            }
            
            // 删除用户资料（关联数据会级联删除）
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);
            
            if (error) throw error;
            
            // 重新加载用户列表
            await this.loadAdminUsers();
            
            hideLoading();
            showNotification('用户已删除', 'success');
            
        } catch (error) {
            hideLoading();
            console.error('删除用户失败:', error);
            showNotification('删除用户失败', 'error');
        }
    }

    async loadAdminReports() {
        try {
            // 这里需要举报表，暂时显示占位内容
            const list = document.getElementById('admin-reports-list');
            if (list) {
                list.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-flag"></i>
                        <p>举报系统开发中</p>
                        <p class="empty-state-sub">此功能将在后续版本中提供</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('加载管理举报失败:', error);
        }
    }

    async loadAdminStats() {
        try {
            // 获取统计数据
            const [
                totalUsers,
                totalPhotos,
                totalLikes,
                totalComments,
                recentUsers,
                recentPhotos
            ] = await Promise.all([
                supabase.from('profiles').select('id', { count: 'exact' }),
                supabase.from('photos').select('id', { count: 'exact' }),
                supabase.from('likes').select('id', { count: 'exact' }),
                supabase.from('comments').select('id', { count: 'exact' }),
                supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5),
                supabase.from('photos').select('*, profiles!user_id(username)').order('created_at', { ascending: false }).limit(5)
            ]);
            
            const grid = document.getElementById('admin-stats-grid');
            if (!grid) return;
            
            grid.innerHTML = `
                <div class="admin-stats-section">
                    <h4><i class="fas fa-chart-pie"></i> 总览</h4>
                    <div class="stats-cards">
                        <div class="stats-card">
                            <div class="stats-card-icon" style="background: var(--accent-primary)">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="stats-card-content">
                                <div class="stats-card-value">${totalUsers.count || 0}</div>
                                <div class="stats-card-label">总用户数</div>
                            </div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-card-icon" style="background: var(--accent-success)">
                                <i class="fas fa-images"></i>
                            </div>
                            <div class="stats-card-content">
                                <div class="stats-card-value">${totalPhotos.count || 0}</div>
                                <div class="stats-card-label">总照片数</div>
                            </div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-card-icon" style="background: var(--accent-danger)">
                                <i class="fas fa-heart"></i>
                            </div>
                            <div class="stats-card-content">
                                <div class="stats-card-value">${totalLikes.count || 0}</div>
                                <div class="stats-card-label">总点赞数</div>
                            </div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-card-icon" style="background: var(--accent-info)">
                                <i class="fas fa-comment"></i>
                            </div>
                            <div class="stats-card-content">
                                <div class="stats-card-value">${totalComments.count || 0}</div>
                                <div class="stats-card-label">总评论数</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="admin-stats-section">
                    <h4><i class="fas fa-user-plus"></i> 最近注册用户</h4>
                    <div class="recent-users">
                        ${recentUsers.data && recentUsers.data.length > 0 ? recentUsers.data.map(user => `
                            <div class="recent-user">
                                <img src="${user.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username || user.email)}" 
                                     alt="${user.username}">
                                <div class="recent-user-info">
                                    <div class="recent-user-name">${escapeHtml(user.username || '匿名用户')}</div>
                                    <div class="recent-user-time">${formatDate(user.created_at, 'relative')}</div>
                                </div>
                            </div>
                        `).join('') : '<p class="empty-state-sub">暂无最近注册用户</p>'}
                    </div>
                </div>
                
                <div class="admin-stats-section">
                    <h4><i class="fas fa-image"></i> 最近上传照片</h4>
                    <div class="recent-photos">
                        ${recentPhotos.data && recentPhotos.data.length > 0 ? recentPhotos.data.map(photo => `
                            <div class="recent-photo">
                                <img src="${photo.image_url}" alt="${photo.title}">
                                <div class="recent-photo-info">
                                    <div class="recent-photo-title">${escapeHtml(photo.title)}</div>
                                    <div class="recent-photo-meta">
                                        <span>${escapeHtml(photo.profiles.username || '匿名用户')}</span>
                                        <span>${formatDate(photo.created_at, 'relative')}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('') : '<p class="empty-state-sub">暂无最近上传照片</p>'}
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('加载管理统计失败:', error);
            const grid = document.getElementById('admin-stats-grid');
            if (grid) {
                grid.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>加载统计失败</p>
                    </div>
                `;
            }
        }
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

// 格式化日期函数
function formatDate(date, format = 'relative') {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (format === 'relative') {
        if (diffSec < 60) return '刚刚';
        if (diffMin < 60) return `${diffMin}分钟前`;
        if (diffHour < 24) return `${diffHour}小时前`;
        if (diffDay < 7) return `${diffDay}天前`;
    }
    
    return d.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 初始化管理员管理器
let adminManager = null;

// 监听认证状态变化
window.addEventListener('authChange', async (event) => {
    if (event.detail.user) {
        if (!adminManager) {
            adminManager = new AdminManager();
        }
    }
});

// 如果已经登录，初始化管理员管理器
document.addEventListener('DOMContentLoaded', async () => {
    const user = authManager.getCurrentUser();
    if (user) {
        adminManager = new AdminManager();
    }
});

// 导出
export { adminManager };