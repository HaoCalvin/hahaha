/**
 * Cloudinary图片上传和处理模块
 * 处理图片上传、删除、优化和转换
 */

// Cloudinary配置
const CLOUDINARY_CLOUD_NAME = 'dy77idija';
const CLOUDINARY_UPLOAD_PRESET = 'photo-share-app';
const CLOUDINARY_API_KEY = '263478638476192';
const CLOUDINARY_API_SECRET = 'eplFKZdw3w0jVl2RSaJmNK9tzo';

// 上传端点
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
const CLOUDINARY_DELETE_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`;

// 验证文件类型和大小
function validateImageFile(file) {
    const errors = [];
    
    // 检查文件是否存在
    if (!file) {
        errors.push('请选择文件');
        return { isValid: false, errors };
    }
    
    // 检查文件大小（最大25MB）
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
        errors.push(`文件大小不能超过25MB，当前文件大小为：${(file.size / (1024 * 1024)).toFixed(2)}MB`);
    }
    
    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
        errors.push(`不支持的文件类型：${file.type}，请上传图片文件（JPG, PNG, GIF, WebP, BMP）`);
    }
    
    // 检查文件名
    if (file.name.length > 100) {
        errors.push('文件名过长，请缩短文件名');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// 上传图片到Cloudinary
async function uploadImageToCloudinary(file, onProgressCallback = null) {
    return new Promise((resolve, reject) => {
        // 验证文件
        const validation = validateImageFile(file);
        if (!validation.isValid) {
            reject(new Error(validation.errors.join('\n')));
            return;
        }
        
        // 准备表单数据
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
        formData.append('api_key', CLOUDINARY_API_KEY);
        
        // 添加优化参数
        formData.append('transformation', 'f_auto,q_auto:good'); // 自动格式和良好质量
        formData.append('folder', 'photo-share'); // 组织图片到文件夹
        
        // 创建XMLHttpRequest以支持进度跟踪
        const xhr = new XMLHttpRequest();
        
        // 进度事件处理
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable && onProgressCallback) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                onProgressCallback(percentComplete);
            }
        });
        
        // 加载完成处理
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    
                    // 检查Cloudinary错误
                    if (response.error) {
                        reject(new Error(`Cloudinary错误: ${response.error.message}`));
                        return;
                    }
                    
                    // 验证响应包含必要数据
                    if (!response.public_id || !response.secure_url) {
                        reject(new Error('上传响应缺少必要数据'));
                        return;
                    }
                    
                    resolve(response);
                } catch (parseError) {
                    reject(new Error(`解析响应失败: ${parseError.message}`));
                }
            } else {
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    reject(new Error(`上传失败: ${errorResponse.error?.message || `HTTP ${xhr.status}`}`));
                } catch {
                    reject(new Error(`上传失败: HTTP ${xhr.status}`));
                }
            }
        });
        
        // 错误处理
        xhr.addEventListener('error', () => {
            reject(new Error('网络错误，请检查网络连接'));
        });
        
        // 超时处理
        xhr.addEventListener('timeout', () => {
            reject(new Error('上传超时，请重试'));
        });
        
        // 设置超时（60秒）
        xhr.timeout = 60000;
        
        // 发送请求
        xhr.open('POST', CLOUDINARY_UPLOAD_URL, true);
        xhr.send(formData);
    });
}

// 从Cloudinary删除图片
async function deleteImageFromCloudinary(publicId) {
    try {
        if (!publicId) {
            throw new Error('无效的图片ID');
        }
        
        // 生成时间戳和签名
        const timestamp = Math.round(Date.now() / 1000);
        const signature = await generateSignature(publicId, timestamp);
        
        // 准备表单数据
        const formData = new FormData();
        formData.append('public_id', publicId);
        formData.append('signature', signature);
        formData.append('api_key', CLOUDINARY_API_KEY);
        formData.append('timestamp', timestamp);
        formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
        
        // 发送删除请求
        const response = await fetch(CLOUDINARY_DELETE_URL, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`删除请求失败: HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.result !== 'ok') {
            throw new Error(`删除失败: ${result.error?.message || '未知错误'}`);
        }
        
        return result;
    } catch (error) {
        console.error('删除图片错误:', error);
        throw error;
    }
}

// 生成Cloudinary签名
async function generateSignature(publicId, timestamp) {
    // 注意：在生产环境中，这应该在服务器端完成
    // 这里为了简化，我们直接在前端生成
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    
    // 使用SHA-1哈希（浏览器原生支持）
    try {
        // 将字符串转换为Uint8Array
        const encoder = new TextEncoder();
        const data = encoder.encode(stringToSign);
        
        // 使用Web Crypto API进行SHA-1哈希
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        
        // 将哈希结果转换为十六进制字符串
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        return hashHex;
    } catch (error) {
        console.warn('SHA-1哈希失败，使用备用方法:', error);
        // 备用方法：简单的哈希
        let hash = 0;
        for (let i = 0; i < stringToSign.length; i++) {
            const char = stringToSign.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }
}

// 生成图片URL（带转换）
function generateImageUrl(publicId, options = {}) {
    if (!publicId) return '';
    
    const {
        width = 800,
        height,
        crop = 'fill',
        quality = 'auto',
        format = 'auto'
    } = options;
    
    let transformations = [];
    
    // 添加宽度
    if (width) transformations.push(`w_${width}`);
    
    // 添加高度（如果提供）
    if (height) transformations.push(`h_${height}`);
    
    // 添加裁剪模式
    transformations.push(`c_${crop}`);
    
    // 添加质量
    transformations.push(`q_${quality}`);
    
    // 添加格式
    transformations.push(`f_${format}`);
    
    const transformationString = transformations.join(',');
    
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformationString}/${publicId}`;
}

// 生成缩略图URL
function generateThumbnailUrl(publicId, width = 300, height = 200) {
    return generateImageUrl(publicId, {
        width,
        height,
        crop: 'fill',
        quality: 'good',
        format: 'auto'
    });
}

// 生成优化后的图片URL
function generateOptimizedUrl(publicId, width = 1200) {
    return generateImageUrl(publicId, {
        width,
        crop: 'limit', // 限制大小，保持宽高比
        quality: 'best',
        format: 'auto'
    });
}

// 生成头像URL
function generateAvatarUrl(publicId, size = 100) {
    if (!publicId) {
        // 返回默认头像
        return `https://ui-avatars.com/api/?name=User&background=bb86fc&color=fff&size=${size}`;
    }
    
    return generateImageUrl(publicId, {
        width: size,
        height: size,
        crop: 'fill',
        gravity: 'face', // 人脸识别（如果可用）
        quality: 'good',
        format: 'auto'
    });
}

// 批量获取图片URL
function batchGenerateImageUrls(images, type = 'thumbnail') {
    if (!images || !Array.isArray(images)) {
        return [];
    }
    
    return images.map(image => {
        if (!image.cloudinary_id) return null;
        
        switch (type) {
            case 'thumbnail':
                return generateThumbnailUrl(image.cloudinary_id);
            case 'optimized':
                return generateOptimizedUrl(image.cloudinary_id);
            case 'original':
                return generateImageUrl(image.cloudinary_id);
            default:
                return generateThumbnailUrl(image.cloudinary_id);
        }
    }).filter(url => url !== null);
}

// 预加载图片
function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => reject(new Error(`图片加载失败: ${url}`));
        img.src = url;
    });
}

// 批量预加载图片
async function preloadImages(urls, onProgress = null) {
    const results = [];
    const total = urls.length;
    
    for (let i = 0; i < urls.length; i++) {
        try {
            await preloadImage(urls[i]);
            results.push({ url: urls[i], success: true });
        } catch (error) {
            results.push({ url: urls[i], success: false, error: error.message });
        }
        
        // 报告进度
        if (onProgress) {
            onProgress(Math.round(((i + 1) / total) * 100));
        }
    }
    
    return results;
}

// 获取图片信息（尺寸等）
function getImageInfo(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        
        img.onload = () => {
            const info = {
                width: img.width,
                height: img.height,
                aspectRatio: img.width / img.height,
                size: file.size,
                type: file.type,
                name: file.name
            };
            
            // 清理对象URL
            URL.revokeObjectURL(objectUrl);
            resolve(info);
        };
        
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('无法读取图片信息'));
        };
        
        img.src = objectUrl;
    });
}

// 压缩图片（客户端）
async function compressImage(file, maxWidth = 1920, quality = 0.8) {
    return new Promise((resolve, reject) => {
        // 验证文件
        const validation = validateImageFile(file);
        if (!validation.isValid) {
            reject(new Error(validation.errors.join('\n')));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (event) => {
            const img = new Image();
            
            img.onload = () => {
                // 计算新尺寸
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                
                // 创建Canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                
                // 设置背景（透明图片）
                if (file.type === 'image/png' || file.type === 'image/gif') {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, width, height);
                }
                
                // 绘制图片
                ctx.drawImage(img, 0, 0, width, height);
                
                // 转换为Blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('图片压缩失败'));
                            return;
                        }
                        
                        // 创建新文件
                        const compressedFile = new File([blob], file.name, {
                            type: file.type,
                            lastModified: Date.now()
                        });
                        
                        resolve(compressedFile);
                    },
                    file.type,
                    quality
                );
            };
            
            img.onerror = () => {
                reject(new Error('图片加载失败'));
            };
            
            img.src = event.target.result;
        };
        
        reader.onerror = () => {
            reject(new Error('文件读取失败'));
        };
        
        reader.readAsDataURL(file);
    });
}

// 创建图片预览
function createImagePreview(file, maxSize = 300) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            const img = new Image();
            
            img.onload = () => {
                // 计算缩略图尺寸
                let width = img.width;
                let height = img.height;
                
                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = (maxSize / width) * height;
                        width = maxSize;
                    } else {
                        width = (maxSize / height) * width;
                        height = maxSize;
                    }
                }
                
                // 创建Canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                
                // 绘制图片
                ctx.drawImage(img, 0, 0, width, height);
                
                // 获取DataURL
                const dataUrl = canvas.toDataURL(file.type);
                resolve(dataUrl);
            };
            
            img.onerror = () => {
                reject(new Error('图片预览创建失败'));
            };
            
            img.src = event.target.result;
        };
        
        reader.onerror = () => {
            reject(new Error('文件读取失败'));
        };
        
        reader.readAsDataURL(file);
    });
}

// 导出函数
window.cloudinary = {
    // 配置
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_UPLOAD_PRESET,
    
    // 核心功能
    uploadImageToCloudinary,
    deleteImageFromCloudinary,
    validateImageFile,
    
    // URL生成
    generateImageUrl,
    generateThumbnailUrl,
    generateOptimizedUrl,
    generateAvatarUrl,
    batchGenerateImageUrls,
    
    // 图片处理
    getImageInfo,
    compressImage,
    createImagePreview,
    
    // 预加载
    preloadImage,
    preloadImages
};

console.log('Cloudinary模块完整加载完成');