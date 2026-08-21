import mongoose from "mongoose";

const advanceRequestSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 1,
        },

        reason: {
            type: String,
            default: "",
            trim: true,
        },

        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED"],
            default: "PENDING",
        },

        adminRemark: {
            type: String,
            default: "",
        },

        reviewedAt: {
            type: Date,
            default: null,
        },

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

const AdvanceRequest =
    mongoose.models.AdvanceRequest ||
    mongoose.model("AdvanceRequest", advanceRequestSchema);

export default AdvanceRequest;