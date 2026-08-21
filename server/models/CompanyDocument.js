import mongoose from "mongoose";

const companyDocumentSchema = new mongoose.Schema(
    {
        type: { type: String, enum: ["HOLIDAY_LIST", "LEAVE_POLICY"], required: true, unique: true },
        fileUrl: { type: String, required: true },
        fileName: { type: String, required: true },
    },
    { timestamps: true }
);

const CompanyDocument = mongoose.models.CompanyDocument || mongoose.model("CompanyDocument", companyDocumentSchema);

export default CompanyDocument;