import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";

// Count weekdays (Mon-Fri) in a given month/year
const getWorkingDaysInMonth = (month, year) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    let count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    }
    return count;
};

const round = (num) => Math.round(num * 10) / 10;

// Get attendance report
// GET /api/reports/attendance?month=&year=&employeeId=(optional)
export const getAttendanceReport = async (req, res) => {
    try {
        const { month, year, employeeId } = req.query;

        if (!month || !year) {
            return res.status(400).json({ error: "Month and year are required" });
        }

        const monthNum = Number(month);
        const yearNum = Number(year);

        const monthStart = new Date(yearNum, monthNum - 1, 1);
        const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59);

        const totalWorkingDays = getWorkingDaysInMonth(monthNum, yearNum);

        if (employeeId) {
            // Individual employee report
            const presentRecords = await Attendance.find({
                employeeId,
                date: { $gte: monthStart, $lte: monthEnd },
                status: { $in: ["PRESENT", "LATE"] },
            });

            const daysPresent = presentRecords.length;
            const daysAbsent = Math.max(totalWorkingDays - daysPresent, 0);
            const attendancePercent = totalWorkingDays > 0
                ? round((daysPresent / totalWorkingDays) * 100)
                : 0;

            return res.json({
                summary: {
                    totalWorkingDays,
                    daysPresent,
                    daysAbsent,
                    attendancePercent,
                },
            });
        } else {
            // Overview: all employees
            const employees = await Employee.find({ isDeleted: false }).lean();

            const perEmployee = [];
            let totalPresentAll = 0;

            for (const emp of employees) {
                const presentRecords = await Attendance.find({
                    employeeId: emp._id,
                    date: { $gte: monthStart, $lte: monthEnd },
                    status: { $in: ["PRESENT", "LATE"] },
                });

                const daysPresent = presentRecords.length;
                const daysAbsent = Math.max(totalWorkingDays - daysPresent, 0);
                const attendancePercent = totalWorkingDays > 0
                    ? round((daysPresent / totalWorkingDays) * 100)
                    : 0;

                totalPresentAll += daysPresent;

                perEmployee.push({
                    employeeId: emp._id.toString(),
                    name: `${emp.firstName} ${emp.lastName}`,
                    daysPresent,
                    daysAbsent,
                    attendancePercent,
                });
            }

            const totalPossibleDays = totalWorkingDays * employees.length;
            const totalAbsentAll = Math.max(totalPossibleDays - totalPresentAll, 0);
            const overallAttendancePercent = totalPossibleDays > 0
                ? round((totalPresentAll / totalPossibleDays) * 100)
                : 0;

            return res.json({
                summary: {
                    totalWorkingDays,
                    daysPresent: totalPresentAll,
                    daysAbsent: totalAbsentAll,
                    attendancePercent: overallAttendancePercent,
                },
                perEmployee,
            });
        }
    } catch (error) {
        console.error("Get Attendance Report Error:", error);
        return res.status(500).json({ error: "Failed to generate report" });
    }
};