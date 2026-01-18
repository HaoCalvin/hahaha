// 全局配置中心 - 已填好你的Supabase URL和ANON_KEY，无需修改
export const SUPABASE_CONFIG = {
  URL: "https://szrybhleozpzfwhaoiha.supabase.co",
  ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cnliaGxlb3pwemZ3aGFvaWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzY2NDQsImV4cCI6MjA4NDI1MjY0NH0.d5xOftdoDnwiRLY8L81RDyj1dRc-LO3RE9n57KilwNU",
  DB_SCHEMA: "public",
  TABLES: {
    USERS: "profiles",
    PHOTOS: "photos",
    LIKES: "likes",
    COMMENTS: "comments",
    FOLLOWS: "follows",
    DISCUSSIONS: "discussions"
  }
};

// Cloudinary配置（已适配，无需修改）
export const CLOUDINARY_CONFIG = {
  CLOUD_NAME: "dy77idija",
  UPLOAD_PRESET: "photo-share-app",
  FOLDERS: {
    AVATARS: "avatars",
    PHOTOS: "photos"
  },
  ALLOWED_FORMATS: ["jpg", "jpeg", "png", "gif"],
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  MAX_TOTAL_SIZE: 35 * 1024 * 1024,
  MAX_FILE_COUNT: 20
};

// 项目基础配置
export const APP_CONFIG = {
  NAME: "PhotoShare",
  ADMIN_EMAIL: "haochenxihehaohan@outlook.com",
  DEFAULT_AVATAR: "https://res.cloudinary.com/dy77idija/image/upload/v1737200000/avatar-default.png",
  DEFAULT_THEME: "light",
  PAGE_SIZE: {
    EXPLORE: 20,
    HOT: 20,
    PROFILE: 16,
    SEARCH: 20
  },
  CACHE_TIME: 5 * 60 * 1000,
  TOKEN_EXPIRE: 7 * 24 * 60 * 60 * 1000
};

// 接口状态码配置
export const STATUS_CODE = {
  SUCCESS: 200,
  ERROR: 500,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATE_ERROR: 422
};

// 提示语配置
export const MESSAGES = {
  LOGIN_SUCCESS: "登录成功",
  LOGIN_FAILED: "登录失败，请检查账号密码",
  REGISTER_SUCCESS: "注册成功，验证邮件已发送",
  REGISTER_FAILED: "注册失败",
  LOGOUT_SUCCESS: "退出登录成功",
  UPLOAD_SUCCESS: "上传成功",
  UPLOAD_FAILED: "上传失败",
  PUBLISH_SUCCESS: "发布成功",
  PUBLISH_FAILED: "发布失败",
  LIKE_SUCCESS: "点赞成功",
  CANCEL_LIKE: "取消点赞",
  COMMENT_SUCCESS: "评论成功",
  COMMENT_FAILED: "评论失败",
  FOLLOW_SUCCESS: "关注成功",
  UNFOLLOW_SUCCESS: "取消关注成功",
  NO_PERMISSION: "无操作权限",
  NEED_LOGIN: "请先登录",
  LOAD_FAILED: "加载失败，请刷新重试",
  SEARCH_EMPTY: "暂无搜索结果",
  DELETE_SUCCESS: "删除成功",
  DELETE_FAILED: "删除失败",
  PARAM_ERROR: "参数错误"
};
