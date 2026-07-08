import cloudinary from '../config/cloudinary.js';

export const uploadToCloudinary = (fileBuffer, folder = 'gaga_connect', resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    // Check if Cloudinary is configured
    const isConfigured = 
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET &&
      !process.env.CLOUDINARY_CLOUD_NAME.includes('your_cloudinary');

    if (!isConfigured) {
      console.log(`[DEV MODE] Cloudinary credentials not configured. Mocking upload stream.`);
      // Return a standard placeholder or demo URL
      resolve({
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
        public_id: 'mock_public_id',
        resource_type: resourceType === 'auto' ? 'image' : resourceType,
      });
      return;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Stream Error:', error);
          return reject(error);
        }
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  const isConfigured = 
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    !process.env.CLOUDINARY_CLOUD_NAME.includes('your_cloudinary');

  if (!isConfigured || !publicId || publicId === 'mock_public_id') {
    return { result: 'ok' };
  }

  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error('Cloudinary Delete Error:', error);
    throw error;
  }
};
