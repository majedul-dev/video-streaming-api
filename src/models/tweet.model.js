import mongoose, {Schema} from "mongoose";

const tweetSchema = new Schema({
    content: {
        type: String,
        required: [true, "content is required"],
        trim: true,
        validate: {
            validator: function (value) {
                return value.trim().length > 0
            },
            message: "content should not be empty"
        }
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, {timestamps: true})


export const Tweet = mongoose.model("Tweet", tweetSchema)