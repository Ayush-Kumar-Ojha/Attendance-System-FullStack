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

        /*
            IMPORTANT:

            Email is NOT included here anymore.

            Email will remain protected as a unique
            employee identifier.

            Only old optional unique indexes for
            userId / employeeCode can be cleaned.
        */

        const optionalFields =
            new Set([
                "userId",
                "employeeCode",
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

// =====================================================
// EMAIL HELPERS
// =====================================================

const DUPLICATE_EMPLOYEE_EMAIL_MESSAGE =
    "This employee already exists with this email ID.";

const EMAIL_REQUIRED_MESSAGE =
    "Email ID is required.";

const EXCEL_EMAIL_REQUIRED_MESSAGE =
    "Email ID is required in the Excel file.";

const normalizeEmail = (
    value
) =>
    textValue(value)
        .trim()
        .toLowerCase();

const findEmployeeByEmail =
    async (
        email,
        excludeEmployeeId = null
    ) => {
        const normalizedEmail =
            normalizeEmail(
                email
            );

        if (
            !normalizedEmail
        ) {
            return null;
        }

        const query = {
            email:
                normalizedEmail,
        };

        if (
            excludeEmployeeId
        ) {
            query._id = {
                $ne:
                    excludeEmployeeId,
            };
        }

        /*
            DO NOT filter by isDeleted.

            Deleted and permanently-hidden employees
            still reserve their email ID.
        */

        return Employee.findOne(
            query
        );
    };

const getEmployeeDisplayName = (
    employee
) =>
    textValue(
        employee?.name ||
        `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim(),
        "Existing employee"
    );

const buildEmailConflictPayload = (
    employee,
    message = null
) => {
    const employeeName =
        getEmployeeDisplayName(
            employee
        );

    const canGenerateExistingCard =
        Boolean(
            employee?.isDeleted ||
            employee?.isPermanentlyHidden
        );

    return {
        error:
            message ||
            `This email ID already exists for employee ${employeeName}.`,

        conflictType:
            "EMPLOYEE_EMAIL_EXISTS",

        existingEmployee: {
            employeeId:
                employee?._id?.toString?.() ||
                String(
                    employee?._id ||
                    ""
                ),

            name:
                employeeName,

            email:
                normalizeEmail(
                    employee?.email
                ),

            isDeleted:
                Boolean(
                    employee?.isDeleted
                ),

            isPermanentlyHidden:
                Boolean(
                    employee?.isPermanentlyHidden
                ),
        },

        canGenerateExistingCard,
    };
};

// =====================================================
// TEMPORARY PASSWORD
// =====================================================
//
// Temporary password format:
//
// first up to 3 alphabetic characters from employee name
// + @#123
//
// Examples:
//
// Ayush => Ayu@#123
// Om    => Om@#123
//
// IMPORTANT:
//
// Temporary password is generated only when the employee's
// login account is originally created.
//
// Updating from Excel does NOT regenerate it.
//
// Editing employee details does NOT regenerate it.
//
// Restoring / regenerating an existing Employee card does
// NOT regenerate it.
//
// Employee.temporaryPassword keeps the original plain
// temporary password visible to Admin.
//
// Authentication continues to use User.password only.
// =====================================================

const generateTemporaryPassword = (
    name
) => {
    const namePart =
        String(name || "")
            .trim()
            .replace(
                /[^A-Za-z]/g,
                ""
            )
            .slice(0, 3);

    if (!namePart) {
        return "";
    }

    return `${namePart}@#123`;
};

// =====================================================
// VALUE HELPERS
// =====================================================

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
            name:
                complete,

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
        name:
            fullName,

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
        [
            "M",
            "MALE",
        ].includes(
            gender
        )
    ) {
        return "MALE";
    }

    if (
        [
            "F",
            "FEMALE",
        ].includes(
            gender
        )
    ) {
        return "FEMALE";
    }

    if (
        [
            "O",
            "OTHER",
        ].includes(
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
            ].includes(
                status
            )
        ) {
            return "SINGLE";
        }

        if (
            [
                "MARRIED",
                "DIVORCED",
                "WIDOWED",
            ].includes(
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
        "yearOfPassing",
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

    if (
        hasNameInput
    ) {
        result.name =
            names.name;

        result.firstName =
            names.firstName;

        result.lastName =
            names.lastName;
    } else if (
        existing
    ) {
        result.name =
            existing.name ||
            `${existing.firstName || ""} ${existing.lastName || ""}`
                .trim();

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
            ].includes(
                field
            )
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
                    normalizeEmail(
                        source[field]
                    );

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
                    )
                        .toUpperCase();

                continue;
            }

            if (
                field ===
                "employmentStatus"
            ) {
                const status =
                    textValue(
                        source[field]
                    )
                        .toUpperCase();

                result[field] =
                    [
                        "ACTIVE",
                        "INACTIVE",
                        "",
                    ].includes(
                        status
                    )
                        ? status
                        : "ACTIVE";

                continue;
            }

            result[field] =
                source[field];
        }
    }

    return result;
};

// =====================================================
// EXCEL HELPERS
// =====================================================

const normalizeExcelHeader = (
    value
) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\*/g, "")
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "")
        .trim();

const cleanExcelValue = (
    value
) => {
    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    if (
        value instanceof Date
    ) {
        return value;
    }

    return String(value)
        .trim();
};

const isEmptyExcelValue = (
    value
) =>
    value ===
    undefined ||
    value ===
    null ||
    (
        typeof value ===
        "string" &&
        value.trim() ===
        ""
    );

const normalizeNameForMatch = (value) => {
    return String(value || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
};

const normalizeDynamicFieldKey = (
    value
) =>
    normalizeExcelHeader(
        value
    );

// =====================================================
// EXCEL FIELD ALIASES
// =====================================================

const EXCEL_FIELD_ALIASES = {
    action:
        "excelAction",

    excelaction:
        "excelAction",

    name:
        "name",

    employeename:
        "name",

    fullname:
        "name",

    firstname:
        "firstName",

    lastname:
        "lastName",

    fathername:
        "fatherName",

    gender:
        "gender",

    bloodgroup:
        "bloodGroup",

    dateofbirth:
        "dateOfBirth",

    dob:
        "dateOfBirth",

    birthdate:
        "dateOfBirth",

    joiningdate:
        "joinDate",

    joindate:
        "joinDate",

    dateofjoining:
        "joinDate",

    birthplace:
        "birthPlace",

    nationality:
        "nationality",

    mothertongue:
        "motherTongue",

    languages:
        "languages",

    language:
        "languages",

    email:
        "email",

    emailid:
        "email",

    employeeemail:
        "email",

    employeeemailid:
        "email",

    phone:
        "phone",

    phonenumber:
        "phone",

    mobile:
        "mobileNumber",

    mobilenumber:
        "mobileNumber",

    passportnumber:
        "passportNumber",

    identificationmark:
        "identificationMark",

    manpowertype:
        "manpowerType",

    vendorcode:
        "vendorCode",

    maritalstatus:
        "maritalStatus",

    numberofchildren:
        "numberOfChildren",

    noofchildren:
        "numberOfChildren",

    safetyissued:
        "safetyIssued",

    shoesize:
        "shoeSize",

    shoeissuedate:
        "shoeIssueDate",

    safetyhelmet:
        "safetyHelmet",

    helmetcolor:
        "helmetColor",

    helmetissuedate:
        "helmetIssueDate",

    jacket:
        "jacket",

    jacketsize:
        "jacketSize",

    jacketissuedate:
        "jacketIssueDate",

    eyeprotectionequipment:
        "eyeProtectionEquipment",

    permanentaddressline1:
        "permanentAddressLine1",

    permanentaddress1:
        "permanentAddressLine1",

    permanentaddressline2:
        "permanentAddressLine2",

    permanentaddress2:
        "permanentAddressLine2",

    permanentcity:
        "permanentCity",

    permanentcountry:
        "permanentCountry",

    permanentstate:
        "permanentState",

    permanentpincode:
        "permanentPinCode",

    presentaddressline1:
        "presentAddressLine1",

    presentaddress1:
        "presentAddressLine1",

    presentaddressline2:
        "presentAddressLine2",

    presentaddress2:
        "presentAddressLine2",

    presentcity:
        "presentCity",

    village:
        "village",

    presentcountry:
        "presentCountry",

    presentstate:
        "presentState",

    presentpincode:
        "presentPinCode",

    emergencycontactpersonname:
        "emergencyContactPersonName",

    emergencycontactname:
        "emergencyContactPersonName",

    emergencycontactpersonrelation:
        "emergencyContactPersonRelation",

    emergencycontactrelation:
        "emergencyContactPersonRelation",

    emergencycontactpersonaddress:
        "emergencyContactPersonAddress",

    emergencymobilenumber:
        "emergencyMobileNumber",

    emergencyphone:
        "emergencyMobileNumber",

    qualification:
        "qualification",

    specialization:
        "specialization",

    collegeschoolname:
        "collegeSchoolName",

    college:
        "collegeSchoolName",

    school:
        "collegeSchoolName",

    boarduniversityname:
        "boardUniversityName",

    university:
        "boardUniversityName",

    yearofpassing:
        "yearOfPassing",

    resume:
        "resume",

    appointmentletter:
        "appointmentLetter",

    degreecertificate:
        "degreeCertificate",

    kycdocument:
        "kycDocument",

    medicalcertificate:
        "medicalCertificate",

    previousemploymentappointmentletter:
        "previousEmploymentAppointmentLetter",

    previousemploymentrelevantexperienceletter:
        "previousEmploymentRelevantExperienceLetter",

    policeverification:
        "policeVerification",

    bankaccountnumber:
        "bankAccountNumber",

    bankaccountname:
        "bankAccountName",

    bankaccounttype:
        "bankAccountType",

    ifsccode:
        "ifscCode",

    bankname:
        "bankName",

    branchname:
        "branchName",

    uannumber:
        "uanNumber",

    uan:
        "uanNumber",

    pfnumber:
        "pfNumber",

    esinumber:
        "esiNumber",

    employeecode:
        "employeeCode",

    department:
        "department",

    designation:
        "position",

    position:
        "position",

    basicsalary:
        "basicSalary",

    allowance:
        "allowances",

    allowances:
        "allowances",

    deduction:
        "deductions",

    deductions:
        "deductions",

    systemrole:
        "role",

    role:
        "role",

    anniversarydate:
        "anniversaryDate",

    confirmationdate:
        "confirmationDate",

    aadharnumber:
        "aadharNumber",

    aadhaarnumber:
        "aadharNumber",

    aadhar:
        "aadharNumber",

    aadhaar:
        "aadharNumber",

    pannumber:
        "panNumber",

    pan:
        "panNumber",

    bio:
        "bio",

    employmentstatus:
        "employmentStatus",

    status:
        "employmentStatus",
};

// =====================================================
// EXCEL DYNAMIC FIELDS
// =====================================================

const buildExcelDynamicFields = (
    row,
    columns
) => {
    const fields = [];

    for (
        const column
        of columns
    ) {
        if (
            !column?.isDynamic
        ) {
            continue;
        }

        const value =
            cleanExcelValue(
                row[
                column.index
                ]
            );

        fields.push({
            section:
                "Excel Additional Fields",

            label:
                column.originalHeader,

            key:
                column.dynamicKey,

            value,
        });
    }

    return fields;
};

const mergeDynamicFields = (
    existingFields = [],
    incomingFields = []
) => {
    const map =
        new Map();

    for (
        const field
        of existingFields || []
    ) {
        const key =
            normalizeDynamicFieldKey(
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

    for (
        const field
        of incomingFields || []
    ) {
        const key =
            normalizeDynamicFieldKey(
                field?.key ||
                field?.label
            );

        if (!key) {
            continue;
        }

        const incomingValue =
            field?.value;

        if (
            isEmptyExcelValue(
                incomingValue
            )
        ) {
            /*
                Blank incoming cells do NOT erase
                an existing custom/dynamic value.
            */

            if (
                !map.has(
                    key
                )
            ) {
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
                            "",
                    }
                );
            }

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
                    incomingValue,
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

const EXCEL_MANAGED_FIELDS =
    EMPLOYEE_FIELDS.filter(
        (field) =>
            ![
                "bio",
            ].includes(
                field
            )
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

const buildExcelSourceOfTruthData = ({
    employeeData = {},
    knownData = {},
    columns = [],
}) => {
    const result =
        {};

    const excelKnownColumns =
        getExcelKnownColumns(
            columns
        );

    /*
        Only values actually supplied in the new Excel
        are allowed to update the existing employee.

        Missing columns and blank cells preserve the
        old database value.
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
            ].includes(
                field
            )
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

        if (
            !excelKnownColumns.has(
                field
            )
        ) {
            continue;
        }

        if (
            isEmptyExcelValue(
                value
            )
        ) {
            continue;
        }

        result[field] =
            value;
    }

    const hasNonBlankName =
        (
            excelKnownColumns.has(
                "name"
            ) &&
            !isEmptyExcelValue(
                knownData.name
            )
        ) ||
        (
            excelKnownColumns.has(
                "firstName"
            ) &&
            !isEmptyExcelValue(
                knownData.firstName
            )
        ) ||
        (
            excelKnownColumns.has(
                "lastName"
            ) &&
            !isEmptyExcelValue(
                knownData.lastName
            )
        );

    if (
        hasNonBlankName
    ) {
        const names =
            splitEmployeeName(
                knownData.name,
                knownData.firstName,
                knownData.lastName
            );

        if (
            names.name
        ) {
            result.name =
                names.name;
        }

        if (
            names.firstName
        ) {
            result.firstName =
                names.firstName;
        }

        if (
            names.lastName
        ) {
            result.lastName =
                names.lastName;
        }
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

            if (!names.name) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Employee name is required",
                    });
            }

            // =================================================
            // EMAIL IS REQUIRED
            // =================================================

            const email =
                normalizeEmail(
                    source.email
                );

            if (!email) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Please enter employee email.",
                    });
            }

            /*
                Check ALL Employee records.

                Deleted and permanently hidden employees are
                intentionally included because their email must
                continue identifying the archived employee.
            */

            const existingEmployee =
                await findEmployeeByEmail(
                    email
                );

            if (existingEmployee) {
                const existingName =
                    getEmployeeDisplayName(
                        existingEmployee
                    );

                const submittedName =
                    normalizeNameForMatch(
                        names.name
                    );

                const storedName =
                    normalizeNameForMatch(
                        existingName
                    );

                const sameName =
                    submittedName &&
                    storedName &&
                    submittedName ===
                    storedName;

                /*
                    SAME EMAIL + DIFFERENT NAME

                    Hard conflict.

                    Never:
                    - create
                    - update
                    - restore
                    - offer Generate Existing Employee Card
                */

                if (!sameName) {
                    return res
                        .status(409)
                        .json({
                            ...buildEmailConflictPayload(
                                existingEmployee,
                                `This email ID already belongs to ${existingName}.`
                            ),

                            canGenerateExistingCard:
                                false,

                            submittedEmployeeName:
                                names.name,
                        });
                }

                /*
                    SAME EMAIL + SAME NAME

                    Active employee:
                    duplicate conflict only.

                    Deleted/archived employee:
                    frontend may offer Generate Existing
                    Employee Card.
                */

                return res
                    .status(409)
                    .json(
                        buildEmailConflictPayload(
                            existingEmployee,
                            `This email ID already exists for employee ${existingName}.`
                        )
                    );
            }

            /*
                User.email is unique as well.

                If a User exists but there is no Employee
                associated with the email, do not guess that
                they are the same person.
            */

            const existingUser =
                await User.findOne({
                    email,
                });

            if (existingUser) {
                return res
                    .status(409)
                    .json({
                        error:
                            DUPLICATE_EMPLOYEE_EMAIL_MESSAGE,

                        conflictType:
                            "USER_EMAIL_EXISTS",

                        canGenerateExistingCard:
                            false,
                    });
            }

            // =================================================
            // AUTOMATIC TEMPORARY PASSWORD
            // =================================================

            const temporaryPassword =
                generateTemporaryPassword(
                    names.name
                );

            if (
                !temporaryPassword
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Employee name is required to generate the temporary password.",
                    });
            }

            const employeeCode =
                textValue(
                    source.employeeCode
                );

            let user = null;

            try {
                user =
                    await User.create({
                        email,

                        password:
                            await bcrypt.hash(
                                temporaryPassword,
                                10
                            ),

                        role:
                            textValue(
                                source.role,
                                "EMPLOYEE"
                            )
                                .toUpperCase() ===
                                "ADMIN"
                                ? "ADMIN"
                                : "EMPLOYEE",
                    });

                const employeeData =
                    buildEmployeeData({
                        ...source,

                        name:
                            names.name,

                        firstName:
                            names.firstName,

                        lastName:
                            names.lastName,

                        employeeCode,

                        email,
                    });

                const employee =
                    await Employee.create({
                        ...employeeData,

                        userId:
                            user._id,

                        temporaryPassword,

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

                        isPermanentlyHidden:
                            false,
                    });

                return res
                    .status(201)
                    .json({
                        success:
                            true,

                        message:
                            "Employee and login account created successfully",

                        employee,

                        temporaryPassword,
                    });
            } catch (employeeError) {
                if (user?._id) {
                    try {
                        await User.findByIdAndDelete(
                            user._id
                        );
                    } catch (
                    cleanupError
                    ) {
                        console.error(
                            "Failed to clean up orphan User:",
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
                            DUPLICATE_EMPLOYEE_EMAIL_MESSAGE,
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
// GENERATE / RESTORE EXISTING EMPLOYEE CARD
// =====================================================

export const generateExistingEmployeeCard =
    async (req, res) => {
        try {
            const email =
                normalizeEmail(
                    req.body?.email
                );

            const employeeId =
                textValue(
                    req.body?.employeeId
                );

            if (
                !email &&
                !employeeId
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Employee email or employee ID is required.",
                    });
            }

            const query =
                employeeId
                    ? {
                        _id:
                            employeeId,
                    }
                    : {
                        email,
                    };

            const employee =
                await Employee.findOne(
                    query
                );

            if (!employee) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Existing employee record not found.",
                    });
            }

            /*
                When both employeeId and email are supplied,
                make sure they refer to the SAME old Employee.
            */

            if (
                email &&
                normalizeEmail(
                    employee.email
                ) !== email
            ) {
                return res
                    .status(409)
                    .json({
                        error:
                            "The employee record does not belong to this email ID.",
                    });
            }

            /*
                GENERATE EXISTING EMPLOYEE CARD is ONLY
                permitted for an archived/deleted employee.

                An already-active employee must never be
                recreated or modified through this endpoint.
            */

            if (
                !employee.isDeleted &&
                !employee.isPermanentlyHidden
            ) {
                return res
                    .status(409)
                    .json({
                        error:
                            `${getEmployeeDisplayName(
                                employee
                            )}'s employee card is already active.`,
                    });
            }

            /*
                =================================================
                CRITICAL RESTORATION RULE
                =================================================

                This operation is NOT employee creation.

                We intentionally preserve:

                - employee._id
                - employee.userId
                - employee.temporaryPassword
                - all employee information
                - current User.password
                - current User._id

                We DO NOT:

                - call User.create()
                - call Employee.create()
                - regenerate temporaryPassword
                - hash/reset a password
                - update the existing User password
                - apply the newly submitted Form values
                - apply newly submitted Excel values
                - replace old employee information

                Only the archived/card state is restored.
            */

            employee.isDeleted =
                false;

            employee.isPermanentlyHidden =
                false;

            /*
                Soft deletion makes employmentStatus INACTIVE.

                When Generate Existing Employee Card is clicked,
                the SAME Employee is made active again.
            */

            employee.employmentStatus =
                "ACTIVE";

            await employee.save({
                validateModifiedOnly:
                    true,
            });

            return res.json({
                success:
                    true,

                message:
                    `Existing employee card generated again for ${getEmployeeDisplayName(
                        employee
                    )}.`,

                employee,
            });
        } catch (error) {
            console.error(
                "Generate Existing Employee Card Error:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        error.message ||
                        "Failed to generate existing employee card.",
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

                    isPermanentlyHidden: {
                        $ne: true,
                    },

                    email: {
                        $exists: true,
                        $nin: [
                            "",
                            null,
                        ],
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

                    isPermanentlyHidden: {
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

            const requestedEmail =
                source.email !==
                    undefined
                    ? normalizeEmail(
                        source.email
                    )
                    : normalizeEmail(
                        employee.email
                    );

            if (!requestedEmail) {
                return res
                    .status(400)
                    .json({
                        error:
                            EMAIL_REQUIRED_MESSAGE,
                    });
            }

            const duplicateEmployee =
                await findEmployeeByEmail(
                    requestedEmail,
                    employee._id
                );

            if (duplicateEmployee) {
                return res
                    .status(409)
                    .json({
                        error:
                            DUPLICATE_EMPLOYEE_EMAIL_MESSAGE,
                    });
            }

            const requestedCode =
                source.employeeCode !==
                    undefined
                    ? String(
                        source.employeeCode ||
                        ""
                    ).trim()
                    : employee.employeeCode;

            const employeeData =
                buildEmployeeData(
                    source,
                    employee
                );

            let loginUser =
                employee.userId
                    ? await User.findById(
                        employee.userId
                    )
                    : null;

            if (loginUser) {
                if (
                    normalizeEmail(
                        loginUser.email
                    ) !==
                    requestedEmail
                ) {
                    const userWithRequestedEmail =
                        await User.findOne({
                            email:
                                requestedEmail,

                            _id: {
                                $ne:
                                    loginUser._id,
                            },
                        });

                    if (
                        userWithRequestedEmail
                    ) {
                        return res
                            .status(409)
                            .json({
                                error:
                                    DUPLICATE_EMPLOYEE_EMAIL_MESSAGE,
                            });
                    }

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
                        )
                            .toUpperCase() ===
                            "ADMIN"
                            ? "ADMIN"
                            : "EMPLOYEE";
                }

                await loginUser.save();
            } else {
                const userWithEmail =
                    await User.findOne({
                        email:
                            requestedEmail,
                    });

                if (userWithEmail) {
                    const linkedEmployee =
                        await Employee.findOne({
                            userId:
                                userWithEmail._id,

                            _id: {
                                $ne:
                                    employee._id,
                            },
                        });

                    if (linkedEmployee) {
                        return res
                            .status(409)
                            .json({
                                error:
                                    DUPLICATE_EMPLOYEE_EMAIL_MESSAGE,
                            });
                    }

                    loginUser =
                        userWithEmail;
                } else {
                    const updatedName =
                        employeeData.name ||
                        employee.name ||
                        `${employeeData.firstName || employee.firstName || ""} ${employeeData.lastName || employee.lastName || ""}`
                            .replace(
                                /\s+/g,
                                " "
                            )
                            .trim();

                    const firstTemporaryPassword =
                        generateTemporaryPassword(
                            updatedName
                        );

                    if (
                        !firstTemporaryPassword
                    ) {
                        return res
                            .status(400)
                            .json({
                                error:
                                    "Unable to generate temporary password from employee name.",
                            });
                    }

                    loginUser =
                        await User.create({
                            email:
                                requestedEmail,

                            password:
                                await bcrypt.hash(
                                    firstTemporaryPassword,
                                    10
                                ),

                            role:
                                textValue(
                                    source.role,
                                    "EMPLOYEE"
                                )
                                    .toUpperCase() ===
                                    "ADMIN"
                                    ? "ADMIN"
                                    : "EMPLOYEE",
                        });

                    if (
                        !textValue(
                            employee.temporaryPassword
                        )
                    ) {
                        employee.temporaryPassword =
                            firstTemporaryPassword;
                    }
                }
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

            await employee.save();

            return res.json({
                success:
                    true,

                message:
                    "Employee updated successfully",

                employee,

                temporaryPassword:
                    employee.temporaryPassword ||
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
                            DUPLICATE_EMPLOYEE_EMAIL_MESSAGE,
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

export const deleteEmployee =
    async (
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

            if (
                employee.isDeleted
            ) {
                return res.json({
                    success:
                        true,

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
                success:
                    true,

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
                                `${employee.firstName || ""} ${employee.lastName || ""}`
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

export const exportEmployees =
    async (
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
                success:
                    true,

                employees,
            });
        } catch (error) {
            console.error(
                "Export Employees Error:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Failed to export employees",
                });
        }
    };

// =====================================================
// BULK EXCEL UPLOAD
// =====================================================
//
// FINAL RULES:
//
// - Excel MUST contain an Email ID column.
// - Every employee row must contain Name + Email.
// - Name + Email match -> update SAME employee.
// - Same Name + different Email -> create NEW employee.
// - Same Email + different Name -> conflict.
// - Missing optional columns DO NOT cause errors.
// - Blank cells DO NOT erase existing employee data.
// - Unknown Excel columns become dynamic fields.
// - New employees automatically receive temporary password.
// - Existing employees keep their original temporary password.
// - Deleted / permanently hidden matching employee is NOT
//   automatically restored.
// - Instead a conflict is returned so Admin can choose
//   "Generate Existing Employee Card".
// - Regenerating existing card never creates another User,
//   never resets current login password and never replaces
//   old employee data.
// - Employee Code remains a normal field only.
// - DELETE / REMOVE action is preserved.
// =====================================================

export const bulkUploadEmployees =
    async (req, res) => {
        try {
            await removeLegacyEmployeeUniqueIndexes();

            if (!req.file) {
                return res
                    .status(400)
                    .json({
                        success:
                            false,

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
                        type:
                            "buffer",

                        cellDates:
                            true,

                        raw:
                            false,
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
                        success:
                            false,

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

                        defval:
                            "",

                        blankrows:
                            false,

                        raw:
                            false,
                    }
                );

            if (
                !Array.isArray(
                    rawRows
                ) ||
                rawRows.length ===
                0
            ) {
                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Excel sheet is empty",
                    });
            }

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
                let rowIndex = 0;
                rowIndex <
                maxCheckRows;
                rowIndex++
            ) {
                const row =
                    rawRows[
                    rowIndex
                    ] || [];

                let score = 0;

                let nonEmpty =
                    0;

                for (
                    const cell
                    of row
                ) {
                    const value =
                        cleanExcelValue(
                            cell
                        );

                    if (
                        isEmptyExcelValue(
                            value
                        )
                    ) {
                        continue;
                    }

                    nonEmpty++;

                    const normalized =
                        normalizeExcelHeader(
                            value
                        );

                    if (
                        EXCEL_FIELD_ALIASES[
                        normalized
                        ]
                    ) {
                        score += 3;
                    } else {
                        score += 1;
                    }
                }

                if (
                    nonEmpty >=
                    2 &&
                    score >
                    highestScore
                ) {
                    highestScore =
                        score;

                    headerRowIndex =
                        rowIndex;
                }
            }

            if (
                headerRowIndex ===
                -1
            ) {
                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Unable to detect Excel header row",
                    });
            }

            const headerRow =
                rawRows[
                headerRowIndex
                ];

            const columns =
                headerRow.map(
                    (
                        header,
                        index
                    ) => {
                        const originalHeader =
                            textValue(
                                header,
                                `Column ${index + 1}`
                            );

                        const normalizedHeader =
                            normalizeExcelHeader(
                                originalHeader
                            );

                        const knownField =
                            EXCEL_FIELD_ALIASES[
                            normalizedHeader
                            ] ||
                            "";

                        return {
                            index,

                            originalHeader,

                            normalizedHeader,

                            knownField,

                            isDynamic:
                                !knownField,
                        };
                    }
                );

            const hasEmailColumn =
                columns.some(
                    (
                        column
                    ) =>
                        column
                            .knownField ===
                        "email"
                );

            if (
                !hasEmailColumn
            ) {
                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            EXCEL_EMAIL_REQUIRED_MESSAGE,
                    });
            }

            const hasNameColumn =
                columns.some(
                    (
                        column
                    ) =>
                        [
                            "name",
                            "firstName",
                            "lastName",
                        ].includes(
                            column
                                .knownField
                        )
                );

            if (
                !hasNameColumn
            ) {
                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Employee Name is required in the Excel file.",
                    });
            }

            const dataRows =
                rawRows.slice(
                    headerRowIndex +
                    1
                );

            if (
                dataRows.length ===
                0
            ) {
                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Excel file does not contain employee rows",
                    });
            }

            const existingEmployees =
                await Employee.find(
                    {}
                );

            const employeeByEmail =
                new Map();

            for (
                const employee
                of existingEmployees
            ) {
                const email =
                    normalizeEmail(
                        employee.email
                    );

                if (email) {
                    employeeByEmail.set(
                        email,
                        employee
                    );
                }
            }

            const existingUsers =
                await User.find(
                    {}
                );

            const userByEmail =
                new Map();

            for (
                const user
                of existingUsers
            ) {
                const email =
                    normalizeEmail(
                        user.email
                    );

                if (email) {
                    userByEmail.set(
                        email,
                        user
                    );
                }
            }

            let created = 0;

            let updated = 0;

            let restored = 0;

            let deleted = 0;

            const skipped =
                [];

            const conflicts =
                [];

            const dynamicColumnMap =
                new Map();

            for (
                const column
                of columns
            ) {
                if (
                    !column.isDynamic
                ) {
                    continue;
                }

                if (
                    !column
                        .normalizedHeader
                ) {
                    continue;
                }

                dynamicColumnMap.set(
                    column
                        .normalizedHeader,
                    column
                        .originalHeader
                );
            }

            const dynamicColumns =
                Array.from(
                    dynamicColumnMap.entries()
                ).map(
                    ([
                        key,
                        label,
                    ]) => ({
                        key,
                        label,
                    })
                );

            for (
                let rowIndex = 0;
                rowIndex <
                dataRows.length;
                rowIndex++
            ) {
                const row =
                    dataRows[
                    rowIndex
                    ] || [];

                const excelRowNumber =
                    headerRowIndex +
                    rowIndex +
                    2;

                const rowHasData =
                    row.some(
                        (
                            cell
                        ) =>
                            !isEmptyExcelValue(
                                cleanExcelValue(
                                    cell
                                )
                            )
                    );

                if (
                    !rowHasData
                ) {
                    continue;
                }

                const knownData =
                    {};

                const incomingDynamicFields =
                    [];

                for (
                    const column
                    of columns
                ) {
                    const rawValue =
                        row[
                        column.index
                        ];

                    const value =
                        cleanExcelValue(
                            rawValue
                        );

                    if (
                        column.isDynamic
                    ) {
                        if (
                            column
                                .normalizedHeader
                        ) {
                            incomingDynamicFields.push(
                                {
                                    section:
                                        "Excel Additional Fields",

                                    label:
                                        column.originalHeader,

                                    key:
                                        column.normalizedHeader,

                                    value,
                                }
                            );
                        }

                        continue;
                    }

                    if (
                        !column
                            .knownField
                    ) {
                        continue;
                    }

                    knownData[
                        column
                            .knownField
                    ] = value;
                }

                const excelAction =
                    textValue(
                        knownData
                            .excelAction
                    )
                        .trim()
                        .toUpperCase();

                const email =
                    normalizeEmail(
                        knownData.email
                    );

                if (
                    [
                        "DELETE",
                        "REMOVE",
                    ].includes(
                        excelAction
                    )
                ) {
                    if (!email) {
                        skipped.push({
                            row:
                                excelRowNumber,

                            reason:
                                "Email ID is required to delete an employee.",
                        });

                        continue;
                    }

                    const employee =
                        employeeByEmail.get(
                            email
                        );

                    if (
                        !employee
                    ) {
                        skipped.push({
                            row:
                                excelRowNumber,

                            email,

                            reason:
                                "Employee not found for DELETE / REMOVE action.",
                        });

                        continue;
                    }

                    if (
                        !employee
                            .isDeleted
                    ) {
                        employee.isDeleted =
                            true;

                        employee.employmentStatus =
                            "INACTIVE";

                        await employee.save({
                            validateModifiedOnly:
                                true,
                        });

                        deleted++;
                    }

                    continue;
                }

                if (!email) {
                    skipped.push({
                        row:
                            excelRowNumber,

                        reason:
                            "Email ID is required for every employee row.",
                    });

                    continue;
                }

                const names =
                    splitEmployeeName(
                        knownData.name,
                        knownData
                            .firstName,
                        knownData
                            .lastName
                    );

                if (!names.name) {
                    skipped.push({
                        row:
                            excelRowNumber,

                        email,

                        reason:
                            "Employee Name is required for every employee row.",
                    });

                    continue;
                }

                const submittedName =
                    normalizeNameForMatch(
                        names.name
                    );

                const existingEmployee =
                    employeeByEmail.get(
                        email
                    );

                if (
                    existingEmployee
                ) {
                    const existingEmployeeName =
                        getEmployeeDisplayName(
                            existingEmployee
                        );

                    const storedName =
                        normalizeNameForMatch(
                            existingEmployeeName
                        );

                    // =============================================
                    // SAME EMAIL + DIFFERENT NAME
                    // =============================================

                    if (
                        !submittedName ||
                        !storedName ||
                        submittedName !==
                        storedName
                    ) {
                        conflicts.push({
                            row:
                                excelRowNumber,

                            email,

                            submittedName:
                                names.name,

                            existingEmployeeName,

                            employeeId:
                                existingEmployee
                                    ._id
                                    .toString(),

                            canGenerateExistingCard:
                                false,

                            reason:
                                `This email ID already belongs to ${existingEmployeeName}. The submitted employee name is ${names.name}.`,
                        });

                        continue;
                    }

                    // =============================================
                    // SAME EMAIL + SAME NAME + ARCHIVED
                    // =============================================

                    if (
                        existingEmployee
                            .isDeleted ||
                        existingEmployee
                            .isPermanentlyHidden
                    ) {
                        conflicts.push({
                            row:
                                excelRowNumber,

                            email,

                            submittedName:
                                names.name,

                            existingEmployeeName,

                            employeeId:
                                existingEmployee
                                    ._id
                                    .toString(),

                            canGenerateExistingCard:
                                true,

                            reason:
                                `This email ID already exists for employee ${existingEmployeeName}.`,
                        });

                        continue;
                    }

                    // =============================================
                    // SAME EMAIL + SAME NAME + ACTIVE
                    //
                    // Update ONLY the non-blank values supplied
                    // in the current Excel file.
                    // =============================================

                    const employeeData =
                        buildEmployeeData(
                            {
                                ...knownData,

                                name:
                                    names.name,

                                firstName:
                                    names.firstName,

                                lastName:
                                    names.lastName,

                                email,
                            },

                            existingEmployee
                        );

                    const updateData =
                        buildExcelSourceOfTruthData({
                            employeeData,

                            knownData: {
                                ...knownData,

                                name:
                                    names.name,

                                firstName:
                                    names.firstName,

                                lastName:
                                    names.lastName,

                                email,
                            },

                            columns,
                        });

                    for (
                        const [
                            field,
                            value,
                        ]
                        of Object.entries(
                            updateData
                        )
                    ) {
                        existingEmployee[
                            field
                        ] = value;
                    }

                    existingEmployee.email =
                        email;

                    existingEmployee.dynamicFields =
                        mergeDynamicFields(
                            existingEmployee
                                .dynamicFields ||
                            [],

                            incomingDynamicFields,

                            columns
                        );

                    await existingEmployee.save({
                        validateModifiedOnly:
                            true,
                    });

                    if (
                        existingEmployee
                            .userId
                    ) {
                        const linkedUser =
                            await User.findById(
                                existingEmployee
                                    .userId
                            );

                        if (
                            linkedUser &&
                            normalizeEmail(
                                linkedUser
                                    .email
                            ) !==
                            email
                        ) {
                            const anotherUser =
                                await User.findOne({
                                    email,

                                    _id: {
                                        $ne:
                                            linkedUser
                                                ._id,
                                    },
                                });

                            if (
                                anotherUser
                            ) {
                                conflicts.push({
                                    row:
                                        excelRowNumber,

                                    email,

                                    submittedName:
                                        names.name,

                                    existingEmployeeName,

                                    employeeId:
                                        existingEmployee
                                            ._id
                                            .toString(),

                                    canGenerateExistingCard:
                                        false,

                                    reason:
                                        "This email ID already belongs to another login account.",
                                });

                                continue;
                            }

                            linkedUser.email =
                                email;

                            await linkedUser.save();
                        }
                    }

                    updated++;

                    continue;
                }

                // =================================================
                // NEW EMAIL -> CREATE NEW EMPLOYEE + USER
                // =================================================

                const existingUser =
                    userByEmail.get(
                        email
                    );

                if (
                    existingUser
                ) {
                    conflicts.push({
                        row:
                            excelRowNumber,

                        email,

                        submittedName:
                            names.name,

                        existingEmployeeName:
                            "",

                        employeeId:
                            "",

                        canGenerateExistingCard:
                            false,

                        reason:
                            "This email ID already belongs to an existing user account.",
                    });

                    continue;
                }

                const temporaryPassword =
                    generateTemporaryPassword(
                        names.name
                    );

                if (
                    !temporaryPassword
                ) {
                    skipped.push({
                        row:
                            excelRowNumber,

                        email,

                        reason:
                            "Unable to generate temporary password from employee name.",
                    });

                    continue;
                }

                const hashedPassword =
                    await bcrypt.hash(
                        temporaryPassword,
                        10
                    );

                let createdUser =
                    null;

                try {
                    createdUser =
                        await User.create({
                            email,

                            password:
                                hashedPassword,

                            role:
                                textValue(
                                    knownData
                                        .role,
                                    "EMPLOYEE"
                                )
                                    .toUpperCase() ===
                                    "ADMIN"
                                    ? "ADMIN"
                                    : "EMPLOYEE",
                        });

                    const employeeData =
                        buildEmployeeData({
                            ...knownData,

                            name:
                                names.name,

                            firstName:
                                names.firstName,

                            lastName:
                                names.lastName,

                            email,
                        });

                    const newEmployee =
                        await Employee.create({
                            ...employeeData,

                            userId:
                                createdUser._id,

                            email,

                            temporaryPassword,

                            dynamicFields:
                                mergeDynamicFields(
                                    [],

                                    incomingDynamicFields,

                                    columns
                                ),

                            customFields:
                                [],

                            customSections:
                                [],

                            isDeleted:
                                false,

                            isPermanentlyHidden:
                                false,
                        });

                    employeeByEmail.set(
                        email,
                        newEmployee
                    );

                    userByEmail.set(
                        email,
                        createdUser
                    );

                    created++;
                } catch (
                createError
                ) {
                    if (
                        createdUser?._id
                    ) {
                        try {
                            await User.findByIdAndDelete(
                                createdUser._id
                            );
                        } catch (
                        cleanupError
                        ) {
                            console.error(
                                "Excel orphan User cleanup error:",
                                cleanupError
                            );
                        }
                    }

                    if (
                        createError?.code ===
                        11000
                    ) {
                        conflicts.push({
                            row:
                                excelRowNumber,

                            email,

                            submittedName:
                                names.name,

                            existingEmployeeName:
                                "",

                            employeeId:
                                "",

                            canGenerateExistingCard:
                                false,

                            reason:
                                "This email ID already exists.",
                        });

                        continue;
                    }

                    skipped.push({
                        row:
                            excelRowNumber,

                        email,

                        reason:
                            createError.message ||
                            "Failed to create employee.",
                    });
                }
            }

            console.log(
                "Employee Excel Upload Result:",
                {
                    created,

                    updated,

                    restored,

                    deleted,

                    skipped:
                        skipped.length,

                    conflicts:
                        conflicts.length,
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

            if (
                conflicts.length >
                0
            ) {
                console.table(
                    conflicts
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

                conflictCount:
                    conflicts.length,

                conflicts,

                dynamicColumns,

                headerRow:
                    headerRowIndex +
                    1,

                totalRowsProcessed:
                    created +
                    updated +
                    deleted +
                    skipped.length +
                    conflicts.length,

                message:
                    `${created} created, ` +
                    `${updated} updated, ` +
                    `${restored} restored, ` +
                    `${deleted} deleted, ` +
                    `${skipped.length} skipped, ` +
                    `${conflicts.length} conflict(s)`,
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

export const getEmployeeDocuments =
    async (req, res) => {
        try {
            const employee =
                await Employee.findOne({
                    _id:
                        req.params.id,

                    isDeleted: {
                        $ne: true,
                    },
                }).lean();

            if (
                !employee
            ) {
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
                success:
                    true,

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
            } =
                req.params;

            const employee =
                await Employee.findOne({
                    _id:
                        id,

                    isDeleted: {
                        $ne: true,
                    },
                }).lean();

            if (
                !employee
            ) {
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
                    (
                        doc
                    ) =>
                        String(
                            doc._id ||
                            doc.id
                        ) ===
                        String(
                            documentId
                        )
                );

            if (
                !document
            ) {
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

            if (
                !documentUrl
            ) {
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