/**
 * 用户认证管理模块
 * 处理注册、登录、会话管理和用户资料
 */

// 当前用户状态
let currentUser = null;
let currentProfile = null;
let authStateListeners = [];

// 初始化认证系统
async function initAuthSystem() {
    console.log('正在初始化认证系统...');
    
    try {
        // 检查现有会话
        await checkCurrentSession();
        
        // 设置认证状态监听
        setupAuthStateListener();
        
        // 设置自动刷新令牌
        setupTokenRefresh();
        
        console.log('认证系统初始化完成');
    } catch (error) {
        console.error('认证系统初始化失败:', error);
    }
}

// 检查当前会话
async function checkCurrentSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('获取会话错误:', error);
            setAuthState(null, null);
            return;
        }
        
        if (session) {
            console.log('发现现有会话，用户ID:', session.user.id);
            await handleUserSession(session.user);
        } else {
            console.log('没有发现会话，用户未登录');
            setAuthState(null, null);
        }
    } catch (error) {
        console.error('检查会话错误:', error);
        setAuthState(null, null);
    }
}

// 处理用户会话
async function handleUserSession(user) {
    try {
        currentUser = user;
        
        // 加载用户资料
        await loadUserProfile();
        
        // 设置认证状态
        setAuthState(user, currentProfile);
        
        console.log('用户会话处理完成:', user.id);
    } catch (error) {
        console.error('处理用户会话错误:', error);
        setAuthState(null, null);
    }
}

// 加载用户资料
async function loadUserProfile() {
    if (!currentUser) {
        currentProfile = null;
        return null;
    }
    
    try {
        // 尝试从profiles表获取资料
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (error) {
            // 如果资料不存在，创建新资料
            if (error.code === 'PGRST116') { // 未找到
                console.log('用户资料不存在，正在创建...');
                currentProfile = await createUserProfile();
            } else {
                console.error('加载用户资料错误:', error);
                currentProfile = null;
            }
        } else {
            currentProfile = profile;
        }
        
        return currentProfile;
    } catch (error) {
        console.error('加载用户资料过程错误:', error);
        currentProfile = null;
        return null;
    }
}

// 创建用户资料
async function createUserProfile() {
    if (!currentUser) {
        throw new Error('用户未登录，无法创建资料');
    }
    
    try {
        // 从用户元数据或邮箱获取用户名
        const username = currentUser.user_metadata?.username || 
                        currentUser.email?.split('@')[0] || 
                        `user_${currentUser.id.substring(0, 8)}`;
        
        // 清理用户名（移除特殊字符）
        const cleanUsername = username.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 20);
        
        // 生成头像URL
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanUsername)}&background=bb86fc&color=fff&size=256`;
        
        // 创建资料记录
        const profileData = {
            id: currentUser.id,
            username: cleanUsername,
            email: currentUser.email,
            avatar_url: avatarUrl,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabaseClient
            .from('profiles')
            .insert([profileData])
            .select()
            .single();
        
        if (error) {
            // 如果用户名冲突，尝试其他用户名
            if (error.code === '23505') { // 唯一约束违反
                const uniqueUsername = `${cleanUsername}_${currentUser.id.substring(0, 4)}`;
                profileData.username = uniqueUsername;
                
                const { data: retryData, error: retryError } = await supabaseClient
                    .from('profiles')
                    .insert([profileData])
                    .select()
                    .single();
                
                if (retryError) throw retryError;
                
                console.log('用户资料创建成功（使用唯一用户名）:', uniqueUsername);
                return retryData;
            }
            throw error;
        }
        
        console.log('用户资料创建成功:', cleanUsername);
        return data;
    } catch (error) {
        console.error('创建用户资料错误:', error);
        throw error;
    }
}

// 用户注册
async function registerUser(userData) {
    try {
        const { username, email, password } = userData;
        
        // 验证输入
        if (!username || username.length < 3) {
            throw new Error('用户名至少需要3个字符');
        }
        
        if (!email || !isValidEmail(email)) {
            throw new Error('请输入有效的邮箱地址');
        }
        
        if (!password || password.length < 6) {
            throw new Error('密码至少需要6个字符');
        }
        
        // 清理用户名
        const cleanUsername = username.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 20);
        
        // 检查用户名是否已存在
        const { data: existingUser } = await supabaseClient
            .from('profiles')
            .select('username')
            .eq('username', cleanUsername)
            .single();
        
        if (existingUser) {
            throw new Error('用户名已被使用，请选择其他用户名');
        }
        
        // 注册新用户
        const { data, error } = await supabaseClient.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
                data: {
                    username: cleanUsername,
                    created_at: new Date().toISOString()
                }
            }
        });
        
        if (error) {
            console.error('注册错误:', error);
            
            if (error.message.includes('User already registered')) {
                throw new Error('邮箱已被注册');
            } else if (error.message.includes('Password should be at least')) {
                throw new Error('密码太短');
            } else {
                throw new Error(error.message);
            }
        }
        
        console.log('用户注册成功:', data.user.id);
        
        // 如果自动登录，处理会话
        if (data.session) {
            await handleUserSession(data.user);
        }
        
        return {
            success: true,
            user: data.user,
            message: '注册成功！请检查您的邮箱以验证账户。'
        };
    } catch (error) {
        console.error('注册过程错误:', error);
        throw error;
    }
}

// 用户登录
async function loginUser(credentials) {
    try {
        const { identifier, password } = credentials;
        
        // 验证输入
        if (!identifier || !password) {
            throw new Error('请输入用户名/邮箱和密码');
        }
        
        let email = identifier;
        
        // 如果标识符不包含@，尝试查找用户名对应的邮箱
        if (!identifier.includes('@')) {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('email')
                .eq('username', identifier)
                .single();
            
            if (!profile) {
                throw new Error('用户不存在');
            }
            
            email = profile.email;
        }
        
        // 执行登录
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });
        
        if (error) {
            console.error('登录错误:', error);
            
            if (error.message.includes('Invalid login credentials')) {
                throw new Error('用户名或密码错误');
            } else if (error.message.includes('Email not confirmed')) {
                throw new Error('邮箱未验证，请先验证您的邮箱');
            } else {
                throw new Error(error.message);
            }
        }
        
        console.log('用户登录成功:', data.user.id);
        
        // 处理会话
        await handleUserSession(data.user);
        
        return {
            success: true,
            user: data.user,
            session: data.session
        };
    } catch (error) {
        console.error('登录过程错误:', error);
        throw error;
    }
}

// 邮箱登录
async function loginWithEmail(email, password) {
    return loginUser({ identifier: email, password });
}

// 用户名登录
async function loginWithUsername(username, password) {
    return loginUser({ identifier: username, password });
}

// 用户退出登录
async function logoutUser() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        
        if (error) throw error;
        
        // 清除本地状态
        currentUser = null;
        currentProfile = null;
        
        // 通知监听器
        setAuthState(null, null);
        
        console.log('用户退出登录成功');
        
        return { success: true };
    } catch (error) {
        console.error('退出登录错误:', error);
        throw error;
    }
}

// 设置认证状态监听
function setupAuthStateListener() {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log('认证状态变化:', event, session?.user?.id);
        
        switch (event) {
            case 'SIGNED_IN':
                if (session) {
                    await handleUserSession(session.user);
                    showNotification('登录成功！', 'success');
                }
                break;
                
            case 'SIGNED_OUT':
                currentUser = null;
                currentProfile = null;
                setAuthState(null, null);
                showNotification('已退出登录', 'info');
                break;
                
            case 'USER_UPDATED':
                if (session) {
                    currentUser = session.user;
                    setAuthState(currentUser, currentProfile);
                }
                break;
                
            case 'TOKEN_REFRESHED':
                console.log('令牌已刷新');
                break;
                
            case 'PASSWORD_RECOVERY':
                console.log('密码恢复流程');
                break;
        }
    });
}

// 设置令牌自动刷新
function setupTokenRefresh() {
    // 每5分钟检查一次令牌
    setInterval(async () => {
        if (currentUser) {
            try {
                const { data: { session }, error } = await supabaseClient.auth.getSession();
                
                if (error) {
                    console.error('刷新令牌检查错误:', error);
                } else if (session) {
                    // 检查令牌是否快要过期（剩余时间小于5分钟）
                    const expiresAt = new Date(session.expires_at).getTime();
                    const now = Date.now();
                    const timeLeft = expiresAt - now;
                    
                    if (timeLeft < 5 * 60 * 1000) {
                        console.log('令牌即将过期，正在刷新...');
                        await supabaseClient.auth.refreshSession();
                    }
                }
            } catch (error) {
                console.error('令牌刷新错误:', error);
            }
        }
    }, 5 * 60 * 1000); // 5分钟
}

// 设置认证状态
function setAuthState(user, profile) {
    currentUser = user;
    currentProfile = profile;
    
    // 通知所有监听器
    authStateListeners.forEach(listener => {
        try {
            listener(user, profile);
        } catch (error) {
            console.error('认证状态监听器错误:', error);
        }
    });
    
    // 更新UI
    updateAuthUI();
}

// 更新认证UI
function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const uploadLink = document.getElementById('uploadLink');
    
    if (currentUser) {
        // 用户已登录
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (uploadLink) uploadLink.style.display = 'block';
        
        // 更新用户信息
        updateUserInfo();
    } else {
        // 用户未登录
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
        if (uploadLink) uploadLink.style.display = 'none';
    }
}

// 更新用户信息
function updateUserInfo() {
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const profileAvatar = document.getElementById('profileAvatar');
    const profileUsername = document.getElementById('profileUsername');
    
    if (currentProfile) {
        // 更新导航栏用户信息
        if (userAvatar) {
            userAvatar.src = currentProfile.avatar_url || 
                           `https://ui-avatars.com/api/?name=${encodeURIComponent(currentProfile.username)}&background=bb86fc&color=fff`;
        }
        
        if (userName) {
            userName.textContent = currentProfile.username || '用户';
        }
        
        // 更新个人主页信息（如果打开）
        if (profileAvatar && profileAvatar.src.includes('ui-avatars.com')) {
            profileAvatar.src = currentProfile.avatar_url || 
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(currentProfile.username)}&background=bb86fc&color=fff`;
        }
        
        if (profileUsername && !profileUsername.textContent) {
            profileUsername.textContent = currentProfile.username || '用户';
        }
    }
}

// 获取当前用户
function getCurrentUser() {
    return currentUser;
}

// 获取当前用户资料
function getCurrentProfile() {
    return currentProfile;
}

// 检查是否登录
function isAuthenticated() {
    return !!currentUser;
}

// 添加认证状态监听器
function addAuthStateListener(listener) {
    if (typeof listener === 'function') {
        authStateListeners.push(listener);
        
        // 立即调用一次以获取当前状态
        try {
            listener(currentUser, currentProfile);
        } catch (error) {
            console.error('初始认证状态监听器错误:', error);
        }
    }
}

// 移除认证状态监听器
function removeAuthStateListener(listener) {
    const index = authStateListeners.indexOf(listener);
    if (index > -1) {
        authStateListeners.splice(index, 1);
    }
}

// 更新用户资料
async function updateUserProfile(updates) {
    if (!currentUser) {
        throw new Error('用户未登录');
    }
    
    try {
        // 如果更新用户名，检查是否重复
        if (updates.username) {
            const { data: existingUser } = await supabaseClient
                .from('profiles')
                .select('username')
                .eq('username', updates.username)
                .neq('id', currentUser.id)
                .single();
            
            if (existingUser) {
                throw new Error('用户名已被使用');
            }
        }
        
        const { data, error } = await supabaseClient
            .from('profiles')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentUser.id)
            .select()
            .single();
        
        if (error) throw error;
        
        // 更新本地状态
        currentProfile = data;
        
        // 通知监听器
        setAuthState(currentUser, currentProfile);
        
        // 显示成功消息
        showNotification('资料更新成功', 'success');
        
        return data;
    } catch (error) {
        console.error('更新用户资料错误:', error);
        throw error;
    }
}

// 更新用户头像
async function updateUserAvatar(avatarUrl) {
    if (!currentUser) {
        throw new Error('用户未登录');
    }
    
    try {
        return await updateUserProfile({ avatar_url: avatarUrl });
    } catch (error) {
        console.error('更新用户头像错误:', error);
        throw error;
    }
}

// 发送密码重置邮件
async function resetPassword(email) {
    try {
        if (!email || !isValidEmail(email)) {
            throw new Error('请输入有效的邮箱地址');
        }
        
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`
        });
        
        if (error) throw error;
        
        return {
            success: true,
            message: '密码重置邮件已发送，请检查您的邮箱。'
        };
    } catch (error) {
        console.error('发送密码重置邮件错误:', error);
        throw error;
    }
}

// 更新密码
async function updatePassword(newPassword) {
    try {
        if (!newPassword || newPassword.length < 6) {
            throw new Error('密码至少需要6个字符');
        }
        
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });
        
        if (error) throw error;
        
        showNotification('密码更新成功', 'success');
        
        return { success: true };
    } catch (error) {
        console.error('更新密码错误:', error);
        throw error;
    }
}

// 验证邮箱格式
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 显示通知
function showNotification(message, type = 'info') {
    // 这里可以集成一个通知系统
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // 简单实现：使用alert或console
    if (type === 'error') {
        console.error(message);
    } else if (type === 'success') {
        console.log(message);
    }
    
    // 在实际应用中，这里应该更新UI显示通知
    if (window.showNotification) {
        window.showNotification(message, type);
    }
}

// 导出函数
window.auth = {
    // 初始化
    init: initAuthSystem,
    
    // 用户操作
    register: registerUser,
    login: loginUser,
    loginWithEmail,
    loginWithUsername,
    logout: logoutUser,
    
    // 用户资料
    getCurrentUser,
    getCurrentProfile,
    updateProfile: updateUserProfile,
    updateAvatar: updateUserAvatar,
    
    // 状态检查
    isAuthenticated,
    
    // 监听器
    addAuthStateListener,
    removeAuthStateListener,
    
    // 密码管理
    resetPassword,
    updatePassword,
    
    // 工具函数
    isValidEmail
};

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    // 延迟初始化，确保其他模块先加载
    setTimeout(() => {
        initAuthSystem();
    }, 1000);
});

console.log('认证模块完整加载完成');