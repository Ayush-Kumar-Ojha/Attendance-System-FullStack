import { Router } from "express";

import {
    protect,
} from "../middleware/auth.js";

import {
    createGatePass,
    getGatePasses,
    getGatePassItemDetails,
    saveGatePassItemMaster,
} from "../controllers/gatePassController.js";

const gatePassRouter =
    Router();

// ============================================================
// GET GATE PASS HISTORY
//
// Admin  -> all
// Shyam  -> all
// Others -> own Gate Pass history
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
// Admin only
// ============================================================

gatePassRouter.post(
    "/item-master",
    protect,
    saveGatePassItemMaster
);

// ============================================================
// GENERATE / SAVE GATE PASS
//
// Both Admin and Employees
// ============================================================

gatePassRouter.post(
    "/",
    protect,
    createGatePass
);

export default gatePassRouter;