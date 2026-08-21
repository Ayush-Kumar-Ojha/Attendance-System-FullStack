import { DEPARTMENTS } from "../constants/departments.js";
import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";
import LeaveApplication from "../models/LeaveApplication.js";
import Payslip from "../models/Payslip.js";
import Department from "../models/Department.js";

// Get dashboard for employee and admin
// GET /api/dashboard

export const getDashboard = async (req, res) => {
  try {
    const session = req.session;

    // ================= ADMIN DASHBOARD =================
    if (session.role === "ADMIN") {
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
      const todayEnd = new Date(new Date().setHours(24, 0, 0, 0));

      const allActiveEmployees = await Employee.find({ isDeleted: { $ne: true } }).select("firstName lastName department").lean();
      const todayAttendanceRecords = await Attendance.find({ date: { $gte: todayStart, $lt: todayEnd } }).populate("employeeId").lean();
      const pendingLeaves = await LeaveApplication.countDocuments({ status: "PENDING" });
      const departments = await Department.find().lean();

      const totalEmployees = allActiveEmployees.length;
      const checkedInEmployeeIds = new Set(todayAttendanceRecords.map((r) => r.employeeId?._id?.toString()));

      const lateCheckInEmployees = todayAttendanceRecords
        .filter((r) => r.status === "LATE" && r.employeeId)
        .map((r) => `${r.employeeId.firstName} ${r.employeeId.lastName}`);

      const earlyCheckOutEmployees = todayAttendanceRecords
        .filter((r) => r.checkOut && r.employeeId && (r.dayType === "Half Day" || r.dayType === "Short Day"))
        .map((r) => `${r.employeeId.firstName} ${r.employeeId.lastName}`);

      const notCheckedInEmployees = allActiveEmployees
        .filter((emp) => !checkedInEmployeeIds.has(emp._id.toString()))
        .map((emp) => `${emp.firstName} ${emp.lastName}`);

      const attendancePercent = totalEmployees > 0 ? Math.round((checkedInEmployeeIds.size / totalEmployees) * 100) : 0;

      return res.json({
        role: "ADMIN",
        totalEmployees,
        totalDepartments: departments.length,
        todayAttendance: todayAttendanceRecords.length,
        pendingLeaves,
        attendancePercent,
        lateCheckIns: lateCheckInEmployees.length,
        lateCheckInEmployees,
        earlyCheckOuts: earlyCheckOutEmployees.length,
        earlyCheckOutEmployees,
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