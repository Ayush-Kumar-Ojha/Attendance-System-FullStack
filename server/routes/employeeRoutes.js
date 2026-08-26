import { Router } from "express";

import {
    createEmployee,
    deleteEmployee,
    getEmployees,
    getEmployeeById,
    updateEmployee,
    getEmployeePublicProfile,
    getEmployeeDirectory,
    exportEmployees,
    getEmployeeDocuments,
} from "../controllers/employeeController.js";

import { protect, protectAdmin } from "../middleware/auth.js";

const employeesRouter = Router();

// Export employees sheet
employeesRouter.get("/export", protect, protectAdmin, exportEmployees);

// Employee public directory
employeesRouter.get("/directory", protect, getEmployeeDirectory);

// Admin employee management
employeesRouter.get("/", protect, protectAdmin, getEmployees);
employeesRouter.post("/", protect, protectAdmin, createEmployee);
employeesRouter.get("/:id", protect, protectAdmin, getEmployeeById);
employeesRouter.get("/:id/documents", protect, protectAdmin, getEmployeeDocuments);
employeesRouter.put("/:id", protect, protectAdmin, updateEmployee);
employeesRouter.delete("/:id", protect, protectAdmin, deleteEmployee);

// Employee public profile
employeesRouter.get("/:id/profile", protect, getEmployeePublicProfile);

export default employeesRouter;