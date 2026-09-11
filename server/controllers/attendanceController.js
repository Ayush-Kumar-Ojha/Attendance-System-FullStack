import { inngest } from "../inngest/index.js";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";

const MONTHLY_CORRECTION_LIMIT = 2;

const MILLISECONDS_IN_DAY =
    24 * 60 * 60 * 1000;

// ============================================================
// HELPERS
// ============================================================

const getWorkingHours = (
    checkIn,
    checkOut
) => {
    const diffMs =
        new Date(checkOut).getTime() -
        new Date(checkIn).getTime();

    const diffHours =
        diffMs /
        (1000 * 60 * 60);

    return parseFloat(
        Math.max(
            diffHours,
            0
        ).toFixed(2)
    );
};

const getDayType = (
    workingHours,
    isWeekendOrHoliday = false
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

// ============================================================
// GET CURRENT IST DATE STRING
// ============================================================

const getTodayISTString = () => {
    return new Date().toLocaleDateString(
        "en-CA",
        {
            timeZone: "Asia/Kolkata",
        }
    );
};

// ============================================================
// GET IST DAY RANGE
// ============================================================

const getISTDayRange = (
    dateString
) => {
    const start =
        new Date(
            `${dateString}T00:00:00+05:30`
        );

    const end =
        new Date(
            start.getTime() +
            MILLISECONDS_IN_DAY
        );

    return {
        start,
        end,
    };
};

// ============================================================
// CURRENT MONTH RANGE IN IST
// ============================================================

const getCurrentISTMonthRange = () => {
    const now =
        new Date();

    const parts =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone:
                    "Asia/Kolkata",

                year:
                    "numeric",

                month:
                    "2-digit",
            }
        ).formatToParts(
            now
        );

    const year =
        parts.find(
            (part) =>
                part.type ===
                "year"
        )?.value;

    const month =
        parts.find(
            (part) =>
                part.type ===
                "month"
        )?.value;

    const monthNumber =
        Number(month);

    const nextMonthYear =
        monthNumber === 12
            ? Number(year) + 1
            : Number(year);

    const nextMonth =
        monthNumber === 12
            ? 1
            : monthNumber + 1;

    const start =
        new Date(
            `${year}-${String(
                monthNumber
            ).padStart(
                2,
                "0"
            )}-01T00:00:00+05:30`
        );

    const end =
        new Date(
            `${nextMonthYear}-${String(
                nextMonth
            ).padStart(
                2,
                "0"
            )}-01T00:00:00+05:30`
        );

    return {
        start,
        end,
    };
};

// ============================================================
// GET EMPLOYEE CORRECTION USAGE
// ============================================================

const getEmployeeCorrectionUsage =
    async (
        employeeId
    ) => {
        const {
            start,
            end,
        } =
            getCurrentISTMonthRange();

        const used =
            await Attendance.countDocuments(
                {
                    employeeId,

                    source:
                        "EMPLOYEE_CORRECTION",

                    correctedAt: {
                        $gte:
                            start,

                        $lt:
                            end,
                    },
                }
            );

        return {
            used,

            limit:
                MONTHLY_CORRECTION_LIMIT,

            remaining:
                Math.max(
                    MONTHLY_CORRECTION_LIMIT -
                    used,
                    0
                ),
        };
    };

// ============================================================
// CLOCK IN / CLOCK OUT
// ============================================================

export const clockInOut =
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

            if (
                employee.isDeleted
            ) {
                return res
                    .status(403)
                    .json({
                        error:
                            "Your account is deactivated. You cannot clock in/out.",
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

            const existing =
                await Attendance.findOne(
                    {
                        employeeId:
                            employee._id,

                        date:
                            today,
                    }
                );

            const now =
                new Date();

            const dayOfWeek =
                now.getDay();

            const isWeekend =
                dayOfWeek === 0 ||
                dayOfWeek === 6;

            // ====================================================
            // CLOCK IN
            // ====================================================

            if (!existing) {
                const isLate =
                    now.getHours() > 9 ||
                    (
                        now.getHours() === 9 &&
                        now.getMinutes() > 0
                    );

                const attendance =
                    await Attendance.create(
                        {
                            employeeId:
                                employee._id,

                            date:
                                today,

                            checkIn:
                                now,

                            status:
                                isLate
                                    ? "LATE"
                                    : "PRESENT",

                            isWeekendOrHoliday:
                                isWeekend,

                            // While ongoing, frontend shows In Progress
                            dayType:
                                null,

                            source:
                                "NORMAL",

                            autoCheckedOut:
                                false,

                            correctionReason:
                                "",

                            correctedAt:
                                null,
                        }
                    );

                await inngest
                    .send({
                        name:
                            "employee/check-out",

                        data: {
                            employeeId:
                                employee._id,

                            attendanceId:
                                attendance._id,
                        },
                    })
                    .catch(
                        () => { }
                    );

                return res.json(
                    {
                        success:
                            true,

                        type:
                            "CHECK_IN",

                        data:
                            attendance,
                    }
                );
            }

            // ====================================================
            // CLOCK OUT
            // ====================================================

            if (
                !existing.checkOut
            ) {
                const workingHours =
                    getWorkingHours(
                        existing.checkIn,
                        now
                    );

                const dayType =
                    getDayType(
                        workingHours,
                        existing.isWeekendOrHoliday
                    );

                existing.checkOut =
                    now;

                existing.workingHours =
                    workingHours;

                existing.dayType =
                    dayType;

                existing.autoCheckedOut =
                    false;

                if (
                    !existing.source ||
                    existing.source ===
                    "AUTO_CHECKOUT"
                ) {
                    existing.source =
                        "NORMAL";
                }

                await existing.save();

                return res.json(
                    {
                        success:
                            true,

                        type:
                            "CHECK_OUT",

                        data:
                            existing,
                    }
                );
            }

            return res.json(
                {
                    success:
                        true,

                    type:
                        "CHECK_OUT",

                    data:
                        existing,
                }
            );

        } catch (error) {
            console.error(
                "Attendance Error:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Operation failed",
                });
        }
    };

// ============================================================
// GET ATTENDANCE
// ============================================================

export const getAttendance =
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

            const limit =
                parseInt(
                    req.query
                        .limit ||
                    30,
                    10
                );

            const history =
                await Attendance.find({
                    employeeId:
                        employee._id,
                })
                    .sort({
                        date:
                            -1,
                    })
                    .limit(
                        limit
                    );

            const correctionUsage =
                await getEmployeeCorrectionUsage(
                    employee._id
                );

            return res.json(
                {
                    data:
                        history,

                    employee: {
                        isDeleted:
                            employee.isDeleted,
                    },

                    correctionUsage,
                }
            );

        } catch (error) {
            console.error(
                "Get Attendance Error:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Failed to fetch attendance",
                });
        }
    };

// ============================================================
// EMPLOYEE ATTENDANCE CORRECTION
// ============================================================

export const correctMissedAttendance =
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

            if (
                employee.isDeleted
            ) {
                return res
                    .status(403)
                    .json({
                        error:
                            "Your account is deactivated. You cannot correct attendance.",
                    });
            }

            const {
                date,
                checkInTime,
                checkOutTime,
                reason,
            } =
                req.body;

            if (
                !date ||
                !checkInTime ||
                !checkOutTime ||
                !reason?.trim()
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Date, clock in time, clock out time and reason are required.",
                    });
            }

            // ====================================================
            // PAST DATE ONLY
            // ====================================================

            const todayIST =
                getTodayISTString();

            if (
                date >=
                todayIST
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Attendance correction is allowed only for past dates.",
                    });
            }

            // ====================================================
            // MONTHLY LIMIT
            // ====================================================

            const correctionUsage =
                await getEmployeeCorrectionUsage(
                    employee._id
                );

            if (
                correctionUsage.used >=
                MONTHLY_CORRECTION_LIMIT
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "You have already used your 2 attendance corrections for this month. Please contact HR/Admin for further corrections.",
                    });
            }

            // ====================================================
            // VALIDATE TIMES
            // ====================================================

            const checkIn =
                new Date(
                    `${date}T${checkInTime}:00+05:30`
                );

            const checkOut =
                new Date(
                    `${date}T${checkOutTime}:00+05:30`
                );

            if (
                Number.isNaN(
                    checkIn.getTime()
                ) ||
                Number.isNaN(
                    checkOut.getTime()
                )
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Invalid attendance date or time.",
                    });
            }

            if (
                checkOut <=
                checkIn
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Clock out time must be after clock in time.",
                    });
            }

            const {
                start,
                end,
            } =
                getISTDayRange(
                    date
                );

            const existing =
                await Attendance.findOne(
                    {
                        employeeId:
                            employee._id,

                        date: {
                            $gte:
                                start,

                            $lt:
                                end,
                        },
                    }
                );

            // ====================================================
            // COMPLETED NORMAL RECORD CANNOT BE EDITED
            // ====================================================

            if (
                existing &&
                existing.checkIn &&
                existing.checkOut &&
                !existing.autoCheckedOut
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            existing.source ===
                                "EMPLOYEE_CORRECTION"
                                ? "You have already corrected attendance for this date."
                                : "This date already has completed attendance. Please contact HR/Admin if it needs to be changed.",
                    });
            }

            // ====================================================
            // WORKING HOURS / DAY TYPE
            // ====================================================

            const workingHours =
                getWorkingHours(
                    checkIn,
                    checkOut
                );

            const selectedDay =
                new Date(
                    `${date}T12:00:00+05:30`
                );

            const istDayName =
                new Intl.DateTimeFormat(
                    "en-US",
                    {
                        weekday:
                            "short",

                        timeZone:
                            "Asia/Kolkata",
                    }
                ).format(
                    selectedDay
                );

            const isWeekend =
                istDayName ===
                "Sat" ||
                istDayName ===
                "Sun";

            const dayType =
                getDayType(
                    workingHours,
                    isWeekend
                );

            const [
                inHour,
                inMinute,
            ] =
                checkInTime
                    .split(":")
                    .map(Number);

            const isLate =
                inHour > 9 ||
                (
                    inHour === 9 &&
                    inMinute > 0
                );

            const now =
                new Date();

            let attendance;

            if (existing) {
                existing.checkIn =
                    checkIn;

                existing.checkOut =
                    checkOut;

                existing.workingHours =
                    workingHours;

                existing.dayType =
                    dayType;

                existing.status =
                    isLate
                        ? "LATE"
                        : "PRESENT";

                existing.isWeekendOrHoliday =
                    isWeekend;

                existing.source =
                    "EMPLOYEE_CORRECTION";

                existing.autoCheckedOut =
                    false;

                existing.correctionReason =
                    reason.trim();

                existing.correctedAt =
                    now;

                attendance =
                    await existing.save();

            } else {
                attendance =
                    await Attendance.create(
                        {
                            employeeId:
                                employee._id,

                            date:
                                start,

                            checkIn,

                            checkOut,

                            status:
                                isLate
                                    ? "LATE"
                                    : "PRESENT",

                            workingHours,

                            dayType,

                            isWeekendOrHoliday:
                                isWeekend,

                            source:
                                "EMPLOYEE_CORRECTION",

                            autoCheckedOut:
                                false,

                            correctionReason:
                                reason.trim(),

                            correctedAt:
                                now,
                        }
                    );
            }

            const updatedUsage =
                await getEmployeeCorrectionUsage(
                    employee._id
                );

            return res.json(
                {
                    success:
                        true,

                    message:
                        "Attendance corrected successfully.",

                    data:
                        attendance,

                    correctionUsage:
                        updatedUsage,
                }
            );

        } catch (error) {
            console.error(
                "Attendance Correction Error:",
                error
            );

            if (
                error?.code ===
                11000
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Attendance already exists for the selected date.",
                    });
            }

            return res
                .status(500)
                .json({
                    error:
                        "Failed to correct attendance.",
                });
        }
    };

// ============================================================
// ADMIN - GET ATTENDANCE RECORD FOR EMPLOYEE + DATE
// GET /api/attendance/admin/record
// ============================================================

export const getAdminAttendanceRecord =
    async (
        req,
        res
    ) => {
        try {
            const {
                employeeId,
                date,
            } =
                req.query;

            if (
                !employeeId ||
                !date
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Employee and date are required.",
                    });
            }

            const employee =
                await Employee.findById(
                    employeeId
                );

            if (!employee) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Employee not found.",
                    });
            }

            const {
                start,
                end,
            } =
                getISTDayRange(
                    date
                );

            const attendance =
                await Attendance.findOne(
                    {
                        employeeId:
                            employee._id,

                        date: {
                            $gte:
                                start,

                            $lt:
                                end,
                        },
                    }
                );

            return res.json({
                success:
                    true,

                data:
                    attendance ||
                    null,
            });

        } catch (error) {
            console.error(
                "Get Admin Attendance Record Error:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Failed to fetch attendance record.",
                });
        }
    };

// ============================================================
// ADMIN - OVERRIDE ATTENDANCE
// PUT /api/attendance/admin/override
//
// ADMIN HAS NO MONTHLY LIMIT
// ============================================================

export const adminOverrideAttendance =
    async (
        req,
        res
    ) => {
        try {
            const {
                employeeId,
                date,
                status,
                checkInTime,
                checkOutTime,
                reason,
            } =
                req.body;

            // ====================================================
            // BASIC VALIDATION
            // ====================================================

            if (
                !employeeId ||
                !date ||
                !status ||
                !reason?.trim()
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Employee, date, status and override reason are required.",
                    });
            }

            if (
                ![
                    "PRESENT",
                    "LATE",
                    "ABSENT",
                ].includes(
                    status
                )
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Invalid attendance status.",
                    });
            }

            const employee =
                await Employee.findById(
                    employeeId
                );

            if (!employee) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Employee not found.",
                    });
            }

            const {
                start,
                end,
            } =
                getISTDayRange(
                    date
                );

            // ====================================================
            // WEEKEND DETECTION
            // ====================================================

            const selectedDate =
                new Date(
                    `${date}T12:00:00+05:30`
                );

            const istDayName =
                new Intl.DateTimeFormat(
                    "en-US",
                    {
                        weekday:
                            "short",

                        timeZone:
                            "Asia/Kolkata",
                    }
                ).format(
                    selectedDate
                );

            const isWeekend =
                istDayName ===
                "Sat" ||
                istDayName ===
                "Sun";

            let checkIn =
                null;

            let checkOut =
                null;

            let workingHours =
                null;

            let dayType =
                null;

            // ====================================================
            // PRESENT / LATE
            // ====================================================

            if (
                status !==
                "ABSENT"
            ) {
                if (
                    !checkInTime ||
                    !checkOutTime
                ) {
                    return res
                        .status(400)
                        .json({
                            error:
                                "Clock in and clock out time are required for Present or Late attendance.",
                        });
                }

                checkIn =
                    new Date(
                        `${date}T${checkInTime}:00+05:30`
                    );

                checkOut =
                    new Date(
                        `${date}T${checkOutTime}:00+05:30`
                    );

                if (
                    Number.isNaN(
                        checkIn.getTime()
                    ) ||
                    Number.isNaN(
                        checkOut.getTime()
                    )
                ) {
                    return res
                        .status(400)
                        .json({
                            error:
                                "Invalid clock in or clock out time.",
                        });
                }

                if (
                    checkOut <=
                    checkIn
                ) {
                    return res
                        .status(400)
                        .json({
                            error:
                                "Clock out time must be after clock in time.",
                        });
                }

                workingHours =
                    getWorkingHours(
                        checkIn,
                        checkOut
                    );

                dayType =
                    getDayType(
                        workingHours,
                        isWeekend
                    );
            }

            // ====================================================
            // FIND EXISTING RECORD
            // ====================================================

            let attendance =
                await Attendance.findOne(
                    {
                        employeeId:
                            employee._id,

                        date: {
                            $gte:
                                start,

                            $lt:
                                end,
                        },
                    }
                );

            // ====================================================
            // UPDATE EXISTING RECORD
            // ====================================================

            if (attendance) {
                attendance.checkIn =
                    checkIn;

                attendance.checkOut =
                    checkOut;

                attendance.status =
                    status;

                attendance.workingHours =
                    workingHours;

                attendance.dayType =
                    dayType;

                attendance.isWeekendOrHoliday =
                    isWeekend;

                attendance.source =
                    "ADMIN_OVERRIDE";

                attendance.autoCheckedOut =
                    false;

                attendance.correctionReason =
                    reason.trim();

                attendance.correctedAt =
                    new Date();

                attendance =
                    await attendance.save();

            } else {
                // =================================================
                // CREATE NEW RECORD
                // =================================================

                attendance =
                    await Attendance.create(
                        {
                            employeeId:
                                employee._id,

                            date:
                                start,

                            checkIn,

                            checkOut,

                            status,

                            workingHours,

                            dayType,

                            isWeekendOrHoliday:
                                isWeekend,

                            source:
                                "ADMIN_OVERRIDE",

                            autoCheckedOut:
                                false,

                            correctionReason:
                                reason.trim(),

                            correctedAt:
                                new Date(),
                        }
                    );
            }

            return res.json({
                success:
                    true,

                message:
                    status ===
                        "ABSENT"
                        ? "Employee marked absent successfully."
                        : "Attendance overridden successfully.",

                data:
                    attendance,
            });

        } catch (error) {
            console.error(
                "Admin Attendance Override Error:",
                error
            );

            if (
                error?.code ===
                11000
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "An attendance record already exists for this employee and date.",
                    });
            }

            return res
                .status(500)
                .json({
                    error:
                        "Failed to override attendance.",
                });
        }
    };