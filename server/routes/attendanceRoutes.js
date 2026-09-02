import {
    Router,
} from "express";

import {
    protect,
    protectAdmin,
} from "../middleware/auth.js";

import {
    clockInOut,
    getAttendance,
    correctMissedAttendance,

    // NEW ADMIN FUNCTIONS
    getAdminAttendanceRecord,
    adminOverrideAttendance,
} from "../controllers/attendanceController.js";

const attendanceRouter =
    Router();

// ============================================================
// EMPLOYEE ATTENDANCE
// ============================================================

// Normal Clock In / Clock Out
attendanceRouter.post(
    "/",
    protect,
    clockInOut
);

// Employee self correction
// Maximum 2 per month
attendanceRouter.post(
    "/correction",
    protect,
    correctMissedAttendance
);

// Get logged-in employee attendance
attendanceRouter.get(
    "/",
    protect,
    getAttendance
);

// ============================================================
// ADMIN ATTENDANCE OVERRIDE
// ============================================================

// Get one employee's attendance for selected date
attendanceRouter.get(
    "/admin/record",
    protect,
    protectAdmin,
    getAdminAttendanceRecord
);

// Unlimited admin attendance override
attendanceRouter.put(
    "/admin/override",
    protect,
    protectAdmin,
    adminOverrideAttendance
);

export default attendanceRouter;