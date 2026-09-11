import Employee from "../models/Employee.js";

// =====================================================
// GET DELETED EMPLOYEES
// =====================================================

export const getDeletedEmployees = async (req, res) => {
    try {
        const employees = await Employee.find({
            isDeleted: true,

            /*
                Employees permanently hidden from the
                Deleted Employees portal must not appear here.

                IMPORTANT:

                Permanently hidden does NOT mean deleted
                from MongoDB.

                The Employee record, email, userId,
                temporaryPassword and other data remain
                preserved in the database.
            */

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

        return res.json(
            employees
        );
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

        /*
            If the employee is already in Deleted Employees
            and is visible there, there is nothing else to do.
        */

        if (
            employee.isDeleted &&
            !employee.isPermanentlyHidden
        ) {
            return res.json({
                success: true,

                message:
                    "Employee already deleted",

                employee,
            });
        }

        /*
            =================================================
            SOFT DELETE RULE
            =================================================

            Delete DOES NOT create or destroy identity.

            Preserve:

            - Employee._id
            - Employee.userId
            - Employee.email
            - Employee.temporaryPassword
            - employee information
            - existing User
            - existing User.password

            We only archive the Employee card.
        */

        employee.isDeleted =
            true;

        /*
            If this employee had previously been permanently
            hidden from the Deleted Employees portal and later
            became active again, deleting them again should
            show them in Deleted Employees.
        */

        employee.isPermanentlyHidden =
            false;

        /*
            Deleted employee should not behave as an
            active employee anywhere else in the system.
        */

        employee.employmentStatus =
            "INACTIVE";

        await employee.save({
            validateModifiedOnly:
                true,
        });

        return res.json({
            success: true,

            message:
                "Employee moved to Deleted Employees",

            employee,
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
                    error.message ||
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

        /*
            If the employee is already active, do not create
            anything and do not modify passwords.
        */

        if (
            !employee.isDeleted &&
            !employee.isPermanentlyHidden
        ) {
            return res.json({
                success: true,

                message:
                    "Employee is already restored",

                employee,
            });
        }

        /*
            =================================================
            RESTORE RULE
            =================================================

            Restore the SAME Employee.

            Keep exactly the same:

            - Employee._id
            - Employee.userId
            - Employee.email
            - Employee.temporaryPassword
            - all employee information
            - current linked User
            - current User.password

            DO NOT:

            - Employee.create(...)
            - User.create(...)
            - regenerate temporaryPassword
            - modify User.password
            - copy any new form values
            - copy any new Excel values

            Only restore archive/card state.
        */

        employee.isDeleted =
            false;

        employee.isPermanentlyHidden =
            false;

        employee.employmentStatus =
            "ACTIVE";

        await employee.save({
            validateModifiedOnly:
                true,
        });

        /*
            Fetch again with populated User information
            for the frontend card.

            Population here is read-only.
            No User information is modified.
        */

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
                    error.message ||
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
// VERY IMPORTANT:
//
// This does NOT permanently delete the Employee from MongoDB.
//
// The Employee record must remain because its email continues
// to identify that same employee.
//
// Example:
//
// Employee deleted
//      ↓
// Employee permanently hidden from Deleted Employees portal
//      ↓
// MongoDB Employee STILL EXISTS
//      ↓
// Admin later enters the SAME Name + SAME Email
//      ↓
// Backend detects archived employee
//      ↓
// "Generate Existing Employee Card"
//      ↓
// SAME Employee is restored
//
// This guarantees that we do NOT create:
// - duplicate Employee
// - duplicate User
// - new temporaryPassword
// - new login password
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

            /*
                Remove:
                - empty IDs
                - duplicate IDs

                before sending them to MongoDB.
            */

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
                =================================================
                PORTAL-ONLY PERMANENT HIDE
                =================================================

                Only already-deleted employees are affected.

                Active employee cards cannot accidentally
                be hidden through this endpoint.

                IMPORTANT:

                We intentionally do NOT call:

                    Employee.deleteMany(...)
                    Employee.findByIdAndDelete(...)
                    User.deleteMany(...)
                    User.findByIdAndDelete(...)

                The Employee/User remain in MongoDB.
            */

            const result =
                await Employee.updateMany(
                    {
                        _id: {
                            $in:
                                uniqueEmployeeIds,
                        },

                        isDeleted:
                            true,
                    },
                    {
                        $set: {
                            isPermanentlyHidden:
                                true,

                            /*
                                Employee remains archived.
                            */

                            employmentStatus:
                                "INACTIVE",
                        },
                    }
                );

            return res.json({
                success:
                    true,

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
                        error.message ||
                        "Failed to remove selected employees from Deleted Employees",
                });
        }
    };