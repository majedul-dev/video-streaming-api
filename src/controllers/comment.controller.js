import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    try {
        if (!mongoose.Types.ObjectId.isValid(videoId)) {
            throw new Error("Invalid video ID format");
        }
        const comments = await Comment.aggregate([
            {
                $match: { video: new mongoose.Types.ObjectId(videoId) }
            },
            {
                $sort: { createdAt: -1 } // Sort by createdAt in descending order
            },
            {
                $skip: (page - 1) * limit // Skip documents for pagination
            },
            {
                $limit: parseInt(limit) // Limit number of documents returned
            }
        ]);

        const totalComments = await Comment.countDocuments({ video: videoId });

        res.status(200).json({
            success: true,
            total: totalComments,
            page,
            pages: Math.ceil(totalComments / limit),
            comments
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})

const addComment = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const userId = req.user._id
    const { videoId } = req.params

    const user = await User.findById(userId)
    if (!user) {
        throw new ApiError(404, "user not found")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "video not found")
    }

    const comment = new Comment({
        content,
        video: video._id,
        owner: userId
    })
    
    await comment.save()
    res.status(201).json(new ApiResponse(200, comment, "comment created successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    const { content } = req.body
    const { commentId } = req.params
    
    const comment = await Comment.findById(commentId)

    if (req.user._id.toString() !== comment.owner.toString()) {
        throw new ApiError(401, "you are unauthorized to modify the comment")
    }

    if (!comment) {
        throw new ApiError(404, "comment not found")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {$set: {content}},
        {new: true}
    )

    res.status(200).json(new ApiResponse(200, updatedComment, "comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    const commentId = req.params.commentId

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "comment not found")
    }

    await Comment.findByIdAndDelete(commentId)

    res.status(200).json(new ApiResponse(200, "Comment deleted"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
