import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body

    const playlist = new Playlist({
        name,
        description,
        video: [],
        owner: req.user._id
    })

    await playlist.save()
    res.status(200).json(new ApiResponse(200, playlist, "new playlist created successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    const { page = 1, limit = 10 } = req.query

    try {
        const isValidUser = isValidObjectId(userId)
        const pageNumber = parseInt(page, 10)
        const pageSize = parseInt(limit, 10)
        const skip = (pageNumber - 1) * pageSize;
        
        if (!isValidUser) {
            throw new ApiError(404, "user id is not valid")
        }

        const totalPlaylists = await Playlist.countDocuments({ owner: userId })
        
        const userPlaylists = await Playlist.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                },
            },
            { $skip: skip },
            {$limit: pageSize}
        ])

        res.status(200).json({
            status: 200,
            userPlaylists,
            total: totalPlaylists,
            currentPage: pageNumber,
            totalPage: Math.ceil(totalPlaylists / pageSize),
            message: "user's playlists fached successfully"
        })
    } catch (error) {
        throw new ApiError(500, error, "Server error")
    }
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(400, "playlist not found")
    }
    res.status(200).json(new ApiResponse(200, playlist, "playlist found"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(400, "playlist not found")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, "video not found")
    }

    if (playlist.owner.toString() !== video.owner.toString()) {
        throw new ApiError(401, "only your vidos you can add your playlist")
    }

    const addToPlaylist = await Playlist.findOneAndUpdate(
        {_id: playlistId},
        {
            $addToSet: {
            videos: videoId
            }
        },
        {new: true}
    )

    res.status(200).json(new ApiResponse(200, addToPlaylist, "new video added to the playlist"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(400, "playlist not found")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, "video not found")
    }

    if (playlist.owner.toString() !== video.owner.toString()) {
        throw new ApiError(401, "only your vidos you can remove from your playlist")
    }

    await Playlist.findOneAndUpdate(
        { _id: playlistId },
        {
            $pull: {
                videos: videoId
            }
        },
        {new: true}
    )
    res.status(200).json(new ApiResponse(200, "video removed successfully"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const userId = req.user._id

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "playlist not found")
    }

    if (userId.toString() !== playlist.owner.toString()) {
        throw new ApiError(401, "you are not authorized to delete the playlist")
    }

    await Playlist.findByIdAndDelete(playlistId);
    res.status(200).json(new ApiResponse(200, "playlist deleted successfull"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const { name, description } = req.body
    const userId = req.user._id

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "playlist not found")
    }

    if (userId.toString() !== playlist.owner.toString()) {
        throw new ApiError(401, "you are not authorized to update the playlist")
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        { _id: playlistId },
        { $set: { name, description } },
        {new: true, runValidators: true}
    )

    res.status(200).json(new ApiResponse(200, updatedPlaylist, "playlist updated successfull"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
