import mongoose from "mongoose";

const leaveApplicationSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },

        type: {
            type: String,
            enum: [
                "SICK",
                "CASUAL",
                "ANNUAL",
                "MENSTRUAL",
                "HALF_DAY",
                "COMPENSATORY",
            ],
            required: true,
        },

        halfDayPeriod: {
            type: String,
            enum: ["FIRST_HALF", "SECOND_HALF", null],
            default: null,
        },

        workedDate: {
            type: Date,
            default: null,
        },

        startDate: {
            type: Date,
            required: true,
        },

        endDate: {
            type: Date,
            required: true,
        },

        reason: {
            type: String,
            required: true,
        },

        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED"],
            default: "PENDING",
        },

        paymentType: {
            type: String,
            enum: ["PAID", "UNPAID", null],
            default: null,
        },

        // Admin approved this as a special paid emergency.
        // This does NOT consume the normal 3-day monthly paid quota.
        isEmergencyOverride: {
            type: Boolean,
            default: false,
        },

        // Approved as Loss of Pay.
        isLop: {
            type: Boolean,
            default: false,
        },

        adminRemark: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

const LeaveApplication =
    mongoose.models.LeaveApplication ||
    mongoose.model("LeaveApplication", leaveApplicationSchema);

export default LeaveApplication;