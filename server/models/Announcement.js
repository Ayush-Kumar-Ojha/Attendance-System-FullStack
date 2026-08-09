import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        message: { type: String, required: true },
        postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

const Announcement =
    mongoose.models.Announcement || mongoose.model("Announcement", announcementSchema);

export default Announcement;