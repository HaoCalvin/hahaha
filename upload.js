// 上传功能模块
class UploadManager {
    constructor() {
        this.selectedFile = null;
        this.keywords = [];
        this.init();
    }
    
    // 初始化上传模块
    init() {
        // 文件选择按钮
        const selectFileBtn = document.getElementById('select-file-btn');
        const fileInput = document.getElementById('file-input');
        const uploadBox = document.getElementById('upload-box');
        
        // 点击选择文件按钮
        selectFileBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        // 点击上传区域
        uploadBox.addEventListener('click', () => {
            fileInput.click();
        });
        
        // 拖放上传
        uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadBox.style.borderColor = 'var(--primary-color)';
            uploadBox.style.backgroundColor = 'rgba(108, 99, 255, 0.1)';
        });
        
        uploadBox.addEventListener('dragleave', () => {
            uploadBox.style.borderColor = 'var(--border-color)';
            uploadBox.style.backgroundColor = '';
        });
        
        uploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadBox.style.borderColor = 'var(--border-color)';
            uploadBox.style.backgroundColor = '';
            
            if (e.dataTransfer.files.length > 0) {
                this.handleFileSelect(e.dataTransfer.files[0]);
            }
        });
        
        // 文件选择变化
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });
        
        // 关键词输入
        const keywordInput = document.getElementById('keyword-input');
        const addKeywordBtn = document.getElementById('add-keyword-btn');
        const keywordsTags = document.getElementById('keywords-tags');
        
        // 添加关键词按钮
        addKeywordBtn.addEventListener('click', () => {
            this.addKeyword(keywordInput.value.trim());
            keywordInput.value = '';
            keywordInput.focus();
        });
        
        // 按回车添加关键词
        keywordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addKeyword(keywordInput.value.trim());
                keywordInput.value = '';
            }
        });
        
        // 提交上传
        const submitUploadBtn = document.getElementById('submit-upload-btn');
        submitUploadBtn.addEventListener('click', () => {
            this.submitUpload();
        });
        
        // 取消上传
        const cancelUploadBtn = document.getElementById('cancel-upload-btn');
        cancelUploadBtn.addEventListener('click', () => {
            this.resetUploadForm();
        });
    }
    
    // 处理文件选择
    async handleFileSelect(file) {
        // 检查文件大小
        if (file.size > MAX_FILE_SIZE) {
            authManager.showToast('文件大小不能超过25MB', 'error');
            return;
        }
        
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            authManager.showToast('请选择图片文件', 'error');
            return;
        }
        
        this.selectedFile = file;
        
        // 显示上传表单
        document.getElementById('upload-box').style.display = 'none';
        document.getElementById('upload-form').style.display = 'block';
        
        // 预览图片
        const reader = new FileReader();
        reader.onload = (e) => {
            const photoPreview = document.getElementById('photo-preview');
            photoPreview.innerHTML = `<img src="${e.target.result}" alt="预览">`;
        };
        reader.readAsDataURL(file);
        
        // 重置关键词
        this.keywords = [];
        this.updateKeywordsDisplay();
    }
    
    // 添加关键词
    addKeyword(keyword) {
        if (!keyword) return;
        
        // 检查关键词是否已存在
        if (this.keywords.includes(keyword)) {
            authManager.showToast('关键词已存在', 'warning');
            return;
        }
        
        // 添加关键词
        this.keywords.push(keyword);
        this.updateKeywordsDisplay();
    }
    
    // 移除关键词
    removeKeyword(index) {
        this.keywords.splice(index, 1);
        this.updateKeywordsDisplay();
    }
    
    // 更新关键词显示
    updateKeywordsDisplay() {
        const keywordsTags = document.getElementById('keywords-tags');
        
        if (this.keywords.length === 0) {
            keywordsTags.innerHTML = '<div class="empty-keywords">暂无关键词</div>';
            return;
        }
        
        keywordsTags.innerHTML = this.keywords.map((keyword, index) => `
            <div class="keyword-tag-input">
                ${keyword}
                <button class="remove-keyword" data-index="${index}">&times;</button>
            </div>
        `).join('');
        
        // 添加移除关键词事件
        keywordsTags.querySelectorAll('.remove-keyword').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.removeKeyword(index);
            });
        });
    }
    
    // 提交上传
    async submitUpload() {
        // 检查是否已登录
        if (!authManager.isLoggedIn()) {
            authManager.showToast('请先登录再上传照片', 'error');
            return;
        }
        
        // 验证表单
        const title = document.getElementById('photo-title').value.trim();
        const description = document.getElementById('photo-description').value.trim();
        
        if (!title) {
            authManager.showToast('请输入照片标题', 'error');
            return;
        }
        
        if (this.keywords.length === 0) {
            authManager.showToast('请至少添加一个关键词', 'error');
            return;
        }
        
        // 显示上传进度
        document.getElementById('upload-form').style.display = 'none';
        document.getElementById('upload-progress').style.display = 'block';
        
        try {
            // 上传到Cloudinary
            const imageUrl = await this.uploadToCloudinary(this.selectedFile);
            
            // 保存到数据库
            await this.saveToDatabase(title, description, imageUrl, this.keywords);
            
            // 重置表单
            this.resetUploadForm();
            
            // 显示成功消息
            authManager.showToast('照片上传成功！', 'success');
            
            // 返回首页
            document.getElementById('home-link').click();
            
            // 刷新照片列表
            if (window.galleryManager) {
                window.galleryManager.loadPhotos();
            }
            
        } catch (error) {
            console.error('上传失败:', error);
            authManager.showToast(`上传失败: ${error.message}`, 'error');
            
            // 返回上传表单
            document.getElementById('upload-progress').style.display = 'none';
            document.getElementById('upload-form').style.display = 'block';
        }
    }
    
    // 上传到Cloudinary
    async uploadToCloudinary(file) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
            
            const xhr = new XMLHttpRequest();
            
            // 上传进度
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    this.updateUploadProgress(percent, `上传中: ${percent}%`);
                }
            });
            
            // 上传完成
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response.secure_url);
                } else {
                    reject(new Error('上传失败'));
                }
            });
            
            // 上传错误
            xhr.addEventListener('error', () => {
                reject(new Error('上传失败，请检查网络连接'));
            });
            
            // 开始上传
            this.updateUploadProgress(0, '准备上传...');
            xhr.open('POST', CLOUDINARY_UPLOAD_URL);
            xhr.send(formData);
        });
    }
    
    // 保存到数据库
    async saveToDatabase(title, description, imageUrl, keywords) {
        const user = authManager.getCurrentUser();
        
        // 更新上传进度
        this.updateUploadProgress(95, '保存到数据库...');
        
        const { data, error } = await supabase
            .from('photos')
            .insert([
                {
                    title,
                    description,
                    image_url: imageUrl,
                    keywords,
                    user_id: user.id,
                    user_name: user.user_metadata?.username || user.email?.split('@')[0],
                    user_email: user.email,
                    created_at: new Date().toISOString()
                }
            ]);
        
        if (error) {
            throw new Error(`保存失败: ${error.message}`);
        }
        
        // 更新上传进度
        this.updateUploadProgress(100, '上传完成！');
        
        return data;
    }
    
    // 更新上传进度
    updateUploadProgress(percent, status) {
        const progressFill = document.getElementById('progress-fill');
        const progressPercent = document.getElementById('progress-percent');
        const uploadStatus = document.getElementById('upload-status');
        
        progressFill.style.width = `${percent}%`;
        progressPercent.textContent = `${percent}%`;
        uploadStatus.textContent = status;
    }
    
    // 重置上传表单
    resetUploadForm() {
        this.selectedFile = null;
        this.keywords = [];
        
        // 重置表单元素
        document.getElementById('photo-title').value = '';
        document.getElementById('photo-description').value = '';
        document.getElementById('keyword-input').value = '';
        document.getElementById('keywords-tags').innerHTML = '<div class="empty-keywords">暂无关键词</div>';
        document.getElementById('photo-preview').innerHTML = '';
        
        // 显示上传框
        document.getElementById('upload-progress').style.display = 'none';
        document.getElementById('upload-form').style.display = 'none';
        document.getElementById('upload-box').style.display = 'block';
        
        // 重置文件输入
        document.getElementById('file-input').value = '';
    }
}

// 创建全局上传管理器实例
window.uploadManager = new UploadManager();