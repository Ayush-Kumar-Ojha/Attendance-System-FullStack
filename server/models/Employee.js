import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
    {
        // =====================================================
        // USER / LOGIN LINK
        // =====================================================

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        // =====================================================
        // CORE / SYSTEM FIELDS
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

        email: {
            type: String,
            trim: true,
            default: "",
        },

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

        employmentStatus: {
            type: String,
            enum: ["ACTIVE", "INACTIVE", ""],
            default: "",
        },

        isDeleted: {
            type: Boolean,
            default: false,
        },

        // =====================================================
        // PERSONAL DETAILS
        // =====================================================

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

        confirmationDate: {
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

        mobileNumber: {
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
        // EXCEL DOCUMENT REFERENCES
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

        // =====================================================
        // PROFILE IMAGE / CV / DOCUMENTS
        // =====================================================

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
                {
                    name: {
                        type: String,
                        required: true,
                    },

                    fileUrl: {
                        type: String,
                        required: true,
                    },

                    fileName: {
                        type: String,
                        required: true,
                    },

                    uploadedAt: {
                        type: Date,
                        default: Date.now,
                    },
                },
            ],

            default: [],
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
        // KYC
        // =====================================================

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
        // PAYROLL
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

        specialDateMessage: {
            type: String,
            default: "",
        },

        specialDateMessageCreatedAt: {
            type: Date,
            default: null,
        },

        // =====================================================
        // DYNAMIC EXCEL FIELDS
        // =====================================================
        //
        // Every Excel column that does not have a fixed field
        // above is automatically stored here.
        //
        // Example:
        //
        // {
        //     section: "Employment",
        //     label: "Project Site",
        //     key: "employment::project site",
        //     value: "Site A"
        // }
        //
        // The controller automatically propagates newly discovered
        // fields to employees created by previous Excel uploads.
        // =====================================================

        dynamicFields: {
            type: [
                {
                    section: {
                        type: String,
                        default: "Excel Fields",
                    },

                    label: {
                        type: String,
                        required: true,
                    },

                    key: {
                        type: String,
                        required: true,
                    },

                    value: {
                        type: String,
                        default: "",
                    },
                },
            ],

            default: [],
        },

        // =====================================================
        // CUSTOM FIELDS
        // =====================================================

        customFields: {
            type: [
                {
                    section: {
                        type: String,
                        default: "personal",
                    },

                    label: {
                        type: String,
                        required: true,
                    },

                    value: {
                        type: String,
                        default: "",
                    },
                },
            ],

            default: [],
        },

        // =====================================================
        // CUSTOM SECTIONS
        // =====================================================

        customSections: {
            type: [
                {
                    title: {
                        type: String,
                        required: true,
                    },

                    fields: {
                        type: [
                            {
                                label: {
                                    type: String,
                                    required: true,
                                },

                                value: {
                                    type: String,
                                    default: "",
                                },
                            },
                        ],

                        default: [],
                    },
                },
            ],

            default: [],
        },
    },
    {
        timestamps: true,
    }
);

// DO NOT add unique indexes to:
// userId
// employeeCode
// email
//
// Excel employees can legitimately have these empty.
// Old indexes are cleaned by employeeController.js.

const Employee =
    mongoose.models.Employee ||
    mongoose.model(
        "Employee",
        employeeSchema
    );

export default Employee;