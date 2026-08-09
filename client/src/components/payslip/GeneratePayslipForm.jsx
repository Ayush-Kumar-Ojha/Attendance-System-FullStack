import { Loader2, Plus, X, Search } from "lucide-react";
import React, { useState, useMemo } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";

// Declared OUTSIDE component to prevent React from unmounting inputs on state change (fixes focus loss bug)
const BreakdownRow = ({ label, value, editable, onChange, highlight }) => (
    <div
        className={`flex items-center justify-between py-2 px-3 rounded-lg ${
            highlight ? "bg-amber-50 font-semibold" : ""
        }`}
    >
        <span className={`text-sm ${highlight ? "font-semibold text-slate-900" : "text-slate-600"}`}>
            {label}
        </span>
        {editable ? (
            <input
                type="number"
                value={value}
                onChange={onChange}
                className="w-28 py-1.5 px-2 text-right border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
        ) : (
            <span className={`text-sm ${highlight ? "font-bold text-slate-900" : "text-slate-500"}`}>
                ₹{Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
        )}
    </div>
);

const GeneratePayslipForm = ({ employees = [], onSuccess }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [employeeId, setEmployeeId] = useState("");
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);

    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    const [basicSalary, setBasicSalary] = useState("");
    const [specialAllowance, setSpecialAllowance] = useState("0");
    const [siteAllowance, setSiteAllowance] = useState("0");
    const [conveyance, setConveyance] = useState("0");
    const [compInsurance, setCompInsurance] = useState("0");
    const [medicalInsuranceEmployer, setMedicalInsuranceEmployer] = useState("0");
    const [professionalTax, setProfessionalTax] = useState("0");
    const [medicalInsuranceEmployee, setMedicalInsuranceEmployee] = useState("0");

    const selectedEmployee = employees.find((e) => (e._id || e.id) === employeeId);

    const filteredEmployees = useMemo(() => {
        if (!employeeSearch) return employees;
        const q = employeeSearch.toLowerCase();
        return employees.filter((e) =>
            `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase().includes(q)
        );
    }, [employees, employeeSearch]);

    // Live calculations
    const basic = parseFloat(basicSalary) || 0;
    const hra = basic * 0.4;
    const grossSalary =
        basic + hra + (parseFloat(specialAllowance) || 0) + (parseFloat(siteAllowance) || 0) + (parseFloat(conveyance) || 0);
    const pfEmployer = basic * 0.12;
    const ctc =
        grossSalary + pfEmployer + (parseFloat(compInsurance) || 0) + (parseFloat(medicalInsuranceEmployer) || 0);
    const pfEmployee = basic * 0.12;
    const totalDeductions = pfEmployee + (parseFloat(professionalTax) || 0) + (parseFloat(medicalInsuranceEmployee) || 0);
    const totalAllowances = hra + (parseFloat(specialAllowance) || 0) + (parseFloat(siteAllowance) || 0) + (parseFloat(conveyance) || 0);
    const netSalary = grossSalary - totalDeductions;

    const resetForm = () => {
        setEmployeeId("");
        setEmployeeSearch("");
        setBasicSalary("");
        setSpecialAllowance("0");
        setSiteAllowance("0");
        setConveyance("0");
        setCompInsurance("0");
        setMedicalInsuranceEmployer("0");
        setProfessionalTax("0");
        setMedicalInsuranceEmployee("0");
    };

    if (!isOpen)
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="btn-primary flex items-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Generate Payslip
            </button>
        );

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!employeeId) {
            toast.error("Please select an employee");
            return;
        }

        setLoading(true);

        const data = {
            employeeId,
            month,
            year,
            basicSalary: basic,
            hra,
            specialAllowance: parseFloat(specialAllowance) || 0,
            siteAllowance: parseFloat(siteAllowance) || 0,
            conveyance: parseFloat(conveyance) || 0,
            allowances: totalAllowances,
            grossSalary,
            pfEmployerContribution: pfEmployer,
            compensationInsurance: parseFloat(compInsurance) || 0,
            medicalInsuranceEmployer: parseFloat(medicalInsuranceEmployer) || 0,
            ctc,
            pfEmployeeContribution: pfEmployee,
            professionalTax: parseFloat(professionalTax) || 0,
            medicalInsuranceEmployee: parseFloat(medicalInsuranceEmployee) || 0,
            deductions: totalDeductions,
            netSalary,
        };

        try {
            await api.post("/payslip", data);
            toast.success("Payslip generated successfully!");
            setIsOpen(false);
            resetForm();
            onSuccess();
        } catch (err) {
            toast.error(err.response?.data?.error || err.message);
        }
        setLoading(false);
    };

    const months = [
        { value: 1, name: "January" },
        { value: 2, name: "February" },
        { value: 3, name: "March" },
        { value: 4, name: "April" },
        { value: 5, name: "May" },
        { value: 6, name: "June" },
        { value: 7, name: "July" },
        { value: 8, name: "August" },
        { value: 9, name: "September" },
        { value: 10, name: "October" },
        { value: 11, name: "November" },
        { value: 12, name: "December" },
    ];

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="card max-w-lg w-full p-6 animate-slide-up mt-8 mb-8 bg-white rounded-xl shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900">
                        Generate Monthly Payslip
                    </h3>

                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Searchable Employee Select */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Employee
                        </label>

                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName} (${selectedEmployee.designation || selectedEmployee.position || 'Staff'})` : employeeSearch}
                                onChange={(e) => {
                                    setEmployeeSearch(e.target.value);
                                    setEmployeeId("");
                                    setShowDropdown(true);
                                }}
                                onFocus={() => setShowDropdown(true)}
                                placeholder="Search or select employee..."
                                className="pl-9 w-full border border-slate-300 rounded-lg py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        {showDropdown && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {filteredEmployees.length === 0 ? (
                                    <p className="text-sm text-slate-400 p-3">No employees found</p>
                                ) : (
                                    filteredEmployees.map((e) => (
                                        <button
                                            type="button"
                                            key={e._id || e.id}
                                            onClick={() => {
                                                setEmployeeId(e._id || e.id);
                                                setEmployeeSearch("");
                                                setShowDropdown(false);
                                            }}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors border-b last:border-none"
                                        >
                                            <span className="font-medium text-slate-800">{e.firstName} {e.lastName}</span>{" "}
                                            <span className="text-slate-400 text-xs">({e.designation || e.position || 'Employee'})</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Month and Year */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Month
                            </label>
                            <select 
                                value={month} 
                                onChange={(e) => setMonth(Number(e.target.value))}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                {months.map((m) => (
                                    <option key={m.value} value={m.value}>
                                        {m.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Year
                            </label>
                            <input
                                type="number"
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Basic Salary */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Basic Salary
                        </label>
                        <input
                            type="number"
                            value={basicSalary}
                            onChange={(e) => setBasicSalary(e.target.value)}
                            required
                            placeholder="5000"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    {/* Breakdown */}
                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-slate-50/50">
                        <BreakdownRow label="Basic" value={basic} />
                        <BreakdownRow label="HRA @ 40%" value={hra} />
                        <BreakdownRow
                            label="Special Allowance"
                            value={specialAllowance}
                            editable
                            onChange={(e) => setSpecialAllowance(e.target.value)}
                        />
                        <BreakdownRow
                            label="Site Allowance"
                            value={siteAllowance}
                            editable
                            onChange={(e) => setSiteAllowance(e.target.value)}
                        />
                        <BreakdownRow
                            label="Conveyance"
                            value={conveyance}
                            editable
                            onChange={(e) => setConveyance(e.target.value)}
                        />
                        <BreakdownRow label="Gross Salary (Before Deductions)" value={grossSalary} highlight />
                        <BreakdownRow label="PF Employer contribution" value={pfEmployer} />
                        <BreakdownRow
                            label="Employees Compensation Insurance"
                            value={compInsurance}
                            editable
                            onChange={(e) => setCompInsurance(e.target.value)}
                        />
                        <BreakdownRow
                            label="Medical Insurance"
                            value={medicalInsuranceEmployer}
                            editable
                            onChange={(e) => setMedicalInsuranceEmployer(e.target.value)}
                        />
                        <BreakdownRow label="Cost to Company (CTC)" value={ctc} highlight />
                        <BreakdownRow label="PF Employee contribution" value={pfEmployee} />
                        <BreakdownRow
                            label="Professional Tax"
                            value={professionalTax}
                            editable
                            onChange={(e) => setProfessionalTax(e.target.value)}
                        />
                        <BreakdownRow
                            label="Medical Insurance"
                            value={medicalInsuranceEmployee}
                            editable
                            onChange={(e) => setMedicalInsuranceEmployee(e.target.value)}
                        />
                        <BreakdownRow label="Net Payable Salary (Take-Home)" value={netSalary} highlight />
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => setIsOpen(false)}
                            type="button"
                            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            Cancel
                        </button>

                        <button
                            disabled={loading}
                            type="submit"
                            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow flex items-center"
                        >
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Generate
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GeneratePayslipForm;