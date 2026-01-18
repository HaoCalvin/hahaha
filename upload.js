// 照片上传模块
import { supabase, cloudinaryConfig, APP_CONFIG } from './config.js';
import { authManager } from './auth.js';
import { showNotification, showLoading, hideLoading, formatFileSize } from './utils.js';

class PhotoUploader {
    constructor() {
        this.files = [];
        this.uploadProgress = {};
        this.currentUploads = [];
        this.maxUploads = APP_CONFIG.maxUploadCount;
        this.maxSize = APP_CONFIG.maxUploadSize;
        this.supportedTypes = APP_CONFIG.supportedImageTypes;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuth();
    }

    checkAuth() {
        if (!authManager.isAuthenticated()) {
            window.location.href = 'index.html';
            return;
        }
    }

    bindEvents() {
        // 文件选择
        const fileInput = document.getElementById('file-input');
        const dropZone = document.getElementById('drop-zone');
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }
        
        if (dropZone) {
            // 拖放事件
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
            
            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                this.handleFiles(e.dataTransfer.files);
            });
            
            // 点击选择文件
            dropZone.addEventListener('click', () => {
                fileInput.click();
            });
        }
        
        // 移除文件
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-file-btn')) {
                const fileId = e.target.closest('.file-item').dataset.fileId;
                this.removeFile(fileId);
            }
        });
        
        // 上传按钮
        const uploadBtn = document.getElementById('upload-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.uploadPhotos());
        }
        
        // 取消按钮
        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (confirm('确定要取消上传吗？已上传的文件将不会保存。')) {
                    window.location.href = 'index.html';
                }
            });
        }
        
        // 添加关键词
        const addKeywordBtn = document.getElementById('add-keyword-btn');
        if (addKeywordBtn) {
            addKeywordBtn.addEventListener('click', () => this.addKeywordInput());
        }
        
        // 关键词输入
        const keywordsContainer = document.getElementById('keywords-container');
        if (keywordsContainer) {
            keywordsContainer.addEventListener('keydown', (e) => {
                if (e.target.classList.contains('keyword-input') && e.key === 'Enter') {
                    e.preventDefault();
                    this.addKeywordFromInput(e.target);
                }
            });
        }
        
        // 初始化关键词输入
        this.initializeKeywords();
    }

    handleFiles(fileList) {
        const filesArray = Array.from(fileList);
        
        // 检查文件数量限制
        const remainingSlots = this.maxUploads - this.files.length;
        if (filesArray.length > remainingSlots) {
            showNotification(`最多只能上传${this.maxUploads}张照片，已选择${filesArray.length}张，但只能上传${remainingSlots}张`, 'warning');
            filesArray.splice(remainingSlots);
        }
        
        // 验证每个文件
        filesArray.forEach(file => {
            this.validateAndAddFile(file);
        });
        
        // 更新文件列表显示
        this.updateFileList();
        
        // 更新上传按钮状态
        this.updateUploadButton();
    }

    validateAndAddFile(file) {
        // 检查文件类型
        if (!this.supportedTypes.includes(file.type)) {
            showNotification(`不支持的文件类型: ${file.name}`, 'error');
            return;
        }
        
        // 检查文件大小
        if (file.size > this.maxSize) {
            showNotification(`文件太大: ${file.name} (${formatFileSize(file.size)})，最大支持${formatFileSize(this.maxSize)}`, 'error');
            return;
        }
        
        // 检查总大小
        const currentTotalSize = this.files.reduce((total, f) => total + f.size, 0);
        if (currentTotalSize + file.size > this.maxSize) {
            showNotification(`总文件大小超过限制: ${formatFileSize(this.maxSize)}`, 'error');
            return;
        }
        
        // 生成文件ID
        const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // 创建缩略图
        const reader = new FileReader();
        reader.onload = (e) => {
            const thumbnail = e.target.result;
            
            // 添加到文件列表
            this.files.push({
                id: fileId,
                file: file,
                thumbnail: thumbnail,
                name: file.name,
                size: file.size,
                status: 'pending'
            });
            
            // 更新UI
            this.updateFileList();
            this.updateUploadButton();
        };
        reader.readAsDataURL(file);
    }

    removeFile(fileId) {
        const index = this.files.findIndex(f => f.id === fileId);
        if (index !== -1) {
            this.files.splice(index, 1);
            this.updateFileList();
            this.updateUploadButton();
        }
    }

    updateFileList() {
        const fileList = document.getElementById('file-list');
        const emptyState = document.getElementById('empty-state');
        const filesCount = document.getElementById('files-count');
        const totalSize = document.getElementById('total-size');
        
        if (!fileList || !emptyState || !filesCount || !totalSize) return;
        
        if (this.files.length === 0) {
            fileList.innerHTML = '';
            emptyState.classList.remove('hidden');
            filesCount.textContent = '0';
            totalSize.textContent = '0 MB';
            return;
        }
        
        emptyState.classList.add('hidden');
        
        // 计算总大小
        const totalSizeBytes = this.files.reduce((sum, f) => sum + f.size, 0);
        
        // 更新统计信息
        filesCount.textContent = this.files.length;
        totalSize.textContent = formatFileSize(totalSizeBytes);
        
        // 更新文件列表
        fileList.innerHTML = this.files.map(file => `
            <div class="file-item ${file.status}" data-file-id="${file.id}">
                <div class="file-preview">
                    <img src="${file.thumbnail}" alt="${file.name}">
                    ${file.status === 'uploading' ? `
                        <div class="upload-progress">
                            <div class="progress-bar" style="width: ${file.progress || 0}%"></div>
                        </div>
                    ` : ''}
                    ${file.status === 'error' ? `
                        <div class="upload-error">
                            <i class="fas fa-exclamation-circle"></i>
                        </div>
                    ` : ''}
                </div>
                <div class="file-info">
                    <div class="file-name">${this.escapeHtml(file.name)}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                    ${file.status === 'uploading' ? `
                        <div class="file-status">上传中: ${file.progress || 0}%</div>
                    ` : file.status === 'success' ? `
                        <div class="file-status success">
                            <i class="fas fa-check-circle"></i>
                            <span>上传成功</span>
                        </div>
                    ` : file.status === 'error' ? `
                        <div class="file-status error">
                            <i class="fas fa-exclamation-circle"></i>
                            <span>${file.error || '上传失败'}</span>
                        </div>
                    ` : ''}
                </div>
                <button class="remove-file-btn" ${file.status === 'uploading' ? 'disabled' : ''}>
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    updateUploadButton() {
        const uploadBtn = document.getElementById('upload-btn');
        if (!uploadBtn) return;
        
        const hasFiles = this.files.length > 0;
        const hasRequiredInfo = this.validateRequiredInfo();
        
        uploadBtn.disabled = !hasFiles || !hasRequiredInfo || this.currentUploads.length > 0;
        
        if (this.currentUploads.length > 0) {
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 上传中...';
        } else {
            uploadBtn.innerHTML = '开始上传';
        }
    }

    validateRequiredInfo() {
        // 检查标题
        const titleInput = document.getElementById('photo-title');
        const title = titleInput ? titleInput.value.trim() : '';
        
        // 检查关键词
        const keywords = this.getKeywords();
        
        return title.length > 0 && keywords.length > 0;
    }

    initializeKeywords() {
        // 添加初始关键词输入框
        this.addKeywordInput();
    }

    addKeywordInput() {
        const container = document.getElementById('keywords-container');
        if (!container) return;
        
        const inputId = `keyword-${Date.now()}`;
        const inputHTML = `
            <div class="keyword-input-wrapper">
                <input type="text" 
                       class="keyword-input" 
                       id="${inputId}" 
                       placeholder="输入关键词 (按Enter添加)"
                       maxlength="20">
                <button type="button" class="remove-keyword-btn" data-input-id="${inputId}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', inputHTML);
        
        // 绑定移除按钮事件
        const removeBtn = container.querySelector(`[data-input-id="${inputId}"]`);
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                removeBtn.closest('.keyword-input-wrapper').remove();
                this.updateUploadButton();
            });
        }
        
        // 聚焦到新输入框
        setTimeout(() => {
            const input = document.getElementById(inputId);
            if (input) input.focus();
        }, 10);
    }

    addKeywordFromInput(inputElement) {
        const keyword = inputElement.value.trim();
        
        if (!keyword) return;
        
        // 检查关键词长度
        if (keyword.length > 20) {
            showNotification('关键词不能超过20个字符', 'warning');
            return;
        }
        
        // 检查是否已存在
        const existingKeywords = this.getKeywords();
        if (existingKeywords.includes(keyword)) {
            showNotification('关键词已存在', 'warning');
            return;
        }
        
        // 创建关键词标签
        const keywordsTags = document.getElementById('keywords-tags');
        if (keywordsTags) {
            const tagHTML = `
                <span class="keyword-tag" data-keyword="${this.escapeHtml(keyword)}">
                    ${this.escapeHtml(keyword)}
                    <button type="button" class="remove-tag-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </span>
            `;
            
            keywordsTags.insertAdjacentHTML('beforeend', tagHTML);
            
            // 绑定移除标签事件
            const newTag = keywordsTags.lastElementChild;
            const removeBtn = newTag.querySelector('.remove-tag-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    newTag.remove();
                    this.updateUploadButton();
                });
            }
        }
        
        // 清空输入框并添加新的输入框
        inputElement.value = '';
        
        // 如果没有下一个输入框，添加一个新的
        const keywordInputs = document.querySelectorAll('.keyword-input');
        const hasEmptyInput = Array.from(keywordInputs).some(input => !input.value.trim());
        
        if (!hasEmptyInput) {
            this.addKeywordInput();
        }
        
        this.updateUploadButton();
    }

    getKeywords() {
        const keywords = [];
        
        // 从标签获取关键词
        const keywordTags = document.querySelectorAll('.keyword-tag');
        keywordTags.forEach(tag => {
            const keyword = tag.dataset.keyword;
            if (keyword) {
                keywords.push(keyword);
            }
        });
        
        return keywords;
    }

    async uploadPhotos() {
        if (!authManager.isAuthenticated()) {
            showNotification('请先登录', 'error');
            window.location.href = 'index.html';
            return;
        }
        
        if (this.files.length === 0) {
            showNotification('请选择要上传的照片', 'warning');
            return;
        }
        
        if (!this.validateRequiredInfo()) {
            showNotification('请填写标题和至少一个关键词', 'warning');
            return;
        }
        
        // 获取表单数据
        const title = document.getElementById('photo-title').value.trim();
        const description = document.getElementById('photo-description').value.trim();
        const isPrivate = document.getElementById('photo-private').checked;
        const keywords = this.getKeywords();
        
        try {
            showLoading('正在上传照片...');
            
            // 禁用上传按钮
            const uploadBtn = document.getElementById('upload-btn');
            if (uploadBtn) uploadBtn.disabled = true;
            
            // 批量上传文件
            const uploadPromises = this.files.map(file => 
                this.uploadSingleFile(file, { title, description, isPrivate, keywords })
            );
            
            const results = await Promise.allSettled(uploadPromises);
            
            // 统计结果
            const successfulUploads = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failedUploads = results.filter(r => r.status === 'rejected' || !r.value?.success).length;
            
            hideLoading();
            
            if (successfulUploads > 0) {
                showNotification(`成功上传 ${successfulUploads} 张照片${failedUploads > 0 ? `，${failedUploads} 张失败` : ''}`, 'success');
                
                // 延迟跳转，让用户看到成功消息
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                showNotification('所有照片上传失败，请重试', 'error');
            }
            
        } catch (error) {
            hideLoading();
            console.error('上传过程出错:', error);
            showNotification('上传过程出错，请重试', 'error');
        }
    }

    async uploadSingleFile(fileData, metadata) {
        return new Promise(async (resolve) => {
            try {
                // 更新文件状态为上传中
                fileData.status = 'uploading';
                fileData.progress = 0;
                this.updateFileList();
                
                // 上传到Cloudinary
                const cloudinaryData = await this.uploadToCloudinary(fileData.file, (progress) => {
                    fileData.progress = progress;
                    this.updateFileList();
                });
                
                // 保存到数据库
                const dbResult = await this.saveToDatabase({
                    ...metadata,
                    image_url: cloudinaryData.secure_url,
                    cloudinary_public_id: cloudinaryData.public_id
                });
                
                // 更新文件状态为成功
                fileData.status = 'success';
                this.updateFileList();
                
                resolve({
                    success: true,
                    photoId: dbResult.id,
                    fileId: fileData.id
                });
                
            } catch (error) {
                console.error('上传失败:', error);
                
                // 更新文件状态为错误
                fileData.status = 'error';
                fileData.error = error.message || '上传失败';
                this.updateFileList();
                
                resolve({
                    success: false,
                    error: error.message
                });
            }
        });
    }

    async uploadToCloudinary(file, onProgress) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', cloudinaryConfig.upload_preset);
            formData.append('cloud_name', cloudinaryConfig.cloud_name);
            
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const progress = Math.round((e.loaded / e.total) * 100);
                    onProgress(progress);
                }
            });
            
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (error) {
                        reject(new Error('解析响应失败'));
                    }
                } else {
                    reject(new Error(`上传失败: ${xhr.status}`));
                }
            });
            
            xhr.addEventListener('error', () => {
                reject(new Error('网络错误'));
            });
            
            xhr.addEventListener('abort', () => {
                reject(new Error('上传被取消'));
            });
            
            xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloud_name}/upload`);
            xhr.send(formData);
        });
    }

    async saveToDatabase(photoData) {
        const user = authManager.getCurrentUser();
        
        if (!user) {
            throw new Error('用户未登录');
        }
        
        const { data, error } = await supabase
            .from('photos')
            .insert({
                user_id: user.id,
                title: photoData.title,
                description: photoData.description || null,
                image_url: photoData.image_url,
                cloudinary_public_id: photoData.cloudinary_public_id,
                keywords: photoData.keywords,
                is_private: photoData.isPrivate,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) {
            // 如果数据库保存失败，尝试从Cloudinary删除已上传的图片
            if (photoData.cloudinary_public_id) {
                try {
                    await this.deleteFromCloudinary(photoData.cloudinary_public_id);
                } catch (deleteError) {
                    console.error('删除Cloudinary图片失败:', deleteError);
                }
            }
            
            throw new Error(`保存到数据库失败: ${error.message}`);
        }
        
        return data;
    }

    async deleteFromCloudinary(publicId) {
        const formData = new FormData();
        formData.append('public_id', publicId);
        formData.append('api_key', cloudinaryConfig.api_key);
        formData.append('timestamp', Math.floor(Date.now() / 1000));
        
        // 生成签名
        const signatureString = `public_id=${publicId}&timestamp=${formData.get('timestamp')}${cloudinaryConfig.api_secret}`;
        const signature = await this.generateSHA1(signatureString);
        formData.append('signature', signature);
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloud_name}/image/destroy`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('删除图片失败');
        }
        
        return true;
    }

    async generateSHA1(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 页面加载时初始化上传器
document.addEventListener('DOMContentLoaded', () => {
    window.uploader = new PhotoUploader();
});