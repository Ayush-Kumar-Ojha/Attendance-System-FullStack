import { inngest } from "../inngest/index.js";
import Employee from "../models/Employee.js";
import LeaveApplication from "../models/LeaveApplication.js";
import sendEmail from "../config/nodemailer.js";

const MONTHLY_PAID_LEAVE_LIMIT = 3;

// ============================================================
// HELPERS
// ============================================================

const getLeaveDayCount = (leave) => {
    /*
        Half-day must always count as 0.5.

        1 half day  = 0.5
        2 half days = 1
        3 half days = 1.5
        4 half days = 2
    */

    if (leave.type === "HALF_DAY") {
        return 0.5;
    }

    const start =
        new Date(leave.startDate);

    const end =
        new Date(leave.endDate);

    const diffTime =
        end.getTime() -
        start.getTime();

    return (
        Math.round(
            diffTime /
                (1000 * 60 * 60 * 24)
        ) + 1
    );
};

const getLeaveTypeLabel = (type) => {
    const labels = {
        SICK: "Sick Leave",
        CASUAL: "Casual Leave",
        ANNUAL: "Annual Leave",

        // Internal database value stays MENSTRUAL.
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

const getMonthRange = (
    dateValue
) => {
    const date =
        new Date(dateValue);

    const start =
        new Date(
            date.getFullYear(),
            date.getMonth(),
            1,
            0,
            0,
            0,
            0
        );

    const end =
        new Date(
            date.getFullYear(),
            date.getMonth() + 1,
            0,
            23,
            59,
            59,
            999
        );

    return {
        start,
        end,
    };
};

// ============================================================
// GET EMPLOYEE'S NORMAL MONTHLY PAID LEAVE USAGE
// ============================================================
//
// Counts only:
//
// APPROVED
// normal PAID leaves
// same employee
// same month
//
// Does NOT count:
//
// Pending
// Rejected
// Emergency paid
// LOP
// Compensatory Leave
//
// ============================================================

const getEmployeeMonthlyPaidUsage =
    async (
        employeeId,
        dateValue,
        excludeLeaveId = null
    ) => {
        const {
            start,
            end,
        } =
            getMonthRange(
                dateValue
            );

        const query = {
            employeeId,

            status:
                "APPROVED",

            startDate: {
                $gte: start,
                $lte: end,
            },

            type: {
                $ne:
                    "COMPENSATORY",
            },

            isEmergencyOverride:
                {
                    $ne: true,
                },

            isLop: {
                $ne: true,
            },

            paymentType: {
                $ne:
                    "UNPAID",
            },
        };

        if (excludeLeaveId) {
            query._id = {
                $ne:
                    excludeLeaveId,
            };
        }

        const leaves =
            await LeaveApplication.find(
                query
            );

        return leaves.reduce(
            (
                total,
                leave
            ) =>
                total +
                getLeaveDayCount(
                    leave
                ),
            0
        );
    };

// ============================================================
// CREATE LEAVE
// POST /api/leave
// ============================================================

export const createLeave =
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

            const {
                type,
                startDate,
                endDate,
                reason,
                halfDayPeriod,
                workedDate,
            } =
                req.body;

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

            if (
                type ===
                    "HALF_DAY" &&
                !halfDayPeriod
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Half day period is required",
                    });
            }

            if (
                type ===
                    "COMPENSATORY" &&
                !workedDate
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Please enter the date on which you worked extra",
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

            if (
                employee.isDeleted
            ) {
                return res
                    .status(403)
                    .json({
                        error:
                            "Your account is deactivated. You cannot apply for leave.",
                    });
            }

            const today =
                new Date();

            today.setHours(
                0,
                0,
                0,
                0
            );

            const leaveStartDate =
                new Date(
                    startDate
                );

            const leaveEndDate =
                new Date(
                    endDate
                );

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
                leaveStartDate <=
                    today ||
                leaveEndDate <=
                    today
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

            /*
                IMPORTANT

                Employee applying for leave
                does NOT decide:

                - Paid
                - LOP
                - Emergency

                Request remains PENDING.

                Admin later selects:

                1. Normal Paid Approval
                2. Special Emergency Paid
                3. Loss of Pay
                4. Reject
            */

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
                            new Date(
                                startDate
                            ),

                        endDate:
                            new Date(
                                endDate
                            ),

                        reason,

                        status:
                            "PENDING",

                        // Admin decides later.
                        isLop:
                            false,

                        paymentType:
                            null,

                        isEmergencyOverride:
                            false,
                    }
                );

            await inngest
                .send({
                    name:
                        "leave/pending",

                    data: {
                        leaveApplicationId:
                            leave._id,
                    },
                })
                .catch(
                    (error) => {
                        console.error(
                            "Failed to send leave pending event:",
                            error
                        );
                    }
                );

            return res
                .status(201)
                .json({
                    success:
                        true,

                    data:
                        leave,
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

export const getLeaves =
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
                role ===
                "ADMIN";

            // ====================================================
            // ADMIN
            // ====================================================

            if (isAdmin) {
                const {
                    status,
                    employeeId,
                    month,
                    year,
                } =
                    req.query;

                const where =
                    {};

                if (status) {
                    where.status =
                        status;
                }

                if (
                    employeeId
                ) {
                    where.employeeId =
                        employeeId;
                }

                if (
                    month &&
                    year
                ) {
                    const monthNum =
                        Number(
                            month
                        );

                    const yearNum =
                        Number(
                            year
                        );

                    const monthStart =
                        new Date(
                            yearNum,
                            monthNum -
                                1,
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

                    where.startDate =
                        {
                            $gte:
                                monthStart,

                            $lte:
                                monthEnd,
                        };

                } else if (
                    year
                ) {
                    const yearNum =
                        Number(
                            year
                        );

                    where.startDate =
                        {
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
                            createdAt:
                                -1,
                        });

                const data =
                    leaves.map(
                        (
                            leave
                        ) => {
                            const obj =
                                leave.toObject();

                            return {
                                ...obj,

                                id:
                                    obj._id.toString(),

                                employee:
                                    obj.employeeId,

                                employeeId:
                                    obj.employeeId?._id?.toString(),
                            };
                        }
                    );

                return res.json(
                    {
                        data,
                    }
                );
            }

            // ====================================================
            // EMPLOYEE
            // ====================================================

            const employee =
                await Employee.findOne(
                    {
                        userId,
                    }
                ).lean();

            if (!employee) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Employee not found",
                    });
            }

            /*
                Employee receives ALL own leave records.

                Leave.jsx needs this for:

                - monthly tracker
                - annual tracker
                - paid balance
                - half-day calculation
                - LOP history
                - emergency leave
            */

            const leaves =
                await LeaveApplication.find(
                    {
                        employeeId:
                            employee._id,
                    }
                ).sort({
                    createdAt:
                        -1,
                });

            return res.json(
                {
                    data:
                        leaves,

                    employee: {
                        ...employee,

                        id:
                            employee._id.toString(),
                    },
                }
            );

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
// ============================================================

export const updateLeaveStatus =
    async (
        req,
        res
    ) => {
        try {
            const {
                status,

                isEmergencyOverride =
                    false,

                isLop =
                    false,

                adminRemark,
            } =
                req.body;

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

            const updateData =
                {
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
            // APPROVAL
            // =================================================

            if (
                status ===
                "APPROVED"
            ) {
                const requestedDays =
                    getLeaveDayCount(
                        leave
                    );

                const alreadyUsedPaidDays =
                    await getEmployeeMonthlyPaidUsage(
                        leave.employeeId,
                        leave.startDate,
                        leave._id
                    );

                const totalIfApproved =
                    alreadyUsedPaidDays +
                    requestedDays;

                const exceedsQuota =
                    totalIfApproved >
                    MONTHLY_PAID_LEAVE_LIMIT;

                // =================================================
                // SPECIAL EMERGENCY PAID APPROVAL
                // =================================================

                if (
                    isEmergencyOverride
                ) {
                    updateData.isEmergencyOverride =
                        true;

                    updateData.isLop =
                        false;

                    updateData.paymentType =
                        "PAID";
                }

                // =================================================
                // LOSS OF PAY
                // =================================================

                else if (
                    isLop
                ) {
                    /*
                        LOP can only be selected
                        if the employee's normal
                        paid leave would exceed 3 days.

                        Example:

                        2 + 1 = 3
                        LOP NOT allowed.

                        2.5 + 0.5 = 3
                        LOP NOT allowed.

                        3 + 0.5 = 3.5
                        LOP allowed.

                        2.5 + 1 = 3.5
                        LOP allowed.
                    */

                    if (
                        leave.type ===
                        "COMPENSATORY"
                    ) {
                        return res
                            .status(400)
                            .json({
                                error:
                                    "Compensatory leave cannot be approved as Loss of Pay.",
                            });
                    }

                    if (
                        !exceedsQuota
                    ) {
                        return res
                            .status(400)
                            .json({
                                error:
                                    `LOP is not available. Employee has used ${alreadyUsedPaidDays} of ${MONTHLY_PAID_LEAVE_LIMIT} paid leave days this month.`,
                            });
                    }

                    updateData.isEmergencyOverride =
                        false;

                    updateData.isLop =
                        true;

                    updateData.paymentType =
                        "UNPAID";
                }

                // =================================================
                // NORMAL PAID APPROVAL
                // =================================================

                else {
                    /*
                        Normal approval cannot exceed
                        the monthly 3-day paid quota.

                        If quota is exceeded,
                        admin must select:

                        - Special Emergency Case
                        OR
                        - Loss of Pay
                    */

                    if (
                        exceedsQuota &&
                        leave.type !==
                            "COMPENSATORY"
                    ) {
                        return res
                            .status(400)
                            .json({
                                error:
                                    `Normal paid approval would exceed the ${MONTHLY_PAID_LEAVE_LIMIT}-day monthly paid leave limit. Please approve as LOP or Special Emergency Case.`,
                            });
                    }

                    updateData.isEmergencyOverride =
                        false;

                    updateData.isLop =
                        false;

                    updateData.paymentType =
                        "PAID";
                }
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
                await LeaveApplication.findByIdAndUpdate(
                    req.params.id,
                    updateData,
                    {
                        new:
                            true,
                    }
                );

            // =================================================
            // EMAIL
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

                if (
                    employee?.email
                ) {
                    const isApproved =
                        status ===
                        "APPROVED";

                    const isOverride =
                        updatedLeave.isEmergencyOverride;

                    const isLopApproval =
                        updatedLeave.isLop ||
                        updatedLeave.paymentType ===
                            "UNPAID";

                    let approvalText =
                        "";

                    if (
                        isOverride
                    ) {
                        approvalText =
                            "The request has been approved as a Special Emergency Paid Leave.";
                    } else if (
                        isLopApproval
                    ) {
                        approvalText =
                            "The request has been approved as Loss of Pay (LOP).";
                    } else if (
                        isApproved
                    ) {
                        approvalText =
                            "The request has been approved as normal paid leave.";
                    } else {
                        approvalText =
                            "The leave request has been rejected.";
                    }

                    const leaveTypeLabel =
                        getLeaveTypeLabel(
                            updatedLeave.type
                        );

                    const duration =
                        getLeaveDayCount(
                            updatedLeave
                        );

                    sendEmail({
                        to:
                            employee.email,

                        subject:
                            `Leave Application ${
                                isApproved
                                    ? "Approved"
                                    : "Rejected"
                            }`,

                        body: `
                            <div
                                style="
                                    max-width:600px;
                                    margin:auto;
                                    font-family:Arial,sans-serif;
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
                                    Hi ${employee.firstName || "Employee"},
                                </h2>

                                <p style="font-size:15px;">
                                    Your leave application has been
                                    <strong
                                        style="
                                            color:${
                                                isApproved
                                                    ? "#059669"
                                                    : "#dc2626"
                                            };
                                        "
                                    >
                                        ${status}
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
                                        <strong>Leave Type:</strong>
                                        ${leaveTypeLabel}
                                    </p>

                                    <p style="margin:4px 0;">
                                        <strong>Duration:</strong>
                                        ${duration}
                                        day${duration !== 1 ? "s" : ""}
                                    </p>

                                    <p style="margin:4px 0;">
                                        <strong>Dates:</strong>
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

                                    ${
                                        updatedLeave.type ===
                                            "HALF_DAY" &&
                                        updatedLeave.halfDayPeriod
                                            ? `
                                                <p style="margin:4px 0;">
                                                    <strong>Half Day Period:</strong>
                                                    ${
                                                        updatedLeave.halfDayPeriod ===
                                                        "FIRST_HALF"
                                                            ? "First Half"
                                                            : "Second Half"
                                                    }
                                                </p>
                                            `
                                            : ""
                                    }

                                    ${
                                        updatedLeave.adminRemark
                                            ? `
                                                <p style="margin:4px 0;">
                                                    <strong>Admin Remark:</strong>
                                                    ${updatedLeave.adminRemark}
                                                </p>
                                            `
                                            : ""
                                    }

                                </div>

                                ${
                                    isApproved
                                        ? `
                                            <p
                                                style="
                                                    margin-top:18px;
                                                    font-size:14px;
                                                    color:#475569;
                                                "
                                            >
                                                Your leave request has been processed successfully.
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
                        (
                            error
                        ) =>
                            console.error(
                                "Failed to send leave status email:",
                                error
                            )
                    );
                }
            }

            return res.json(
                {
                    success:
                        true,

                    data:
                        updatedLeave,
                }
            );

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

            await LeaveApplication.findByIdAndDelete(
                req.params.id
            );

            return res.json(
                {
                    success:
                        true,
                }
            );

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