// 全局配置 - 直接使用你的信息，无需修改
const CONFIG = {
  SUPABASE_URL: "https://your-project-url.supabase.co", // 替换为你的Supabase Project URL
  SUPABASE_ANON_KEY: "your-anon-public-key", // 替换为你的Supabase anon公钥
  CLOUDINARY_CLOUD_NAME: "dy77idija",
  CLOUDINARY_UPLOAD_PRESET: "photo-share-app",
  ADMIN_EMAIL: "haochenxihehaohan@outlook.com",
  UPLOAD_MAX_COUNT: 20,
  UPLOAD_MAX_TOTAL_SIZE: 35 * 1024 * 1024, // 35MB
  UPLOAD_MAX_SINGLE_SIZE: 5 * 1024 * 1024, // 5MB
  THEME_DEFAULT: "light"
};

// 全局变量
let supabase;
let currentUser = null;
let isAdmin = false;
let uploadedImages = []; // 存储上传的图片信息
let currentPhotoId = null; // 当前查看的照片ID
let currentProfileUserId = null; // 当前查看的用户ID

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 初始化Supabase
  supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  // 初始化主题
  initTheme();
  // 初始化事件监听
  initEventListeners();
  // 检查用户登录状态
  await checkUserAuth();
  // 初始化Cloudinary上传组件
  initCloudinaryUpload();
  // 加载首页数据
  await loadExploreData('newest');
  await loadHotData();
  await loadDiscussionData();
  // 导航栏滚动效果
  initNavbarScroll();
});

// 1. 基础工具方法
/**
 * 初始化Supabase客户端
 */
function createClient(url, key) {
  return window.supabase.createClient(url, key);
}

/**
 * 显示提示框
 * @param {string} msg 提示信息
 * @param {string} type 类型：success/error/info
 */
function showToast(msg, type = 'info') {
  // 移除已存在的toast
  const oldToast = document.querySelector('.toast');
  if (oldToast) oldToast.remove();
  // 创建toast
  const toast = document.createElement('div');
  toast.className = `toast fixed bottom-6 left-1/2 -translate-x-1/2 py-3 px-6 rounded-lg shadow-lg z-50 transition-all duration-300 ${
    type === 'success' ? 'bg-green-500 text-white' :
    type === 'error' ? 'bg-red-500 text-white' :
    'bg-gray-800 text-white'
  }`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  // 3秒后隐藏
  setTimeout(() => {
    toast.style.opacity = 0;
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * 格式化时间
 * @param {string} time 时间戳
 * @returns 格式化后的时间
 */
function formatTime(time) {
  if (!time) return '未知时间';
  const date = new Date(time);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 验证关键词（最少1个）
 * @param {string} keywords 关键词字符串
 * @returns {array} 验证后的关键词数组
 */
function validateKeywords(keywords) {
  if (!keywords) return [];
  // 去重、去空、转小写
  return keywords.split(',').map(k => k.trim()).filter(k => k).map(k => k.toLowerCase());
}

/**
 * 隐藏所有模态框
 */
function hideAllModals() {
  document.querySelectorAll('.modal-close').forEach(btn => {
    const modal = btn.closest('[id$="-modal"]');
    if (modal) modal.classList.add('hidden');
  });
  // 重置表单
  document.querySelectorAll('form').forEach(form => form.reset());
  uploadedImages = [];
  document.getElementById('upload-preview').classList.add('hidden');
  document.getElementById('upload-form').classList.add('hidden');
}

/**
 * 隐藏所有内容区，显示指定区
 * @param {string} id 要显示的区域ID
 */
function showContentSection(id) {
  const sections = ['home', 'explore', 'hot', 'discussion', 'profile', 'my-photos', 'edit-profile', 'search-result', 'related'];
  sections.forEach(sec => {
    document.getElementById(sec).classList.add('hidden');
  });
  document.getElementById(id).classList.remove('hidden');
  // 回到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 2. 主题相关方法
/**
 * 初始化主题
 */
function initTheme() {
  const savedTheme = localStorage.getItem('photo-share-theme') || CONFIG.THEME_DEFAULT;
  document.documentElement.className = savedTheme;
  // 高亮当前主题按钮
  highlightThemeBtn(savedTheme);
}

/**
 * 切换主题
 * @param {string} theme 主题：light/dark/white
 */
function switchTheme(theme) {
  document.documentElement.className = theme;
  localStorage.setItem('photo-share-theme', theme);
  highlightThemeBtn(theme);
  showToast(`已切换为${theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '白色'}模式`);
}

/**
 * 高亮当前主题按钮
 * @param {string} theme 主题
 */
function highlightThemeBtn(theme) {
  // 电脑端
  document.querySelectorAll('#light-mode, #dark-mode, #white-mode').forEach(btn => {
    btn.classList.remove('bg-primary/20', 'text-primary');
  });
  // 手机端
  document.querySelectorAll('#mobile-light-mode, #mobile-dark-mode, #mobile-white-mode').forEach(btn => {
    btn.classList.remove('bg-primary/20', 'text-primary');
  });
  // 高亮
  document.getElementById(theme + '-mode')?.classList.add('bg-primary/20', 'text-primary');
  document.getElementById('mobile-' + theme + '-mode')?.classList.add('bg-primary/20', 'text-primary');
}

// 3. 认证相关方法
/**
 * 检查用户登录状态
 */
async function checkUserAuth() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    showToast('检查登录状态失败', 'error');
    return;
  }
  currentUser = user;
  // 更新用户状态
  updateUserAuthUI();
  if (currentUser) {
    // 获取用户信息
    await getUserProfile(currentUser.id);
    // 判断是否为管理员
    isAdmin = currentUser.email === CONFIG.ADMIN_EMAIL;
    if (isAdmin) showToast('管理员已登录', 'success');
  }
}

/**
 * 更新登录/未登录UI
 */
function updateUserAuthUI() {
  const isLogin = !!currentUser;
  // 电脑端
  document.getElementById('auth-buttons').classList.toggle('hidden', isLogin);
  document.getElementById('user-menu').classList.toggle('hidden', !isLogin);
  // 手机端
  document.getElementById('mobile-auth-buttons').classList.toggle('hidden', isLogin);
  document.getElementById('mobile-user-menu').classList.toggle('hidden', !isLogin);
  // 上传/发布讨论按钮
  document.getElementById('upload-btn').classList.toggle('hidden', !isLogin);
  document.getElementById('mobile-upload-btn').classList.toggle('hidden', !isLogin);
  document.getElementById('create-discussion-btn').classList.toggle('hidden', !isLogin);
  // 评论输入框
  document.getElementById('comment-form').classList.toggle('hidden', !isLogin);
}

/**
 * 注册账号
 * @param {string} email 邮箱
 * @param {string} password 密码
 */
async function register(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
      showToast('注册成功，已发送验证邮件', 'success');
      hideAllModals();
      await checkUserAuth();
    }
  } catch (err) {
    showToast(err.message || '注册失败', 'error');
  }
}

/**
 * 登录账号
 * @param {string} email 邮箱
 * @param {string} password 密码
 * @param {boolean} remember 是否记住
 */
async function login(email, password, remember = false) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      // 记住登录（Supabase默认持久化）
      showToast('登录成功', 'success');
      hideAllModals();
      await checkUserAuth();
      // 重新加载数据
      await loadExploreData('newest');
      await loadHotData();
      await loadDiscussionData();
    }
  } catch (err) {
    showToast(err.message || '登录失败', 'error');
  }
}

/**
 * 社交登录
 * @param {string} provider 提供商：google/facebook
 */
async function socialLogin(provider) {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.href }
    });
    if (error) throw error;
  } catch (err) {
    showToast(err.message || '社交登录失败', 'error');
  }
}

/**
 * 忘记密码
 * @param {string} email 邮箱
 */
async function forgotPassword(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.href
    });
    if (error) throw error;
    showToast('重置邮件已发送，请注意查收', 'success');
    hideAllModals();
  } catch (err) {
    showToast(err.message || '发送重置邮件失败', 'error');
  }
}

/**
 * 退出登录
 */
async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    currentUser = null;
    isAdmin = false;
    updateUserAuthUI();
    showToast('退出登录成功', 'success');
    // 重新加载数据
    await loadExploreData('newest');
    await loadHotData();
    await loadDiscussionData();
    // 回到首页
    showContentSection('home');
  } catch (err) {
    showToast(err.message || '退出登录失败', 'error');
  }
}

// 4. 用户资料相关方法
/**
 * 获取用户资料
 * @param {string} userId 用户ID
 */
async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    // 更新全局用户信息
    currentUser.profile = data;
    // 更新UI
    updateUserProfileUI(data);
    return data;
  } catch (err) {
    showToast('获取用户资料失败', 'error');
    return null;
  }
}

/**
 * 更新用户资料UI
 * @param {object} profile 用户资料
 */
function updateUserProfileUI(profile) {
  if (!profile) return;
  // 电脑端
  document.getElementById('user-avatar').src = profile.avatar_url;
  // 手机端
  document.getElementById('mobile-user-avatar').src = profile.avatar_url;
  document.getElementById('mobile-username').textContent = profile.username;
  // 编辑资料页
  document.getElementById('edit-avatar-preview').src = profile.avatar_url;
  document.getElementById('edit-username').value = profile.username;
  document.getElementById('edit-bio').value = profile.bio;
}

/**
 * 更新用户资料
 * @param {object} data 要更新的资料
 */
async function updateUserProfile(data) {
  try {
    if (!currentUser) throw new Error('请先登录');
    const { data: res, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', currentUser.id);
    if (error) throw error;
    showToast('资料更新成功', 'success');
    // 重新获取用户资料
    await getUserProfile(currentUser.id);
    // 回到个人主页
    goToUserProfile(currentUser.id);
  } catch (err) {
    showToast(err.message || '资料更新失败', 'error');
  }
}

/**
 * 上传头像
 * @param {File} file 头像文件
 */
async function uploadAvatar(file) {
  try {
    if (!file) throw new Error('请选择头像文件');
    // 验证文件大小
    if (file.size > CONFIG.UPLOAD_MAX_SINGLE_SIZE) {
      throw new Error('头像大小不能超过5MB');
    }
    // 上传到Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CONFIG.CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'avatars');
    formData.append('resource_type', 'image');

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!data.secure_url) throw new Error('头像上传失败');
    // 更新用户资料
    await updateUserProfile({ avatar_url: data.secure_url });
    return data.secure_url;
  } catch (err) {
    showToast(err.message || '头像上传失败', 'error');
    return null;
  }
}

/**
 * 关注/取消关注用户
 * @param {string} targetUserId 目标用户ID
 */
async function toggleFollow(targetUserId) {
  try {
    if (!currentUser) throw new Error('请先登录');
    if (currentUser.id === targetUserId) throw new Error('不能关注自己');
    // 检查是否已关注
    const { data: followData } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', currentUser.id)
      .eq('following_id', targetUserId)
      .single();
    if (followData) {
      // 取消关注
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('id', followData.id);
      if (error) throw error;
      showToast('取消关注成功', 'success');
      updateFollowBtnUI(false);
    } else {
      // 关注
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: currentUser.id, following_id: targetUserId });
      if (error) throw error;
      showToast('关注成功', 'success');
      updateFollowBtnUI(true);
    }
    // 重新加载用户资料
    await loadUserProfile(targetUserId);
  } catch (err) {
    showToast(err.message || '操作失败', 'error');
  }
}

/**
 * 更新关注按钮UI
 * @param {boolean} isFollowing 是否已关注
 */
function updateFollowBtnUI(isFollowing) {
  document.getElementById('follow-btn').classList.toggle('hidden', isFollowing);
  document.getElementById('unfollow-btn').classList.toggle('hidden', !isFollowing);
}

/**
 * 加载用户资料
 * @param {string} userId 用户ID
 */
async function loadUserProfile(userId) {
  try {
    currentProfileUserId = userId;
    // 获取用户资料
    const profile = await getUserProfile(userId);
    if (!profile) throw new Error('用户不存在');
    // 更新个人主页UI
    document.getElementById('profile-avatar').src = profile.avatar_url;
    document.getElementById('profile-username').textContent = profile.username;
    document.getElementById('profile-username').dataset.uid = userId;
    document.getElementById('profile-bio').textContent = profile.bio;
    // 获取用户作品数
    const { data: photosData } = await supabase
      .from('photos')
      .select('*')
      .eq('user_id', userId);
    const photosCount = photosData ? photosData.length : 0;
    document.getElementById('profile-photos-count').textContent = photosCount;
    // 获取关注数
    const { data: followingData } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', userId);
    const followingCount = followingData ? followingData.length : 0;
    document.getElementById('profile-following-count').textContent = followingCount;
    // 获取粉丝数
    const { data: followerData } = await supabase
      .from('follows')
      .select('*')
      .eq('following_id', userId);
    const followerCount = followerData ? followerData.length : 0;
    document.getElementById('profile-follower-count').textContent = followerCount;
    // 加载用户作品
    await loadUserPhotos(userId);
    // 更新关注按钮
    if (currentUser) {
      if (currentUser.id === userId) {
        // 自己的主页，显示编辑资料
        document.getElementById('follow-btn').classList.add('hidden');
        document.getElementById('unfollow-btn').classList.add('hidden');
        document.getElementById('edit-profile-btn').classList.remove('hidden');
      } else {
        // 他人主页，显示关注/取消关注
        document.getElementById('edit-profile-btn').classList.add('hidden');
        const { data: followData } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId)
          .single();
        updateFollowBtnUI(!!followData);
      }
    } else {
      // 未登录，隐藏所有按钮
      document.getElementById('follow-btn').classList.add('hidden');
      document.getElementById('unfollow-btn').classList.add('hidden');
      document.getElementById('edit-profile-btn').classList.add('hidden');
    }
    // 显示个人主页
    showContentSection('profile');
  } catch (err) {
    showToast(err.message || '加载用户资料失败', 'error');
  }
}

/**
 * 跳转到用户个人主页
 * @param {string} userId 用户ID
 */
function goToUserProfile(userId) {
  loadUserProfile(userId);
}

// 5. 照片相关方法
/**
 * 初始化Cloudinary上传
 */
function initCloudinaryUpload() {
  const uploadBtn = document.getElementById('cloudinary-upload-btn');
  uploadBtn.addEventListener('click', () => {
    if (!currentUser) {
      showToast('请先登录', 'error');
      document.getElementById('login-modal').classList.remove('hidden');
      return;
    }
    // 打开Cloudinary上传窗口
    window.cloudinary.openUploadWidget({
      cloudName: CONFIG.CLOUDINARY_CLOUD_NAME,
      uploadPreset: CONFIG.CLOUDINARY_UPLOAD_PRESET,
      folder: 'photos',
      resourceType: 'image',
      maxFiles: CONFIG.UPLOAD_MAX_COUNT,
      maxFileSize: CONFIG.UPLOAD_MAX_SINGLE_SIZE,
      multiple: true,
      accept: 'image/*',
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
      showAdvancedOptions: false,
      cropping: false,
      autoClose: true,
      disablePageScroll: true
    }, (error, result) => {
      if (error) {
        showToast('上传失败：' + error.message, 'error');
        return;
      }
      if (result && result.event === 'success') {
        // 处理上传结果
        handleCloudinaryUpload(result.info);
      }
    });
  });
}

/**
 * 处理Cloudinary上传结果
 * @param {object} info 上传信息
 */
function handleCloudinaryUpload(info) {
  try {
    // 验证总大小
    const totalSize = uploadedImages.reduce((sum, img) => sum + img.size, 0) + info.bytes;
    if (totalSize > CONFIG.UPLOAD_MAX_TOTAL_SIZE) {
      showToast('总上传大小不能超过35MB', 'error');
      return;
    }
    // 验证数量
    if (uploadedImages.length >= CONFIG.UPLOAD_MAX_COUNT) {
      showToast('最多只能上传20张图片', 'error');
      return;
    }
    // 添加到上传列表
    uploadedImages.push({
      url: info.secure_url,
      size: info.bytes,
      name: info.original_filename
    });
    // 显示预览
    showUploadPreview();
    // 显示表单
    document.getElementById('upload-form').classList.remove('hidden');
  } catch (err) {
    showToast(err.message || '处理上传文件失败', 'error');
  }
}

/**
 * 显示上传预览
 */
function showUploadPreview() {
  const previewContainer = document.getElementById('upload-preview');
  previewContainer.classList.remove('hidden');
  previewContainer.innerHTML = '';
  uploadedImages.forEach((img, index) => {
    const previewItem = document.createElement('div');
    previewItem.className = 'relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700';
    previewItem.innerHTML = `
      <img src="${img.url}" alt="预览${index+1}" class="w-full h-20 object-cover">
      <button class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex justify-center items-center hover:bg-black/70" onclick="removeUploadedImage(${index})">
        <i class="fas fa-times text-xs"></i>
      </button>
    `;
    previewContainer.appendChild(previewItem);
  });
}

/**
 * 移除已上传的图片
 * @param {number} index 索引
 */
function removeUploadedImage(index) {
  uploadedImages.splice(index, 1);
  if (uploadedImages.length === 0) {
    document.getElementById('upload-preview').classList.add('hidden');
    document.getElementById('upload-form').classList.add('hidden');
  } else {
    showUploadPreview();
  }
}

/**
 * 发布照片
 * @param {object} formData 表单数据
 */
async function publishPhoto(formData) {
  try {
    if (!currentUser) throw new Error('请先登录');
    if (uploadedImages.length === 0) throw new Error('请先选择图片');
    const { title, keywords, isPrivate } = formData;
    // 验证关键词
    const keywordList = validateKeywords(keywords);
    if (keywordList.length === 0) throw new Error('最少输入1个关键词');
    // 批量发布
    const photosToInsert = uploadedImages.map(img => ({
      user_id: currentUser.id,
      title,
      image_url: img.url,
      keywords: keywordList,
      is_private: isPrivate || false
    }));
    const { error } = await supabase
      .from('photos')
      .insert(photosToInsert);
    if (error) throw error;
    showToast('发布成功', 'success');
    hideAllModals();
    // 重置上传列表
    uploadedImages = [];
    // 重新加载数据
    await loadExploreData('newest');
    await loadHotData();
    // 跳转到我的作品
    showContentSection('my-photos');
    await loadMyPhotos('all');
  } catch (err) {
    showToast(err.message || '发布失败', 'error');
  }
}

/**
 * 加载发现页数据
 * @param {string} sort 排序方式：newest/hottest/random
 */
async function loadExploreData(sort) {
  const exploreGrid = document.getElementById('explore-grid');
  exploreGrid.innerHTML = '<div class="col-span-full flex justify-center items-center py-12 text-gray-500">加载中...</div>';
  try {
    let query = supabase
      .from('photos')
      .select(`
        *,
        profiles:user_id (id, username, avatar_url)
      `)
      .eq('is_private', false);
    // 排序
    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sort === 'hottest') {
      query = query.order('likes', { ascending: false });
    }
    const { data, error } = await query;
    if (error) throw error;
    // 渲染数据
    renderPhotoGrid(exploreGrid, data);
  } catch (err) {
    exploreGrid.innerHTML = '<div class="col-span-full flex justify-center items-center py-12 text-gray-500">加载失败，请刷新重试</div>';
    showToast('加载发现页失败', 'error');
  }
}

/**
 * 加载热门数据
 */
async function loadHotData() {
  const hotGrid = document.getElementById('hot-grid');
  hotGrid.innerHTML = '<div class="col-span-full flex justify-center items-center py-12 text-gray-500">加载中...</div>';
  try {
    const { data, error } = await supabase
      .from('photos')
      .select(`
        *,
        profiles:user_id (id, username, avatar_url)
      `)
      .eq('is_private', false)
      .order('likes', { ascending: false })
      .limit(20);
    if (error) throw error;
    // 渲染数据
    renderPhotoGrid(hotGrid, data);
  } catch (err) {
    hotGrid.innerHTML = '<div class="col-span-full flex justify-center items-center py-12 text-gray-500">加载失败，请刷新重试</div>';
    showToast('加载热门页失败', 'error');
  }
}

/**
 * 加载我的作品
 * @param {string} type 类型：all/public/private
 */
async function loadMyPhotos(type) {
  if (!currentUser) {
    document.getElementById('my-photos-grid').innerHTML = '<div class="col-span-full flex justify-center items-center py-12 text-gray-500">请先登录</div>';
    return;
  }
  const myPhotosGrid = document.getElementById('my-photos-grid');
  myPhotosGrid.innerHTML = '<div class="col-span-full flex justify-center items-center py-12 text-gray-500">加载中...</div>';
  try {
    let query = supabase
      .from('photos')
      .select(`
        *,
        profiles:user_id (id, username, avatar_url)
      `)
      .eq('user_id', currentUser.id);
    // 筛选
    if (type === 'public') {
      query = query.eq('is_private', false);
    } else if (type === 'private') {
      query = query.eq('is_private', true);
    }
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    // 渲染数据
    if (data.length === 0) {
      myPhotosGrid.innerHTML = '<div class="col-span-full flex justify-center items-center py-12 text-gray-500">还没有上传作品，快去上传吧~</div>';
      return;
    }
    renderPhotoGrid(myPhotosGrid, data);
    // 高亮筛选按钮
    document.querySelectorAll('#my-photos-all, #my-photos-public, #my-photos-private').forEach(btn => {
      btn.classList.remove('bg-primary', 'text-white');
      btn.classList.add('border', 'border-gray-200', 'dark:border-gray-700');
    });
    document.getElementById(`my-photos-${type}`).classList.remove('border', 'border-gray-200', 'dark:border-gray-700');
    document.getElementById(`my-photos-${type}`).classList.add('bg-primary', 'text-white');
  } catch (err) {
    myPhotosGrid.innerHTML = '<div class="col-span-full flex justify-center items-center py-12 text-gray-500">加载失败，请刷新重试</div>';
    showToast('加载我的作品失败', 'error');
  }
}

/**
 * 加载用户作品
 * @param {string} userId 用户ID
 */
async function loadUserPhotos(userId) {
  const profilePhotosGrid = document.getElementById('profile-photos-grid');
  profilePhotosGrid.innerHTML = '<div class="col-span-full flex justify-center items-center py-12 text-gray-500">加载中...</div>';
  try {
    let query = supabase
      .from('photos')
      .select(`
        *,
        profiles:user_id (id, username, avatar_url)
      `)
      .eq('user_id', userId);
    // 非自己/非管理员，只显示公开
    if (!currentUser || (currentUser.id !== userId && !isAdmin)) {
      query = query.eq('is_private', false);
    }
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    // 渲染数据
    if (data.length === 0) {
      profilePhotosGrid.innerHTML = '<div class="col-span-full flex justify-center items-center py-12 text-gray-500">暂无作品</div>';
      return;
    }
    renderPhotoGrid(profilePhotosGrid, data);
  } catch (err) {
    profilePhotosGrid.innerHTML = '<div class="col-span-full flex justify-center items-center py-12 text-gray-500">加载失败，请刷新重试</div>';
    showToast('加载用户作品失败', 'error');
  }
}

/**
 * 渲染照片网格
 * @param {HTMLElement} container 容器
 * @param {array} photos 照片数据
 */
function renderPhotoGrid(container, photos) {
  if (!photos || photos.length === 0) {
    container.innerHTML = '<div class="col-span-full flex justify-center items-center py-12 text-gray-500">暂无内容</div>';
    return;
  }
  container.innerHTML = '';
  photos.forEach(photo => {
    const photoCard = document.createElement('div');
    photoCard.className = 'rounded-lg overflow-hidden card-shadow dark:card-shadow-dark hover:scale-[1.02] transition-transform duration-300 cursor-pointer bg-white dark:bg-gray-800 white:bg-white';
    photoCard.innerHTML = `
      <div class="relative">
        <img src="${photo.image_url}" alt="${photo.title}" class="w-full h-48 object-cover lazy-load" onclick="openPhotoDetail('${photo.id}')">
        ${photo.is_private ? '<div class="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex justify-center items-center"><i class="fas fa-lock text-xs"></i></div>' : ''}
        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <div class="flex justify-between items-center">
            <span class="text-white text-sm font-medium truncate max-w-[70%]">${photo.title}</span>
            <span class="text-white text-sm flex items-center gap-1">
              <i class="fas fa-heart text-red-500"></i>
              ${photo.likes || 0}
            </span>
          </div>
        </div>
      </div>
      <div class="p-3">
        <div class="flex items-center gap-2 mb-2">
          <img src="${photo.profiles?.avatar_url || 'https://res.cloudinary.com/dy77idija/image/upload/v1737200000/avatar-default.png'}" alt="${photo.profiles?.username}" class="w-6 h-6 rounded-full object-cover" onclick="goToUserProfile('${photo.user_id}')">
          <span class="text-sm font-medium" onclick="goToUserProfile('${photo.user_id}')">${photo.profiles?.username || '未知用户'}</span>
        </div>
        <div class="flex flex-wrap gap-1">
          ${photo.keywords.map(key => `<span class="text-xs py-1 px-2 rounded-full bg-gray-100 dark:bg-gray-700 white:bg-gray-100">${key}</span>`).join('')}
        </div>
      </div>
    `;
    container.appendChild(photoCard);
  });
  // 懒加载图片
  initLazyLoad();
}

/**
 * 打开照片详情
 * @param {string} photoId 照片ID
 */
async function openPhotoDetail(photoId) {
  currentPhotoId = photoId;
  const modal = document.getElementById('photo-detail-modal');
  modal.classList.remove('hidden');
  try {
    // 获取照片详情
    const { data: photo, error } = await supabase
      .from('photos')
      .select(`
        *,
        profiles:user_id (id, username, avatar_url)
      `)
      .eq('id', photoId)
      .single();
    if (error) throw error;
    // 检查是否有权限查看（私有且非作者/非管理员）
    if (photo.is_private && (!currentUser || currentUser.id !== photo.user_id && !isAdmin)) {
      throw new Error('该作品为私密内容，无权查看');
    }
    // 更新详情UI
    document.getElementById('detail-image').src = photo.image_url;
    document.getElementById('detail-user-avatar').src = photo.profiles?.avatar_url || 'https://res.cloudinary.com/dy77idija/image/upload/v1737200000/avatar-default.png';
    document.getElementById('detail-user-avatar').dataset.uid = photo.user_id;
    document.getElementById('detail-username').textContent = photo.profiles?.username || '未知用户';
    document.getElementById('detail-username').dataset.uid = photo.user_id;
    document.getElementById('detail-created-at').textContent = formatTime(photo.created_at);
    document.getElementById('detail-title').textContent = photo.title;
    document.getElementById('detail-like-count').textContent = photo.likes || 0;
    document.getElementById('detail-like-btn').dataset.pid = photoId;
    // 关键词
    const keywordsContainer = document.getElementById('detail-keywords');
    keywordsContainer.innerHTML = '';
    photo.keywords.forEach(key => {
      const keyTag = document.createElement('span');
      keyTag.className = 'py-1 px-3 rounded-full bg-gray-100 dark:bg-gray-700 white:bg-gray-100 text-sm';
      keyTag.textContent = key;
      keywordsContainer.appendChild(keyTag);
    });
    // 隐私标签
    document.getElementById('detail-private-tag').classList.toggle('hidden', !photo.is_private);
    // 管理员删除按钮
    document.getElementById('admin-delete-btn').classList.toggle('hidden', !isAdmin);
    document.getElementById('admin-delete-btn').dataset.pid = photoId;
    // 检查是否已点赞
    await checkIsLiked(photoId);
    // 加载评论
    await loadComments(photoId);
    // 加载相关内容
    await loadRelatedContent(photo.keywords);
  } catch (err) {
    showToast(err.message || '加载照片详情失败', 'error');
    modal.classList.add('hidden');
  }
}

/**
 * 点赞/取消点赞
 * @param {string} photoId 照片ID
 */
async function toggleLike(photoId) {
  try {
    if (!currentUser) {
      showToast('请先登录', 'error');
      document.getElementById('login-modal').classList.remove('hidden');
      return;
    }
    // 检查是否已点赞
    const { data: likeData, error: likeError } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('photo_id', photoId)
      .single();
    if (likeError && likeError.code !== 'PGRST116') throw likeError;
    const likeIcon = document.getElementById('detail-like-icon');
    const likeCount = document.getElementById('detail-like-count');
    if (likeData) {
      // 取消点赞
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('id', likeData.id);
      if (deleteError) throw deleteError;
      // 更新点赞数
      await updateLikeCount(photoId, -1);
      likeIcon.classList.remove('fas', 'text-red-500');
      likeIcon.classList.add('far');
      likeCount.textContent = parseInt(likeCount.textContent) - 1;
    } else {
      // 点赞
      const { error: insertError } = await supabase
        .from('likes')
        .insert({ user_id: currentUser.id, photo_id: photoId });
      if (insertError) throw insertError;
      // 更新点赞数
      await updateLikeCount(photoId, 1);
      likeIcon.classList.remove('far');
      likeIcon.classList.add('fas', 'text-red-500');
      likeCount.textContent = parseInt(likeCount.textContent) + 1;
    }
  } catch (err) {
    showToast(err.message || '点赞操作失败', 'error');
  }
}

/**
 * 更新点赞数
 * @param {string} photoId 照片ID
 * @param {number} num 增减数：1/-1
 */
async function updateLikeCount(photoId, num) {
  try {
    const { data: photo } = await supabase
      .from('photos')
      .select('likes')
      .eq('id', photoId)
      .single();
    const newLikes = (photo.likes || 0) + num;
    const { error } = await supabase
      .from('photos')
      .update({ likes: newLikes })
      .eq('id', photoId);
    if (error) throw error;
  } catch (err) {
    showToast('更新点赞数失败', 'error');
  }
}

/**
 * 检查是否已点赞
 * @param {string} photoId 照片ID
 */
async function checkIsLiked(photoId) {
  if (!currentUser) return;
  try {
    const { data: likeData } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('photo_id', photoId)
      .single();
    const likeIcon = document.getElementById('detail-like-icon');
    if (likeData) {
      likeIcon.classList.remove('far');
      likeIcon.classList.add('fas', 'text-red-500');
    } else {
      likeIcon.classList.remove('fas', 'text-red-500');
      likeIcon.classList.add('far');
    }
  } catch (err) {
    // 未点赞时会报错，忽略
  }
}

/**
 * 删除照片（管理员）
 * @param {string} photoId 照片ID
 */
async function deletePhoto(photoId) {
  if (!confirm('确定要删除该作品吗？此操作不可恢复！')) return;
  try {
    if (!isAdmin) throw new Error('无删除权限');
    // 删除照片
    const { error: photoError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId);
    if (photoError) throw photoError;
    // 删除相关点赞
    const { error: likeError } = await supabase
      .from('likes')
      .delete()
      .eq('photo_id', photoId);
    if (likeError) throw likeError;
    // 删除相关评论
    const { error: commentError } = await supabase
      .from('comments')
      .delete()
      .eq('photo_id', photoId);
    if (commentError) throw commentError;
    showToast('删除成功', 'success');
    // 关闭详情框
    document.getElementById('photo-detail-modal').classList.add('hidden');
    // 重新加载数据
    await loadExploreData('newest');
    await loadHotData();
  } catch (err) {
    showToast(err.message || '删除失败', 'error');
  }
}

// 6. 评论相关方法
/**
 * 加载评论
 * @param {string} photoId 照片ID
 */
async function loadComments(photoId) {
  const commentList = document.getElementById('comment-list');
  commentList.innerHTML = '<div class="text-center text-gray-500 py-4">加载评论中...</div>';
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (id, username, avatar_url)
      `)
      .eq('photo_id', photoId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    // 更新评论数
    document.getElementById('comment-count').textContent = data.length || 0;
    // 渲染评论
    if (data.length === 0) {
      commentList.innerHTML = '<div class="text-center text-gray-500 py-4">暂无评论，快来抢沙发吧~</div>';
      return;
    }
    commentList.innerHTML = '';
    data.forEach(comment => {
      const commentItem = document.createElement('div');
      commentItem.className = 'flex gap-3 pb-4 border-b border-gray-200 dark:border-gray-700 white:border-gray-100 last:border-0 last:pb-0';
      commentItem.innerHTML = `
        <img src="${comment.profiles?.avatar_url || 'https://res.cloudinary.com/dy77idija/image/upload/v1737200000/avatar-default.png'}" alt="${comment.profiles?.username}" class="w-10 h-10 rounded-full object-cover flex-shrink-0" onclick="goToUserProfile('${comment.user_id}')">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-medium cursor-pointer" onclick="goToUserProfile('${comment.user_id}')">${comment.profiles?.username || '未知用户'}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400 white:text-gray-500">${formatTime(comment.created_at)}</span>
          </div>
          <p class="text-sm">${comment.content}</p>
        </div>
      `;
      commentList.appendChild(commentItem);
    });
  } catch (err) {
    commentList.innerHTML = '<div class="text-center text-gray-500 py-4">加载评论失败</div>';
    showToast('加载评论失败', 'error');
  }
}

/**
 * 发布评论
 * @param {string} photoId 照片ID
 * @param {string} content 评论内容
 */
async function publishComment(photoId, content) {
  try {
    if (!currentUser) throw new Error('请先登录');
    if (!content || content.trim() === '') throw new Error('评论内容不能为空');
    // 发布评论
    const { error } = await supabase
      .from('comments')
      .insert({
        user_id: currentUser.id,
        photo_id: photoId,
        content: content.trim()
      });
    if (error) throw error;
    showToast('评论成功', 'success');
    // 重置输入框
    document.getElementById('comment-input').value = '';
    // 重新加载评论
    await loadComments(photoId);
  } catch (err) {
    showToast(err.message || '评论失败', 'error');
  }
}

// 7. 搜索相关方法
/**
 * 智能搜索
 * @param {string} keyword 关键词
 */
async function searchContent(keyword) {
  if (!keyword || keyword.trim() === '') {
    showToast('请输入搜索关键词', 'info');
    return;
  }
  const searchKey = keyword.trim().toLowerCase();
  const searchResultGrid = document.getElementById('search-result-grid');
  const searchResultTitle = document.getElementById('search-result-title');
  // 更新标题
  searchResultTitle.textContent = `搜索结果：${searchKey}`;
  // 显示搜索结果区
  showContentSection('search-result');
  searchResultGrid.innerHTML = '<div class="col-span-full flex justify-center items-center py-12 text-gray-500">搜索中...</div>';
  try {
    // 先搜索用户
    const { data: userData } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', `%${searchKey}%`);
    const userIds = userData ? userData.map(u => u.id) : [];
    // 搜索照片：关键词包含 或 用户名包含 或 标题包含
    const { data, error } = await supabase
      .from('photos')
      .select(`
        *,
        profiles:user_id (id, username, avatar_url)
      `)
      .or(`keywords.cs.{"${searchKey}"},title.ilike.%${searchKey}%,user_id.in.(${userIds.join(',')})`)
      .eq('is_private', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    // 渲染结果
    renderPhotoGrid(searchResultGrid, data);
  } catch (err) {
    searchResultGrid.innerHTML = '<div class="col-span-full flex justify-center items-center py-12 text-gray-500">搜索失败，请刷新重试</div>';
    showToast('搜索失败', 'error');
  }
}

// 8. 相关内容方法
/**
 * 加载相关内容
 * @param {array} keywords 关键词数组
 */
async function loadRelatedContent(keywords) {
  if (!keywords || keywords.length === 0) return;
  const relatedGrid = document.getElementById('related-grid');
  relatedGrid.innerHTML = '';
  try {
    // 取前3个关键词搜索
    const key = keywords.slice(0, 3).join('|');
    const { data, error } = await supabase
      .from('photos')
      .select(`
        *,
        profiles:user_id (id, username, avatar_url)
      `)
      .or(keywords.map(k => `keywords.cs.{"${k}"}`).join(','))
      .eq('is_private', false)
      .neq('id', currentPhotoId)
      .order('likes', { ascending: false })
      .limit(8);
    if (error) throw error;
    // 渲染相关内容
    renderPhotoGrid(relatedGrid, data);
    // 显示相关内容区
    document.getElementById('related').classList.remove('hidden');
  } catch (err) {
    showToast('加载相关内容失败', 'error');
  }
}

// 9. 讨论区相关方法
/**
 * 加载讨论区数据
 */
async function loadDiscussionData() {
  const discussionList = document.getElementById('discussion-list');
  discussionList.innerHTML = '<div class="w-full p-6 rounded-lg border border-dashed text-gray-500 text-center">加载中...</div>';
  try {
    const { data, error } = await supabase
      .from('discussions')
      .select(`
        *,
        profiles:user_id (id, username, avatar_url)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    // 渲染讨论区
    if (data.length === 0) {
      discussionList.innerHTML = '<div class="w-full p-6 rounded-lg border border-dashed text-gray-500 text-center">暂无讨论，快来发布第一条讨论吧~</div>';
      return;
    }
    discussionList.innerHTML = '';
    data.forEach(discussion => {
      const discussionItem = document.createElement('div');
      discussionItem.className = 'bg-white dark:bg-gray-800 white:bg-white rounded-lg card-shadow dark:card-shadow-dark p-6 hover:scale-[1.01] transition-transform duration-300 cursor-pointer';
      discussionItem.innerHTML = `
        <div class="flex items-center gap-3 mb-4">
          <img src="${discussion.profiles?.avatar_url || 'https://res.cloudinary.com/dy77idija/image/upload/v1737200000/avatar-default.png'}" alt="${discussion.profiles?.username}" class="w-10 h-10 rounded-full object-cover" onclick="goToUserProfile('${discussion.user_id}')">
          <div>
            <span class="font-medium cursor-pointer" onclick="goToUserProfile('${discussion.user_id}')">${discussion.profiles?.username || '未知用户'}</span>
            <p class="text-sm text-gray-500 dark:text-gray-400 white:text-gray-500">${formatTime(discussion.created_at)}</p>
          </div>
        </div>
        <h3 class="text-xl font-bold mb-2" onclick="openDiscussionDetail('${discussion.id}')">${discussion.title}</h3>
        <p class="text-gray-600 dark:text-gray-300 white:text-gray-600 line-clamp-2 mb-4" onclick="openDiscussionDetail('${discussion.id}')">${discussion.content}</p>
        <div class="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 white:text-gray-500">
          <span><i class="fas fa-eye mr-1"></i>${discussion.views || 0} 浏览</span>
          <span><i class="fas fa-comment mr-1"></i> 评论</span>
        </div>
      `;
      discussionList.appendChild(discussionItem);
    });
  } catch (err) {
    discussionList.innerHTML = '<div class="w-full p-6 rounded-lg border border-dashed text-gray-500 text-center">加载失败，请刷新重试</div>';
    showToast('加载讨论区失败', 'error');
  }
}

/**
 * 发布讨论
 * @param {object} formData 表单数据
 */
async function publishDiscussion(formData) {
  try {
    if (!currentUser) throw new Error('请先登录');
    const { title, content } = formData;
    if (!title || title.trim() === '') throw new Error('讨论标题不能为空');
    if (!content
