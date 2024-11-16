import {v2 as cloudinary} from "cloudinary"
import fs from "fs"


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

const deleteFromCloudinary = async (url, resource_type) => {
    try {
        const publicId = url.replace(/^.*[\\/]/, '').split('.')[0];
        const response = await cloudinary.uploader.destroy(publicId, {resource_type})

        if (response.result !== 'ok') {
            throw new Error("Failed to delete from Cloudinary");
        }

        return response;
    } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
        throw new Error("Error deleting file");
    }
}







const extractPublicId = async (cloudinaryUrl) => {
    const parts = cloudinaryUrl.split('/').pop().split('.')[0];;
    // const fileName = parts[parts.length - 1].split('.')[0]; // Extract file name without extension
    // return parts[parts.length - 2] + '/' + fileName; // Include folder if present
    return parts
}



export {uploadOnCloudinary, deleteFromCloudinary, extractPublicId}