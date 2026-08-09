import { Router } from "express";
import { protect, protectAdmin } from "../middleware/auth.js";
import {
    getAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
} from "../controllers/announcementController.js";

const announcementRouter = Router();

announcementRouter.get("/", protect, getAnnouncements);
announcementRouter.post("/", protect, protectAdmin, createAnnouncement);
announcementRouter.put("/:id", protect, protectAdmin, updateAnnouncement);
announcementRouter.delete("/:id", protect, protectAdmin, deleteAnnouncement);

export default announcementRouter;