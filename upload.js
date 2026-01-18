// 照片上传相关函数

class UploadManager {
    constructor() {
        this.supabase = null;
        this.files = [];
        this.uploadedImages = [];
        this.currentUploadIndex = 0;
        this.maxFiles = 20;
        this.maxTotalSize = 35 * 1024 * 1024; // 35MB
        this.init();
    }

    init() {
        // 初始化Supabase客户端
        this.supabase = supabase.createClient(
            window.SUPABASE_CONFIG.supabaseUrl,
            window.SUPABASE_CONFIG.supabaseKey
        );
        
        // 初始化文件上传事件
        this.initFileUpload();
        
        // 初始化拖放上传
        this.initDragAndDrop();
    }

    initFileUpload() {
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');
        
        if (fileInput && uploadArea) {
            fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }
    }

    initDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('drag-over');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                
                if (e.dataTransfer.files.length) {
                    this.handleFiles(e.dataTransfer.files);
                }
            });
        }
    }

    handleFiles(fileList) {
        // 检查文件数量
        if (fileList.length > this.maxFiles) {
            showMessage(`最多只能上传${this.maxFiles}张照片`, 'error');
            return;
        }
        
        // 检查总文件大小
        let totalSize = 0;
        Array.from(fileList).forEach(file => {
            totalSize += file.size;
        });
        
        if (totalSize > this.maxTotalSize) {
            showMessage(`总文件大小不能超过35MB`, 'error');
            return;
        }
        
        // 验证文件类型
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
        const invalidFiles = Array.from(fileList).filter(file => 
            !validTypes.includes(file.type)
        );
        
        if (invalidFiles.length > 0) {
            showMessage('只支持JPG、PNG、GIF和WebP格式的图片', 'error');
            return;
        }
        
        // 添加到文件列表
        this.files = Array.from(fileList);
        this.showUploadForm();
        this.showPreviews();
    }

    showUploadForm() {
        const uploadArea = document.getElementById('uploadArea');
        const uploadForm = document.getElementById('uploadForm');
        
        if (uploadArea && uploadForm) {
            uploadArea.style.display = 'none';
            uploadForm.style.display = 'block';
        }
    }

    showPreviews() {
        const previewsContainer = document.getElementById('uploadedPreviews');
        
        if (!previewsContainer) return;
        
        previewsContainer.innerHTML = '';
        
        this.files.forEach((file, index) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const previewDiv = document.createElement('div');
                previewDiv.className = 'upload-preview';
                previewDiv.innerHTML = `
                    <img src="${e.target.result}" alt="预览">
                    <button class="remove-preview" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                
                previewsContainer.appendChild(previewDiv);
                
                // 添加移除按钮事件
                const removeBtn = previewDiv.querySelector('.remove-preview');
                removeBtn.addEventListener('click', () => {
                    this.removeFile(index);
                });
            };
            
            reader.readAsDataURL(file);
        });
    }

    removeFile(index) {
        this.files.splice(index, 1);
        this.showPreviews();
        
        // 如果没有文件了，显示上传区域
        if (this.files.length === 0) {
            this.resetUploadForm();
        }
    }

    resetUploadForm() {
        const uploadArea = document.getElementById('uploadArea');
        const uploadForm = document.getElementById('uploadForm');
        
        if (uploadArea && uploadForm) {
            uploadArea.style.display = 'block';
            uploadForm.style.display = 'none';
            
            // 重置表单
            document.getElementById('photoTitle').value = '';
            document.getElementById('photoDescription').value = '';
            document.getElementById('photoKeywords').value = '';
            document.getElementById('isPrivate').checked = false;
            
            this.files = [];
            this.uploadedImages = [];
            
            // 隐藏进度条
            const progressBar = document.getElementById('uploadProgress');
            if (progressBar) {
                progressBar.style.display = 'none';
            }
        }
    }

    async uploadToCloudinary(file) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', window.SUPABASE_CONFIG.cloudinaryUploadPreset);
            formData.append('cloud_name', window.SUPABASE_CONFIG.cloudinaryCloudName);
            
            fetch(`https://api.cloudinary.com/v1_1/${window.SUPABASE_CONFIG.cloudinaryCloudName}/upload`, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    reject(data.error.message);
                } else {
                    resolve({
                        url: data.secure_url,
                        public_id: data.public_id
                    });
                }
            })
            .catch(error => {
                reject('上传失败: ' + error.message);
            });
        });
    }

    async uploadPhotos() {
        if (!authManager.isAuthenticated()) {
            showMessage('请先登录再上传照片', 'error');
            openAuthModal();
            return;
        }
        
        if (this.files.length === 0) {
            showMessage('请选择要上传的照片', 'error');
            return;
        }
        
        const keywords = document.getElementById('photoKeywords').value.trim();
        if (!keywords) {
            showMessage('请输入至少一个关键词', 'error');
            return;
        }
        
        const keywordsArray = keywords.split(',').map(k => k.trim()).filter(k => k);
        if (keywordsArray.length === 0) {
            showMessage('请输入有效的关键词', 'error');
            return;
        }
        
        showLoading();
        
        // 显示上传进度
        const progressBar = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressBar) {
            progressBar.style.display = 'block';
            progressFill.style.width = '0%';
            progressText.textContent = '准备上传...';
        }
        
        this.uploadedImages = [];
        this.currentUploadIndex = 0;
        
        try {
            for (let i = 0; i < this.files.length; i++) {
                this.currentUploadIndex = i;
                
                // 更新进度
                const progress = Math.round((i / this.files.length) * 100);
                if (progressFill) {
                    progressFill.style.width = `${progress}%`;
                }
                if (progressText) {
                    progressText.textContent = `上传中 ${i + 1}/${this.files.length}...`;
                }
                
                // 上传到Cloudinary
                const cloudinaryResult = await this.uploadToCloudinary(this.files[i]);
                
                // 保存到数据库
                const photoData = {
                    user_id: authManager.currentUser.id,
                    title: document.getElementById('photoTitle').value.trim() || `照片 ${i + 1}`,
                    description: document.getElementById('photoDescription').value.trim(),
                    image_url: cloudinaryResult.url,
                    cloudinary_id: cloudinaryResult.public_id,
                    keywords: keywordsArray,
                    is_private: document.getElementById('isPrivate').checked
                };
                
                const { error } = await this.supabase
                    .from('photos')
                    .insert([photoData]);
                
                if (error) throw error;
                
                this.uploadedImages.push(photoData);
            }
            
            // 完成上传
            if (progressFill) {
                progressFill.style.width = '100%';
            }
            if (progressText) {
                progressText.textContent = '上传完成！';
            }
            
            // 延迟显示成功消息
            setTimeout(() => {
                hideLoading();
                showMessage(`成功上传 ${this.files.length} 张照片！`, 'success');
                
                // 重置表单
                this.resetUploadForm();
                
                if (progressBar) {
                    progressBar.style.display = 'none';
                }
                
                // 刷新照片列表
                loadPhotos();
                
                // 切换到探索页面
                switchPage('explore');
            }, 1000);
            
        } catch (error) {
            hideLoading();
            showMessage(`上传失败: ${error}`, 'error');
            
            if (progressBar) {
                progressBar.style.display = 'none';
            }
        }
    }

    async updatePhoto(photoId, updates) {
        try {
            const { error } = await this.supabase
                .from('photos')
                .update(updates)
                .eq('id', photoId);
            
            if (error) throw error;
            
            return true;
        } catch (error) {
            console.error('更新照片错误:', error);
            return false;
        }
    }

    async deletePhoto(photoId, cloudinaryId = null) {
        try {
            // 如果有Cloudinary ID，从Cloudinary删除
            if (cloudinaryId) {
                try {
                    const formData = new FormData();
                    formData.append('public_id', cloudinaryId);
                    formData.append('api_key', window.SUPABASE_CONFIG.CLOUDINARY_API_KEY);
                    formData.append('timestamp', Math.floor(Date.now() / 1000));
                    
                    // 生成签名（这里简化处理，实际应用中应在后端进行）
                    const signatureString = `public_id=${cloudinaryId}&timestamp=${Math.floor(Date.now() / 1000)}${window.SUPABASE_CONFIG.CLOUDINARY_API_SECRET}`;
                    const signature = await this.generateSHA1(signatureString);
                    formData.append('signature', signature);
                    
                    await fetch(`https://api.cloudinary.com/v1_1/${window.SUPABASE_CONFIG.cloudinaryCloudName}/image/destroy`, {
                        method: 'POST',
                        body: formData
                    });
                } catch (cloudinaryError) {
                    console.warn('Cloudinary删除失败:', cloudinaryError);
                }
            }
            
            // 从数据库删除
            const { error } = await this.supabase
                .from('photos')
                .delete()
                .eq('id', photoId);
            
            if (error) throw error;
            
            return true;
        } catch (error) {
            console.error('删除照片错误:', error);
            return false;
        }
    }

    async generateSHA1(str) {
        // 简单的SHA1生成函数，实际应用中应该使用更安全的方法
        // 这里为了简化，直接返回一个模拟的签名
        return 'simulated_signature_for_demo';
    }
}

// 全局上传管理器实例
let uploadManager;

// 初始化上传管理器
document.addEventListener('DOMContentLoaded', () => {
    uploadManager = new UploadManager();
});

// 暴露全局函数
window.uploadManager = uploadManager;