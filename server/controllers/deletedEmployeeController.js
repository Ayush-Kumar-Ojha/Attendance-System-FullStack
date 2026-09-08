import Employee from "../models/Employee.js";

// =====================================================
// GET DELETED EMPLOYEES
// =====================================================

export const getDeletedEmployees = async (req, res) => {
    try {
        const employees = await Employee.find({
            isDeleted: true,

            // Employees permanently removed from the
            // Deleted Employees portal must not appear.
            isPermanentlyHidden: {
                $ne: true,
            },
        })
            .populate(
                "userId",
                "email role"
            )
            .sort({
                updatedAt: -1,
            })
            .lean();

        return res.json(employees);
    } catch (error) {
        console.error(
            "Get Deleted Employees Error:",
            error
        );

        return res
            .status(500)
            .json({
                error:
                    "Failed to fetch deleted employees",
            });
    }
};

// =====================================================
// SOFT DELETE EMPLOYEE
// =====================================================

export const softDeleteEmployee = async (req, res) => {
    try {
        const employee =
            await Employee.findById(
                req.params.id
            );

        if (!employee) {
            return res
                .status(404)
                .json({
                    error:
                        "Employee not found",
                });
        }

        if (
            employee.isDeleted &&
            !employee.isPermanentlyHidden
        ) {
            return res.json({
                success: true,
                message:
                    "Employee already deleted",
            });
        }

        /*
            IMPORTANT:

            Normal delete does NOT remove the employee
            from MongoDB.

            It only moves the employee to the
            Deleted Employees portal.

            If this employee had previously been hidden
            from Deleted Employees and later became
            active again, deleting again should make
            the employee visible in Deleted Employees.
        */

        employee.isDeleted = true;
        employee.isPermanentlyHidden = false;

        await employee.save();

        return res.json({
            success: true,
            message:
                "Employee moved to Deleted Employees",
        });
    } catch (error) {
        console.error(
            "Soft Delete Employee Error:",
            error
        );

        return res
            .status(500)
            .json({
                error:
                    "Failed to delete employee",
            });
    }
};

// =====================================================
// RESTORE DELETED EMPLOYEE
// =====================================================

export const restoreEmployee = async (req, res) => {
    try {
        const employee =
            await Employee.findById(
                req.params.id
            );

        if (!employee) {
            return res
                .status(404)
                .json({
                    error:
                        "Employee not found",
                });
        }

        if (!employee.isDeleted) {
            return res.json({
                success: true,
                message:
                    "Employee is already restored",
                employee,
            });
        }

        employee.isDeleted = false;

        // Once restored, reset the portal-only
        // permanent-hide state as well.
        employee.isPermanentlyHidden =
            false;

        await employee.save();

        const restoredEmployee =
            await Employee.findById(
                employee._id
            )
                .populate(
                    "userId",
                    "email role"
                )
                .lean();

        return res.json({
            success: true,
            message:
                "Employee restored successfully",
            employee:
                restoredEmployee,
        });
    } catch (error) {
        console.error(
            "Restore Employee Error:",
            error
        );

        return res
            .status(500)
            .json({
                error:
                    "Failed to restore employee",
            });
    }
};

// =====================================================
// HIDE DELETED EMPLOYEES FROM PORTAL
// =====================================================
//
// This is the "Delete Permanently" action shown inside
// Deleted Employees.
//
// IMPORTANT:
// It DOES NOT delete MongoDB employee records.
//
// It only hides those records from the
// Deleted Employees portal.
// =====================================================

export const permanentlyHideDeletedEmployees =
    async (req, res) => {
        try {
            const { employeeIds } =
                req.body;

            if (
                !Array.isArray(
                    employeeIds
                ) ||
                employeeIds.length === 0
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Please select at least one employee",
                    });
            }

            const uniqueEmployeeIds = [
                ...new Set(
                    employeeIds
                        .map((id) =>
                            String(
                                id || ""
                            ).trim()
                        )
                        .filter(Boolean)
                ),
            ];

            if (
                uniqueEmployeeIds.length ===
                0
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Please select at least one employee",
                    });
            }

            /*
                Only already-deleted employees can be
                hidden using this action.

                Active employees cannot accidentally
                be affected.
            */

            const result =
                await Employee.updateMany(
                    {
                        _id: {
                            $in:
                                uniqueEmployeeIds,
                        },

                        isDeleted: true,
                    },
                    {
                        $set: {
                            isPermanentlyHidden:
                                true,
                        },
                    }
                );

            return res.json({
                success: true,

                message:
                    result.modifiedCount === 1
                        ? "1 employee permanently removed from Deleted Employees"
                        : `${result.modifiedCount} employees permanently removed from Deleted Employees`,

                selectedCount:
                    uniqueEmployeeIds.length,

                modifiedCount:
                    result.modifiedCount,
            });
        } catch (error) {
            console.error(
                "Permanently Hide Deleted Employees Error:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Failed to remove selected employees from Deleted Employees",
                });
        }
    };