import { Router } from "express";
import { protect, protectAdmin } from "../middleware/auth.js";
import {
    getAttendanceReport,
    getMonthlyAttendanceReport,
    getEmployeeAttendanceReport,
    getWeeklyAttendanceReport,
    getDailyAttendanceReport,
    getDepartmentAttendanceReport,
    getYearlyAttendanceReport,
    getAttendanceTrendReport,
    getLateArrivalReport,
    getEarlyExitReport,
    getWorkingHoursReport,
} from "../controllers/reportController.js";

const reportRouter = Router();

// Legacy (kept so nothing currently pointing at this breaks)
reportRouter.get("/attendance", protect, protectAdmin, getAttendanceReport);

reportRouter.get("/attendance/monthly", protect, protectAdmin, getMonthlyAttendanceReport);
reportRouter.get("/attendance/employee/:employeeId", protect, protectAdmin, getEmployeeAttendanceReport);
reportRouter.get("/attendance/weekly", protect, protectAdmin, getWeeklyAttendanceReport);
reportRouter.get("/attendance/daily", protect, protectAdmin, getDailyAttendanceReport);
reportRouter.get("/attendance/department", protect, protectAdmin, getDepartmentAttendanceReport);
reportRouter.get("/attendance/yearly", protect, protectAdmin, getYearlyAttendanceReport);
reportRouter.get("/attendance/trend", protect, protectAdmin, getAttendanceTrendReport);
reportRouter.get("/attendance/late-arrivals", protect, protectAdmin, getLateArrivalReport);
reportRouter.get("/attendance/early-exits", protect, protectAdmin, getEarlyExitReport);
reportRouter.get("/attendance/working-hours", protect, protectAdmin, getWorkingHoursReport);

export default reportRouter;