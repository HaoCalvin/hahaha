// Supabase配置
const SUPABASE_URL = 'https://szrybhleozpzfwhaoiha.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cnliaGxlb3pwemZ3aGFvaWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzY2NDQsImV4cCI6MjA4NDI1MjY0NH0.d5xOftdoDnwiRLY8L81RDyj1dRc-LO3RE9n57KilwNU';

// Cloudinary配置
const CLOUDINARY_CLOUD_NAME = 'dy77idija';
const CLOUDINARY_UPLOAD_PRESET = 'photo-share-app';
const CLOUDINARY_API_KEY = '263478638476192';
const CLOUDINARY_API_SECRET = 'eplFKZdw3w0jVl2RSaJmNK9tzo';

// 管理员邮箱
const ADMIN_EMAIL = 'haochenxihehaohan@outlook.com';

// 导出配置
window.SUPABASE_CONFIG = {
  supabaseUrl: SUPABASE_URL,
  supabaseKey: SUPABASE_ANON_KEY,
  cloudinaryCloudName: CLOUDINARY_CLOUD_NAME,
  cloudinaryUploadPreset: CLOUDINARY_UPLOAD_PRESET,
  adminEmail: ADMIN_EMAIL
};