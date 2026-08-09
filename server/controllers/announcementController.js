import Announcement from "../models/Announcement.js";

// Get all announcements
// GET /api/announcements
export const getAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ createdAt: -1 });
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
        const { title, message } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: "Title and message are required" });
        }

        const announcement = await Announcement.create({
            title,
            message,
            postedBy: req.session.userId,
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
        const { title, message } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: "Title and message are required" });
        }

        const announcement = await Announcement.findByIdAndUpdate(
            req.params.id,
            { title, message },
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