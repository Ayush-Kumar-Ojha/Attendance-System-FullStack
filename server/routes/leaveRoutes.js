import { Router } from "express";

import { protect, protectAdmin } from "../middleware/auth.js";

import {
    createLeave,
    getLeaves,
    updateLeaveStatus,
    cancelLeave,
} from "../controllers/leaveController.js";

const leaveRouter = Router();

// Employee - Apply for leave
leaveRouter.post("/", protect, createLeave);

// Admin / Employee - Get leaves
leaveRouter.get("/", protect, getLeaves);

// Admin - Approve / Emergency Approve / LOP / Reject
leaveRouter.patch(
    "/:id",
    protect,
    protectAdmin,
    updateLeaveStatus
);

// Employee - Cancel own pending leave
leaveRouter.delete(
    "/:id",
    protect,
    cancelLeave
);

export default leaveRouter;