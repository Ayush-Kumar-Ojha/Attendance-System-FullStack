import mongoose from "mongoose";

const advanceVoucherSchema = new mongoose.Schema(
    {
        advanceRequestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdvanceRequest",
            required: true,
        },

        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },

        employeeCode: { type: String, default: "" },
        employeeName: { type: String, default: "" },
        email: { type: String, default: "" },
        phone: { type: String, default: "" },
        joinDate: { type: Date, default: null },
        designation: { type: String, default: "" },
        department: { type: String, default: "" },
        panNumber: { type: String, default: "" },
        uanNumber: { type: String, default: "" },
        bankName: { type: String, default: "" },
        bankAccountNumber: { type: String, default: "" },

        amount: { type: Number, required: true },
        reason: { type: String, default: "" },

        generatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

const AdvanceVoucher =
    mongoose.models.AdvanceVoucher ||
    mongoose.model("AdvanceVoucher", advanceVoucherSchema);

export default AdvanceVoucher;