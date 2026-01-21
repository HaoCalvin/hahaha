// Supabase配置
const SUPABASE_URL = 'https://szrybhleozpzfwhaoiha.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cnliaGxlb3pwemZ3aGFvaWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzY2NDQsImV4cCI6MjA4NDI1MjY0NH0.d5xOftdoDnwiRLY8L81RDyj1dRc-LO3RE9n57KilwNU';

// 初始化Supabase客户端
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 管理员邮箱
const ADMIN_EMAIL = 'haochenxihehaohan@outlook.com';

// 导出配置
window.supabaseConfig = {
    supabase,
    ADMIN_EMAIL
};