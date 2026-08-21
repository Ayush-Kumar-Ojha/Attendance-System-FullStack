import { Router } from "express";
import { protect, protectAdmin } from "../middleware/auth.js";
import { uploadBillClaim } from "../middleware/uploadBillClaim.js";

import {
    getBillClaims,
    createBillClaim,
    updateBillClaimStatus,
    generateBillVoucher,
    getBillVoucherById,
} from "../controllers/billClaimController.js";

const router = Router();

// Get bill claims
// Employee -> only their own claims
// Admin -> all claims / filtered claims
router.get(
    "/",
    protect,
    getBillClaims
);

// Create bill claim
// Employee uploads bill image using field name: "bill"
router.post(
    "/",
    protect,
    uploadBillClaim,
    createBillClaim
);

// Admin approve / reject claim
router.put(
    "/:id/status",
    protect,
    protectAdmin,
    updateBillClaimStatus
);

// Admin generates a printable voucher for a claim
router.post(
    "/:id/generate-voucher",
    protect,
    protectAdmin,
    generateBillVoucher
);

// Get a generated voucher (for the print page)
router.get(
    "/vouchers/:voucherId",
    protect,
    getBillVoucherById
);

export default router;