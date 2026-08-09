import React from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";

const PayslipList = ({ payslips = [], isAdmin }) => {
    const calculateNetSalary = (p) => {
        if (p.netSalary !== undefined && p.netSalary !== null && p.netSalary !== p.basicSalary) {
            return p.netSalary;
        }
        // Fallback calculation if netSalary is not returned properly by backend
        const basic = Number(p.basicSalary || 0);
        const allowances = Number(p.allowances || (p.hra || basic * 0.4) + (p.specialAllowance || 0) + (p.siteAllowance || 0) + (p.conveyance || 0));
        const deductions = Number(p.deductions || (p.pfEmployeeContribution || basic * 0.12) + (p.professionalTax || 0) + (p.medicalInsuranceEmployee || 0));
        return basic + allowances - deductions;
    };

    return (
        <div className="card overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            {isAdmin && <th className="py-3 px-6">Employee</th>}
                            <th className="py-3 px-6">Period</th>
                            <th className="py-3 px-6">Basic Salary</th>
                            <th className="py-3 px-6">Net Salary</th>
                            <th className="py-3 px-6 text-center">Actions</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                        {payslips.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={isAdmin ? 5 : 4}
                                    className="text-center py-12 text-slate-400"
                                >
                                    No payslips found
                                </td>
                            </tr>
                        ) : (
                            payslips.map((payslip) => {
                                const netVal = calculateNetSalary(payslip);

                                return (
                                    <tr key={payslip._id || payslip.id} className="hover:bg-slate-50 transition-colors">
                                        {isAdmin && (
                                            <td className="py-4 px-6 font-medium text-slate-900">
                                                {payslip.employee?.firstName} {payslip.employee?.lastName}
                                            </td>
                                        )}

                                        <td className="py-4 px-6 text-slate-600">
                                            {format(
                                                new Date(
                                                    payslip.year,
                                                    payslip.month - 1
                                                ),
                                                "MMM yyyy"
                                            )}
                                        </td>

                                        <td className="py-4 px-6 text-slate-700 font-medium">
                                            ₹{Number(payslip.basicSalary || 0).toLocaleString()}
                                        </td>

                                        <td className="py-4 px-6 font-bold text-slate-900">
                                            ₹{Number(netVal).toLocaleString()}
                                        </td>

                                        <td className="py-4 px-6 text-center">
                                            <button
                                                onClick={() =>
                                                    window.open(
                                                        `/print/payslips/${payslip._id || payslip.id}`,
                                                        "_blank"
                                                    )
                                                }
                                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200"
                                            >
                                                <Download className="w-3.5 h-3.5 mr-1.5" />
                                                Download
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PayslipList;