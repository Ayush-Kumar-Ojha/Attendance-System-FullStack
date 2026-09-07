import { Router } from "express";

import {
    protect,
    protectAdmin,
} from "../middleware/auth.js";

import {
    createLeave,
    getLeaves,
    updateLeaveStatus,
    cancelLeave,
} from "../controllers/leaveController.js";

const leaveRouter = Router();

// ============================================================
// EMPLOYEE - APPLY FOR LEAVE
// POST /api/leave
// ============================================================

leaveRouter.post(
    "/",
    protect,
    createLeave
);

// ============================================================
// ADMIN / EMPLOYEE - GET LEAVES
// GET /api/leave
// ============================================================

leaveRouter.get(
    "/",
    protect,
    getLeaves
);

// ============================================================
// ADMIN - UPDATE LEAVE
//
// Admin actions:
// 1. Accept
// 2. Accept as Loss of Pay
// 3. Reject
//
// Existing Review / Edit functionality is preserved.
// ============================================================

leaveRouter.patch(
    "/:id",
    protect,
    protectAdmin,
    updateLeaveStatus
);

// ============================================================
// EMPLOYEE - CANCEL OWN PENDING LEAVE
// DELETE /api/leave/:id
// ============================================================

leaveRouter.delete(
    "/:id",
    protect,
    cancelLeave
);

export default leaveRouter;