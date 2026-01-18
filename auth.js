// 用户认证相关函数

class AuthManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.isAdmin = false;
        this.init();
    }

    async init() {
        // 初始化Supabase客户端
        this.supabase = supabase.createClient(
            window.SUPABASE_CONFIG.supabaseUrl,
            window.SUPABASE_CONFIG.supabaseKey
        );

        // 检查当前会话
        await this.checkSession();
    }

    async checkSession() {
        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            
            if (session) {
                this.currentUser = session.user;
                await this.loadUserProfile();
                this.updateUIForLoggedInUser();
            } else {
                this.updateUIForLoggedOutUser();
            }
        } catch (error) {
            console.error('检查会话错误:', error);
        }
    }

    async loadUserProfile() {
        try {
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // 用户第一次登录，创建profile
                    await this.createUserProfile();
                } else {
                    throw error;
                }
            } else {
                this.currentUser.profile = profile;
                this.isAdmin = profile.is_admin || 
                    this.currentUser.email === window.SUPABASE_CONFIG.adminEmail;
            }
        } catch (error) {
            console.error('加载用户资料错误:', error);
        }
    }

    async createUserProfile() {
        try {
            const username = this.currentUser.email.split('@')[0] + 
                Math.floor(Math.random() * 1000);
            
            const profileData = {
                id: this.currentUser.id,
                username: username,
                full_name: this.currentUser.email.split('@')[0],
                avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=6c63ff&color=fff`,
                bio: '光影分享社区的新成员',
                is_admin: this.currentUser.email === window.SUPABASE_CONFIG.adminEmail
            };

            const { data, error } = await this.supabase
                .from('profiles')
                .insert([profileData]);

            if (error) throw error;

            this.currentUser.profile = profileData;
            this.isAdmin = profileData.is_admin;
        } catch (error) {
            console.error('创建用户资料错误:', error);
        }
    }

    async signUp(email, password, username) {
        try {
            showLoading();
            
            // 注册新用户
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        username: username
                    }
                }
            });

            if (authError) throw authError;

            // 创建用户profile
            if (authData.user) {
                const profileData = {
                    id: authData.user.id,
                    username: username,
                    full_name: username,
                    avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=6c63ff&color=fff`,
                    bio: '光影分享社区的新成员',
                    is_admin: email === window.SUPABASE_CONFIG.adminEmail
                };

                const { error: profileError } = await this.supabase
                    .from('profiles')
                    .insert([profileData]);

                if (profileError) throw profileError;

                this.currentUser = authData.user;
                this.currentUser.profile = profileData;
                this.isAdmin = profileData.is_admin;

                hideLoading();
                showMessage('注册成功！请检查邮箱验证您的账户。', 'success');
                this.updateUIForLoggedInUser();
                return true;
            }
        } catch (error) {
            hideLoading();
            showMessage(error.message, 'error');
            return false;
        }
    }

    async signIn(email, password) {
        try {
            showLoading();
            
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            this.currentUser = data.user;
            await this.loadUserProfile();
            
            hideLoading();
            showMessage('登录成功！', 'success');
            this.updateUIForLoggedInUser();
            return true;
        } catch (error) {
            hideLoading();
            showMessage(error.message, 'error');
            return false;
        }
    }

    async signOut() {
        try {
            await this.supabase.auth.signOut();
            this.currentUser = null;
            this.isAdmin = false;
            this.updateUIForLoggedOutUser();
            showMessage('已退出登录', 'success');
        } catch (error) {
            console.error('退出登录错误:', error);
        }
    }

    async updateProfile(updates) {
        try {
            showLoading();
            
            const { error } = await this.supabase
                .from('profiles')
                .update(updates)
                .eq('id', this.currentUser.id);

            if (error) throw error;

            // 更新本地用户数据
            this.currentUser.profile = { ...this.currentUser.profile, ...updates };
            
            hideLoading();
            showMessage('资料更新成功！', 'success');
            return true;
        } catch (error) {
            hideLoading();
            showMessage(error.message, 'error');
            return false;
        }
    }

    async getUserById(userId) {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('获取用户错误:', error);
            return null;
        }
    }

    async searchUsers(query) {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
                .limit(20);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('搜索用户错误:', error);
            return [];
        }
    }

    updateUIForLoggedInUser() {
        const userMenu = document.getElementById('userMenu');
        const authModal = document.getElementById('authModal');
        
        if (this.currentUser && this.currentUser.profile) {
            userMenu.innerHTML = `
                <img src="${this.currentUser.profile.avatar_url}" 
                     alt="${this.currentUser.profile.username}" 
                     class="user-avatar" 
                     id="userAvatarBtn">
                <div class="user-dropdown" id="userDropdown">
                    <a href="#" class="dropdown-item" data-action="profile">
                        <i class="fas fa-user"></i> 我的资料
                    </a>
                    <a href="#upload" class="dropdown-item">
                        <i class="fas fa-cloud-upload-alt"></i> 上传照片
                    </a>
                    <a href="#" class="dropdown-item" data-action="settings">
                        <i class="fas fa-cog"></i> 设置
                    </a>
                    ${this.isAdmin ? `
                    <a href="#" class="dropdown-item" data-action="admin">
                        <i class="fas fa-shield-alt"></i> 管理面板
                    </a>
                    ` : ''}
                    <div class="dropdown-divider"></div>
                    <a href="#" class="dropdown-item" data-action="logout">
                        <i class="fas fa-sign-out-alt"></i> 退出登录
                    </a>
                </div>
            `;

            if (authModal) {
                authModal.style.display = 'none';
            }

            // 添加事件监听器
            setTimeout(() => {
                const userAvatarBtn = document.getElementById('userAvatarBtn');
                const userDropdown = document.getElementById('userDropdown');
                
                if (userAvatarBtn) {
                    userAvatarBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        userDropdown.classList.toggle('show');
                    });
                }

                // 点击其他地方关闭下拉菜单
                document.addEventListener('click', () => {
                    if (userDropdown) {
                        userDropdown.classList.remove('show');
                    }
                });

                // 下拉菜单项点击事件
                const dropdownItems = userDropdown.querySelectorAll('.dropdown-item');
                dropdownItems.forEach(item => {
                    item.addEventListener('click', (e) => {
                        const action = e.currentTarget.dataset.action;
                        if (action === 'logout') {
                            e.preventDefault();
                            this.signOut();
                        } else if (action === 'profile') {
                            e.preventDefault();
                            loadUserProfilePage(this.currentUser.id);
                        } else if (action === 'settings') {
                            e.preventDefault();
                            openSettingsModal();
                        } else if (action === 'admin') {
                            e.preventDefault();
                            openAdminPanel();
                        }
                    });
                });
            }, 100);
        }
    }

    updateUIForLoggedOutUser() {
        const userMenu = document.getElementById('userMenu');
        userMenu.innerHTML = `
            <button class="btn-secondary" id="loginBtnNav">登录/注册</button>
        `;

        // 添加登录按钮事件监听器
        setTimeout(() => {
            const loginBtnNav = document.getElementById('loginBtnNav');
            if (loginBtnNav) {
                loginBtnNav.addEventListener('click', () => {
                    openAuthModal();
                });
            }
        }, 100);
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// 全局认证管理器实例
let authManager;

// 初始化认证管理器
document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
});

// 工具函数
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('active');
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('active');
}

function showMessage(message, type = 'info') {
    // 移除之前的消息
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    // 3秒后移除
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                document.body.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}

function openAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.style.display = 'block';
    }
}

function closeAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.style.display = 'none';
    }
}

// 暴露全局函数
window.authManager = authManager;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.showMessage = showMessage;