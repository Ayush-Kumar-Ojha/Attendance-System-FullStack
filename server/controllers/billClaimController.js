import BillClaim from "../models/BillClaim.js";
import BillVoucher from "../models/BillVoucher.js";
import Employee from "../models/Employee.js";

const EMPLOYEE_SELECT_FIELDS =
    "employeeCode firstName lastName department position image email phone joinDate panNumber uanNumber bankName bankAccountNumber";

// Employee/Admin - Get claims
export const getBillClaims = async (req, res) => {
    try {
        const isAdmin = req.session.role === "ADMIN";

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
                userId: req.session.userId,
                isDeleted: { $ne: true },
            });

            if (!employee) {
                return res.status(404).json({
                    error: "Employee not found",
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
            employeeId: claim.employeeId?._id?.toString(),
        }));

        return res.json({
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

        if (!amount) {
            return res.status(400).json({
                error: "Expense amount is required",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: "Bill image is required",
            });
        }

        const employee = await Employee.findOne({
            userId: req.session.userId,
            isDeleted: { $ne: true },
        });

        if (!employee) {
            return res.status(404).json({
                error: "Employee not found",
            });
        }

        const claim = await BillClaim.create({
            employeeId: employee._id,
            amount: Number(amount),
            reason: reason || "",
            billImage: req.file.path,
        });

        const populated = await claim.populate(
            "employeeId",
            EMPLOYEE_SELECT_FIELDS
        );

        return res.status(201).json({
            success: true,
            data: populated,
        });
    } catch (error) {
        console.error("Create Bill Claim Error:", error);

        return res.status(500).json({
            error: "Failed to submit bill claim",
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

        claim.status = status;
        claim.adminRemark = adminRemark || "";
        claim.reviewedAt = new Date();
        claim.reviewedBy = req.session.userId;

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

// ======================================
// Admin - Generate a printable Bill Voucher for a claim
// POST /api/bill-claims/:id/generate-voucher
// ======================================
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

        const voucher = await BillVoucher.create({
            billClaimId: claim._id,
            employeeId: emp._id,

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
            department: department || emp.department || "",
            panNumber: panNumber || emp.panNumber || "",
            uanNumber: uanNumber || emp.uanNumber || "",
            bankName: bankName || emp.bankName || "",
            bankAccountNumber:
                bankAccountNumber || emp.bankAccountNumber || "",

            amount: Number(amount) || claim.amount,
            reason: reason !== undefined ? reason : claim.reason,

            generatedBy: req.session.userId,
        });

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

// ======================================
// Get a Bill Voucher by ID (for print page)
// GET /api/bill-claims/vouchers/:voucherId
// ======================================
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