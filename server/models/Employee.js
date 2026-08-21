import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },

        // ==============================
        // Employee Identity
        // ==============================

        employeeCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        firstName: {
            type: String,
            required: true,
            trim: true,
        },

        lastName: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            trim: true,
        },

        phone: {
            type: String,
            required: true,
            trim: true,
        },

        gender: {
            type: String,
            enum: ["MALE", "FEMALE", "OTHER"],
            required: true,
        },

        maritalStatus: {
            type: String,
            enum: ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"],
            default: null,
        },

        aadharNumber: {
            type: String,
            required: true,
            trim: true,
        },

        // ==============================
        // Bank / Statutory Details
        // ==============================

        bankName: {
            type: String,
            required: true,
            trim: true,
        },

        bankAccountNumber: {
            type: String,
            required: true,
            trim: true,
        },

        uanNumber: {
            type: String,
            required: true,
            trim: true,
        },

        panNumber: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },

        // ==============================
        // Employment Details
        // ==============================

        position: {
            type: String,
            required: true,
            trim: true,
        },

        department: {
            type: String,
            default: "",
        },

        basicSalary: {
            type: Number,
            default: 0,
        },

        allowances: {
            type: Number,
            default: 0,
        },

        deductions: {
            type: Number,
            default: 0,
        },

        employmentStatus: {
            type: String,
            enum: ["ACTIVE", "INACTIVE"],
            default: "ACTIVE",
        },

        // ==============================
        // Important Dates
        // ==============================

        dateOfBirth: {
            type: Date,
            default: null,
        },

        joinDate: {
            type: Date,
            required: true,
        },

        confirmationDate: {
            type: Date,
            default: null,
        },

        // Existing special date
        anniversaryDate: {
            type: Date,
            default: null,
        },

        specialDateMessage: {
            type: String,
            default: "",
        },

        // ==============================
        // Other Information
        // ==============================

        bio: {
            type: String,
            default: "",
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

        skills: {
            type: [String],
            default: [],
        },

        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const Employee =
    mongoose.models.Employee ||
    mongoose.model("Employee", employeeSchema);

export default Employee;