// 你的Supabase配置（无需修改）
export const SUPABASE_CONFIG = {
  URL: 'https://szrybhleozpzfwhaoiha.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cnliaGxlb3pwemZ3aGFvaWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzY2NDQsImV4cCI6MjA4NDI1MjY0NH0.d5xOftdoDnwiRLY8L81RDyj1dRc-LO3RE9n57KilwNU',
  TABLES: {
    USERS: 'profiles', // 用户资料表名
    PHOTOS: 'photos',   // 照片表名
    DISCUSSIONS: 'discussions' // 讨论表名
  }
};

// 你的Cloudinary配置（无需修改）
export const CLOUDINARY_CONFIG = {
  CLOUD_NAME: 'dy77idija',
  API_KEY: '263478638476192',
  API_SECRET: 'eplFKZdw3w0jVl2RSaJmNK9tzo',
  UPLOAD_PRESET: 'photo-share-app',
  FOLDERS: {
    AVATARS: 'photo-share/avatars', // 头像存储文件夹
    PHOTOS: 'photo-share/photos'    // 照片存储文件夹
  },
  ALLOWED_FORMATS: ['jpg', 'jpeg', 'png', 'gif'],
  MAX_FILE_SIZE: 5242880 // 5MB
};

// 应用基础配置
export const APP_CONFIG = {
  DEFAULT_AVATAR: 'https://picsum.photos/200/200', // 默认头像
  ADMIN_EMAIL: 'your-admin-email@example.com', // 可替换为你的邮箱
  PAGE_SIZE: {
    EXPLORE: 20, // 发现页每页加载数量
    HOT: 20,     // 热门页每页加载数量
    MY_PHOTOS: 20 // 我的照片每页加载数量
  }
};

// 全局提示语
export const MESSAGES = {
  LOGIN_SUCCESS: '登录成功！',
  LOGIN_FAILED: '登录失败',
  REGISTER_SUCCESS: '注册成功！可直接登录',
  REGISTER_FAILED: '注册失败',
  LOGOUT_SUCCESS: '退出登录成功',
  LOAD_FAILED: '数据加载失败',
  UPLOAD_FAILED: '文件上传失败',
  PUBLISH_SUCCESS: '发布成功！',
  PUBLISH_FAILED: '发布失败',
  SEARCH_EMPTY: '暂无搜索结果',
  NEED_LOGIN: '请先登录！'
};

// 状态码（备用）
export const STATUS_CODE = {
  SUCCESS: 200,
  ERROR: 500,
  UNAUTHORIZED: 401
};
