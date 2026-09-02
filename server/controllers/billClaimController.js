import BillClaim from "../models/BillClaim.js";
import BillVoucher from "../models/BillVoucher.js";
import Employee from "../models/Employee.js";

const EMPLOYEE_SELECT_FIELDS =
    "employeeCode firstName lastName department position image email phone joinDate panNumber uanNumber bankName bankAccountNumber";

// Helper to safely extract user ID and role from JWT auth (req.user) or session (req.session)
const getUserId = (req) =>
    req.user?._id || req.user?.id || req.user?.userId || req.session?.userId;

const getUserRole = (req) =>
    (req.user?.role || req.session?.role || "").toUpperCase();

// Employee/Admin - Get claims
export const getBillClaims = async (req, res) => {
    try {
        const isAdmin = getUserRole(req) === "ADMIN";
        const userId = getUserId(req);

        const {
            employeeId,
            month,
            year,
            status,
        } = req.query;

        const query = {};

        // Employee can only see own claims
        if (!isAdmin) {
            const employee = await Employee.findOne({
                $or: [
                    { userId },
                    { _id: userId },
                    ...(req.user?.email ? [{ email: req.user.email }] : []),
                ],
                isDeleted: { $ne: true },
            });

            if (!employee) {
                return res.status(404).json({
                    error: "Employee profile not found",
                });
            }

            query.employeeId = employee._id;
        } else if (employeeId) {
            query.employeeId = employeeId;
        }

        if (status) {
            query.status = status;
        }

        // Month filter
        if (month) {
            const m = Number(month);
            const y = Number(year);

            if (year) {
                query.createdAt = {
                    $gte: new Date(y, m - 1, 1),
                    $lt: new Date(y, m, 1),
                };
            }
        }

        // Year only filter
        if (year && !month) {
            const y = Number(year);

            query.createdAt = {
                $gte: new Date(y, 0, 1),
                $lt: new Date(y + 1, 0, 1),
            };
        }

        const claims = await BillClaim.find(query)
            .populate("employeeId", EMPLOYEE_SELECT_FIELDS)
            .sort({ createdAt: -1 })
            .lean();

        const data = claims.map((claim) => ({
            ...claim,
            id: claim._id.toString(),
            employee: claim.employeeId,
            employeeId: claim.employeeId?._id?.toString() || claim.employeeId,
        }));

        return res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Get Bill Claims Error:", error);

        return res.status(500).json({
            error: "Failed to fetch bill claims",
        });
    }
};

// Employee - Create claim
export const createBillClaim = async (req, res) => {
    try {
        const { amount, reason } = req.body;

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({
                error: "Expense amount must be a valid positive number",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: "Bill image is required",
            });
        }

        const userId = getUserId(req);

        if (!userId) {
            return res.status(401).json({
                error: "User authentication failed. Please login again.",
            });
        }

        const employee = await Employee.findOne({
            $or: [
                { userId },
                { _id: userId },
                ...(req.user?.email ? [{ email: req.user.email }] : []),
            ],
            isDeleted: { $ne: true },
        });

        if (!employee) {
            return res.status(404).json({
                error: "Employee profile not found for logged-in user",
            });
        }

        const imagePath = req.file.path || req.file.secure_url || req.file.url || "";

        if (!imagePath) {
            return res.status(400).json({
                error: "Failed to process uploaded bill image",
            });
        }

        const claim = await BillClaim.create({
            employeeId: employee._id,
            amount: Number(amount),
            reason: reason ? String(reason).trim() : "",
            billImage: imagePath,
        });

        const populated = await claim.populate(
            "employeeId",
            EMPLOYEE_SELECT_FIELDS
        );

        const claimObj = populated.toObject();

        return res.status(201).json({
            success: true,
            data: {
                ...claimObj,
                id: claimObj._id.toString(),
                employee: claimObj.employeeId,
                employeeId: claimObj.employeeId?._id?.toString() || claimObj.employeeId,
            },
        });
    } catch (error) {
        console.error("Create Bill Claim Error:", error);

        return res.status(500).json({
            error: error.message || "Failed to submit bill claim",
        });
    }
};

// Admin - Approve / Reject
export const updateBillClaimStatus = async (req, res) => {
    try {
        const { status, adminRemark } = req.body;

        if (!["APPROVED", "REJECTED"].includes(status)) {
            return res.status(400).json({
                error: "Invalid status",
            });
        }

        const claim = await BillClaim.findById(req.params.id);

        if (!claim) {
            return res.status(404).json({
                error: "Bill claim not found",
            });
        }

        const userId = getUserId(req);

        claim.status = status;
        claim.adminRemark = adminRemark || "";
        claim.reviewedAt = new Date();
        claim.reviewedBy = userId || null;

        if (status === "APPROVED" && claim.trackingChain?.length) {
            const now = new Date();

            claim.trackingChain.forEach((step) => {
                if (
                    (step.step === "UNDER_REVIEW" || step.step === "APPROVED") &&
                    step.status !== "DONE"
                ) {
                    step.status = "DONE";
                    step.completedAt = now;
                    step.completedBy = userId || null;
                }
            });
        }

        await claim.save();

        return res.json({
            success: true,
            message: `Bill claim ${status.toLowerCase()} successfully`,
            data: claim,
        });
    } catch (error) {
        console.error("Update Bill Claim Error:", error);

        return res.status(500).json({
            error: "Failed to update bill claim",
        });
    }
};

// Admin - Manually mark tracking step as done
export const markTrackingStep = async (req, res) => {
    try {
        const { id, step } = req.params;
        const { notes } = req.body;

        const claim = await BillClaim.findById(id);

        if (!claim) {
            return res.status(404).json({
                error: "Bill claim not found",
            });
        }

        const stepIndex = claim.trackingChain.findIndex(
            (s) => s.step === step
        );

        if (stepIndex === -1) {
            return res.status(400).json({
                error: "Invalid tracking step",
            });
        }

        if (claim.trackingChain[stepIndex].status === "DONE") {
            return res.status(400).json({
                error: "This step is already marked done",
            });
        }

        const previousIncomplete = claim.trackingChain
            .slice(0, stepIndex)
            .some((s) => s.status !== "DONE");

        if (previousIncomplete) {
            return res.status(400).json({
                error: "Complete the previous steps first",
            });
        }

        const userId = getUserId(req);

        claim.trackingChain[stepIndex].status = "DONE";
        claim.trackingChain[stepIndex].completedAt = new Date();
        claim.trackingChain[stepIndex].completedBy = userId || null;
        claim.trackingChain[stepIndex].notes = notes || "";

        await claim.save();

        return res.json({
            success: true,
            data: claim.trackingChain,
        });
    } catch (error) {
        console.error("Mark Tracking Step Error:", error);

        return res.status(500).json({
            error: "Failed to update tracking step",
        });
    }
};

// Admin - Generate printable voucher
export const generateBillVoucher = async (req, res) => {
    try {
        const claim = await BillClaim.findById(req.params.id).populate(
            "employeeId"
        );

        if (!claim) {
            return res.status(404).json({
                error: "Bill claim not found",
            });
        }

        const emp = claim.employeeId || {};

        const {
            employeeCode,
            employeeName,
            email,
            phone,
            joinDate,
            designation,
            department,
            panNumber,
            uanNumber,
            bankName,
            bankAccountNumber,
            amount,
            reason,
        } = req.body;

        const userId = getUserId(req);

        const depName = typeof department === "object"
            ? (department?.department_name || department?.name || "")
            : (department || (typeof emp.department === "object" ? (emp.department?.department_name || emp.department?.name || "") : (emp.department || "")));

        const voucher = await BillVoucher.create({
            billClaimId: claim._id,
            employeeId: emp._id || claim.employeeId,
            referenceId: claim.referenceId || "",

            employeeCode: employeeCode || emp.employeeCode || "",
            employeeName:
                employeeName ||
                `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
            email: email || emp.email || "",
            phone: phone || emp.phone || "",
            joinDate: joinDate
                ? new Date(joinDate)
                : emp.joinDate || null,
            designation: designation || emp.position || "",
            department: depName,
            panNumber: panNumber || emp.panNumber || "",
            uanNumber: uanNumber || emp.uanNumber || "",
            bankName: bankName || emp.bankName || "",
            bankAccountNumber:
                bankAccountNumber || emp.bankAccountNumber || "",

            amount: Number(amount) || claim.amount,
            reason: reason !== undefined ? reason : claim.reason,

            generatedBy: userId || null,
        });

        claim.billVoucherId = voucher._id;
        await claim.save();

        return res.status(201).json({
            success: true,
            data: {
                ...voucher.toObject(),
                id: voucher._id.toString(),
            },
        });
    } catch (error) {
        console.error("Generate Bill Voucher Error:", error);

        return res.status(500).json({
            error: "Failed to generate bill voucher",
        });
    }
};

// Get voucher by ID
export const getBillVoucherById = async (req, res) => {
    try {
        const voucher = await BillVoucher.findById(
            req.params.voucherId
        ).lean();

        if (!voucher) {
            return res.status(404).json({
                error: "Voucher not found",
            });
        }

        return res.json({
            success: true,
            data: {
                ...voucher,
                id: voucher._id.toString(),
            },
            ...voucher,
            id: voucher._id.toString(),
        });
    } catch (error) {
        console.error("Get Bill Voucher Error:", error);

        return res.status(500).json({
            error: "Failed to fetch voucher",
        });
    }
};