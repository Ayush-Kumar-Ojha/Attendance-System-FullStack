import mongoose from "mongoose";

const dynamicFieldSchema = new mongoose.Schema(
    {
        section: {
            type: String,
            trim: true,
            default: "Excel Fields",
        },

        label: {
            type: String,
            trim: true,
            default: "",
        },

        key: {
            type: String,
            trim: true,
            default: "",
        },

        value: {
            type: mongoose.Schema.Types.Mixed,
            default: "",
        },
    },
    { _id: false }
);

const customFieldSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            default: "",
        },

        section: {
            type: String,
            default: "",
        },

        label: {
            type: String,
            default: "",
        },

        value: {
            type: mongoose.Schema.Types.Mixed,
            default: "",
        },

        type: {
            type: String,
            default: "",
        },
    },
    { _id: false }
);

const customSectionFieldSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            default: "",
        },

        label: {
            type: String,
            default: "",
        },

        value: {
            type: mongoose.Schema.Types.Mixed,
            default: "",
        },
    },
    { _id: false }
);

const customSectionSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            default: "",
        },

        title: {
            type: String,
            default: "",
        },

        fields: {
            type: [customSectionFieldSchema],
            default: [],
        },
    },
    { _id: false }
);

const employeeDocumentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            default: "",
        },

        fileName: {
            type: String,
            trim: true,
            default: "",
        },

        fileUrl: {
            type: String,
            default: "",
        },

        uploadedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true }
);

const employeeSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        // =====================================================
        // CHAT & POSTING RESTRICTIONS
        // =====================================================

        isChatBlocked: {
            type: Boolean,
            default: false,
        },

        postingBlockType: {
            type: String,
            enum: [
                "NONE",
                "TEMPORARY",
                "PERMANENT",
            ],
            default: "NONE",
        },

        postingBlockedUntil: {
            type: Date,
            default: null,
        },

        postingBlockReason: {
            type: String,
            default: "",
        },

        // =====================================================
        // BASIC DETAILS
        // =====================================================

        employeeCode: {
            type: String,
            trim: true,
            default: null,
        },

        name: {
            type: String,
            trim: true,
            default: "",
        },

        firstName: {
            type: String,
            trim: true,
            default: "",
        },

        lastName: {
            type: String,
            trim: true,
            default: "",
        },

        fatherName: {
            type: String,
            trim: true,
            default: "",
        },

        gender: {
            type: String,
            trim: true,
            default: "",
        },

        bloodGroup: {
            type: String,
            trim: true,
            default: "",
        },

        dateOfBirth: {
            type: Date,
            default: null,
        },

        joinDate: {
            type: Date,
            default: null,
        },

        birthPlace: {
            type: String,
            trim: true,
            default: "",
        },

        nationality: {
            type: String,
            trim: true,
            default: "",
        },

        motherTongue: {
            type: String,
            trim: true,
            default: "",
        },

        languages: {
            type: String,
            trim: true,
            default: "",
        },

        phone: {
            type: String,
            trim: true,
            default: "",
        },

        mobileNumber: {
            type: String,
            trim: true,
            default: "",
        },

        /*
            EMAIL ID RULE

            Email ID is mandatory for every Employee.

            Email is normalized by:
            - trimming spaces
            - converting to lowercase

            Email is the primary matching identifier for
            Excel create/update.

            Deleted and permanently hidden Employee documents
            remain in MongoDB, so their Email IDs remain reserved.
        */

        email: {
            type: String,

            required: [
                true,
                "Email ID is required.",
            ],

            trim: true,
            lowercase: true,

            validate: {
                validator: function (value) {
                    return Boolean(
                        String(value || "").trim()
                    );
                },

                message:
                    "Email ID is required.",
            },
        },

        /*
            IMPORTANT TEMPORARY PASSWORD RULE:

            This stores the ORIGINAL system-generated
            temporary password.

            It remains visible to Admin on the employee card
            throughout the lifetime of the Employee record.

            Employee password changes DO NOT clear this field.

            Authentication itself uses User.password only.

            Restore / Generate Existing Employee Card
            must never modify this field.
        */

        temporaryPassword: {
            type: String,
            default: "",
        },

        // =====================================================
        // JOB DETAILS
        // =====================================================

        department: {
            type: String,
            trim: true,
            default: "",
        },

        position: {
            type: String,
            trim: true,
            default: "",
        },

        manpowerType: {
            type: String,
            trim: true,
            default: "",
        },

        vendorCode: {
            type: String,
            trim: true,
            default: "",
        },

        /*
            EMPLOYMENT STATUS RULE

            ACTIVE:
            - normal active employee
            - restored employee
            - Generate Existing Employee Card

            INACTIVE:
            - deleted / archived employee

            The Employee record itself is never recreated
            when restoring.
        */

        employmentStatus: {
            type: String,
            enum: [
                "ACTIVE",
                "INACTIVE",
                "",
            ],
            default: "ACTIVE",
        },

        confirmationDate: {
            type: Date,
            default: null,
        },

        // =====================================================
        // PERSONAL DETAILS
        // =====================================================

        passportNumber: {
            type: String,
            trim: true,
            default: "",
        },

        identificationMark: {
            type: String,
            trim: true,
            default: "",
        },

        maritalStatus: {
            type: String,
            trim: true,
            default: "",
        },

        numberOfChildren: {
            type: Number,
            default: null,
        },

        anniversaryDate: {
            type: Date,
            default: null,
        },

        // =====================================================
        // SAFETY / PPE
        // =====================================================

        safetyIssued: {
            type: String,
            trim: true,
            default: "",
        },

        shoeSize: {
            type: String,
            trim: true,
            default: "",
        },

        shoeIssueDate: {
            type: Date,
            default: null,
        },

        safetyHelmet: {
            type: String,
            trim: true,
            default: "",
        },

        helmetColor: {
            type: String,
            trim: true,
            default: "",
        },

        helmetIssueDate: {
            type: Date,
            default: null,
        },

        jacket: {
            type: String,
            trim: true,
            default: "",
        },

        jacketSize: {
            type: String,
            trim: true,
            default: "",
        },

        jacketIssueDate: {
            type: Date,
            default: null,
        },

        eyeProtectionEquipment: {
            type: String,
            trim: true,
            default: "",
        },

        // =====================================================
        // PERMANENT ADDRESS
        // =====================================================

        permanentAddressLine1: {
            type: String,
            trim: true,
            default: "",
        },

        permanentAddressLine2: {
            type: String,
            trim: true,
            default: "",
        },

        permanentCity: {
            type: String,
            trim: true,
            default: "",
        },

        permanentCountry: {
            type: String,
            trim: true,
            default: "",
        },

        permanentState: {
            type: String,
            trim: true,
            default: "",
        },

        permanentPinCode: {
            type: String,
            trim: true,
            default: "",
        },

        // =====================================================
        // PRESENT ADDRESS
        // =====================================================

        presentAddressLine1: {
            type: String,
            trim: true,
            default: "",
        },

        presentAddressLine2: {
            type: String,
            trim: true,
            default: "",
        },

        presentCity: {
            type: String,
            trim: true,
            default: "",
        },

        village: {
            type: String,
            trim: true,
            default: "",
        },

        presentCountry: {
            type: String,
            trim: true,
            default: "",
        },

        presentState: {
            type: String,
            trim: true,
            default: "",
        },

        presentPinCode: {
            type: String,
            trim: true,
            default: "",
        },

        // =====================================================
        // EMERGENCY CONTACT
        // =====================================================

        emergencyContactPersonName: {
            type: String,
            trim: true,
            default: "",
        },

        emergencyContactPersonRelation: {
            type: String,
            trim: true,
            default: "",
        },

        emergencyContactPersonAddress: {
            type: String,
            trim: true,
            default: "",
        },

        emergencyMobileNumber: {
            type: String,
            trim: true,
            default: "",
        },

        // =====================================================
        // EDUCATION
        // =====================================================

        qualification: {
            type: String,
            trim: true,
            default: "",
        },

        specialization: {
            type: String,
            trim: true,
            default: "",
        },

        collegeSchoolName: {
            type: String,
            trim: true,
            default: "",
        },

        boardUniversityName: {
            type: String,
            trim: true,
            default: "",
        },

        yearOfPassing: {
            type: String,
            trim: true,
            default: "",
        },

        // =====================================================
        // DOCUMENT / KYC
        // =====================================================

        resume: {
            type: String,
            default: "",
        },

        appointmentLetter: {
            type: String,
            default: "",
        },

        degreeCertificate: {
            type: String,
            default: "",
        },

        kycDocument: {
            type: String,
            default: "",
        },

        medicalCertificate: {
            type: String,
            default: "",
        },

        previousEmploymentAppointmentLetter: {
            type: String,
            default: "",
        },

        previousEmploymentRelevantExperienceLetter: {
            type: String,
            default: "",
        },

        policeVerification: {
            type: String,
            default: "",
        },

        aadharNumber: {
            type: String,
            trim: true,
            default: "",
        },

        panNumber: {
            type: String,
            trim: true,
            uppercase: true,
            default: "",
        },

        // =====================================================
        // BANK / STATUTORY
        // =====================================================

        bankAccountNumber: {
            type: String,
            trim: true,
            default: "",
        },

        bankAccountName: {
            type: String,
            trim: true,
            default: "",
        },

        bankAccountType: {
            type: String,
            trim: true,
            default: "",
        },

        ifscCode: {
            type: String,
            trim: true,
            uppercase: true,
            default: "",
        },

        bankName: {
            type: String,
            trim: true,
            default: "",
        },

        branchName: {
            type: String,
            trim: true,
            default: "",
        },

        uanNumber: {
            type: String,
            trim: true,
            default: "",
        },

        pfNumber: {
            type: String,
            trim: true,
            default: "",
        },

        esiNumber: {
            type: String,
            trim: true,
            default: "",
        },

        // =====================================================
        // SALARY
        // =====================================================

        basicSalary: {
            type: Number,
            default: null,
        },

        allowances: {
            type: Number,
            default: null,
        },

        deductions: {
            type: Number,
            default: null,
        },

        // =====================================================
        // PROFILE
        // =====================================================

        bio: {
            type: String,
            default: "",
        },

        skills: {
            type: [String],
            default: [],
        },

        image: {
            type: String,
            default: null,
        },

        cvUrl: {
            type: String,
            default: null,
        },

        cvFileName: {
            type: String,
            default: null,
        },

        documents: {
            type: [
                employeeDocumentSchema,
            ],
            default: [],
        },

        // =====================================================
        // FLEXIBLE / CUSTOM FIELDS
        // =====================================================

        dynamicFields: {
            type: [
                dynamicFieldSchema,
            ],
            default: [],
        },

        customFields: {
            type: [
                customFieldSchema,
            ],
            default: [],
        },

        customSections: {
            type: [
                customSectionSchema,
            ],
            default: [],
        },

        // =====================================================
        // DELETE STATES
        // =====================================================

        /*
            Soft delete:

            isDeleted = true
            employmentStatus = INACTIVE

            The Employee document remains in MongoDB.
            Its email remains reserved.
        */

        isDeleted: {
            type: Boolean,
            default: false,
        },

        /*
            "Delete Permanently" only hides the card from
            Deleted Employees.

            It DOES NOT delete the MongoDB Employee document.

            Because the Employee continues to exist:

            - email remains reserved
            - same Employee _id remains available
            - same userId remains available
            - same temporaryPassword remains available

            Later:

            same name + same email
                    ↓
            Generate Existing Employee Card
                    ↓
            restore the SAME Employee.
        */

        isPermanentlyHidden: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// =====================================================
// INDEXES
// =====================================================

/*
    Employee Code remains indexed but is NOT unique.

    IMPORTANT:

    Employee Code is NOT used as the Excel matching key.

    Excel matching is performed using normalized Email ID.
*/

employeeSchema.index({
    employeeCode: 1,
});

/*
    UNIQUE EMPLOYEE EMAIL

    This is important for your exact requirement.

    Email remains unique across:

    - active employees
    - deleted employees
    - permanently hidden employees

    Therefore a previously used employee email cannot
    accidentally create another Employee document.

    Archived Employee records keep their email so that
    the backend can detect and offer:

    Generate Existing Employee Card

    instead of creating a duplicate Employee/User.

    The partial filter safely accommodates old database
    records that may already contain blank email values.
*/

employeeSchema.index(
    {
        email: 1,
    },
    {
        name:
            "employee_email_unique",

        unique:
            true,

        partialFilterExpression: {
            email: {
                $type:
                    "string",

                $gt:
                    "",
            },
        },
    }
);

employeeSchema.index({
    aadharNumber: 1,
});

employeeSchema.index({
    uanNumber: 1,
});

employeeSchema.index({
    bankAccountNumber: 1,
});

employeeSchema.index({
    mobileNumber: 1,
});

employeeSchema.index({
    phone: 1,
});

const Employee =
    mongoose.models.Employee ||
    mongoose.model(
        "Employee",
        employeeSchema
    );

export default Employee;