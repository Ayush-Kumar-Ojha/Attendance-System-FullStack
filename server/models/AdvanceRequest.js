import mongoose from "mongoose";

const TRACKING_STEPS = [
    { step: "SUBMITTED", label: "Submitted" },
    { step: "UNDER_REVIEW", label: "Under Review" },
    { step: "APPROVED", label: "Approved" },
    { step: "PAYMENT_PROCESSING", label: "Payment Processing" },
    { step: "PAID", label: "Paid" },
];

export const ADVANCE_TRACKING_STEPS = TRACKING_STEPS;

const trackingStepSchema = new mongoose.Schema(
    {
        step: { type: String, required: true },
        label: { type: String, required: true },
        status: {
            type: String,
            enum: ["PENDING", "DONE"],
            default: "PENDING",
        },
        completedAt: { type: Date, default: null },
        completedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        notes: { type: String, default: "" },
    },
    { _id: false }
);

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

        // Printable voucher reference
        advanceVoucherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdvanceVoucher",
            default: null,
        },

        // Payment tracking
        referenceId: {
            type: String,
            unique: true,
            sparse: true,
        },

        trackingChain: {
            type: [trackingStepSchema],
            default: [],
        },
    },
    { timestamps: true }
);

advanceRequestSchema.pre("validate", function () {
    if (!this.referenceId) {
        const datePart = new Date()
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, "");
        const randomPart = Math.random()
            .toString(36)
            .slice(2, 8)
            .toUpperCase();
        this.referenceId = `ADV-${datePart}-${randomPart}`;
    }

    if (!this.trackingChain || this.trackingChain.length === 0) {
        this.trackingChain = TRACKING_STEPS.map((s, index) => ({
            step: s.step,
            label: s.label,
            status: index === 0 ? "DONE" : "PENDING",
            completedAt: index === 0 ? new Date() : null,
            completedBy: null,
            notes: "",
        }));
    }
});

const AdvanceRequest =
    mongoose.models.AdvanceRequest ||
    mongoose.model("AdvanceRequest", advanceRequestSchema);

export default AdvanceRequest;