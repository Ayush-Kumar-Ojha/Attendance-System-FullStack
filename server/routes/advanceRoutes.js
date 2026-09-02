import { Router } from "express";
import { protect, protectAdmin } from "../middleware/auth.js";

import {
    getAdvanceRequests,
    createAdvanceRequest,
    updateAdvanceStatus,
    generateAdvanceVoucher,
    getAdvanceVoucherById,
    markAdvanceTrackingStep,
} from "../controllers/advanceController.js";

const router = Router();

router.get("/", protect, getAdvanceRequests);

router.post(
    "/",
    protect,
    createAdvanceRequest
);

router.put(
    "/:id/status",
    protect,
    protectAdmin,
    updateAdvanceStatus
);

// Admin manually marks a tracking chain step as done
router.patch(
    "/:id/tracking/:step",
    protect,
    protectAdmin,
    markAdvanceTrackingStep
);

// Admin generates a printable voucher for an advance request
router.post(
    "/:id/generate-voucher",
    protect,
    protectAdmin,
    generateAdvanceVoucher
);

// Get a generated voucher (for the print page)
router.get(
    "/vouchers/:voucherId",
    protect,
    getAdvanceVoucherById
);

export default router;