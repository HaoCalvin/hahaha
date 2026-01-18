// 引入全局配置（核心修复：正确导入所有配置项）
import { SUPABASE_CONFIG, CLOUDINARY_CONFIG, APP_CONFIG, MESSAGES, STATUS_CODE } from './config.js';
// 引入工具函数
import { showToast, isImageFile } from './utils.js';

// 全局变量（挂载到window供utils.js调用）
window.supabase = null;
window.currentUser = null;
window.isAdmin = false;
window.uploadedImages = [];
window.currentProfileUserId = null;
// 全局挂载提示语和配置
window.MESSAGES = MESSAGES;
window.APP_CONFIG = APP_CONFIG;

// 页面加载完成后初始化所有功能
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. 初始化Supabase客户端（使用你的配置）
    window.supabase = window.supabase.createClient(
      SUPABASE_CONFIG.URL,
      SUPABASE_CONFIG.ANON_KEY
    );

    // 2. 初始化基础功能
    initTheme(); // 主题初始化
    window.initEventListeners(); // 事件监听（utils.js）
    window.initNavbarScroll(); // 导航栏滚动（utils.js）
    initCloudinaryUpload(); // 云存储上传初始化

    // 3. 检查用户登录状态
    await checkUserAuth();

    // 4. 加载页面初始数据
    await loadExploreData('created_at'); // 发现页最新
    await loadHotData(); // 热门页
    await loadDiscussionData(); // 讨论区

    // 5. 监听用户登录状态变化
    window.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        window.currentUser = session.user;
        await checkAdminRole();
        updateUserUI();
        showToast(MESSAGES.LOGIN_SUCCESS, 'success');
      } else if (event === 'SIGNED_OUT') {
        window.currentUser = null;
        window.isAdmin = false;
        updateUserUI();
        showToast(MESSAGES.LOGOUT_SUCCESS, 'info');
      }
    });

  } catch (error) {
    console.error('页面初始化失败：', error);
    showToast(MESSAGES.LOAD_FAILED, 'error');
  }
});

/**
 * 主题初始化（跟随系统/本地存储）
 */
function initTheme() {
  const savedTheme = localStorage.getItem('photoShareTheme') || 
                     (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  switchTheme(savedTheme);
}

/**
 * 主题切换（全局挂载供utils.js调用）
 */
window.switchTheme = function(theme) {
  const html = document.documentElement;
  html.classList.remove('light', 'dark');
  html.classList.add(theme);
  localStorage.setItem('photoShareTheme', theme);
};

/**
 * 隐藏所有模态框（全局挂载）
 */
window.hideAllModals = function() {
  document.querySelectorAll('[id$="-modal"]').forEach(modal => {
    modal.classList.add('hidden');
  });
  // 重置表单
  document.querySelectorAll('form').forEach(form => form.reset());
  window.uploadedImages = [];
  document.getElementById('upload-preview').innerHTML = `
    <div class="col-span-4 text-center text-gray-500 dark:text-gray-400">
      <i class="fas fa-cloud-upload-alt fa-2x mb-1"></i>
      <p>点击或拖拽上传</p>
    </div>
  `;
};

/**
 * 显示指定内容区域（全局挂载）
 */
window.showContentSection = function(sectionId) {
  // 隐藏所有区域
  document.querySelectorAll('main > section').forEach(sec => {
    sec.classList.add('hidden');
  });
  // 显示目标区域
  const target = document.getElementById(sectionId);
  if (target) target.classList.remove('hidden');
  // 平滑滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * 检查用户登录状态
 */
async function checkUserAuth() {
  const { data: { session }, error } = await window.supabase.auth.getSession();
  if (error) {
    console.error('检查登录状态失败：', error);
    return;
  }
  if (session) {
    window.currentUser = session.user;
    await checkAdminRole();
  }
  updateUserUI();
}

/**
 * 检查是否为管理员
 */
async function checkAdminRole() {
  window.isAdmin = window.currentUser?.email === APP_CONFIG.ADMIN_EMAIL;
}

/**
 * 更新用户相关UI（登录/未登录状态）
 */
function updateUserUI() {
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const myAvatar = document.getElementById('my-avatar');
  const myUsername = document.getElementById('my-username');
  const myBio = document.getElementById('my-bio');
  const myPhotosContainer = document.getElementById('my-photos-container');
  const uploadBtn = document.getElementById('upload-btn');
  const mobileUploadBtn = document.getElementById('mobile-upload-btn');

  if (window.currentUser) {
    // 已登录
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    myPhotosContainer.classList.remove('hidden');
    uploadBtn.classList.remove('hidden');
    mobileUploadBtn.classList.remove('hidden');

    // 加载用户资料
    loadUserProfile(window.currentUser.id);
  } else {
    // 未登录
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    myPhotosContainer.classList.add('hidden');
    uploadBtn.classList.add('hidden');
    mobileUploadBtn.classList.add('hidden');

    // 重置我的页面
    myAvatar.src = APP_CONFIG.DEFAULT_AVATAR;
    myUsername.innerText = '未登录';
    myBio.innerText = '点击登录/注册，开启你的分享之旅';
  }
}

/**
 * 加载用户资料
 */
async function loadUserProfile(userId) {
  try {
    const { data, error } = await window.supabase
      .from(SUPABASE_CONFIG.TABLES.USERS)
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // 新用户无资料，创建默认资料
      await createDefaultProfile(userId);
      return;
    } else if (error) throw error;

    // 更新UI
    document.getElementById('my-avatar').src = data.avatar_url || APP_CONFIG.DEFAULT_AVATAR;
    document.getElementById('my-username').innerText = data.username;
    document.getElementById('my-bio').innerText = data.bio || '这个人很懒，还没有填写简介~';
    // 编辑资料模态框赋值
    document.getElementById('edit-avatar-preview').src = data.avatar_url || APP_CONFIG.DEFAULT_AVATAR;
    document.getElementById('edit-username').value = data.username;
    document.getElementById('edit-bio').value = data.bio || '';

  } catch (error) {
    console.error('加载用户资料失败：', error);
  }
}

/**
 * 创建新用户默认资料
 */
async function createDefaultProfile(userId) {
  const defaultUsername = `用户${userId.slice(-6)}`;
  try {
    await window.supabase
      .from(SUPABASE_CONFIG.TABLES.USERS)
      .insert([{
        id: userId,
        username: defaultUsername,
        bio: '',
        avatar_url: APP_CONFIG.DEFAULT_AVATAR
      }]);
    loadUserProfile(userId);
  } catch (error) {
    console.error('创建默认资料失败：', error);
  }
}

/**
 * 登录功能（全局挂载）
 */
window.login = async function(email, password, remember) {
  try {
    const { error } = await window.supabase.auth.signInWithPassword({
      email,
      password
    }, {
      expiresIn: remember ? '30d' : '24h'
    });

    if (error) throw error;
    window.hideAllModals();

  } catch (error) {
    console.error('登录失败：', error);
    showToast(MESSAGES.LOGIN_FAILED + '：' + error.message, 'error');
  }
};

/**
 * 注册功能（全局挂载）
 */
window.register = async function(email, password) {
  try {
    const { error } = await window.supabase.auth.signUp({
      email,
      password
    });

    if (error) throw error;
    window.hideAllModals();
    showToast(MESSAGES.REGISTER_SUCCESS, 'success');

  } catch (error) {
    console.error('注册失败：', error);
    showToast(MESSAGES.REGISTER_FAILED + '：' + error.message, 'error');
  }
};

/**
 * 忘记密码（全局挂载）
 */
window.forgotPassword = async function(email) {
  try {
    const { error } = await window.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });

    if (error) throw error;
    window.hideAllModals();
    showToast('密码重置链接已发送，请注意查收', 'success');

  } catch (error) {
    console.error('忘记密码失败：', error);
    showToast('发送失败：' + error.message, 'error');
  }
};

/**
 * 退出登录（全局挂载）
 */
window.logout = async function() {
  try {
    const { error } = await window.supabase.auth.signOut();
    if (error) throw error;
    window.hideAllModals();
  } catch (error) {
    console.error('退出登录失败：', error);
    showToast('退出失败：' + error.message, 'error');
  }
};

/**
 * 第三方社交登录（全局挂载）
 */
window.socialLogin = async function(provider) {
  try {
    const { error } = await window.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  } catch (error) {
    console.error(`${provider}登录失败：`, error);
    showToast('第三方登录失败：' + error.message, 'error');
  }
};

/**
 * 初始化Cloudinary上传组件
 */
function initCloudinaryUpload() {
  const uploadPreview = document.getElementById('upload-preview');
  // 点击上传
  uploadPreview.addEventListener('click', () => {
    if (!window.currentUser) {
      showToast(MESSAGES.NEED_LOGIN, 'error');
      return;
    }
    window.cloudinary.openUploadWidget({
      cloudName: CLOUDINARY_CONFIG.CLOUD_NAME,
      uploadPreset: CLOUDINARY_CONFIG.UPLOAD_PRESET,
      folder: CLOUDINARY_CONFIG.FOLDERS.PHOTOS,
      allowedFormats: CLOUDINARY_CONFIG.ALLOWED_FORMATS,
      maxFileSize: CLOUDINARY_CONFIG.MAX_FILE_SIZE,
      maxFiles: 1, // 单张上传
      multiple: false
    }, (error, result) => {
      if (error) {
        console.error('上传失败：', error);
        showToast(MESSAGES.UPLOAD_FAILED, 'error');
        return;
      }
      if (result && result.event === 'success') {
        const imageUrl = result.info.secure_url;
        window.uploadedImages = [imageUrl];
        // 更新预览
        uploadPreview.innerHTML = `
          <img src="${imageUrl}" alt="上传预览" class="col-span-4 w-full h-48 object-cover rounded-lg">
        `;
      }
    });
  });
}

/**
 * 上传头像（全局挂载）
 */
window.uploadAvatar = async function(file) {
  try {
    // 读取文件并预览
    const reader = new FileReader();
    reader.onload = async (e) => {
      const previewImg = document.getElementById('edit-avatar-preview');
      previewImg.src = e.target.result;

      // 上传到Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_CONFIG.UPLOAD_PRESET);
      formData.append('folder', CLOUDINARY_CONFIG.FOLDERS.AVATARS);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || '头像上传失败');
      // 更新用户资料
      await updateUserProfile({ avatar_url: data.secure_url });
    };
    reader.readAsDataURL(file);

  } catch (error) {
    console.error('头像上传失败：', error);
    showToast('头像上传失败：' + error.message, 'error');
  }
};

/**
 * 更新用户资料（全局挂载）
 */
window.updateUserProfile = async function(profileData) {
  if (!window.currentUser) {
    showToast(MESSAGES.NEED_LOGIN, 'error');
    return;
  }

  try {
    const { error } = await window.supabase
      .from(SUPABASE_CONFIG.TABLES.USERS)
      .update(profileData)
      .eq('id', window.currentUser.id);

    if (error) throw error;
    window.hideAllModals();
    await loadUserProfile(window.currentUser.id);
    showToast('资料更新成功', 'success');

  } catch (error) {
    console.error('更新资料失败：', error);
    showToast('更新失败：' + error.message, 'error');
  }
};

/**
 * 发布照片（全局挂载）
 */
window.publishPhoto = async function({ title, keywords, isPrivate }) {
  if (!window.currentUser || window.uploadedImages.length === 0) {
    showToast(MESSAGES.NEED_LOGIN, 'error');
    return;
  }

  try {
    const { error } = await window.supabase
      .from(SUPABASE_CONFIG.TABLES.PHOTOS)
      .insert([{
        user_id: window.currentUser.id,
        title,
        image_url: window.uploadedImages[0],
        keywords,
        is_private: isPrivate,
        likes: 0,
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;
    window.hideAllModals();
    await loadExploreData('created_at');
    await loadMyPhotos('all');
    showToast(MESSAGES.PUBLISH_SUCCESS, 'success');

  } catch (error) {
    console.error('发布照片失败：', error);
    showToast(MESSAGES.PUBLISH_FAILED + '：' + error.message, 'error');
  }
};

/**
 * 加载发现页数据
 */
window.loadExploreData = async function(sortBy = 'created_at') {
  try {
    const exploreContainer = document.getElementById('explore-photos');
    exploreContainer.innerHTML = '<div class="col-span-4 text-center py-10">加载中...</div>';

    // 只查询公开照片
    const { data, error } = await window.supabase
      .from(SUPABASE_CONFIG.TABLES.PHOTOS)
      .select(`
        *,
        profiles:${SUPABASE_CONFIG.TABLES.USERS}(username, avatar_url)
      `)
      .eq('is_private', false)
      .order(sortBy, { ascending: false })
      .limit(APP_CONFIG.PAGE_SIZE.EXPLORE);

    if (error) throw error;
    renderPhotos(data, exploreContainer);

  } catch (error) {
    console.error('加载发现页失败：', error);
    document.getElementById('explore-photos').innerHTML = '<div class="col-span-4 text-center py-10 text-red-500">加载失败，请刷新</div>';
  }
};

/**
 * 加载热门页数据
 */
async function loadHotData() {
  try {
    const hotContainer = document.getElementById('hot-photos');
    hotContainer.innerHTML = '<div class="col-span-4 text-center py-10">加载中...</div>';

    const { data, error } = await window.supabase
      .from(SUPABASE_CONFIG.TABLES.PHOTOS)
      .select(`
        *,
        profiles:${SUPABASE_CONFIG.TABLES.USERS}(username, avatar_url)
      `)
      .eq('is_private', false)
      .order('likes', { ascending: false })
      .limit(APP_CONFIG.PAGE_SIZE.HOT);

    if (error) throw error;
    renderPhotos(data, hotContainer);

  } catch (error) {
    console.error('加载热门页失败：', error);
    document.getElementById('hot-photos').innerHTML = '<div class="col-span-4 text-center py-10 text-red-500">加载失败，请刷新</div>';
  }
}

/**
 * 加载我的照片（全局挂载）
 */
window.loadMyPhotos = async function(type = 'all') {
  if (!window.currentUser) return;

  try {
    const myPhotosContainer = document.getElementById('my-photos');
    myPhotosContainer.innerHTML = '<div class="col-span-4 text-center py-10">加载中...</div>';

    let query = window.supabase
      .from(SUPABASE_CONFIG.TABLES.PHOTOS)
      .select('*')
      .eq('user_id', window.currentUser.id);

    // 筛选公开/私有
    if (type === 'public') query = query.eq('is_private', false);
    if (type === 'private') query = query.eq('is_private', true);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    // 渲染我的照片
    if (data.length === 0) {
      myPhotosContainer.innerHTML = '<div class="col-span-4 text-center py-10 text-gray-500">暂无照片，快去上传吧~</div>';
      return;
    }

    myPhotosContainer.innerHTML = '';
    data.forEach(photo => {
      myPhotosContainer.innerHTML += `
        <div class="aspect-square rounded-lg overflow-hidden relative group">
          <img src="${photo.image_url}" alt="${photo.title}" class="w-full h-full object-cover">
          <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span class="text-white flex items-center gap-1">
              <i class="fas fa-heart"></i> ${photo.likes || 0}
            </span>
          </div>
        </div>
      `;
    });

  } catch (error) {
    console.error('加载我的照片失败：', error);
    myPhotosContainer.innerHTML = '<div class="col-span-4 text-center py-10 text-red-500">加载失败，请刷新</div>';
  }
};

/**
 * 渲染照片列表
 */
function renderPhotos(photos, container) {
  if (!photos || photos.length === 0) {
    container.innerHTML = '<div class="col-span-4 text-center py-10 text-gray-500">暂无内容~</div>';
    return;
  }

  container.innerHTML = '';
  photos.forEach(photo => {
    container.innerHTML += `
      <div class="aspect-square rounded-lg overflow-hidden relative group">
        <img src="${photo.image_url}" alt="${photo.title}" class="w-full h-full object-cover">
        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white text-xs">
          <div class="flex items-center gap-1 mb-1">
            <img src="${photo.profiles?.avatar_url || APP_CONFIG.DEFAULT_AVATAR}" alt="${photo.profiles?.username}" class="w-4 h-4 rounded-full">
            <span>${photo.profiles?.username || '未知用户'}</span>
          </div>
          <p class="truncate">${photo.title}</p>
        </div>
        <div class="absolute top-2 right-2 bg-black/50 rounded-full p-1 text-white text-xs">
          <i class="fas fa-heart"></i> ${photo.likes || 0}
        </div>
      </div>
    `;
  });
}

/**
 * 加载讨论区数据
 */
async function loadDiscussionData() {
  try {
    const discussionContainer = document.getElementById('discussions-list');
    discussionContainer.innerHTML = '<div class="py-10 text-center">加载中...</div>';

    const { data, error } = await window.supabase
      .from(SUPABASE_CONFIG.TABLES.DISCUSSIONS)
      .select(`
        *,
        profiles:${SUPABASE_CONFIG.TABLES.USERS}(username, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    if (data.length === 0) {
      discussionContainer.innerHTML = '<div class="py-10 text-center text-gray-500">暂无讨论，快来发布第一条吧~</div>';
      return;
    }

    discussionContainer.innerHTML = '';
    data.forEach(disc => {
      discussionContainer.innerHTML += `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
          <div class="flex items-center gap-2 mb-2">
            <img src="${disc.profiles?.avatar_url || APP_CONFIG.DEFAULT_AVATAR}" alt="${disc.profiles?.username}" class="w-8 h-8 rounded-full">
            <span class="font-medium">${disc.profiles?.username || '未知用户'}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400 ml-auto">${new Date(disc.created_at).toLocaleDateString()}</span>
          </div>
          <h3 class="text-lg font-bold mb-1">${disc.title}</h3>
          <p class="text-gray-600 dark:text-gray-400 line-clamp-2">${disc.content}</p>
        </div>
      `;
    });

  } catch (error) {
    console.error('加载讨论区失败：', error);
    document.getElementById('discussions-list').innerHTML = '<div class="py-10 text-center text-red-500">加载失败，请刷新</div>';
  }
}

/**
 * 发布讨论（全局挂载）
 */
window.publishDiscussion = async function({ title, content }) {
  if (!window.currentUser) {
    showToast(MESSAGES.NEED_LOGIN, 'error');
    return;
  }

  try {
    const { error } = await window.supabase
      .from(SUPABASE_CONFIG.TABLES.DISCUSSIONS)
      .insert([{
        user_id: window.currentUser.id,
        title,
        content,
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;
    window.hideAllModals();
    await loadDiscussionData();
    showToast(MESSAGES.PUBLISH_SUCCESS, 'success');

  } catch (error) {
    console.error('发布讨论失败：', error);
    showToast(MESSAGES.PUBLISH_FAILED + '：' + error.message, 'error');
  }
};

/**
 * 搜索内容（全局挂载）
 */
window.searchContent = async function(keyword) {
  if (!keyword) {
    showToast('请输入搜索关键词', 'info');
    return;
  }

  try {
    // 切换到发现页并显示加载
    window.showContentSection('explore');
    const exploreContainer = document.getElementById('explore-photos');
    exploreContainer.innerHTML = '<div class="col-span-4 text-center py-10">搜索中...</div>';

    // 搜索公开照片（关键词/标题匹配）
    const { data, error } = await window.supabase
      .from(SUPABASE_CONFIG.TABLES.PHOTOS)
      .select(`
        *,
        profiles:${SUPABASE_CONFIG.TABLES.USERS}(username, avatar_url)
      `)
      .eq('is_private', false)
      .or(`title.ilike.%${keyword}%,keywords.ilike.%${keyword}%`);

    if (error) throw error;
    renderPhotos(data, exploreContainer);
    if (data.length === 0) showToast(MESSAGES.SEARCH_EMPTY, 'info');

  } catch (error) {
    console.error('搜索失败：', error);
    exploreContainer.innerHTML = '<div class="col-span-4 text-center py-10 text-red-500">搜索失败，请刷新</div>';
  }
};

// 全局挂载剩余工具函数（防止utils.js调用报错）
window.toggleFollow = async function() { showToast('关注功能暂未开放', 'info'); };
window.initLazyLoad = window.initLazyLoad || function() {};
