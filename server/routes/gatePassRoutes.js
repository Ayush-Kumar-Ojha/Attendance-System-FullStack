import { Router } from "express";

import {
    protect,
} from "../middleware/auth.js";

import {
    createGatePass,
    getGatePasses,
    getGatePassItemDetails,
    saveGatePassItemMaster,
    updateGatePassApproval,
} from "../controllers/gatePassController.js";

const gatePassRouter =
    Router();

// ============================================================
// GET GATE PASS HISTORY
//
// Admin:
//      Can view all Gate Passes.
//
// Syam - Manager:
//      Can view Gate Passes including the requests assigned
//      to him for approval.
//
// Other Employees:
//      Can view only their own Gate Passes.
//
// Response also returns:
//      isGatePassApprover
// ============================================================

gatePassRouter.get(
    "/",
    protect,
    getGatePasses
);

// ============================================================
// ITEM MASTER LOOKUP
//
// Example:
// GET /api/gate-passes/item-details?whPartNo=WH-CABLE-001
// ============================================================

gatePassRouter.get(
    "/item-details",
    protect,
    getGatePassItemDetails
);

// ============================================================
// CREATE / UPDATE ITEM MASTER
//
// Admin only.
// Permission is checked inside the controller.
// ============================================================

gatePassRouter.post(
    "/item-master",
    protect,
    saveGatePassItemMaster
);

// ============================================================
// GENERATE / SEND GATE PASS
//
// Employee/Admin fills the existing Gate Pass form.
//
// On save:
//      approvalRequired = true
//      approvalStatus   = PENDING
//
// Gate Pass is automatically assigned to:
//      Syam - Manager
//
// THIS DOES NOT APPROVE THE PASS.
// THIS DOES NOT PRINT THE PASS.
// ============================================================

gatePassRouter.post(
    "/",
    protect,
    createGatePass
);

// ============================================================
// APPROVE / REJECT GATE PASS
//
// Only the actual Employee record:
//
//      Syam
//      Manager
//
// AND only when the Gate Pass has been assigned to his
// employee _id.
//
// Body:
//
// Approve:
// {
//     "status": "APPROVED"
// }
//
// Reject:
// {
//     "status": "REJECTED",
//     "remark": "Optional reason"
// }
// ============================================================

gatePassRouter.patch(
    "/:id/approval",
    protect,
    updateGatePassApproval
);

export default gatePassRouter;