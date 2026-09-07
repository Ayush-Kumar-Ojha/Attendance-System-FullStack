import mongoose from "mongoose";

const gatePassItemMasterSchema =
    new mongoose.Schema(
        {
            idNo: {
                type: String,
                default: "",
                trim: true,
            },

            // Main key used by Gate Pass to find UOM
            whPartNo: {
                type: String,
                required: true,
                trim: true,
                uppercase: true,
                unique: true,
                index: true,
            },

            description: {
                type: String,
                default: "",
                trim: true,
            },

            manufacturerPartNo: {
                type: String,
                default: "",
                trim: true,
            },

            // Examples:
            // NOS
            // MTR
            // KG
            // SET
            // PCS
            // BOX
            // LTR
            uom: {
                type: String,
                required: true,
                trim: true,
                uppercase: true,
            },

            isActive: {
                type: Boolean,
                default: true,
            },
        },
        {
            timestamps: true,
        }
    );

gatePassItemMasterSchema.index({
    description: "text",
    whPartNo: "text",
    manufacturerPartNo: "text",
});

const GatePassItemMaster =
    mongoose.models.GatePassItemMaster ||
    mongoose.model(
        "GatePassItemMaster",
        gatePassItemMasterSchema
    );

export default GatePassItemMaster;