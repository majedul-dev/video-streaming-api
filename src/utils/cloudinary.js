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
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull
        //console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

const deleteFromCloudinary = async (avatarUrl) => {
    try {
        const publicId = avatarUrl.split('/').pop().split('.')[0];
        const response = await cloudinary.uploader.destroy(publicId)

        if (response.result !== 'ok') {
            throw new Error("Failed to delete old avatar from Cloudinary");
        }

        return response;
    } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
        throw new Error("Error deleting old avatar");
    }
}



export {uploadOnCloudinary, deleteFromCloudinary}