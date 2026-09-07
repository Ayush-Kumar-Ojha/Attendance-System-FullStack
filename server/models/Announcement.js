import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },

        message: {
            type: String,
            required: true,
        },

        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        targetType: {
            type: String,
            enum: [
                "ALL",
                "DEPARTMENT",
                "INDIVIDUAL",
            ],
            default: "ALL",
        },

        targetDepartment: {
            type: String,
            default: null,
        },

        // ============================================================
        // OLD SINGLE EMPLOYEE FIELD
        // Kept for old announcements / backward compatibility
        // ============================================================

        targetEmployeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            default: null,
        },

        // ============================================================
        // NEW MULTIPLE EMPLOYEE FIELD
        // ============================================================

        targetEmployeeIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Employee",
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Automatically remove announcements after 30 days
announcementSchema.index(
    {
        createdAt: 1,
    },
    {
        expireAfterSeconds:
            30 * 24 * 60 * 60,
    }
);

const Announcement =
    mongoose.models.Announcement ||
    mongoose.model(
        "Announcement",
        announcementSchema
    );

export default Announcement;