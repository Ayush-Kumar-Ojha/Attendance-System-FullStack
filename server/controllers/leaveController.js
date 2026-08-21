import { inngest } from "../inngest/index.js";
import Employee from "../models/Employee.js";
import LeaveApplication from "../models/LeaveApplication.js";
import sendEmail from "../config/nodemailer.js";

const MONTHLY_PAID_LEAVE_LIMIT = 3;

// Helper: how many days does this leave count as
const getLeaveDayCount = (leave) => {
    if (leave.type === "HALF_DAY") return 0.5;
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
};

// Create leave
// POST /api/leaves
export const createLeave = async (req, res) => {
    try {
        const session = req.session;

        if (!session || !session.userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { type, startDate, endDate, reason, halfDayPeriod } = req.body;

        if (!type || !startDate || !endDate || !reason) {
            return res.status(400).json({ error: "Missing fields" });
        }

        if (type === "HALF_DAY" && !halfDayPeriod) {
            return res.status(400).json({ error: "Half day period is required" });
        }

        const employee = await Employee.findOne({
            userId: session.userId,
        });

        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        if (employee.isDeleted) {
            return res.status(403).json({
                error: "Your account is deactivated. You cannot apply for leave.",
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (
            new Date(startDate) <= today ||
            new Date(endDate) <= today
        ) {
            return res.status(400).json({
                error: "Leave dates must be in the future",
            });
        }

        if (new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({
                error: "End date cannot be before start date",
            });
        }

        const leave = await LeaveApplication.create({
            employeeId: employee._id,
            type,
            halfDayPeriod: type === "HALF_DAY" ? halfDayPeriod : null,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason,
            status: "PENDING",
        });


        await inngest.send({
            name: "leave/pending",
            data: {
                leaveApplicationId: leave._id,
            },
        });


        return res.status(201).json({
            success: true,
            data: leave,
        });

    } catch (error) {
        console.log("Create Leave Error:", error);
        return res.status(500).json({
            error: "Failed to create leave",
        });
    }
};



// Get leaves
// GET /api/leaves
export const getLeaves = async (req, res) => {
    try {
        const session = req.session;

        if (!session || !session.userId) {
            return res.status(401).json({
                error: "Unauthorized",
            });
        }


        const isAdmin = session.role === "ADMIN";


        if (isAdmin) {

            const status = req.query.status;

            const where = status
                ? { status }
                : {};


            const leaves = await LeaveApplication
                .find(where)
                .populate("employeeId")
                .sort({ createdAt: -1 });


            const data = leaves.map((leave) => {

                const obj = leave.toObject();

                return {
                    ...obj,
                    id: obj._id.toString(),
                    employee: obj.employeeId,
                    employeeId: obj.employeeId?._id?.toString(),
                };
            });


            return res.json({
                data,
            });

        } else {


            const employee = await Employee.findOne({
                userId: session.userId,
            }).lean();


            if (!employee) {
                return res.status(404).json({
                    error: "Employee not found",
                });
            }


            const leaves = await LeaveApplication.find({
                employeeId: employee._id,
            })
            .sort({
                createdAt: -1,
            });


            return res.json({
                data: leaves,
                employee: {
                    ...employee,
                    id: employee._id.toString(),
                },
            });
        }


    } catch (error) {

        console.log("Get Leaves Error:", error);

        return res.status(500).json({
            error: "Failed to fetch leaves",
        });
    }
};



// Update leave status
// PATCH /api/leaves/:id
export const updateLeaveStatus = async (req, res) => {

    try {

        const { status } = req.body;


        if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {

            return res.status(400).json({
                error: "Invalid status",
            });
        }

        const updatedLeave = await LeaveApplication.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!updatedLeave) {
            return res.status(404).json({
                error: "Leave not found",
            });
        }

        // Send email notification to employee for APPROVED/REJECTED decisions
        if (status === "APPROVED" || status === "REJECTED") {
            const employee = await Employee.findById(updatedLeave.employeeId);
            if (employee?.email) {
                const isApproved = status === "APPROVED";
                sendEmail({
                    to: employee.email,
                    subject: `Leave Application ${isApproved ? "Approved" : "Rejected"}`,
                    body: `<div style="max-width: 600px; font-family: Arial, sans-serif;">
                        <h2>Hi ${employee.firstName}, 👋</h2>
                        <p style="font-size: 16px;">Your leave application has been <strong style="color: ${isApproved ? "#059669" : "#dc2626"};">${status}</strong>.</p>
                        <p style="font-size: 16px;">Type: <strong>${updatedLeave.type}</strong></p>
                        <p style="font-size: 16px;">Dates: <strong>${new Date(updatedLeave.startDate).toLocaleDateString()} - ${new Date(updatedLeave.endDate).toLocaleDateString()}</strong></p>
                        ${isApproved ? "<p style='font-size: 16px;'>Enjoy your time off!</p>" : "<p style='font-size: 16px;'>Please contact your admin if you have any questions.</p>"}
                        <br />
                        <p style="font-size: 16px;">Best Regards,</p>
                        <p style="font-size: 16px;"><strong>HR MS</strong></p>
                    </div>`,
                }).catch((err) => console.error("Failed to send leave status email:", err));
            }
        }

        return res.json({
            success: true,
            data: updatedLeave,
        });


    } catch (error) {

        console.log("Update Leave Error:", error);

        return res.status(500).json({
            error: "Failed to update leave",
        });
    }
};

// Cancel own pending leave
// DELETE /api/leave/:id
export const cancelLeave = async (req, res) => {
    try {
        const session = req.session;
        const employee = await Employee.findOne({ userId: session.userId });
        if (!employee) return res.status(404).json({ error: "Employee not found" });

        const leave = await LeaveApplication.findOne({ _id: req.params.id, employeeId: employee._id });
        if (!leave) return res.status(404).json({ error: "Leave not found" });
        if (leave.status !== "PENDING") {
            return res.status(400).json({ error: "Only pending leaves can be cancelled" });
        }

        await LeaveApplication.findByIdAndDelete(req.params.id);
        return res.json({ success: true });
    } catch (error) {
        console.error("Cancel Leave Error:", error);
        return res.status(500).json({ error: "Failed to cancel leave" });
    }
};