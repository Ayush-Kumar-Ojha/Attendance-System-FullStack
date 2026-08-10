import { DEPARTMENTS } from "../constants/departments.js";
import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";
import LeaveApplication from "../models/LeaveApplication.js";
import Payslip from "../models/Payslip.js";

// Get dashboard for employee and admin
// GET /api/dashboard

export const getDashboard = async (req, res) => {
  try {
    const session = req.session;

    // ================= ADMIN DASHBOARD =================
    if (session.role === "ADMIN") {
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
      const todayEnd = new Date(new Date().setHours(24, 0, 0, 0));

      const [allActiveEmployees, todayAttendanceRecords, pendingLeaves] =
        await Promise.all([
          Employee.find({
            isDeleted: { $ne: true },
          }).select("firstName lastName department").lean(),

          Attendance.find({
            date: {
              $gte: todayStart,
              $lt: todayEnd,
            },
          }).lean(),

          LeaveApplication.countDocuments({
            status: "PENDING",
          }),
        ]);

      const totalEmployees = allActiveEmployees.length;
      const todayAttendance = todayAttendanceRecords.length;

      const checkedInEmployeeIds = new Set(
        todayAttendanceRecords.map((r) => r.employeeId.toString())
      );

      const lateCheckIns = todayAttendanceRecords.filter(
        (r) => r.status === "LATE"
      ).length;

      const earlyCheckOuts = todayAttendanceRecords.filter(
        (r) =>
          r.checkOut &&
          (r.dayType === "Half Day" || r.dayType === "Short Day")
      ).length;

      const notCheckedInEmployees = allActiveEmployees
        .filter((emp) => !checkedInEmployeeIds.has(emp._id.toString()))
        .map((emp) => ({
          id: emp._id.toString(),
          name: `${emp.firstName} ${emp.lastName}`,
          department: emp.department || "N/A",
        }));

      const attendancePercent =
        totalEmployees > 0
          ? Math.round((checkedInEmployeeIds.size / totalEmployees) * 100)
          : 0;

      return res.json({
        role: "ADMIN",
        totalEmployees,
        totalDepartments: DEPARTMENTS.length,
        todayAttendance,
        pendingLeaves,
        attendancePercent,
        lateCheckIns,
        earlyCheckOuts,
        notCheckedInYet: notCheckedInEmployees.length,
        notCheckedInEmployees,
      });
    }

    // ================= EMPLOYEE DASHBOARD =================

    const employee = await Employee.findOne({
      userId: session.userId,
    }).lean();

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found",
      });
    }

    const today = new Date();

    const [
      currentMonthAttendance,
      pendingLeaves,
      latestPayslip,
    ] = await Promise.all([
      Attendance.countDocuments({
        employeeId: employee._id,
        date: {
          $gte: new Date(today.getFullYear(), today.getMonth(), 1),
          $lt: new Date(today.getFullYear(), today.getMonth() + 1, 1),
        },
      }),

      LeaveApplication.countDocuments({
        employeeId: employee._id,
        status: "PENDING",
      }),

      Payslip.findOne({
        employeeId: employee._id,
      })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return res.json({
      role: "EMPLOYEE",

      employee: {
        ...employee,
        id: employee._id.toString(),
      },

      currentMonthAttendance,

      pendingLeaves,

      latestPayslip: latestPayslip
        ? {
            ...latestPayslip,
            id: latestPayslip._id.toString(),
          }
        : null,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);

    return res.status(500).json({
      error: "Failed to load dashboard.",
    });
  }
};