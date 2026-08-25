import React, { useMemo, useState, useEffect } from "react";
import {
    Loader2,
    Plus,
    X,
    Search,
    User,
    CalendarDays,
    IndianRupee,
    Calculator,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

/* =========================================================
   Reusable Components
========================================================= */

const SectionHeader = ({ icon: Icon, title, description }) => (
    <div className="flex items-start gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600">
            <Icon className="w-4 h-4" />
        </div>

        <div>
            <h4 className="text-sm font-bold text-slate-900">
                {title}
            </h4>

            {description && (
                <p className="text-xs text-slate-500 mt-0.5">
                    {description}
                </p>
            )}
        </div>
    </div>
);

const Field = ({
    label,
    value,
    onChange,
    type = "number",
    placeholder,
    prefix,
    disabled = false,
}) => (
    <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            {label}
        </label>

        <div className="relative">
            {prefix && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    {prefix}
                </span>
            )}

            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full ${
                    prefix ? "pl-8" : "px-3"
                } pr-3 py-2.5 text-sm border border-slate-300 rounded-lg
                bg-white text-slate-900
                focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                outline-none transition
                ${disabled ? "bg-slate-100 cursor-not-allowed" : ""}`}
            />
        </div>
    </div>
);

const ReadOnlyRow = ({ label, value }) => (
    <div className="flex items-center justify-between py-2.5">
        <span className="text-sm text-slate-600">
            {label}
        </span>

        <span className="text-sm font-semibold text-slate-900">
            ₹{Number(value || 0).toLocaleString("en-IN", {
                maximumFractionDigits: 0,
            })}
        </span>
    </div>
);

const SummaryCard = ({ label, value, highlight = false }) => (
    <div
        className={`rounded-xl border p-4 ${
            highlight
                ? "border-indigo-200 bg-indigo-50"
                : "border-slate-200 bg-white"
        }`}
    >
        <p className="text-xs font-medium text-slate-500">
            {label}
        </p>

        <p
            className={`text-lg font-bold mt-1 ${
                highlight
                    ? "text-indigo-700"
                    : "text-slate-900"
            }`}
        >
            ₹
            {Number(value || 0).toLocaleString("en-IN", {
                maximumFractionDigits: 0,
            })}
        </p>
    </div>
);

/* =========================================================
   Main Component
========================================================= */

const GeneratePayslipForm = ({
    employees = [],
    payslips = [],
    onSuccess,
}) => {
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
    const [medicalInsuranceEmployer, setMedicalInsuranceEmployer] =
        useState("0");

    const [professionalTax, setProfessionalTax] = useState("0");
    const [medicalInsuranceEmployee, setMedicalInsuranceEmployee] =
        useState("0");

    const [showConfirmation, setShowConfirmation] = useState(false);
    const [hasPreviousData, setHasPreviousData] = useState(false);

    /* =====================================================
       Employee
    ===================================================== */

    const selectedEmployee = employees.find(
        (e) => (e._id || e.id) === employeeId
    );

    const filteredEmployees = useMemo(() => {
        if (!employeeSearch.trim()) return employees;

        const q = employeeSearch.toLowerCase();

        return employees.filter((e) =>
            `${e.firstName || ""} ${e.lastName || ""}`
                .toLowerCase()
                .includes(q)
        );
    }, [employees, employeeSearch]);

    /* =====================================================
       Find Latest Payslip For Selected Employee
    ===================================================== */

    const getLatestEmployeePayslip = (id) => {
        if (!id) return null;

        const employeePayslips = payslips.filter((p) => {
            const payslipEmployeeId =
                p.employee?._id ||
                p.employee?.id ||
                p.employeeId;

            return String(payslipEmployeeId) === String(id);
        });

        if (!employeePayslips.length) return null;

        return [...employeePayslips].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();

            return dateB - dateA;
        })[0];
    };

    /* =====================================================
       Autofill Previous Payslip
    ===================================================== */

    const autofillFromPreviousPayslip = (id) => {
        const previous = getLatestEmployeePayslip(id);

        if (!previous) {
            setHasPreviousData(false);

            setBasicSalary("");
            setSpecialAllowance("0");
            setSiteAllowance("0");
            setConveyance("0");
            setCompInsurance("0");
            setMedicalInsuranceEmployer("0");
            setProfessionalTax("0");
            setMedicalInsuranceEmployee("0");

            return;
        }

        setHasPreviousData(true);

        setBasicSalary(
            previous.basicSalary !== undefined
                ? String(previous.basicSalary)
                : ""
        );

        setSpecialAllowance(
            String(previous.specialAllowance ?? 0)
        );

        setSiteAllowance(
            String(previous.siteAllowance ?? 0)
        );

        setConveyance(
            String(previous.conveyance ?? 0)
        );

        setCompInsurance(
            String(previous.compensationInsurance ?? 0)
        );

        setMedicalInsuranceEmployer(
            String(previous.medicalInsuranceEmployer ?? 0)
        );

        setProfessionalTax(
            String(previous.professionalTax ?? 0)
        );

        setMedicalInsuranceEmployee(
            String(previous.medicalInsuranceEmployee ?? 0)
        );
    };

    /* =====================================================
       Calculations
    ===================================================== */

    const basic = parseFloat(basicSalary) || 0;

    const hra = basic * 0.4;

    const special = parseFloat(specialAllowance) || 0;
    const site = parseFloat(siteAllowance) || 0;
    const conveyanceValue = parseFloat(conveyance) || 0;

    const grossSalary =
        basic +
        hra +
        special +
        site +
        conveyanceValue;

    const pfEmployer = basic * 0.12;

    const compensationInsurance =
        parseFloat(compInsurance) || 0;

    const employerMedicalInsurance =
        parseFloat(medicalInsuranceEmployer) || 0;

    const ctc =
        grossSalary +
        pfEmployer +
        compensationInsurance +
        employerMedicalInsurance;

    const pfEmployee = basic * 0.12;

    const professionalTaxValue =
        parseFloat(professionalTax) || 0;

    const employeeMedicalInsurance =
        parseFloat(medicalInsuranceEmployee) || 0;

    const totalDeductions =
        pfEmployee +
        professionalTaxValue +
        employeeMedicalInsurance;

    const totalAllowances =
        hra +
        special +
        site +
        conveyanceValue;

    const netSalary =
        grossSalary - totalDeductions;

    /* =====================================================
       Reset
    ===================================================== */

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

        setHasPreviousData(false);
        setShowConfirmation(false);

        setMonth(new Date().getMonth() + 1);
        setYear(new Date().getFullYear());
    };

    /* =====================================================
       Employee Selection
    ===================================================== */

    const handleEmployeeSelect = (employee) => {
        const id = employee._id || employee.id;

        setEmployeeId(id);
        setEmployeeSearch("");
        setShowDropdown(false);

        /*
         * Automatically load latest payslip data
         * for this employee.
         */
        autofillFromPreviousPayslip(id);
    };

    /* =====================================================
       Submit / Confirmation
    ===================================================== */

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!employeeId) {
            toast.error("Please select an employee");
            return;
        }

        if (!basicSalary || basic <= 0) {
            toast.error("Please enter a valid basic salary");
            return;
        }

        /*
         * Do NOT immediately generate.
         * First show confirmation.
         */
        setShowConfirmation(true);
    };

    const confirmGenerate = async () => {
        setLoading(true);

        const data = {
            employeeId,
            month,
            year,

            basicSalary: basic,
            hra,

            specialAllowance: special,
            siteAllowance: site,
            conveyance: conveyanceValue,

            allowances: totalAllowances,
            grossSalary,

            pfEmployerContribution: pfEmployer,

            compensationInsurance,
            medicalInsuranceEmployer:
                employerMedicalInsurance,

            ctc,

            pfEmployeeContribution: pfEmployee,

            professionalTax:
                professionalTaxValue,

            medicalInsuranceEmployee:
                employeeMedicalInsurance,

            deductions: totalDeductions,

            netSalary,
        };

        try {
            await api.post("/payslip", data);

            toast.success(
                "Payslip generated successfully!"
            );

            setShowConfirmation(false);
            setIsOpen(false);

            resetForm();

            onSuccess();
        } catch (err) {
            toast.error(
                err.response?.data?.error ||
                    err.message ||
                    "Failed to generate payslip"
            );
        } finally {
            setLoading(false);
        }
    };

    /* =====================================================
       Months
    ===================================================== */

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

    /* =====================================================
       Open Button
    ===================================================== */

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="btn-primary flex items-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Generate Payslip
            </button>
        );
    }

    /* =====================================================
       Main Form
    ===================================================== */

    return (
        <>
            {/* =================================================
                FORM MODAL
            ================================================= */}

            <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">

                <div className="w-full max-w-4xl max-h-[94vh] overflow-hidden bg-white rounded-2xl shadow-2xl">

                    {/* Header */}

                    <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-white">

                        <div>
                            <h3 className="text-xl font-bold text-slate-900">
                                Generate Monthly Payslip
                            </h3>

                            <p className="text-sm text-slate-500 mt-1">
                                Enter and review the employee's salary
                                information before generating the payslip.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                resetForm();
                            }}
                            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Scrollable Content */}

                    <div className="overflow-y-auto max-h-[calc(94vh-145px)]">

                        <form
                            onSubmit={handleSubmit}
                            className="p-6 space-y-6"
                        >

                            {/* =================================================
                                EMPLOYEE + PERIOD
                            ================================================= */}

                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">

                                <SectionHeader
                                    icon={User}
                                    title="Payslip Details"
                                    description="Select the employee and salary period."
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">

                                    {/* Employee */}

                                    <div className="relative">

                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                            Employee
                                        </label>

                                        <div className="relative">

                                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />

                                            <input
                                                type="text"
                                                value={
                                                    selectedEmployee
                                                        ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                                                        : employeeSearch
                                                }
                                                onChange={(e) => {
                                                    setEmployeeSearch(
                                                        e.target.value
                                                    );

                                                    setEmployeeId("");

                                                    setShowDropdown(true);
                                                }}
                                                onFocus={() =>
                                                    setShowDropdown(true)
                                                }
                                                placeholder="Search employee..."
                                                className="pl-9 pr-3 w-full border border-slate-300 rounded-lg py-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            />
                                        </div>

                                        {showDropdown && (
                                            <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">

                                                {filteredEmployees.length ===
                                                0 ? (
                                                    <p className="text-sm text-slate-400 p-4">
                                                        No employees found
                                                    </p>
                                                ) : (
                                                    filteredEmployees.map(
                                                        (employee) => (
                                                            <button
                                                                type="button"
                                                                key={
                                                                    employee._id ||
                                                                    employee.id
                                                                }
                                                                onClick={() =>
                                                                    handleEmployeeSelect(
                                                                        employee
                                                                    )
                                                                }
                                                                className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition border-b border-slate-100 last:border-none"
                                                            >
                                                                <div className="font-semibold text-sm text-slate-800">
                                                                    {
                                                                        employee.firstName
                                                                    }{" "}
                                                                    {
                                                                        employee.lastName
                                                                    }
                                                                </div>

                                                                <div className="text-xs text-slate-500 mt-0.5">
                                                                    {employee.designation ||
                                                                        employee.position ||
                                                                        "Employee"}
                                                                </div>
                                                            </button>
                                                        )
                                                    )
                                                )}
                                            </div>
                                        )}

                                        {hasPreviousData && (
                                            <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 font-medium">
                                                <CheckCircle2 className="w-3.5 h-3.5" />

                                                Previous payslip data loaded
                                            </div>
                                        )}
                                    </div>

                                    {/* Period */}

                                    <div className="grid grid-cols-2 gap-3">

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                                Month
                                            </label>

                                            <select
                                                value={month}
                                                onChange={(e) =>
                                                    setMonth(
                                                        Number(
                                                            e.target.value
                                                        )
                                                    )
                                                }
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                            >
                                                {months.map((m) => (
                                                    <option
                                                        key={m.value}
                                                        value={m.value}
                                                    >
                                                        {m.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <Field
                                            label="Year"
                                            type="number"
                                            value={year}
                                            onChange={(e) =>
                                                setYear(
                                                    Number(e.target.value)
                                                )
                                            }
                                        />

                                    </div>

                                </div>

                            </div>

                            {/* =================================================
                                EARNINGS
                            ================================================= */}

                            <div className="border border-slate-200 rounded-xl p-5">

                                <SectionHeader
                                    icon={IndianRupee}
                                    title="Earnings"
                                    description="Salary and employee allowances."
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">

                                    <Field
                                        label="Basic Salary"
                                        value={basicSalary}
                                        onChange={(e) =>
                                            setBasicSalary(e.target.value)
                                        }
                                        prefix="₹"
                                        placeholder="50000"
                                    />

                                    <Field
                                        label="Special Allowance"
                                        value={specialAllowance}
                                        onChange={(e) =>
                                            setSpecialAllowance(
                                                e.target.value
                                            )
                                        }
                                        prefix="₹"
                                    />

                                    <Field
                                        label="Site Allowance"
                                        value={siteAllowance}
                                        onChange={(e) =>
                                            setSiteAllowance(
                                                e.target.value
                                            )
                                        }
                                        prefix="₹"
                                    />

                                    <Field
                                        label="Conveyance"
                                        value={conveyance}
                                        onChange={(e) =>
                                            setConveyance(
                                                e.target.value
                                            )
                                        }
                                        prefix="₹"
                                    />

                                </div>

                                <div className="mt-5 bg-slate-50 rounded-lg px-4">

                                    <ReadOnlyRow
                                        label="Basic Salary"
                                        value={basic}
                                    />

                                    <ReadOnlyRow
                                        label="HRA (40% of Basic)"
                                        value={hra}
                                    />

                                    <div className="border-t border-slate-200">
                                        <ReadOnlyRow
                                            label="Gross Salary"
                                            value={grossSalary}
                                        />
                                    </div>

                                </div>

                            </div>

                            {/* =================================================
                                EMPLOYER CONTRIBUTIONS
                            ================================================= */}

                            <div className="border border-slate-200 rounded-xl p-5">

                                <SectionHeader
                                    icon={ShieldCheck}
                                    title="Employer Contributions"
                                    description="Company-side contributions included in CTC."
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                            PF Employer Contribution
                                        </label>

                                        <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700">
                                            ₹
                                            {pfEmployer.toLocaleString(
                                                "en-IN",
                                                {
                                                    maximumFractionDigits: 0,
                                                }
                                            )}
                                        </div>
                                    </div>

                                    <Field
                                        label="Compensation Insurance"
                                        value={compInsurance}
                                        onChange={(e) =>
                                            setCompInsurance(
                                                e.target.value
                                            )
                                        }
                                        prefix="₹"
                                    />

                                    <Field
                                        label="Medical Insurance"
                                        value={medicalInsuranceEmployer}
                                        onChange={(e) =>
                                            setMedicalInsuranceEmployer(
                                                e.target.value
                                            )
                                        }
                                        prefix="₹"
                                    />

                                </div>

                                <div className="mt-5 bg-indigo-50 border border-indigo-100 rounded-lg px-4">

                                    <ReadOnlyRow
                                        label="Cost to Company (CTC)"
                                        value={ctc}
                                    />

                                </div>

                            </div>

                            {/* =================================================
                                DEDUCTIONS
                            ================================================= */}

                            <div className="border border-slate-200 rounded-xl p-5">

                                <SectionHeader
                                    icon={Calculator}
                                    title="Employee Deductions"
                                    description="Amounts deducted from the employee's salary."
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                            PF Employee Contribution
                                        </label>

                                        <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700">
                                            ₹
                                            {pfEmployee.toLocaleString(
                                                "en-IN",
                                                {
                                                    maximumFractionDigits: 0,
                                                }
                                            )}
                                        </div>
                                    </div>

                                    <Field
                                        label="Professional Tax"
                                        value={professionalTax}
                                        onChange={(e) =>
                                            setProfessionalTax(
                                                e.target.value
                                            )
                                        }
                                        prefix="₹"
                                    />

                                    <Field
                                        label="Medical Insurance"
                                        value={medicalInsuranceEmployee}
                                        onChange={(e) =>
                                            setMedicalInsuranceEmployee(
                                                e.target.value
                                            )
                                        }
                                        prefix="₹"
                                    />

                                </div>

                                <div className="mt-5 bg-slate-50 rounded-lg px-4">

                                    <ReadOnlyRow
                                        label="Total Deductions"
                                        value={totalDeductions}
                                    />

                                </div>

                            </div>

                            {/* =================================================
                                SUMMARY
                            ================================================= */}

                            <div>

                                <div className="flex items-center gap-2 mb-3">

                                    <Calculator className="w-4 h-4 text-indigo-600" />

                                    <h4 className="text-sm font-bold text-slate-900">
                                        Payslip Summary
                                    </h4>

                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                                    <SummaryCard
                                        label="Gross Salary"
                                        value={grossSalary}
                                    />

                                    <SummaryCard
                                        label="Total Deductions"
                                        value={totalDeductions}
                                    />

                                    <SummaryCard
                                        label="Net Payable"
                                        value={netSalary}
                                        highlight
                                    />

                                </div>

                            </div>

                            {/* =================================================
                                FOOTER
                            ================================================= */}

                            <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200">

                                <p className="text-xs text-slate-500">
                                    Review all salary details before
                                    generating the payslip.
                                </p>

                                <div className="flex gap-3">

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOpen(false);
                                            resetForm();
                                        }}
                                        className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2 disabled:opacity-60"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />

                                        Review & Generate
                                    </button>

                                </div>

                            </div>

                        </form>

                    </div>

                </div>
            </div>

            {/* =================================================
                CONFIRMATION MODAL
            ================================================= */}

            {showConfirmation && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">

                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

                        {/* Confirmation Header */}

                        <div className="p-6 border-b border-slate-200">

                            <div className="flex items-center gap-3">

                                <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">
                                        Review Before Generating
                                    </h3>

                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Please verify the following details.
                                    </p>
                                </div>

                            </div>

                        </div>

                        {/* Details */}

                        <div className="p-6 space-y-4">

                            <div className="bg-slate-50 rounded-xl p-4 space-y-3">

                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">
                                        Employee
                                    </span>

                                    <span className="text-sm font-semibold text-slate-900">
                                        {selectedEmployee?.firstName}{" "}
                                        {selectedEmployee?.lastName}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">
                                        Period
                                    </span>

                                    <span className="text-sm font-semibold text-slate-900">
                                        {
                                            months.find(
                                                (m) =>
                                                    m.value === month
                                            )?.name
                                        }{" "}
                                        {year}
                                    </span>
                                </div>

                                <div className="border-t border-slate-200 pt-3 flex justify-between">
                                    <span className="text-sm text-slate-500">
                                        Basic Salary
                                    </span>

                                    <span className="text-sm font-semibold">
                                        ₹
                                        {basic.toLocaleString(
                                            "en-IN"
                                        )}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">
                                        Gross Salary
                                    </span>

                                    <span className="text-sm font-semibold">
                                        ₹
                                        {grossSalary.toLocaleString(
                                            "en-IN"
                                        )}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">
                                        Total Deductions
                                    </span>

                                    <span className="text-sm font-semibold">
                                        ₹
                                        {totalDeductions.toLocaleString(
                                            "en-IN"
                                        )}
                                    </span>
                                </div>

                                <div className="border-t border-slate-200 pt-3 flex justify-between">

                                    <span className="text-sm font-bold text-slate-900">
                                        Net Payable
                                    </span>

                                    <span className="text-base font-bold text-indigo-600">
                                        ₹
                                        {netSalary.toLocaleString(
                                            "en-IN"
                                        )}
                                    </span>

                                </div>

                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">

                                <p className="text-xs text-amber-800 leading-relaxed">
                                    Once generated, this payslip will be
                                    added to the employee's payslip history.
                                    Please make sure the salary details and
                                    period are correct.
                                </p>

                            </div>

                        </div>

                        {/* Actions */}

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">

                            <button
                                type="button"
                                disabled={loading}
                                onClick={() =>
                                    setShowConfirmation(false)
                                }
                                className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-300 bg-white rounded-lg hover:bg-slate-50"
                            >
                                Go Back & Edit
                            </button>

                            <button
                                type="button"
                                disabled={loading}
                                onClick={confirmGenerate}
                                className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-60"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Confirm & Generate
                                    </>
                                )}
                            </button>

                        </div>

                    </div>

                </div>
            )}
        </>
    );
};

export default GeneratePayslipForm;