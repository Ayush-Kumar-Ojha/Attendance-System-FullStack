import { Router } from "express";

import { protect } from "../middleware/auth.js";

import {
    getPorfile,
    updateProfile,
    deleteDocument,
} from "../controllers/profileController.js";

import { uploadProfileFiles } from "../middleware/upload.js";

const profileRouter = Router();

// Get profile
profileRouter.get(
    "/",
    protect,
    getPorfile
);

// Update profile
profileRouter.post(
    "/",
    protect,
    uploadProfileFiles,
    updateProfile
);

// Delete attached employee document
profileRouter.delete(
    "/documents/:docId",
    protect,
    deleteDocument
);

export default profileRouter;