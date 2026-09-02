import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },

        date: {
            type: Date,
            required: true,
        },

        checkIn: {
            type: Date,
            default: null,
        },

        checkOut: {
            type: Date,
            default: null,
        },

        status: {
            type: String,
            enum: ["PRESENT", "ABSENT", "LATE"],
            default: "PRESENT",
        },

        workingHours: {
            type: Number,
            default: null,
        },

        dayType: {
            type: String,
            enum: [
                "Full Day",
                "Three Quarter Day",
                "Half Day",
                "Short Day",
                "Weekend Work",
                "Holiday Work",
                null,
            ],
            default: null,
        },

        isWeekendOrHoliday: {
            type: Boolean,
            default: false,
        },

        // =====================================================
        // ATTENDANCE SOURCE
        // =====================================================

        source: {
            type: String,
            enum: [
                "NORMAL",
                "EMPLOYEE_CORRECTION",
                "ADMIN_OVERRIDE",
                "AUTO_CHECKOUT",
            ],
            default: "NORMAL",
        },

        // =====================================================
        // AUTO CHECKOUT
        // =====================================================

        autoCheckedOut: {
            type: Boolean,
            default: false,
        },

        // =====================================================
        // EMPLOYEE CORRECTION
        // =====================================================

        correctionReason: {
            type: String,
            default: "",
        },

        correctedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

attendanceSchema.index(
    {
        employeeId: 1,
        date: 1,
    },
    {
        unique: true,
    }
);

const Attendance =
    mongoose.models.Attendance ||
    mongoose.model(
        "Attendance",
        attendanceSchema
    );

export default Attendance;