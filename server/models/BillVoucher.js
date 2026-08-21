import mongoose from "mongoose";

const billVoucherSchema = new mongoose.Schema(
    {
        billClaimId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BillClaim",
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

const BillVoucher =
    mongoose.models.BillVoucher ||
    mongoose.model("BillVoucher", billVoucherSchema);

export default BillVoucher;