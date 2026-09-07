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

        // ============================================================
        // PROFESSIONAL ADVANCE VOUCHER NUMBER
        //
        // Example:
        // ADV-2026-0001
        // ADV-2026-0002
        //
        // Old vouchers without voucherNumber continue working.
        // ============================================================

        voucherNumber: {
            type: String,
            unique: true,
            sparse: true,
            default: null,
        },

        // Advance Request Reference ID
        referenceId: {
            type: String,
            default: "",
        },

        employeeCode: {
            type: String,
            default: "",
        },

        employeeName: {
            type: String,
            default: "",
        },

        email: {
            type: String,
            default: "",
        },

        phone: {
            type: String,
            default: "",
        },

        joinDate: {
            type: Date,
            default: null,
        },

        designation: {
            type: String,
            default: "",
        },

        department: {
            type: String,
            default: "",
        },

        panNumber: {
            type: String,
            default: "",
        },

        uanNumber: {
            type: String,
            default: "",
        },

        bankName: {
            type: String,
            default: "",
        },

        bankAccountNumber: {
            type: String,
            default: "",
        },

        amount: {
            type: Number,
            required: true,
        },

        reason: {
            type: String,
            default: "",
        },

        generatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// ============================================================
// AUTO GENERATE ADVANCE VOUCHER NUMBER
//
// Format:
//
// ADV-2026-0001
// ADV-2026-0002
// ADV-2026-0003
//
// Only NEW vouchers receive a number.
// Existing vouchers are not modified.
// ============================================================

advanceVoucherSchema.pre(
    "save",
    async function () {
        if (!this.isNew) {
            return;
        }

        if (this.voucherNumber) {
            return;
        }

        const year =
            new Date().getFullYear();

        const prefix =
            `ADV-${year}-`;

        const lastVoucher =
            await this.constructor
                .findOne({
                    voucherNumber: {
                        $regex:
                            `^ADV-${year}-\\d{4}$`,
                    },
                })
                .sort({
                    voucherNumber: -1,
                })
                .select("voucherNumber")
                .lean();

        let nextNumber = 1;

        if (
            lastVoucher?.voucherNumber
        ) {
            const lastNumber =
                Number(
                    lastVoucher
                        .voucherNumber
                        .split("-")
                        .pop()
                );

            if (
                !Number.isNaN(
                    lastNumber
                )
            ) {
                nextNumber =
                    lastNumber + 1;
            }
        }

        this.voucherNumber =
            `${prefix}${String(
                nextNumber
            ).padStart(
                4,
                "0"
            )}`;
    }
);

const AdvanceVoucher =
    mongoose.models.AdvanceVoucher ||
    mongoose.model(
        "AdvanceVoucher",
        advanceVoucherSchema
    );

export default AdvanceVoucher;