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

            customFields,
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

                customFields: Array.isArray(customFields) ? customFields : [],
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

            customFields,
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

                customFields: Array.isArray(customFields)
                    ? customFields
                    : employee.customFields,
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

// ======================================
// Bulk Upload Employees via Excel Sheet
// POST /api/employees/bulk-upload
// Column headers must match the downloaded template exactly:
// First Name | Last Name | Phone Number | Join Date (YYYY-MM-DD) |
// Department | Designation | Basic Salary | Allowances | Deductions |
// Work Email | Temporary Password | System Role (EMPLOYEE/ADMIN) | Bio (Optional)
// ======================================
export const bulkUploadEmployees = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const XLSX = await import("xlsx");

        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!rawRows.length) {
            return res.status(400).json({ error: "The uploaded sheet has no data rows" });
        }

        const normalizeKey = (k) => String(k || "").trim().toLowerCase();

        const HEADER_ALIASES = {
            "first name": "firstName",
            "last name": "lastName",
            "phone number": "phone",
            "join date (yyyy-mm-dd)": "joinDate",
            "join date": "joinDate",
            "department": "department",
            "designation": "position",
            "position": "position",
            "basic salary": "basicSalary",
            "allowances": "allowances",
            "deductions": "deductions",
            "work email": "email",
            "email": "email",
            "temporary password": "password",
            "password": "password",
            "system role (employee/admin)": "role",
            "role": "role",
            "bio (optional)": "bio",
            "bio": "bio",
        };

        const rows = rawRows.map((raw) => {
            const mapped = {};
            for (const [key, value] of Object.entries(raw)) {
                const field = HEADER_ALIASES[normalizeKey(key)];
                if (field) mapped[field] = value;
            }
            return mapped;
        });

        const anyColumnRecognized = rows.some((r) => Object.keys(r).length > 0);
        if (!anyColumnRecognized) {
            return res.status(400).json({
                error:
                    "None of the column headers in this sheet were recognized. Please use the downloaded template's headers exactly (don't rename or remove them).",
            });
        }

        let created = 0;
        let updated = 0;
        const skipped = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;

            const firstName = String(row.firstName || "").trim();
            const lastName = String(row.lastName || "").trim();
            const email = String(row.email || "").trim().toLowerCase();
            const phone = String(row.phone || "").trim();
            const position = String(row.position || "").trim();
            const department = String(row.department || "").trim();
            const password = String(row.password || "").trim();
            const roleRaw = String(row.role || "").trim().toUpperCase();
            const bio = String(row.bio || "").trim();
            const joinDateRaw = row.joinDate;
            const basicSalary = Number(row.basicSalary) || 0;
            const allowances = Number(row.allowances) || 0;
            const deductions = Number(row.deductions) || 0;

            if (!firstName && !lastName && !email) {
                continue;
            }

            if (!firstName || !lastName || !email || !phone || !position || !department) {
                skipped.push({ row: rowNum, reason: "Missing required field(s) (Name, Email, Phone, Designation, or Department)" });
                continue;
            }

            const role = roleRaw === "ADMIN" ? "ADMIN" : "EMPLOYEE";

            let joinDate = new Date();
            if (joinDateRaw) {
                const parsed = new Date(joinDateRaw);
                if (!isNaN(parsed.getTime())) joinDate = parsed;
            }

            try {
                const existingEmployee = await Employee.findOne({ email });

                if (existingEmployee) {
                    await Employee.findByIdAndUpdate(existingEmployee._id, {
                        firstName,
                        lastName,
                        phone,
                        position,
                        department,
                        basicSalary,
                        allowances,
                        deductions,
                        joinDate,
                        bio,
                    });

                    const userUpdate = { email };
                    if (role) userUpdate.role = role;
                    if (password) userUpdate.password = await bcrypt.hash(password, 10);

                    await User.findByIdAndUpdate(existingEmployee.userId, userUpdate);
                    updated++;
                } else {
                    if (!password) {
                        skipped.push({ row: rowNum, reason: "Temporary Password required for new employee" });
                        continue;
                    }

                    const hashedPassword = await bcrypt.hash(password, 10);

                    const user = await User.create({
                        email,
                        password: hashedPassword,
                        role,
                    });

                    await Employee.create({
                        userId: user._id,
                        firstName,
                        lastName,
                        email,
                        phone,
                        position,
                        department,
                        basicSalary,
                        allowances,
                        deductions,
                        joinDate,
                        bio,
                        employmentStatus: "ACTIVE",
                    });

                    created++;
                }
            } catch (rowError) {
                console.error(`Bulk upload row ${rowNum} error:`, rowError);
                skipped.push({ row: rowNum, reason: "Failed to save (duplicate or invalid data)" });
            }
        }

        return res.json({
            success: true,
            created,
            updated,
            skipped,
        });
    } catch (error) {
        console.error("Bulk Upload Employees Error:", error);
        return res.status(500).json({
            error: "Failed to process the uploaded sheet",
        });
    }
};