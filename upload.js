/**
 * 图片上传管理模块 - 修复版
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
    
    // 验证关键词输入
    const keywordsInput = document.getElementById('imageKeywords');
    if (keywordsInput) {
        keywordsInput.addEventListener('input', validateKeywords);
    }
    
    // 设置图片错误处理
    setupImageErrorHandling();
    
    console.log('✅ 上传模块初始化完成');
}

// 监听图片加载错误
function setupImageErrorHandling() {
    document.addEventListener('error', function(e) {
        if (e.target.tagName === 'IMG') {
            const img = e.target;
            const originalSrc = img.src;
            
            // 如果是预览图片，不处理
            if (img.id === 'imagePreview' || img.classList.contains('preview-image')) {
                return;
            }
            
            console.warn('图片加载失败:', originalSrc);
            
            // 尝试修复URL
            const fixedUrl = window.cloudinary.fixImageUrl(originalSrc);
            if (fixedUrl !== originalSrc) {
                console.log('尝试使用修复后的URL:', fixedUrl);
                img.src = fixedUrl;
                
                // 添加加载超时处理
                setTimeout(() => {
                    if (!img.complete || img.naturalWidth === 0) {
                        console.warn('修复后的URL也加载失败');
                        // 显示替代图片
                        img.src = 'https://via.placeholder.com/300x200?text=图片加载失败';
                        img.alt = '图片加载失败';
                        img.style.opacity = '0.7';
                    }
                }, 3000);
            }
        }
    }, true);
}

// 验证关键词输入
function validateKeywords(e) {
    const input = e.target;
    const value = input.value.trim();
    
    // 限制关键词数量
    const keywords = value.split(',').map(k => k.trim()).filter(k => k.length > 0);
    if (keywords.length > 10) {
        input.value = keywords.slice(0, 10).join(', ');
        showUploadError('最多只能输入10个关键词', 'warning');
    } else if (keywords.length === 0) {
        showUploadError('请输入至少一个关键词', 'warning');
    } else {
        clearUploadError();
    }
}

// 处理文件选择
async function handleFileSelect(file) {
    // 重置错误状态
    clearUploadError();
    
    // 验证文件
    const validation = window.cloudinary?.validateImageFile(file);
    if (!validation || !validation.isValid) {
        showUploadError(validation?.errors?.[0] || '无效的文件', 'error');
        return;
    }
    
    try {
        // 获取图片信息
        const imageInfo = await window.cloudinary.getImageInfo(file);
        console.log('图片信息:', imageInfo);
        
        // 检查图片尺寸是否过大
        if (imageInfo.width > 5000 || imageInfo.height > 5000) {
            showUploadError('图片尺寸过大，建议上传小于5000x5000像素的图片', 'warning');
        }
        
        // 显示预览
        await showImagePreview(file);
        
        // 启用上传按钮
        const submitUploadBtn = document.getElementById('submitUpload');
        if (submitUploadBtn) {
            submitUploadBtn.disabled = false;
            submitUploadBtn.textContent = '上传图片';
        }
        
        // 保存当前文件
        uploadState.currentFile = file;
        
    } catch (error) {
        console.error('处理文件选择错误:', error);
        showUploadError('无法处理图片文件: ' + error.message, 'error');
    }
}

// 显示图片预览
async function showImagePreview(file) {
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const uploadArea = document.getElementById('uploadArea');
    const previewInfo = document.getElementById('previewInfo');
    
    if (!previewContainer || !imagePreview || !uploadArea) return;
    
    try {
        // 创建预览
        const previewUrl = await window.cloudinary.createImagePreview(file, 400);
        
        if (previewUrl) {
            imagePreview.src = previewUrl;
            previewContainer.style.display = 'block';
            uploadArea.style.display = 'none';
            
            // 显示图片信息
            if (previewInfo) {
                const imageInfo = await window.cloudinary.getImageInfo(file);
                previewInfo.innerHTML = `
                    <div>${imageInfo.width} × ${imageInfo.height} 像素</div>
                    <div>${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    <div>${file.type.split('/')[1].toUpperCase()} 格式</div>
                `;
                previewInfo.style.display = 'block';
            }
            
            // 如果有描述输入框，自动填充
            const descriptionInput = document.getElementById('imageDescription');
            if (descriptionInput && !descriptionInput.value) {
                const fileName = file.name.split('.')[0];
                descriptionInput.value = fileName.replace(/[_-]/g, ' ');
            }
        }
    } catch (error) {
        console.error('创建预览错误:', error);
        showUploadError('无法创建图片预览', 'error');
    }
}

// 移除选择的图片
function removeSelectedImage() {
    const previewContainer = document.getElementById('previewContainer');
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    const submitUploadBtn = document.getElementById('submitUpload');
    const previewInfo = document.getElementById('previewInfo');
    
    if (previewContainer) previewContainer.style.display = 'none';
    if (uploadArea) uploadArea.style.display = 'block';
    if (imageInput) imageInput.value = '';
    if (submitUploadBtn) {
        submitUploadBtn.disabled = true;
        submitUploadBtn.textContent = '请先选择图片';
    }
    if (previewInfo) previewInfo.style.display = 'none';
    
    // 重置状态
    uploadState.currentFile = null;
    clearUploadError();
}

// 处理上传提交
async function handleUploadSubmit() {
    // 检查用户是否登录
    const currentUser = await window.supabaseFunctions?.getCurrentUser();
    if (!currentUser) {
        showUploadError('请先登录后再上传图片', 'error');
        showAuthModal();
        return;
    }
    
    // 检查是否有文件
    if (!uploadState.currentFile) {
        showUploadError('请选择要上传的图片', 'error');
        return;
    }
    
    // 检查关键词
    const keywordsInput = document.getElementById('imageKeywords');
    const keywords = keywordsInput?.value?.trim();
    
    if (!keywords) {
        showUploadError('请输入至少一个关键词', 'error');
        keywordsInput?.focus();
        return;
    }
    
    // 解析关键词
    const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    if (keywordArray.length === 0) {
        showUploadError('请输入至少一个关键词', 'error');
        keywordsInput?.focus();
        return;
    }
    
    // 检查关键词长度
    for (const keyword of keywordArray) {
        if (keyword.length > 20) {
            showUploadError(`关键词"${keyword}"过长，请控制在20个字符以内`, 'error');
            return;
        }
    }
    
    // 获取描述
    const descriptionInput = document.getElementById('imageDescription');
    const description = descriptionInput?.value?.trim() || '';
    
    // 检查描述长度
    if (description.length > 500) {
        showUploadError('描述过长，请控制在500个字符以内', 'error');
        descriptionInput?.focus();
        return;
    }
    
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
    if (submitUploadBtn) {
        submitUploadBtn.disabled = true;
        submitUploadBtn.textContent = '上传中...';
    }
    
    try {
        // 更新进度（开始）
        updateUploadProgress(5, '准备上传...');
        
        // 压缩图片（如果太大）
        const fileToUpload = await compressImageIfNeeded(uploadState.currentFile);
        
        // 更新进度
        updateUploadProgress(15, '正在上传到Cloudinary...');
        
        console.log('开始上传到Cloudinary...');
        console.log('文件信息:', {
            name: fileToUpload.name,
            size: (fileToUpload.size / 1024 / 1024).toFixed(2) + 'MB',
            type: fileToUpload.type
        });
        
        // 上传到Cloudinary
        const cloudinaryResponse = await window.cloudinary.uploadImageToCloudinary(
            fileToUpload,
            (progress) => {
                // 映射进度：15% -> 80%
                const mappedProgress = 15 + (progress * 0.65);
                updateUploadProgress(mappedProgress, `上传中: ${progress}%`);
            }
        );
        
        console.log('✅ Cloudinary上传成功:', cloudinaryResponse);
        
        // 检查上传的图片URL
        console.log('检查上传的图片URL...');
        const urlCheck = await window.cloudinary.checkUploadedImage(cloudinaryResponse);
        console.log('URL检查结果:', urlCheck);
        
        // 更新进度
        updateUploadProgress(85, '正在保存到数据库...');
        
        // 保存到数据库
        const savedPhoto = await savePhotoToDatabase(cloudinaryResponse, keywords, description);
        
        console.log('✅ 数据库保存成功:', savedPhoto);
        
        // 更新进度
        updateUploadProgress(100, '上传完成！');
        
        // 上传成功
        setTimeout(() => {
            handleUploadSuccess(savedPhoto);
        }, 500);
        
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
    // 如果图片小于2MB，不压缩
    if (file.size <= 2 * 1024 * 1024) {
        console.log('图片小于2MB，无需压缩');
        return file;
    }
    
    try {
        // 显示压缩提示
        showUploadMessage('正在优化图片大小...', 'info');
        
        // 根据图片大小决定压缩质量
        let quality = 0.8;
        if (file.size > 10 * 1024 * 1024) {
            quality = 0.6;
        } else if (file.size > 5 * 1024 * 1024) {
            quality = 0.7;
        }
        
        // 压缩图片
        const compressedFile = await window.cloudinary.compressImage(file, 1920, quality);
        
        console.log(`✅ 图片压缩完成: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
        
        return compressedFile;
    } catch (error) {
        console.error('图片压缩错误:', error);
        showUploadMessage('图片压缩失败，使用原图上传', 'warning');
        // 压缩失败，返回原文件
        return file;
    }
}

// 保存图片到数据库
async function savePhotoToDatabase(cloudinaryResponse, keywords, description) {
    try {
        // 获取当前用户
        const currentUser = await window.supabaseFunctions.getCurrentUser();
        if (!currentUser) {
            throw new Error('用户未登录或登录状态无效');
        }
        
        // 调试：检查Cloudinary响应
        console.log('Cloudinary响应详情:', cloudinaryResponse);
        console.log('public_id:', cloudinaryResponse.public_id);
        console.log('secure_url:', cloudinaryResponse.secure_url);
        
        // 测试生成的URL
        const thumbnailUrl = window.cloudinary.generateThumbnailUrl(cloudinaryResponse.public_id);
        const optimizedUrl = window.cloudinary.generateOptimizedUrl(cloudinaryResponse.public_id);
        const originalUrl = window.cloudinary.getOriginalImageUrl(cloudinaryResponse.public_id);
        
        console.log('生成的缩略图URL:', thumbnailUrl);
        console.log('生成的优化URL:', optimizedUrl);
        console.log('原始URL:', originalUrl);
        
        // 测试URL是否可访问
        let finalThumbnailUrl = thumbnailUrl;
        let finalImageUrl = optimizedUrl;
        
        try {
            const thumbnailCheck = await window.cloudinary.testImageUrl(thumbnailUrl);
            console.log('缩略图URL测试:', thumbnailCheck);
            
            const optimizedCheck = await window.cloudinary.testImageUrl(optimizedUrl);
            console.log('优化URL测试:', optimizedCheck);
            
            // 如果生成的URL有问题，使用Cloudinary的原始URL
            if (!thumbnailCheck.success) {
                console.warn('缩略图URL有问题，使用原始URL');
                finalThumbnailUrl = originalUrl;
            }
            
            if (!optimizedCheck.success) {
                console.warn('优化URL有问题，使用原始URL');
                finalImageUrl = originalUrl;
            }
        } catch (testError) {
            console.error('URL测试失败:', testError);
            // 测试失败，使用原始URL
            finalThumbnailUrl = originalUrl;
            finalImageUrl = originalUrl;
        }
        
        // 准备照片数据
        const photoData = {
            user_id: currentUser.id,
            image_url: finalImageUrl,
            thumbnail_url: finalThumbnailUrl,
            cloudinary_id: cloudinaryResponse.public_id,
            title: description ? description.substring(0, 100) : null,
            description: description || null,
            keywords: keywords,
            likes_count: 0,
            comments_count: 0,
            views_count: 0,
            created_at: new Date().toISOString()
        };
        
        console.log('保存到数据库的照片数据:', photoData);
        
        // 确保 supabaseFunctions 已初始化
        if (!window.supabaseFunctions) {
            throw new Error('数据库功能未初始化');
        }
        
        // 保存到数据库
        const savedPhoto = await window.supabaseFunctions.createPhoto(photoData);
        
        if (!savedPhoto) {
            throw new Error('数据库保存失败，返回空数据');
        }
        
        return savedPhoto;
    } catch (error) {
        console.error('保存到数据库错误:', error);
        
        // 如果数据库保存失败，尝试删除 Cloudinary 上的图片
        try {
            if (cloudinaryResponse.public_id) {
                console.log('尝试删除 Cloudinary 图片:', cloudinaryResponse.public_id);
                await window.cloudinary.deleteImageFromCloudinary(cloudinaryResponse.public_id);
            }
        } catch (deleteError) {
            console.error('清理上传的图片错误:', deleteError);
        }
        
        throw new Error('保存图片信息失败: ' + error.message);
    }
}

// 更新上传进度
function updateUploadProgress(progress, message = '') {
    uploadState.progress = Math.min(100, Math.max(0, progress));
    
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressMessage = document.getElementById('progressMessage');
    
    if (progressFill) {
        progressFill.style.width = `${uploadState.progress}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${Math.round(uploadState.progress)}%`;
    }
    
    if (progressMessage && message) {
        progressMessage.textContent = message;
    }
}

// 处理上传成功
function handleUploadSuccess(savedPhoto) {
    // 显示成功消息
    showUploadMessage('🎉 图片上传成功！', 'success');
    
    // 重置表单
    resetUploadForm();
    
    // 关闭上传模态框
    closeUploadModal();
    
    // 显示通知
    if (window.auth?.showNotification) {
        window.auth.showNotification('图片上传成功！', 'success');
    } else {
        // 备用通知
        setTimeout(() => {
            alert('图片上传成功！');
        }, 300);
    }
    
    // 刷新动态（如果存在）
    if (window.feed && typeof window.feed.loadFeed === 'function') {
        setTimeout(() => {
            console.log('刷新动态...');
            window.feed.loadFeed();
        }, 1500);
    }
    
    // 刷新用户相册（如果存在）
    if (window.profile && typeof window.profile.loadUserPhotos === 'function') {
        setTimeout(() => {
            console.log('刷新用户相册...');
            window.profile.loadUserPhotos();
        }, 1500);
    }
}

// 处理上传错误
function handleUploadError(errorMessage) {
    console.error('上传失败:', errorMessage);
    
    // 显示错误消息
    showUploadError(`上传失败: ${errorMessage}`, 'error');
    
    // 重新启用上传按钮
    const submitUploadBtn = document.getElementById('submitUpload');
    if (submitUploadBtn) {
        submitUploadBtn.disabled = false;
        submitUploadBtn.textContent = '重新上传';
    }
    
    // 显示错误通知
    if (window.auth?.showNotification) {
        window.auth.showNotification(`上传失败: ${errorMessage}`, 'error');
    }
}

// 显示上传错误
function showUploadError(message, type = 'error') {
    uploadState.uploadError = message;
    
    const uploadError = document.getElementById('uploadError');
    if (uploadError) {
        uploadError.textContent = message;
        uploadError.style.display = 'block';
        uploadError.className = `upload-message upload-${type}`;
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
        uploadError.className = 'upload-message';
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
    
    // 重置进度条
    updateUploadProgress(0, '');
    
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
        // 重置表单
        resetUploadForm();
    }
}

// 显示上传模态框
function showUploadModal() {
    // 检查用户是否登录
    const currentUser = window.supabaseFunctions?.getCurrentUser();
    if (!currentUser) {
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
        
        // 自动聚焦到关键词输入框
        setTimeout(() => {
            const keywordsInput = document.getElementById('imageKeywords');
            if (keywordsInput) {
                keywordsInput.focus();
            }
        }, 300);
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

// 检查上传功能是否可用
async function checkUploadAvailability() {
    try {
        // 检查Cloudinary模块
        if (!window.cloudinary) {
            throw new Error('Cloudinary模块未加载');
        }
        
        // 检查Supabase模块
        if (!window.supabaseFunctions) {
            throw new Error('数据库模块未加载');
        }
        
        console.log('✅ 上传功能检查通过');
        return true;
    } catch (error) {
        console.error('上传功能检查失败:', error);
        return false;
    }
}

// 紧急修复：图片查看功能
window.fixPhotoView = async function(photoId) {
    try {
        const photo = await window.supabaseFunctions.getPhotoById(photoId);
        if (!photo) {
            console.error('照片不存在');
            return;
        }
        
        console.log('照片详情:', photo);
        
        // 直接使用Cloudinary原始URL
        const directUrl = window.cloudinary.getOriginalImageUrl(photo.cloudinary_id);
        
        // 创建图片查看模态框
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            cursor: pointer;
        `;
        
        const imgContainer = document.createElement('div');
        imgContainer.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            display: flex;
            flex-direction: column;
            align-items: center;
        `;
        
        const img = document.createElement('img');
        img.src = directUrl;
        img.style.cssText = `
            max-width: 100%;
            max-height: 80vh;
            object-fit: contain;
            border-radius: 8px;
        `;
        img.onerror = function() {
            console.error('直接URL也加载失败:', directUrl);
            img.src = 'https://via.placeholder.com/800x600?text=图片加载失败';
        };
        
        const info = document.createElement('div');
        info.style.cssText = `
            color: white;
            margin-top: 20px;
            text-align: center;
            max-width: 600px;
        `;
        
        if (photo.title) {
            const title = document.createElement('h3');
            title.textContent = photo.title;
            title.style.margin = '0 0 10px 0';
            info.appendChild(title);
        }
        
        if (photo.description) {
            const desc = document.createElement('p');
            desc.textContent = photo.description;
            desc.style.margin = '0 0 10px 0';
            desc.style.opacity = '0.8';
            info.appendChild(desc);
        }
        
        if (photo.keywords && photo.keywords.length > 0) {
            const keywords = document.createElement('p');
            keywords.textContent = `关键词: ${photo.keywords.join(', ')}`;
            keywords.style.margin = '0';
            keywords.style.opacity = '0.6';
            keywords.style.fontSize = '14px';
            info.appendChild(keywords);
        }
        
        // 点击关闭
        modal.onclick = function() {
            document.body.removeChild(modal);
        };
        
        imgContainer.appendChild(img);
        imgContainer.appendChild(info);
        modal.appendChild(imgContainer);
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('查看照片错误:', error);
        alert('查看照片失败: ' + error.message);
    }
};

// 导出函数
window.upload = {
    init: initUploadModule,
    showModal: showUploadModal,
    closeModal: closeUploadModal,
    getState: getUploadState,
    handleFileSelect,
    removeSelectedImage,
    checkAvailability: checkUploadAvailability,
    fixPhotoView: window.fixPhotoView
};

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('开始初始化上传模块...');
    
    // 延迟初始化，等待其他模块加载
    setTimeout(async () => {
        try {
            // 先检查功能可用性
            const isAvailable = await checkUploadAvailability();
            
            if (isAvailable) {
                initUploadModule();
                console.log('✅ 上传模块初始化成功');
            } else {
                console.error('❌ 上传模块初始化失败：依赖模块未加载');
            }
        } catch (error) {
            console.error('上传模块初始化错误:', error);
        }
    }, 2000);
});

console.log('✅ 上传模块代码加载完成');