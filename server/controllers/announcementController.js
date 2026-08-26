import Announcement from "../models/Announcement.js";
import Employee from "../models/Employee.js";

// Get all announcements
// GET /api/announcements
export const getAnnouncements = async (req, res) => {
    try {
        const session = req.session;
        const userId = req.user?._id || req.user?.id || session?.userId;
        const role = req.user?.role || session?.role;

        const isAdmin = role === "ADMIN";

        if (isAdmin) {
            const announcements = await Announcement.find()
                .populate("targetEmployeeId", "firstName lastName")
                .sort({ createdAt: -1 });
            return res.json({ data: announcements });
        }

        // Employee view: filter announcements targeted to them
        const employee = await Employee.findOne({ userId });

        if (!employee) {
            const announcements = await Announcement.find({
                $or: [{ targetType: "ALL" }, { targetType: { $exists: false } }],
            }).sort({ createdAt: -1 });
            return res.json({ data: announcements });
        }

        const announcements = await Announcement.find({
            $or: [
                { targetType: "ALL" },
                { targetType: { $exists: false } },
                { targetType: "DEPARTMENT", targetDepartment: employee.department },
                { targetType: "INDIVIDUAL", targetEmployeeId: employee._id },
            ],
        })
            .populate("targetEmployeeId", "firstName lastName")
            .sort({ createdAt: -1 });

        return res.json({ data: announcements });
    } catch (error) {
        console.error("Get Announcements Error:", error);
        return res.status(500).json({ error: "Failed to fetch announcements" });
    }
};

// Create announcement
// POST /api/announcements
export const createAnnouncement = async (req, res) => {
    try {
        const { title, message, targetType, targetDepartment, targetEmployeeId } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: "Title and message are required" });
        }

        if (targetType === "DEPARTMENT" && !targetDepartment) {
            return res.status(400).json({ error: "Please select a department" });
        }

        if (targetType === "INDIVIDUAL" && !targetEmployeeId) {
            return res.status(400).json({ error: "Please select an employee" });
        }

        const announcement = await Announcement.create({
            title: title.trim(),
            message: message.trim(),
            postedBy: req.session?.userId || req.user?._id,
            targetType: targetType || "ALL",
            targetDepartment: targetType === "DEPARTMENT" ? targetDepartment : null,
            targetEmployeeId: targetType === "INDIVIDUAL" ? targetEmployeeId : null,
        });

        return res.status(201).json({ success: true, data: announcement });
    } catch (error) {
        console.error("Create Announcement Error:", error);
        return res.status(500).json({ error: "Failed to create announcement" });
    }
};

// Update announcement
// PUT /api/announcements/:id
export const updateAnnouncement = async (req, res) => {
    try {
        const { title, message, targetType, targetDepartment, targetEmployeeId } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: "Title and message are required" });
        }

        const announcement = await Announcement.findByIdAndUpdate(
            req.params.id,
            {
                title: title.trim(),
                message: message.trim(),
                targetType: targetType || "ALL",
                targetDepartment: targetType === "DEPARTMENT" ? targetDepartment : null,
                targetEmployeeId: targetType === "INDIVIDUAL" ? targetEmployeeId : null,
            },
            { new: true }
        );

        if (!announcement) {
            return res.status(404).json({ error: "Announcement not found" });
        }

        return res.json({ success: true, data: announcement });
    } catch (error) {
        console.error("Update Announcement Error:", error);
        return res.status(500).json({ error: "Failed to update announcement" });
    }
};

// Delete announcement
// DELETE /api/announcements/:id
export const deleteAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findByIdAndDelete(req.params.id);

        if (!announcement) {
            return res.status(404).json({ error: "Announcement not found" });
        }

        return res.json({ success: true, message: "Announcement deleted" });
    } catch (error) {
        console.error("Delete Announcement Error:", error);
        return res.status(500).json({ error: "Failed to delete announcement" });
    }
};