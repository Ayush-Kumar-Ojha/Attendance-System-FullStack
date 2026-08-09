import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Loading from '../components/Loading';
import { format } from "date-fns";
import api from '../api/axios';
import logo from '../assets/logo.jpg';

// Converts a number into words (Indian numbering system)
const numberToWords = (num) => {
    if (num === 0) return "Zero";

    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const twoDigits = (n) => {
        if (n < 20) return ones[n];
        return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    };

    const threeDigits = (n) => {
        if (n < 100) return twoDigits(n);
        return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + twoDigits(n % 100) : "");
    };

    let result = "";
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const hundred = num;

    if (crore) result += threeDigits(crore) + " Crore ";
    if (lakh) result += threeDigits(lakh) + " Lakh ";
    if (thousand) result += threeDigits(thousand) + " Thousand ";
    if (hundred) result += threeDigits(hundred);

    return result.trim();
};

const PrintPayslip = () => {
    const { id } = useParams();
    const [payslip, setPayslip] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/payslip/${id}`)
           .then((res) => setPayslip(res.data))
           .catch(console.error)
           .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <Loading />;
    if (!payslip) return <p className='text-center py-12 text-slate-400'>Payslip not found</p>;

    const fmt = (val) => `₹${Number(val || 0).toLocaleString()}`;

    // Calculated fields with smart fallbacks if backend didn't store breakdown
    const basic = Number(payslip.basicSalary || 0);
    const hra = payslip.hra !== undefined && payslip.hra !== null && payslip.hra !== 0
        ? Number(payslip.hra)
        : basic * 0.4;
    const specialAllowance = Number(payslip.specialAllowance || 0);
    const siteAllowance = Number(payslip.siteAllowance || 0);
    const conveyance = Number(payslip.conveyance || 0);

    const grossEarnings = payslip.grossSalary || (basic + hra + specialAllowance + siteAllowance + conveyance);

    const pfEmployee = payslip.pfEmployeeContribution !== undefined && payslip.pfEmployeeContribution !== null && payslip.pfEmployeeContribution !== 0
        ? Number(payslip.pfEmployeeContribution)
        : basic * 0.12;
    const professionalTax = Number(payslip.professionalTax || 0);
    const medicalEmployee = Number(payslip.medicalInsuranceEmployee || 0);

    const totalDeductions = pfEmployee + professionalTax + medicalEmployee;
    const netPayable = payslip.netSalary && payslip.netSalary !== basic ? Number(payslip.netSalary) : (grossEarnings - totalDeductions);

    const designation = payslip.employee?.designation || payslip.employee?.position || 'Staff';
    const department = payslip.employee?.department || 'N/A';
    const period = format(new Date(payslip.year, payslip.month - 1), "MMMM yyyy");

    const amountInWords = `Rupees ${numberToWords(Math.round(netPayable))} Only`;

    const earningsRows = [
        { label: "Basic", value: basic },
        { label: "HRA", value: hra },
        { label: "Conveyance", value: conveyance },
        { label: "Special Allowance", value: specialAllowance + siteAllowance },
    ];

    const deductionsRows = [
        { label: "PF (Employee)", value: pfEmployee },
        { label: "Professional Tax", value: professionalTax },
        { label: "Health Insurance", value: medicalEmployee },
    ];

    return (
        <div className="max-w-3xl mx-auto p-8 bg-white animate-fade-in my-6 print:my-0">

            {/* Logo */}
            <div className="flex justify-center mb-6">
                <img src={logo} alt="Wehark Solutions" className="h-10" />
            </div>

            {/* Title Bar */}
            <div className="border border-slate-800 bg-slate-100 py-2.5 text-center mb-0">
                <h1 className="text-lg font-bold text-indigo-900 uppercase tracking-wide">
                    Pay Slip - {period}
                </h1>
            </div>

            {/* Employee Pay Summary */}
            <div className="border border-t-0 border-slate-800">
                <div className="bg-slate-200 border-b border-slate-800 px-3 py-1.5">
                    <h2 className="font-bold text-slate-800 text-sm">Employee Pay Summary</h2>
                </div>

                <div className="grid grid-cols-2 text-sm">
                    <div className="border-b border-r border-slate-300 px-3 py-2 font-semibold text-slate-800 bg-slate-50">Employee Name</div>
                    <div className="border-b border-slate-300 px-3 py-2 text-slate-700">{payslip.employee?.firstName} {payslip.employee?.lastName}</div>

                    <div className="border-b border-r border-slate-300 px-3 py-2 font-semibold text-slate-800 bg-slate-50">Designation</div>
                    <div className="border-b border-slate-300 px-3 py-2 text-slate-700">{designation}</div>

                    <div className="border-r border-slate-300 px-3 py-2 font-semibold text-slate-800 bg-slate-50">Department</div>
                    <div className="px-3 py-2 text-slate-700">{department}</div>
                </div>
            </div>

            {/* Earnings & Deductions - side by side */}
            <div className="grid grid-cols-2 gap-0 mt-4 text-sm">
                {/* Earnings */}
                <div className="border border-slate-800 border-r-0">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-indigo-300">
                                <th className="text-left px-3 py-2 font-bold text-slate-900 border-b border-slate-800">Earnings</th>
                                <th className="text-right px-3 py-2 font-bold text-slate-900 border-b border-slate-800">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {earningsRows.map((row) => (
                                <tr key={row.label} className="border-b border-slate-300">
                                    <td className="px-3 py-2 text-slate-700">{row.label}</td>
                                    <td className="px-3 py-2 text-right text-slate-900">{Number(row.value).toLocaleString()}</td>
                                </tr>
                            ))}
                            <tr className="bg-indigo-300 font-bold">
                                <td className="px-3 py-2 text-slate-900">Gross Earnings</td>
                                <td className="px-3 py-2 text-right text-slate-900">{fmt(grossEarnings)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Deductions */}
                <div className="border border-slate-800">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-indigo-300">
                                <th className="text-left px-3 py-2 font-bold text-slate-900 border-b border-slate-800">Deductions</th>
                                <th className="text-right px-3 py-2 font-bold text-slate-900 border-b border-slate-800">Amount(₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deductionsRows.map((row) => (
                                <tr key={row.label} className="border-b border-slate-300">
                                    <td className="px-3 py-2 text-slate-700">{row.label}</td>
                                    <td className="px-3 py-2 text-right text-slate-900">{Number(row.value).toLocaleString()}</td>
                                </tr>
                            ))}
                            <tr className="bg-indigo-300 font-bold">
                                <td className="px-3 py-2 text-slate-900">Total Deductions</td>
                                <td className="px-3 py-2 text-right text-slate-900">{fmt(totalDeductions)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Net Payable */}
            <div className="border border-t-0 border-slate-800 bg-amber-50 py-4 text-center">
                <p className="font-bold text-slate-900 text-base">
                    NET PAYABLE: {fmt(netPayable)} /-
                </p>
                <p className="text-sm text-slate-600 mt-1">
                    ({amountInWords})
                </p>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-slate-400 mt-6 border-t border-slate-200 pt-4">
                This is a system generated payslip and does not require a signature.
            </p>

            {/* Print Button */}
            <div className='text-center print:hidden mt-8'>
                <button
                    className='px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow hover:bg-indigo-700 transition-colors'
                    onClick={() => window.print()}
                >
                    Print Payslip
                </button>
            </div>
        </div>
    );
};

export default PrintPayslip;