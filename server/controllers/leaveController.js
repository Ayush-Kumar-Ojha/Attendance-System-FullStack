import { inngest } from "../inngest/index.js";
import Employee from "../models/Employee.js";
import LeaveApplication from "../models/LeaveApplication.js";

// Create leave
// POST /api/leaves
export const createLeave = async (req, res) => {
    try {
        const session = req.session;

        if (!session || !session.userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { type, startDate, endDate, reason } = req.body;

        if (!type || !startDate || !endDate || !reason) {
            return res.status(400).json({ error: "Missing fields" });
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


        const leave = await LeaveApplication.findByIdAndUpdate(
            req.params.id,
            {
                status,
            },
            {
                new: true,
            }
        );


        if (!leave) {
            return res.status(404).json({
                error: "Leave not found",
            });
        }


        return res.json({
            success: true,
            data: leave,
        });


    } catch (error) {

        console.log("Update Leave Error:", error);

        return res.status(500).json({
            error: "Failed to update leave",
        });
    }
};