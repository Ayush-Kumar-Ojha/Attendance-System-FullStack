import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Loading from '../components/Loading';
import { format } from "date-fns";
import api from '../api/axios';
import logo from '../assets/logo.jpg';

const PrintBillVoucher = () => {
    const { id } = useParams();
    const [voucher, setVoucher] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/bill-claims/vouchers/${id}`)
           .then((res) => setVoucher(res.data))
           .catch(console.error)
           .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <Loading />;
    if (!voucher) return <p className='text-center py-12 text-slate-400'>Voucher not found</p>;

    const fmt = (val) => `₹${Number(val || 0).toLocaleString()}`;

    const dateOfJoining = voucher.joinDate
        ? format(new Date(voucher.joinDate), "d/M/yyyy")
        : 'N/A';

    const generatedOn = voucher.createdAt
        ? format(new Date(voucher.createdAt), "d MMM yyyy")
        : '';

    const summaryRows = [
        ["Employee Code", voucher.employeeCode || 'N/A', "Employee Name", voucher.employeeName || 'N/A'],
        ["Email ID", voucher.email || 'N/A', "Phone No", voucher.phone || 'N/A'],
        ["Date of Joining", dateOfJoining, "Designation", voucher.designation || 'N/A'],
        ["Department", voucher.department || 'N/A', "Bank Name", voucher.bankName || 'N/A'],
        ["Bank A/C Number", voucher.bankAccountNumber || 'N/A', "UAN", voucher.uanNumber || 'N/A'],
        ["PAN", voucher.panNumber || 'N/A', "", ""],
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
                    Bill Reimbursement Voucher
                </h1>
                {generatedOn && (
                    <p className="text-xs text-slate-500 mt-0.5">Generated on {generatedOn}</p>
                )}
            </div>

            {/* Employee Summary */}
            <div className="border border-t-0 border-slate-800">
                <div className="bg-slate-200 border-b border-slate-800 px-3 py-1.5">
                    <h2 className="font-bold text-slate-800 text-sm">Employee Details</h2>
                </div>

                <div className="grid grid-cols-4 text-sm">
                    {summaryRows.map(([label1, value1, label2, value2], idx) => {
                        const isLastRow = idx === summaryRows.length - 1;
                        const borderB = isLastRow ? "" : "border-b border-slate-300";

                        return (
                            <>
                                <div key={`l1-${idx}`} className={`border-r ${borderB} px-3 py-2 font-semibold text-slate-800 bg-slate-50`}>
                                    {label1}
                                </div>
                                <div key={`v1-${idx}`} className={`border-r ${borderB} px-3 py-2 text-slate-700`}>
                                    {value1}
                                </div>
                                <div key={`l2-${idx}`} className={`border-r ${borderB} px-3 py-2 font-semibold text-slate-800 bg-slate-50`}>
                                    {label2}
                                </div>
                                <div key={`v2-${idx}`} className={`${borderB} px-3 py-2 text-slate-700`}>
                                    {value2}
                                </div>
                            </>
                        );
                    })}
                </div>
            </div>

            {/* Claim Details */}
            <div className="border border-t-0 border-slate-800">
                <div className="bg-slate-200 border-b border-slate-800 px-3 py-1.5">
                    <h2 className="font-bold text-slate-800 text-sm">Claim Details</h2>
                </div>

                <div className="grid grid-cols-2 text-sm">
                    <div className="border-b border-r border-slate-300 px-3 py-2 font-semibold text-slate-800 bg-slate-50">Reason</div>
                    <div className="border-b border-slate-300 px-3 py-2 text-slate-700">{voucher.reason || 'N/A'}</div>

                    <div className="border-r border-slate-300 px-3 py-2 font-semibold text-slate-800 bg-slate-50">Bill Amount</div>
                    <div className="px-3 py-2 text-slate-700 font-semibold">{fmt(voucher.amount)}</div>
                </div>
            </div>

            {/* Net Payable */}
            <div className="border border-t-0 border-slate-800 bg-amber-50 py-4 text-center">
                <p className="font-bold text-slate-900 text-base">
                    AMOUNT PAYABLE: {fmt(voucher.amount)} /-
                </p>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-slate-400 mt-6 border-t border-slate-200 pt-4">
                This is a system generated voucher and does not require a signature.
            </p>

            {/* Print Button */}
            <div className='text-center print:hidden mt-8'>
                <button
                    className='px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow hover:bg-indigo-700 transition-colors'
                    onClick={() => window.print()}
                >
                    Print Voucher
                </button>
            </div>
        </div>
    );
};

export default PrintBillVoucher;