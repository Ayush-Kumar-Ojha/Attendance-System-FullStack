import CompanyDocument from "../models/CompanyDocument.js";

// Get both documents (Holiday List + Leave Policy)
// GET /api/documents
export const getDocuments = async (req, res) => {
    try {
        const docs = await CompanyDocument.find().lean();
        const result = { HOLIDAY_LIST: null, LEAVE_POLICY: null };
        docs.forEach((d) => {
            result[d.type] = { fileUrl: d.fileUrl, fileName: d.fileName, updatedAt: d.updatedAt };
        });
        return res.json(result);
    } catch (error) {
        console.error("Get Documents Error:", error);
        return res.status(500).json({ error: "Failed to fetch documents" });
    }
};

// Upload/replace a document (admin only)
// POST /api/documents/:type
export const uploadCompanyDocument = async (req, res) => {
    try {
        const { type } = req.params;
        if (!["HOLIDAY_LIST", "LEAVE_POLICY"].includes(type)) {
            return res.status(400).json({ error: "Invalid document type" });
        }
        if (!req.file) return res.status(400).json({ error: "File is required" });

        const doc = await CompanyDocument.findOneAndUpdate(
            { type },
            { fileUrl: req.file.path, fileName: req.file.originalname },
            { upsert: true, new: true }
        );

        return res.json({ success: true, fileUrl: doc.fileUrl, fileName: doc.fileName });
    } catch (error) {
        console.error("Upload Document Error:", error);
        return res.status(500).json({ error: "Failed to upload document" });
    }
};

// Delete a document (admin only)
// DELETE /api/documents/:type
export const deleteCompanyDocument = async (req, res) => {
    try {
        const { type } = req.params;
        await CompanyDocument.findOneAndDelete({ type });
        return res.json({ success: true });
    } catch (error) {
        console.error("Delete Document Error:", error);
        return res.status(500).json({ error: "Failed to delete document" });
    }
};