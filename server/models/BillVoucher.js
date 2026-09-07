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

        // ============================================================
        // PROFESSIONAL VOUCHER NUMBER
        //
        // Example:
        // BRV-2026-0001
        // BRV-2026-0002
        //
        // Old vouchers without voucherNumber will continue working.
        // ============================================================

        voucherNumber: {
            type: String,
            unique: true,
            sparse: true,
            default: null,
        },

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
// AUTO GENERATE VOUCHER NUMBER
//
// Runs whenever a NEW BillVoucher is saved.
//
// Format:
// BRV-YYYY-0001
// BRV-YYYY-0002
// BRV-YYYY-0003
//
// Existing vouchers are not modified.
// ============================================================

billVoucherSchema.pre(
    "save",
    async function () {
        // Only generate for a new voucher.
        if (!this.isNew) {
            return;
        }

        // If voucherNumber already exists,
        // do not generate another one.
        if (this.voucherNumber) {
            return;
        }

        const year =
            new Date().getFullYear();

        const prefix =
            `BRV-${year}-`;

        // ========================================================
        // FIND THE LAST VOUCHER NUMBER FOR CURRENT YEAR
        // ========================================================

        const lastVoucher =
            await this.constructor
                .findOne({
                    voucherNumber: {
                        $regex:
                            `^BRV-${year}-\\d{4}$`,
                    },
                })
                .sort({
                    voucherNumber: -1,
                })
                .select(
                    "voucherNumber"
                )
                .lean();

        // ========================================================
        // DEFAULT FIRST NUMBER
        // ========================================================

        let nextNumber = 1;

        // ========================================================
        // IF PREVIOUS VOUCHER EXISTS
        // ========================================================

        if (
            lastVoucher &&
            lastVoucher.voucherNumber
        ) {
            const parts =
                lastVoucher.voucherNumber.split(
                    "-"
                );

            const lastNumber =
                Number(
                    parts[
                        parts.length - 1
                    ]
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

        // ========================================================
        // CREATE FINAL VOUCHER NUMBER
        //
        // Example:
        // BRV-2026-0001
        // ========================================================

        this.voucherNumber =
            `${prefix}${String(
                nextNumber
            ).padStart(
                4,
                "0"
            )}`;
    }
);

const BillVoucher =
    mongoose.models.BillVoucher ||
    mongoose.model(
        "BillVoucher",
        billVoucherSchema
    );

export default BillVoucher;