import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "video not found")
    }
    
    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user._id
    })

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id)
        res.status(200).json(new ApiResponse(200, "disliked successfully"))
    } else {
        const like = new Like({
            video: videoId,
            likedBy: req.user._id
        })
        await like.save()
        res.status(201).json(new ApiResponse(200, like, "liked successfully"))
    }
    
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "comment not found")
    }

    const existingComment = await Like.findOne({
        comment: commentId,
        likedBy: req.user._id
    })

    if (existingComment) {
        await Like.findByIdAndDelete(existingComment._id);
        res.status(200).json(new ApiResponse(200, "Disliked comment"))
    } else {
        const like = new Like({
            comment: comment._id,
            likedBy: req.user._id
        })
        await like.save()

        res.status(201).json(new ApiResponse(200, like, "Liked the comment"))
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    try {
        if (!isValidObjectId(new mongoose.Types.ObjectId(userId))) {
            throw new ApiError(400, "Invalid user Id")
        }

        const allLikedVideos = await Like.aggregate([
            {
                $match: { likedBy: new mongoose.Types.ObjectId(userId) }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "video",
                    foreignField: "_id",
                    as: "videoDetails"
                }
            },
            {
                $unwind: "$videoDetails"
            },
            {
                $project: {
                    _id: 1,
                    videoId: "$videoDetails._id",
                    videoFile: "$videoDetails.videoFile",
                    thumbnail: "$videoDetails.thumbnail",
                    title: "$videoDetails.title"
                }
            },
        ])

        res.status(200).json({
            allLikedVideos,
            total: allLikedVideos.length,
            message: "All liked videos by the logged user"
        })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}