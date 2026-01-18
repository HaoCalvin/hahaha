// 懒加载图片初始化
function initLazyLoad() {
  const lazyImages = document.querySelectorAll('.lazy-load');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        observer.unobserve(img);
      }
    });
  });
  lazyImages.forEach(img => observer.observe(img));
}

// 导航栏滚动效果（吸顶+阴影）
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

// 初始化所有事件监听（核心绑定）
function initEventListeners() {
  bindLoginModal();
  bindTheme();
  bindModalClose();
  bindNav();
  bindForms();
  bindSearch();
  bindMyPhotosFilter();
  bindAvatarUpload();
}

// 登录/注册/忘记密码模态框互转
function bindLoginModal() {
  // 打开登录框
  document.getElementById('login-btn').addEventListener('click', () => {
    document.getElementById('login-modal').classList.remove('hidden');
  });
  // 登录 → 注册
  document.getElementById('to-register-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('register-modal').classList.remove('hidden');
  });
  // 注册 → 登录
  document.getElementById('to-login-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-modal').classList.add('hidden');
    document.getElementById('login-modal').classList.remove('hidden');
  });
  // 登录 → 忘记密码
  document.getElementById('forgot-password-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('forgot-password-modal').classList.remove('hidden');
  });
  // 编辑资料按钮（未登录跳登录）
  document.getElementById('edit-profile-btn').addEventListener('click', () => {
    if (window.currentUser) {
      document.getElementById('edit-profile-modal').classList.remove('hidden');
    } else {
      document.getElementById('login-modal').classList.remove('hidden');
    }
  });
}

// 主题切换绑定（亮色/暗色，本地存储记忆）
function bindTheme() {
  // 电脑端
  document.getElementById('light-mode').addEventListener('click', () => window.switchTheme('light'));
  document.getElementById('dark-mode').addEventListener('click', () => window.switchTheme('dark'));
  // 手机端
  document.getElementById('mobile-light-mode').addEventListener('click', () => window.switchTheme('light'));
  document.getElementById('mobile-dark-mode').addEventListener('click', () => window.switchTheme('dark'));
}

// 模态框关闭（按钮/外部点击/ESC键）
function bindModalClose() {
  // 关闭按钮
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => window.hideAllModals());
  });
  // 点击模态框外部关闭
  window.addEventListener('click', (e) => {
    if (e.target.id && e.target.id.endsWith('-modal')) {
      window.hideAllModals();
    }
  });
  // 按ESC键关闭
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.hideAllModals();
  });
}

// 导航链接+菜单按钮绑定
function bindNav() {
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
  // 首页探索按钮跳发现页
  document.getElementById('home-explore-btn').addEventListener('click', () => {
    window.showContentSection('explore');
  });
  // 退出登录
  document.getElementById('logout-btn').addEventListener('click', () => window.logout());
  document.getElementById('mobile-logout-btn').addEventListener('click', () => {
    window.logout();
    document.getElementById('mobile-menu').classList.add('hidden');
  });
  // 上传照片按钮
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
  // 发现页排序切换
  document.getElementById('explore-sort').addEventListener('change', (e) => {
    window.loadExploreData(e.target.value);
  });
}

// 所有表单提交绑定
function bindForms() {
  // 登录表单
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pwd = document.getElementById('login-password').value;
    const remember = document.getElementById('login-remember').checked;
    window.login(email, pwd, remember);
  });
  // 注册表单（密码校验）
  document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value.trim();
    const pwd = document.getElementById('register-password').value;
    const confirmPwd = document.getElementById('register-confirm-password').value;
    if (pwd !== confirmPwd) {
      window.showToast('两次输入的密码不一致', 'error');
      return;
    }
    window.register(email, pwd);
  });
  // 忘记密码表单
  document.getElementById('forgot-password-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    window.forgotPassword(email);
  });
  // 编辑资料表单（用户名长度校验）
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
  // 上传照片表单（标题/关键词校验）
  document.getElementById('upload-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('upload-title').value.trim();
    const keywords = document.getElementById('upload-keywords').value.split(',').map(k => k.trim()).filter(k => k);
    const isPrivate = document.getElementById('upload-private').checked;
    if (!title) { window.showToast('请填写照片标题', 'error'); return; }
    if (keywords.length === 0) { window.showToast('请填写至少一个关键词', 'error'); return; }
    if (window.uploadedImages.length === 0) { window.showToast('请先选择要上传的照片', 'error'); return; }
    window.publishPhoto({ title, keywords, isPrivate });
  });
  // 发布讨论表单（标题/内容长度校验）
  document.getElementById('create-discussion-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('discussion-title').value.trim();
    const content = document.getElementById('discussion-content').value.trim();
    if (title.length < 5 || title.length > 100) { window.showToast('标题需5-100字符', 'error'); return; }
    if (content.length < 10 || content.length > 5000) { window.showToast('内容需10-5000字符', 'error'); return; }
    window.publishDiscussion({ title, content });
  });
}

// 搜索功能绑定（电脑端/手机端/回车）
function bindSearch() {
  // 电脑端搜索按钮
  document.getElementById('search-btn').addEventListener('click', () => {
    window.searchContent(document.getElementById('search-input').value.trim());
  });
  // 手机端搜索按钮
  document.getElementById('mobile-search-btn').addEventListener('click', () => {
    window.searchContent(document.getElementById('mobile-search-input').value.trim());
    document.getElementById('mobile-menu').classList.add('hidden');
  });
  // 电脑端回车搜索
  document.getElementById('search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') window.searchContent(e.target.value.trim());
  });
  // 手机端回车搜索
  document.getElementById('mobile-search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      window.searchContent(e.target.value.trim());
      document.getElementById('mobile-menu').classList.add('hidden');
    }
  });
}

// 我的照片筛选（全部/公开/私有）
function bindMyPhotosFilter() {
  document.getElementById('my-photos-all').addEventListener('click', () => window.loadMyPhotos('all'));
  document.getElementById('my-photos-public').addEventListener('click', () => window.loadMyPhotos('public'));
  document.getElementById('my-photos-private').addEventListener('click', () => window.loadMy
