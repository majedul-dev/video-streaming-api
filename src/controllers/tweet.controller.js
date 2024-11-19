import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body

    if (!content || content === "") {
        throw new ApiError(400, "content is required")
    }

    const user = await User.findById(req.user._id)
    if (!user) {
        throw new ApiError(404, "user not found")
    }

    const tweet = new Tweet({ content, owner: user._id })
    await tweet.save()

    return res.status(201).json(new ApiResponse(200, tweet, "New tweet created successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const {userId} = req.params
    const {page=1, limit=10} = req.query

    try {
        const pageNumber = parseInt(page, 10)
        const pageSize = parseInt(limit, 10)
        const skip = (pageNumber - 1) * pageSize;

        const user = await User.findById(userId)
        if (!user) {
            throw new ApiError(404, "user not found")
        }

        const totalTweets = await Tweet.countDocuments({owner: userId})

        const tweets = await Tweet.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                }
            },
            { $skip: skip },
            {$limit: pageSize}
        ])
    
        res.status(200).json({
            tweets,
            totalTweets,
            currentPage: pageNumber,
            totalPage: Math.ceil(totalTweets / pageSize),
            message: "your all tweets"
        })
    } catch (error) {
        throw new ApiError(500, error, "Server error")
    }
})

const updateTweet = asyncHandler(async (req, res) => {
    const userId = req.user._id
    const { tweetId } = req.params
    const { content } = req.body
    
    if (!content || content === "") {
        throw new ApiError(400, "content is required")
    }

    const tweet = await Tweet.findById(tweetId)

    if (userId.toString() !== tweet.owner.toString()) {
        throw new ApiError(400, "you are not authorized to update the tweet")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        { $set: { content } },
        {new: true, runValidators: true}
    )
    res.status(200).json(new ApiResponse(200, updatedTweet, "tweet updated successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { tweetId } = req.params

    const tweet = await Tweet.findById(tweetId)

    if (userId.toString() !== tweet.owner.toString()) {
        throw new ApiError(400, "you are not authorized to delete the tweet")
    }

    await Tweet.findByIdAndDelete(tweetId)

    res.status(200).json(new ApiResponse(200, "tweet deleted successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
