import AdvanceRequest from "../models/AdvanceRequest.js";
import AdvanceVoucher from "../models/AdvanceVoucher.js";
import Employee from "../models/Employee.js";

const EMPLOYEE_SELECT_FIELDS =
    "employeeCode firstName lastName department position image email phone joinDate panNumber uanNumber bankName bankAccountNumber";

// Get advance requests
export const getAdvanceRequests = async (req, res) => {
    try {
        const isAdmin = req.session.role === "ADMIN";

        const {
            employeeId,
            month,
            year,
            status,
        } = req.query;

        const query = {};

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

        if (month && year) {
            const m = Number(month);
            const y = Number(year);

            query.createdAt = {
                $gte: new Date(y, m - 1, 1),
                $lt: new Date(y, m, 1),
            };
        } else if (year) {
            const y = Number(year);

            query.createdAt = {
                $gte: new Date(y, 0, 1),
                $lt: new Date(y + 1, 0, 1),
            };
        }

        const requests = await AdvanceRequest.find(query)
            .populate("employeeId", EMPLOYEE_SELECT_FIELDS)
            .sort({ createdAt: -1 })
            .lean();

        const data = requests.map((request) => ({
            ...request,
            id: request._id.toString(),
            employee: request.employeeId,
            employeeId: request.employeeId?._id?.toString(),
        }));

        return res.json({
            data,
        });
    } catch (error) {
        console.error("Get Advance Requests Error:", error);

        return res.status(500).json({
            error: "Failed to fetch advance requests",
        });
    }
};


// Employee - Request advance
export const createAdvanceRequest = async (req, res) => {
    try {
        const { amount, reason } = req.body;

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({
                error: "Valid advance amount is required",
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

        const request = await AdvanceRequest.create({
            employeeId: employee._id,
            amount: Number(amount),
            reason: reason || "",
        });

        const populated = await request.populate(
            "employeeId",
            EMPLOYEE_SELECT_FIELDS
        );

        return res.status(201).json({
            success: true,
            data: populated,
        });
    } catch (error) {
        console.error("Create Advance Request Error:", error);

        return res.status(500).json({
            error: "Failed to submit advance request",
        });
    }
};


// Admin - Approve / Reject
export const updateAdvanceStatus = async (req, res) => {
    try {
        const { status, adminRemark } = req.body;

        if (!["APPROVED", "REJECTED"].includes(status)) {
            return res.status(400).json({
                error: "Invalid status",
            });
        }

        const request = await AdvanceRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({
                error: "Advance request not found",
            });
        }

        request.status = status;
        request.adminRemark = adminRemark || "";
        request.reviewedAt = new Date();
        request.reviewedBy = req.session.userId;

        await request.save();

        return res.json({
            success: true,
            message: `Advance request ${status.toLowerCase()} successfully`,
            data: request,
        });
    } catch (error) {
        console.error("Update Advance Status Error:", error);

        return res.status(500).json({
            error: "Failed to update advance request",
        });
    }
};

// ======================================
// Admin - Generate a printable Advance Voucher
// POST /api/advances/:id/generate-voucher
// ======================================
export const generateAdvanceVoucher = async (req, res) => {
    try {
        const request = await AdvanceRequest.findById(
            req.params.id
        ).populate("employeeId");

        if (!request) {
            return res.status(404).json({
                error: "Advance request not found",
            });
        }

        const emp = request.employeeId || {};

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

        const voucher = await AdvanceVoucher.create({
            advanceRequestId: request._id,
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

            amount: Number(amount) || request.amount,
            reason: reason !== undefined ? reason : request.reason,

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
        console.error("Generate Advance Voucher Error:", error);

        return res.status(500).json({
            error: "Failed to generate advance voucher",
        });
    }
};

// ======================================
// Get an Advance Voucher by ID (for print page)
// GET /api/advances/vouchers/:voucherId
// ======================================
export const getAdvanceVoucherById = async (req, res) => {
    try {
        const voucher = await AdvanceVoucher.findById(
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
        console.error("Get Advance Voucher Error:", error);

        return res.status(500).json({
            error: "Failed to fetch voucher",
        });
    }
};