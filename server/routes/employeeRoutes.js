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
    generateExistingEmployeeCard,
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
// GENERATE EXISTING EMPLOYEE CARD
// =====================================================
//
// IMPORTANT:
//
// This route does NOT create:
// - a new Employee
// - a new User
// - a new temporary password
// - a new login password
//
// It restores the SAME archived Employee record.
//
// It must preserve:
//
// - Employee._id
// - Employee.userId
// - Employee.temporaryPassword
// - User._id
// - User.password
// - existing employee information
//
// Only archive/visibility state is restored.
//
// IMPORTANT:
// Keep this route ABOVE "/:id" routes.
// =====================================================

employeesRouter.post(
    "/generate-existing-card",
    protect,
    protectAdmin,
    generateExistingEmployeeCard
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

// =====================================================
// PERMANENTLY HIDE FROM DELETED EMPLOYEE PORTAL
// =====================================================
//
// IMPORTANT:
//
// "Permanent hide" means removing the employee card
// from the Deleted Employees portal.
//
// It must NOT delete the Employee document from MongoDB.
//
// The Employee email must remain reserved so that:
//
// same archived email + same employee
//
// can later show:
//
// "Generate Existing Employee Card"
//
// instead of creating a duplicate Employee/User.
// =====================================================

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
// RESTORE FROM DELETED EMPLOYEES PORTAL
// =====================================================
//
// This restores an Employee selected directly from
// Deleted Employees.
//
// It must restore the SAME Employee/User identity.
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
//
// Must archive the existing Employee.
//
// It must NOT remove:
// - Employee document
// - User document
// - Employee email
// - temporaryPassword
// - User.password
// =====================================================

employeesRouter.delete(
    "/:id",
    protect,
    protectAdmin,
    softDeleteEmployee
);

export default employeesRouter;