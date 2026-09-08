import Employee from "../models/Employee.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";

// =====================================================
// LEGACY EMPLOYEE INDEX CLEANUP
// =====================================================

const removeLegacyEmployeeUniqueIndexes = async () => {
    try {
        const indexes =
            await Employee.collection.indexes();

        const optionalFields =
            new Set([
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

            const fields =
                Object.keys(
                    index.key || {}
                );

            if (
                fields.length !== 1 ||
                !optionalFields.has(
                    fields[0]
                )
            ) {
                continue;
            }

            console.log(
                `Removing legacy Employee unique index: ${index.name}`
            );

            await Employee.collection.dropIndex(
                index.name
            );
        }
    } catch (error) {
        if (
            error?.codeName ===
            "NamespaceNotFound" ||
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

const textValue = (
    value,
    fallback = ""
) => {
    if (
        value === undefined ||
        value === null
    ) {
        return fallback;
    }

    const result =
        String(value).trim();

    return result || fallback;
};

// Temporary password:
//
// First 3 alphabetic characters from name
// +
// First 3 digits from Phone Number
// (Mobile Number is used if Phone Number is empty)
// +
// @#
//
// Example:
// Ayush + 9876543210
// => Ayu987@#

const generateTemporaryPassword = (
    name,
    phone
) => {
    const namePart =
        String(name || "")
            .replace(
                /[^A-Za-z]/g,
                ""
            )
            .slice(0, 3);

    const phonePart =
        String(phone || "")
            .replace(/\D/g, "")
            .slice(0, 3);

    if (
        namePart.length < 3 ||
        phonePart.length < 3
    ) {
        return "";
    }

    return `${namePart}${phonePart}@#`;
};

const getEmployeePhoneForPassword =
    (source = {}) =>
        textValue(
            source.phone
        ) ||
        textValue(
            source.mobileNumber
        );

const numberValue = (
    value,
    fallback = null
) => {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return fallback;
    }

    const parsed =
        Number(
            String(value)
                .replace(/,/g, "")
                .trim()
        );

    return Number.isFinite(parsed)
        ? parsed
        : fallback;
};

const parseEmployeeDate = (
    value
) => {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(
            value.getTime()
        )
            ? null
            : value;
    }

    const input =
        String(value).trim();

    if (!input) {
        return null;
    }

    const ymd =
        input.match(
            /^(\d{4})-(\d{1,2})-(\d{1,2})$/
        );

    if (ymd) {
        return new Date(
            Number(ymd[1]),
            Number(ymd[2]) - 1,
            Number(ymd[3])
        );
    }

    const dmy =
        input.match(
            /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/
        );

    if (dmy) {
        return new Date(
            Number(dmy[3]),
            Number(dmy[2]) - 1,
            Number(dmy[1])
        );
    }

    const parsed =
        new Date(input);

    return Number.isNaN(
        parsed.getTime()
    )
        ? null
        : parsed;
};

const splitEmployeeName = (
    name,
    firstName = "",
    lastName = ""
) => {
    const explicitFirst =
        textValue(firstName);

    const explicitLast =
        textValue(lastName);

    if (
        explicitFirst ||
        explicitLast
    ) {
        const complete =
            `${explicitFirst} ${explicitLast}`
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();

        return {
            name: complete,
            firstName:
                explicitFirst,
            lastName:
                explicitLast,
        };
    }

    const fullName =
        textValue(name)
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    const parts =
        fullName
            .split(" ")
            .filter(Boolean);

    return {
        name: fullName,
        firstName:
            parts[0] || "",
        lastName:
            parts
                .slice(1)
                .join(" "),
    };
};

const normalizeGender = (
    value
) => {
    const gender =
        textValue(value)
            .toUpperCase();

    if (
        ["M", "MALE"].includes(
            gender
        )
    ) {
        return "MALE";
    }

    if (
        ["F", "FEMALE"].includes(
            gender
        )
    ) {
        return "FEMALE";
    }

    if (
        ["O", "OTHER"].includes(
            gender
        )
    ) {
        return "OTHER";
    }

    return gender || "";
};

const normalizeMaritalStatus =
    (value) => {
        const status =
            textValue(value)
                .toUpperCase();

        if (
            [
                "UNMARRIED",
                "SINGLE",
            ].includes(status)
        ) {
            return "SINGLE";
        }

        if (
            [
                "MARRIED",
                "DIVORCED",
                "WIDOWED",
            ].includes(status)
        ) {
            return status;
        }

        return status || "";
    };

// =====================================================
// EMPLOYEE FIELDS
// =====================================================

const DATE_FIELDS =
    new Set([
        "dateOfBirth",
        "joinDate",
        "shoeIssueDate",
        "helmetIssueDate",
        "jacketIssueDate",
        "anniversaryDate",
        "confirmationDate",
    ]);

const NUMBER_FIELDS =
    new Set([
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

    const names =
        splitEmployeeName(
            source.name,
            source.firstName,
            source.lastName
        );

    const hasNameInput =
        source.name !==
        undefined ||
        source.firstName !==
        undefined ||
        source.lastName !==
        undefined;

    if (hasNameInput) {
        result.name =
            names.name;

        result.firstName =
            names.firstName;

        result.lastName =
            names.lastName;
    } else if (existing) {
        result.name =
            existing.name ||
            `${existing.firstName || ""} ${existing.lastName ||
                ""
                }`.trim();

        result.firstName =
            existing.firstName ||
            "";

        result.lastName =
            existing.lastName ||
            "";
    }

    for (
        const field
        of EMPLOYEE_FIELDS
    ) {
        if (
            [
                "name",
                "firstName",
                "lastName",
            ].includes(field)
        ) {
            continue;
        }

        if (
            source[field] !==
            undefined
        ) {
            if (
                DATE_FIELDS.has(
                    field
                )
            ) {
                result[field] =
                    parseEmployeeDate(
                        source[field]
                    );

                continue;
            }

            if (
                NUMBER_FIELDS.has(
                    field
                )
            ) {
                result[field] =
                    numberValue(
                        source[field],
                        null
                    );

                continue;
            }

            if (
                field ===
                "gender"
            ) {
                result[field] =
                    normalizeGender(
                        source[field]
                    );

                continue;
            }

            if (
                field ===
                "maritalStatus"
            ) {
                result[field] =
                    normalizeMaritalStatus(
                        source[field]
                    );

                continue;
            }

            if (
                field ===
                "email"
            ) {
                result[field] =
                    textValue(
                        source[field]
                    ).toLowerCase();

                continue;
            }

            if (
                field ===
                "panNumber" ||
                field ===
                "ifscCode"
            ) {
                result[field] =
                    textValue(
                        source[field]
                    ).toUpperCase();

                continue;
            }

            if (
                field ===
                "employmentStatus"
            ) {
                const status =
                    textValue(
                        source[field]
                    ).toUpperCase();

                result[field] =
                    [
                        "ACTIVE",
                        "INACTIVE",
                        "",
                    ].includes(
                        status
                    )
                        ? status
                        : "";

                continue;
            }

            result[field] =
                textValue(
                    source[field]
                );
        } else if (
            existing &&
            existing[field] !==
            undefined
        ) {
            result[field] =
                existing[field];
        }
    }

    result.dynamicFields =
        Array.isArray(
            source.dynamicFields
        )
            ? source.dynamicFields
            : existing
                ?.dynamicFields ||
            [];

    result.customFields =
        Array.isArray(
            source.customFields
        )
            ? source.customFields
            : existing
                ?.customFields ||
            [];

    result.customSections =
        Array.isArray(
            source.customSections
        )
            ? source.customSections
            : existing
                ?.customSections ||
            [];

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

    "college school name":
        "collegeSchoolName",

    "board university name":
        "boardUniversityName",

    "year of passing": "yearOfPassing",

    resume: "resume",
    "appointment letter":
        "appointmentLetter",
    "degree certificate":
        "degreeCertificate",
    "kyc document": "kycDocument",
    "medical certificate":
        "medicalCertificate",

    "previous employment appointment letter":
        "previousEmploymentAppointmentLetter",

    "previous employment relevant experience letter":
        "previousEmploymentRelevantExperienceLetter",

    "police verification":
        "policeVerification",

    "bank account number":
        "bankAccountNumber",
    "bank account name":
        "bankAccountName",
    "bank account type":
        "bankAccountType",

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
    "emp id": "employeeCode",

    "employee email id": "email",
    "email id": "email",
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

    "anniversary date":
        "anniversaryDate",
    "confirmation date":
        "confirmationDate",

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

    "employment status":
        "employmentStatus",

    // Optional Excel-only operation column.
    action: "excelAction",
};

const resolveExcelField = (column) => {
    const normalized =
        normalizeExcelHeader(column);

    if (!normalized) {
        return null;
    }

    return (
        HEADER_ALIASES[normalized] ||
        null
    );
};
const cleanExcelValue = (
    value
) => {
    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    if (value instanceof Date) {
        return value;
    }

    return String(value)
        .replace(/\u00a0/g, " ")
        .trim();
};

const isEmptyExcelValue = (
    value
) => {
    if (
        value === undefined ||
        value === null
    ) {
        return true;
    }

    if (value instanceof Date) {
        return false;
    }

    return (
        String(value)
            .replace(/\u00a0/g, " ")
            .trim() === ""
    );
};

const normalizeIdentifier = (
    value
) =>
    textValue(value)
        .toLowerCase()
        .replace(/\s+/g, "");

const normalizeNameForMatch = (
    value
) =>
    textValue(value)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

const employeeDocumentName = (
    employee
) =>
    normalizeNameForMatch(
        employee?.name ||
        `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim()
    );

const normalizeDynamicKey = (
    value
) =>
    normalizeExcelHeader(value)
        .replace(/\s+/g, "_");

const dynamicKey = (
    section,
    label
) => {
    const sectionKey =
        normalizeDynamicKey(
            section
        );

    const labelKey =
        normalizeDynamicKey(
            label
        );

    if (!labelKey) {
        return "";
    }

    return sectionKey
        ? `${sectionKey}__${labelKey}`
        : labelKey;
};
const valuesAreEqual = (
    first,
    second
) => {
    if (
        first instanceof Date ||
        second instanceof Date
    ) {
        const firstDate =
            parseEmployeeDate(
                first
            );

        const secondDate =
            parseEmployeeDate(
                second
            );

        if (
            !firstDate &&
            !secondDate
        ) {
            return true;
        }

        if (
            !firstDate ||
            !secondDate
        ) {
            return false;
        }

        return (
            firstDate.getTime() ===
            secondDate.getTime()
        );
    }

    return (
        textValue(first) ===
        textValue(second)
    );
};

const mergeDynamicFields = (
    existingFields = [],
    incomingFields = [],
    allColumns = []
) => {
    const map =
        new Map();

    for (
        const field
        of Array.isArray(
            existingFields
        )
            ? existingFields
            : []
    ) {
        const key =
            normalizeDynamicKey(
                field?.key ||
                field?.label
            );

        if (!key) {
            continue;
        }

        map.set(
            key,
            {
                section:
                    textValue(
                        field?.section,
                        "Excel Additional Fields"
                    ),

                label:
                    textValue(
                        field?.label
                    ),

                key,

                value:
                    field?.value ??
                    "",
            }
        );
    }

    /*
        IMPORTANT CHANGE:

        Every dynamic column that exists
        in the currently uploaded Excel
        becomes the source of truth.

        If the column exists but the
        employee's cell is blank, the
        stored value becomes blank.

        We do NOT invent any value.
    */

    for (
        const column
        of Array.isArray(
            allColumns
        )
            ? allColumns
            : []
    ) {
        if (
            !column?.isDynamic
        ) {
            continue;
        }

        const key =
            normalizeDynamicKey(
                column.key ||
                column.header
            );

        if (!key) {
            continue;
        }

        if (!map.has(key)) {
            map.set(
                key,
                {
                    section:
                        textValue(
                            column.section,
                            "Excel Additional Fields"
                        ),

                    label:
                        textValue(
                            column.header
                        ),

                    key,

                    value: "",
                }
            );
        }
    }

    for (
        const field
        of Array.isArray(
            incomingFields
        )
            ? incomingFields
            : []
    ) {
        const key =
            normalizeDynamicKey(
                field?.key ||
                field?.label
            );

        if (!key) {
            continue;
        }

        map.set(
            key,
            {
                section:
                    textValue(
                        field?.section,
                        "Excel Additional Fields"
                    ),

                label:
                    textValue(
                        field?.label
                    ),

                key,

                value:
                    field?.value ===
                        undefined ||
                        field?.value ===
                        null
                        ? ""
                        : field.value,
            }
        );
    }

    return Array.from(
        map.values()
    );
};

// =====================================================
// EXCEL SOURCE-OF-TRUTH HELPERS
// =====================================================

/*
    These fields are managed by Excel
    whenever the corresponding column
    exists in the uploaded sheet.

    RULE:

    Column exists + value exists
    -> save value.

    Column exists + blank cell
    -> save blank.

    Column does not exist
    -> clear old Excel-managed value.

    This prevents old generated values
    such as:

    EMP0029
    emp0029@employee.local
    WEHA001

    from remaining on an employee when
    they are not actually present in
    the uploaded Excel.
*/

const EXCEL_MANAGED_FIELDS =
    EMPLOYEE_FIELDS.filter(
        (field) =>
            ![
                "bio",
            ].includes(field)
    );

const getExcelKnownColumns = (
    columns = []
) => {
    const fields =
        new Set();

    for (
        const column
        of columns
    ) {
        if (
            column?.isDynamic ||
            !column?.knownField
        ) {
            continue;
        }

        if (
            column.knownField ===
            "excelAction" ||
            column.knownField ===
            "password" ||
            column.knownField ===
            "role"
        ) {
            continue;
        }

        fields.add(
            column.knownField
        );
    }

    return fields;
};

const getEmptyValueForEmployeeField =
    (field) => {
        if (
            DATE_FIELDS.has(
                field
            )
        ) {
            return null;
        }

        if (
            NUMBER_FIELDS.has(
                field
            )
        ) {
            return null;
        }

        return "";
    };

const buildExcelSourceOfTruthData = ({
    employeeData = {},
    knownData = {},
    columns = [],
}) => {
    const result = {};

    const excelKnownColumns =
        getExcelKnownColumns(
            columns
        );

    /*
        First clear all Excel-managed
        fields.

        This is intentional.

        If the Excel did not provide a
        field, we do NOT retain an old
        fake/generated value.
    */

    for (
        const field
        of EXCEL_MANAGED_FIELDS
    ) {
        result[field] =
            getEmptyValueForEmployeeField(
                field
            );
    }

    /*
        Then apply only the real values
        supplied by Excel.
    */

    for (
        const [
            field,
            value,
        ]
        of Object.entries(
            employeeData
        )
    ) {
        if (
            [
                "dynamicFields",
                "customFields",
                "customSections",
            ].includes(field)
        ) {
            continue;
        }

        if (
            !EXCEL_MANAGED_FIELDS.includes(
                field
            )
        ) {
            continue;
        }

        result[field] =
            value;
    }

    /*
        Name needs special handling.

        If Excel contains any name
        column, use the parsed values.

        If it contains no name columns,
        the values remain blank rather
        than being manufactured.
    */

    const hasNameColumn =
        excelKnownColumns.has(
            "name"
        ) ||
        excelKnownColumns.has(
            "firstName"
        ) ||
        excelKnownColumns.has(
            "lastName"
        );

    if (hasNameColumn) {
        const names =
            splitEmployeeName(
                knownData.name,
                knownData.firstName,
                knownData.lastName
            );

        result.name =
            names.name;

        result.firstName =
            names.firstName;

        result.lastName =
            names.lastName;
    }

    return result;
};

// =====================================================
// CREATE EMPLOYEE
// =====================================================

export const createEmployee =
    async (req, res) => {
        try {
            await removeLegacyEmployeeUniqueIndexes();

            const source =
                req.body || {};

            const names =
                splitEmployeeName(
                    source.name,
                    source.firstName,
                    source.lastName
                );

            if (
                !names.name
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Employee name is required",
                    });
            }

            const employeeCode =
                source.employeeCode !==
                    undefined
                    ? String(
                        source.employeeCode ||
                        ""
                    ).trim()
                    : "";

            const email =
                source.email !==
                    undefined
                    ? String(
                        source.email ||
                        ""
                    )
                        .trim()
                        .toLowerCase()
                    : "";

            /*
                IMPORTANT:

                employeeCode is NEVER
                generated here.

                email is NEVER generated
                here.

                If admin leaves them
                blank, they stay blank.
            */

            let user = null;
            let temporaryPassword =
                "";

            if (email) {
                const existingUser =
                    await User.findOne({
                        email,
                    });

                if (
                    existingUser
                ) {
                    return res
                        .status(409)
                        .json({
                            error:
                                "A user with this email already exists",
                        });
                }

                temporaryPassword =
                    generateTemporaryPassword(
                        names.name,
                        getEmployeePhoneForPassword(
                            source
                        )
                    );

                if (
                    !temporaryPassword
                ) {
                    return res
                        .status(400)
                        .json({
                            error:
                                "At least 3 letters in employee name and 3 digits in phone/mobile number are required to generate the temporary password",
                        });
                }

                const hashedPassword =
                    await bcrypt.hash(
                        temporaryPassword,
                        10
                    );

                user =
                    await User.create({
                        email,
                        password:
                            hashedPassword,
                        role:
                            textValue(
                                source.role,
                                "EMPLOYEE"
                            ).toUpperCase() ===
                                "ADMIN"
                                ? "ADMIN"
                                : "EMPLOYEE",
                    });
            }

            try {
                const employeeData =
                    buildEmployeeData(
                        {
                            ...source,
                            name:
                                names.name,
                            firstName:
                                names.firstName,
                            lastName:
                                names.lastName,
                            employeeCode,
                            email,
                        }
                    );

                const employee =
                    await Employee.create({
                        ...employeeData,

                        userId:
                            user?._id ||
                            null,
                        temporaryPassword:
                            user
                                ? temporaryPassword
                                : "",

                        employeeCode,

                        email,

                        dynamicFields:
                            Array.isArray(
                                source.dynamicFields
                            )
                                ? source.dynamicFields
                                : [],

                        customFields:
                            Array.isArray(
                                source.customFields
                            )
                                ? source.customFields
                                : [],

                        customSections:
                            Array.isArray(
                                source.customSections
                            )
                                ? source.customSections
                                : [],

                        isDeleted:
                            false,
                    });

                return res
                    .status(201)
                    .json({
                        success:
                            true,

                        message:
                            user
                                ? "Employee and login account created successfully"
                                : "Employee created successfully",

                        employee,

                        temporaryPassword:
                            user
                                ? temporaryPassword
                                : null,
                    });
            } catch (
            employeeError
            ) {
                /*
                    If User was created
                    but Employee creation
                    failed, remove the
                    orphan login account.
                */

                if (user?._id) {
                    try {
                        await User.findByIdAndDelete(
                            user._id
                        );
                    } catch (
                    cleanupError
                    ) {
                        console.error(
                            "Create employee user cleanup error:",
                            cleanupError
                        );
                    }
                }

                throw employeeError;
            }
        } catch (error) {
            console.error(
                "Create Employee Error:",
                error
            );

            if (
                error?.code ===
                11000
            ) {
                return res
                    .status(409)
                    .json({
                        error:
                            "Duplicate employee data",
                    });
            }

            return res
                .status(500)
                .json({
                    error:
                        error.message ||
                        "Failed to create employee",
                });
        }
    };

// =====================================================
// GET EMPLOYEES
// =====================================================

export const getEmployees =
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
                        createdAt: -1,
                    })
                    .lean();

            return res.json(
                employees
            );
        } catch (error) {
            console.error(
                "Get Employees Error:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Failed to fetch employees",
                });
        }
    };

// =====================================================
// GET EMPLOYEE BY ID
// =====================================================

export const getEmployeeById =
    async (req, res) => {
        try {
            const employee =
                await Employee.findOne({
                    _id:
                        req.params.id,

                    isDeleted: {
                        $ne: true,
                    },
                })
                    .populate(
                        "userId",
                        "email role"
                    )
                    .lean();

            if (!employee) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Employee not found",
                    });
            }

            return res.json(
                employee
            );
        } catch (error) {
            console.error(
                "Get Employee By ID Error:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Failed to fetch employee",
                });
        }
    };

// =====================================================
// UPDATE EMPLOYEE
// =====================================================

export const updateEmployee =
    async (req, res) => {
        try {
            await removeLegacyEmployeeUniqueIndexes();

            const employee =
                await Employee.findOne({
                    _id:
                        req.params.id,

                    isDeleted: {
                        $ne: true,
                    },
                });

            if (!employee) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Employee not found",
                    });
            }

            const source =
                req.body || {};

            /*
                IMPORTANT:

                undefined
                -> preserve old value

                explicit ""
                -> save blank

                No generated employee
                code/email/default data.
            */

            const requestedCode =
                source.employeeCode !==
                    undefined
                    ? String(
                        source.employeeCode ||
                        ""
                    ).trim()
                    : employee.employeeCode;

            const requestedEmail =
                source.email !==
                    undefined
                    ? String(
                        source.email ||
                        ""
                    )
                        .trim()
                        .toLowerCase()
                    : employee.email;

            const employeeData =
                buildEmployeeData(
                    source,
                    employee
                );

            let loginUser =
                null;

            let temporaryPassword =
                "";

            if (
                employee.userId
            ) {
                loginUser =
                    await User.findById(
                        employee.userId
                    );
            }

            /*
                Existing employee has
                email but no linked User.

                Create/link the login
                automatically if enough
                information exists for
                the temporary password.
            */

            if (
                !loginUser &&
                requestedEmail
            ) {
                const existingUser =
                    await User.findOne({
                        email:
                            requestedEmail,
                    });

                if (
                    existingUser
                ) {
                    const linkedEmployee =
                        await Employee.findOne({
                            userId:
                                existingUser._id,

                            _id: {
                                $ne:
                                    employee._id,
                            },
                        });

                    if (
                        linkedEmployee
                    ) {
                        return res
                            .status(409)
                            .json({
                                error:
                                    "Email already belongs to another employee login account",
                            });
                    }

                    loginUser =
                        existingUser;
                } else {
                    const updatedName =
                        employeeData.name ||
                        employee.name ||
                        `${employeeData.firstName || employee.firstName || ""} ${employeeData.lastName || employee.lastName || ""}`.trim();

                    temporaryPassword =
                        generateTemporaryPassword(
                            updatedName,

                            getEmployeePhoneForPassword(
                                {
                                    ...employee.toObject(),
                                    ...employeeData,
                                    ...source,
                                }
                            )
                        );

                    if (
                        temporaryPassword
                    ) {
                        loginUser =
                            await User.create({
                                email:
                                    requestedEmail,

                                password:
                                    await bcrypt.hash(
                                        temporaryPassword,
                                        10
                                    ),

                                role:
                                    textValue(
                                        source.role,
                                        "EMPLOYEE"
                                    ).toUpperCase() ===
                                        "ADMIN"
                                        ? "ADMIN"
                                        : "EMPLOYEE",
                            });
                    }
                }
            }

            /*
                Update linked User.

                Frontend no longer sends
                a manually entered
                password, but explicit
                API password support is
                kept for compatibility.
            */

            if (loginUser) {
                if (
                    requestedEmail
                ) {
                    loginUser.email =
                        requestedEmail;
                }

                if (
                    source.role !==
                    undefined
                ) {
                    loginUser.role =
                        textValue(
                            source.role,
                            "EMPLOYEE"
                        ).toUpperCase() ===
                            "ADMIN"
                            ? "ADMIN"
                            : "EMPLOYEE";
                }

                if (
                    source.password !==
                    undefined &&
                    textValue(
                        source.password
                    )
                ) {
                    loginUser.password =
                        await bcrypt.hash(
                            textValue(
                                source.password
                            ),
                            10
                        );
                }

                await loginUser.save();
            }

            Object.assign(
                employee,
                employeeData
            );

            employee.employeeCode =
                requestedCode;

            employee.email =
                requestedEmail;

            employee.userId =
                loginUser?._id ||
                employee.userId ||
                null;

            if (temporaryPassword) {
                employee.temporaryPassword =
                    temporaryPassword;
            }

            await employee.save();

            return res.json({
                success: true,

                message:
                    "Employee updated successfully",

                employee,

                temporaryPassword:
                    temporaryPassword ||
                    null,
            });
        } catch (error) {
            console.error(
                "Update Employee Error:",
                error
            );

            if (
                error?.code ===
                11000
            ) {
                return res
                    .status(409)
                    .json({
                        error:
                            "Duplicate employee data",
                    });
            }

            return res
                .status(500)
                .json({
                    error:
                        error.message ||
                        "Failed to update employee",
                });
        }
    };
// =====================================================
// DELETE EMPLOYEE
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
            return res
                .status(404)
                .json({
                    error:
                        "Employee not found",
                });
        }

        if (employee.isDeleted) {
            return res.json({
                success: true,
                message:
                    "Employee already deleted",
            });
        }

        employee.isDeleted =
            true;

        employee.employmentStatus =
            "INACTIVE";

        await employee.save();

        return res.json({
            success: true,

            message:
                "Employee deleted successfully",
        });
    } catch (error) {
        console.error(
            "Delete Employee Error:",
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
// EMPLOYEE PUBLIC PROFILE
// =====================================================

export const getEmployeePublicProfile =
    async (req, res) => {
        try {
            const employee =
                await Employee.findOne({
                    _id:
                        req.params.id,

                    isDeleted: {
                        $ne: true,
                    },
                })
                    .select(
                        [
                            "name",
                            "firstName",
                            "lastName",
                            "employeeCode",
                            "department",
                            "position",
                            "image",
                            "bio",
                            "skills",
                            "email",
                            "phone",
                            "joinDate",
                        ].join(" ")
                    )
                    .lean();

            if (!employee) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Employee not found",
                    });
            }

            return res.json({
                ...employee,

                id:
                    employee._id.toString(),
            });
        } catch (error) {
            console.error(
                "Get Employee Public Profile Error:",
                error
            );

            return res
                .status(500)
                .json({
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

                    employmentStatus: {
                        $ne:
                            "INACTIVE",
                    },
                })
                    .populate(
                        "userId",
                        "email role"
                    )
                    .select(
                        [
                            "userId",
                            "name",
                            "firstName",
                            "lastName",
                            "employeeCode",
                            "department",
                            "position",
                            "image",
                            "email",
                            "phone",
                        ].join(" ")
                    )
                    .sort({
                        firstName: 1,
                        lastName: 1,
                        name: 1,
                    })
                    .lean();

            const currentUserId =
                req.session
                    ?.userId
                    ? String(
                        req.session
                            .userId
                    )
                    : "";

            const directory =
                employees
                    .filter(
                        (employee) =>
                            !currentUserId ||
                            !employee.userId ||
                            String(
                                employee
                                    .userId
                                    ._id ||
                                employee
                                    .userId
                            ) !==
                            currentUserId
                    )
                    .map(
                        (employee) => ({
                            id:
                                employee._id.toString(),

                            _id:
                                employee._id,

                            userId:
                                employee.userId
                                    ? employee
                                        .userId
                                        ._id ||
                                    employee
                                        .userId
                                    : null,

                            name:
                                employee.name ||
                                `${employee.firstName || ""} ${employee.lastName || ""
                                    }`
                                    .replace(
                                        /\s+/g,
                                        " "
                                    )
                                    .trim(),

                            firstName:
                                employee.firstName ||
                                "",

                            lastName:
                                employee.lastName ||
                                "",

                            employeeCode:
                                employee.employeeCode ||
                                "",

                            department:
                                employee.department ||
                                "",

                            position:
                                employee.position ||
                                "",

                            image:
                                employee.image ||
                                null,

                            email:
                                employee.email ||
                                employee
                                    .userId
                                    ?.email ||
                                "",

                            phone:
                                employee.phone ||
                                "",

                            role:
                                employee
                                    .userId
                                    ?.role ||
                                "EMPLOYEE",
                        })
                    );

            return res.json(
                directory
            );
        } catch (error) {
            console.error(
                "Get Employee Directory Error:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Failed to fetch employee directory",
                });
        }
    };

// =====================================================
// EXPORT EMPLOYEES
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
// - Existing employees are also matched by employee name.
// - Same person = update same employee card.
// - Blank/missing Excel values clear old Excel-managed employee values.
// - Action DELETE / REMOVE can soft-delete an employee.
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

            const workbook =
                XLSX.read(
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
                workbook
                    .SheetNames[0]
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
                !Array.isArray(
                    rawRows
                ) ||
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

            let headerRowIndex =
                -1;

            let highestScore =
                -1;

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
                    rawRows[r] ||
                    [];

                let score = 0;
                let nonEmpty = 0;

                for (
                    const cell
                    of row
                ) {
                    const value =
                        cleanExcelValue(
                            cell
                        );

                    if (!value) {
                        continue;
                    }

                    nonEmpty++;

                    if (
                        resolveExcelField(
                            value
                        )
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

                if (
                    nonEmpty >=
                    3
                ) {
                    score +=
                        nonEmpty;
                }

                if (
                    score >
                    highestScore
                ) {
                    highestScore =
                        score;

                    headerRowIndex =
                        r;
                }
            }

            if (
                headerRowIndex <
                0
            ) {
                headerRowIndex =
                    0;
            }

            console.log(
                "Detected Excel header row:",
                headerRowIndex +
                1
            );

            // =============================================
            // BUILD COLUMN MAP
            // =============================================

            const headerRow =
                rawRows[
                headerRowIndex
                ] || [];

            const columns = [];

            for (
                let c = 0;
                c <
                headerRow.length;
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

                const key =
                    isDynamic
                        ? dynamicKey(
                            "Excel Fields",
                            rawHeader
                        )
                        : null;

                columns.push({
                    columnIndex:
                        c,

                    header:
                        rawHeader,

                    knownField,

                    isDynamic,

                    key,

                    section:
                        "Excel Fields",
                });
            }

            if (
                columns.length ===
                0
            ) {
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
                        (
                            column
                        ) =>
                            column.isDynamic
                    )
                    .map(
                        (
                            column
                        ) => ({
                            section:
                                column.section,

                            label:
                                column.header,

                            key:
                                column.key,
                        })
                    );

            // =============================================
            // ADD NEW DYNAMIC COLUMNS TO EXISTING CARDS
            // =============================================

            if (
                dynamicColumns.length >
                0
            ) {
                const allEmployees =
                    await Employee.find(
                        {}
                    )
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

            const employeesByName =
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

                if (
                    !map.has(
                        key
                    )
                ) {
                    map.set(
                        key,
                        []
                    );
                }

                map
                    .get(key)
                    .push(
                        employee
                    );
            };

            const addNameToMap =
                (
                    employee
                ) => {
                    const key =
                        employeeDocumentName(
                            employee
                        );

                    if (!key) {
                        return;
                    }

                    if (
                        !employeesByName.has(
                            key
                        )
                    ) {
                        employeesByName.set(
                            key,
                            []
                        );
                    }

                    employeesByName
                        .get(key)
                        .push(
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

                addNameToMap(
                    employee
                );
            }

            const chooseCandidate =
                (
                    candidates,
                    excelName
                ) => {
                    if (
                        !Array.isArray(
                            candidates
                        ) ||
                        candidates.length ===
                        0
                    ) {
                        return null;
                    }

                    if (
                        candidates.length ===
                        1
                    ) {
                        return candidates[0];
                    }

                    const normalizedName =
                        normalizeNameForMatch(
                            excelName
                        );

                    if (
                        !normalizedName
                    ) {
                        return null;
                    }

                    const exactNames =
                        candidates.filter(
                            (
                                candidate
                            ) =>
                                employeeDocumentName(
                                    candidate
                                ) ===
                                normalizedName
                        );

                    const activeExact =
                        exactNames.find(
                            (
                                candidate
                            ) =>
                                candidate.isDeleted !==
                                true
                        );

                    if (
                        activeExact
                    ) {
                        return activeExact;
                    }

                    const deletedExact =
                        exactNames.find(
                            (
                                candidate
                            ) =>
                                candidate.isDeleted ===
                                true
                        );

                    if (
                        deletedExact
                    ) {
                        return deletedExact;
                    }

                    if (
                        exactNames.length ===
                        1
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
            let deleted = 0;

            const skipped = [];

            const processedEmployeeIds =
                new Set();

            // =============================================
            // PROCESS EVERY EXCEL ROW
            // =============================================

            for (
                let r =
                    headerRowIndex +
                    1;

                r <
                rawRows.length;

                r++
            ) {
                const row =
                    rawRows[r] ||
                    [];

                const excelRow =
                    r + 1;

                if (
                    !row.some(
                        (
                            cell
                        ) =>
                            !isEmptyExcelValue(
                                cell
                            )
                    )
                ) {
                    continue;
                }

                let createdLoginUserIdForRow =
                    null;

                try {
                    const knownData =
                        {};

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

                        /*
                            IMPORTANT:

                            For known Excel columns we keep
                            the column even when the cell
                            is blank.

                            That allows the upload to clear
                            old values instead of silently
                            preserving them.
                        */

                        knownData[
                            column.knownField
                        ] = value;
                    }

                    // =====================================
                    // EXCEL ACTION
                    // =====================================

                    const excelAction =
                        cleanExcelValue(
                            knownData.excelAction
                        )
                            .toUpperCase()
                            .trim();

                    delete knownData.excelAction;

                    // =====================================
                    // OPTIONAL EMPLOYEE NAME
                    // =====================================

                    const names =
                        splitEmployeeName(
                            knownData.name,
                            knownData.firstName,
                            knownData.lastName
                        );

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

                    const normalizedName =
                        normalizeNameForMatch(
                            names.name
                        );

                    // -------------------------------------
                    // 1. EMPLOYEE CODE
                    // -------------------------------------

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

                    // -------------------------------------
                    // 2. EMAIL
                    // -------------------------------------

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

                    // -------------------------------------
                    // 3. AADHAAR
                    // -------------------------------------

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

                    // -------------------------------------
                    // 4. UAN
                    // -------------------------------------

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

                    // -------------------------------------
                    // 5. BANK ACCOUNT
                    // -------------------------------------

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

                    // -------------------------------------
                    // 6. MOBILE NUMBER
                    // -------------------------------------

                    if (
                        !existingEmployee &&
                        mobile
                    ) {
                        existingEmployee =
                            chooseCandidate(
                                employeesByMobile.get(
                                    mobile
                                ),
                                names.name
                            );
                    }

                    // -------------------------------------
                    // 7. PHONE NUMBER
                    // -------------------------------------

                    if (
                        !existingEmployee &&
                        phone
                    ) {
                        existingEmployee =
                            chooseCandidate(
                                employeesByPhone.get(
                                    phone
                                ),
                                names.name
                            );
                    }

                    // -------------------------------------
                    // 8. EMPLOYEE NAME
                    // -------------------------------------

                    if (
                        !existingEmployee &&
                        normalizedName
                    ) {
                        existingEmployee =
                            chooseCandidate(
                                employeesByName.get(
                                    normalizedName
                                ),
                                names.name
                            );
                    }
                    // =====================================
                    // DELETE / REMOVE ACTION
                    // =====================================

                    if (
                        ["DELETE", "REMOVE"].includes(
                            excelAction
                        )
                    ) {
                        if (
                            !existingEmployee
                        ) {
                            skipped.push({
                                row:
                                    excelRow,

                                reason:
                                    "Employee not found for delete/remove action",
                            });

                            continue;
                        }

                        if (
                            processedEmployeeIds.has(
                                existingEmployee
                                    ._id
                                    .toString()
                            )
                        ) {
                            skipped.push({
                                row:
                                    excelRow,

                                reason:
                                    "Another row in this Excel file already matched this employee",
                            });

                            continue;
                        }

                        processedEmployeeIds.add(
                            existingEmployee
                                ._id
                                .toString()
                        );

                        await Employee.updateOne(
                            {
                                _id:
                                    existingEmployee._id,
                            },
                            {
                                $set: {
                                    isDeleted:
                                        true,

                                    employmentStatus:
                                        "INACTIVE",
                                },
                            }
                        );

                        existingEmployee.isDeleted =
                            true;

                        existingEmployee.employmentStatus =
                            "INACTIVE";

                        deleted++;

                        continue;
                    }

                    // =====================================
                    // EXISTING EMPLOYEE
                    // =====================================

                    if (
                        existingEmployee
                    ) {
                        const employeeId =
                            existingEmployee
                                ._id
                                .toString();

                        if (
                            processedEmployeeIds.has(
                                employeeId
                            )
                        ) {
                            skipped.push({
                                row:
                                    excelRow,

                                employee:
                                    names.name,

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

                        /*
                            SOURCE OF TRUTH:

                            Existing data is NOT silently
                            preserved for Excel-managed
                            employee fields.

                            Missing/blank Excel data clears
                            the old value.

                            This is what prevents stale
                            generated values such as:

                            EMP0029
                            emp0029@employee.local
                            WEHA001

                            from remaining visible.
                        */

                        const updateData =
                            buildExcelSourceOfTruthData({
                                employeeData,
                                knownData,
                                columns,
                            });

                        /*
                            Preserve values which are NOT
                            supposed to be controlled by
                            the Excel employee-data sheet.
                        */

                        updateData.userId =
                            existingEmployee.userId ||
                            null;

                        updateData.image =
                            existingEmployee.image ||
                            null;

                        updateData.cvUrl =
                            existingEmployee.cvUrl ||
                            null;

                        updateData.cvFileName =
                            existingEmployee.cvFileName ||
                            null;

                        updateData.documents =
                            Array.isArray(
                                existingEmployee.documents
                            )
                                ? existingEmployee.documents
                                : [];

                        updateData.skills =
                            Array.isArray(
                                existingEmployee.skills
                            )
                                ? existingEmployee.skills
                                : [];

                        updateData.customFields =
                            Array.isArray(
                                existingEmployee.customFields
                            )
                                ? existingEmployee.customFields
                                : [];

                        updateData.customSections =
                            Array.isArray(
                                existingEmployee.customSections
                            )
                                ? existingEmployee.customSections
                                : [];

                        updateData.bio =
                            existingEmployee.bio ||
                            "";

                        updateData.dynamicFields =
                            mergeDynamicFields(
                                existingEmployee.dynamicFields ||
                                [],

                                incomingDynamic,

                                dynamicColumns
                            );

                        /*
                            If employee was deleted earlier
                            but appears normally in Excel,
                            restore the card.
                        */

                        if (
                            wasDeleted
                        ) {
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

                        // ---------------------------------
                        // KEEP LOCAL CACHE UPDATED
                        // ---------------------------------

                        const oldNameKey =
                            employeeDocumentName(
                                existingEmployee
                            );

                        Object.assign(
                            existingEmployee,
                            updateData
                        );

                        const newNameKey =
                            employeeDocumentName(
                                existingEmployee
                            );

                        if (
                            oldNameKey !==
                            newNameKey
                        ) {
                            if (
                                oldNameKey &&
                                employeesByName.has(
                                    oldNameKey
                                )
                            ) {
                                employeesByName.set(
                                    oldNameKey,

                                    employeesByName
                                        .get(
                                            oldNameKey
                                        )
                                        .filter(
                                            (
                                                employee
                                            ) =>
                                                employee
                                                    ._id
                                                    .toString() !==
                                                existingEmployee
                                                    ._id
                                                    .toString()
                                        )
                                );
                            }

                            addNameToMap(
                                existingEmployee
                            );
                        }

                        /*
                            Re-add current identifiers to
                            caches so later rows in the SAME
                            upload use the latest values.
                        */

                        addToMap(
                            employeesByCode,
                            existingEmployee.employeeCode,
                            existingEmployee
                        );

                        addToMap(
                            employeesByEmail,
                            existingEmployee.email,
                            existingEmployee
                        );

                        addToMap(
                            employeesByAadhar,
                            existingEmployee.aadharNumber,
                            existingEmployee
                        );

                        addToMap(
                            employeesByUan,
                            existingEmployee.uanNumber,
                            existingEmployee
                        );

                        addToMap(
                            employeesByBank,
                            existingEmployee.bankAccountNumber,
                            existingEmployee
                        );

                        addToMap(
                            employeesByMobile,
                            existingEmployee.mobileNumber,
                            existingEmployee
                        );

                        addToMap(
                            employeesByPhone,
                            existingEmployee.phone,
                            existingEmployee
                        );

                        continue;
                    }

                    // =====================================
                    // CREATE NEW EMPLOYEE
                    // =====================================

                    /*
                        For a new employee:

                        Start from completely blank/default
                        employee fields.

                        Then apply ONLY data from the Excel.

                        No employee code is invented.
                        No email is invented.
                        No vendor code is invented.
                        No department is invented.
                        No designation is invented.
                        No salary is invented.
                        No dates are invented.
                    */

                    const excelSourceData =
                        buildExcelSourceOfTruthData({
                            employeeData,
                            knownData,
                            columns,
                        });

                    const newEmployeeData = {
                        ...excelSourceData,

                        dynamicFields:
                            mergeDynamicFields(
                                [],
                                incomingDynamic,
                                dynamicColumns
                            ),

                        customFields:
                            [],

                        customSections:
                            [],

                        isDeleted:
                            false,
                    };

                    // =====================================
                    // CREATE / LINK LOGIN USER
                    // =====================================

                    let excelLoginUser =
                        null;

                    let excelTemporaryPassword =
                        "";

                    const newEmployeeEmail =
                        textValue(
                            newEmployeeData.email
                        )
                            .trim()
                            .toLowerCase();

                    /*
                        Login account is created ONLY when
                        the Excel genuinely contains an
                        email.

                        We never manufacture an email such
                        as:

                        emp0029@employee.local
                    */

                    if (
                        newEmployeeEmail
                    ) {
                        const existingUserForExcel =
                            await User.findOne({
                                email:
                                    newEmployeeEmail,
                            });

                        if (
                            existingUserForExcel
                        ) {
                            const linkedEmployee =
                                await Employee.findOne({
                                    userId:
                                        existingUserForExcel._id,
                                });

                            if (
                                linkedEmployee
                            ) {
                                throw new Error(
                                    "Email already belongs to another employee login account"
                                );
                            }

                            excelLoginUser =
                                existingUserForExcel;
                        } else {
                            excelTemporaryPassword =
                                generateTemporaryPassword(
                                    newEmployeeData.name ||
                                    `${newEmployeeData.firstName || ""} ${newEmployeeData.lastName || ""}`
                                        .replace(
                                            /\s+/g,
                                            " "
                                        )
                                        .trim(),

                                    getEmployeePhoneForPassword(
                                        newEmployeeData
                                    )
                                );

                            /*
                                Do not fail the whole employee
                                import if password cannot be
                                generated.

                                Employee record can still exist
                                without a linked User.
                            */

                            if (
                                excelTemporaryPassword
                            ) {
                                excelLoginUser =
                                    await User.create({
                                        email:
                                            newEmployeeEmail,

                                        password:
                                            await bcrypt.hash(
                                                excelTemporaryPassword,
                                                10
                                            ),

                                        role:
                                            textValue(
                                                knownData.role,
                                                "EMPLOYEE"
                                            )
                                                .toUpperCase() ===
                                                "ADMIN"
                                                ? "ADMIN"
                                                : "EMPLOYEE",
                                    });

                                createdLoginUserIdForRow =
                                    excelLoginUser._id;
                            }
                        }
                    }

                    const newEmployee =
                        await Employee.create({
                            ...newEmployeeData,

                            userId:
                                excelLoginUser?._id ||
                                null,

                            temporaryPassword:
                                excelLoginUser
                                    ? excelTemporaryPassword
                                    : "",
                        });

                    createdLoginUserIdForRow =
                        null;

                    created++;

                    processedEmployeeIds.add(
                        newEmployee
                            ._id
                            .toString()
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

                    addNameToMap(
                        cacheEmployee
                    );
                } catch (
                rowError
                ) {
                    /*
                        If a login User was created for this
                        Excel row but Employee creation later
                        failed, remove the orphan User.
                    */

                    if (
                        createdLoginUserIdForRow
                    ) {
                        try {
                            await User.findByIdAndDelete(
                                createdLoginUserIdForRow
                            );
                        } catch (
                        cleanupError
                        ) {
                            console.error(
                                "Excel login cleanup error:",
                                cleanupError
                            );
                        }
                    }

                    console.error(
                        `Excel Row ${excelRow} Error:`,
                        rowError
                    );

                    skipped.push({
                        row:
                            excelRow,

                        reason:
                            rowError?.code ===
                                11000
                                ? `Duplicate value blocked by MongoDB index${rowError?.keyPattern
                                    ? ` (${Object.keys(
                                        rowError.keyPattern
                                    ).join(", ")})`
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
                    deleted,
                    skipped:
                        skipped.length,
                }
            );

            if (
                skipped.length >
                0
            ) {
                console.table(
                    skipped
                );
            }

            return res.json({
                success:
                    true,

                created,

                updated,

                restored,

                deleted,

                skippedCount:
                    skipped.length,

                skipped,

                dynamicColumns,

                headerRow:
                    headerRowIndex +
                    1,

                totalRowsProcessed:
                    created +
                    updated +
                    deleted +
                    skipped.length,

                message:
                    `${created} created, ` +
                    `${updated} updated, ` +
                    `${restored} restored, ` +
                    `${deleted} deleted, ` +
                    `${skipped.length} skipped`,
            });
        } catch (error) {
            console.error(
                "Bulk Upload Error:",
                error
            );

            return res
                .status(500)
                .json({
                    success:
                        false,

                    error:
                        error.message ||
                        "Failed to upload Excel file",
                });
        }
    };

// =====================================================
// GET EMPLOYEE DOCUMENTS
// =====================================================

export const getEmployeeDocuments = async (
    req,
    res
) => {
    try {
        const employee =
            await Employee.findOne({
                _id:
                    req.params.id,

                isDeleted: {
                    $ne: true,
                },
            }).lean();

        if (!employee) {
            return res
                .status(404)
                .json({
                    error:
                        "Employee not found",
                });
        }

        const documents =
            Array.isArray(
                employee.documents
            )
                ? employee.documents
                : [];

        return res.json({
            success: true,
            documents,
        });
    } catch (error) {
        console.error(
            "Get Employee Documents Error:",
            error
        );

        return res
            .status(500)
            .json({
                error:
                    "Failed to fetch employee documents",
            });
    }
};

// =====================================================
// DOWNLOAD EMPLOYEE DOCUMENT
// =====================================================

export const downloadEmployeeDocument =
    async (req, res) => {
        try {
            const {
                id,
                documentId,
            } = req.params;

            const employee =
                await Employee.findOne({
                    _id:
                        id,

                    isDeleted: {
                        $ne: true,
                    },
                }).lean();

            if (!employee) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Employee not found",
                    });
            }

            const documents =
                Array.isArray(
                    employee.documents
                )
                    ? employee.documents
                    : [];

            const document =
                documents.find(
                    (doc) =>
                        String(
                            doc._id ||
                            doc.id
                        ) ===
                        String(
                            documentId
                        )
                );

            if (!document) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Employee document not found",
                    });
            }

            const documentUrl =
                document.url ||
                document.fileUrl ||
                document.documentUrl ||
                document.path ||
                "";

            if (!documentUrl) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Document URL not found",
                    });
            }

            return res.redirect(
                documentUrl
            );
        } catch (error) {
            console.error(
                "Download Employee Document Error:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Failed to download employee document",
                });
        }
    };