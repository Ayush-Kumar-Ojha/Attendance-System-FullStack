import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        message: { type: String, required: true },
        postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        targetType: {
            type: String,
            enum: ["ALL", "DEPARTMENT", "INDIVIDUAL"],
            default: "ALL",
        },
        targetDepartment: { type: String, default: null },
        targetEmployeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            default: null,
        },
    },
    { timestamps: true }
);

announcementSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const Announcement =
    mongoose.models.Announcement || mongoose.model("Announcement", announcementSchema);

export default Announcement;