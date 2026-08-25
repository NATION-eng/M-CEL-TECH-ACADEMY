import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a buffer (from multer memoryStorage) to Cloudinary and returns the secure URL.
 * `folder` organizes assets, e.g. 'masterview/lessons', 'masterview/avatars'.
 */
export const uploadBufferToCloudinary = (
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'video' | 'raw' = 'auto' as 'image'
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `masterview/${folder}`, resource_type: resourceType },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Cloudinary upload failed.'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
};

/**
 * Transforms raw Cloudinary image URLs into auto-compressed WebP/AVIF images
 * with dynamic width/height constraints for optimized mobile & desktop performance.
 */
export const getOptimizedImageUrl = (
  url: string,
  options: { width?: number; height?: number; crop?: string } = {}
): string => {
  if (!url || !url.includes('cloudinary.com')) return url;
  const transformations = ['f_auto', 'q_auto'];
  if (options.width) transformations.push(`w_${options.width}`);
  if (options.height) transformations.push(`h_${options.height}`);
  if (options.crop) transformations.push(`c_${options.crop}`);

  const transformStr = transformations.join(',');
  return url.replace('/upload/', `/upload/${transformStr}/`);
};

export default cloudinary;
