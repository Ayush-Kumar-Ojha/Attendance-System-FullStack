import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { getPorfile, updateProfile } from "../controllers/profileController.js";
import { uploadProfileFiles } from "../middleware/upload.js";

const profileRouter = Router();

profileRouter.get("/", protect, getPorfile)
profileRouter.post("/", protect, uploadProfileFiles, updateProfile)

export default profileRouter;