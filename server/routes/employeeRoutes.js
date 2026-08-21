import { Router } from "express";

import {
    createEmployee,
    deleteEmployee,
    getEmployees,
    updateEmployee,
    getEmployeePublicProfile,
    getEmployeeDirectory,
} from "../controllers/employeeController.js";

import { protect, protectAdmin } from "../middleware/auth.js";

const employeesRouter = Router();

// Admin employee management
employeesRouter.get("/", protect, protectAdmin, getEmployees);
employeesRouter.post("/", protect, protectAdmin, createEmployee);
employeesRouter.put("/:id", protect, protectAdmin, updateEmployee);
employeesRouter.delete("/:id", protect, protectAdmin, deleteEmployee);

// Employee public directory
employeesRouter.get("/directory", protect, getEmployeeDirectory);

// Employee public profile
employeesRouter.get("/:id/profile", protect, getEmployeePublicProfile);

export default employeesRouter;