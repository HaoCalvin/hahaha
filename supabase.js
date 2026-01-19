/**
 * Supabase配置和初始化 - 模块化版本
 * 这个文件处理与Supabase后端的连接和数据库操作
 */

// 动态加载 Supabase SDK
async function loadSupabase() {
    // 如果已经加载，直接返回
    if (window.supabase) {
        console.log('Supabase SDK 已加载');
        return window.supabase;
    }
    
    console.log('正在加载 Supabase SDK...');
    
    // 动态创建 script 标签加载 Supabase SDK
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@supabase/supabase-js@2';
        script.onload = () => {
            if (typeof supabase === 'undefined') {
                reject(new Error('Supabase SDK 加载失败'));
                return;
            }
            console.log('Supabase SDK 加载成功');
            window.supabase = supabase;
            resolve(supabase);
        };
        script.onerror = (error) => {
            console.error('加载 Supabase SDK 失败:', error);
            reject(new Error('Supabase SDK 加载失败'));
        };
        document.head.appendChild(script);
    });
}

// Supabase配置
const SUPABASE_URL = 'https://szrybhleozpzfwhaoiha.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cnliaGxlb3pwemZ3aGFvaWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzY2NDQsImV4cCI6MjA4NDI1MjY0NH0.d5xOftdoDnwiRLY8L81RDyj1dRc-LO3RE9n57KilwNU';

// 管理员用户ID
const ADMIN_USER_ID = 'd22a82b2-7343-43f9-a417-126bea312fdd';

// 主初始化函数
async function initializeSupabase() {
    try {
        console.log('正在初始化 Supabase...');
        
        // 加载 Supabase SDK
        await loadSupabase();
        
        // 创建客户端
        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            },
            db: {
                schema: 'public'
            },
            realtime: {
                params: {
                    eventsPerSecond: 10
                }
            },
            global: {
                headers: {
                    'apikey': SUPABASE_ANON_KEY
                }
            }
        });
        
        // 存储到全局
        window.supabaseClient = client;
        
        console.log('✅ Supabase 客户端创建成功');
        return client;
    } catch (error) {
        console.error('❌ Supabase 初始化失败:', error);
        throw error;
    }
}

// 数据库表名常量
const TABLES = {
    PROFILES: 'profiles',
    PHOTOS: 'photos',
    LIKES: 'likes',
    COMMENTS: 'comments',
    FOLLOWS: 'follows'
};

// 等待 Supabase 初始化的函数
async function ensureSupabaseInitialized() {
    if (window.supabaseClient) {
        return window.supabaseClient;
    }
    
    console.log('Supabase 客户端未初始化，正在初始化...');
    return await initializeSupabase();
}

// 获取当前用户（从 Supabase Auth）
async function getCurrentUser() {
    try {
        const supabase = await ensureSupabaseInitialized();
        const { data, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('获取当前用户错误:', error);
            return null;
        }
        
        return data.user;
    } catch (error) {
        console.error('获取当前用户错误:', error);
        return null;
    }
}

// 检查是否为管理员
function isAdmin(user) {
    if (!user) return false;
    return user.id === ADMIN_USER_ID;
}

// 初始化数据库表（第一次运行时调用）
async function initializeDatabase() {
    try {
        const supabase = await ensureSupabaseInitialized();
        console.log('正在初始化数据库...');
        
        // 检查表是否存在，如果不存在会在首次使用时自动创建
        try {
            const { error } = await supabase
                .from(TABLES.PROFILES)
                .select('*')
                .limit(1);
        } catch (error) {
            console.log('数据库表将在首次使用时自动创建');
        }
        
        console.log('数据库初始化完成');
    } catch (error) {
        console.error('数据库初始化错误:', error);
    }
}

// 监听实时更新
async function setupRealtimeListeners() {
    try {
        const supabase = await ensureSupabaseInitialized();
        console.log('正在设置实时监听...');
        
        // 监听照片表的插入和删除
        const photosChannel = supabase
            .channel('photos-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: TABLES.PHOTOS
                },
                (payload) => {
                    console.log('照片表变化:', payload);
                    handlePhotosChange(payload);
                }
            )
            .subscribe();
        
        // 监听点赞表的插入和删除
        const likesChannel = supabase
            .channel('likes-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: TABLES.LIKES
                },
                (payload) => {
                    console.log('点赞表变化:', payload);
                    handleLikesChange(payload);
                }
            )
            .subscribe();
        
        // 监听评论表的插入
        const commentsChannel = supabase
            .channel('comments-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: TABLES.COMMENTS
                },
                (payload) => {
                    console.log('评论表变化:', payload);
                    handleCommentsChange(payload);
                }
            )
            .subscribe();
        
        // 监听关注表的插入和删除
        const followsChannel = supabase
            .channel('follows-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: TABLES.FOLLOWS
                },
                (payload) => {
                    console.log('关注表变化:', payload);
                    handleFollowsChange(payload);
                }
            )
            .subscribe();
        
        console.log('实时监听已设置');
    } catch (error) {
        console.error('设置实时监听错误:', error);
    }
}

// 处理照片表变化
function handlePhotosChange(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch (eventType) {
        case 'INSERT':
            handleNewPhoto(newRecord);
            break;
        case 'DELETE':
            handleDeletedPhoto(oldRecord);
            break;
        case 'UPDATE':
            handleUpdatedPhoto(newRecord);
            break;
    }
}

// 处理新照片
function handleNewPhoto(photo) {
    console.log('新照片添加:', photo);
    
    // 通知所有打开的应用
    if (window.feed && typeof window.feed.addPhotoToFeed === 'function') {
        window.feed.addPhotoToFeed(photo);
    }
    
    // 如果用户在自己的主页，也更新
    if (window.profile && typeof window.profile.handleNewPhoto === 'function') {
        window.profile.handleNewPhoto(photo);
    }
}

// 处理删除照片
function handleDeletedPhoto(photo) {
    console.log('照片删除:', photo);
    
    // 从动态中移除
    const photoCard = document.querySelector(`[data-photo-id="${photo.id}"]`);
    if (photoCard) {
        photoCard.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            photoCard.remove();
        }, 300);
    }
}

// 处理更新照片
function handleUpdatedPhoto(photo) {
    console.log('照片更新:', photo);
    
    // 更新点赞数等
    const likeCountElement = document.querySelector(`[data-photo-id="${photo.id}"] .btn-like span`);
    if (likeCountElement) {
        likeCountElement.textContent = photo.likes_count || 0;
    }
}

// 处理点赞变化
function handleLikesChange(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    if (eventType === 'INSERT') {
        handleNewLike(newRecord);
    } else if (eventType === 'DELETE') {
        handleDeletedLike(oldRecord);
    }
}

// 处理新点赞
function handleNewLike(like) {
    console.log('新点赞:', like);
}

// 处理删除点赞
function handleDeletedLike(like) {
    console.log('删除点赞:', like);
}

// 处理评论变化
function handleCommentsChange(payload) {
    const { new: newRecord } = payload;
    handleNewComment(newRecord);
}

// 处理新评论
function handleNewComment(comment) {
    console.log('新评论:', comment);
}

// 处理关注变化
function handleFollowsChange(payload) {
    console.log('关注变化:', payload);
}

// 用户相关函数
async function getUserProfile(userId) {
    try {
        const supabase = await ensureSupabaseInitialized();
        const { data, error } = await supabase
            .from(TABLES.PROFILES)
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('获取用户资料错误:', error);
        return null;
    }
}

async function updateUserProfile(userId, updates) {
    try {
        const supabase = await ensureSupabaseInitialized();
        const { data, error } = await supabase
            .from(TABLES.PROFILES)
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('更新用户资料错误:', error);
        throw error;
    }
}

// 照片相关函数
async function getPhotos(page = 0, limit = 12, sortBy = 'newest', userId = null) {
    try {
        const supabase = await ensureSupabaseInitialized();
        let query = supabase
            .from(TABLES.PHOTOS)
            .select(`
                *,
                profiles (
                    id,
                    username,
                    avatar_url
                )
            `);
        
        // 筛选用户照片
        if (userId) {
            query = query.eq('user_id', userId);
        }
        
        // 排序
        switch (sortBy) {
            case 'newest':
                query = query.order('created_at', { ascending: false });
                break;
            case 'oldest':
                query = query.order('created_at', { ascending: true });
                break;
            case 'popular':
                query = query.order('likes_count', { ascending: false });
                break;
        }
        
        // 分页
        const from = page * limit;
        const to = from + limit - 1;
        query = query.range(from, to);
        
        const { data, error } = await query;
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('获取照片错误:', error);
        return [];
    }
}

async function searchPhotos(keyword, page = 0, limit = 12) {
    try {
        const supabase = await ensureSupabaseInitialized();
        const { data, error } = await supabase
            .from(TABLES.PHOTOS)
            .select(`
                *,
                profiles (
                    id,
                    username,
                    avatar_url
                )
            `)
            .ilike('keywords', `%${keyword}%`)
            .order('created_at', { ascending: false })
            .range(page * limit, (page + 1) * limit - 1);
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('搜索照片错误:', error);
        return [];
    }
}

async function getPhotoById(photoId) {
    try {
        const supabase = await ensureSupabaseInitialized();
        const { data, error } = await supabase
            .from(TABLES.PHOTOS)
            .select(`
                *,
                profiles (
                    id,
                    username,
                    avatar_url
                )
            `)
            .eq('id', photoId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('获取照片详情错误:', error);
        return null;
    }
}

async function createPhoto(photoData) {
    try {
        const supabase = await ensureSupabaseInitialized();
        
        // 获取当前用户
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            throw new Error('用户未登录，无法上传照片');
        }
        
        // 确保 user_id 与当前用户匹配（管理员除外）
        if (currentUser.id !== ADMIN_USER_ID && photoData.user_id !== currentUser.id) {
            console.warn('用户ID不匹配，使用当前登录用户ID');
            photoData.user_id = currentUser.id;
        }
        
        const { data, error } = await supabase
            .from(TABLES.PHOTOS)
            .insert([photoData])
            .select()
            .single();
        
        if (error) {
            console.error('创建照片错误详情:', error);
            
            // 如果是 RLS 错误，提供更详细的提示
            if (error.message.includes('row-level security') || error.code === '42501') {
                throw new Error('权限错误：请确保已正确设置数据库行级安全策略。需要在Supabase控制台为photos表设置RLS策略。');
            }
            
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('创建照片错误:', error);
        throw error;
    }
}

async function deletePhoto(photoId, userId) {
    try {
        const supabase = await ensureSupabaseInitialized();
        
        // 首先检查用户是否有权限删除
        const { data: photo } = await supabase
            .from(TABLES.PHOTOS)
            .select('user_id, cloudinary_id')
            .eq('id', photoId)
            .single();
        
        if (!photo) {
            throw new Error('照片不存在');
        }
        
        // 检查是否是照片所有者或管理员
        if (photo.user_id !== userId && userId !== ADMIN_USER_ID) {
            throw new Error('没有权限删除此照片');
        }
        
        // 删除照片
        const { error } = await supabase
            .from(TABLES.PHOTOS)
            .delete()
            .eq('id', photoId);
        
        if (error) throw error;
        
        return { success: true, cloudinaryId: photo.cloudinary_id };
    } catch (error) {
        console.error('删除照片错误:', error);
        throw error;
    }
}

// 点赞相关函数
async function toggleLike(photoId, userId) {
    try {
        const supabase = await ensureSupabaseInitialized();
        
        // 检查是否已经点赞
        const { data: existingLike } = await supabase
            .from(TABLES.LIKES)
            .select('*')
            .eq('photo_id', photoId)
            .eq('user_id', userId)
            .single();
        
        if (existingLike) {
            // 取消点赞
            await supabase
                .from(TABLES.LIKES)
                .delete()
                .eq('id', existingLike.id);
            
            // 更新照片点赞数
            await supabase.rpc('decrement_likes_count', { photo_id: photoId });
            
            return { liked: false };
        } else {
            // 添加点赞
            await supabase
                .from(TABLES.LIKES)
                .insert([{
                    photo_id: photoId,
                    user_id: userId
                }]);
            
            // 更新照片点赞数
            await supabase.rpc('increment_likes_count', { photo_id: photoId });
            
            return { liked: true };
        }
    } catch (error) {
        console.error('点赞操作错误:', error);
        throw error;
    }
}

async function getUserLikes(userId) {
    try {
        const supabase = await ensureSupabaseInitialized();
        const { data, error } = await supabase
            .from(TABLES.LIKES)
            .select(`
                photo_id,
                photos (*)
            `)
            .eq('user_id', userId);
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('获取用户点赞错误:', error);
        return [];
    }
}

// 评论相关函数
async function getComments(photoId) {
    try {
        const supabase = await ensureSupabaseInitialized();
        const { data, error } = await supabase
            .from(TABLES.COMMENTS)
            .select(`
                *,
                profiles (
                    id,
                    username,
                    avatar_url
                )
            `)
            .eq('photo_id', photoId)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('获取评论错误:', error);
        return [];
    }
}

async function addComment(photoId, userId, content) {
    try {
        const supabase = await ensureSupabaseInitialized();
        const { data, error } = await supabase
            .from(TABLES.COMMENTS)
            .insert([{
                photo_id: photoId,
                user_id: userId,
                content: content
            }])
            .select(`
                *,
                profiles (
                    id,
                    username,
                    avatar_url
                )
            `)
            .single();
        
        if (error) throw error;
        
        // 更新照片评论数
        await supabase.rpc('increment_comments_count', { photo_id: photoId });
        
        return data;
    } catch (error) {
        console.error('添加评论错误:', error);
        throw error;
    }
}

// 关注相关函数
async function toggleFollow(followerId, followingId) {
    try {
        const supabase = await ensureSupabaseInitialized();
        
        if (followerId === followingId) {
            throw new Error('不能关注自己');
        }
        
        // 检查是否已经关注
        const { data: existingFollow } = await supabase
            .from(TABLES.FOLLOWS)
            .select('*')
            .eq('follower_id', followerId)
            .eq('following_id', followingId)
            .single();
        
        if (existingFollow) {
            // 取消关注
            await supabase
                .from(TABLES.FOLLOWS)
                .delete()
                .eq('id', existingFollow.id);
            
            return { following: false };
        } else {
            // 添加关注
            await supabase
                .from(TABLES.FOLLOWS)
                .insert([{
                    follower_id: followerId,
                    following_id: followingId
                }]);
            
            return { following: true };
        }
    } catch (error) {
        console.error('关注操作错误:', error);
        throw error;
    }
}

async function getFollowers(userId) {
    try {
        const supabase = await ensureSupabaseInitialized();
        const { data, error } = await supabase
            .from(TABLES.FOLLOWS)
            .select(`
                follower_id,
                profiles!follows_follower_id_fkey (
                    id,
                    username,
                    avatar_url
                )
            `)
            .eq('following_id', userId);
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('获取粉丝错误:', error);
        return [];
    }
}

async function getFollowing(userId) {
    try {
        const supabase = await ensureSupabaseInitialized();
        const { data, error } = await supabase
            .from(TABLES.FOLLOWS)
            .select(`
                following_id,
                profiles!follows_following_id_fkey (
                    id,
                    username,
                    avatar_url
                )
            `)
            .eq('follower_id', userId);
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('获取关注列表错误:', error);
        return [];
    }
}

async function checkIfFollowing(followerId, followingId) {
    try {
        const supabase = await ensureSupabaseInitialized();
        const { data, error } = await supabase
            .from(TABLES.FOLLOWS)
            .select('*')
            .eq('follower_id', followerId)
            .eq('following_id', followingId)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return !!data;
    } catch (error) {
        console.error('检查关注状态错误:', error);
        return false;
    }
}

// 统计数据函数
async function getUserStats(userId) {
    try {
        const supabase = await ensureSupabaseInitialized();
        
        // 获取照片数量
        const { count: photosCount } = await supabase
            .from(TABLES.PHOTOS)
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
        
        // 获取粉丝数量
        const { count: followersCount } = await supabase
            .from(TABLES.FOLLOWS)
            .select('*', { count: 'exact', head: true })
            .eq('following_id', userId);
        
        // 获取关注数量
        const { count: followingCount } = await supabase
            .from(TABLES.FOLLOWS)
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', userId);
        
        return {
            photosCount: photosCount || 0,
            followersCount: followersCount || 0,
            followingCount: followingCount || 0
        };
    } catch (error) {
        console.error('获取用户统计错误:', error);
        return {
            photosCount: 0,
            followersCount: 0,
            followingCount: 0
        };
    }
}

// 初始化
async function initSupabase() {
    console.log('开始初始化 Supabase 系统...');
    
    try {
        // 初始化客户端
        await initializeSupabase();
        
        // 初始化数据库
        await initializeDatabase();
        
        // 设置实时监听（稍后启动，等待认证完成）
        setTimeout(async () => {
            await setupRealtimeListeners();
        }, 2000);
        
        console.log('✅ Supabase 系统初始化完成');
        return window.supabaseClient;
    } catch (error) {
        console.error('❌ Supabase 系统初始化失败:', error);
        throw error;
    }
}

// 导出所有函数到全局
window.supabaseFunctions = {
    // 初始化
    init: initSupabase,
    ensureInitialized: ensureSupabaseInitialized,
    
    // 用户函数
    getCurrentUser,
    getUserProfile,
    updateUserProfile,
    isAdmin,
    
    // 照片函数
    getPhotos,
    searchPhotos,
    getPhotoById,
    createPhoto,
    deletePhoto,
    
    // 点赞函数
    toggleLike,
    getUserLikes,
    
    // 评论函数
    getComments,
    addComment,
    
    // 关注函数
    toggleFollow,
    getFollowers,
    getFollowing,
    checkIfFollowing,
    
    // 统计函数
    getUserStats,
    
    // 表名常量
    TABLES,
    
    // 实时监听
    setupRealtimeListeners
};

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 加载完成，开始初始化 Supabase');
    
    // 延迟初始化，确保页面完全加载
    setTimeout(async () => {
        try {
            await initSupabase();
            console.log('✅ Supabase 自动初始化完成');
        } catch (error) {
            console.error('❌ Supabase 自动初始化失败:', error);
        }
    }, 500);
});

console.log('Supabase模块已加载');