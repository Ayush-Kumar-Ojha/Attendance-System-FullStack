import AdvanceRequest from "../models/AdvanceRequest.js";
import AdvanceVoucher from "../models/AdvanceVoucher.js";
import Employee from "../models/Employee.js";

const EMPLOYEE_SELECT_FIELDS =
    "employeeCode firstName lastName department position image email phone joinDate panNumber uanNumber bankName bankAccountNumber";

const getUserId = (req) =>
    req.user?._id || req.user?.id || req.user?.userId || req.session?.userId;

const getUserRole = (req) =>
    (req.user?.role || req.session?.role || "").toUpperCase();

// Get advance requests
export const getAdvanceRequests = async (req, res) => {
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
            employeeId: request.employeeId?._id?.toString() || request.employeeId,
        }));

        return res.json({
            success: true,
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

        const userId = getUserId(req);

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

        const request = await AdvanceRequest.create({
            employeeId: employee._id,
            amount: Number(amount),
            reason: reason ? String(reason).trim() : "",
        });

        const populated = await request.populate(
            "employeeId",
            EMPLOYEE_SELECT_FIELDS
        );

        const reqObj = populated.toObject();

        return res.status(201).json({
            success: true,
            data: {
                ...reqObj,
                id: reqObj._id.toString(),
                employee: reqObj.employeeId,
                employeeId: reqObj.employeeId?._id?.toString() || reqObj.employeeId,
            },
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

        const userId = getUserId(req);

        request.status = status;
        request.adminRemark = adminRemark || "";
        request.reviewedAt = new Date();
        request.reviewedBy = userId || null;

        if (status === "APPROVED" && request.trackingChain?.length) {
            const now = new Date();

            request.trackingChain.forEach((step) => {
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

// Admin - Manually mark a tracking chain step as done
export const markAdvanceTrackingStep = async (req, res) => {
    try {
        const { id, step } = req.params;
        const { notes } = req.body;

        const request = await AdvanceRequest.findById(id);

        if (!request) {
            return res.status(404).json({
                error: "Advance request not found",
            });
        }

        const stepIndex = request.trackingChain.findIndex(
            (s) => s.step === step
        );

        if (stepIndex === -1) {
            return res.status(400).json({
                error: "Invalid tracking step",
            });
        }

        if (request.trackingChain[stepIndex].status === "DONE") {
            return res.status(400).json({
                error: "This step is already marked done",
            });
        }

        const previousIncomplete = request.trackingChain
            .slice(0, stepIndex)
            .some((s) => s.status !== "DONE");

        if (previousIncomplete) {
            return res.status(400).json({
                error: "Complete the previous steps first",
            });
        }

        const userId = getUserId(req);

        request.trackingChain[stepIndex].status = "DONE";
        request.trackingChain[stepIndex].completedAt = new Date();
        request.trackingChain[stepIndex].completedBy = userId || null;
        request.trackingChain[stepIndex].notes = notes || "";

        await request.save();

        return res.json({
            success: true,
            data: request.trackingChain,
        });
    } catch (error) {
        console.error("Mark Advance Tracking Step Error:", error);

        return res.status(500).json({
            error: "Failed to update tracking step",
        });
    }
};

// Admin - Generate a printable Advance Voucher
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

        const userId = getUserId(req);

        const depName = typeof department === "object"
            ? (department?.department_name || department?.name || "")
            : (department || (typeof emp.department === "object" ? (emp.department?.department_name || emp.department?.name || "") : (emp.department || "")));

        const voucher = await AdvanceVoucher.create({
            advanceRequestId: request._id,
            employeeId: emp._id || request.employeeId,
            referenceId: request.referenceId || "",

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

            amount: Number(amount) || request.amount,
            reason: reason !== undefined ? reason : request.reason,

            generatedBy: userId || null,
        });

        // Link voucher to request
        request.advanceVoucherId = voucher._id;
        await request.save();

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

// Get an Advance Voucher by ID
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
            success: true,
            data: {
                ...voucher,
                id: voucher._id.toString(),
            },
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