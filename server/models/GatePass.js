import mongoose from "mongoose";

const gatePassItemSchema = new mongoose.Schema(
    {
        // Kept so old Gate Pass records continue working.
        // New records receive 1, 2, 3... automatically.
        itemNo: {
            type: String,
            default: "",
        },

        // Entered manually
        idNo: {
            type: String,
            default: "",
        },

        // WH Part No.
        // Field name "partNo" is intentionally preserved
        // so old saved Gate Passes do not break.
        partNo: {
            type: String,
            default: "",
        },

        // Entered manually
        description: {
            type: String,
            default: "",
        },

        // Entered manually
        manufacturerPartNo: {
            type: String,
            default: "",
        },

        // Entered manually
        qty: {
            type: String,
            default: "",
        },

        // Automatically fetched from Item Master
        uom: {
            type: String,
            default: "",
        },

        // Estimated Date of Return
        estimatedDor: {
            type: String,
            default: "",
        },

        // Kept for old Gate Pass compatibility
        hsnCode: {
            type: String,
            default: "",
        },

        remarks: {
            type: String,
            default: "",
        },
    },
    {
        _id: false,
    }
);

const gatePassSchema = new mongoose.Schema(
    {
        creatorUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },

        creatorEmployeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            default: null,
            index: true,
        },

        createdByName: {
            type: String,
            default: "",
        },

        createdByRole: {
            type: String,
            default: "",
        },

        gatePassNo: {
            type: String,
            default: "",
        },

        passType: {
            type: String,
            enum: [
                "Returnable",
                "Non-Returnable",
            ],
            default: "Returnable",
        },

        to: {
            type: String,
            default: "",
        },

        modeOfTransport: {
            type: String,
            default: "",
        },

        purpose: {
            type: String,
            default: "",
        },

        gatePassDate: {
            type: Date,
            default: Date.now,
        },

        items: {
            type: [gatePassItemSchema],
            default: [],
        },

        approvalName: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        approvalEmpNo: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        approvalDept: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

const GatePass =
    mongoose.models.GatePass ||
    mongoose.model(
        "GatePass",
        gatePassSchema
    );

export default GatePass;