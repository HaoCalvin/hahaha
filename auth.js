// 认证模块
import { supabase, ADMIN_EMAIL } from './config.js';
import { showNotification, showLoading, hideLoading, validateEmail, validatePassword } from './utils.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            // 检查现有会话
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (session && session.user) {
                this.currentUser = session.user;
                await this.ensureUserProfile(session.user);
                this.isInitialized = true;
            }
            
            // 监听认证状态变化
            supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    this.currentUser = session.user;
                    await this.ensureUserProfile(session.user);
                    this.dispatchAuthChange();
                } else if (event === 'SIGNED_OUT') {
                    this.currentUser = null;
                    this.dispatchAuthChange();
                }
            });
            
        } catch (error) {
            console.error('认证初始化失败:', error);
        }
    }

    async ensureUserProfile(user) {
        try {
            // 检查用户资料是否存在
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            if (error && error.code === 'PGRST116') {
                // 用户资料不存在，创建新资料
                const username = await this.generateUsername(user.email);
                
                const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert({
                        id: user.id,
                        username: username,
                        full_name: user.user_metadata?.full_name || '',
                        avatar_url: user.user_metadata?.avatar_url || '',
                        is_admin: user.email === ADMIN_EMAIL, // 设置管理员
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single();
                
                if (createError) throw createError;
                return newProfile;
            }
            
            if (error) throw error;
            
            return profile;
            
        } catch (error) {
            console.error('确保用户资料失败:', error);
            return null;
        }
    }

    async generateUsername(email) {
        // 从邮箱生成用户名
        const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        
        // 检查用户名是否已存在
        let username = baseUsername;
        let counter = 1;
        
        while (true) {
            const { data, error } = await supabase
                .from('profiles')
                .select('username')
                .eq('username', username)
                .single();
            
            if (error && error.code === 'PGRST116') {
                // 用户名可用
                return username;
            }
            
            // 用户名已存在，添加数字后缀
            username = `${baseUsername}${counter}`;
            counter++;
            
            if (counter > 100) {
                // 生成随机用户名
                return `user_${Math.random().toString(36).substring(2, 10)}`;
            }
        }
    }

    async signUp(email, password, username, fullName = '') {
        try {
            showLoading();
            
            // 验证输入
            if (!validateEmail(email)) {
                throw new Error('请输入有效的邮箱地址');
            }
            
            if (!validatePassword(password)) {
                throw new Error('密码至少需要6个字符');
            }
            
            if (!username || username.length < 3) {
                throw new Error('用户名至少需要3个字符');
            }
            
            if (username.length > 20) {
                throw new Error('用户名不能超过20个字符');
            }
            
            // 检查用户名是否已存在
            const { data: existingUser } = await supabase
                .from('profiles')
                .select('username')
                .eq('username', username)
                .single();
            
            if (existingUser) {
                throw new Error('用户名已存在，请选择其他用户名');
            }
            
            // 注册用户
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username,
                        full_name: fullName
                    }
                }
            });
            
            if (authError) throw authError;
            
            // 等待用户资料创建
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            hideLoading();
            showNotification('注册成功！请检查您的邮箱以验证账户', 'success');
            
            return authData.user;
            
        } catch (error) {
            hideLoading();
            console.error('注册失败:', error);
            showNotification(error.message || '注册失败，请重试', 'error');
            throw error;
        }
    }

    async signIn(email, password) {
        try {
            showLoading();
            
            if (!validateEmail(email)) {
                throw new Error('请输入有效的邮箱地址');
            }
            
            if (!password || password.length < 6) {
                throw new Error('密码不能为空');
            }
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            
            hideLoading();
            showNotification('登录成功！', 'success');
            
            return data.user;
            
        } catch (error) {
            hideLoading();
            console.error('登录失败:', error);
            
            let errorMessage = '登录失败，请检查邮箱和密码';
            if (error.message.includes('Invalid login credentials')) {
                errorMessage = '邮箱或密码错误';
            } else if (error.message.includes('Email not confirmed')) {
                errorMessage = '邮箱未验证，请先验证您的邮箱';
            }
            
            showNotification(errorMessage, 'error');
            throw error;
        }
    }

    async signInWithProvider(provider) {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth-callback.html`
                }
            });
            
            if (error) throw error;
            
        } catch (error) {
            console.error(`${provider}登录失败:`, error);
            showNotification(`${provider}登录失败，请重试`, 'error');
            throw error;
        }
    }

    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            
            if (error) throw error;
            
            this.currentUser = null;
            showNotification('已成功退出登录', 'success');
            
        } catch (error) {
            console.error('退出登录失败:', error);
            showNotification('退出登录失败，请重试', 'error');
            throw error;
        }
    }

    async resetPassword(email) {
        try {
            showLoading();
            
            if (!validateEmail(email)) {
                throw new Error('请输入有效的邮箱地址');
            }
            
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });
            
            if (error) throw error;
            
            hideLoading();
            showNotification('密码重置链接已发送到您的邮箱', 'success');
            
        } catch (error) {
            hideLoading();
            console.error('发送重置密码邮件失败:', error);
            showNotification('发送重置密码邮件失败，请重试', 'error');
            throw error;
        }
    }

    async updatePassword(newPassword) {
        try {
            showLoading();
            
            if (!validatePassword(newPassword)) {
                throw new Error('密码至少需要6个字符');
            }
            
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });
            
            if (error) throw error;
            
            hideLoading();
            showNotification('密码更新成功', 'success');
            
        } catch (error) {
            hideLoading();
            console.error('更新密码失败:', error);
            showNotification('更新密码失败，请重试', 'error');
            throw error;
        }
    }

    async updateProfile(updates) {
        try {
            if (!this.currentUser) {
                throw new Error('用户未登录');
            }
            
            const { data, error } = await supabase
                .from('profiles')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentUser.id)
                .select()
                .single();
            
            if (error) throw error;
            
            // 更新本地用户数据
            this.currentUser.profile = data;
            
            showNotification('个人资料更新成功', 'success');
            
            return data;
            
        } catch (error) {
            console.error('更新个人资料失败:', error);
            showNotification('更新个人资料失败，请重试', 'error');
            throw error;
        }
    }

    async getUserProfile(userId = null) {
        try {
            const targetUserId = userId || this.currentUser?.id;
            
            if (!targetUserId) {
                return null;
            }
            
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    photos!user_id (id),
                    followers:follows!following_id (follower_id),
                    following:follows!follower_id (following_id)
                `)
                .eq('id', targetUserId)
                .single();
            
            if (error) throw error;
            
            // 计算关注者/关注数量
            const profile = {
                ...data,
                followers_count: data.followers?.length || 0,
                following_count: data.following?.length || 0,
                photos_count: data.photos?.length || 0
            };
            
            return profile;
            
        } catch (error) {
            console.error('获取用户资料失败:', error);
            return null;
        }
    }

    async checkUsernameAvailability(username) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('username')
                .eq('username', username)
                .single();
            
            // 如果没有找到记录，用户名可用
            if (error && error.code === 'PGRST116') {
                return true;
            }
            
            // 如果是当前用户自己的用户名，也认为是可用的
            if (this.currentUser && data && data.username === this.currentUser.profile?.username) {
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('检查用户名可用性失败:', error);
            return false;
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    isAdmin() {
        return this.currentUser?.profile?.is_admin || false;
    }

    dispatchAuthChange() {
        const event = new CustomEvent('authChange', {
            detail: { user: this.currentUser }
        });
        window.dispatchEvent(event);
    }

    // 监听认证状态变化
    onAuthChange(callback) {
        window.addEventListener('authChange', (event) => {
            callback(event.detail.user);
        });
    }
}

// 创建全局认证管理器实例
const authManager = new AuthManager();

// 绑定UI事件
function bindAuthUIEvents() {
    // 登录表单
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const rememberMe = document.getElementById('remember-me')?.checked || false;
            
            try {
                const user = await authManager.signIn(email, password);
                if (user) {
                    // 关闭模态框
                    closeAuthModals();
                    // 重新加载页面或更新UI
                    window.location.reload();
                }
            } catch (error) {
                // 错误已经在signIn方法中处理
            }
        });
    }
    
    // 注册表单
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('signup-username').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;
            
            if (password !== confirmPassword) {
                showNotification('两次输入的密码不一致', 'error');
                return;
            }
            
            try {
                const user = await authManager.signUp(email, password, username);
                if (user) {
                    closeAuthModals();
                    showNotification('注册成功！请检查您的邮箱以验证账户', 'success');
                }
            } catch (error) {
                // 错误已经在signUp方法中处理
            }
        });
    }
    
    // 忘记密码表单
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('reset-email').value;
            
            try {
                await authManager.resetPassword(email);
                closeAuthModals();
            } catch (error) {
                // 错误已经在resetPassword方法中处理
            }
        });
    }
    
    // 社交登录按钮
    const googleLoginBtn = document.getElementById('google-login');
    const googleSignupBtn = document.getElementById('google-signup');
    const facebookLoginBtn = document.getElementById('facebook-login');
    const facebookSignupBtn = document.getElementById('facebook-signup');
    const githubLoginBtn = document.getElementById('github-login');
    const githubSignupBtn = document.getElementById('github-signup');
    
    [googleLoginBtn, googleSignupBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => authManager.signInWithProvider('google'));
        }
    });
    
    [facebookLoginBtn, facebookSignupBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => authManager.signInWithProvider('facebook'));
        }
    });
    
    [githubLoginBtn, githubSignupBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => authManager.signInWithProvider('github'));
        }
    });
    
    // 密码显示/隐藏切换
    const passwordToggles = document.querySelectorAll('.password-toggle i');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.closest('.form-group').querySelector('input');
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });
}

function closeAuthModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = '';
}

// 检查认证状态
function checkAuth() {
    return authManager.isAuthenticated();
}

// 获取用户资料
function getUserProfile(userId) {
    return authManager.getUserProfile(userId);
}

// 页面加载时绑定UI事件
document.addEventListener('DOMContentLoaded', bindAuthUIEvents);

export { 
    authManager, 
    checkAuth, 
    getUserProfile,
    signUp: authManager.signUp.bind(authManager),
    signIn: authManager.signIn.bind(authManager),
    signOut: authManager.signOut.bind(authManager),
    resetPassword: authManager.resetPassword.bind(authManager),
    updateProfile: authManager.updateProfile.bind(authManager)
};