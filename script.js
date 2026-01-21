// 主脚本 - 整合所有功能
document.addEventListener('DOMContentLoaded', function() {
    // 初始化各个管理器
    if (!window.authManager) window.authManager = new AuthManager();
    if (!window.uploadManager) window.uploadManager = new UploadManager();
    if (!window.galleryManager) window.galleryManager = new GalleryManager();
    if (!window.commentsManager) window.commentsManager = new CommentsManager();
    if (!window.adminManager) window.adminManager = new AdminManager();
    if (!window.userProfileManager) window.userProfileManager = new UserProfileManager();
    
    // 导航菜单切换
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
    
    // 导航链接点击
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 获取目标部分ID
            const targetId = this.id.replace('-link', '-section');
            const targetSection = document.getElementById(targetId);
            
            if (!targetSection) return;
            
            // 隐藏所有部分
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
                section.style.display = 'none';
            });
            
            // 显示目标部分
            targetSection.classList.add('active');
            targetSection.style.display = 'block';
            
            // 如果是首页，刷新照片
            if (targetId === 'home-section') {
                galleryManager.refreshPhotos();
            }
            
            // 关闭移动端菜单
            if (navMenu) {
                navMenu.classList.remove('active');
            }
        });
    });
    
    // 登录/注册模态框
    const authModal = document.getElementById('auth-modal');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const authModalClose = document.getElementById('auth-modal-close');
    
    // 显示登录模态框
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            showAuthModal('login');
        });
    }
    
    // 显示注册模态框
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            showAuthModal('register');
        });
    }
    
    // 关闭模态框
    if (authModalClose) {
        authModalClose.addEventListener('click', () => {
            authModal.classList.remove('active');
        });
    }
    
    // 点击模态框外部关闭
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.classList.remove('active');
        }
    });
    
    // 切换登录/注册标签
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');
    
    if (loginTab && registerTab) {
        loginTab.addEventListener('click', () => {
            switchAuthTab('login');
        });
        
        registerTab.addEventListener('click', () => {
            switchAuthTab('register');
        });
    }
    
    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            switchAuthTab('register');
        });
    }
    
    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            switchAuthTab('login');
        });
    }
    
    // 登录表单提交
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value.trim();
            
            if (!email || !password) {
                authManager.showToast('请填写所有字段', 'error');
                return;
            }
            
            const result = await authManager.login(email, password);
            
            if (result.success) {
                authModal.classList.remove('active');
                loginForm.reset();
            }
        });
    }
    
    // 注册表单提交
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('register-username').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value.trim();
            const confirmPassword = document.getElementById('confirm-password').value.trim();
            
            // 验证表单
            if (!username || !email || !password || !confirmPassword) {
                authManager.showToast('请填写所有字段', 'error');
                return;
            }
            
            if (password.length < 6) {
                authManager.showToast('密码长度至少为6位', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                authManager.showToast('两次输入的密码不一致', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                authManager.showToast('请输入有效的邮箱地址', 'error');
                return;
            }
            
            const result = await authManager.register(username, email, password);
            
            if (result.success) {
                authModal.classList.remove('active');
                registerForm.reset();
                switchAuthTab('login');
            }
        });
    }
    
    // 退出登录
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await authManager.logout();
            galleryManager.showHomeSection();
        });
    }
    
    // 辅助函数：显示认证模态框
    function showAuthModal(tab = 'login') {
        authModal.classList.add('active');
        switchAuthTab(tab);
    }
    
    // 辅助函数：切换认证标签
    function switchAuthTab(tab) {
        if (tab === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.classList.add('active');
            registerForm.classList.remove('active');
            document.getElementById('auth-modal-title').textContent = '登录到光影分享';
        } else {
            loginTab.classList.remove('active');
            registerTab.classList.add('active');
            loginForm.classList.remove('active');
            registerForm.classList.add('active');
            document.getElementById('auth-modal-title').textContent = '注册光影分享账号';
        }
    }
    
    // 辅助函数：验证邮箱格式
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // 初始化应用
    console.log('照片分享网站已初始化');
    
    // 检查Supabase连接
    checkSupabaseConnection();
    
    // 预加载字体图标
    preloadIcons();
});

// 检查Supabase连接
async function checkSupabaseConnection() {
    try {
        const { data, error } = await supabase.from('photos').select('id').limit(1);
        
        if (error) {
            console.error('Supabase连接失败:', error);
            authManager.showToast('无法连接到服务器，部分功能可能不可用', 'warning');
        } else {
            console.log('Supabase连接成功');
        }
    } catch (error) {
        console.error('检查连接失败:', error);
    }
}

// 预加载字体图标
function preloadIcons() {
    // 创建隐藏的图标元素以确保字体被加载
    const iconContainer = document.createElement('div');
    iconContainer.style.cssText = 'position: absolute; opacity: 0; width: 0; height: 0; overflow: hidden;';
    iconContainer.innerHTML = `
        <i class="fas fa-camera"></i>
        <i class="fas fa-user"></i>
        <i class="fas fa-search"></i>
        <i class="fas fa-home"></i>
        <i class="fas fa-cloud-upload-alt"></i>
        <i class="fas fa-comment"></i>
        <i class="fas fa-images"></i>
        <i class="fas fa-user-circle"></i>
        <i class="fas fa-sign-in-alt"></i>
        <i class="fas fa-user-plus"></i>
        <i class="fas fa-sign-out-alt"></i>
        <i class="fas fa-trash"></i>
        <i class="fas fa-check-circle"></i>
        <i class="fas fa-exclamation-circle"></i>
        <i class="fas fa-exclamation-triangle"></i>
        <i class="fas fa-info-circle"></i>
    `;
    document.body.appendChild(iconContainer);
}

// 全局错误处理
window.addEventListener('error', function(event) {
    console.error('全局错误:', event.error);
});

// 未处理的Promise拒绝
window.addEventListener('unhandledrejection', function(event) {
    console.error('未处理的Promise拒绝:', event.reason);
});

// 导出全局变量
window.supabase = supabase;