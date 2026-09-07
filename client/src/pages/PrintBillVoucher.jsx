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

    // ============================================================
    // FETCH VOUCHER
    // ============================================================

    useEffect(() => {
        let mounted = true;

        const fetchVoucher = async () => {
            try {
                setLoading(true);

                const response = await api.get(
                    `/bill-claims/vouchers/${id}`
                );

                if (mounted) {
                    setVoucher(
                        response.data?.data ||
                        response.data
                    );
                }
            } catch (error) {
                console.error(
                    "Fetch Bill Voucher Error:",
                    error
                );

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

    // ============================================================
    // HELPERS
    // ============================================================

    const formatDate = (
        value,
        pattern = "d MMM yyyy"
    ) => {
        if (!value) {
            return "N/A";
        }

        try {
            const date = new Date(value);

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return "N/A";
            }

            return format(
                date,
                pattern
            );
        } catch {
            return "N/A";
        }
    };

    const formatCurrency = (
        value
    ) => {
        const amount = Number(
            value || 0
        );

        return `₹${amount.toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }
        )}`;
    };

    const handlePrint = () => {
        window.print();
    };

    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {
        return <Loading />;
    }

    // ============================================================
    // NOT FOUND
    // ============================================================

    if (!voucher) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
                <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
                    <h2 className="text-lg font-bold text-slate-800">
                        Voucher not found
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                        The requested bill reimbursement voucher
                        could not be found.
                    </p>

                    <button
                        onClick={() =>
                            navigate(-1)
                        }
                        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 print:hidden"
                    >
                        <ArrowLeft size={16} />
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // ============================================================
    // FORMATTED VALUES
    // ============================================================

    const dateOfJoining =
        formatDate(
            voucher.joinDate,
            "d/M/yyyy"
        );

    const generatedOn =
        formatDate(
            voucher.createdAt,
            "d MMM yyyy"
        );

    const claimDate =
        formatDate(
            voucher.claimDate ||
            voucher.createdAt,
            "d MMM yyyy"
        );

    // ============================================================
    // VOUCHER NUMBER
    // ============================================================

    const voucherId =
        voucher.voucherNumber ||
        voucher._id ||
        voucher.id ||
        "";

    // ============================================================
    // EMPLOYEE DETAIL ROWS
    // ============================================================

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

    // ============================================================
    // UI
    // ============================================================

    return (
        <>
            {/* =====================================================
                SCREEN + PRINT STYLES
            ===================================================== */}

            <style>
                {`
                    .voucher-header-box {
                        border: 1.5px solid #334155;
                    }

                    .voucher-header-divider {
                        border-left: 1.5px solid #334155;
                    }

                    .voucher-main-border {
                        border: 1.5px solid #334155;
                    }

                    .voucher-table {
                        width: 100%;
                        border-collapse: collapse;
                        table-layout: fixed;
                    }

                    .voucher-table th,
                    .voucher-table td {
                        border: 1.5px solid #64748b;
                        padding: 8px 12px;
                        vertical-align: middle;
                        box-sizing: border-box;
                    }

                    .voucher-table th {
                        background: #f8fafc;
                        font-weight: 600;
                        color: #1e293b;
                        text-align: left;
                    }

                    .voucher-table td {
                        color: #334155;
                        overflow-wrap: anywhere;
                        word-break: break-word;
                        white-space: normal;
                    }

                    .voucher-table .section-heading {
                        background: #e2e8f0;
                        font-weight: 700;
                        color: #1e293b;
                        text-align: left;
                    }

                    @media print {
                        @page {
                            size: A4;
                            margin: 10mm;
                        }

                        .print-document,
.print-document * {
    font-family: "Times New Roman", Times, serif !important;
}
                        html,
                        body {
                            background: #ffffff !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }

                        body {
                            margin: 0 !important;
                            padding: 0 !important;
                        }

                        .print-hidden {
                            display: none !important;
                        }

                        .print-document {
                            width: 100% !important;
                            max-width: none !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            box-shadow: none !important;
                        }

                        .voucher-header-box {
                            border: 1.5pt solid #000000 !important;
                        }

                        .voucher-header-divider {
                            border-left: 1.5pt solid #000000 !important;
                        }

                        .voucher-main-border {
                            border: 1.5pt solid #000000 !important;
                        }

                        .voucher-table {
                            width: 100% !important;
                            border-collapse: collapse !important;
                            table-layout: fixed !important;
                        }

                        .voucher-table th,
                        .voucher-table td {
                            border: 1.5pt solid #000000 !important;
                            box-sizing: border-box !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }

                        .voucher-table th {
                            background: #f8fafc !important;
                        }

                        .voucher-table .section-heading {
                            background: #e2e8f0 !important;
                        }

                        .voucher-no-break {
                            break-inside: avoid !important;
                            page-break-inside: avoid !important;
                        }
                    }
                `}
            </style>

            <div className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">

                {/* =================================================
                    TOP ACTIONS
                ================================================= */}

                <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between print-hidden">

                    <button
                        type="button"
                        onClick={() =>
                            navigate(-1)
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        <ArrowLeft size={16} />
                        Back
                    </button>

                    <button
                        type="button"
                        onClick={handlePrint}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                        <Printer size={17} />
                        Print Voucher
                    </button>
                </div>

                {/* =================================================
                    VOUCHER DOCUMENT
                ================================================= */}

                <div className="print-document mx-auto max-w-3xl bg-white p-8 shadow-xl print:p-0 print:shadow-none">

                    {/* =================================================
                        COMPANY HEADER / LETTERHEAD
                    ================================================= */}

                    <div className="voucher-header-box voucher-no-break">
                        <div className="grid grid-cols-[190px_1fr]">

                            {/* LOGO */}

                            <div className="flex min-h-[145px] items-center justify-center px-5 py-5">
                                <img
                                    src={logo}
                                    alt="Wehark Solutions"
                                    className="max-h-20 w-full object-contain"
                                />
                            </div>

                            {/* COMPANY INFORMATION */}

                            <div className="voucher-header-divider flex min-h-[145px] flex-col items-center justify-center px-6 py-5 text-center">

                                <h1 className="text-xl font-extrabold uppercase tracking-wide text-slate-900">
                                    WEHARK SOLUTIONS PRIVATE LIMITED
                                </h1>

                                <p className="mt-3 max-w-xl text-[13px] font-medium leading-6 text-slate-700">
                                    Earthen Phoenix, 1st Floor, 10th E Cross,
                                    Sanjeevappa Layout, Nagavarapalya,
                                    CV Ramannagar, Bangalore - 560093
                                </p>

                                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-7 gap-y-1 text-[11px] font-bold text-slate-700">

                                    <span>
                                        CIN: U46909TN2024PTC17326
                                    </span>

                                    <span>
                                        GST: 29AADCW9221H1Z2
                                    </span>

                                </div>
                            </div>
                        </div>
                    </div>

                    {/* =================================================
                        VOUCHER TITLE
                    ================================================= */}

                    <div className="voucher-main-border voucher-no-break mt-5 bg-slate-100 px-4 py-3 text-center">

                        <h2 className="text-lg font-bold uppercase tracking-wide text-indigo-900">
                            Bill Reimbursement Voucher
                        </h2>

                        <div className="mt-2 space-y-1 text-[11px] text-slate-500">

                            {generatedOn && (
                                <p>
                                    Generated on:{" "}
                                    <strong className="text-slate-700">
                                        {generatedOn}
                                    </strong>
                                </p>
                            )}

                            {voucherId && (
                                <p>
                                    Voucher ID:{" "}
                                    <strong className="text-slate-700">
                                        {voucherId}
                                    </strong>
                                </p>
                            )}

                            {voucher.referenceId && (
                                <p>
                                    Claim Ref:{" "}
                                    <strong className="text-slate-700">
                                        {voucher.referenceId}
                                    </strong>
                                </p>
                            )}

                        </div>
                    </div>

                    {/* =================================================
                        EMPLOYEE DETAILS
                    ================================================= */}

                    <div className="voucher-no-break">
                        <table className="voucher-table text-[12px]">

                            <colgroup>
                                <col style={{ width: "21%" }} />
                                <col style={{ width: "29%" }} />
                                <col style={{ width: "21%" }} />
                                <col style={{ width: "29%" }} />
                            </colgroup>

                            <thead>
                                <tr>
                                    <th
                                        colSpan={4}
                                        className="section-heading"
                                    >
                                        Employee Details
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {summaryRows.map(
                                    (
                                        [
                                            label1,
                                            value1,
                                            label2,
                                            value2,
                                        ],
                                        index
                                    ) => (
                                        <tr key={`summary-row-${index}`}>

                                            <th>
                                                {label1}
                                            </th>

                                            <td>
                                                {value1}
                                            </td>

                                            <th>
                                                {label2}
                                            </th>

                                            <td>
                                                {value2}
                                            </td>

                                        </tr>
                                    )
                                )}
                            </tbody>

                        </table>
                    </div>

                    {/* =================================================
                        CLAIM DETAILS
                    ================================================= */}

                    <div className="voucher-no-break">
                        <table className="voucher-table text-[12px]">

                            <colgroup>
                                <col style={{ width: "50%" }} />
                                <col style={{ width: "50%" }} />
                            </colgroup>

                            <thead>
                                <tr>
                                    <th
                                        colSpan={2}
                                        className="section-heading"
                                    >
                                        Claim Details
                                    </th>
                                </tr>
                            </thead>

                            <tbody>

                                <tr>
                                    <th>
                                        Claim Date
                                    </th>

                                    <td>
                                        {claimDate}
                                    </td>
                                </tr>

                                <tr>
                                    <th>
                                        Reason
                                    </th>

                                    <td>
                                        {voucher.reason || "N/A"}
                                    </td>
                                </tr>

                                <tr>
                                    <th>
                                        Bill Amount
                                    </th>

                                    <td className="font-semibold">
                                        {formatCurrency(
                                            voucher.amount
                                        )}
                                    </td>
                                </tr>

                            </tbody>

                        </table>
                    </div>

                    {/* =================================================
                        AMOUNT PAYABLE
                    ================================================= */}

                    <div className="voucher-main-border voucher-no-break border-t-0 bg-amber-50 px-4 py-2 text-center">

                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                            Amount Payable
                        </p>

                        <p className="mt-1 text-xl font-bold text-slate-900">
                            {formatCurrency(
                                voucher.amount
                            )}{" "}
                            /-
                        </p>

                    </div>

                    {/* =================================================
                        FOOTER
                    ================================================= */}

                    <div className="mt-3 border-t border-slate-300 pt-3 text-center">

                        <p className="text-[10px] font-medium text-slate-500">
                            Computer generated document • Bill Reimbursement
                        </p>

                    </div>

                </div>
            </div>
        </>
    );
};

export default PrintBillVoucher;