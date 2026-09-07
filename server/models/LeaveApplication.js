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
            enum: [
                "PENDING",
                "APPROVED",
                "REJECTED",
            ],
            default: "PENDING",
        },

        // PAID    -> Admin accepted as normal paid leave
        // UNPAID  -> Admin accepted as Loss of Pay
        // null    -> Pending / Rejected
        paymentType: {
            type: String,
            enum: ["PAID", "UNPAID", null],
            default: null,
        },

        // Kept because older records may already contain this field.
        // We are not removing old database functionality.
        isEmergencyOverride: {
            type: Boolean,
            default: false,
        },

        // TRUE only when admin explicitly clicks
        // "Accept as Loss of Pay".
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
    mongoose.model(
        "LeaveApplication",
        leaveApplicationSchema
    );

export default LeaveApplication;