// 通用工具函数 - 提前全局挂载所有函数，防止app.js调用报错
/**
 * 懒加载图片初始化
 */
function initLazyLoad() {
  const lazyImages = document.querySelectorAll('.lazy-load');
  const lazyLoadObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src || img.src;
        img.classList.add('lazy-load-loaded');
        lazyLoadObserver.unobserve(img);
      }
    });
  }, { rootMargin: '200px 0px' });

  lazyImages.forEach(img => lazyLoadObserver.observe(img));
}

/**
 * 导航栏滚动效果
 */
function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('bg-white/95', 'dark:bg-gray-800/95', 'shadow-sm');
    } else {
      navbar.classList.remove('bg-white/95', 'dark:bg-gray-800/95', 'shadow-sm');
    }
  });
}

/**
 * 初始化所有事件监听（核心：修复登录/注册按钮绑定）
 */
function initEventListeners() {
  // 登录按钮核心绑定
  bindLoginCore();
  // 主题切换
  bindThemeButtons();
  // 模态框关闭
  bindModalClose();
  // 导航链接
  bindNavLinks();
  // 所有表单提交
  bindFormSubmits();
  // 搜索按钮
  bindSearchButtons();
  // 我的照片筛选
  bindMyPhotosFilter();
  // 头像上传
  bindAvatarUpload();
  // 回车搜索
  bindEnterSearch();
}

/**
 * 核心：登录/注册按钮绑定（修复无响应）
 */
function bindLoginCore() {
  // 我的页面登录按钮
  document.getElementById('login-btn').addEventListener('click', () => {
    document.getElementById('login-modal').classList.remove('hidden');
  });
  // 登录/注册互转
  document.getElementById('to-register-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('register-modal').classList.remove('hidden');
  });
  document.getElementById('to-login-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-modal').classList.add('hidden');
    document.getElementById('login-modal').classList.remove('hidden');
  });
  // 忘记密码链接
  document.getElementById('forgot-password-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('forgot-password-modal').classList.remove('hidden');
  });
}

/**
 * 主题切换按钮绑定
 */
function bindThemeButtons() {
  // 电脑端
  document.getElementById('light-mode').addEventListener('click', () => window.switchTheme('light'));
  document.getElementById('dark-mode').addEventListener('click', () => window.switchTheme('dark'));
  // 手机端
  document.getElementById('mobile-light-mode').addEventListener('click', () => window.switchTheme('light'));
  document.getElementById('mobile-dark-mode').addEventListener('click', () => window.switchTheme('dark'));
}

/**
 * 模态框关闭绑定
 */
function bindModalClose() {
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => window.hideAllModals());
  });
  // 点击外部关闭模态框
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-close') || e.target.id.endsWith('-modal')) {
      window.hideAllModals();
    }
  });
  // 按ESC关闭
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.hideAllModals();
  });
}

/**
 * 导航链接绑定
 */
function bindNavLinks() {
  // 导航链接切换页面
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = e.target.getAttribute('href').slice(1);
      window.showContentSection(id);
      document.getElementById('mobile-menu').classList.add('hidden');
    });
  });
  // 手机菜单开关
  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.getElementById('mobile-menu').classList.toggle('hidden');
  });
  // 首页探索按钮
  document.getElementById('home-explore-btn').addEventListener('click', () => {
    window.showContentSection('explore');
  });
  // 退出登录
  document.getElementById('logout-btn').addEventListener('click', () => window.logout());
  document.getElementById('mobile-logout-btn').addEventListener('click', () => {
    window.logout();
    document.getElementById('mobile-menu').classList.add('hidden');
  });
  // 上传按钮
  document.getElementById('upload-btn').addEventListener('click', () => {
    if (window.currentUser) document.getElementById('upload-modal').classList.remove('hidden');
    else window.showToast(window.MESSAGES.NEED_LOGIN, 'error');
  });
  document.getElementById('mobile-upload-btn').addEventListener('click', () => {
    if (window.currentUser) {
      document.getElementById('upload-modal').classList.remove('hidden');
      document.getElementById('mobile-menu').classList.add('hidden');
    } else {
      window.showToast(window.MESSAGES.NEED_LOGIN, 'error');
    }
  });
  // 发布讨论按钮
  document.getElementById('create-discussion-btn').addEventListener('click', () => {
    if (window.currentUser) document.getElementById('create-discussion-modal').classList.remove('hidden');
    else window.showToast(window.MESSAGES.NEED_LOGIN, 'error');
  });
  // 发现页排序
  document.getElementById('explore-sort').addEventListener('change', (e) => {
    window.loadExploreData(e.target.value);
  });
}

/**
 * 所有表单提交绑定
 */
function bindFormSubmits() {
  // 登录表单
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const remember = document.getElementById('login-remember').checked;
    window.login(email, password, remember);
  });
  // 注册表单
  document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPwd = document.getElementById('register-confirm-password').value;
    if (password !== confirmPwd) {
      window.showToast('两次输入的密码不一致', 'error');
      return;
    }
    window.register(email, password);
  });
  // 忘记密码表单
  document.getElementById('forgot-password-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    window.forgotPassword(email);
  });
  // 编辑资料表单
  document.getElementById('edit-profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('edit-username').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();
    if (username.length < 3 || username.length > 20) {
      window.showToast('用户名需3-20个字符', 'error');
      return;
    }
    window.updateUserProfile({ username, bio });
  });
  // 上传照片表单
  document.getElementById('upload-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('upload-title').value.trim();
    const keywords = document.getElementById('upload-keywords').value.split(',').map(k => k.trim()).filter(k => k);
    const isPrivate = document.getElementById('upload-private').checked;
    if (!title) {
      window.showToast('请填写照片标题', 'error');
      return;
    }
    if (keywords.length === 0) {
      window.showToast('请填写至少一个关键词', 'error');
      return;
    }
    if (window.uploadedImages.length === 0) {
      window.showToast('请先选择要上传的照片', 'error');
      return;
    }
    window.publishPhoto({ title, keywords, isPrivate });
  });
  // 发布讨论表单
  document.getElementById('create-discussion-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('discussion-title').value.trim();
    const content = document.getElementById('discussion-content').value.trim();
    if (title.length < 5 || title.length > 100) {
      window.showToast('标题需5-100个字符', 'error');
      return;
    }
    if (content.length < 10 || content.length > 5000) {
      window.showToast('内容需10-5000个字符', 'error');
      return;
    }
    window.publishDiscussion({ title, content });
  });
  // 第三方登录
  document.getElementById('google-login').addEventListener('click', () => window.socialLogin('google'));
  document.getElementById('google-register').addEventListener('click', () => window.socialLogin('google'));
  document.getElementById('facebook-login').addEventListener('click', () => window.socialLogin('facebook'));
  document.getElementById('facebook-register').addEventListener('click', () => window.socialLogin('facebook'));
}

/**
 * 搜索按钮绑定
 */
function bindSearchButtons() {
  document.getElementById('search-btn').addEventListener('click', () => {
    const keyword = document.getElementById('search-input').value.trim();
    if (keyword) window.searchContent(keyword);
  });
  document.getElementById('mobile-search-btn').addEventListener('click', () => {
    const keyword = document.getElementById('mobile-search-input').value.trim();
    if (keyword) {
      window.searchContent(keyword);
      document.getElementById('mobile-menu').classList.add('hidden');
    }
  });
}

/**
 * 我的照片筛选绑定
 */
function bindMyPhotosFilter() {
  document.getElementById('my-photos-all').addEventListener('click', () => window.loadMyPhotos('all'));
  document.getElementById('my-photos-public').addEventListener('click', () => window.loadMyPhotos('public'));
  document.getElementById('my-photos-private').addEventListener('click', () => window.loadMyPhotos('private'));
}

/**
 * 头像上传绑定
 */
function bindAvatarUpload() {
  document.getElementById('edit-avatar-preview').addEventListener('click', () => {
    document.getElementById('edit-avatar-input').click();
  });
  document.getElementById('edit-avatar-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && window.isImageFile(file)) {
      window.uploadAvatar(file);
      e.target.value = ''; // 重置避免重复选择不触发
    } else if (file) {
      window.showToast('请选择JPG/PNG/GIF格式的图片', 'error');
    }
  });
}

/**
 * 回车搜索绑定
 */
function bindEnterSearch() {
  document.getElementById('search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const keyword = e.target.value.trim();
      if (keyword) window.searchContent(keyword);
    }
  });
  document.getElementById('mobile-search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const keyword = e.target.value.trim();
      if (keyword) {
        window.searchContent(keyword);
        document.getElementById('mobile-menu').classList.add('hidden');
      }
    }
  });
}

/**
 * 检查是否为图片文件
 * @param {File} file 文件对象
 * @returns {boolean} 是否为图片
 */
function isImageFile(file) {
  const types = ['image/jpg', 'image/jpeg', 'image/png', 'image/gif'];
  return types.includes(file.type);
}

/**
 * 显示吐司提示
 * @param {string} msg 提示信息
 * @param {string} type 类型：success/error/info
 */
function showToast(msg, type = 'info') {
  // 移除已存在的提示
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const toast = document.createElement('div');
  toast.className = `toast fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2 rounded-lg shadow-lg z-50 transition-all duration-300 ${
    type === 'success' ? 'bg-green-500 text-white' :
    type === 'error' ? 'bg-red-500 text-white' :
    'bg-gray-800 text-white'
  }`;
  toast.innerText = msg;
  document.body.appendChild(toast);
  // 自动消失
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-4');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

/**
 * 防抖函数
 * @param {Function} fn 执行函数
 * @param {number} delay 延迟时间
 * @returns {Function} 防抖后函数
 */
function debounce(fn, delay = 300) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 🔥 关键修复：提前全局挂载所有函数，页面加载时直接可用，无未定义报错
window.initLazyLoad = initLazyLoad;
window.initNavbarScroll = initNavbarScroll;
window.initEventListeners = initEventListeners;
window.isImageFile = isImageFile;
window.showToast = showToast;
window.debounce = debounce;
window.hideAllModals = function() {};
window.switchTheme = function() {};
window.showContentSection = function() {};
window.login = function() {};
window.register = function() {};
window.forgotPassword = function() {};
window.logout = function() {};
window.socialLogin = function() {};
window.uploadAvatar = function() {};
window.updateUserProfile = function() {};
window.publishPhoto = function() {};
window.loadExploreData = function() {};
window.loadMyPhotos = function() {};
window.publishDiscussion = function() {};
window.searchContent = function() {};

// 导出供模块引入（备用）
export {
  initLazyLoad, initNavbarScroll, initEventListeners,
  isImageFile, showToast, debounce
};
