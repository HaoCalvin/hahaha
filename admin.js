// 管理员功能模块
class AdminManager {
    constructor() {
        this.init();
    }
    
    // 初始化管理员模块
    init() {
        // 监听认证状态变化，检查管理员权限
        supabase.auth.onAuthStateChange((event, session) => {
            if (session && session.user.email === ADMIN_EMAIL) {
                this.addAdminFeatures();
            }
        });
        
        // 初始检查
        if (authManager.isUserAdmin()) {
            this.addAdminFeatures();
        }
    }
    
    // 添加管理员功能
    addAdminFeatures() {
        console.log('管理员功能已启用');
        
        // 可以在这里添加额外的管理员功能
        // 例如：管理面板链接、批量删除功能等
        
        // 在导航栏添加管理员徽章
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            const adminBadge = document.createElement('div');
            adminBadge.className = 'admin-badge';
            adminBadge.textContent = '管理员';
            adminBadge.style.cssText = `
                background-color: var(--secondary-color);
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                margin-top: 5px;
                display: inline-block;
            `;
            userInfo.appendChild(adminBadge);
        }
    }
    
    // 批量删除照片（管理员功能）
    async deleteMultiplePhotos(photoIds) {
        if (!authManager.isUserAdmin()) {
            authManager.showToast('只有管理员可以执行此操作', 'error');
            return false;
        }
        
        const confirmDelete = confirm(`确定要删除这 ${photoIds.length} 张照片吗？此操作不可撤销。`);
        if (!confirmDelete) return false;
        
        try {
            authManager.showLoading(true);
            
            // 批量删除照片
            const { error } = await supabase
                .from('photos')
                .delete()
                .in('id', photoIds);
            
            if (error) throw error;
            
            authManager.showToast(`成功删除 ${photoIds.length} 张照片`, 'success');
            return true;
            
        } catch (error) {
            console.error('批量删除照片失败:', error);
            authManager.showToast('删除照片失败', 'error');
            return false;
        } finally {
            authManager.showLoading(false);
        }
    }
    
    // 获取所有照片（管理员功能）
    async getAllPhotos(limit = 100) {
        if (!authManager.isUserAdmin()) {
            authManager.showToast('只有管理员可以查看所有照片', 'error');
            return [];
        }
        
        try {
            authManager.showLoading(true);
            
            const { data: photos, error } = await supabase
                .from('photos')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            
            return photos || [];
            
        } catch (error) {
            console.error('获取所有照片失败:', error);
            authManager.showToast('获取照片失败', 'error');
            return [];
        } finally {
            authManager.showLoading(false);
        }
    }
    
    // 获取所有用户（管理员功能）
    async getAllUsers(limit = 100) {
        if (!authManager.isUserAdmin()) {
            authManager.showToast('只有管理员可以查看所有用户', 'error');
            return [];
        }
        
        try {
            authManager.showLoading(true);
            
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('*')
                .limit(limit);
            
            if (error) throw error;
            
            return profiles || [];
            
        } catch (error) {
            console.error('获取所有用户失败:', error);
            authManager.showToast('获取用户失败', 'error');
            return [];
        } finally {
            authManager.showLoading(false);
        }
    }
}

// 创建全局管理员管理器实例
window.adminManager = new AdminManager();