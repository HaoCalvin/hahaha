// Supabase配置
const SUPABASE_URL = 'https://szrybhleozpzfwhaoiha.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cnliaGxlb3pwemZ3aGFvaWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzY2NDQsImV4cCI6MjA4NDI1MjY0NH0.d5xOftdoDnwiRLY8L81RDyj1dRc-LO3RE9n57KilwNU';

// Cloudinary配置
const CLOUDINARY_CONFIG = {
    cloud_name: 'dy77idija',
    upload_preset: 'photo-share-app',
    api_key: '263478638476192',
    api_secret: 'eplFKZdw3w0jVl2RSaJmNK9tzo'
};

// 管理员邮箱
const ADMIN_EMAIL = 'haochenxihehaohan@outlook.com';

// 应用配置
const APP_CONFIG = {
    maxUploadCount: 20,
    maxUploadSize: 35 * 1024 * 1024, // 35MB
    supportedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
};

// 初始化Supabase客户端
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { 
    supabase, 
    CLOUDINARY_CONFIG as cloudinaryConfig, 
    ADMIN_EMAIL, 
    APP_CONFIG 
};