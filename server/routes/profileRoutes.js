import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { getPorfile, updateProfile } from "../controllers/profileController.js";

const profileRouter = Router();

profileRouter.get("/", protect, getPorfile)
profileRouter.post("/", protect, updateProfile)

export default profileRouter;