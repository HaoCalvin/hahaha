// 认证功能模块
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.init();
    }
    
    // 初始化认证模块
    async init() {
        // 检查当前会话
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            this.currentUser = session.user;
            this.checkAdminStatus();
            this.updateUI();
        }
        
        // 监听认证状态变化
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                this.currentUser = session.user;
                this.checkAdminStatus();
                this.updateUI();
                this.showToast('登录成功', 'success');
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.isAdmin = false;
                this.updateUI();
            }
        });
    }
    
    // 检查是否为管理员
    checkAdminStatus() {
        if (this.currentUser && this.currentUser.email === ADMIN_EMAIL) {
            this.isAdmin = true;
        } else {
            this.isAdmin = false;
        }
    }
    
    // 更新UI显示
    updateUI() {
        const authButtons = document.getElementById('auth-buttons');
        const userMenu = document.getElementById('user-menu');
        const userInfo = document.getElementById('user-info');
        
        if (this.currentUser) {
            // 用户已登录
            authButtons.style.display = 'none';
            userMenu.style.display = 'block';
            
            // 更新用户信息
            const userName = this.currentUser.user_metadata?.username || this.currentUser.email?.split('@')[0] || '用户';
            const userEmail = this.currentUser.email || '';
            
            userInfo.innerHTML = `
                <div class="user-name">${userName}</div>
                <div class="user-email">${userEmail}</div>
            `;
            
            // 更新头像
            const userAvatar = document.getElementById('user-avatar');
            userAvatar.innerHTML = `<i class="fas fa-user-circle"></i>`;
            
            // 显示管理员标识
            if (this.isAdmin) {
                userInfo.innerHTML += '<div class="admin-badge">管理员</div>';
            }
        } else {
            // 用户未登录
            authButtons.style.display = 'flex';
            userMenu.style.display = 'none';
        }
    }
    
    // 注册新用户
    async register(username, email, password) {
        try {
            this.showLoading(true);
            
            // 注册用户
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username
                    }
                }
            });
            
            if (error) throw error;
            
            // 创建用户配置文件
            if (data.user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        { 
                            id: data.user.id, 
                            username, 
                            email,
                            created_at: new Date().toISOString()
                        }
                    ]);
                
                if (profileError) {
                    console.error('创建用户配置文件失败:', profileError);
                }
            }
            
            this.showToast('注册成功！请检查您的邮箱以验证账户。', 'success');
            return { success: true };
        } catch (error) {
            console.error('注册失败:', error);
            this.showToast(`注册失败: ${error.message}`, 'error');
            return { success: false, error };
        } finally {
            this.showLoading(false);
        }
    }
    
    // 登录
    async login(identifier, password) {
        try {
            this.showLoading(true);
            
            // 检查identifier是邮箱还是用户名
            let email = identifier;
            
            // 如果是用户名，需要先查找对应的邮箱
            if (!identifier.includes('@')) {
                const { data: profiles, error: profileError } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('username', identifier)
                    .single();
                
                if (profileError || !profiles) {
                    throw new Error('用户名或密码错误');
                }
                
                email = profiles.email;
            }
            
            // 使用邮箱登录
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            
            this.showToast('登录成功！', 'success');
            return { success: true };
        } catch (error) {
            console.error('登录失败:', error);
            this.showToast(`登录失败: ${error.message}`, 'error');
            return { success: false, error };
        } finally {
            this.showLoading(false);
        }
    }
    
    // 退出登录
    async logout() {
        try {
            this.showLoading(true);
            const { error } = await supabase.auth.signOut();
            
            if (error) throw error;
            
            this.showToast('已退出登录', 'success');
            return { success: true };
        } catch (error) {
            console.error('退出登录失败:', error);
            this.showToast(`退出登录失败: ${error.message}`, 'error');
            return { success: false, error };
        } finally {
            this.showLoading(false);
        }
    }
    
    // 获取当前用户信息
    getCurrentUser() {
        return this.currentUser;
    }
    
    // 检查是否已登录
    isLoggedIn() {
        return !!this.currentUser;
    }
    
    // 检查是否为管理员
    isUserAdmin() {
        return this.isAdmin;
    }
    
    // 显示加载动画
    showLoading(show) {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (show) {
            loadingOverlay.classList.add('active');
        } else {
            loadingOverlay.classList.remove('active');
        }
    }
    
    // 显示消息提示
    showToast(message, type = 'info', duration = 5000) {
        const toastContainer = document.getElementById('toast-container');
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <div class="toast-content">
                <div class="toast-title">${type === 'success' ? '成功' : type === 'error' ? '错误' : type === 'warning' ? '警告' : '信息'}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
        `;
        
        toastContainer.appendChild(toast);
        
        // 自动移除提示
        setTimeout(() => {
            toast.remove();
        }, duration);
        
        // 点击关闭
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
    }
}

// 创建全局认证管理器实例
window.authManager = new AuthManager();