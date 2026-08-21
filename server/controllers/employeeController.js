import Employee from "../models/Employee.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";

// ======================================
// Get Employees
// GET /api/employees
// ======================================
export const getEmployees = async (req, res) => {
    try {
        const { department } = req.query;

        const where = {
            isDeleted: { $ne: true },
        };

        if (department) {
            where.department = department;
        }

        const employees = await Employee.find(where)
            .sort({ createdAt: -1 })
            .populate("userId", "email role")
            .lean();

        const result = employees.map((emp) => ({
            ...emp,

            id: emp._id.toString(),

            user: emp.userId
                ? {
                    email: emp.userId.email,
                    role: emp.userId.role,
                }
                : null,
        }));

        return res.json(result);
    } catch (error) {
        console.error("Get Employees Error:", error);

        return res.status(500).json({
            error: "Failed to fetch employees",
        });
    }
};

// ======================================
// Create Employee
// POST /api/employees
// ======================================
export const createEmployee = async (req, res) => {
    try {
        const {
            employeeCode,

            firstName,
            lastName,

            email,
            phone,

            gender,
            maritalStatus,
            aadharNumber,

            bankName,
            bankAccountNumber,
            uanNumber,
            panNumber,

            dateOfBirth,
            joinDate,
            confirmationDate,

            position,
            department,

            basicSalary,
            allowances,
            deductions,

            password,
            role,

            bio,
        } = req.body;

        // ==============================
        // Validate required fields
        // ==============================

        if (
            !employeeCode ||
            !firstName ||
            !lastName ||
            !email ||
            !phone ||
            !gender ||
            !aadharNumber ||
            !bankName ||
            !bankAccountNumber ||
            !uanNumber ||
            !panNumber ||
            !password ||
            !position ||
            !joinDate
        ) {
            return res.status(400).json({
                error: "Please fill all required fields",
            });
        }

        // ==============================
        // Check Employee Code
        // ==============================

        const existingEmployeeCode = await Employee.findOne({
            employeeCode: employeeCode.trim(),
        });

        if (existingEmployeeCode) {
            return res.status(400).json({
                error: "Employee code already exists",
            });
        }

        // ==============================
        // Check Email
        // ==============================

        const existingUser = await User.findOne({
            email: email.trim().toLowerCase(),
        });

        if (existingUser) {
            return res.status(400).json({
                error: "Email already exists",
            });
        }

        // ==============================
        // Hash Password
        // ==============================

        const hashedPassword = await bcrypt.hash(password, 10);

        // ==============================
        // Create User
        // ==============================

        const user = await User.create({
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            role: role || "EMPLOYEE",
        });

        try {
            // ==============================
            // Create Employee
            // ==============================

            const employee = await Employee.create({
                userId: user._id,

                employeeCode: employeeCode.trim(),

                firstName: firstName.trim(),
                lastName: lastName.trim(),

                email: email.trim().toLowerCase(),
                phone: phone.trim(),

                gender,
                maritalStatus: maritalStatus || null,

                aadharNumber: aadharNumber.trim(),

                bankName: bankName.trim(),
                bankAccountNumber: bankAccountNumber.trim(),
                uanNumber: uanNumber.trim(),
                panNumber: panNumber.trim().toUpperCase(),

                dateOfBirth: dateOfBirth
                    ? new Date(dateOfBirth)
                    : null,

                joinDate: new Date(joinDate),

                confirmationDate: confirmationDate
                    ? new Date(confirmationDate)
                    : null,

                position: position.trim(),

                department: department || "Engineering",

                basicSalary: Number(basicSalary) || 0,
                allowances: Number(allowances) || 0,
                deductions: Number(deductions) || 0,

                bio: bio || "",

                employmentStatus: "ACTIVE",
            });

            return res.status(201).json({
                success: true,
                message: "Employee created successfully",
                employee,
            });
        } catch (employeeError) {
            // If Employee creation fails,
            // remove the User that was already created.

            await User.findByIdAndDelete(user._id);

            throw employeeError;
        }
    } catch (error) {
        console.error("Create Employee Error:", error);

        if (error.code === 11000) {
            return res.status(400).json({
                error: "Employee code or email already exists",
            });
        }

        return res.status(500).json({
            error: "Failed to create employee",
        });
    }
};

// ======================================
// Update Employee
// PUT /api/employees/:id
// ======================================
export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            employeeCode,

            firstName,
            lastName,

            email,
            phone,

            gender,
            maritalStatus,
            aadharNumber,

            bankName,
            bankAccountNumber,
            uanNumber,
            panNumber,

            dateOfBirth,
            joinDate,
            confirmationDate,

            position,
            department,

            basicSalary,
            allowances,
            deductions,

            password,
            role,

            bio,
            employmentStatus,
        } = req.body;

        const employee = await Employee.findById(id);

        if (!employee) {
            return res.status(404).json({
                error: "Employee not found",
            });
        }

        // ==============================
        // Check Employee Code
        // ==============================

        if (employeeCode) {
            const existingCode = await Employee.findOne({
                employeeCode: employeeCode.trim(),
                _id: { $ne: id },
            });

            if (existingCode) {
                return res.status(400).json({
                    error: "Employee code already exists",
                });
            }
        }

        // ==============================
        // Update Employee
        // ==============================

        await Employee.findByIdAndUpdate(
            id,
            {
                employeeCode:
                    employeeCode?.trim() ||
                    employee.employeeCode,

                firstName:
                    firstName?.trim() ||
                    employee.firstName,

                lastName:
                    lastName?.trim() ||
                    employee.lastName,

                email:
                    email?.trim().toLowerCase() ||
                    employee.email,

                phone:
                    phone?.trim() ||
                    employee.phone,

                gender:
                    gender || employee.gender,

                maritalStatus:
                    maritalStatus || employee.maritalStatus,

                aadharNumber:
                    aadharNumber !== undefined && aadharNumber !== ""
                        ? aadharNumber.trim()
                        : employee.aadharNumber,

                bankName:
                    bankName !== undefined && bankName !== ""
                        ? bankName.trim()
                        : employee.bankName,

                bankAccountNumber:
                    bankAccountNumber !== undefined && bankAccountNumber !== ""
                        ? bankAccountNumber.trim()
                        : employee.bankAccountNumber,

                uanNumber:
                    uanNumber !== undefined && uanNumber !== ""
                        ? uanNumber.trim()
                        : employee.uanNumber,

                panNumber:
                    panNumber !== undefined && panNumber !== ""
                        ? panNumber.trim().toUpperCase()
                        : employee.panNumber,

                dateOfBirth:
                    dateOfBirth
                        ? new Date(dateOfBirth)
                        : employee.dateOfBirth,

                joinDate:
                    joinDate
                        ? new Date(joinDate)
                        : employee.joinDate,

                confirmationDate:
                    confirmationDate
                        ? new Date(confirmationDate)
                        : employee.confirmationDate,

                position:
                    position?.trim() ||
                    employee.position,

                department:
                    department ||
                    employee.department,

                basicSalary:
                    Number(basicSalary) || 0,

                allowances:
                    Number(allowances) || 0,

                deductions:
                    Number(deductions) || 0,

                employmentStatus:
                    employmentStatus ||
                    employee.employmentStatus,

                bio:
                    bio !== undefined
                        ? bio
                        : employee.bio,
            },
            { new: true }
        );

        // ==============================
        // Update User
        // ==============================

        const userUpdate = {};

        if (email) {
            userUpdate.email = email.trim().toLowerCase();
        }

        if (role) {
            userUpdate.role = role;
        }

        if (password) {
            userUpdate.password = await bcrypt.hash(
                password,
                10
            );
        }

        if (Object.keys(userUpdate).length > 0) {
            await User.findByIdAndUpdate(
                employee.userId,
                userUpdate
            );
        }

        return res.json({
            success: true,
            message: "Employee updated successfully",
        });
    } catch (error) {
        console.error("Update Employee Error:", error);

        if (error.code === 11000) {
            return res.status(400).json({
                error: "Employee code or email already exists",
            });
        }

        return res.status(500).json({
            error: "Failed to update employee",
        });
    }
};

// ======================================
// Delete Employee
// DELETE /api/employees/:id
// ======================================
export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const employee = await Employee.findById(id);

        if (!employee) {
            return res.status(404).json({
                error: "Employee not found",
            });
        }

        employee.isDeleted = true;
        employee.employmentStatus = "INACTIVE";

        await employee.save();

        return res.json({
            success: true,
            message: "Employee deleted successfully",
        });
    } catch (error) {
        console.error("Delete Employee Error:", error);

        return res.status(500).json({
            error: "Failed to delete employee",
        });
    }
};

// ======================================
// Get Public Employee Profile
// GET /api/employees/:id/profile
// ======================================
export const getEmployeePublicProfile = async (
    req,
    res
) => {
    try {
        const employee = await Employee.findById(
            req.params.id
        ).lean();

        if (!employee) {
            return res.status(404).json({
                error: "Employee not found",
            });
        }

        return res.json({
            id: employee._id.toString(),

            employeeCode: employee.employeeCode,

            firstName: employee.firstName,
            lastName: employee.lastName,

            position: employee.position,
            department: employee.department,

            bio: employee.bio,

            image: employee.image || null,

            skills: employee.skills || [],
        });
    } catch (error) {
        console.error(
            "Get Employee Public Profile Error:",
            error
        );

        return res.status(500).json({
            error: "Failed to fetch profile",
        });
    }
};

// ======================================
// Get Employee + Admin Directory
// GET /api/employees/directory
// ======================================
export const getEmployeeDirectory = async (
    req,
    res
) => {
    try {
        const currentUserId = req.session.userId;

        // ==============================
        // Employees
        // ==============================

        const employees = await Employee.find({
            isDeleted: { $ne: true },
            employmentStatus: "ACTIVE",
        })
            .select(
                "employeeCode firstName lastName department image userId position"
            )
            .lean();

        const employeeDirectory = employees
            .filter(
                (employee) =>
                    employee.userId &&
                    employee.userId.toString() !==
                    currentUserId
            )
            .map((employee) => ({
                userId:
                    employee.userId.toString(),

                employeeCode:
                    employee.employeeCode,

                name: `${employee.firstName} ${employee.lastName}`,

                department:
                    employee.department ||
                    "Not specified",

                position:
                    employee.position ||
                    "Employee",

                image:
                    employee.image || null,

                role: "EMPLOYEE",
            }));

        // ==============================
        // Admins
        // ==============================

        const admins = await User.find({
            role: "ADMIN",
        })
            .select("email image")
            .lean();

        const adminDirectory = admins
            .filter(
                (admin) =>
                    admin._id.toString() !==
                    currentUserId
            )
            .map((admin) => ({
                userId:
                    admin._id.toString(),

                name: "Admin",

                department:
                    "Administration",

                position:
                    "Administrator",

                image:
                    admin.image || null,

                role: "ADMIN",
            }));

        return res.json([
            ...adminDirectory,
            ...employeeDirectory,
        ]);
    } catch (error) {
        console.error(
            "Get Employee Directory Error:",
            error
        );

        return res.status(500).json({
            error: "Failed to fetch directory",
        });
    }
};