import mongoose from "mongoose";

const leaveApplicationSchema = new mongoose.Schema({
    employeeId: {type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true},
    type: {type: String, enum: ["SICK", "CASUAL", "ANNUAL", "MENSTRUAL", "HALF_DAY"], required: true},
    halfDayPeriod: {type: String, enum: ["FIRST_HALF", "SECOND_HALF", null], default: null},
    startDate: {type: Date, required: true },
    endDate: {type: Date, required: true },
    reason: {type: String, required: true },
    status: {type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
    paymentType: {type: String, enum: ["PAID", "UNPAID", null], default: null },
    
}, {timestamps: true})

const LeaveApplication = mongoose.models.LeaveApplication || mongoose.model("LeaveApplication", leaveApplicationSchema);

export default LeaveApplication;