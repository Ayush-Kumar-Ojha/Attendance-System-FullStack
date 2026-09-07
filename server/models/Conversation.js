import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
    {
        participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
        lastMessageAt: { type: Date, default: Date.now },
        lastMessageText: { type: String, default: "" },
        isBlocked: { type: Boolean, default: false },
        blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

const Conversation = mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);

export default Conversation;