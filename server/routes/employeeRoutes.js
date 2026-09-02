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
    downloadEmployeeDocument,
    bulkUploadEmployees,
} from "../controllers/employeeController.js";

import {
    protect,
    protectAdmin,
} from "../middleware/auth.js";

import {
    uploadEmployeeExcel,
} from "../middleware/uploadEmployeeExcel.js";

const employeesRouter = Router();

// Download/export employees
employeesRouter.get(
    "/export",
    protect,
    protectAdmin,
    exportEmployees
);

// IMPORTANT:
// Must remain ABOVE "/:id"
employeesRouter.post(
    "/bulk-upload",
    protect,
    protectAdmin,
    uploadEmployeeExcel,
    bulkUploadEmployees
);

// Employee directory
employeesRouter.get(
    "/directory",
    protect,
    getEmployeeDirectory
);

// Employees
employeesRouter.get(
    "/",
    protect,
    protectAdmin,
    getEmployees
);

employeesRouter.post(
    "/",
    protect,
    protectAdmin,
    createEmployee
);

// Employee documents
employeesRouter.get(
    "/:id/documents",
    protect,
    protectAdmin,
    getEmployeeDocuments
);

employeesRouter.get(
    "/:id/documents/:documentId/download",
    protect,
    protectAdmin,
    downloadEmployeeDocument
);

// Public profile
employeesRouter.get(
    "/:id/profile",
    protect,
    getEmployeePublicProfile
);

// Single employee
employeesRouter.get(
    "/:id",
    protect,
    protectAdmin,
    getEmployeeById
);

employeesRouter.put(
    "/:id",
    protect,
    protectAdmin,
    updateEmployee
);

employeesRouter.delete(
    "/:id",
    protect,
    protectAdmin,
    deleteEmployee
);

export default employeesRouter;