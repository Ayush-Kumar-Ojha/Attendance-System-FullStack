import Employee from "../models/Employee.js";
import Payslip from "../models/Payslip.js";

// Create payslip
// POST /api/payslips
export const createPayslip = async (req, res) => {
    try {
        const {
            employeeId,
            month,
            year,
            basicSalary,
            hra,
            specialAllowance,
            siteAllowance,
            conveyance,
            grossSalary,
            pfEmployerContribution,
            compensationInsurance,
            medicalInsuranceEmployer,
            ctc,
            pfEmployeeContribution,
            professionalTax,
            medicalInsuranceEmployee,
            netSalary,
        } = req.body;

        if (!employeeId || !month || !year || !basicSalary) {
            return res.status(400).json({ error: "Missing fields" });
        }

        const basic = Number(basicSalary);
        const hraVal = Number(hra) || basic * 0.4;
        const specialAllowanceVal = Number(specialAllowance) || 0;
        const siteAllowanceVal = Number(siteAllowance) || 0;
        const conveyanceVal = Number(conveyance) || 0;
        const totalAllowances = hraVal + specialAllowanceVal + siteAllowanceVal + conveyanceVal;
        const computedGross = Number(grossSalary) || (basic + totalAllowances);

        const pfEmployerVal = Number(pfEmployerContribution) || basic * 0.12;
        const compInsuranceVal = Number(compensationInsurance) || 0;
        const medicalEmployerVal = Number(medicalInsuranceEmployer) || 0;
        const computedCtc = Number(ctc) || (computedGross + pfEmployerVal + compInsuranceVal + medicalEmployerVal);

        const pfEmployeeVal = Number(pfEmployeeContribution) || basic * 0.12;
        const professionalTaxVal = Number(professionalTax) || 0;
        const medicalEmployeeVal = Number(medicalInsuranceEmployee) || 0;
        const totalDeductions = pfEmployeeVal + professionalTaxVal + medicalEmployeeVal;

        const computedNet = Number(netSalary) || (computedGross - totalDeductions);

        const payslip = await Payslip.create({
            employeeId,
            month: Number(month),
            year: Number(year),
            basicSalary: basic,
            hra: hraVal,
            specialAllowance: specialAllowanceVal,
            siteAllowance: siteAllowanceVal,
            conveyance: conveyanceVal,
            allowances: totalAllowances,
            grossSalary: computedGross,
            pfEmployerContribution: pfEmployerVal,
            compensationInsurance: compInsuranceVal,
            medicalInsuranceEmployer: medicalEmployerVal,
            ctc: computedCtc,
            pfEmployeeContribution: pfEmployeeVal,
            professionalTax: professionalTaxVal,
            medicalInsuranceEmployee: medicalEmployeeVal,
            deductions: totalDeductions,
            netSalary: computedNet,
        })

        return res.json({ success: true, data: payslip })
    } catch (error) {
        console.error("Create Payslip Error:", error);
        return res.status(500).json({ error: "Failed" });
    }
}


// Get payslips
// GET /api/payslips
export const getPayslips = async (req, res) => {
    try {
        const session = req.session;
        const isAdmin = session.role === "ADMIN";
        if (isAdmin) {
            const payslips = await Payslip.find().populate("employeeId").sort({ createdAt: -1 });
            const data = payslips.map((p) => {
                const obj = p.toObject();
                return {
                    ...obj,
                    id: obj._id.toString(),
                    employee: obj.employeeId,
                    employeeId: obj.employeeId?._id?.toString(),
                }
            })
            return res.json({ data });
        } else {
            const employee = await Employee.findOne({ userId: session.userId })
            if (!employee) return res.status(404).json({ error: "Not found" });
            const payslips = await Payslip.find({ employeeId: employee._id }).sort({ createdAt: -1 });
            return res.json({ data: payslips })
        }
    } catch (error) {
        return res.status(500).json({ error: "Failed" });
    }
}



// Get payslip by ID
// GET /api/payslips/:id
export const getPayslipById = async (req, res) => {
    try {
        const payslip = await Payslip.findById(req.params.id).populate("employeeId").lean();
        if (!payslip) return res.status(404).json({ error: "Not found" });

        const result = {
            ...payslip,
            id: payslip._id.toString(),
            employee: payslip.employeeId,
        }
        return res.json(result)
    } catch (error) {
        return res.status(500).json({ error: "Failed" });
    }
}