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
        // =====================================================
        // CREATOR
        // =====================================================

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

        // =====================================================
        // GATE PASS
        // =====================================================

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

        // =====================================================
        // EXISTING PRINT APPROVAL MATRIX
        //
        // These are kept exactly for your Gate Pass document.
        // =====================================================

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

        // =====================================================
        // NEW SYAM APPROVAL WORKFLOW
        //
        // IMPORTANT:
        // approvalRequired defaults to false so OLD Gate Passes
        // remain printable.
        //
        // Every NEW Gate Pass created by the controller sets
        // approvalRequired = true.
        // =====================================================

        approvalRequired: {
            type: Boolean,
            default: false,
            index: true,
        },

        approvalStatus: {
            type: String,
            enum: [
                "PENDING",
                "APPROVED",
                "REJECTED",
            ],
            default: "PENDING",
            index: true,
        },

        // =====================================================
        // ASSIGNED APPROVER
        //
        // This will always point to the actual Employee record
        // of Syam - Manager.
        // =====================================================

        approverEmployeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            default: null,
            index: true,
        },

        approverName: {
            type: String,
            default: "",
        },

        approverDesignation: {
            type: String,
            default: "",
        },

        // =====================================================
        // APPROVAL ACTION
        // =====================================================

        approvalActionByEmployeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            default: null,
        },

        approvalActionByName: {
            type: String,
            default: "",
        },

        approvalRemark: {
            type: String,
            default: "",
        },

        approvedAt: {
            type: Date,
            default: null,
        },

        rejectedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Useful indexes
gatePassSchema.index({
    creatorEmployeeId: 1,
    createdAt: -1,
});

gatePassSchema.index({
    approverEmployeeId: 1,
    approvalStatus: 1,
    createdAt: -1,
});

const GatePass =
    mongoose.models.GatePass ||
    mongoose.model(
        "GatePass",
        gatePassSchema
    );

export default GatePass;