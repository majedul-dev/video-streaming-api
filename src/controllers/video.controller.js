import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { 
        page = 1, 
        limit = 10, 
        query = '', 
        sortBy = 'createdAt', 
        sortType = 'desc', 
        userId 
    } = req.query;

    const matchStage = {};

    // Add search by title if query is provided
    if (query) {
        matchStage.title = { $regex: query, $options: 'i' }; // Case-insensitive search
    }

    // Add user filter if userId is provided
    if (userId) {
        matchStage.userId = userId;
    }

    const sortStage = {
        [sortBy]: sortType === 'desc' ? -1 : 1
    };

    const skip = (page - 1) * limit;

    try {
        const videos = await Video.aggregate([
            { $match: matchStage },        // Filter by match criteria
            { $sort: sortStage },          // Sort by specified field and order
            { $skip: skip },               // Skip documents for pagination
            { $limit: parseInt(limit) },   // Limit the number of documents
        ]);

        const totalVideos = await Video.aggregate([
            { $match: matchStage },
            { $count: 'total' }            // Count total matching documents
        ]);

        res.status(200).json({
            success: true,
            data: videos,
            pagination: {
                total: totalVideos.length > 0 ? totalVideos[0].total : 0,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil((totalVideos.length > 0 ? totalVideos[0].total : 0) / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Server Error', 
            error: error.message 
        });
    }
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new ApiError(404, "user not found")
    }

    const videoLocalPath = req.files?.video[0].path;
    if (!videoLocalPath) {
        throw new ApiError(400, "Video file is missing")
    }

    let thumbnailLocalPath;
    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
        thumbnailLocalPath = req.files?.thumbnail[0].path;
    }

    const videoUploadResponse = await uploadOnCloudinary(videoLocalPath);
    const thumbnailUrl = await uploadOnCloudinary(thumbnailLocalPath)

    // Create video in MongoDB
    const video = new Video({
        videoFile: videoUploadResponse.url,
        thumbnail: thumbnailUrl?.url || "",
        title,
        description,
        duration: videoUploadResponse.duration || 0,
        owner: user._id,
    });

    await video.save();

    res.status(201).json(
        new ApiResponse(201, video, "Video published successfully")
    );

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const video = await Video.findById(videoId);

    res.status(200).json(new ApiResponse(200, video, "Video fatched successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const {title, description} = req.body
    const user = await User.findById(req.user?._id)
    if (!user) {
        throw new ApiError(404, "user not found")
    }

    const video = await Video.findById(req.params.videoId);
    if (!video) {
        throw new ApiError(404, "video not found")
    }

    // delete old video and thumbnail from cloudinary
    await deleteFromCloudinary(video.videoFile, 'video')
    await deleteFromCloudinary(video.thumbnail, 'image')

    // upload new video and thumbnail
    const videoLocalPath = req.files?.video[0].path;
    if (!videoLocalPath) {
        throw new ApiError(400, "Video file is missing")
    }

    let thumbnailLocalPath;
    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
        thumbnailLocalPath = req.files?.thumbnail[0].path;
    }
    
    const videoUploadResponse = await uploadOnCloudinary(videoLocalPath);
    const thumbnailUrl = await uploadOnCloudinary(thumbnailLocalPath)

    video.title = title || video.title;
    video.description = description || video.description;
    video.videoFile = videoUploadResponse.url;
    video.thumbnail = thumbnailUrl.url;
    video.duration = videoUploadResponse.duration || 0

    await video.save();

    res.status(200).json(
        new ApiResponse(200, video, "Video updated successfully")
    );
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const user = await User.findById(req.user._id)
    if (!user) {
        throw new ApiError(404, "user not found")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "video not found")
    }

    if (req.user._id.toString() !== video.owner.toString()) {
        throw new ApiError(401, "this user is not authorized for delete the video")
    }

    await deleteFromCloudinary(video.videoFile, 'video')
    await deleteFromCloudinary(video.thumbnail, 'image')

    await video.deleteOne();

    res.status(200).json(new ApiResponse(200, "Deleted video successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const user = await User.findById(req.user?._id)
    if (!user) {
        throw new ApiError(404, "user not found")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "video not found")
    }

    if (user._id.toString() !== video.owner.toString()) {
        throw new ApiError(401, "this user is not authorized for update publish status")
    }

    if (video.isPublished === true) {
        await Video.findByIdAndUpdate(
            video._id,
            { $set: { isPublished: false } },
            { new: true }
        )
    } else if (video.isPublished === false) {
        await Video.findByIdAndUpdate(
            video._id,
            { $set: { isPublished: true } },
            { new: true }
        )
    }

    res.status(200).json(new ApiResponse(200, video, "Updated video publishing status successfully"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
