import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import LeaveApplication from "../models/LeaveApplication.js";

// ======================================
// Shared constants & helpers
// ======================================

const LATE_HOUR = 9; // matches attendanceController.clockInOut isLate logic
const EXPECTED_EXIT_HOUR = 18; // 6:00 PM assumption — no configurable shift schedule stored yet

const round1 = (n) => Math.round(n * 10) / 10;

const dateKey = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

const isWeekOff = (date) => date.getDay() === 0; // Sunday only — 6-day work week

const eachDate = (start, end) => {
    const days = [];
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const last = new Date(end);
    last.setHours(0, 0, 0, 0);
    while (cur <= last) {
        days.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return days;
};

const employeeName = (emp) => `${emp.firstName || ""} ${emp.lastName || ""}`.trim();

// Builds a per-employee, per-date classification map for a date range.
// Returns: { [employeeId]: { [dateKey]: { status, checkIn, checkOut, workingHours, isLate, isEarlyExit } } }
const buildClassificationMap = async (employees, startDate, endDate) => {
    const employeeIds = employees.map((e) => e._id);

    const attendanceRecords = await Attendance.find({
        employeeId: { $in: employeeIds },
        date: { $gte: startDate, $lte: endDate },
    }).lean();

    const leaveRecords = await LeaveApplication.find({
        employeeId: { $in: employeeIds },
        status: "APPROVED",
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
    }).lean();

    const attendanceByEmp = {};
    attendanceRecords.forEach((rec) => {
        const empId = rec.employeeId.toString();
        if (!attendanceByEmp[empId]) attendanceByEmp[empId] = {};
        attendanceByEmp[empId][dateKey(rec.date)] = rec;
    });

    const leavesByEmp = {};
    leaveRecords.forEach((rec) => {
        const empId = rec.employeeId.toString();
        if (!leavesByEmp[empId]) leavesByEmp[empId] = [];
        leavesByEmp[empId].push(rec);
    });

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const map = {};

    for (const emp of employees) {
        const empId = emp._id.toString();
        map[empId] = {};

        const joinDate = emp.joinDate ? new Date(emp.joinDate) : null;

        for (const day of eachDate(startDate, endDate)) {
            const key = dateKey(day);

            if (day > today) continue; // future date, not yet occurred
            if (joinDate && day < joinDate) continue; // before joining

            if (isWeekOff(day)) {
                map[empId][key] = { status: "WEEK_OFF" };
                continue;
            }

            const leave = (leavesByEmp[empId] || []).find(
                (l) => day >= new Date(l.startDate) && day <= new Date(l.endDate)
            );

            if (leave) {
                map[empId][key] = {
                    status: leave.type === "HALF_DAY" ? "HALF_DAY" : "LEAVE",
                };
                continue;
            }

            const att = (attendanceByEmp[empId] || {})[key];

            if (att) {
                const isLate = att.status === "LATE";
                let isEarlyExit = false;
                if (att.checkOut) {
                    const co = new Date(att.checkOut);
                    isEarlyExit = co.getHours() < EXPECTED_EXIT_HOUR;
                }

                const isHalfDay = att.dayType === "Half Day" || att.dayType === "Short Day";

                map[empId][key] = {
                    status: isHalfDay ? "HALF_DAY" : "PRESENT",
                    checkIn: att.checkIn,
                    checkOut: att.checkOut,
                    workingHours: att.workingHours,
                    isLate,
                    isEarlyExit,
                };
                continue;
            }

            map[empId][key] = { status: "ABSENT" };
        }
    }

    return map;
};

const countStatuses = (empDayMap) => {
    const counts = {
        PRESENT: 0,
        ABSENT: 0,
        HALF_DAY: 0,
        LEAVE: 0,
        WEEK_OFF: 0,
        LATE: 0,
        EARLY_EXIT: 0,
        totalWorkingHours: 0,
        workingDaysCounted: 0,
    };

    Object.values(empDayMap).forEach((day) => {
        if (counts[day.status] !== undefined) counts[day.status]++;
        if (day.status !== "WEEK_OFF") counts.workingDaysCounted++;
        if (day.isLate) counts.LATE++;
        if (day.isEarlyExit) counts.EARLY_EXIT++;
        if (day.workingHours) counts.totalWorkingHours += day.workingHours;
    });

    return counts;
};

const attendancePercent = (counts) => {
    if (counts.workingDaysCounted === 0) return 0;
    return round1(
        ((counts.PRESENT + counts.HALF_DAY * 0.5) / counts.workingDaysCounted) * 100
    );
};

// Common employee filter (department, employeeId, employmentStatus)
const buildEmployeeQuery = ({ department, employeeId, status }) => {
    const query = { isDeleted: { $ne: true } };
    if (department) query.department = department;
    if (employeeId) query._id = employeeId;
    if (status) query.employmentStatus = status;
    return query;
};

// ======================================
// 1. Monthly Attendance Report
// GET /api/reports/attendance/monthly?month&year&department&employeeId&status
// ======================================
export const getMonthlyAttendanceReport = async (req, res) => {
    try {
        const { month, year, department, employeeId, status } = req.query;

        if (!month || !year) {
            return res.status(400).json({ error: "Month and year are required" });
        }

        const monthNum = Number(month);
        const yearNum = Number(year);

        const monthStart = new Date(yearNum, monthNum - 1, 1);
        const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59);

        const employees = await Employee.find(
            buildEmployeeQuery({ department, employeeId, status })
        ).lean();

        const classification = await buildClassificationMap(employees, monthStart, monthEnd);

        const rows = employees.map((emp) => {
            const counts = countStatuses(classification[emp._id.toString()]);

            return {
                employeeId: emp._id.toString(),
                employeeCode: emp.employeeCode,
                employeeName: employeeName(emp),
                department: emp.department,
                workingDays: counts.workingDaysCounted,
                present: counts.PRESENT,
                absent: counts.ABSENT,
                halfDay: counts.HALF_DAY,
                leave: counts.LEAVE,
                weekOff: counts.WEEK_OFF,
                holidays: 0, // no holiday calendar tracked yet
                late: counts.LATE,
                earlyExit: counts.EARLY_EXIT,
                attendancePercent: attendancePercent(counts),
            };
        });

        // Today snapshot (independent of month filter, matches spec's "Present Today" cards)
        const today = new Date();
        const todayStart = new Date(today.setHours(0, 0, 0, 0));
        const todayEnd = new Date(today.setHours(23, 59, 59, 999));
        const todayClassification = await buildClassificationMap(employees, todayStart, todayEnd);

        let presentToday = 0, absentToday = 0, leaveToday = 0, lateToday = 0;
        Object.values(todayClassification).forEach((dayMap) => {
            const day = Object.values(dayMap)[0];
            if (!day) return;
            if (day.status === "PRESENT" || day.status === "HALF_DAY") presentToday++;
            if (day.status === "ABSENT") absentToday++;
            if (day.status === "LEAVE") leaveToday++;
            if (day.isLate) lateToday++;
        });

        const avgAttendance = rows.length
            ? round1(rows.reduce((sum, r) => sum + r.attendancePercent, 0) / rows.length)
            : 0;

        return res.json({
            summary: {
                totalEmployees: employees.length,
                avgAttendance,
                presentToday,
                absentToday,
                onLeaveToday: leaveToday,
                lateArrivalsToday: lateToday,
            },
            rows,
        });
    } catch (error) {
        console.error("Get Monthly Attendance Report Error:", error);
        return res.status(500).json({ error: "Failed to generate report" });
    }
};

// ======================================
// 2. Employee-wise Attendance Report
// GET /api/reports/attendance/employee/:employeeId?year&month
// ======================================
export const getEmployeeAttendanceReport = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const yearNum = Number(req.query.year) || new Date().getFullYear();
        const monthNum = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1;

        const employee = await Employee.findById(employeeId).lean();
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        // Year-wide summary + monthly chart data
        const yearStart = new Date(yearNum, 0, 1);
        const yearEnd = new Date(yearNum, 11, 31, 23, 59, 59);

        const yearClassification = (
            await buildClassificationMap([employee], yearStart, yearEnd)
        )[employee._id.toString()];

        const yearCounts = countStatuses(yearClassification);

        const monthlyBreakdown = [];
        for (let m = 1; m <= 12; m++) {
            const mStart = new Date(yearNum, m - 1, 1);
            const mEnd = new Date(yearNum, m, 0, 23, 59, 59);
            if (mStart > new Date()) {
                monthlyBreakdown.push({ month: m, attendancePercent: null, workingHours: 0, late: 0 });
                continue;
            }
            const dayEntries = Object.entries(yearClassification).filter(([key]) => {
                const d = new Date(key);
                return d >= mStart && d <= mEnd;
            });
            const monthMap = Object.fromEntries(dayEntries);
            const mCounts = countStatuses(monthMap);
            monthlyBreakdown.push({
                month: m,
                attendancePercent: attendancePercent(mCounts),
                workingHours: round1(mCounts.totalWorkingHours),
                late: mCounts.LATE,
            });
        }

        // Detailed daily history for the requested month
        const monthStart = new Date(yearNum, monthNum - 1, 1);
        const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59);

        const dailyHistory = eachDate(monthStart, monthEnd)
            .filter((d) => d <= new Date())
            .map((d) => {
                const key = dateKey(d);
                const day = yearClassification[key] || { status: "—" };
                return {
                    date: d,
                    dayOfWeek: d.toLocaleDateString("en-IN", { weekday: "short" }),
                    checkIn: day.checkIn || null,
                    checkOut: day.checkOut || null,
                    workHours: day.workingHours || null,
                    status: day.status,
                    late: !!day.isLate,
                    earlyExit: !!day.isEarlyExit,
                };
            })
            .reverse();

        return res.json({
            employee: {
                id: employee._id.toString(),
                employeeCode: employee.employeeCode,
                name: employeeName(employee),
                department: employee.department,
                position: employee.position,
                joinDate: employee.joinDate,
            },
            summary: {
                totalWorkingDays: yearCounts.workingDaysCounted,
                present: yearCounts.PRESENT,
                absent: yearCounts.ABSENT,
                leave: yearCounts.LEAVE,
                halfDays: yearCounts.HALF_DAY,
                lateArrivals: yearCounts.LATE,
                earlyExits: yearCounts.EARLY_EXIT,
                attendancePercent: attendancePercent(yearCounts),
            },
            dailyHistory,
            charts: {
                monthlyAttendancePercent: monthlyBreakdown.map((m) => ({ month: m.month, value: m.attendancePercent })),
                monthlyWorkingHours: monthlyBreakdown.map((m) => ({ month: m.month, value: m.workingHours })),
                monthlyLateArrivals: monthlyBreakdown.map((m) => ({ month: m.month, value: m.late })),
                presentVsAbsent: { present: yearCounts.PRESENT, absent: yearCounts.ABSENT },
            },
        });
    } catch (error) {
        console.error("Get Employee Attendance Report Error:", error);
        return res.status(500).json({ error: "Failed to generate report" });
    }
};

// ======================================
// 3. Weekly Attendance Report
// GET /api/reports/attendance/weekly?date&department&employeeId
// `date` = any date within the desired week (Mon-Sun)
// ======================================
export const getWeeklyAttendanceReport = async (req, res) => {
    try {
        const { date, department, employeeId } = req.query;
        const refDate = date ? new Date(date) : new Date();

        const dayOfWeek = refDate.getDay(); // 0=Sun
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(refDate);
        weekStart.setDate(refDate.getDate() + diffToMonday);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const employees = await Employee.find(
            buildEmployeeQuery({ department, employeeId })
        ).lean();

        const classification = await buildClassificationMap(employees, weekStart, weekEnd);

        const STATUS_CODE = {
            PRESENT: "P",
            LATE: "P",
            ABSENT: "A",
            LEAVE: "L",
            HALF_DAY: "HD",
            WEEK_OFF: "WO",
        };

        const weekDates = eachDate(weekStart, weekEnd);

        const rows = employees.map((emp) => {
            const empMap = classification[emp._id.toString()];
            const days = weekDates.map((d) => {
                const entry = empMap[dateKey(d)];
                return entry ? STATUS_CODE[entry.status] || "—" : "—";
            });

            const counts = countStatuses(empMap);

            return {
                employeeId: emp._id.toString(),
                employeeName: employeeName(emp),
                department: emp.department,
                days, // [Mon..Sun]
                weeklyPercent: attendancePercent(counts),
            };
        });

        return res.json({
            weekStart,
            weekEnd,
            weekDates,
            rows,
        });
    } catch (error) {
        console.error("Get Weekly Attendance Report Error:", error);
        return res.status(500).json({ error: "Failed to generate report" });
    }
};

// ======================================
// 4. Daily Attendance Report
// GET /api/reports/attendance/daily?date&department&employeeId
// ======================================
export const getDailyAttendanceReport = async (req, res) => {
    try {
        const { date, department, employeeId } = req.query;
        if (!date) return res.status(400).json({ error: "Date is required" });

        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const employees = await Employee.find(
            buildEmployeeQuery({ department, employeeId })
        ).lean();

        const classification = await buildClassificationMap(employees, dayStart, dayEnd);

        const rows = employees.map((emp) => {
            const day = Object.values(classification[emp._id.toString()])[0] || { status: "—" };
            return {
                employeeId: emp._id.toString(),
                employeeName: employeeName(emp),
                department: emp.department,
                checkIn: day.checkIn || null,
                checkOut: day.checkOut || null,
                workHours: day.workingHours || null,
                status: day.status,
            };
        });

        const stats = {
            totalEmployees: rows.length,
            present: rows.filter((r) => r.status === "PRESENT").length,
            absent: rows.filter((r) => r.status === "ABSENT").length,
            onLeave: rows.filter((r) => r.status === "LEAVE").length,
            halfDay: rows.filter((r) => r.status === "HALF_DAY").length,
            late: rows.filter((r) => r.status === "PRESENT" && r.checkIn && new Date(r.checkIn).getHours() >= LATE_HOUR).length,
            earlyExit: rows.filter((r) => r.checkOut && new Date(r.checkOut).getHours() < EXPECTED_EXIT_HOUR).length,
            notCheckedIn: rows.filter((r) => r.status === "ABSENT").length,
        };

        return res.json({ date: dayStart, rows, stats });
    } catch (error) {
        console.error("Get Daily Attendance Report Error:", error);
        return res.status(500).json({ error: "Failed to generate report" });
    }
};

// ======================================
// 5. Department-wise Attendance Report
// GET /api/reports/attendance/department?month&year
// ======================================
export const getDepartmentAttendanceReport = async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ error: "Month and year are required" });
        }

        const monthNum = Number(month);
        const yearNum = Number(year);
        const monthStart = new Date(yearNum, monthNum - 1, 1);
        const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59);

        const employees = await Employee.find({ isDeleted: { $ne: true } }).lean();
        const classification = await buildClassificationMap(employees, monthStart, monthEnd);

        const byDept = {};
        employees.forEach((emp) => {
            const dept = emp.department || "Unassigned";
            if (!byDept[dept]) {
                byDept[dept] = { department: dept, employees: 0, workingDays: 0, present: 0, absent: 0, leave: 0, late: 0, attendancePercentSum: 0 };
            }
            const counts = countStatuses(classification[emp._id.toString()]);
            byDept[dept].employees++;
            byDept[dept].workingDays += counts.workingDaysCounted;
            byDept[dept].present += counts.PRESENT;
            byDept[dept].absent += counts.ABSENT;
            byDept[dept].leave += counts.LEAVE;
            byDept[dept].late += counts.LATE;
            byDept[dept].attendancePercentSum += attendancePercent(counts);
        });

        const rows = Object.values(byDept).map((d) => ({
            department: d.department,
            employees: d.employees,
            workingDays: d.workingDays,
            present: d.present,
            absent: d.absent,
            leave: d.leave,
            late: d.late,
            attendancePercent: round1(d.attendancePercentSum / d.employees),
        }));

        return res.json({ rows });
    } catch (error) {
        console.error("Get Department Attendance Report Error:", error);
        return res.status(500).json({ error: "Failed to generate report" });
    }
};

// ======================================
// 6. Yearly Attendance Report
// GET /api/reports/attendance/yearly?year&department&employeeId
// ======================================
export const getYearlyAttendanceReport = async (req, res) => {
    try {
        const { year, department, employeeId } = req.query;
        const yearNum = Number(year) || new Date().getFullYear();

        const yearStart = new Date(yearNum, 0, 1);
        const yearEnd = new Date(yearNum, 11, 31, 23, 59, 59);

        const employees = await Employee.find(
            buildEmployeeQuery({ department, employeeId })
        ).lean();

        const classification = await buildClassificationMap(employees, yearStart, yearEnd);

        const currentMonthLimit = new Date().getFullYear() === yearNum ? new Date().getMonth() + 1 : 12;

        const rows = employees.map((emp) => {
            const empMap = classification[emp._id.toString()];
            const monthly = [];

            for (let m = 1; m <= 12; m++) {
                if (m > currentMonthLimit) {
                    monthly.push(null);
                    continue;
                }
                const mStart = new Date(yearNum, m - 1, 1);
                const mEnd = new Date(yearNum, m, 0, 23, 59, 59);
                const monthEntries = Object.entries(empMap).filter(([key]) => {
                    const d = new Date(key);
                    return d >= mStart && d <= mEnd;
                });
                const mCounts = countStatuses(Object.fromEntries(monthEntries));
                monthly.push(attendancePercent(mCounts));
            }

            const validMonths = monthly.filter((v) => v !== null);
            const yearAvg = validMonths.length
                ? round1(validMonths.reduce((s, v) => s + v, 0) / validMonths.length)
                : 0;

            return {
                employeeId: emp._id.toString(),
                employeeName: employeeName(emp),
                monthly, // Jan..Dec, null if not yet occurred
                yearAvg,
            };
        });

        const overallCounts = employees.reduce(
            (acc, emp) => {
                const c = countStatuses(classification[emp._id.toString()]);
                acc.present += c.PRESENT;
                acc.absent += c.ABSENT;
                acc.leave += c.LEAVE;
                acc.late += c.LATE;
                acc.totalWorkingHours += c.totalWorkingHours;
                return acc;
            },
            { present: 0, absent: 0, leave: 0, late: 0, totalWorkingHours: 0 }
        );

        const monthlyOrgAverages = [];
        for (let m = 1; m <= currentMonthLimit; m++) {
            const values = rows.map((r) => r.monthly[m - 1]).filter((v) => v !== null);
            monthlyOrgAverages.push({
                month: m,
                value: values.length ? round1(values.reduce((s, v) => s + v, 0) / values.length) : 0,
            });
        }

        const highest = monthlyOrgAverages.reduce((a, b) => (b.value > a.value ? b : a), monthlyOrgAverages[0]);
        const lowest = monthlyOrgAverages.reduce((a, b) => (b.value < a.value ? b : a), monthlyOrgAverages[0]);

        const avgAttendance = rows.length
            ? round1(rows.reduce((s, r) => s + r.yearAvg, 0) / rows.length)
            : 0;

        return res.json({
            rows,
            stats: {
                averageAttendance: avgAttendance,
                highestMonth: highest ? highest.month : null,
                highestMonthValue: highest ? highest.value : null,
                lowestMonth: lowest ? lowest.month : null,
                lowestMonthValue: lowest ? lowest.value : null,
                totalPresent: overallCounts.present,
                totalAbsent: overallCounts.absent,
                totalLeave: overallCounts.leave,
                totalLate: overallCounts.late,
                totalWorkingHours: round1(overallCounts.totalWorkingHours),
            },
        });
    } catch (error) {
        console.error("Get Yearly Attendance Report Error:", error);
        return res.status(500).json({ error: "Failed to generate report" });
    }
};

// ======================================
// 7. Attendance Trend Report
// GET /api/reports/attendance/trend?year&department
// ======================================
export const getAttendanceTrendReport = async (req, res) => {
    try {
        const { year, department } = req.query;
        const yearNum = Number(year) || new Date().getFullYear();

        const employees = await Employee.find(
            buildEmployeeQuery({ department })
        ).lean();

        const yearStart = new Date(yearNum, 0, 1);
        const yearEnd = new Date(yearNum, 11, 31, 23, 59, 59);
        const classification = await buildClassificationMap(employees, yearStart, yearEnd);

        const currentMonthLimit = new Date().getFullYear() === yearNum ? new Date().getMonth() + 1 : 12;

        const trend = [];
        for (let m = 1; m <= currentMonthLimit; m++) {
            const mStart = new Date(yearNum, m - 1, 1);
            const mEnd = new Date(yearNum, m, 0, 23, 59, 59);

            let totalCounts = { PRESENT: 0, HALF_DAY: 0, workingDaysCounted: 0 };
            employees.forEach((emp) => {
                const empMap = classification[emp._id.toString()];
                const monthEntries = Object.entries(empMap).filter(([key]) => {
                    const d = new Date(key);
                    return d >= mStart && d <= mEnd;
                });
                const c = countStatuses(Object.fromEntries(monthEntries));
                totalCounts.PRESENT += c.PRESENT;
                totalCounts.HALF_DAY += c.HALF_DAY;
                totalCounts.workingDaysCounted += c.workingDaysCounted;
            });

            trend.push({
                month: m,
                attendancePercent: attendancePercent(totalCounts),
            });
        }

        return res.json({ year: yearNum, trend });
    } catch (error) {
        console.error("Get Attendance Trend Report Error:", error);
        return res.status(500).json({ error: "Failed to generate report" });
    }
};

// ======================================
// 8. Late Arrival Report
// GET /api/reports/attendance/late-arrivals?month&year&department&employeeId
// ======================================
export const getLateArrivalReport = async (req, res) => {
    try {
        const { month, year, department, employeeId } = req.query;
        if (!month || !year) return res.status(400).json({ error: "Month and year are required" });

        const monthNum = Number(month);
        const yearNum = Number(year);
        const monthStart = new Date(yearNum, monthNum - 1, 1);
        const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59);

        const employees = await Employee.find(
            buildEmployeeQuery({ department, employeeId })
        ).lean();

        const employeeIds = employees.map((e) => e._id);
        const empById = Object.fromEntries(employees.map((e) => [e._id.toString(), e]));

        const lateRecords = await Attendance.find({
            employeeId: { $in: employeeIds },
            date: { $gte: monthStart, $lte: monthEnd },
            status: "LATE",
        }).lean();

        const rows = lateRecords.map((rec) => {
            const emp = empById[rec.employeeId.toString()];
            const checkIn = new Date(rec.checkIn);
            const lateByMinutes = Math.max(
                0,
                (checkIn.getHours() - LATE_HOUR) * 60 + checkIn.getMinutes()
            );
            return {
                employeeId: rec.employeeId.toString(),
                employeeName: emp ? employeeName(emp) : "—",
                department: emp?.department || "—",
                date: rec.date,
                checkIn: rec.checkIn,
                expected: `${LATE_HOUR}:00 AM`,
                lateByMinutes,
            };
        }).sort((a, b) => new Date(b.date) - new Date(a.date));

        const lateCountByEmployee = {};
        rows.forEach((r) => {
            lateCountByEmployee[r.employeeId] = (lateCountByEmployee[r.employeeId] || 0) + 1;
        });
        const frequentlyLate = Object.entries(lateCountByEmployee).filter(([, c]) => c >= 3).length;

        const lateCountByDept = {};
        rows.forEach((r) => {
            lateCountByDept[r.department] = (lateCountByDept[r.department] || 0) + 1;
        });
        const topDept = Object.entries(lateCountByDept).sort((a, b) => b[1] - a[1])[0];

        const avgDelay = rows.length
            ? Math.round(rows.reduce((s, r) => s + r.lateByMinutes, 0) / rows.length)
            : 0;
        const maxDelay = rows.length ? Math.max(...rows.map((r) => r.lateByMinutes)) : 0;

        return res.json({
            rows,
            summary: {
                totalLateArrivals: rows.length,
                employeesFrequentlyLate: frequentlyLate,
                averageDelayMinutes: avgDelay,
                maxDelayMinutes: maxDelay,
                departmentWithMostLateArrivals: topDept ? topDept[0] : "—",
            },
        });
    } catch (error) {
        console.error("Get Late Arrival Report Error:", error);
        return res.status(500).json({ error: "Failed to generate report" });
    }
};

// ======================================
// 9. Early Exit Report
// GET /api/reports/attendance/early-exits?month&year&department&employeeId
// ======================================
export const getEarlyExitReport = async (req, res) => {
    try {
        const { month, year, department, employeeId } = req.query;
        if (!month || !year) return res.status(400).json({ error: "Month and year are required" });

        const monthNum = Number(month);
        const yearNum = Number(year);
        const monthStart = new Date(yearNum, monthNum - 1, 1);
        const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59);

        const employees = await Employee.find(
            buildEmployeeQuery({ department, employeeId })
        ).lean();

        const employeeIds = employees.map((e) => e._id);
        const empById = Object.fromEntries(employees.map((e) => [e._id.toString(), e]));

        const records = await Attendance.find({
            employeeId: { $in: employeeIds },
            date: { $gte: monthStart, $lte: monthEnd },
            checkOut: { $ne: null },
        }).lean();

        const rows = records
            .filter((rec) => new Date(rec.checkOut).getHours() < EXPECTED_EXIT_HOUR)
            .map((rec) => {
                const emp = empById[rec.employeeId.toString()];
                const checkOut = new Date(rec.checkOut);
                const expected = new Date(checkOut);
                expected.setHours(EXPECTED_EXIT_HOUR, 0, 0, 0);
                const leftEarlyMinutes = Math.max(0, Math.round((expected - checkOut) / 60000));

                return {
                    employeeId: rec.employeeId.toString(),
                    employeeName: emp ? employeeName(emp) : "—",
                    department: emp?.department || "—",
                    date: rec.date,
                    checkIn: rec.checkIn,
                    checkOut: rec.checkOut,
                    expectedExit: `${EXPECTED_EXIT_HOUR}:00`,
                    leftEarlyMinutes,
                };
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        return res.json({
            rows,
            summary: {
                totalEarlyExits: rows.length,
                averageEarlyByMinutes: rows.length
                    ? Math.round(rows.reduce((s, r) => s + r.leftEarlyMinutes, 0) / rows.length)
                    : 0,
            },
        });
    } catch (error) {
        console.error("Get Early Exit Report Error:", error);
        return res.status(500).json({ error: "Failed to generate report" });
    }
};

// ======================================
// 10. Working Hours Report
// GET /api/reports/attendance/working-hours?month&year&department&employeeId
// ======================================
export const getWorkingHoursReport = async (req, res) => {
    try {
        const { month, year, department, employeeId } = req.query;
        if (!month || !year) return res.status(400).json({ error: "Month and year are required" });

        const monthNum = Number(month);
        const yearNum = Number(year);
        const monthStart = new Date(yearNum, monthNum - 1, 1);
        const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59);

        const employees = await Employee.find(
            buildEmployeeQuery({ department, employeeId })
        ).lean();

        const employeeIds = employees.map((e) => e._id);
        const empById = Object.fromEntries(employees.map((e) => [e._id.toString(), e]));

        const records = await Attendance.find({
            employeeId: { $in: employeeIds },
            date: { $gte: monthStart, $lte: monthEnd },
            workingHours: { $ne: null },
        }).sort({ date: -1 }).lean();

        const rows = records.map((rec) => {
            const emp = empById[rec.employeeId.toString()];
            const overtime = round1(Math.max(0, (rec.workingHours || 0) - 8));

            return {
                employeeId: rec.employeeId.toString(),
                employeeName: emp ? employeeName(emp) : "—",
                department: emp?.department || "—",
                date: rec.date,
                checkIn: rec.checkIn,
                checkOut: rec.checkOut,
                workHours: rec.workingHours,
                overtime,
            };
        });

        const totalHours = round1(rows.reduce((s, r) => s + (r.workHours || 0), 0));
        const totalOvertime = round1(rows.reduce((s, r) => s + r.overtime, 0));

        return res.json({
            rows,
            summary: {
                totalRecords: rows.length,
                totalWorkingHours: totalHours,
                totalOvertimeHours: totalOvertime,
                averageWorkingHours: rows.length ? round1(totalHours / rows.length) : 0,
            },
        });
    } catch (error) {
        console.error("Get Working Hours Report Error:", error);
        return res.status(500).json({ error: "Failed to generate report" });
    }
};

// ======================================
// Legacy endpoint kept for backwards compatibility
// (old simple report — no longer used by the new Reports page)
// ======================================
export const getAttendanceReport = getMonthlyAttendanceReport;