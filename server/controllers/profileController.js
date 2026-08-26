import Employee from "../models/Employee.js";
import User from "../models/User.js";

// Get profile
// GET /api/profile
export const getPorfile = async (req, res) => {
    try {
        const session = req.session;
        const userId = req.user?._id || req.user?.id || session?.userId;
        const employee = await Employee.findOne({ userId });

        if (!employee) {
            const user = await User.findById(userId);
            return res.json({
                firstName: "Admin",
                lastName: "",
                email: session?.email || user?.email,
                bio: user?.bio || "",
                image: user?.image || null,
                cvUrl: user?.cvUrl || null,
                cvFileName: user?.cvFileName || null,
                skills: user?.skills || [],
                phone: user?.phone || "",
                documents: user?.documents || [],
            });
        }

        return res.json({
            ...employee.toObject(),
            id: employee._id.toString(),
            documents: employee.documents || [],
        });
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch profile" });
    }
};

// Export alias to support both spelling imports (getPorfile & getProfile)
export const getProfile = getPorfile;

// Update Profile
// POST /api/profile
export const updateProfile = async (req, res) => {
    try {
        const session = req.session;
        const userId = req.user?._id || req.user?.id || session?.userId;
        const employee = await Employee.findOne({ userId });

        const updateData = {
            bio: req.body.bio ?? "",
        };

        if (req.body.phone !== undefined) {
            updateData.phone = req.body.phone;
        }

        if (req.body.skills) {
            try {
                updateData.skills = JSON.parse(req.body.skills);
            } catch (e) {
                // ignore
            }
        }

        const uploadedPhoto = req.files?.photo?.[0];
        const uploadedFile = req.files?.cv?.[0] || req.files?.documentFile?.[0] || req.files?.document?.[0] || req.file;

        if (uploadedPhoto) {
            updateData.image = uploadedPhoto.path;
        }

        // If uploading a named attached document (Aadhaar, PAN, Offer letter, etc.)
        if (req.body.documentName && uploadedFile) {
            const newDoc = {
                name: req.body.documentName.trim(),
                fileUrl: uploadedFile.path,
                fileName: uploadedFile.originalname,
                uploadedAt: new Date(),
            };

            if (employee) {
                await Employee.findByIdAndUpdate(employee._id, {
                    $push: { documents: newDoc },
                });
            } else {
                await User.findByIdAndUpdate(userId, {
                    $push: { documents: newDoc },
                });
            }
        } else if (uploadedFile && !req.body.documentName) {
            // Standard CV upload
            updateData.cvUrl = uploadedFile.path;
            updateData.cvFileName = uploadedFile.originalname;
        }

        if (employee) {
            if (employee.isDeleted) {
                return res.status(403).json({
                    error: "Your account is deactivated. You cannot update your profile.",
                });
            }
            await Employee.findByIdAndUpdate(employee._id, updateData);
        } else {
            await User.findByIdAndUpdate(userId, updateData);
        }

        return res.json({ success: true });
    } catch (error) {
        console.error("Update Profile Error:", error);
        return res.status(500).json({ error: error?.message || "Failed to update profile" });
    }
};

// Delete Document
// DELETE /api/profile/documents/:docId
export const deleteDocument = async (req, res) => {
    try {
        const session = req.session;
        const userId = req.user?._id || req.user?.id || session?.userId;
        const { docId } = req.params;

        const employee = await Employee.findOne({ userId });

        if (employee) {
            await Employee.findByIdAndUpdate(employee._id, {
                $pull: { documents: { _id: docId } },
            });
        } else {
            await User.findByIdAndUpdate(userId, {
                $pull: { documents: { _id: docId } },
            });
        }

        return res.json({ success: true, message: "Document removed" });
    } catch (error) {
        console.error("Delete Document Error:", error);
        return res.status(500).json({ error: "Failed to delete document" });
    }
};