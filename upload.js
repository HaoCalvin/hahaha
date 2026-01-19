/**
 * 图片上传管理模块
 * 处理图片选择、预览、上传和验证
 */

// 上传状态
let uploadState = {
    currentFile: null,
    isUploading: false,
    progress: 0,
    uploadError: null
};

// 初始化上传模块
function initUploadModule() {
    console.log('正在初始化上传模块...');
    
    // 获取DOM元素
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const removeImageBtn = document.getElementById('removeImage');
    const submitUploadBtn = document.getElementById('submitUpload');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const uploadError = document.getElementById('uploadError');
    
    if (!uploadArea || !imageInput) {
        console.error('上传模块必需的DOM元素未找到');
        return;
    }
    
    // 点击上传区域选择文件
    uploadArea.addEventListener('click', () => {
        if (!uploadState.isUploading) {
            imageInput.click();
        }
    });
    
    // 拖放上传
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('drag-over');
        
        if (uploadState.isUploading) return;
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
    
    // 文件选择变化
    imageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
    
    // 移除图片
    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', removeSelectedImage);
    }
    
    // 提交上传
    if (submitUploadBtn) {
        submitUploadBtn.addEventListener('click', handleUploadSubmit);
    }
    
    console.log('上传模块初始化完成');
}

// 处理文件选择
function handleFileSelect(file) {
    // 重置错误状态
    clearUploadError();
    
    // 验证文件
    const validation = window.cloudinary?.validateImageFile(file);
    if (!validation || !validation.isValid) {
        showUploadError(validation?.errors?.[0] || '无效的文件');
        return;
    }
    
    // 显示预览
    showImagePreview(file);
    
    // 启用上传按钮
    const submitUploadBtn = document.getElementById('submitUpload');
    if (submitUploadBtn) {
        submitUploadBtn.disabled = false;
    }
    
    // 保存当前文件
    uploadState.currentFile = file;
}

// 显示图片预览
async function showImagePreview(file) {
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const uploadArea = document.getElementById('uploadArea');
    
    if (!previewContainer || !imagePreview || !uploadArea) return;
    
    try {
        // 创建预览
        const previewUrl = await window.cloudinary?.createImagePreview(file, 400);
        
        if (previewUrl) {
            imagePreview.src = previewUrl;
            previewContainer.style.display = 'block';
            uploadArea.style.display = 'none';
        }
    } catch (error) {
        console.error('创建预览错误:', error);
        showUploadError('无法创建图片预览');
    }
}

// 移除选择的图片
function removeSelectedImage() {
    const previewContainer = document.getElementById('previewContainer');
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    const submitUploadBtn = document.getElementById('submitUpload');
    
    if (previewContainer) previewContainer.style.display = 'none';
    if (uploadArea) uploadArea.style.display = 'block';
    if (imageInput) imageInput.value = '';
    if (submitUploadBtn) submitUploadBtn.disabled = true;
    
    // 重置状态
    uploadState.currentFile = null;
    clearUploadError();
}

// 处理上传提交
async function handleUploadSubmit() {
    // 检查用户是否登录
    if (!window.auth?.isAuthenticated()) {
        showUploadError('请先登录后再上传图片');
        showAuthModal();
        return;
    }
    
    // 检查是否有文件
    if (!uploadState.currentFile) {
        showUploadError('请选择要上传的图片');
        return;
    }
    
    // 检查关键词
    const keywordsInput = document.getElementById('imageKeywords');
    const keywords = keywordsInput?.value?.trim();
    
    if (!keywords) {
        showUploadError('请输入至少一个关键词');
        return;
    }
    
    // 解析关键词
    const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    if (keywordArray.length === 0) {
        showUploadError('请输入至少一个关键词');
        return;
    }
    
    // 获取描述
    const descriptionInput = document.getElementById('imageDescription');
    const description = descriptionInput?.value?.trim() || '';
    
    // 开始上传
    await startUpload(keywordArray, description);
}

// 开始上传
async function startUpload(keywords, description) {
    // 更新状态
    uploadState.isUploading = true;
    uploadState.progress = 0;
    
    // 显示进度条
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const submitUploadBtn = document.getElementById('submitUpload');
    
    if (uploadProgress) uploadProgress.style.display = 'block';
    if (submitUploadBtn) submitUploadBtn.disabled = true;
    
    try {
        // 更新进度（开始）
        updateUploadProgress(5);
        
        // 压缩图片（如果太大）
        const fileToUpload = await compressImageIfNeeded(uploadState.currentFile);
        
        // 更新进度
        updateUploadProgress(10);
        
        // 上传到Cloudinary
        const cloudinaryResponse = await window.cloudinary.uploadImageToCloudinary(
            fileToUpload,
            (progress) => {
                // 映射进度：10% -> 80%
                const mappedProgress = 10 + (progress * 0.7);
                updateUploadProgress(mappedProgress);
            }
        );
        
        // 更新进度
        updateUploadProgress(85);
        
        // 保存到数据库
        await savePhotoToDatabase(cloudinaryResponse, keywords, description);
        
        // 更新进度
        updateUploadProgress(100);
        
        // 上传成功
        handleUploadSuccess();
        
    } catch (error) {
        console.error('上传过程错误:', error);
        handleUploadError(error.message || '上传失败');
    } finally {
        // 重置状态
        uploadState.isUploading = false;
        
        // 隐藏进度条
        if (uploadProgress) {
            setTimeout(() => {
                uploadProgress.style.display = 'none';
            }, 1000);
        }
    }
}

// 压缩图片（如果需要）
async function compressImageIfNeeded(file) {
    // 如果图片小于5MB，不压缩
    if (file.size <= 5 * 1024 * 1024) {
        return file;
    }
    
    try {
        // 显示压缩提示
        showUploadMessage('正在优化图片大小...');
        
        // 压缩图片
        const compressedFile = await window.cloudinary.compressImage(file, 1920, 0.8);
        
        console.log(`图片压缩: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
        
        return compressedFile;
    } catch (error) {
        console.error('图片压缩错误:', error);
        // 压缩失败，返回原文件
        return file;
    }
}

// 保存图片到数据库
async function savePhotoToDatabase(cloudinaryResponse, keywords, description) {
    const currentUser = window.auth?.getCurrentUser();
    const currentProfile = window.auth?.getCurrentProfile();
    
    if (!currentUser || !currentProfile) {
        throw new Error('用户未登录');
    }
    
    try {
        // 生成缩略图URL
        const thumbnailUrl = window.cloudinary.generateThumbnailUrl(cloudinaryResponse.public_id);
        const optimizedUrl = window.cloudinary.generateOptimizedUrl(cloudinaryResponse.public_id);
        
        // 准备照片数据
        const photoData = {
            user_id: currentUser.id,
            image_url: optimizedUrl,
            thumbnail_url: thumbnailUrl,
            cloudinary_id: cloudinaryResponse.public_id,
            title: description ? description.substring(0, 100) : null,
            description: description || null,
            keywords: keywords,
            likes_count: 0,
            comments_count: 0,
            created_at: new Date().toISOString()
        };
        
        // 保存到数据库
        const savedPhoto = await window.supabaseFunctions.createPhoto(photoData);
        
        return savedPhoto;
    } catch (error) {
        console.error('保存到数据库错误:', error);
        
        // 如果数据库保存失败，尝试删除Cloudinary上的图片
        try {
            await window.cloudinary.deleteImageFromCloudinary(cloudinaryResponse.public_id);
        } catch (deleteError) {
            console.error('清理上传的图片错误:', deleteError);
        }
        
        throw new Error('保存图片信息失败: ' + error.message);
    }
}

// 更新上传进度
function updateUploadProgress(progress) {
    uploadState.progress = Math.min(100, Math.max(0, progress));
    
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressFill) {
        progressFill.style.width = `${uploadState.progress}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${Math.round(uploadState.progress)}%`;
    }
}

// 处理上传成功
function handleUploadSuccess() {
    // 显示成功消息
    showUploadMessage('图片上传成功！', 'success');
    
    // 重置表单
    resetUploadForm();
    
    // 关闭上传模态框
    closeUploadModal();
    
    // 显示通知
    if (window.auth?.showNotification) {
        window.auth.showNotification('图片上传成功！', 'success');
    }
    
    // 刷新动态（如果存在）
    if (window.feed && typeof window.feed.loadFeed === 'function') {
        setTimeout(() => {
            window.feed.loadFeed();
        }, 1000);
    }
}

// 处理上传错误
function handleUploadError(errorMessage) {
    showUploadError(errorMessage);
    
    // 重新启用上传按钮
    const submitUploadBtn = document.getElementById('submitUpload');
    if (submitUploadBtn) {
        submitUploadBtn.disabled = false;
    }
    
    // 显示错误通知
    if (window.auth?.showNotification) {
        window.auth.showNotification(`上传失败: ${errorMessage}`, 'error');
    }
}

// 显示上传错误
function showUploadError(message) {
    uploadState.uploadError = message;
    
    const uploadError = document.getElementById('uploadError');
    if (uploadError) {
        uploadError.textContent = message;
        uploadError.style.display = 'block';
    }
}

// 显示上传消息
function showUploadMessage(message, type = 'info') {
    const uploadError = document.getElementById('uploadError');
    if (uploadError) {
        uploadError.textContent = message;
        uploadError.style.display = 'block';
        uploadError.className = `upload-message upload-${type}`;
        
        // 如果是成功消息，3秒后自动隐藏
        if (type === 'success') {
            setTimeout(() => {
                uploadError.style.display = 'none';
            }, 3000);
        }
    }
}

// 清除上传错误
function clearUploadError() {
    uploadState.uploadError = null;
    
    const uploadError = document.getElementById('uploadError');
    if (uploadError) {
        uploadError.textContent = '';
        uploadError.style.display = 'none';
    }
}

// 重置上传表单
function resetUploadForm() {
    // 移除图片
    removeSelectedImage();
    
    // 清空表单字段
    const keywordsInput = document.getElementById('imageKeywords');
    const descriptionInput = document.getElementById('imageDescription');
    
    if (keywordsInput) keywordsInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
    
    // 重置状态
    uploadState.currentFile = null;
    uploadState.isUploading = false;
    uploadState.progress = 0;
    
    // 清除错误
    clearUploadError();
}

// 关闭上传模态框
function closeUploadModal() {
    const uploadModal = document.getElementById('uploadModal');
    if (uploadModal) {
        uploadModal.style.display = 'none';
    }
}

// 显示上传模态框
function showUploadModal() {
    // 检查用户是否登录
    if (!window.auth?.isAuthenticated()) {
        if (window.auth?.showNotification) {
            window.auth.showNotification('请先登录后再上传图片', 'warning');
        }
        showAuthModal();
        return;
    }
    
    // 重置表单
    resetUploadForm();
    
    // 显示模态框
    const uploadModal = document.getElementById('uploadModal');
    if (uploadModal) {
        uploadModal.style.display = 'flex';
    }
}

// 显示认证模态框
function showAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.style.display = 'flex';
    }
}

// 获取上传状态
function getUploadState() {
    return { ...uploadState };
}

// 导出函数
window.upload = {
    init: initUploadModule,
    showModal: showUploadModal,
    getState: getUploadState,
    handleFileSelect,
    removeSelectedImage
};

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    // 延迟初始化
    setTimeout(() => {
        initUploadModule();
    }, 1500);
});

console.log('上传模块完整加载完成');