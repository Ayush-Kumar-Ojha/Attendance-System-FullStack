import mongoose from "mongoose";

const messageRequestSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        recipientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        status: {
            type: String,
            enum: ["PENDING", "ACCEPTED", "REJECTED"],
            default: "PENDING",
        },
    },
    {
        timestamps: true,
    }
);

messageRequestSchema.index({
    senderId: 1,
    recipientId: 1,
    status: 1,
});

const MessageRequest =
    mongoose.models.MessageRequest ||
    mongoose.model("MessageRequest", messageRequestSchema);

export default MessageRequest;