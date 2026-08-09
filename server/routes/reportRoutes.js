import { Router } from "express";
import { protect, protectAdmin } from "../middleware/auth.js";
import { getAttendanceReport } from "../controllers/reportController.js";

const reportRouter = Router();

reportRouter.get("/attendance", protect, protectAdmin, getAttendanceReport);

export default reportRouter;