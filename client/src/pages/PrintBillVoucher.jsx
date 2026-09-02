import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Printer } from "lucide-react";
import Loading from "../components/Loading";
import api from "../api/axios";
import logo from "../assets/logo.jpg";

const PrintBillVoucher = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [voucher, setVoucher] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const fetchVoucher = async () => {
            try {
                setLoading(true);

                const response = await api.get(
                    `/bill-claims/vouchers/${id}`
                );

                if (mounted) {
                    setVoucher(response.data?.data || response.data);
                }
            } catch (error) {
                console.error("Fetch Bill Voucher Error:", error);

                if (mounted) {
                    setVoucher(null);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        if (id) {
            fetchVoucher();
        } else {
            setLoading(false);
        }

        return () => {
            mounted = false;
        };
    }, [id]);

    const formatDate = (value, pattern = "d MMM yyyy") => {
        if (!value) return "N/A";

        try {
            const date = new Date(value);

            if (Number.isNaN(date.getTime())) {
                return "N/A";
            }

            return format(date, pattern);
        } catch {
            return "N/A";
        }
    };

    const formatCurrency = (value) => {
        const amount = Number(value || 0);

        return `₹${amount.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return <Loading />;
    }

    if (!voucher) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
                <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
                    <h2 className="text-lg font-bold text-slate-800">
                        Voucher not found
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                        The requested bill reimbursement voucher could not
                        be found.
                    </p>

                    <button
                        onClick={() => navigate(-1)}
                        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 print:hidden"
                    >
                        <ArrowLeft size={16} />
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const dateOfJoining = formatDate(
        voucher.joinDate,
        "d/M/yyyy"
    );

    const generatedOn = formatDate(
        voucher.createdAt,
        "d MMM yyyy"
    );

    const claimDate = formatDate(
        voucher.claimDate || voucher.createdAt,
        "d MMM yyyy"
    );

    const voucherId = voucher._id || voucher.id || "";

    const summaryRows = [
        [
            "Employee Code",
            voucher.employeeCode || "N/A",
            "Employee Name",
            voucher.employeeName || "N/A",
        ],
        [
            "Email ID",
            voucher.email || "N/A",
            "Phone No",
            voucher.phone || "N/A",
        ],
        [
            "Date of Joining",
            dateOfJoining,
            "Designation",
            voucher.designation || "N/A",
        ],
        [
            "Department",
            voucher.department || "N/A",
            "Bank Name",
            voucher.bankName || "N/A",
        ],
        [
            "Bank A/C Number",
            voucher.bankAccountNumber || "N/A",
            "UAN",
            voucher.uanNumber || "N/A",
        ],
        [
            "PAN",
            voucher.panNumber || "N/A",
            "",
            "",
        ],
    ];

    return (
        <>
            {/* Print-only document styling */}
            <style>
                {`
                    @media print {
                        @page {
                            size: A4;
                            margin: 12mm;
                        }

                        body {
                            background: white !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }

                        .print-document {
                            width: 100% !important;
                            max-width: none !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            box-shadow: none !important;
                            border: none !important;
                        }

                        .print-hidden {
                            display: none !important;
                        }
                    }
                `}
            </style>

            <div className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">
                {/* Top actions */}
                <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between print-hidden">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        <ArrowLeft size={16} />
                        Back
                    </button>

                    <button
                        onClick={handlePrint}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                        <Printer size={17} />
                        Print Voucher
                    </button>
                </div>

                {/* Voucher */}
                <div className="print-document mx-auto max-w-3xl bg-white p-8 shadow-xl print:p-0 print:shadow-none">
                    {/* Header */}
                    <div className="border-b-2 border-indigo-900 pb-5">
                        <div className="flex items-center justify-between gap-6">
                            {/* Logo */}
                            <div>
                                <img
                                    src={logo}
                                    alt="Wehark Solutions"
                                    className="h-12 w-auto object-contain"
                                />
                            </div>

                            {/* Company document information */}
                            <div className="text-right">
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Finance Department
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Employee Reimbursement
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="mt-5 border border-slate-800 bg-slate-100 px-4 py-3 text-center">
                        <h1 className="text-lg font-bold uppercase tracking-wide text-indigo-900">
                            Bill Reimbursement Voucher
                        </h1>

                        <div className="mt-1 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-slate-500">
                            {generatedOn && (
                                <span>
                                    Generated on:{" "}
                                    <strong className="text-slate-700">
                                        {generatedOn}
                                    </strong>
                                </span>
                            )}

                            {voucherId && (
                                <span>
                                    Voucher ID:{" "}
                                    <strong className="text-slate-700">
                                        {voucherId}
                                    </strong>
                                </span>
                            )}

                            {voucher.referenceId && (
                                <span>
                                    Claim Ref:{" "}
                                    <strong className="text-slate-700">
                                        {voucher.referenceId}
                                    </strong>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Employee Details */}
                    <div className="border border-t-0 border-slate-800">
                        <div className="border-b border-slate-800 bg-slate-200 px-3 py-2">
                            <h2 className="text-sm font-bold text-slate-800">
                                Employee Details
                            </h2>
                        </div>

                        <div className="grid grid-cols-4 text-sm">
                            {summaryRows.map(
                                (
                                    [
                                        label1,
                                        value1,
                                        label2,
                                        value2,
                                    ],
                                    index
                                ) => {
                                    const isLastRow =
                                        index ===
                                        summaryRows.length - 1;

                                    const borderBottom =
                                        !isLastRow
                                            ? "border-b border-slate-300"
                                            : "";

                                    return (
                                        <div
                                            key={`summary-row-${index}`}
                                            className="contents"
                                        >
                                            <div
                                                className={`border-r border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-800 ${borderBottom}`}
                                            >
                                                {label1}
                                            </div>

                                            <div
                                                className={`border-r border-slate-300 px-3 py-2 text-slate-700 ${borderBottom}`}
                                            >
                                                {value1}
                                            </div>

                                            <div
                                                className={`border-r border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-800 ${borderBottom}`}
                                            >
                                                {label2}
                                            </div>

                                            <div
                                                className={`px-3 py-2 text-slate-700 ${borderBottom}`}
                                            >
                                                {value2}
                                            </div>
                                        </div>
                                    );
                                }
                            )}
                        </div>
                    </div>

                    {/* Claim Details */}
                    <div className="border border-t-0 border-slate-800">
                        <div className="border-b border-slate-800 bg-slate-200 px-3 py-2">
                            <h2 className="text-sm font-bold text-slate-800">
                                Claim Details
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 text-sm">
                            <div className="border-b border-r border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-800">
                                Claim Date
                            </div>

                            <div className="border-b border-slate-300 px-3 py-2 text-slate-700">
                                {claimDate}
                            </div>

                            <div className="border-b border-r border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-800">
                                Reason
                            </div>

                            <div className="border-b border-slate-300 px-3 py-2 text-slate-700">
                                {voucher.reason || "N/A"}
                            </div>

                            <div className="border-r border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-800">
                                Bill Amount
                            </div>

                            <div className="px-3 py-2 font-semibold text-slate-700">
                                {formatCurrency(voucher.amount)}
                            </div>
                        </div>
                    </div>

                    {/* Amount Payable */}
                    <div className="border border-t-0 border-slate-800 bg-amber-50 px-4 py-5 text-center">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                            Amount Payable
                        </p>

                        <p className="mt-1 text-xl font-bold text-slate-900">
                            {formatCurrency(voucher.amount)} /-
                        </p>
                    </div>

                    {/* Payment Information */}
                    <div className="mt-5 border border-slate-300">
                        <div className="border-b border-slate-300 bg-slate-100 px-3 py-2">
                            <h2 className="text-sm font-bold text-slate-800">
                                Payment Information
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 text-sm">
                            <div className="border-b border-r border-slate-300 px-3 py-2 font-semibold text-slate-700">
                                Bank Name
                            </div>

                            <div className="border-b border-slate-300 px-3 py-2 text-slate-700">
                                {voucher.bankName || "N/A"}
                            </div>

                            <div className="border-r border-slate-300 px-3 py-2 font-semibold text-slate-700">
                                Bank Account Number
                            </div>

                            <div className="px-3 py-2 text-slate-700">
                                {voucher.bankAccountNumber || "N/A"}
                            </div>
                        </div>
                    </div>

                    {/* Declaration */}
                    <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs leading-5 text-slate-600">
                            This voucher has been generated through the
                            employee management system based on the
                            approved bill reimbursement claim.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 border-t border-slate-200 pt-4 text-center">
                        <p className="text-xs font-medium text-slate-500">
                            This is a system generated voucher and does not
                            require a signature.
                        </p>

                        <p className="mt-1 text-[10px] text-slate-400">
                            Computer generated document • Bill
                            Reimbursement
                        </p>
                    </div>

                    {/* Print button */}
                    <div className="mt-8 text-center print-hidden">
                        <button
                            onClick={handlePrint}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                        >
                            <Printer size={18} />
                            Print Voucher
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PrintBillVoucher;