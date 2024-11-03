import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const subscriberId = req.user._id; // assuming req.user contains the logged-in user

    // Find if the subscription already exists
    const existingSubscription = await Subscription.findOne({
        subscriber: subscriberId,
        channel: channelId,
    });

    if (existingSubscription) {
        // If subscription exists, unsubscribe (remove it)
        await Subscription.findByIdAndDelete(existingSubscription._id);
        res.status(200).json(new ApiResponse(200, "Unsubscribed successfully"));
    } else {
        // If no subscription exists, subscribe (create new one)
        const newSubscription = new Subscription({
            subscriber: subscriberId,
            channel: channelId,
        });
        await newSubscription.save();
        res.status(201).json(new ApiResponse(200, newSubscription, "Subscribed successfully"));
    }

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const subscriberId = req.user._id; // assuming req.user contains the logged-in user's ID

    // Find all subscriptions where the user is the subscriber
    const subscriptions = await Subscription.find({ subscriber: subscriberId })
        .populate('channel', 'username email') // Populate the channel field with details (e.g., username, email)
        .exec();

    if (!subscriptions.length) {
        return res.status(404).json({ message: "No subscribed channels found for this user" });
    }

    // Map to return only the channel information
    const channels = subscriptions.map(subscription => subscription.channel);

    res.status(200).json(new ApiResponse(200, channels));
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    // Find all subscriptions for the given channel
    const subscriptions = await Subscription.find({ channel: channelId })
        .populate('subscriber', 'username email') // Populate subscriber details, e.g., username and email
        .exec();

    if (!subscriptions.length) {
        return res.status(404).json({ message: "No subscribers found for this channel" });
    }

    // Map the results to return only subscriber information
    const subscribers = subscriptions.map(subscription => subscription.subscriber);

    res.status(200).json(subscribers);

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}