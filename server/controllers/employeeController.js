import Employee from "../models/Employee.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";

// =====================================================
// LEGACY EMPLOYEE INDEX CLEANUP
// =====================================================

const removeLegacyEmployeeUniqueIndexes = async () => {
    try {
        const indexes = await Employee.collection.indexes();

        const optionalFields = new Set([
            "userId",
            "employeeCode",
            "email",
        ]);

        for (const index of indexes) {
            if (
                !index ||
                index.name === "_id_" ||
                !index.unique
            ) {
                continue;
            }

            const fields = Object.keys(index.key || {});

            if (
                fields.length !== 1 ||
                !optionalFields.has(fields[0])
            ) {
                continue;
            }

            console.log(
                `Removing legacy Employee unique index: ${index.name}`
            );

            await Employee.collection.dropIndex(index.name);
        }
    } catch (error) {
        if (
            error?.codeName === "NamespaceNotFound" ||
            error?.code === 26
        ) {
            return;
        }

        console.error(
            "Employee legacy index cleanup error:",
            error
        );
    }
};

// =====================================================
// COMMON HELPERS
// =====================================================

const textValue = (value, fallback = "") => {
    if (value === undefined || value === null) {
        return fallback;
    }

    const result = String(value).trim();

    return result || fallback;
};

const numberValue = (value, fallback = null) => {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return fallback;
    }

    const parsed = Number(
        String(value)
            .replace(/,/g, "")
            .trim()
    );

    return Number.isFinite(parsed)
        ? parsed
        : fallback;
};

const parseEmployeeDate = (value) => {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime())
            ? null
            : value;
    }

    const input = String(value).trim();

    if (!input) {
        return null;
    }

    const ymd = input.match(
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    );

    if (ymd) {
        return new Date(
            Number(ymd[1]),
            Number(ymd[2]) - 1,
            Number(ymd[3])
        );
    }

    const dmy = input.match(
        /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/
    );

    if (dmy) {
        return new Date(
            Number(dmy[3]),
            Number(dmy[2]) - 1,
            Number(dmy[1])
        );
    }

    const parsed = new Date(input);

    return Number.isNaN(parsed.getTime())
        ? null
        : parsed;
};

const splitEmployeeName = (
    name,
    firstName = "",
    lastName = ""
) => {
    const explicitFirst = textValue(firstName);
    const explicitLast = textValue(lastName);

    if (explicitFirst || explicitLast) {
        const complete =
            `${explicitFirst} ${explicitLast}`
                .replace(/\s+/g, " ")
                .trim();

        return {
            name: complete,
            firstName: explicitFirst,
            lastName: explicitLast,
        };
    }

    const fullName = textValue(name)
        .replace(/\s+/g, " ")
        .trim();

    const parts = fullName
        .split(" ")
        .filter(Boolean);

    return {
        name: fullName,
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" "),
    };
};

const normalizeGender = (value) => {
    const gender = textValue(value).toUpperCase();

    if (["M", "MALE"].includes(gender)) {
        return "MALE";
    }

    if (["F", "FEMALE"].includes(gender)) {
        return "FEMALE";
    }

    if (["O", "OTHER"].includes(gender)) {
        return "OTHER";
    }

    return gender || "";
};

const normalizeMaritalStatus = (value) => {
    const status = textValue(value).toUpperCase();

    if (
        ["UNMARRIED", "SINGLE"].includes(status)
    ) {
        return "SINGLE";
    }

    if (
        ["MARRIED", "DIVORCED", "WIDOWED"].includes(
            status
        )
    ) {
        return status;
    }

    return status || "";
};

// =====================================================
// EMPLOYEE FIELDS
// =====================================================

const DATE_FIELDS = new Set([
    "dateOfBirth",
    "joinDate",
    "shoeIssueDate",
    "helmetIssueDate",
    "jacketIssueDate",
    "anniversaryDate",
    "confirmationDate",
]);

const NUMBER_FIELDS = new Set([
    "numberOfChildren",
    "basicSalary",
    "allowances",
    "deductions",
]);

const EMPLOYEE_FIELDS = [
    "name",
    "firstName",
    "lastName",
    "fatherName",
    "gender",
    "bloodGroup",
    "dateOfBirth",
    "joinDate",
    "birthPlace",
    "nationality",
    "motherTongue",
    "languages",
    "phone",
    "passportNumber",
    "identificationMark",
    "manpowerType",
    "vendorCode",
    "maritalStatus",
    "numberOfChildren",

    "safetyIssued",
    "shoeSize",
    "shoeIssueDate",
    "safetyHelmet",
    "helmetColor",
    "helmetIssueDate",
    "jacket",
    "jacketSize",
    "jacketIssueDate",
    "eyeProtectionEquipment",

    "permanentAddressLine1",
    "permanentAddressLine2",
    "permanentCity",
    "permanentCountry",
    "permanentState",
    "permanentPinCode",

    "presentAddressLine1",
    "presentAddressLine2",
    "presentCity",
    "village",
    "presentCountry",
    "presentState",
    "presentPinCode",

    "mobileNumber",

    "emergencyContactPersonName",
    "emergencyContactPersonRelation",
    "emergencyContactPersonAddress",
    "emergencyMobileNumber",

    "qualification",
    "specialization",
    "collegeSchoolName",
    "boardUniversityName",
    "yearOfPassing",

    "resume",
    "appointmentLetter",
    "degreeCertificate",
    "kycDocument",
    "medicalCertificate",
    "previousEmploymentAppointmentLetter",
    "previousEmploymentRelevantExperienceLetter",
    "policeVerification",

    "bankAccountNumber",
    "bankAccountName",
    "bankAccountType",
    "ifscCode",
    "bankName",
    "branchName",
    "uanNumber",
    "pfNumber",
    "esiNumber",

    "employeeCode",
    "email",
    "department",
    "position",

    "basicSalary",
    "allowances",
    "deductions",

    "anniversaryDate",
    "confirmationDate",

    "aadharNumber",
    "panNumber",

    "bio",
    "employmentStatus",
];

// =====================================================
// BUILD EMPLOYEE DATA
// =====================================================

const buildEmployeeData = (
    source = {},
    existing = null
) => {
    const result = {};

    const names = splitEmployeeName(
        source.name,
        source.firstName,
        source.lastName
    );

    const hasNameInput =
        source.name !== undefined ||
        source.firstName !== undefined ||
        source.lastName !== undefined;

    if (hasNameInput) {
        result.name = names.name;
        result.firstName = names.firstName;
        result.lastName = names.lastName;
    } else if (existing) {
        result.name =
            existing.name ||
            `${existing.firstName || ""} ${
                existing.lastName || ""
            }`.trim();

        result.firstName =
            existing.firstName || "";

        result.lastName =
            existing.lastName || "";
    }

    for (const field of EMPLOYEE_FIELDS) {
        if (
            ["name", "firstName", "lastName"].includes(
                field
            )
        ) {
            continue;
        }

        if (source[field] !== undefined) {
            if (DATE_FIELDS.has(field)) {
                result[field] = parseEmployeeDate(
                    source[field]
                );
                continue;
            }

            if (NUMBER_FIELDS.has(field)) {
                result[field] = numberValue(
                    source[field],
                    null
                );
                continue;
            }

            if (field === "gender") {
                result[field] = normalizeGender(
                    source[field]
                );
                continue;
            }

            if (field === "maritalStatus") {
                result[field] =
                    normalizeMaritalStatus(
                        source[field]
                    );
                continue;
            }

            if (field === "email") {
                result[field] = textValue(
                    source[field]
                ).toLowerCase();
                continue;
            }

            if (
                field === "panNumber" ||
                field === "ifscCode"
            ) {
                result[field] = textValue(
                    source[field]
                ).toUpperCase();
                continue;
            }

            if (field === "employmentStatus") {
                const status = textValue(
                    source[field]
                ).toUpperCase();

                result[field] = [
                    "ACTIVE",
                    "INACTIVE",
                    "",
                ].includes(status)
                    ? status
                    : "";

                continue;
            }

            result[field] = textValue(source[field]);
        } else if (
            existing &&
            existing[field] !== undefined
        ) {
            result[field] = existing[field];
        }
    }

    result.dynamicFields = Array.isArray(
        source.dynamicFields
    )
        ? source.dynamicFields
        : existing?.dynamicFields || [];

    result.customFields = Array.isArray(
        source.customFields
    )
        ? source.customFields
        : existing?.customFields || [];

    result.customSections = Array.isArray(
        source.customSections
    )
        ? source.customSections
        : existing?.customSections || [];

    return result;
};

// =====================================================
// EXCEL HELPERS
// =====================================================

const normalizeExcelHeader = (value) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/&/g, " and ")
        .replace(/[_\-./()]/g, " ")
        .replace(/[*:#?]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const HEADER_ALIASES = {
    name: "name",
    "employee name": "name",
    "full name": "name",
    "employee full name": "name",

    "first name": "firstName",
    firstname: "firstName",

    "last name": "lastName",
    lastname: "lastName",
    surname: "lastName",

    "fathers name": "fatherName",
    "father name": "fatherName",

    gender: "gender",
    sex: "gender",

    "blood group": "bloodGroup",
    bloodgroup: "bloodGroup",

    "date of birth": "dateOfBirth",
    dob: "dateOfBirth",

    "date of joining": "joinDate",
    "joining date": "joinDate",
    doj: "joinDate",

    "birth place": "birthPlace",
    birthplace: "birthPlace",

    nationality: "nationality",

    "mother tongue": "motherTongue",

    languages: "languages",
    language: "languages",

    "phone number": "phone",
    phone: "phone",

    "passport number": "passportNumber",

    "identification mark": "identificationMark",

    "manpower type": "manpowerType",

    "vendor code": "vendorCode",

    "marital status": "maritalStatus",

    "number of children": "numberOfChildren",

    "safety issued": "safetyIssued",
    "safety issued or not": "safetyIssued",

    "shoe size": "shoeSize",
    "shoe issue date": "shoeIssueDate",

    "safety helmet": "safetyHelmet",
    "helmet color": "helmetColor",
    "helmet issue date": "helmetIssueDate",

    jacket: "jacket",
    "jacket size": "jacketSize",
    "jacket issue date": "jacketIssueDate",

    "eye protection equipment":
        "eyeProtectionEquipment",

    "permanent address line 1":
        "permanentAddressLine1",
    "permanent address line 2":
        "permanentAddressLine2",
    "permanent city": "permanentCity",
    "permanent country": "permanentCountry",
    "permanent state": "permanentState",
    "permanent pin code": "permanentPinCode",

    "present address line 1":
        "presentAddressLine1",
    "present address line 2":
        "presentAddressLine2",
    "present city": "presentCity",
    village: "village",
    "present country": "presentCountry",
    "present state": "presentState",
    "present pin code": "presentPinCode",

    "mobile number": "mobileNumber",
    mobile: "mobileNumber",

    "emergency contact person name":
        "emergencyContactPersonName",
    "emergency contact person relation":
        "emergencyContactPersonRelation",
    "emergency contact person address":
        "emergencyContactPersonAddress",
    "emergency mobile number":
        "emergencyMobileNumber",

    qualification: "qualification",
    specialization: "specialization",

    "college school name": "collegeSchoolName",
    "college / school name": "collegeSchoolName",

    "board university name":
        "boardUniversityName",
    "board / university name":
        "boardUniversityName",

    "year of passing": "yearOfPassing",

    resume: "resume",
    "appointment letter": "appointmentLetter",
    "degree certificate": "degreeCertificate",
    "kyc document": "kycDocument",
    "medical certificate": "medicalCertificate",

    "previous employment appointment letter":
        "previousEmploymentAppointmentLetter",

    "previous employment relevant experience letter":
        "previousEmploymentRelevantExperienceLetter",

    "police verification": "policeVerification",

    "bank account number": "bankAccountNumber",
    "bank account name": "bankAccountName",
    "bank account type": "bankAccountType",

    "ifsc code": "ifscCode",
    ifsc: "ifscCode",

    "bank name": "bankName",
    "branch name": "branchName",

    "uan number": "uanNumber",
    uan: "uanNumber",

    "pf number": "pfNumber",
    "esi number": "esiNumber",

    "employee code": "employeeCode",
    "emp code": "employeeCode",
    "employee id": "employeeCode",

    "employee email id": "email",
    "work email": "email",
    email: "email",

    department: "department",

    designation: "position",
    position: "position",

    "basic salary": "basicSalary",

    allowances: "allowances",
    allowance: "allowances",

    deductions: "deductions",
    deduction: "deductions",

    "temporary password": "password",
    password: "password",

    role: "role",
    "system role": "role",

    "anniversary date": "anniversaryDate",
    "confirmation date": "confirmationDate",

    "aadhaar number": "aadharNumber",
    "aadhaar no": "aadharNumber",
    "aadhar number": "aadharNumber",
    "aadhar no": "aadharNumber",
    aadhaar: "aadharNumber",
    aadhar: "aadharNumber",

    "pan number": "panNumber",
    "pan no": "panNumber",
    pan: "panNumber",

    bio: "bio",

    "employment status": "employmentStatus",
};

const resolveExcelField = (column) => {
    const normalized =
        normalizeExcelHeader(column);

    if (!normalized) {
        return null;
    }

    return HEADER_ALIASES[normalized] || null;
};

const cleanExcelValue = (value) => {
    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value)
        .replace(/\u00A0/g, " ")
        .trim();
};

const isEmptyExcelValue = (value) => {
    const normalized = cleanExcelValue(value)
        .toLowerCase();

    return [
        "",
        "-",
        "--",
        "n/a",
        "na",
        "nil",
        "null",
        "undefined",
    ].includes(normalized);
};

const normalizeIdentifier = (value) => {
    if (isEmptyExcelValue(value)) {
        return "";
    }

    return cleanExcelValue(value)
        .replace(/\.0$/, "")
        .trim()
        .toLowerCase();
};

const normalizeNameForMatch = (value) =>
    cleanExcelValue(value)
        .replace(/\s+/g, " ")
        .toLowerCase();

const employeeDocumentName = (employee) =>
    normalizeNameForMatch(
        employee?.name ||
            `${employee?.firstName || ""} ${
                employee?.lastName || ""
            }`
    );

const dynamicKey = (section, label) =>
    `${normalizeExcelHeader(
        section || "Excel Fields"
    )}::${normalizeExcelHeader(label)}`;

const mergeDynamicFields = (
    existingFields = [],
    incomingFields = [],
    allColumns = []
) => {
    const map = new Map();

    for (const field of existingFields || []) {
        if (!field?.label) {
            continue;
        }

        const key =
            field.key ||
            dynamicKey(
                field.section || "Excel Fields",
                field.label
            );

        map.set(key, {
            section:
                field.section || "Excel Fields",
            label: field.label,
            key,
            value: field.value ?? "",
        });
    }

    for (const column of allColumns || []) {
        if (!column?.label) {
            continue;
        }

        const key =
            column.key ||
            dynamicKey(
                column.section || "Excel Fields",
                column.label
            );

        if (!map.has(key)) {
            map.set(key, {
                section:
                    column.section ||
                    "Excel Fields",
                label: column.label,
                key,
                value: "",
            });
        }
    }

    for (const field of incomingFields || []) {
        if (!field?.label) {
            continue;
        }

        const key =
            field.key ||
            dynamicKey(
                field.section || "Excel Fields",
                field.label
            );

        const previous = map.get(key);

        const incomingValue =
            cleanExcelValue(field.value);

        map.set(key, {
            section:
                field.section ||
                previous?.section ||
                "Excel Fields",

            label:
                field.label ||
                previous?.label,

            key,

            value: !isEmptyExcelValue(
                incomingValue
            )
                ? incomingValue
                : previous?.value || "",
        });
    }

    return Array.from(map.values());
};

const valuesAreEqual = (
    oldValue,
    newValue
) => {
    if (oldValue instanceof Date) {
        const newDate =
            parseEmployeeDate(newValue);

        if (!newDate) {
            return false;
        }

        return (
            oldValue.getTime() ===
            newDate.getTime()
        );
    }

    return (
        cleanExcelValue(oldValue).toLowerCase() ===
        cleanExcelValue(newValue).toLowerCase()
    );
};

// =====================================================
// GET EMPLOYEES
// =====================================================

export const getEmployees = async (
    req,
    res
) => {
    try {
        const where = {
            isDeleted: {
                $ne: true,
            },
        };

        if (req.query.department) {
            where.department =
                req.query.department;
        }

        const employees =
            await Employee.find(where)
                .sort({
                    createdAt: -1,
                })
                .populate(
                    "userId",
                    "email role"
                )
                .lean();

        return res.json(
            employees.map((employee) => ({
                ...employee,

                id:
                    employee._id.toString(),

                user: employee.userId
                    ? {
                          email:
                              employee.userId
                                  .email,

                          role:
                              employee.userId
                                  .role,
                      }
                    : null,

                dynamicFields:
                    employee.dynamicFields || [],

                customFields:
                    employee.customFields || [],

                customSections:
                    employee.customSections || [],

                documents:
                    employee.documents || [],
            }))
        );
    } catch (error) {
        console.error(
            "Get Employees Error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to fetch employees",
        });
    }
};

// =====================================================
// GET EMPLOYEE BY ID
// =====================================================

export const getEmployeeById = async (
    req,
    res
) => {
    try {
        const employee =
            await Employee.findById(
                req.params.id
            )
                .populate(
                    "userId",
                    "email role"
                )
                .lean();

        if (
            !employee ||
            employee.isDeleted
        ) {
            return res.status(404).json({
                error: "Employee not found",
            });
        }

        return res.json({
            ...employee,

            id: employee._id.toString(),

            user: employee.userId
                ? {
                      email:
                          employee.userId.email,
                      role:
                          employee.userId.role,
                  }
                : null,

            dynamicFields:
                employee.dynamicFields || [],

            customFields:
                employee.customFields || [],

            customSections:
                employee.customSections || [],

            documents:
                employee.documents || [],
        });
    } catch (error) {
        console.error(
            "Get Employee By ID Error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to fetch employee",
        });
    }
};

// =====================================================
// EMPLOYEE DOCUMENTS
// =====================================================

export const getEmployeeDocuments = async (
    req,
    res
) => {
    try {
        const employee =
            await Employee.findById(
                req.params.id
            ).lean();

        if (
            !employee ||
            employee.isDeleted
        ) {
            return res.status(404).json({
                error: "Employee not found",
            });
        }

        const documents = [];

        if (
            typeof employee.cvUrl ===
                "string" &&
            employee.cvUrl.trim()
        ) {
            documents.push({
                _id: "cv-resume",
                name: "Resume / CV",
                fileUrl: employee.cvUrl,
                fileName:
                    employee.cvFileName ||
                    "Resume.pdf",
                uploadedAt:
                    employee.updatedAt ||
                    employee.createdAt,
            });
        }

        if (
            typeof employee.image ===
                "string" &&
            employee.image.trim()
        ) {
            documents.push({
                _id: "profile-photo",
                name: "Profile Photo",
                fileUrl: employee.image,
                fileName:
                    "profile-photo.jpg",
                uploadedAt:
                    employee.updatedAt ||
                    employee.createdAt,
            });
        }

        (employee.documents || []).forEach(
            (document, index) => {
                if (!document?.fileUrl) {
                    return;
                }

                documents.push({
                    _id:
                        document._id?.toString() ||
                        `document-${index}`,

                    name:
                        document.name ||
                        "Employee Document",

                    fileUrl:
                        document.fileUrl,

                    fileName:
                        document.fileName ||
                        "document",

                    uploadedAt:
                        document.uploadedAt ||
                        employee.updatedAt ||
                        employee.createdAt,
                });
            }
        );

        return res.json({
            employeeName:
                `${employee.firstName || ""} ${
                    employee.lastName || ""
                }`.trim(),

            documents,
        });
    } catch (error) {
        console.error(
            "Get Employee Documents Error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to fetch employee documents",
        });
    }
};

export const downloadEmployeeDocument =
    async (req, res) => {
        try {
            const { id, documentId } =
                req.params;

            const employee =
                await Employee.findById(
                    id
                ).lean();

            if (
                !employee ||
                employee.isDeleted
            ) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Employee not found",
                    });
            }

            let fileUrl = "";
            let fileName =
                "employee-document";

            if (
                documentId === "cv-resume"
            ) {
                fileUrl = employee.cvUrl;
                fileName =
                    employee.cvFileName ||
                    "Resume.pdf";
            } else if (
                documentId ===
                "profile-photo"
            ) {
                fileUrl = employee.image;
                fileName =
                    "profile-photo.jpg";
            } else {
                const document = (
                    employee.documents || []
                ).find(
                    (item) =>
                        item._id?.toString() ===
                        documentId
                );

                if (document) {
                    fileUrl =
                        document.fileUrl;

                    fileName =
                        document.fileName ||
                        document.name ||
                        "employee-document";
                }
            }

            if (!fileUrl) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Document URL not found",
                    });
            }

            const cloudResponse =
                await fetch(fileUrl, {
                    redirect: "follow",
                });

            if (!cloudResponse.ok) {
                return res
                    .status(502)
                    .json({
                        error:
                            "Unable to retrieve file",
                    });
            }

            const buffer = Buffer.from(
                await cloudResponse.arrayBuffer()
            );

            const contentType =
                cloudResponse.headers.get(
                    "content-type"
                ) ||
                "application/octet-stream";

            res.setHeader(
                "Content-Type",
                contentType
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename*=UTF-8''${encodeURIComponent(
                    fileName
                )}`
            );

            return res.send(buffer);
        } catch (error) {
            console.error(
                "Download Document Error:",
                error
            );

            return res.status(500).json({
                error:
                    error.message ||
                    "Failed to download document",
            });
        }
    };

// =====================================================
// CREATE EMPLOYEE - MANUAL FORM
// Existing strict functionality is preserved.
// =====================================================

export const createEmployee = async (
    req,
    res
) => {
    try {
        const source = req.body || {};

        const employeeCode =
            textValue(
                source.employeeCode
            ) || `EMP${Date.now()}`;

        const email = textValue(
            source.email
        ).toLowerCase();

        const password = textValue(
            source.password
        );

        const role =
            textValue(
                source.role,
                "EMPLOYEE"
            ).toUpperCase() === "ADMIN"
                ? "ADMIN"
                : "EMPLOYEE";

        const names = splitEmployeeName(
            source.name,
            source.firstName,
            source.lastName
        );

        if (!names.name) {
            return res.status(400).json({
                error:
                    "Employee name is required",
            });
        }

        if (!email) {
            return res.status(400).json({
                error:
                    "Employee Email ID is required",
            });
        }

        if (!password) {
            return res.status(400).json({
                error:
                    "Temporary Password is required",
            });
        }

        const existingCode =
            await Employee.findOne({
                employeeCode,
                isDeleted: {
                    $ne: true,
                },
            });

        if (existingCode) {
            return res.status(400).json({
                error:
                    "Employee code already exists",
            });
        }

        const existingUser =
            await User.findOne({
                email,
            });

        if (existingUser) {
            return res.status(400).json({
                error:
                    "Email already exists",
            });
        }

        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );

        const user = await User.create({
            email,
            password: hashedPassword,
            role,
        });

        try {
            const employeeData =
                buildEmployeeData({
                    ...source,

                    employeeCode,

                    email,

                    name: names.name,
                    firstName:
                        names.firstName,
                    lastName:
                        names.lastName,
                });

            const employee =
                await Employee.create({
                    userId: user._id,

                    ...employeeData,

                    isDeleted: false,

                    documents:
                        Array.isArray(
                            source.documents
                        )
                            ? source.documents
                            : [],
                });

            return res.status(201).json({
                success: true,
                message:
                    "Employee created successfully",
                employee,
            });
        } catch (employeeError) {
            await User.findByIdAndDelete(
                user._id
            );

            throw employeeError;
        }
    } catch (error) {
        console.error(
            "Create Employee Error:",
            error
        );

        return res.status(500).json({
            error:
                error.message ||
                "Failed to create employee",
        });
    }
};

// =====================================================
// UPDATE EMPLOYEE
// =====================================================

export const updateEmployee = async (
    req,
    res
) => {
    try {
        const { id } = req.params;
        const source = req.body || {};

        const employee =
            await Employee.findById(id);

        if (!employee) {
            return res.status(404).json({
                error:
                    "Employee not found",
            });
        }

        const requestedCode =
            source.employeeCode !==
            undefined
                ? textValue(
                      source.employeeCode
                  )
                : employee.employeeCode;

        const requestedEmail =
            source.email !== undefined
                ? textValue(
                      source.email
                  ).toLowerCase()
                : employee.email;

        const employeeData =
            buildEmployeeData(
                {
                    ...source,
                    employeeCode:
                        requestedCode,
                    email:
                        requestedEmail,
                },
                employee
            );

        const updatedEmployee =
            await Employee.findByIdAndUpdate(
                id,
                {
                    ...employeeData,
                    isDeleted:
                        employee.isDeleted,
                },
                {
                    new: true,
                    runValidators: true,
                }
            );

        if (
            employee.userId &&
            requestedEmail
        ) {
            await User.findByIdAndUpdate(
                employee.userId,
                {
                    email:
                        requestedEmail,
                }
            );
        }

        return res.json({
            success: true,
            message:
                "Employee updated successfully",
            employee:
                updatedEmployee,
        });
    } catch (error) {
        console.error(
            "Update Employee Error:",
            error
        );

        return res.status(500).json({
            error:
                error.message ||
                "Failed to update employee",
        });
    }
};

// =====================================================
// DELETE EMPLOYEE CARD ONLY
// =====================================================

export const deleteEmployee = async (
    req,
    res
) => {
    try {
        const employee =
            await Employee.findById(
                req.params.id
            );

        if (!employee) {
            return res.status(404).json({
                error:
                    "Employee not found",
            });
        }

        employee.isDeleted = true;
        await employee.save();

        return res.json({
            success: true,
            message:
                "Employee card removed successfully",
        });
    } catch (error) {
        console.error(
            "Delete Employee Error:",
            error
        );

        return res.status(500).json({
            error:
                error.message ||
                "Failed to remove employee card",
        });
    }
};

// =====================================================
// PUBLIC PROFILE
// =====================================================

export const getEmployeePublicProfile =
    async (req, res) => {
        try {
            const employee =
                await Employee.findById(
                    req.params.id
                ).lean();

            if (
                !employee ||
                employee.isDeleted
            ) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Employee not found",
                    });
            }

            return res.json({
                _id: employee._id,

                name:
                    employee.name ||
                    `${employee.firstName || ""} ${
                        employee.lastName || ""
                    }`.trim(),

                firstName:
                    employee.firstName,

                lastName:
                    employee.lastName,

                employeeCode:
                    employee.employeeCode,

                department:
                    employee.department,

                position:
                    employee.position,

                image:
                    employee.image,

                bio:
                    employee.bio,

                skills:
                    employee.skills || [],

                dynamicFields:
                    employee.dynamicFields ||
                    [],
            });
        } catch (error) {
            console.error(
                "Employee Public Profile Error:",
                error
            );

            return res.status(500).json({
                error:
                    "Failed to fetch employee profile",
            });
        }
    };

// =====================================================
// EMPLOYEE DIRECTORY
// =====================================================

export const getEmployeeDirectory =
    async (req, res) => {
        try {
            const employees =
                await Employee.find({
                    isDeleted: {
                        $ne: true,
                    },
                })
                    .populate(
                        "userId",
                        "email role"
                    )
                    .sort({
                        firstName: 1,
                        lastName: 1,
                    })
                    .lean();

            const currentUserId =
                req.session?.userId
                    ? String(
                          req.session.userId
                      )
                    : "";

            const directory =
                employees
                    .filter(
                        (employee) =>
                            !currentUserId ||
                            String(
                                employee
                                    .userId?._id ||
                                    employee.userId ||
                                    ""
                            ) !==
                                currentUserId
                    )
                    .map(
                        (employee) => ({
                            _id:
                                employee._id,

                            userId:
                                employee
                                    .userId?._id ||
                                employee.userId ||
                                null,

                            name:
                                employee.name ||
                                `${employee.firstName || ""} ${
                                    employee.lastName || ""
                                }`.trim(),

                            firstName:
                                employee.firstName,

                            lastName:
                                employee.lastName,

                            email:
                                employee.email ||
                                employee.userId
                                    ?.email ||
                                "",

                            role:
                                employee.userId
                                    ?.role ||
                                "EMPLOYEE",

                            department:
                                employee.department ||
                                "",

                            position:
                                employee.position ||
                                "",

                            image:
                                employee.image ||
                                null,
                        })
                    );

            return res.json(directory);
        } catch (error) {
            console.error(
                "Employee Directory Error:",
                error
            );

            return res.status(500).json({
                error:
                    "Failed to fetch employee directory",
            });
        }
    };

// =====================================================
// EXPORT EMPLOYEES
// Existing export functionality is unchanged.
// =====================================================

export const exportEmployees = async (
    req,
    res
) => {
    try {
        const employees =
            await Employee.find({
                isDeleted: {
                    $ne: true,
                },
            })
                .populate(
                    "userId",
                    "email role"
                )
                .sort({
                    createdAt: -1,
                })
                .lean();

        return res.json({
            success: true,
            employees,
        });
    } catch (error) {
        console.error(
            "Export Employees Error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to export employees",
        });
    }
};

// =====================================================
// BULK EXCEL UPLOAD
//
// FLEXIBLE RULES:
// - No specific employee column is required.
// - Missing columns are allowed.
// - Blank cells are ignored.
// - Known columns are stored in their normal fields.
// - Unknown columns become dynamicFields.
// - Manual Add Employee validation is NOT used here.
// - Existing employees can be updated from partial Excel rows.
// =====================================================

export const bulkUploadEmployees =
    async (req, res) => {
        try {
            await removeLegacyEmployeeUniqueIndexes();

            if (!req.file) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "Excel file is required",
                    });
            }

            const XLSX =
                await import("xlsx");

            const workbook = XLSX.read(
                req.file.buffer,
                {
                    type: "buffer",
                    cellDates: true,
                    raw: false,
                }
            );

            if (
                !workbook.SheetNames ||
                workbook.SheetNames.length ===
                    0
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "Excel workbook is empty",
                    });
            }

            const worksheet =
                workbook.Sheets[
                    workbook.SheetNames[0]
                ];

            const rawRows =
                XLSX.utils.sheet_to_json(
                    worksheet,
                    {
                        header: 1,
                        defval: "",
                        blankrows: false,
                        raw: false,
                    }
                );

            if (
                !Array.isArray(rawRows) ||
                rawRows.length === 0
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "Excel sheet is empty",
                    });
            }

            // =============================================
            // FIND HEADER ROW
            // =============================================

            let headerRowIndex = -1;
            let highestScore = -1;

            const maxCheckRows =
                Math.min(
                    rawRows.length,
                    20
                );

            for (
                let r = 0;
                r < maxCheckRows;
                r++
            ) {
                const row =
                    rawRows[r] || [];

                let score = 0;
                let nonEmpty = 0;

                for (const cell of row) {
                    const value =
                        cleanExcelValue(cell);

                    if (!value) {
                        continue;
                    }

                    nonEmpty++;

                    if (
                        resolveExcelField(value)
                    ) {
                        score += 10;
                    }

                    const normalized =
                        normalizeExcelHeader(
                            value
                        );

                    if (
                        normalized ===
                            "name" ||
                        normalized ===
                            "employee name" ||
                        normalized ===
                            "full name"
                    ) {
                        score += 25;
                    }
                }

                if (nonEmpty >= 3) {
                    score += nonEmpty;
                }

                if (score > highestScore) {
                    highestScore = score;
                    headerRowIndex = r;
                }
            }

            if (headerRowIndex < 0) {
                headerRowIndex = 0;
            }

            console.log(
                "Detected Excel header row:",
                headerRowIndex + 1
            );

            // =============================================
            // BUILD COLUMN MAP
            // =============================================

            const headerRow =
                rawRows[headerRowIndex] ||
                [];

            const columns = [];

            for (
                let c = 0;
                c < headerRow.length;
                c++
            ) {
                const rawHeader =
                    cleanExcelValue(
                        headerRow[c]
                    );

                if (!rawHeader) {
                    continue;
                }

                const knownField =
                    resolveExcelField(
                        rawHeader
                    );

                const isDynamic =
                    !knownField;

                const key = isDynamic
                    ? dynamicKey(
                          "Excel Fields",
                          rawHeader
                      )
                    : null;

                columns.push({
                    columnIndex: c,
                    header: rawHeader,
                    knownField,
                    isDynamic,
                    key,
                    section:
                        "Excel Fields",
                });
            }

            if (columns.length === 0) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        error:
                            "No Excel columns were detected",
                    });
            }

            const dynamicColumns =
                columns
                    .filter(
                        (column) =>
                            column.isDynamic
                    )
                    .map((column) => ({
                        section:
                            column.section,
                        label:
                            column.header,
                        key: column.key,
                    }));

            // =============================================
            // ADD NEW DYNAMIC COLUMNS TO EXISTING CARDS
            // =============================================

            if (
                dynamicColumns.length > 0
            ) {
                const allEmployees =
                    await Employee.find({})
                        .select(
                            "_id dynamicFields"
                        )
                        .lean();

                for (
                    const employee
                    of allEmployees
                ) {
                    const merged =
                        mergeDynamicFields(
                            employee.dynamicFields ||
                                [],
                            [],
                            dynamicColumns
                        );

                    await Employee.updateOne(
                        {
                            _id:
                                employee._id,
                        },
                        {
                            $set: {
                                dynamicFields:
                                    merged,
                            },
                        }
                    );
                }
            }

            // =============================================
            // CACHE EXISTING EMPLOYEES
            // =============================================

            const existingEmployees =
                await Employee.find(
                    {}
                ).lean();

            const employeesByCode =
                new Map();

            const employeesByEmail =
                new Map();

            const employeesByAadhar =
                new Map();

            const employeesByUan =
                new Map();

            const employeesByBank =
                new Map();

            const employeesByMobile =
                new Map();

            const employeesByPhone =
                new Map();

            const addToMap = (
                map,
                value,
                employee
            ) => {
                const key =
                    normalizeIdentifier(
                        value
                    );

                if (!key) {
                    return;
                }

                if (!map.has(key)) {
                    map.set(key, []);
                }

                map.get(key).push(
                    employee
                );
            };

            for (
                const employee
                of existingEmployees
            ) {
                addToMap(
                    employeesByCode,
                    employee.employeeCode,
                    employee
                );

                addToMap(
                    employeesByEmail,
                    employee.email,
                    employee
                );

                addToMap(
                    employeesByAadhar,
                    employee.aadharNumber,
                    employee
                );

                addToMap(
                    employeesByUan,
                    employee.uanNumber,
                    employee
                );

                addToMap(
                    employeesByBank,
                    employee.bankAccountNumber,
                    employee
                );

                addToMap(
                    employeesByMobile,
                    employee.mobileNumber,
                    employee
                );

                addToMap(
                    employeesByPhone,
                    employee.phone,
                    employee
                );
            }

            const chooseCandidate = (
                candidates,
                excelName
            ) => {
                if (
                    !Array.isArray(
                        candidates
                    ) ||
                    candidates.length === 0
                ) {
                    return null;
                }

                if (
                    candidates.length === 1
                ) {
                    return candidates[0];
                }

                const normalizedName =
                    normalizeNameForMatch(
                        excelName
                    );

                // If name was not supplied, don't
                // randomly choose between duplicates.
                if (!normalizedName) {
                    return null;
                }

                const exactNames =
                    candidates.filter(
                        (candidate) =>
                            employeeDocumentName(
                                candidate
                            ) ===
                            normalizedName
                    );

                const deletedExact =
                    exactNames.find(
                        (candidate) =>
                            candidate.isDeleted ===
                            true
                    );

                if (deletedExact) {
                    return deletedExact;
                }

                if (
                    exactNames.length === 1
                ) {
                    return exactNames[0];
                }

                return null;
            };

            // =============================================
            // RESULTS
            // =============================================

            let created = 0;
            let updated = 0;
            let restored = 0;

            const skipped = [];

            const processedEmployeeIds =
                new Set();

            // =============================================
            // PROCESS EVERY EXCEL ROW
            // =============================================

            for (
                let r =
                    headerRowIndex + 1;
                r < rawRows.length;
                r++
            ) {
                const row =
                    rawRows[r] || [];

                const excelRow = r + 1;

                // Ignore only a completely empty row.
                if (
                    !row.some(
                        (cell) =>
                            !isEmptyExcelValue(
                                cell
                            )
                    )
                ) {
                    continue;
                }

                try {
                    const knownData = {};
                    const incomingDynamic =
                        [];

                    // =====================================
                    // READ ALL CELLS
                    // =====================================

                    for (
                        const column
                        of columns
                    ) {
                        const value =
                            cleanExcelValue(
                                row[
                                    column
                                        .columnIndex
                                ]
                            );

                        if (
                            column.isDynamic
                        ) {
                            incomingDynamic.push(
                                {
                                    section:
                                        column.section,
                                    label:
                                        column.header,
                                    key:
                                        column.key,
                                    value,
                                }
                            );

                            continue;
                        }

                        // Blank/missing known fields
                        // are simply ignored.
                        if (
                            isEmptyExcelValue(
                                value
                            )
                        ) {
                            continue;
                        }

                        knownData[
                            column.knownField
                        ] = value;
                    }

                    // =====================================
                    // OPTIONAL EMPLOYEE NAME
                    // =====================================

                    const names =
                        splitEmployeeName(
                            knownData.name,
                            knownData.firstName,
                            knownData.lastName
                        );

                    // IMPORTANT:
                    // We DO NOT skip the row when name is missing.
                    if (
                        knownData.name !==
                            undefined ||
                        knownData.firstName !==
                            undefined ||
                        knownData.lastName !==
                            undefined
                    ) {
                        knownData.name =
                            names.name;

                        knownData.firstName =
                            names.firstName;

                        knownData.lastName =
                            names.lastName;
                    }

                    const employeeData =
                        buildEmployeeData(
                            knownData
                        );

                    // =====================================
                    // FIND EXISTING EMPLOYEE
                    // =====================================

                    let existingEmployee =
                        null;

                    const employeeCode =
                        normalizeIdentifier(
                            knownData.employeeCode
                        );

                    const email =
                        normalizeIdentifier(
                            knownData.email
                        );

                    const aadhar =
                        normalizeIdentifier(
                            knownData.aadharNumber
                        );

                    const uan =
                        normalizeIdentifier(
                            knownData.uanNumber
                        );

                    const bank =
                        normalizeIdentifier(
                            knownData.bankAccountNumber
                        );

                    const mobile =
                        normalizeIdentifier(
                            knownData.mobileNumber
                        );

                    const phone =
                        normalizeIdentifier(
                            knownData.phone
                        );

                    // Employee Code
                    if (
                        !existingEmployee &&
                        employeeCode
                    ) {
                        existingEmployee =
                            chooseCandidate(
                                employeesByCode.get(
                                    employeeCode
                                ),
                                names.name
                            );
                    }

                    // Email
                    if (
                        !existingEmployee &&
                        email
                    ) {
                        existingEmployee =
                            chooseCandidate(
                                employeesByEmail.get(
                                    email
                                ),
                                names.name
                            );
                    }

                    // Aadhaar
                    if (
                        !existingEmployee &&
                        aadhar
                    ) {
                        existingEmployee =
                            chooseCandidate(
                                employeesByAadhar.get(
                                    aadhar
                                ),
                                names.name
                            );
                    }

                    // UAN
                    if (
                        !existingEmployee &&
                        uan
                    ) {
                        existingEmployee =
                            chooseCandidate(
                                employeesByUan.get(
                                    uan
                                ),
                                names.name
                            );
                    }

                    // Bank Account
                    if (
                        !existingEmployee &&
                        bank
                    ) {
                        existingEmployee =
                            chooseCandidate(
                                employeesByBank.get(
                                    bank
                                ),
                                names.name
                            );
                    }

                    // Mobile
                    if (
                        !existingEmployee &&
                        mobile
                    ) {
                        const candidates =
                            employeesByMobile.get(
                                mobile
                            ) || [];

                        if (
                            candidates.length ===
                            1
                        ) {
                            existingEmployee =
                                candidates[0];
                        } else if (
                            names.name
                        ) {
                            const matchingName =
                                candidates.filter(
                                    (
                                        candidate
                                    ) =>
                                        employeeDocumentName(
                                            candidate
                                        ) ===
                                        normalizeNameForMatch(
                                            names.name
                                        )
                                );

                            if (
                                matchingName.length ===
                                1
                            ) {
                                existingEmployee =
                                    matchingName[0];
                            }
                        }
                    }

                    // Phone
                    if (
                        !existingEmployee &&
                        phone
                    ) {
                        const candidates =
                            employeesByPhone.get(
                                phone
                            ) || [];

                        if (
                            candidates.length ===
                            1
                        ) {
                            existingEmployee =
                                candidates[0];
                        } else if (
                            names.name
                        ) {
                            const matchingName =
                                candidates.filter(
                                    (
                                        candidate
                                    ) =>
                                        employeeDocumentName(
                                            candidate
                                        ) ===
                                        normalizeNameForMatch(
                                            names.name
                                        )
                                );

                            if (
                                matchingName.length ===
                                1
                            ) {
                                existingEmployee =
                                    matchingName[0];
                            }
                        }
                    }

                    // =====================================
                    // UPDATE EXISTING EMPLOYEE
                    // =====================================

                    if (existingEmployee) {
                        const employeeId =
                            existingEmployee._id.toString();

                        if (
                            processedEmployeeIds.has(
                                employeeId
                            )
                        ) {
                            skipped.push({
                                row: excelRow,
                                employee:
                                    names.name ||
                                    employeeCode ||
                                    email ||
                                    "",
                                reason:
                                    "Another row in this Excel file already matched this employee",
                            });

                            continue;
                        }

                        processedEmployeeIds.add(
                            employeeId
                        );

                        const wasDeleted =
                            existingEmployee.isDeleted ===
                            true;

                        const updateData = {};

                        // Only update values that were
                        // actually supplied in this Excel.
                        for (
                            const [
                                key,
                                value,
                            ] of Object.entries(
                                employeeData
                            )
                        ) {
                            if (
                                [
                                    "dynamicFields",
                                    "customFields",
                                    "customSections",
                                ].includes(key)
                            ) {
                                continue;
                            }

                            if (
                                value ===
                                    undefined ||
                                value === null ||
                                value === ""
                            ) {
                                continue;
                            }

                            if (
                                !valuesAreEqual(
                                    existingEmployee[
                                        key
                                    ],
                                    value
                                )
                            ) {
                                updateData[key] =
                                    value;
                            }
                        }

                        updateData.dynamicFields =
                            mergeDynamicFields(
                                existingEmployee.dynamicFields ||
                                    [],
                                incomingDynamic,
                                dynamicColumns
                            );

                        if (wasDeleted) {
                            updateData.isDeleted =
                                false;

                            restored++;
                        }

                        await Employee.updateOne(
                            {
                                _id:
                                    existingEmployee._id,
                            },
                            {
                                $set:
                                    updateData,
                            },
                            {
                                runValidators:
                                    false,
                            }
                        );

                        updated++;

                        Object.assign(
                            existingEmployee,
                            updateData
                        );

                        continue;
                    }

                    // =====================================
                    // CREATE NEW EMPLOYEE
                    // =====================================

                    const newEmployeeData = {
                        ...employeeData,

                        dynamicFields:
                            mergeDynamicFields(
                                [],
                                incomingDynamic,
                                dynamicColumns
                            ),

                        customFields: [],
                        customSections: [],
                        isDeleted: false,
                    };

                    /*
                        IMPORTANT:

                        No field is invented here.

                        If Excel contains:
                        Name + Employee ID + Birth Place
                        -> only those values are stored.

                        If Excel contains:
                        Employee ID + DOB + PAN + Aadhaar
                        -> those values are stored.

                        If Excel contains an unknown column:
                        Home / Shirt Size / Project / etc.
                        -> it is stored inside dynamicFields.

                        Missing Email, Department, Phone,
                        Salary, DOB, PAN, Aadhaar, etc.
                        DO NOT stop creation.
                    */

                    const newEmployee =
                        await Employee.create(
                            newEmployeeData
                        );

                    created++;

                    processedEmployeeIds.add(
                        newEmployee._id.toString()
                    );

                    // =====================================
                    // UPDATE LOCAL CACHE
                    // =====================================

                    const cacheEmployee =
                        newEmployee.toObject();

                    existingEmployees.push(
                        cacheEmployee
                    );

                    addToMap(
                        employeesByCode,
                        cacheEmployee.employeeCode,
                        cacheEmployee
                    );

                    addToMap(
                        employeesByEmail,
                        cacheEmployee.email,
                        cacheEmployee
                    );

                    addToMap(
                        employeesByAadhar,
                        cacheEmployee.aadharNumber,
                        cacheEmployee
                    );

                    addToMap(
                        employeesByUan,
                        cacheEmployee.uanNumber,
                        cacheEmployee
                    );

                    addToMap(
                        employeesByBank,
                        cacheEmployee.bankAccountNumber,
                        cacheEmployee
                    );

                    addToMap(
                        employeesByMobile,
                        cacheEmployee.mobileNumber,
                        cacheEmployee
                    );

                    addToMap(
                        employeesByPhone,
                        cacheEmployee.phone,
                        cacheEmployee
                    );
                } catch (rowError) {
                    console.error(
                        `Excel Row ${excelRow} Error:`,
                        rowError
                    );

                    skipped.push({
                        row: excelRow,

                        reason:
                            rowError?.code ===
                            11000
                                ? `Duplicate value blocked by MongoDB index${
                                      rowError?.keyPattern
                                          ? ` (${Object.keys(
                                                rowError.keyPattern
                                            ).join(
                                                ", "
                                            )})`
                                          : ""
                                  }`
                                : rowError?.message ||
                                  "Failed to import employee",
                    });
                }
            }

            // =============================================
            // FINAL RESULT
            // =============================================

            console.log(
                "Employee Excel Upload Result:",
                {
                    created,
                    updated,
                    restored,
                    skipped:
                        skipped.length,
                }
            );

            if (skipped.length > 0) {
                console.table(skipped);
            }

            return res.json({
                success: true,

                created,
                updated,
                restored,

                skippedCount:
                    skipped.length,

                skipped,

                dynamicColumns,

                headerRow:
                    headerRowIndex + 1,

                totalRowsProcessed:
                    created +
                    updated +
                    skipped.length,

                message:
                    `${created} created, ` +
                    `${updated} updated, ` +
                    `${restored} restored, ` +
                    `${skipped.length} skipped`,
            });
        } catch (error) {
            console.error(
                "Bulk Upload Error:",
                error
            );

            return res.status(500).json({
                success: false,

                error:
                    error.message ||
                    "Failed to upload Excel file",
            });
        }
    };