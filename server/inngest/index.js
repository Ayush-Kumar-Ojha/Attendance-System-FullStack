import { Inngest } from "inngest";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import LeaveApplication from "../models/LeaveApplication.js";
import User from "../models/User.js";
import sendEmail from "../config/nodemailer.js";

// ============================================================
// INNGEST CLIENT
// ============================================================

export const inngest =
    new Inngest({
        id:
            "attendance system",
    });

const MONTHLY_PAID_LEAVE_LIMIT =
    3;

const DAY_MS =
    24 * 60 * 60 * 1000;

// ============================================================
// SHARED ATTENDANCE HELPERS
// ============================================================

const calculateWorkingHours = (
    checkIn,
    checkOut
) => {
    const diff =
        new Date(
            checkOut
        ).getTime() -
        new Date(
            checkIn
        ).getTime();

    return parseFloat(
        Math.max(
            diff /
                (1000 *
                    60 *
                    60),
            0
        ).toFixed(
            2
        )
    );
};

const calculateDayType = (
    workingHours,
    isWeekendOrHoliday
) => {
    if (
        isWeekendOrHoliday
    ) {
        return "Weekend Work";
    }

    if (
        Number(workingHours) >= 6
    ) {
        return "Full Day";
    }

    return "Short Day";
};

const getTodayISTRange =
    () => {
        const dateString =
            new Date().toLocaleDateString(
                "en-CA",
                {
                    timeZone:
                        "Asia/Kolkata",
                }
            );

        const startUTC =
            new Date(
                `${dateString}T00:00:00+05:30`
            );

        const endUTC =
            new Date(
                startUTC.getTime() +
                    DAY_MS
            );

        return {
            dateString,

            startUTC,

            endUTC,
        };
    };

// ============================================================
// LEAVE HELPERS
// ============================================================

const getLeaveDayCount = (
    leave
) => {
    if (
        leave.type ===
        "HALF_DAY"
    ) {
        return 0.5;
    }

    const start =
        new Date(
            leave.startDate
        );

    const end =
        new Date(
            leave.endDate
        );

    const diff =
        end.getTime() -
        start.getTime();

    return (
        Math.round(
            diff /
                DAY_MS
        ) + 1
    );
};

const getLeaveTypeLabel = (
    type
) => {
    const labels = {
        SICK:
            "Sick Leave",

        CASUAL:
            "Casual Leave",

        ANNUAL:
            "Annual Leave",

        MENSTRUAL:
            "Wellness Leave",

        HALF_DAY:
            "Half Day",

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
        new Date(
            dateValue
        );

    const start =
        new Date(
            date.getFullYear(),
            date.getMonth(),
            1
        );

    const end =
        new Date(
            date.getFullYear(),
            date.getMonth() +
                1,
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

const getEmployeeMonthlyPaidUsage =
    async (
        employeeId,
        dateValue,
        excludeLeaveId =
            null
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
                $gte:
                    start,

                $lte:
                    end,
            },

            type: {
                $ne:
                    "COMPENSATORY",
            },

            isEmergencyOverride:
                {
                    $ne:
                        true,
                },

            isLop: {
                $ne:
                    true,
            },

            paymentType: {
                $ne:
                    "UNPAID",
            },
        };

        if (
            excludeLeaveId
        ) {
            query._id = {
                $ne:
                    excludeLeaveId,
            };
        }

        const leaves =
            await LeaveApplication.find(
                query
            ).lean();

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
// (A)
// 7 PM CHECKOUT REMINDER
// EXISTING FUNCTIONALITY
// ============================================================

const checkoutReminderCron =
    inngest.createFunction(
        {
            id:
                "checkout-reminder-cron",

            triggers: [
                {
                    cron:
                        "TZ=Asia/Kolkata 0 19 * * *",
                },
            ],
        },

        async ({
            step,
        }) => {
            const today =
                await step.run(
                    "get-today-date",
                    () => {
                        const {
                            startUTC,
                            endUTC,
                        } =
                            getTodayISTRange();

                        return {
                            startUTC:
                                startUTC.toISOString(),

                            endUTC:
                                endUTC.toISOString(),
                        };
                    }
                );

            const notCheckedOut =
                await step.run(
                    "get-not-checked-out",
                    async () => {
                        const records =
                            await Attendance.find(
                                {
                                    date: {
                                        $gte:
                                            new Date(
                                                today.startUTC
                                            ),

                                        $lt:
                                            new Date(
                                                today.endUTC
                                            ),
                                    },

                                    checkIn: {
                                        $ne:
                                            null,
                                    },

                                    checkOut:
                                        null,
                                }
                            )
                                .populate(
                                    "employeeId"
                                )
                                .lean();

                        return records.filter(
                            (
                                record
                            ) =>
                                record.employeeId
                        );
                    }
                );

            if (
                notCheckedOut.length >
                0
            ) {
                await step.run(
                    "send-checkout-reminders",
                    async () => {
                        const emailPromises =
                            notCheckedOut.map(
                                (
                                    record
                                ) => {
                                    const emp =
                                        record.employeeId;

                                    if (
                                        !emp?.email
                                    ) {
                                        return Promise.resolve();
                                    }

                                    return sendEmail(
                                        {
                                            to:
                                                emp.email,

                                            subject:
                                                "Reminder: You haven't checked out yet",

                                            body: `
                                                <div style="max-width:600px;font-family:Arial,sans-serif;">

                                                    <h2>
                                                        Hi ${emp.firstName || "Employee"}, 👋
                                                    </h2>

                                                    <p style="font-size:16px;">
                                                        It's past 7:00 PM and we noticed you haven't checked out yet today.
                                                    </p>

                                                    <p style="font-size:16px;">
                                                        You checked in at
                                                        <strong>
                                                            ${new Date(
                                                                record.checkIn
                                                            ).toLocaleTimeString(
                                                                "en-IN",
                                                                {
                                                                    timeZone:
                                                                        "Asia/Kolkata",
                                                                }
                                                            )}
                                                        </strong>.
                                                    </p>

                                                    <p style="font-size:16px;">
                                                        Please remember to check out before you leave.
                                                    </p>

                                                    <br />

                                                    <p style="font-size:14px;color:#666;">
                                                        Department:
                                                        ${emp.department || "N/A"}
                                                    </p>

                                                    <br />

                                                    <p style="font-size:16px;">
                                                        Best Regards,
                                                    </p>

                                                    <p style="font-size:16px;">
                                                        <strong>EMS</strong>
                                                    </p>

                                                </div>
                                            `,
                                        }
                                    );
                                }
                            );

                        await Promise.all(
                            emailPromises
                        );

                        return {
                            emailsSent:
                                notCheckedOut.length,
                        };
                    }
                );
            }

            return {
                notCheckedOutCount:
                    notCheckedOut.length,
            };
        }
    );

// ============================================================
// (B)
// 7:15 PM AUTO CHECKOUT
// NEW
// ============================================================

const autoCheckoutCron =
    inngest.createFunction(
        {
            id:
                "auto-checkout-715pm",

            triggers: [
                {
                    cron:
                        "TZ=Asia/Kolkata 15 19 * * *",
                },
            ],
        },

        async ({
            step,
        }) => {
            const today =
                await step.run(
                    "get-auto-checkout-date",
                    () => {
                        const {
                            dateString,
                            startUTC,
                            endUTC,
                        } =
                            getTodayISTRange();

                        const autoCheckoutTime =
                            new Date(
                                `${dateString}T19:15:00+05:30`
                            );

                        return {
                            dateString,

                            startUTC:
                                startUTC.toISOString(),

                            endUTC:
                                endUTC.toISOString(),

                            autoCheckoutTime:
                                autoCheckoutTime.toISOString(),
                        };
                    }
                );

            const openAttendances =
                await step.run(
                    "get-open-attendances-for-auto-checkout",
                    async () => {
                        return await Attendance.find(
                            {
                                date: {
                                    $gte:
                                        new Date(
                                            today.startUTC
                                        ),

                                    $lt:
                                        new Date(
                                            today.endUTC
                                        ),
                                },

                                checkIn: {
                                    $ne:
                                        null,
                                },

                                checkOut:
                                    null,
                            }
                        ).lean();
                    }
                );

            if (
                openAttendances.length ===
                0
            ) {
                return {
                    autoCheckedOut:
                        0,
                };
            }

            const result =
                await step.run(
                    "auto-checkout-employees-at-715",
                    async () => {
                        const autoCheckoutTime =
                            new Date(
                                today.autoCheckoutTime
                            );

                        let updatedCount =
                            0;

                        for (
                            const record of
                            openAttendances
                        ) {
                            const checkIn =
                                new Date(
                                    record.checkIn
                                );

                            /*
                                Safety:
                                Never create a checkout
                                earlier than check-in.
                            */

                            if (
                                checkIn >
                                autoCheckoutTime
                            ) {
                                continue;
                            }

                            const workingHours =
                                calculateWorkingHours(
                                    checkIn,
                                    autoCheckoutTime
                                );

                            const dayType =
                                calculateDayType(
                                    workingHours,
                                    record.isWeekendOrHoliday
                                );

                            const updated =
                                await Attendance.findOneAndUpdate(
                                    {
                                        _id:
                                            record._id,

                                        checkOut:
                                            null,
                                    },

                                    {
                                        $set: {
                                            checkOut:
                                                autoCheckoutTime,

                                            workingHours,

                                            dayType,

                                            autoCheckedOut:
                                                true,

                                            source:
                                                "AUTO_CHECKOUT",
                                        },
                                    },

                                    {
                                        new:
                                            true,
                                    }
                                );

                            if (
                                updated
                            ) {
                                updatedCount +=
                                    1;
                            }
                        }

                        return {
                            updatedCount,
                        };
                    }
                );

            return {
                autoCheckedOut:
                    result.updatedCount,
            };
        }
    );

// ============================================================
// (C)
// 11 AM CHECK-IN REMINDER
// EXISTING FUNCTIONALITY
// ============================================================

const attendanceReminderCron =
    inngest.createFunction(
        {
            id:
                "attendance-reminder-cron",

            triggers: [
                {
                    cron:
                        "TZ=Asia/Kolkata 0 11 * * *",
                },
            ],
        },

        async ({
            step,
        }) => {
            const today =
                await step.run(
                    "get-attendance-reminder-date",
                    () => {
                        const {
                            startUTC,
                            endUTC,
                        } =
                            getTodayISTRange();

                        return {
                            startUTC:
                                startUTC.toISOString(),

                            endUTC:
                                endUTC.toISOString(),
                        };
                    }
                );

            const activeEmployees =
                await step.run(
                    "get-active-employees",
                    async () => {
                        const employees =
                            await Employee.find(
                                {
                                    isDeleted:
                                        false,

                                    employmentStatus:
                                        "ACTIVE",
                                }
                            ).lean();

                        return employees.map(
                            (
                                employee
                            ) => ({
                                _id:
                                    employee._id.toString(),

                                firstName:
                                    employee.firstName,

                                lastName:
                                    employee.lastName,

                                email:
                                    employee.email,

                                department:
                                    employee.department,
                            })
                        );
                    }
                );

            const onLeaveIds =
                await step.run(
                    "get-on-leave-ids",
                    async () => {
                        const leaves =
                            await LeaveApplication.find(
                                {
                                    status:
                                        "APPROVED",

                                    startDate: {
                                        $lte:
                                            new Date(
                                                today.endUTC
                                            ),
                                    },

                                    endDate: {
                                        $gte:
                                            new Date(
                                                today.startUTC
                                            ),
                                    },
                                }
                            ).lean();

                        return leaves.map(
                            (
                                leave
                            ) =>
                                leave.employeeId.toString()
                        );
                    }
                );

            const checkedInIds =
                await step.run(
                    "get-checked-in-ids",
                    async () => {
                        const attendances =
                            await Attendance.find(
                                {
                                    date: {
                                        $gte:
                                            new Date(
                                                today.startUTC
                                            ),

                                        $lt:
                                            new Date(
                                                today.endUTC
                                            ),
                                    },
                                }
                            ).lean();

                        return attendances.map(
                            (
                                attendance
                            ) =>
                                attendance.employeeId.toString()
                        );
                    }
                );

            const absentEmployees =
                activeEmployees.filter(
                    (
                        employee
                    ) =>
                        !onLeaveIds.includes(
                            employee._id
                        ) &&
                        !checkedInIds.includes(
                            employee._id
                        )
                );

            if (
                absentEmployees.length >
                0
            ) {
                await step.run(
                    "send-reminder-emails",
                    async () => {
                        const emailPromises =
                            absentEmployees.map(
                                (
                                    employee
                                ) => {
                                    if (
                                        !employee.email
                                    ) {
                                        return Promise.resolve();
                                    }

                                    return sendEmail(
                                        {
                                            to:
                                                employee.email,

                                            subject:
                                                "Attendance Reminder — Please Mark Your Attendance",

                                            body: `
                                                <div style="max-width:600px;font-family:Arial,sans-serif;">

                                                    <h2>
                                                        Hi ${employee.firstName || "Employee"}, 👋
                                                    </h2>

                                                    <p style="font-size:16px;">
                                                        We noticed you haven't marked your attendance yet today.
                                                    </p>

                                                    <p style="font-size:16px;">
                                                        The deadline was
                                                        <strong>11:00 AM</strong>
                                                        and your attendance is still missing.
                                                    </p>

                                                    <p style="font-size:16px;">
                                                        Please check in as soon as possible or contact your admin if you're facing any issues.
                                                    </p>

                                                    <br />

                                                    <p style="font-size:14px;color:#666;">
                                                        Department:
                                                        ${employee.department || "N/A"}
                                                    </p>

                                                    <br />

                                                    <p style="font-size:16px;">
                                                        Best Regards,
                                                    </p>

                                                    <p style="font-size:16px;">
                                                        <strong>EMS</strong>
                                                    </p>

                                                </div>
                                            `,
                                        }
                                    );
                                }
                            );

                        await Promise.all(
                            emailPromises
                        );

                        return {
                            emailsSent:
                                absentEmployees.length,
                        };
                    }
                );
            }

            return {
                totalActive:
                    activeEmployees.length,

                onLeave:
                    onLeaveIds.length,

                checkedIn:
                    checkedInIds.length,

                absent:
                    absentEmployees.length,
            };
        }
    );
    // ============================================================
// (D)
// LEAVE APPLICATION WORKFLOW
//
// 24 hours:
// Admin reminder
//
// 72 hours:
// Auto approve if still pending
// ============================================================

const leaveApplicationReminder =
    inngest.createFunction(
        {
            id:
                "leave-application-reminder",

            triggers: [
                {
                    event:
                        "leave/pending",
                },
            ],
        },

        async ({
            event,
            step,
        }) => {
            const {
                leaveApplicationId,
            } =
                event.data;

            // ====================================================
            // WAIT 24 HOURS
            // ====================================================

            await step.sleep(
                "wait-for-24-hours",
                "24h"
            );

            const leaveAfter24Hours =
                await step.run(
                    "check-leave-status-after-24-hours",
                    async () => {
                        return await LeaveApplication.findById(
                            leaveApplicationId
                        ).lean();
                    }
                );

            if (
                !leaveAfter24Hours ||
                leaveAfter24Hours.status !==
                    "PENDING"
            ) {
                return {
                    status:
                        "already-actioned-before-reminder",

                    leaveApplicationId,
                };
            }

            const employee =
                await step.run(
                    "get-leave-employee",
                    async () => {
                        return await Employee.findById(
                            leaveAfter24Hours.employeeId
                        ).lean();
                    }
                );

            const admins =
                await step.run(
                    "get-leave-admins",
                    async () => {
                        return await User.find(
                            {
                                role:
                                    "ADMIN",
                            }
                        ).lean();
                    }
                );

            // ====================================================
            // SEND 24-HOUR REMINDER
            // ====================================================

            if (
                employee &&
                admins.length >
                    0
            ) {
                await step.run(
                    "send-24-hour-admin-reminder",
                    async () => {
                        const leaveType =
                            getLeaveTypeLabel(
                                leaveAfter24Hours.type
                            );

                        const leaveDays =
                            getLeaveDayCount(
                                leaveAfter24Hours
                            );

                        const emailPromises =
                            admins
                                .filter(
                                    (
                                        admin
                                    ) =>
                                        admin.email
                                )
                                .map(
                                    (
                                        admin
                                    ) =>
                                        sendEmail(
                                            {
                                                to:
                                                    admin.email,

                                                subject:
                                                    "Reminder: Pending Leave Application Needs Action",

                                                body: `
                                                    <div style="max-width:600px;margin:auto;font-family:Arial,sans-serif;color:#334155;line-height:1.6;">

                                                        <h2>
                                                            Hi Admin,
                                                        </h2>

                                                        <p>
                                                            A leave application from
                                                            <strong>
                                                                ${employee.firstName || ""}
                                                                ${employee.lastName || ""}
                                                            </strong>
                                                            has remained pending for
                                                            <strong>24 hours</strong>.
                                                        </p>

                                                        <div style="margin:18px 0;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">

                                                            <p>
                                                                <strong>Leave Type:</strong>
                                                                ${leaveType}
                                                            </p>

                                                            <p>
                                                                <strong>Duration:</strong>
                                                                ${leaveDays}
                                                                day${leaveDays !== 1 ? "s" : ""}
                                                            </p>

                                                            <p>
                                                                <strong>Dates:</strong>

                                                                ${new Date(
                                                                    leaveAfter24Hours.startDate
                                                                ).toLocaleDateString(
                                                                    "en-IN"
                                                                )}

                                                                -

                                                                ${new Date(
                                                                    leaveAfter24Hours.endDate
                                                                ).toLocaleDateString(
                                                                    "en-IN"
                                                                )}
                                                            </p>

                                                            <p>
                                                                <strong>Reason:</strong>
                                                                ${leaveAfter24Hours.reason}
                                                            </p>

                                                        </div>

                                                        <p>
                                                            Please review and approve or reject this request.
                                                        </p>

                                                        <p style="padding:12px;background:#fff7ed;border-radius:8px;color:#9a3412;">
                                                            <strong>Important:</strong>
                                                            If no action is taken within 3 days of the original application, the leave will be automatically approved.
                                                        </p>

                                                        <br />

                                                        <p>
                                                            Best Regards,
                                                        </p>

                                                        <p>
                                                            <strong>EMS</strong>
                                                        </p>

                                                    </div>
                                                `,
                                            }
                                        )
                                );

                        await Promise.all(
                            emailPromises
                        );

                        return {
                            emailsSent:
                                emailPromises.length,
                        };
                    }
                );
            }

            // ====================================================
            // ANOTHER 48 HOURS
            // 24 + 48 = 72 HOURS
            // ====================================================

            await step.sleep(
                "wait-another-48-hours",
                "48h"
            );

            const leaveAfter72Hours =
                await step.run(
                    "check-leave-status-after-72-hours",
                    async () => {
                        return await LeaveApplication.findById(
                            leaveApplicationId
                        ).lean();
                    }
                );

            if (
                !leaveAfter72Hours ||
                leaveAfter72Hours.status !==
                    "PENDING"
            ) {
                return {
                    status:
                        "actioned-by-admin-before-auto-approval",

                    leaveApplicationId,
                };
            }

            // ====================================================
            // DETERMINE PAID OR LOP
            // ====================================================

            const autoApprovalDetails =
                await step.run(
                    "calculate-auto-approval-type",
                    async () => {
                        const requestedDays =
                            getLeaveDayCount(
                                leaveAfter72Hours
                            );

                        if (
                            leaveAfter72Hours.type ===
                            "COMPENSATORY"
                        ) {
                            return {
                                requestedDays,

                                alreadyUsedPaidDays:
                                    0,

                                totalIfApproved:
                                    0,

                                exceedsQuota:
                                    false,

                                isCompensatory:
                                    true,
                            };
                        }

                        const alreadyUsedPaidDays =
                            await getEmployeeMonthlyPaidUsage(
                                leaveAfter72Hours.employeeId,

                                leaveAfter72Hours.startDate,

                                leaveAfter72Hours._id
                            );

                        const totalIfApproved =
                            alreadyUsedPaidDays +
                            requestedDays;

                        return {
                            requestedDays,

                            alreadyUsedPaidDays,

                            totalIfApproved,

                            exceedsQuota:
                                totalIfApproved >
                                MONTHLY_PAID_LEAVE_LIMIT,

                            isCompensatory:
                                false,
                        };
                    }
                );

            // ====================================================
            // AUTO APPROVE
            // ====================================================

            const autoApprovedLeave =
                await step.run(
                    "auto-approve-leave-after-3-days",
                    async () => {
                        const updateData =
                            {
                                status:
                                    "APPROVED",

                                isEmergencyOverride:
                                    false,
                            };

                        if (
                            autoApprovalDetails.exceedsQuota &&
                            !autoApprovalDetails.isCompensatory
                        ) {
                            updateData.isLop =
                                true;

                            updateData.paymentType =
                                "UNPAID";

                            updateData.adminRemark =
                                "Automatically approved after remaining pending for 3 days without admin action. The monthly paid leave quota was exceeded, therefore this leave has been recorded as Loss of Pay (LOP).";
                        } else {
                            updateData.isLop =
                                false;

                            updateData.paymentType =
                                "PAID";

                            updateData.adminRemark =
                                "Automatically approved after remaining pending for 3 days without admin action.";
                        }

                        return await LeaveApplication.findOneAndUpdate(
                            {
                                _id:
                                    leaveApplicationId,

                                status:
                                    "PENDING",
                            },

                            updateData,

                            {
                                new:
                                    true,
                            }
                        ).lean();
                    }
                );

            if (
                !autoApprovedLeave
            ) {
                return {
                    status:
                        "leave-was-actioned-before-final-update",

                    leaveApplicationId,
                };
            }

            const autoApprovedEmployee =
                await step.run(
                    "get-auto-approved-employee",
                    async () => {
                        return await Employee.findById(
                            autoApprovedLeave.employeeId
                        ).lean();
                    }
                );

            // ====================================================
            // EMPLOYEE AUTO APPROVAL EMAIL
            // ====================================================

            if (
                autoApprovedEmployee?.email
            ) {
                await step.run(
                    "send-auto-approval-email-to-employee",
                    async () => {
                        const leaveType =
                            getLeaveTypeLabel(
                                autoApprovedLeave.type
                            );

                        const leaveDays =
                            getLeaveDayCount(
                                autoApprovedLeave
                            );

                        const isLop =
                            autoApprovedLeave.isLop ||
                            autoApprovedLeave.paymentType ===
                                "UNPAID";

                        return await sendEmail(
                            {
                                to:
                                    autoApprovedEmployee.email,

                                subject:
                                    isLop
                                        ? "Leave Automatically Approved as Loss of Pay (LOP)"
                                        : "Leave Automatically Approved",

                                body: `
                                    <div style="max-width:600px;margin:auto;font-family:Arial,sans-serif;color:#334155;line-height:1.6;">

                                        <h2>
                                            Hi ${autoApprovedEmployee.firstName || "Employee"},
                                        </h2>

                                        <p>
                                            Your leave request remained pending without an admin decision for
                                            <strong>3 days</strong>.
                                        </p>

                                        <p>
                                            Your request has therefore been
                                            <strong style="color:#059669;">
                                                automatically approved
                                            </strong>.
                                        </p>

                                        ${
                                            isLop
                                                ? `
                                                    <div style="margin:16px 0;padding:14px;border-radius:8px;background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;">

                                                        <strong>
                                                            Approved as Loss of Pay (LOP)
                                                        </strong>

                                                        <p>
                                                            Your monthly paid leave quota has been exceeded, so this leave has been recorded as Loss of Pay.
                                                        </p>

                                                    </div>
                                                `
                                                : `
                                                    <div style="margin:16px 0;padding:14px;border-radius:8px;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;">

                                                        <strong>
                                                            Approved as Paid Leave
                                                        </strong>

                                                    </div>
                                                `
                                        }

                                        <p>
                                            <strong>Leave Type:</strong>
                                            ${leaveType}
                                        </p>

                                        <p>
                                            <strong>Duration:</strong>
                                            ${leaveDays}
                                            day${leaveDays !== 1 ? "s" : ""}
                                        </p>

                                        <p>
                                            <strong>Dates:</strong>

                                            ${new Date(
                                                autoApprovedLeave.startDate
                                            ).toLocaleDateString(
                                                "en-IN"
                                            )}

                                            -

                                            ${new Date(
                                                autoApprovedLeave.endDate
                                            ).toLocaleDateString(
                                                "en-IN"
                                            )}
                                        </p>

                                        <br />

                                        <p>
                                            Best Regards,
                                        </p>

                                        <p>
                                            <strong>EMS</strong>
                                        </p>

                                    </div>
                                `,
                            }
                        );
                    }
                );
            }

            // ====================================================
            // NOTIFY ADMINS
            // ====================================================

            const autoApprovalAdmins =
                await step.run(
                    "get-admins-for-auto-approval-notification",
                    async () => {
                        return await User.find(
                            {
                                role:
                                    "ADMIN",
                            }
                        ).lean();
                    }
                );

            if (
                autoApprovalAdmins.length >
                    0 &&
                autoApprovedEmployee
            ) {
                await step.run(
                    "notify-admins-about-auto-approval",
                    async () => {
                        const emailPromises =
                            autoApprovalAdmins
                                .filter(
                                    (
                                        admin
                                    ) =>
                                        admin.email
                                )
                                .map(
                                    (
                                        admin
                                    ) =>
                                        sendEmail(
                                            {
                                                to:
                                                    admin.email,

                                                subject:
                                                    "Leave Automatically Approved After 3 Days",

                                                body: `
                                                    <div style="max-width:600px;font-family:Arial,sans-serif;line-height:1.6;color:#334155;">

                                                        <h2>
                                                            Leave Auto-Approval Notification
                                                        </h2>

                                                        <p>
                                                            The leave request for
                                                            <strong>
                                                                ${autoApprovedEmployee.firstName || ""}
                                                                ${autoApprovedEmployee.lastName || ""}
                                                            </strong>
                                                            remained pending for 3 days and has therefore been automatically approved.
                                                        </p>

                                                        <p>
                                                            <strong>Leave Type:</strong>
                                                            ${getLeaveTypeLabel(
                                                                autoApprovedLeave.type
                                                            )}
                                                        </p>

                                                        <p>
                                                            <strong>Approval Type:</strong>
                                                            ${
                                                                autoApprovedLeave.isLop
                                                                    ? "Loss of Pay (LOP)"
                                                                    : "Paid Leave"
                                                            }
                                                        </p>

                                                        <br />

                                                        <p>
                                                            Best Regards,
                                                        </p>

                                                        <p>
                                                            <strong>EMS</strong>
                                                        </p>

                                                    </div>
                                                `,
                                            }
                                        )
                                );

                        await Promise.all(
                            emailPromises
                        );

                        return {
                            emailsSent:
                                emailPromises.length,
                        };
                    }
                );
            }

            return {
                status:
                    "auto-approved-after-3-days",

                leaveApplicationId,

                approvalType:
                    autoApprovedLeave.isLop
                        ? "LOP"
                        : "PAID",
            };
        }
    );

// ============================================================
// EXPORT ALL FUNCTIONS
// ============================================================

export const functions = [
    // TEMPORARILY DISABLED:
    // 7 PM NOT-CHECKED-OUT EMAIL
    // checkoutReminderCron,

    // 7:15 PM AUTO CHECKOUT REMAINS ACTIVE
    autoCheckoutCron,

    // TEMPORARILY DISABLED:
    // 11 AM NOT-CHECKED-IN EMAIL
    // attendanceReminderCron,

    // LEAVE WORKFLOW REMAINS ACTIVE
    leaveApplicationReminder,
];
