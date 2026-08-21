import mongoose from "mongoose";

const payslipSchema = new mongoose.Schema({
    employeeId: {type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true},
    month: { type: Number, required: true },
    year: { type: Number, required: true },

    basicSalary: { type: Number, required: true },
    hra: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    siteAllowance: { type: Number, default: 0 },
    conveyance: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 }, // total of above, kept for backwards compatibility
    grossSalary: { type: Number, default: 0 },

    pfEmployerContribution: { type: Number, default: 0 },
    compensationInsurance: { type: Number, default: 0 },
    medicalInsuranceEmployer: { type: Number, default: 0 },
    ctc: { type: Number, default: 0 },

    pfEmployeeContribution: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    medicalInsuranceEmployee: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 }, // total of above, kept for backwards compatibility

    netSalary: { type: Number, required: true },

    // Attendance-derived, calculated at generation time
    workingDays: { type: Number, default: 0 },
    actualWorkingDays: { type: Number, default: 0 },
    lopDays: { type: Number, default: 0 },

}, {timestamps: true})
const Payslip = mongoose.models.Payslip || mongoose.model("Payslip", payslipSchema)

export default Payslip;