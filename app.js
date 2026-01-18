import { SUPABASE_CONFIG, CLOUDINARY_CONFIG, APP_CONFIG, MESSAGES } from './config.js';
import { showToast, isImageFile } from './utils.js';

// 全局变量初始化
window.supabase = null;
window.currentUser = null;
window.uploadedImages = [];
window.MESSAGES = MESSAGES;
window.APP_CONFIG = APP_CONFIG;
window.CLOUDINARY_CONFIG = CLOUDINARY_CONFIG;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 初始化Supabase
    window.supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
    // 挂载全局函数
    mountGlobalFns();
    // 初始化基础功能
    initTheme();
    window.initNavbarScroll();
    window.initEventListeners();
    initCloudinaryUpload();
    // 检查登录状态
    await checkUserAuth();
    // 加载初始数据
    await Promise.all([
      window.loadExploreData('created_at'),
      loadHotPhotos(),
      loadDiscussionList()
    ]);
    // 监听登录状态变化
    window.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        window.currentUser = session.user;
        updatePageUI();
        showToast(MESSAGES.LOGIN_SUCCESS, 'success');
      } else if (event === 'SIGNED_OUT') {
        window.currentUser = null;
        updatePageUI();
        showToast(MESSAGES.LOGOUT_SUCCESS, 'info');
      }
    });
    console.log('✅ 应用初始化成功');
  } catch (error) {
    console.error('❌ 应用初始化失败：', error);
    showToast(MESSAGES.LOAD_FAILED + '：' + error.message, 'error');
  }
});

// 挂载全局业务函数
function mountGlobalFns() {
  window.switchTheme = switchTheme;
  window.hideAllModals = hideAllModals;
  window.showContentSection = showContentSection;
  window.login = login;
  window.register = register;
  window.forgotPassword = forgotPassword;
  window.logout = logout;
  window.socialLogin = socialLogin;
  window.uploadAvatar = uploadAvatar;
  window.updateUserProfile = updateUserProfile;
  window.publishPhoto = publishPhoto;
  window.loadExploreData = loadExploreData;
  window.loadMyPhotos = loadMyPhotos;
  window.publishDiscussion = publishDiscussion;
  window.searchContent = searchContent;
}

// 主题初始化
function initTheme() {
  const savedTheme = localStorage.getItem('photo-share-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  switchTheme(savedTheme);
}

// 主题切换
function switchTheme(theme) {
  document.documentElement.className = theme;
  localStorage.setItem('photo-share-theme', theme);
}

// 隐藏所有模态框
function hideAllModals() {
  document.querySelectorAll('[id$="-modal"]').forEach(modal => modal.classList.add('hidden'));
  document.querySelectorAll('form').forEach(form => form.reset());
  window.uploadedImages = [];
  document.getElementById('upload-preview').innerHTML = `
    <div class="col-span-4 text-center text-gray-500 dark:text-gray-400">
      <<i class="fas fa-cloud-upload-alt fa-2x mb-1"></</i>
      <p>点击或拖拽上传</p>
    </div>
  `;
}

// 切换页面区域
function showContentSection(sectionId) {
  document.querySelectorAll('main > section').forEach(sec => sec.classList.add('hidden'));
  const targetSection = document.getElementById(sectionId);
  if (targetSection) targetSection.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 检查登录状态
async function checkUserAuth() {
  const { data: { session } } = await window.supabase.auth.getSession();
  if (session) {
    window.currentUser = session.user;
  }
  updatePageUI();
}

// 更新页面UI
function updatePageUI() {
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const uploadBtn = document.getElementById('upload-btn');
  const mobileUploadBtn = document.getElementById('mobile-upload-btn');
  const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
  const myPhotosContainer = document.getElementById('my-photos-container');
  const myAvatar = document.getElementById('my-avatar');
  const myUsername = document.getElementById('my-username');
  const myBio = document.getElementById('my-bio');

  if (window.currentUser) {
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    uploadBtn.classList.remove('hidden');
    mobileUploadBtn.classList.remove('hidden');
    mobileLogoutBtn.classList.remove('hidden');
    myPhotosContainer.classList.remove('hidden');
    loadUserProfile(window.currentUser.id);
  } else {
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    uploadBtn.classList.add('hidden');
    mobileUploadBtn.classList.add('hidden');
    mobileLogoutBtn.classList.add('hidden');
    myPhotosContainer.classList.add('hidden');
    myAvatar.src = APP_CONFIG.DEFAULT_AVATAR;
    myUsername.innerText = '未登录';
    myBio.innerText = '点击登录/注册，开启你的分享之旅';
  }
}

// 加载用户资料
async function loadUserProfile(userId) {
  try {
    const { data, error } = await window.supabase
      .from(SUPABASE_CONFIG.TABLES.USERS)
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      await createDefaultUserProfile(userId);
      return;
    }
    if (error) throw error;

    document.getElementById('my-avatar').src = data.avatar_url || APP_CONFIG.DEFAULT_AVATAR;
    document.getElementById('my-username').innerText = data.username;
    document.getElementById('my-bio').innerText = data.bio || '这个人很懒，还没写个人简介~';
    document.getElementById('edit-avatar-preview').src = data.avatar_url || APP_CONFIG.DEFAULT_AVATAR;
    document.getElementById('edit-username').value = data.username;
    document.getElementById('edit-bio').value = data.bio || '';
  } catch (error) {
    console.error('加载用户资料失败：', error);
  }
}

// 创建默认用户资料
async function createDefaultUserProfile(userId) {
  const defaultUsername = `用户${userId.slice(-6)}`;
  try {
    await window.supabase.from(SUPABASE_CONFIG.TABLES.USERS).insert([{
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

// 登录功能（无需邮箱验证）
async function login(email, password, remember) {
  try {
    const { error } = await window.supabase.auth.signInWithPassword(
      { email, password },
      { expiresIn: remember ? '30d' : '24h' }
    );
    if (error) throw error;
    window.hideAllModals();
  } catch (error) {
    showToast(MESSAGES.LOGIN_FAILED + '：' + error.message, 'error');
  }
}

// 注册功能（无需邮箱验证）
async function register(email, password) {
  try {
    const { error } = await window.supabase.auth.signUp(
      { email, password },
      { redirectTo: window.location.origin }
    );
    if (error) throw error;
    window.hideAllModals();
    showToast('注册成功！可直接登录', 'success');
  } catch (error) {
    showToast(MESSAGES.REGISTER_FAILED + '：' + error.message, 'error');
  }
}

// 忘记密码
async function forgotPassword(email) {
  try {
    const { error } = await window.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    if (error) throw error;
    window.hideAllModals();
    showToast('密码重置链接已发送，请查收邮箱', 'success');
  } catch (error) {
    showToast('发送失败：' + error.message, 'error');
  }
}

// 退出登录
async function logout() {
  try {
    const { error } = await window.supabase.auth.signOut();
    if (error) throw error;
    window.hideAllModals();
  } catch (error) {
    showToast('退出失败：' + error.message, 'error');
  }
}

// 第三方登录（预留）
async function socialLogin(provider) {
  showToast(`${provider}登录功能暂未开放`, 'info');
}

// 初始化Cloudinary上传
function initCloudinaryUpload() {
  const uploadPreview = document.getElementById('upload-preview');
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
      maxFiles: 1,
      multiple: false
    }, (error, result) => {
      if (error) {
        console.error('照片上传失败：', error);
        showToast(MESSAGES.UPLOAD_FAILED, 'error');
        return;
      }
      if (result && result.event === 'success') {
        const imageUrl = result.info.secure_url;
        window.uploadedImages = [imageUrl];
        uploadPreview.innerHTML = `<img src="${imageUrl}" alt="上传预览" class="col-span-4 w-full h-48 object-cover rounded-lg">`;
      }
    });
  });
}

// 上传头像
async function uploadAvatar(file) {
  if (!window.currentUser) {
    showToast(MESSAGES.NEED_LOGIN, 'error');
    return;
  }
  if (!isImageFile(file)) {
    showToast('请选择JPG/PNG/GIF格式的图片', 'error');
    return;
  }

  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      document.getElementById('edit-avatar-preview').src = e.target.result;
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
      await updateUserProfile({ avatar_url: data.secure_url });
    };
    reader.readAsDataURL(file);
  } catch (error) {
    console.error('头像上传失败：', error);
    showToast('头像上传失败：' + error.message, 'error');
  }
}

// 更新用户资料
async function updateUserProfile(profileData) {
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
    loadUserProfile(window.currentUser.id);
    showToast('资料更新成功', 'success');
  } catch (error) {
    console.error('更新资料失败：', error);
    showToast('更新失败：' + error.message, 'error');
  }
}

// 发布照片
async function publishPhoto({ title, keywords, isPrivate }) {
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
    await window.loadExploreData('created_at');
    await window.loadMyPhotos('all');
    showToast(MESSAGES.PUBLISH_SUCCESS, 'success');
  } catch (error) {
    console.error('发布照片失败：', error);
    showToast(MESSAGES.PUBLISH_FAILED + '：' + error.message, 'error');
  }
}

// 加载发现页照片
async function loadExploreData(sortBy = 'created_at') {
  const exploreContainer = document.getElementById('explore-photos');
  exploreContainer.innerHTML = '<div class="col-span-4 text-center py-10">加载中...</div>';

  try {
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
    exploreContainer.innerHTML = '<div class="col-span-4 text-center py-10 text-red-500">加载失败，请刷新</div>';
  }
}

// 加载热门照片
async function loadHotPhotos() {
  const hotContainer = document.getElementById('hot-photos');
  hotContainer.innerHTML = '<div class="col-span-4 text-center py-10">加载中...</div>';

  try {
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
    hotContainer.innerHTML = '<div class="col-span-4 text-center py-10 text-red-500">加载失败，请刷新</div>';
  }
}

// 加载我的照片
async function loadMyPhotos(type = 'all') {
  if (!window.currentUser) return;
  const myPhotosContainer = document.getElementById('my-photos');
  myPhotosContainer.innerHTML = '<div class="col-span-4 text-center py-10">加载中...</div>';

  try {
    let query = window.supabase
      .from(SUPABASE_CONFIG.TABLES.PHOTOS)
      .select('*')
      .eq('user_id', window.currentUser.id)
      .order('created_at', { ascending: false });

    if (type === 'public') query = query.eq('is_private', false);
    if (type === 'private') query = query.eq('is_private', true);

    const { data, error } = await query.limit(APP_CONFIG.PAGE_SIZE.MY_PHOTOS);
    if (error) throw error;

    if (data.length === 0) {
      myPhotosContainer.innerHTML = '<div class="col-span-4 text-center py-10 text-gray-500">暂无照片，快去上传吧~</div>';
      return;
    }

    myPhotosContainer.innerHTML = '';
    data.forEach(photo => {
      myPhotosContainer.innerHTML += `
        <div class="aspect-square rounded-lg overflow-hidden relative group cursor-pointer">
          <img src="${photo.image_url}" alt="${photo.title}" class="w-full h-full object-cover">
          <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span class="text-white flex items-center gap-1">
              <<i class="fas fa-heart"></</i> ${photo.likes || 0}
            </span>
          </div>
        </div>
      `;
    });
  } catch (error) {
    console.error('加载我的照片失败：', error);
    myPhotosContainer.innerHTML = '<div class="col-span-4 text-center py-10 text-red-500">加载失败，请刷新</div>';
  }
}

// 渲染照片列表
function renderPhotos(photos, container) {
  if (!photos || photos.length === 0) {
    container.innerHTML = '<div class="col-span-4 text-center py-10 text-gray-500">暂无内容，快来发布第一条吧~</div>';
    return;
  }

  container.innerHTML = '';
  photos.forEach(photo => {
    container.innerHTML += `
      <div class="aspect-square rounded-lg overflow-hidden relative group cursor-pointer">
        <img src="${photo.image_url}" alt="${photo.title}" class="w-full h-full object-cover">
        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white text-xs">
          <div class="flex items-center gap-1 mb-1">
            <img src="${photo.profiles?.avatar_url || APP_CONFIG.DEFAULT_AVATAR}" alt="头像" class="w-4 h-4 rounded-full">
            <span>${photo.profiles?.username || '未知用户'}</span>
          </div>
          <p class="truncate">${photo.title}</p>
        </div>
        <div class="absolute top-2 right-2 bg-black/50 rounded-full p-1 text-white text-xs">
          <<i class="fas fa-heart"></</i> ${photo.likes || 0}
        </div>
      </div>
    `;
  });
}

// 加载讨论区
async function loadDiscussionList() {
  const discussionContainer = document.getElementById('discussions-list');
  discussionContainer.innerHTML = '<div class="py-10 text-center">加载中...</div>';

  try {
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
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer">
          <div class="flex items-center gap-2 mb-2">
            <img src="${disc.profiles?.avatar_url || APP_CONFIG.DEFAULT_AVATAR}" alt="头像" class="w-8 h-8 rounded-full">
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
    discussionContainer.innerHTML = '<div class="py-10 text-center text-red-500">加载失败，请刷新</div>';
  }
}

// 发布讨论
async function publishDiscussion({ title, content }) {
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
    await loadDiscussionList();
    showToast(MESSAGES.PUBLISH_SUCCESS, 'success');
  } catch (error) {
    console.error('发布讨论失败：', error);
    showToast(MESSAGES.PUBLISH_FAILED + '：' + error.message, 'error');
  }
}

// 搜索功能
async function searchContent(keyword) {
  if (!keyword || keyword.trim() === '') {
    showToast('请输入搜索关键词', 'info');
    return;
  }
  const trimKeyword = keyword.trim();
  const exploreContainer = document.getElementById('explore-photos');
  exploreContainer.innerHTML = '<div class="col-span-4 text-center py-10">搜索中...</div>';

  try {
    window.showContentSection('explore');
    const { data, error } = await window.supabase
      .from(SUPABASE_CONFIG.TABLES.PHOTOS)
      .select(`
        *,
        profiles:${SUPABASE_CONFIG.TABLES.USERS}(username, avatar_url)
      `)
      .eq('is_private', false)
      .or(`title.ilike.%${trimKeyword}%,keywords.ilike.%${trimKeyword}%`);

    if (error) throw error;
    renderPhotos(data, exploreContainer);
    if (data.length === 0) showToast(MESSAGES.SEARCH_EMPTY, 'info');
  } catch (error) {
    console.error('搜索失败：', error);
    exploreContainer.innerHTML = '<div class="col-span-4 text-center py-10 text-red-500">搜索失败，请刷新</div>';
  }
}
