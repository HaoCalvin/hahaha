// Cloudinary配置
const CLOUDINARY_CLOUD_NAME = 'dy77idija';
const CLOUDINARY_UPLOAD_PRESET = 'photo-share-app';
const CLOUDINARY_API_KEY = '263478638476192';
const CLOUDINARY_API_SECRET = 'eplFKZdw3w0jVl2RSaJmNK9tzo'; // 注意：在前端暴露API密钥不安全，但这里由于是演示项目，我们使用upload preset

// Cloudinary上传URL
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

// 最大文件大小 (25MB)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

// 导出配置
window.cloudinaryConfig = {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_UPLOAD_PRESET,
    CLOUDINARY_UPLOAD_URL,
    MAX_FILE_SIZE
};