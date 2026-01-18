// 通用工具函数 - 独立封装，供app.js调用
/**
 * 懒加载图片初始化
 */
function initLazyLoad() {
  const lazyImages = document.querySelectorAll('.lazy-load');
  const lazyLoadObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.src;
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
      navbar.classList.add('navbar-scrolled');
    } else {
      navbar.classList.remove('navbar-scrolled');
    }
  });
}

/**
 * 初始化所有事件监听（解耦，避免app.js冗余）
 */
function initEventListeners() {
  // 主题切换按钮
  bindThemeButtons();
  // 模态框关闭按钮
  bindModalClose();
  // 导航链接点击
  bindNavLinks();
  // 表单提交事件
  bindFormSubmits();
  // 搜索按钮
  bindSearchButtons();
  // 我的作品筛选
  bindMyPhotosFilter();
  // 关注/编辑按钮
  bindProfileButtons();
  // 头像上传选择
  bindAvatarUpload();
  // 回车搜索
  bindEnterSearch();
}

/**
 * 绑定主题切换按钮事件
 */
function bindThemeButtons() {
  // 电脑端
  document.getElementById('light-mode').addEventListener('click', () => switchTheme('light'));
  document.getElementById('dark-mode').addEventListener('click', () => switchTheme('dark'));
  document.getElementById('white-mode').addEventListener('click', () => switchTheme('white'));
  // 手机端
  document.getElementById('mobile-light-mode').addEventListener('click', () => switchTheme('light'));
  document.getElementById('mobile-dark-mode').addEventListener('click', () => switchTheme('dark'));
  document.getElementById('mobile-white-mode').addEventListener('click', () => switchTheme('white'));
}

/**
 * 绑定模态框关闭事件
 */
function bindModalClose() {
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', hideAllModals);
  });
  // 点击模态框外部关闭
  window.addEventListener('click', (e) => {
    if (e.target.hasAttribute('id') && e.target.id.endsWith('-modal')) {
      hideAllModals();
    }
  });
}

/**
 * 绑定导航链接点击事件
 */
function bindNavLinks() {
  // 电脑端导航
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = e.target.getAttribute('href').slice(1);
      showContentSection(id);
      // 关闭手机菜单
      document.getElementById('mobile-menu').classList.add('hidden');
    });
  });
  // 手机端导航
  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.getElementById('mobile-menu').classList.toggle('hidden');
  });
  // 首页探索按钮
  document.getElementById('home-explore-btn').addEventListener('click', () => {
    showContentSection('explore');
  });
  // 退出登录
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('mobile-logout-btn').addEventListener('click', () => {
    logout();
    document.getElementById('mobile-menu').classList.add('hidden');
  });
  // 上传按钮
  document.getElementById('upload-btn').addEventListener('click', () => {
    document.getElementById('upload-modal').classList.remove('hidden');
  });
  document.getElementById('mobile-upload-btn').addEventListener('click', () => {
    document.getElementById('upload-modal').classList.remove('hidden');
    document.getElementById('mobile-menu').classList.add('hidden');
  });
  // 发布讨论按钮
  document.getElementById('create-discussion-btn').addEventListener('click', () => {
    document.getElementById('create-discussion-modal').classList.remove('hidden');
  });
  // 编辑资料按钮
  document.getElementById('edit-profile-btn').addEventListener('click', () => {
    showContentSection('edit-profile');
  });
  // 发现页排序
  document.getElementById('explore-sort').addEventListener('change', (e) => {
    loadExploreData(e.target.value);
  });
}

/**
 * 绑定所有表单提交事件
 */
function bindFormSubmits() {
  // 登录表单
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const remember = document.getElementById('login-remember').checked;
    login(email, password, remember);
  });
  // 注册表单
  document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPwd = document.getElementById('register-confirm-password').value;
    if (password !== confirmPwd) {
      showToast('两次密码不一致', 'error');
      return;
    }
    register(email, password);
  });
  // 忘记密码表单
  document.getElementById('forgot-password-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    forgotPassword(email);
  });
  // 编辑资料表单
  document.getElementById('edit-profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('edit-username').value;
    const bio = document.getElementById('edit-bio').value;
    if (!username || username.trim() === '') {
      showToast('用户名不能为空', 'error');
      return;
    }
    updateUserProfile({ username, bio });
  });
  // 上传照片表单
  document.getElementById('upload-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('upload-title').value;
    const keywords = document.getElementById('upload-keywords').value;
    const isPrivate = document.getElementById('upload-private').checked;
    publishPhoto({ title, keywords, isPrivate });
  });
  // 发布讨论表单
  document.getElementById('create-discussion-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('discussion-title').value;
    const content = document.getElementById('discussion-content').value;
    if (content.trim().length < 10) {
      showToast('讨论内容最少10个字符', 'error');
      return;
    }
    publishDiscussion({ title, content });
  });
  // 评论表单
  document.getElementById('comment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const content = document.getElementById('comment-input').value;
    publishComment(currentPhotoId, content);
  });
  // 社交登录
  document.getElementById('google-login').addEventListener('click', () => socialLogin('google'));
  document.getElementById('facebook-login').addEventListener('click', () => socialLogin('facebook'));
  document.getElementById('google-register').addEventListener('click', () => socialLogin('google'));
  document.getElementById('facebook-register').addEventListener('click', () => socialLogin('facebook'));
  // 忘记密码链接
  document.getElementById('forgot-password-link').addEventListener('click', (e) => {
    e.preventDefault();
    hideAllModals();
    document.getElementById('forgot-password-modal').classList.remove('hidden');
  });
  // 登录/注册互转
  document.getElementById('to-register-link').addEventListener('click', (e) => {
    e.preventDefault();
    hideAllModals();
    document.getElementById('register-modal').classList.remove('hidden');
  });
  document.getElementById('to-login-link').addEventListener('click', (e) => {
    e.preventDefault();
    hideAllModals();
    document.getElementById('login-modal').classList.remove('hidden');
  });
}

/**
 * 绑定搜索按钮事件
 */
function bindSearchButtons() {
  document.getElementById('search-btn').addEventListener('click', () => {
    const keyword = document.getElementById('search-input').value;
    searchContent(keyword);
  });
  document.getElementById('mobile-search-btn').addEventListener('click', () => {
    const keyword = document.getElementById('mobile-search-input').value;
    searchContent(keyword);
    document.getElementById('mobile-menu').classList.add('hidden');
  });
}

/**
 * 绑定我的作品筛选按钮事件
 */
function bindMyPhotosFilter() {
  document.getElementById('my-photos-all').addEventListener('click', () => loadMyPhotos('all'));
  document.getElementById('my-photos-public').addEventListener('click', () => loadMyPhotos('public'));
  document.getElementById('my-photos-private').addEventListener('click', () => loadMyPhotos('private'));
}

/**
 * 绑定个人主页按钮事件
 */
function bindProfileButtons() {
  document.getElementById('follow-btn').addEventListener('click', () => {
    toggleFollow(currentProfileUserId);
  });
  document.getElementById('unfollow-btn').addEventListener('click', () => {
    toggleFollow(currentProfileUserId);
  });
}

/**
 * 绑定头像上传选择事件
 */
function bindAvatarUpload() {
  document.getElementById('edit-avatar-preview').addEventListener('click', () => {
    document.getElementById('edit-avatar-input').click();
  });
  document.getElementById('edit-avatar-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadAvatar(file);
      // 重置input，避免重复选择同一文件不触发
      e.target.value = '';
    }
  });
}

/**
 * 绑定回车搜索事件
 */
function bindEnterSearch() {
  document.getElementById('search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const keyword = e.target.value;
      searchContent(keyword);
    }
  });
  document.getElementById('mobile-search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const keyword = e.target.value;
      searchContent(keyword);
      document.getElementById('mobile-menu').classList.add('hidden');
    }
  });
}

/**
 * 数字千分位格式化
 * @param {number} num 要格式化的数字
 * @returns {string} 千分位格式化后的字符串
 */
function formatThousand(num) {
  if (!num || isNaN(num)) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 检查文件类型是否为图片
 * @param {File} file 文件对象
 * @returns {boolean} 是否为图片
 */
function isImageFile(file) {
  if (!file) return false;
  const imageTypes = ['image/jpg', 'image/jpeg', 'image/png', 'image/gif'];
  return imageTypes.includes(file.type);
}

/**
 * 防抖函数
 * @param {Function} fn 执行函数
 * @param {number} delay 延迟时间(ms)
 * @returns {Function} 防抖后的函数
 */
function debounce(fn, delay = 300) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 节流函数
 * @param {Function} fn 执行函数
 * @param {number} interval 间隔时间(ms)
 * @returns {Function} 节流后的函数
 */
function throttle(fn, interval = 300) {
  let lastTime = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}
