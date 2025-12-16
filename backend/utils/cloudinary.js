import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY || process.env.API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET || process.env.API_SECRET
});

/**
 * Upload image to Cloudinary
 * @param {string} file - Base64 string or file path
 * @param {string} folder - Folder in Cloudinary (e.g., 'users', 'companies')
 * @param {object} options - Additional upload options
 */
export const uploadImage = async (file, folder = 'general', options = {}) => {
    try {
        const result = await cloudinary.uploader.upload(file, {
            folder: `hireos/${folder}`,
            resource_type: 'image',
            transformation: [
                { width: options.width || 800, height: options.height || 800, crop: 'limit' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ],
            ...options
        });
        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Upload profile photo
 */
export const uploadProfilePhoto = async (file, userId) => {
    return uploadImage(file, `users/${userId}`, {
        width: 400,
        height: 400,
        transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
        ]
    });
};

/**
 * Upload company logo
 */
export const uploadCompanyLogo = async (file, companyId) => {
    return uploadImage(file, `companies/${companyId}`, {
        width: 400,
        height: 400,
        transformation: [
            { width: 400, height: 400, crop: 'pad', background: 'white' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
        ]
    });
};

/**
 * Upload company cover image
 */
export const uploadCompanyCover = async (file, companyId) => {
    return uploadImage(file, `companies/${companyId}`, {
        width: 1600,
        height: 400,
        transformation: [
            { width: 1600, height: 400, crop: 'fill' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
        ]
    });
};

/**
 * Delete image from Cloudinary
 */
export const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return { success: result.result === 'ok' };
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        return { success: false, error: error.message };
    }
};

export default cloudinary;