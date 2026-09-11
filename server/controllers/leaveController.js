import {
    inngest,
} from "../inngest/index.js";

import Employee from "../models/Employee.js";
import LeaveApplication from "../models/LeaveApplication.js";
import sendEmail from "../config/nodemailer.js";

// ============================================================
// HELPERS
// ============================================================

const getLeaveDayCount = (leave) => {
    if (leave.type === "HALF_DAY") {
        return 0.5;
    }

    const start = new Date(
        leave.startDate
    );

    const end = new Date(
        leave.endDate
    );

    const diffTime =
        end.getTime() -
        start.getTime();

    return (
        Math.round(
            diffTime /
            (
                1000 *
                60 *
                60 *
                24
            )
        ) + 1
    );
};

const getLeaveTypeLabel = (type) => {
    const labels = {
        SICK: "Sick Leave",
        CASUAL: "Casual Leave",
        ANNUAL: "Annual Leave",
        MENSTRUAL: "Wellness Leave",
        HALF_DAY: "Half Day",
        COMPENSATORY:
            "Compensatory Leave",
    };

    return (
        labels[type] ||
        type ||
        "Leave"
    );
};

// ============================================================
// CREATE LEAVE
// POST /api/leave
// ============================================================

export const createLeave = async (
    req,
    res
) => {
    try {
        const session =
            req.session;

        const userId =
            req.user?._id ||
            req.user?.id ||
            session?.userId;

        if (!userId) {
            return res
                .status(401)
                .json({
                    error:
                        "Unauthorized",
                });
        }

        const {
            type,
            startDate,
            endDate,
            reason,
            halfDayPeriod,
            workedDate,
        } = req.body;

        // ====================================================
        // REQUIRED FIELD VALIDATION
        // ====================================================

        if (
            !type ||
            !startDate ||
            !endDate ||
            !reason
        ) {
            return res
                .status(400)
                .json({
                    error:
                        "Missing required fields",
                });
        }

        // ====================================================
        // HALF DAY VALIDATION
        // ====================================================

        if (
            type === "HALF_DAY" &&
            !halfDayPeriod
        ) {
            return res
                .status(400)
                .json({
                    error:
                        "Half day period is required",
                });
        }

        // ====================================================
        // COMPENSATORY LEAVE VALIDATION
        // ====================================================

        if (
            type === "COMPENSATORY" &&
            !workedDate
        ) {
            return res
                .status(400)
                .json({
                    error:
                        "Please enter the date on which you worked extra",
                });
        }

        // ====================================================
        // FIND EMPLOYEE
        // ====================================================

        const employee =
            await Employee.findOne({
                userId,
            });

        if (!employee) {
            return res
                .status(404)
                .json({
                    error:
                        "Employee not found",
                });
        }

        if (employee.isDeleted) {
            return res
                .status(403)
                .json({
                    error:
                        "Your account is deactivated. You cannot apply for leave.",
                });
        }

        // ====================================================
        // WELLNESS LEAVE - FEMALE EMPLOYEES ONLY
        // ====================================================

        if (
            type === "MENSTRUAL" &&
            String(employee.gender || "")
                .trim()
                .toUpperCase() !== "FEMALE"
        ) {
            return res
                .status(403)
                .json({
                    error:
                        "Wellness Leave is available only to female employees.",
                });
        }

        // ====================================================
        // DATE VALIDATION
        // ====================================================

        const today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );

        const leaveStartDate =
            new Date(startDate);

        const leaveEndDate =
            new Date(endDate);

        if (
            Number.isNaN(
                leaveStartDate.getTime()
            ) ||
            Number.isNaN(
                leaveEndDate.getTime()
            )
        ) {
            return res
                .status(400)
                .json({
                    error:
                        "Invalid leave date",
                });
        }

        leaveStartDate.setHours(
            0,
            0,
            0,
            0
        );

        leaveEndDate.setHours(
            0,
            0,
            0,
            0
        );

        if (
            leaveStartDate <= today ||
            leaveEndDate <= today
        ) {
            return res
                .status(400)
                .json({
                    error:
                        "Leave dates must be in the future",
                });
        }

        if (
            leaveEndDate <
            leaveStartDate
        ) {
            return res
                .status(400)
                .json({
                    error:
                        "End date cannot be before start date",
                });
        }

        // ====================================================
        // CREATE LEAVE REQUEST
        //
        // IMPORTANT:
        // Employee does NOT choose Paid / LOP.
        //
        // Employee only submits request.
        //
        // Admin later decides:
        // ACCEPT
        // ACCEPT AS LOSS OF PAY
        // REJECT
        // ====================================================

        const leave =
            await LeaveApplication.create(
                {
                    employeeId:
                        employee._id,

                    type,

                    halfDayPeriod:
                        type ===
                            "HALF_DAY"
                            ? halfDayPeriod
                            : null,

                    workedDate:
                        type ===
                            "COMPENSATORY" &&
                            workedDate
                            ? new Date(
                                workedDate
                            )
                            : null,

                    startDate:
                        leaveStartDate,

                    endDate:
                        leaveEndDate,

                    reason,

                    status:
                        "PENDING",

                    paymentType:
                        null,

                    isLop:
                        false,

                    // Kept for old DB compatibility
                    isEmergencyOverride:
                        false,
                }
            );

        // ====================================================
        // EXISTING INNGEST WORKFLOW
        // DO NOT REMOVE
        // ====================================================

        await inngest
            .send({
                name:
                    "leave/pending",

                data: {
                    leaveApplicationId:
                        leave._id,
                },
            })
            .catch((error) => {
                console.error(
                    "Failed to send leave pending event:",
                    error
                );
            });

        return res
            .status(201)
            .json({
                success: true,
                data: leave,
            });
    } catch (error) {
        console.error(
            "Create Leave Error:",
            error
        );

        return res
            .status(500)
            .json({
                error:
                    "Failed to create leave",
            });
    }
};

// ============================================================
// GET LEAVES
// GET /api/leave
// ============================================================

export const getLeaves = async (
    req,
    res
) => {
    try {
        const session =
            req.session;

        const userId =
            req.user?._id ||
            req.user?.id ||
            session?.userId;

        const role =
            req.user?.role ||
            session?.role;

        if (!userId) {
            return res
                .status(401)
                .json({
                    error:
                        "Unauthorized",
                });
        }

        const isAdmin =
            role === "ADMIN";

        // ====================================================
        // ADMIN
        // ====================================================

        if (isAdmin) {
            const {
                status,
                employeeId,
                month,
                year,
            } = req.query;

            const where = {};

            // STATUS FILTER
            if (status) {
                where.status =
                    status;
            }

            // EMPLOYEE FILTER
            if (employeeId) {
                where.employeeId =
                    employeeId;
            }

            // =================================================
            // MONTH + YEAR FILTER
            // =================================================

            if (
                month &&
                year
            ) {
                const monthNum =
                    Number(month);

                const yearNum =
                    Number(year);

                const monthStart =
                    new Date(
                        yearNum,
                        monthNum - 1,
                        1,
                        0,
                        0,
                        0,
                        0
                    );

                const monthEnd =
                    new Date(
                        yearNum,
                        monthNum,
                        0,
                        23,
                        59,
                        59,
                        999
                    );

                where.startDate = {
                    $gte:
                        monthStart,
                    $lte:
                        monthEnd,
                };
            } else if (year) {
                // =============================================
                // YEAR ONLY FILTER
                // =============================================

                const yearNum =
                    Number(year);

                where.startDate = {
                    $gte:
                        new Date(
                            yearNum,
                            0,
                            1,
                            0,
                            0,
                            0,
                            0
                        ),

                    $lte:
                        new Date(
                            yearNum,
                            11,
                            31,
                            23,
                            59,
                            59,
                            999
                        ),
                };
            }

            const leaves =
                await LeaveApplication.find(
                    where
                )
                    .populate(
                        "employeeId"
                    )
                    .sort({
                        createdAt: -1,
                    });

            const data =
                leaves.map(
                    (leave) => {
                        const obj =
                            leave.toObject();

                        return {
                            ...obj,

                            id:
                                obj._id.toString(),

                            employee:
                                obj.employeeId,

                            employeeId:
                                obj.employeeId
                                    ?._id
                                    ?.toString(),
                        };
                    }
                );

            return res.json({
                data,
            });
        }

        // ====================================================
        // EMPLOYEE
        //
        // Employees receive ALL their leave records.
        // Month/year filtering for their dashboard happens
        // in frontend so yearly summary also works.
        // ====================================================

        const employee =
            await Employee.findOne({
                userId,
            }).lean();

        if (!employee) {
            return res
                .status(404)
                .json({
                    error:
                        "Employee not found",
                });
        }

        const leaves =
            await LeaveApplication.find(
                {
                    employeeId:
                        employee._id,
                }
            ).sort({
                createdAt: -1,
            });

        return res.json({
            data: leaves,

            employee: {
                ...employee,

                id:
                    employee._id
                        .toString(),
            },
        });
    } catch (error) {
        console.error(
            "Get Leaves Error:",
            error
        );

        return res
            .status(500)
            .json({
                error:
                    "Failed to fetch leaves",
            });
    }
};

// ============================================================
// UPDATE LEAVE STATUS
// PATCH /api/leave/:id
//
// ADMIN ACTIONS:
//
// 1. ACCEPT
//    status      = APPROVED
//    paymentType = PAID
//    isLop       = false
//
// 2. ACCEPT AS LOSS OF PAY
//    status      = APPROVED
//    paymentType = UNPAID
//    isLop       = true
//
// 3. REJECT
//    status      = REJECTED
//
// PENDING is retained internally for old Review/Edit flow.
// ============================================================

export const updateLeaveStatus =
    async (
        req,
        res
    ) => {
        try {
            const {
                status,
                adminRemark,
                isLop = false,
            } = req.body;

            // =================================================
            // VALIDATE STATUS
            // =================================================

            if (
                ![
                    "APPROVED",
                    "REJECTED",
                    "PENDING",
                ].includes(
                    status
                )
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Invalid status",
                    });
            }

            // =================================================
            // FIND LEAVE
            // =================================================

            const leave =
                await LeaveApplication.findById(
                    req.params.id
                );

            if (!leave) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Leave not found",
                    });
            }

            const updateData = {
                status,
            };

            if (
                adminRemark !==
                undefined
            ) {
                updateData.adminRemark =
                    adminRemark;
            }

            // =================================================
            // ACCEPT / ACCEPT AS LOSS OF PAY
            // =================================================

            if (
                status ===
                "APPROVED"
            ) {
                const approveAsLop =
                    isLop === true ||
                    isLop === "true";

                // Existing old field is kept,
                // but is not used for new approval decisions.
                updateData.isEmergencyOverride =
                    false;

                updateData.isLop =
                    approveAsLop;

                updateData.paymentType =
                    approveAsLop
                        ? "UNPAID"
                        : "PAID";
            }

            // =================================================
            // REJECT
            // =================================================

            if (
                status ===
                "REJECTED"
            ) {
                updateData.isEmergencyOverride =
                    false;

                updateData.isLop =
                    false;

                updateData.paymentType =
                    null;
            }

            // =================================================
            // RETURN TO PENDING
            //
            // Kept for compatibility with the existing
            // Review / Edit functionality.
            // =================================================

            if (
                status ===
                "PENDING"
            ) {
                updateData.isEmergencyOverride =
                    false;

                updateData.isLop =
                    false;

                updateData.paymentType =
                    null;
            }

            const updatedLeave =
                await LeaveApplication
                    .findByIdAndUpdate(
                        req.params.id,
                        updateData,
                        {
                            new: true,
                        }
                    );

            // =================================================
            // EXISTING EMAIL FUNCTIONALITY
            // =================================================

            if (
                status ===
                "APPROVED" ||
                status ===
                "REJECTED"
            ) {
                const employee =
                    await Employee.findById(
                        updatedLeave.employeeId
                    );

                if (employee?.email) {
                    const isApproved =
                        status ===
                        "APPROVED";

                    const approvedAsLop =
                        isApproved &&
                        (
                            updatedLeave.isLop ||
                            updatedLeave
                                .paymentType ===
                            "UNPAID"
                        );

                    const leaveTypeLabel =
                        getLeaveTypeLabel(
                            updatedLeave.type
                        );

                    const duration =
                        getLeaveDayCount(
                            updatedLeave
                        );

                    const decisionLabel =
                        approvedAsLop
                            ? "Approved as Loss of Pay"
                            : isApproved
                                ? "Approved"
                                : "Rejected";

                    const approvalText =
                        approvedAsLop
                            ? "The leave request has been approved as Loss of Pay (unpaid leave)."
                            : isApproved
                                ? "The leave request has been approved as paid leave."
                                : "The leave request has been rejected.";

                    const decisionColor =
                        approvedAsLop
                            ? "#b45309"
                            : isApproved
                                ? "#047857"
                                : "#dc2626";

                    sendEmail({
                        to:
                            employee.email,

                        subject:
                            `Leave Application ${decisionLabel}`,

                        body: `
                            <div
                                style="
                                    max-width:600px;
                                    margin:auto;
                                    font-family:"Times New Roman", Times, serif;
                                    color:#334155;
                                    line-height:1.6;
                                "
                            >
                                <h2
                                    style="
                                        color:#0f172a;
                                        margin-bottom:8px;
                                    "
                                >
                                    Hi ${employee.firstName ||
                            "Employee"
                            },
                                </h2>

                                <p style="font-size:15px;">
                                    Your leave application has been

                                    <strong
                                        style="
                                            color:${decisionColor};
                                        "
                                    >
                                        ${decisionLabel}
                                    </strong>.
                                </p>

                                <p style="font-size:15px;">
                                    ${approvalText}
                                </p>

                                <div
                                    style="
                                        margin-top:18px;
                                        padding:16px;
                                        border:1px solid #e2e8f0;
                                        border-radius:10px;
                                        background:#f8fafc;
                                    "
                                >
                                    <p style="margin:4px 0;">
                                        <strong>
                                            Leave Type:
                                        </strong>

                                        ${leaveTypeLabel}
                                    </p>

                                    <p style="margin:4px 0;">
                                        <strong>
                                            Duration:
                                        </strong>

                                        ${duration}
                                        day${duration !== 1
                                ? "s"
                                : ""
                            }
                                    </p>

                                    <p style="margin:4px 0;">
                                        <strong>
                                            Dates:
                                        </strong>

                                        ${new Date(
                                updatedLeave.startDate
                            ).toLocaleDateString(
                                "en-IN"
                            )}

                                        -

                                        ${new Date(
                                updatedLeave.endDate
                            ).toLocaleDateString(
                                "en-IN"
                            )}
                                    </p>

                                    ${updatedLeave.type ===
                                "HALF_DAY" &&
                                updatedLeave
                                    .halfDayPeriod
                                ? `
                                                <p style="margin:4px 0;">
                                                    <strong>
                                                        Half Day Period:
                                                    </strong>

                                                    ${updatedLeave
                                    .halfDayPeriod ===
                                    "FIRST_HALF"
                                    ? "First Half"
                                    : "Second Half"
                                }
                                                </p>
                                            `
                                : ""
                            }

                                    ${updatedLeave.adminRemark
                                ? `
                                                <p style="margin:4px 0;">
                                                    <strong>
                                                        Admin Remark:
                                                    </strong>

                                                    ${updatedLeave
                                    .adminRemark
                                }
                                                </p>
                                            `
                                : ""
                            }
                                </div>

                                ${approvedAsLop
                                ? `
                                            <p
                                                style="
                                                    margin-top:18px;
                                                    font-size:14px;
                                                    color:#475569;
                                                "
                                            >
                                                This approved leave has been recorded as Loss of Pay and will not consume your paid leave balance.
                                            </p>
                                        `
                                : isApproved
                                    ? `
                                            <p
                                                style="
                                                    margin-top:18px;
                                                    font-size:14px;
                                                    color:#475569;
                                                "
                                            >
                                                This approved leave will be reflected in your paid leave usage.
                                            </p>
                                        `
                                    : `
                                            <p
                                                style="
                                                    margin-top:18px;
                                                    font-size:14px;
                                                    color:#475569;
                                                "
                                            >
                                                Please contact your administrator if you require further clarification.
                                            </p>
                                        `
                            }
                            </div>
                        `,
                    }).catch(
                        (error) =>
                            console.error(
                                "Failed to send leave status email:",
                                error
                            )
                    );
                }
            }

            return res.json({
                success: true,
                data: updatedLeave,
            });
        } catch (error) {
            console.error(
                "Update Leave Error:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Failed to update leave",
                });
        }
    };

// ============================================================
// CANCEL OWN PENDING LEAVE
// DELETE /api/leave/:id
// ============================================================

export const cancelLeave =
    async (
        req,
        res
    ) => {
        try {
            const session =
                req.session;

            const userId =
                req.user?._id ||
                req.user?.id ||
                session?.userId;

            if (!userId) {
                return res
                    .status(401)
                    .json({
                        error:
                            "Unauthorized",
                    });
            }

            const employee =
                await Employee.findOne(
                    {
                        userId,
                    }
                );

            if (!employee) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Employee not found",
                    });
            }

            const leave =
                await LeaveApplication.findOne(
                    {
                        _id:
                            req.params.id,

                        employeeId:
                            employee._id,
                    }
                );

            if (!leave) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Leave not found",
                    });
            }

            if (
                leave.status !==
                "PENDING"
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Only pending leaves can be cancelled",
                    });
            }

            await LeaveApplication
                .findByIdAndDelete(
                    req.params.id
                );

            return res.json({
                success: true,
            });
        } catch (error) {
            console.error(
                "Cancel Leave Error:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Failed to cancel leave",
                });
        }
    };