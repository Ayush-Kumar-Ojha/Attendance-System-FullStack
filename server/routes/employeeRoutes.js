import { Router } from "express";

import {
    createEmployee,
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
    getDeletedEmployees,
    softDeleteEmployee,
    restoreEmployee,
    permanentlyHideDeletedEmployees,
} from "../controllers/deletedEmployeeController.js";

import {
    protect,
    protectAdmin,
} from "../middleware/auth.js";

import {
    uploadEmployeeExcel,
} from "../middleware/uploadEmployeeExcel.js";

const employeesRouter = Router();

// =====================================================
// EXPORT
// =====================================================

employeesRouter.get(
    "/export",
    protect,
    protectAdmin,
    exportEmployees
);

// =====================================================
// EXCEL BULK UPLOAD
// =====================================================

employeesRouter.post(
    "/bulk-upload",
    protect,
    protectAdmin,
    uploadEmployeeExcel,
    bulkUploadEmployees
);

// =====================================================
// DIRECTORY
// =====================================================

employeesRouter.get(
    "/directory",
    protect,
    getEmployeeDirectory
);

// =====================================================
// DELETED EMPLOYEES
// =====================================================

employeesRouter.get(
    "/deleted",
    protect,
    protectAdmin,
    getDeletedEmployees
);

/*
    Removes selected deleted employees from the
    Deleted Employees PORTAL ONLY.

    MongoDB Employee records are NOT deleted.
*/

employeesRouter.patch(
    "/deleted/permanent-hide",
    protect,
    protectAdmin,
    permanentlyHideDeletedEmployees
);

// =====================================================
// NORMAL EMPLOYEES
// =====================================================

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

// =====================================================
// RESTORE
// =====================================================

employeesRouter.patch(
    "/:id/restore",
    protect,
    protectAdmin,
    restoreEmployee
);

// =====================================================
// DOCUMENTS
// =====================================================

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

// =====================================================
// PROFILE
// =====================================================

employeesRouter.get(
    "/:id/profile",
    protect,
    getEmployeePublicProfile
);

// =====================================================
// EMPLOYEE BY ID
// =====================================================

employeesRouter.get(
    "/:id",
    protect,
    protectAdmin,
    getEmployeeById
);

// =====================================================
// UPDATE
// =====================================================

employeesRouter.put(
    "/:id",
    protect,
    protectAdmin,
    updateEmployee
);

// =====================================================
// SOFT DELETE
// =====================================================

employeesRouter.delete(
    "/:id",
    protect,
    protectAdmin,
    softDeleteEmployee
);

export default employeesRouter;