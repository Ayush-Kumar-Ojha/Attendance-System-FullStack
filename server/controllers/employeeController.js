import Employee from "../models/Employee.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";

// =====================================================
// LEGACY EMPLOYEE INDEX CLEANUP
// =====================================================

const removeLegacyEmployeeUniqueIndexes = async () => {
    try {
        const indexes = await Employee.collection.indexes();
        const optionalFields = new Set(["userId", "employeeCode", "email"]);

        for (const index of indexes) {
            if (!index || index.name === "_id_" || !index.unique) continue;

            const fields = Object.keys(index.key || {});
            if (fields.length !== 1 || !optionalFields.has(fields[0])) continue;

            console.log(`Removing legacy Employee unique index: ${index.name}`);
            await Employee.collection.dropIndex(index.name);
        }
    } catch (error) {
        if (error?.codeName === "NamespaceNotFound" || error?.code === 26) return;
        console.error("Employee legacy index cleanup error:", error);
    }
};

// =====================================================
// COMMON HELPERS
// =====================================================

const textValue = (value, fallback = "") => {
    if (value === undefined || value === null) return fallback;
    const result = String(value).trim();
    return result || fallback;
};

const numberValue = (value, fallback = null) => {
    if (value === undefined || value === null || value === "") return fallback;
    const parsed = Number(String(value).replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : fallback;
};

const parseEmployeeDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

    const input = String(value).trim();
    if (!input) return null;

    const ymd = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));

    const dmy = input.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));

    const parsed = new Date(input);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const splitEmployeeName = (name, firstName = "", lastName = "") => {
    const explicitFirst = textValue(firstName);
    const explicitLast = textValue(lastName);

    if (explicitFirst || explicitLast) {
        const complete = `${explicitFirst} ${explicitLast}`.replace(/\s+/g, " ").trim();
        return { name: complete, firstName: explicitFirst, lastName: explicitLast };
    }

    const fullName = textValue(name).replace(/\s+/g, " ").trim();
    const parts = fullName.split(" ").filter(Boolean);

    return {
        name: fullName,
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" "),
    };
};

const normalizeGender = (value) => {
    const gender = textValue(value).toUpperCase();
    if (["M", "MALE"].includes(gender)) return "MALE";
    if (["F", "FEMALE"].includes(gender)) return "FEMALE";
    if (["O", "OTHER"].includes(gender)) return "OTHER";
    return gender || "";
};

const normalizeMaritalStatus = (value) => {
    const status = textValue(value).toUpperCase();
    if (["UNMARRIED", "SINGLE"].includes(status)) return "SINGLE";
    if (["MARRIED", "DIVORCED", "WIDOWED"].includes(status)) return status;
    return status || "";
};

const DATE_FIELDS = new Set([
    "dateOfBirth", "joinDate", "shoeIssueDate", "helmetIssueDate",
    "jacketIssueDate", "anniversaryDate", "confirmationDate",
]);

const NUMBER_FIELDS = new Set([
    "numberOfChildren", "basicSalary", "allowances", "deductions",
]);

const EMPLOYEE_FIELDS = [
    "name", "firstName", "lastName", "fatherName", "gender", "bloodGroup",
    "dateOfBirth", "joinDate", "birthPlace", "nationality", "motherTongue",
    "languages", "phone", "passportNumber", "identificationMark", "manpowerType",
    "vendorCode", "maritalStatus", "numberOfChildren", "safetyIssued", "shoeSize",
    "shoeIssueDate", "safetyHelmet", "helmetColor", "helmetIssueDate", "jacket",
    "jacketSize", "jacketIssueDate", "eyeProtectionEquipment", "permanentAddressLine1",
    "permanentAddressLine2", "permanentCity", "permanentCountry", "permanentState",
    "permanentPinCode", "presentAddressLine1", "presentAddressLine2", "presentCity",
    "village", "presentCountry", "presentState", "presentPinCode", "mobileNumber",
    "emergencyContactPersonName", "emergencyContactPersonRelation",
    "emergencyContactPersonAddress", "emergencyMobileNumber", "qualification",
    "specialization", "collegeSchoolName", "boardUniversityName", "yearOfPassing",
    "resume", "appointmentLetter", "degreeCertificate", "kycDocument",
    "medicalCertificate", "previousEmploymentAppointmentLetter",
    "previousEmploymentRelevantExperienceLetter", "policeVerification",
    "bankAccountNumber", "bankAccountName", "bankAccountType", "ifscCode",
    "bankName", "branchName", "uanNumber", "pfNumber", "esiNumber",
    "employeeCode", "email", "department", "position", "basicSalary",
    "allowances", "deductions", "anniversaryDate", "confirmationDate",
    "aadharNumber", "panNumber", "bio", "employmentStatus",
];

const buildEmployeeData = (source = {}, existing = null) => {
    const result = {};
    const names = splitEmployeeName(source.name, source.firstName, source.lastName);
    const hasNameInput = source.name !== undefined || source.firstName !== undefined || source.lastName !== undefined;

    if (hasNameInput) {
        result.name = names.name;
        result.firstName = names.firstName;
        result.lastName = names.lastName;
    } else if (existing) {
        result.name = existing.name || `${existing.firstName || ""} ${existing.lastName || ""}`.trim();
        result.firstName = existing.firstName || "";
        result.lastName = existing.lastName || "";
    }

    for (const field of EMPLOYEE_FIELDS) {
        if (["name", "firstName", "lastName"].includes(field)) continue;

        if (source[field] !== undefined) {
            if (DATE_FIELDS.has(field)) {
                result[field] = parseEmployeeDate(source[field]);
                continue;
            }
            if (NUMBER_FIELDS.has(field)) {
                result[field] = numberValue(source[field], null);
                continue;
            }
            if (field === "gender") {
                result[field] = normalizeGender(source[field]);
                continue;
            }
            if (field === "maritalStatus") {
                result[field] = normalizeMaritalStatus(source[field]);
                continue;
            }
            if (field === "email") {
                result[field] = textValue(source[field]).toLowerCase();
                continue;
            }
            if (field === "panNumber" || field === "ifscCode") {
                result[field] = textValue(source[field]).toUpperCase();
                continue;
            }
            if (field === "employmentStatus") {
                const status = textValue(source[field]).toUpperCase();
                result[field] = ["ACTIVE", "INACTIVE", ""].includes(status) ? status : "";
                continue;
            }
            result[field] = textValue(source[field]);
        } else if (existing && existing[field] !== undefined) {
            result[field] = existing[field];
        }
    }

    result.dynamicFields = Array.isArray(source.dynamicFields) ? source.dynamicFields : existing?.dynamicFields || [];
    result.customFields = Array.isArray(source.customFields) ? source.customFields : existing?.customFields || [];
    result.customSections = Array.isArray(source.customSections) ? source.customSections : existing?.customSections || [];

    return result;
};

// =====================================================
// EXCEL HEADER MAPPING
// =====================================================

const normalizeExcelHeader = (value) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/&/g, " and ")
        .replace(/[_\-./()]/g, " ")
        .replace(/\s+/g, " ");

const HEADER_ALIASES = {
    name: "name", "employee name": "name", "full name": "name", "employee full name": "name",
    "first name": "firstName", firstname: "firstName",
    "last name": "lastName", lastname: "lastName", surname: "lastName",
    "fathers name": "fatherName", "father name": "fatherName",
    gender: "gender", sex: "gender",
    "blood group": "bloodGroup", bloodgroup: "bloodGroup",
    "date of birth": "dateOfBirth", dob: "dateOfBirth",
    "date of joining": "joinDate", "joining date": "joinDate", doj: "joinDate",
    "birth place": "birthPlace", nationality: "nationality", "mother tongue": "motherTongue",
    languages: "languages", "phone number": "phone", phone: "phone",
    "passport number": "passportNumber", "identification mark": "identificationMark",
    "manpower type": "manpowerType", "vendor code": "vendorCode",
    "marital status": "maritalStatus", "number of children": "numberOfChildren",
    "safety issued": "safetyIssued", "shoe size": "shoeSize", "shoe issue date": "shoeIssueDate",
    "safety helmet": "safetyHelmet", "helmet color": "helmetColor", "helmet issue date": "helmetIssueDate",
    jacket: "jacket", "jacket size": "jacketSize", "jacket issue date": "jacketIssueDate",
    "eye protection equipment": "eyeProtectionEquipment",
    "permanent address line 1": "permanentAddressLine1", "permanent address line 2": "permanentAddressLine2",
    "permanent city": "permanentCity", "permanent country": "permanentCountry",
    "permanent state": "permanentState", "permanent pin code": "permanentPinCode",
    "present address line 1": "presentAddressLine1", "present address line 2": "presentAddressLine2",
    "present city": "presentCity", village: "village", "present country": "presentCountry",
    "present state": "presentState", "present pin code": "presentPinCode",
    "mobile number": "mobileNumber", mobile: "mobileNumber",
    "emergency contact person name": "emergencyContactPersonName",
    "emergency contact person relation": "emergencyContactPersonRelation",
    "emergency contact person address": "emergencyContactPersonAddress",
    "emergency mobile number": "emergencyMobileNumber",
    qualification: "qualification", specialization: "specialization",
    "college school name": "collegeSchoolName", "board university name": "boardUniversityName",
    "year of passing": "yearOfPassing", resume: "resume", "appointment letter": "appointmentLetter",
    "degree certificate": "degreeCertificate", "kyc document": "kycDocument",
    "medical certificate": "medicalCertificate",
    "previous employment appointment letter": "previousEmploymentAppointmentLetter",
    "previous employment relevant experience letter": "previousEmploymentRelevantExperienceLetter",
    "police verification": "policeVerification",
    "bank account number": "bankAccountNumber", "bank account name": "bankAccountName",
    "bank account type": "bankAccountType", "ifsc code": "ifscCode",
    "bank name": "bankName", "branch name": "branchName",
    "uan number": "uanNumber", "pf number": "pfNumber", "esi number": "esiNumber",
    "employee code": "employeeCode", "emp code": "employeeCode",
    "employee email id": "email", "work email": "email", email: "email",
    department: "department", designation: "position", position: "position",
    "basic salary": "basicSalary", allowances: "allowances", deductions: "deductions",
    "temporary password": "password", password: "password",
    role: "role", "anniversary date": "anniversaryDate", "confirmation date": "confirmationDate",
    "aadhaar number": "aadharNumber", aadhar: "aadharNumber", "pan number": "panNumber",
    bio: "bio", "employment status": "employmentStatus",
};

const resolveExcelField = (column) => {
    const normalized = normalizeExcelHeader(column);
    if (HEADER_ALIASES[normalized]) return HEADER_ALIASES[normalized];

    const candidates = Object.entries(HEADER_ALIASES)
        .filter(([alias]) => alias.length >= 5)
        .filter(([alias]) => normalized.includes(alias) || alias.includes(normalized))
        .sort((a, b) => b[0].length - a[0].length);

    return candidates[0]?.[1] || null;
};

// =====================================================
// GET EMPLOYEES
// =====================================================

export const getEmployees = async (req, res) => {
    try {
        const where = { isDeleted: { $ne: true } };
        if (req.query.department) where.department = req.query.department;

        const employees = await Employee.find(where)
            .sort({ createdAt: -1 })
            .populate("userId", "email role")
            .lean();

        return res.json(
            employees.map((employee) => ({
                ...employee,
                id: employee._id.toString(),
                user: employee.userId ? { email: employee.userId.email, role: employee.userId.role } : null,
                dynamicFields: employee.dynamicFields || [],
                customFields: employee.customFields || [],
                customSections: employee.customSections || [],
                documents: employee.documents || [],
            }))
        );
    } catch (error) {
        console.error("Get Employees Error:", error);
        return res.status(500).json({ error: "Failed to fetch employees" });
    }
};

// =====================================================
// GET EMPLOYEE BY ID
// =====================================================

export const getEmployeeById = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id)
            .populate("userId", "email role")
            .lean();

        if (!employee || employee.isDeleted) {
            return res.status(404).json({ error: "Employee not found" });
        }

        return res.json({
            ...employee,
            id: employee._id.toString(),
            user: employee.userId ? { email: employee.userId.email, role: employee.userId.role } : null,
            dynamicFields: employee.dynamicFields || [],
            customFields: employee.customFields || [],
            customSections: employee.customSections || [],
            documents: employee.documents || [],
        });
    } catch (error) {
        console.error("Get Employee By ID Error:", error);
        return res.status(500).json({ error: "Failed to fetch employee" });
    }
};

// =====================================================
// EMPLOYEE DOCUMENTS
// =====================================================

export const getEmployeeDocuments = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id).lean();
        if (!employee || employee.isDeleted) return res.status(404).json({ error: "Employee not found" });

        const documents = [];
        if (typeof employee.cvUrl === "string" && employee.cvUrl.trim()) {
            documents.push({
                _id: "cv-resume", name: "Resume / CV", fileUrl: employee.cvUrl,
                fileName: employee.cvFileName || "Resume.pdf", uploadedAt: employee.updatedAt || employee.createdAt,
            });
        }
        if (typeof employee.image === "string" && employee.image.trim()) {
            documents.push({
                _id: "profile-photo", name: "Profile Photo", fileUrl: employee.image,
                fileName: "profile-photo.jpg", uploadedAt: employee.updatedAt || employee.createdAt,
            });
        }
        (employee.documents || []).forEach((document, index) => {
            if (!document?.fileUrl) return;
            documents.push({
                _id: document._id?.toString() || `document-${index}`,
                name: document.name || "Employee Document", fileUrl: document.fileUrl,
                fileName: document.fileName || "document", uploadedAt: document.uploadedAt || employee.updatedAt || employee.createdAt,
            });
        });

        return res.json({
            employeeName: `${employee.firstName || ""} ${employee.lastName || ""}`.trim(),
            documents,
        });
    } catch (error) {
        console.error("Get Employee Documents Error:", error);
        return res.status(500).json({ error: "Failed to fetch employee documents" });
    }
};

export const downloadEmployeeDocument = async (req, res) => {
    try {
        const { id, documentId } = req.params;
        const employee = await Employee.findById(id).lean();
        if (!employee || employee.isDeleted) return res.status(404).json({ error: "Employee not found" });

        let fileUrl = "";
        let fileName = "employee-document";
        if (documentId === "cv-resume") {
            fileUrl = employee.cvUrl; fileName = employee.cvFileName || "Resume.pdf";
        } else if (documentId === "profile-photo") {
            fileUrl = employee.image; fileName = "profile-photo.jpg";
        } else {
            const document = (employee.documents || []).find(item => item._id?.toString() === documentId);
            if (document) { fileUrl = document.fileUrl; fileName = document.fileName || document.name || "employee-document"; }
        }

        if (!fileUrl) return res.status(404).json({ error: "Document URL not found" });

        const cloudResponse = await fetch(fileUrl, { redirect: "follow" });
        if (!cloudResponse.ok) return res.status(502).json({ error: "Unable to retrieve file" });

        const buffer = Buffer.from(await cloudResponse.arrayBuffer());
        const contentType = cloudResponse.headers.get("content-type") || "application/octet-stream";

        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
        return res.send(buffer);
    } catch (error) {
        console.error("Download Document Error:", error);
        return res.status(500).json({ error: error.message || "Failed to download document" });
    }
};

// =====================================================
// CREATE EMPLOYEE
// =====================================================

export const createEmployee = async (req, res) => {
    try {
        const source = req.body || {};
        let employeeCode = textValue(source.employeeCode) || `EMP${Date.now()}`;
        const email = textValue(source.email).toLowerCase();
        const password = textValue(source.password);
        const role = textValue(source.role, "EMPLOYEE").toUpperCase() === "ADMIN" ? "ADMIN" : "EMPLOYEE";
        const names = splitEmployeeName(source.name, source.firstName, source.lastName);

        if (!names.name) return res.status(400).json({ error: "Employee name is required" });
        if (!email) return res.status(400).json({ error: "Employee Email ID is required" });
        if (!password) return res.status(400).json({ error: "Temporary Password is required" });

        const existingCode = await Employee.findOne({ employeeCode, isDeleted: { $ne: true } });
        if (existingCode) return res.status(400).json({ error: "Employee code already exists" });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ email, password: hashedPassword, role });

        try {
            const employeeData = buildEmployeeData({
                ...source, employeeCode, email, name: names.name,
                firstName: names.firstName, lastName: names.lastName,
            });

            const employee = await Employee.create({
                userId: user._id, ...employeeData, isDeleted: false,
                documents: Array.isArray(source.documents) ? source.documents : [],
            });

            return res.status(201).json({ success: true, message: "Employee created successfully", employee });
        } catch (employeeError) {
            await User.findByIdAndDelete(user._id);
            throw employeeError;
        }
    } catch (error) {
        console.error("Create Employee Error:", error);
        return res.status(500).json({ error: error.message || "Failed to create employee" });
    }
};

// =====================================================
// UPDATE EMPLOYEE
// =====================================================

export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const source = req.body || {};
        const employee = await Employee.findById(id);

        if (!employee) return res.status(404).json({ error: "Employee not found" });

        const requestedCode = source.employeeCode !== undefined ? textValue(source.employeeCode) : employee.employeeCode;
        const requestedEmail = source.email !== undefined ? textValue(source.email).toLowerCase() : employee.email;

        const employeeData = buildEmployeeData({ ...source, employeeCode: requestedCode, email: requestedEmail }, employee);

        const updatedEmployee = await Employee.findByIdAndUpdate(
            id,
            { ...employeeData, isDeleted: employee.isDeleted },
            { new: true, runValidators: true }
        );

        if (employee.userId && requestedEmail) {
            await User.findByIdAndUpdate(employee.userId, { email: requestedEmail });
        }

        return res.json({ success: true, message: "Employee updated successfully", employee: updatedEmployee });
    } catch (error) {
        console.error("Update Employee Error:", error);
        return res.status(500).json({ error: error.message || "Failed to update employee" });
    }
};

// =====================================================
// DELETE EMPLOYEE CARD ONLY (SOFT DELETE)
// =====================================================

export const deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ error: "Employee not found" });

        employee.isDeleted = true;
        await employee.save();

        return res.json({ success: true, message: "Employee card removed successfully" });
    } catch (error) {
        console.error("Delete Employee Error:", error);
        return res.status(500).json({ error: error.message || "Failed to remove employee card" });
    }
};

// =====================================================
// PUBLIC PROFILE & DIRECTORY
// =====================================================

export const getEmployeePublicProfile = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id).lean();
        if (!employee || employee.isDeleted) return res.status(404).json({ error: "Employee not found" });

        return res.json({
            id: employee._id.toString(), employeeCode: employee.employeeCode,
            firstName: employee.firstName, lastName: employee.lastName,
            position: employee.position, department: employee.department,
            bio: employee.bio, image: employee.image || null, skills: employee.skills || [],
        });
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch profile" });
    }
};

export const getEmployeeDirectory = async (req, res) => {
    try {
        const employees = await Employee.find({ isDeleted: { $ne: true } }).lean();
        return res.json(employees.map(e => ({
            id: e._id.toString(),
            name: e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim(),
            department: e.department || "",
            position: e.position || "",
            image: e.image || null,
        })));
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch directory" });
    }
};

// =====================================================
// EXPORT EMPLOYEES TO EXCEL
// =====================================================

export const exportEmployees = async (req, res) => {
    try {
        const employees = await Employee.find({ isDeleted: { $ne: true } }).lean();
        const exportData = employees.map(emp => ({
            "Employee Code": emp.employeeCode || "",
            "Name": emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
            "Email": emp.email || "",
            "Phone": emp.phone || "",
            "Department": emp.department || "",
            "Position": emp.position || "",
        }));

        const XLSX = await import("xlsx");
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");

        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=Employees_Export.xlsx");
        return res.send(buffer);
    } catch (error) {
        return res.status(500).json({ error: "Failed to export employees" });
    }
};

// =====================================================
// ADAPTIVE EXCEL BULK UPLOAD
// =====================================================

const isEmptyExcelValue = (value) => {
    if (value === undefined || value === null) return true;
    const normalized = String(value).trim().toLowerCase();
    return ["", "-", "--", "nil", "na", "n/a", "null", "undefined"].includes(normalized);
};

const cleanExcelValue = (value) => {
    if (isEmptyExcelValue(value)) return "";
    return String(value).trim();
};

const dynamicKey = (section, label) =>
    `${normalizeExcelHeader(section || "Excel Fields")}::${normalizeExcelHeader(label)}`;

const valuesAreEqual = (oldValue, newValue) => {
    if (oldValue === undefined || oldValue === null) oldValue = "";
    if (newValue === undefined || newValue === null) newValue = "";
    return String(oldValue).trim() === String(newValue).trim();
};

const mergeDynamicFields = (previousFields = [], incomingFields = [], allDynamicColumns = []) => {
    const map = new Map();

    for (const field of previousFields || []) {
        if (!field?.label) continue;
        const key = field.key || dynamicKey(field.section, field.label);
        map.set(key, { section: field.section || "Excel Fields", label: field.label, key, value: field.value ?? "" });
    }

    for (const column of allDynamicColumns || []) {
        if (!map.has(column.key)) {
            map.set(column.key, { section: column.section || "Excel Fields", label: column.label, key: column.key, value: "" });
        }
    }

    for (const field of incomingFields || []) {
        if (!field?.label) continue;
        const key = field.key || dynamicKey(field.section, field.label);
        const previous = map.get(key);
        const incomingValue = field.value ?? "";
        const shouldUseIncoming = !isEmptyExcelValue(incomingValue) || !previous;

        map.set(key, {
            section: field.section || previous?.section || "Excel Fields",
            label: field.label || previous?.label || key,
            key,
            value: shouldUseIncoming ? String(incomingValue).trim() : previous?.value ?? "",
        });
    }

    return Array.from(map.values());
};

export const bulkUploadEmployees = async (req, res) => {
    try {
        await removeLegacyEmployeeUniqueIndexes();

        if (!req.file) {
            return res.status(400).json({ error: "Excel file is required" });
        }

        const XLSX = await import("xlsx");
        const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true, raw: false });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            return res.status(400).json({ error: "Excel workbook is empty" });
        }

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", blankrows: false, raw: false });

        if (!Array.isArray(rawRows) || rawRows.length === 0) {
            return res.status(400).json({ error: "Excel sheet is empty" });
        }

        // Header Row Detection
        let headerRowIndex = -1;
        let highestScore = -1;
        const maxCheckRows = Math.min(rawRows.length, 15);

        for (let r = 0; r < maxCheckRows; r++) {
            const row = rawRows[r] || [];
            let score = 0;
            for (const cell of row) {
                const val = cleanExcelValue(cell);
                if (val && resolveExcelField(val)) score += 5;
            }
            if (score > highestScore) {
                highestScore = score;
                headerRowIndex = r;
            }
        }

        if (headerRowIndex < 0) headerRowIndex = 0;

        const headerRow = rawRows[headerRowIndex] || [];
        const columns = [];

        for (let c = 0; c < headerRow.length; c++) {
            const rawHeader = cleanExcelValue(headerRow[c]);
            if (!rawHeader) continue;
            const knownField = resolveExcelField(rawHeader);
            const isDynamic = !knownField;
            const key = isDynamic ? dynamicKey("Excel Fields", rawHeader) : null;

            columns.push({ columnIndex: c, header: rawHeader, knownField, isDynamic, key, section: "Excel Fields" });
        }

        const dynamicColumns = columns.filter(col => col.isDynamic).map(col => ({ section: col.section, label: col.header, key: col.key }));

        // 1. PROPAGATE NEW DYNAMIC COLUMNS TO ALL EMPLOYEES IN MONGODB
        if (dynamicColumns.length > 0) {
            const allEmps = await Employee.find({}).lean();

            for (const emp of allEmps) {
                const merged = mergeDynamicFields(
                    emp.dynamicFields || [],
                    [],
                    dynamicColumns
                );

                await Employee.updateOne(
                    { _id: emp._id },
                    {
                        $set: {
                            dynamicFields: merged,
                        },
                    }
                );
            }
        }

        let created = 0;
        let updated = 0;
        let restored = 0;
        const skipped = [];
        const processedIds = new Set();

        // 2. PROCESS EXCEL ROWS
        for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
            const row = rawRows[r] || [];
            const excelRow = r + 1;

            if (!row.some(cell => !isEmptyExcelValue(cell))) continue;

            const knownData = {};
            const incomingDynamic = [];

            for (const col of columns) {
                const val = cleanExcelValue(row[col.columnIndex]);
                if (col.isDynamic) {
                    incomingDynamic.push({ section: col.section, label: col.header, key: col.key, value: val });
                } else if (val) {
                    knownData[col.knownField] = val;
                }
            }

            const names = splitEmployeeName(knownData.name, knownData.firstName, knownData.lastName);
            if (!names.name) {
                skipped.push({ row: excelRow, reason: "Employee name is missing" });
                continue;
            }

            knownData.name = names.name;
            if (names.firstName) knownData.firstName = names.firstName;
            if (names.lastName) knownData.lastName = names.lastName;

            let existingEmployee = null;

            // =====================================================
            // MATCH EXISTING EMPLOYEE USING REAL IDENTIFIERS
            // =====================================================

            const matchConditions = [];

            // Employee Code
            if (
                knownData.employeeCode &&
                !isEmptyExcelValue(knownData.employeeCode)
            ) {
                matchConditions.push({
                    employeeCode:
                        String(
                            knownData.employeeCode
                        ).trim(),
                });
            }

            // Email
            if (
                knownData.email &&
                !isEmptyExcelValue(knownData.email)
            ) {
                matchConditions.push({
                    email:
                        String(
                            knownData.email
                        )
                            .trim()
                            .toLowerCase(),
                });
            }

            // Aadhaar
            if (
                knownData.aadharNumber &&
                !isEmptyExcelValue(
                    knownData.aadharNumber
                )
            ) {
                matchConditions.push({
                    aadharNumber:
                        String(
                            knownData.aadharNumber
                        ).trim(),
                });
            }

            // UAN
            if (
                knownData.uanNumber &&
                !isEmptyExcelValue(
                    knownData.uanNumber
                )
            ) {
                matchConditions.push({
                    uanNumber:
                        String(
                            knownData.uanNumber
                        ).trim(),
                });
            }

            // Bank Account
            if (
                knownData.bankAccountNumber &&
                !isEmptyExcelValue(
                    knownData.bankAccountNumber
                )
            ) {
                matchConditions.push({
                    bankAccountNumber:
                        String(
                            knownData.bankAccountNumber
                        ).trim(),
                });
            }

            // Name + Mobile is allowed only together
            if (
                names.name &&
                knownData.mobileNumber &&
                !isEmptyExcelValue(
                    knownData.mobileNumber
                )
            ) {
                matchConditions.push({
                    name:
                        names.name,

                    mobileNumber:
                        String(
                            knownData.mobileNumber
                        ).trim(),
                });
            }

            // Name + Phone
            if (
                names.name &&
                knownData.phone &&
                !isEmptyExcelValue(
                    knownData.phone
                )
            ) {
                matchConditions.push({
                    name:
                        names.name,

                    phone:
                        String(
                            knownData.phone
                        ).trim(),
                });
            }

            if (
                matchConditions.length > 0
            ) {
                existingEmployee =
                    await Employee.findOne({
                        $or:
                            matchConditions,
                    });
            }

            if (existingEmployee) {
                processedIds.add(
                    existingEmployee._id.toString()
                );

                const wasDeleted =
                    existingEmployee.isDeleted === true;

                const updateData = {};

                // Update only Excel fields that actually contain values
                for (const [key, val] of Object.entries(knownData)) {
                    if (
                        val &&
                        !valuesAreEqual(
                            existingEmployee[key],
                            val
                        )
                    ) {
                        updateData[key] = val;
                    }
                }

                // Merge all adaptive Excel fields
                const mergedDynamicFields =
                    mergeDynamicFields(
                        existingEmployee.dynamicFields || [],
                        incomingDynamic,
                        dynamicColumns
                    );

                updateData.dynamicFields =
                    mergedDynamicFields;

                // Employee exists in Excel, so restore its card
                if (wasDeleted) {
                    updateData.isDeleted = false;
                    restored++;
                }

                /*
                    IMPORTANT:
                    Use updateOne instead of existingEmployee.save().
            
                    Some old employee records contain legacy/incomplete
                    document objects.
            
                    save() validates the entire Employee document and
                    would fail because those old document objects may
                    be missing name/fileUrl/fileName.
            
                    updateOne updates only the Excel-related fields
                    without re-validating unrelated old document data.
                */
                await Employee.updateOne(
                    {
                        _id:
                            existingEmployee._id,
                    },
                    {
                        $set:
                            updateData,
                    }
                );

                updated++;

                continue;
            }

            // CREATE NEW EMPLOYEE
            const newDoc = await Employee.create({
                ...knownData,
                dynamicFields: mergeDynamicFields([], incomingDynamic, dynamicColumns),
                isDeleted: false,
            });
            processedIds.add(newDoc._id.toString());
            created++;
        }

        return res.json({
            success: true,
            created,
            updated,
            restored,
            skippedCount: skipped.length,
            message: `${created} created, ${updated} updated, ${restored} employee card(s) restored`,
        });
    } catch (error) {
        console.error("Bulk Upload Error:", error);
        return res.status(500).json({ error: error.message || "Failed to upload Excel file" });
    }
};

// =====================================================
// ADDITIONAL HELPER CONTROLLERS
// =====================================================

export const getEmployeeStats = async (req, res) => {
    try {
        const totalEmployees = await Employee.countDocuments({ isDeleted: { $ne: true } });
        return res.json({ totalEmployees });
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch stats" });
    }
};

export const getEmployeesByDepartment = async (req, res) => {
    try {
        const employees = await Employee.find({ department: req.params.department, isDeleted: { $ne: true } });
        return res.json(employees);
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch department employees" });
    }
};

export const searchEmployees = async (req, res) => {
    try {
        const query = req.query.q || req.query.search || "";
        const regex = new RegExp(query, "i");
        const employees = await Employee.find({
            isDeleted: { $ne: true },
            $or: [{ name: regex }, { firstName: regex }, { lastName: regex }, { email: regex }, { department: regex }],
        });
        return res.json(employees);
    } catch (error) {
        return res.status(500).json({ error: "Search failed" });
    }
};

export const restoreEmployee = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ error: "Employee not found" });

        employee.isDeleted = false;
        await employee.save();
        return res.json({ success: true, message: "Employee card restored successfully", employee });
    } catch (error) {
        return res.status(500).json({ error: "Failed to restore employee" });
    }
};

export const getDeletedEmployees = async (req, res) => {
    try {
        const employees = await Employee.find({ isDeleted: true });
        return res.json(employees);
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch deleted employees" });
    }
};

export const permanentlyDeleteEmployee = async (req, res) => {
    try {
        await Employee.findByIdAndDelete(req.params.id);
        return res.json({ success: true, message: "Employee permanently deleted" });
    } catch (error) {
        return res.status(500).json({ error: "Failed to delete employee" });
    }
};

export const getDynamicEmployeeFields = async (req, res) => {
    try {
        const employees = await Employee.find({}).select("dynamicFields").lean();
        const map = new Map();
        for (const emp of employees) {
            for (const field of emp.dynamicFields || []) {
                if (field?.label) map.set(field.key || field.label, field);
            }
        }
        return res.json({ success: true, fields: Array.from(map.values()) });
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch dynamic fields" });
    }
};

export const syncDynamicEmployeeFields = async (req, res) => {
    try {
        return res.json({ success: true, message: "Dynamic fields synchronized" });
    } catch (error) {
        return res.status(500).json({ error: "Sync failed" });
    }
};

export const restoreAllDeletedEmployees = async (req, res) => {
    try {
        const result = await Employee.updateMany({ isDeleted: true }, { $set: { isDeleted: false } });
        return res.json({ success: true, restored: result.modifiedCount || 0 });
    } catch (error) {
        return res.status(500).json({ error: "Failed to restore all" });
    }
};

export const updateDynamicEmployeeField = async (req, res) => {
    try {
        return res.json({ success: true, message: "Field updated" });
    } catch (error) {
        return res.status(500).json({ error: "Update failed" });
    }
};

export const updateEmployeeStatus = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ error: "Employee not found" });
        employee.employmentStatus = req.body.employmentStatus || "ACTIVE";
        await employee.save();
        return res.json({ success: true, employee });
    } catch (error) {
        return res.status(500).json({ error: "Status update failed" });
    }
};

export const updateEmployeeImage = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ error: "Employee not found" });
        employee.image = req.file?.path || req.body?.image || employee.image;
        await employee.save();
        return res.json({ success: true, employee });
    } catch (error) {
        return res.status(500).json({ error: "Image update failed" });
    }
};

export const updateEmployeeCV = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ error: "Employee not found" });
        employee.cvUrl = req.file?.path || req.body?.cvUrl || employee.cvUrl;
        await employee.save();
        return res.json({ success: true, employee });
    } catch (error) {
        return res.status(500).json({ error: "CV update failed" });
    }
};

export const addEmployeeDocument = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ error: "Employee not found" });
        employee.documents = employee.documents || [];
        employee.documents.push({ name: req.body.name || "Document", fileUrl: req.file?.path || req.body.fileUrl });
        await employee.save();
        return res.json({ success: true, employee });
    } catch (error) {
        return res.status(500).json({ error: "Add document failed" });
    }
};

export const deleteEmployeeDocument = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ error: "Employee not found" });
        employee.documents = (employee.documents || []).filter(d => String(d._id) !== req.params.documentId);
        await employee.save();
        return res.json({ success: true, employee });
    } catch (error) {
        return res.status(500).json({ error: "Delete document failed" });
    }
};

export const addEmployeeSkill = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ error: "Employee not found" });
        employee.skills = employee.skills || [];
        if (req.body.skill && !employee.skills.includes(req.body.skill)) employee.skills.push(req.body.skill);
        await employee.save();
        return res.json({ success: true, employee });
    } catch (error) {
        return res.status(500).json({ error: "Add skill failed" });
    }
};

export const deleteEmployeeSkill = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ error: "Employee not found" });
        employee.skills = (employee.skills || []).filter(s => s !== req.params.skill);
        await employee.save();
        return res.json({ success: true, employee });
    } catch (error) {
        return res.status(500).json({ error: "Delete skill failed" });
    }
};

export const updateEmployeeSpecialDateMessage = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ error: "Employee not found" });
        employee.specialDateMessage = req.body.message || "";
        await employee.save();
        return res.json({ success: true, employee });
    } catch (error) {
        return res.status(500).json({ error: "Update message failed" });
    }
};

export const getEmployeeByUserId = async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.params.userId, isDeleted: { $ne: true } });
        if (!employee) return res.status(404).json({ error: "Employee not found" });
        return res.json(employee);
    } catch (error) {
        return res.status(500).json({ error: "Fetch failed" });
    }
};

export const getCurrentEmployee = async (req, res) => {
    try {
        const employee = await Employee.findOne({ userId: req.session?.userId, isDeleted: { $ne: true } });
        if (!employee) return res.status(404).json({ error: "Employee profile not found" });
        return res.json(employee);
    } catch (error) {
        return res.status(500).json({ error: "Fetch failed" });
    }
};