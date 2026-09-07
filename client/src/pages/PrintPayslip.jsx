import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Loading from "../components/Loading";
import { format } from "date-fns";
import api from "../api/axios";
import logo from "../assets/logo.jpg";

// ============================================================
// CONVERT NUMBER TO WORDS
// Indian numbering system
// ============================================================

const numberToWords = (num) => {
    if (num === 0) return "Zero";

    const ones = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
    ];

    const tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety",
    ];

    const twoDigits = (n) => {
        if (n < 20) {
            return ones[n];
        }

        return (
            tens[Math.floor(n / 10)] +
            (n % 10
                ? " " + ones[n % 10]
                : "")
        );
    };

    const threeDigits = (n) => {
        if (n < 100) {
            return twoDigits(n);
        }

        return (
            ones[Math.floor(n / 100)] +
            " Hundred" +
            (n % 100
                ? " " +
                twoDigits(n % 100)
                : "")
        );
    };

    let result = "";

    const crore =
        Math.floor(
            num / 10000000
        );

    num %= 10000000;

    const lakh =
        Math.floor(
            num / 100000
        );

    num %= 100000;

    const thousand =
        Math.floor(
            num / 1000
        );

    num %= 1000;

    const hundred =
        num;

    if (crore) {
        result +=
            threeDigits(crore) +
            " Crore ";
    }

    if (lakh) {
        result +=
            threeDigits(lakh) +
            " Lakh ";
    }

    if (thousand) {
        result +=
            threeDigits(
                thousand
            ) +
            " Thousand ";
    }

    if (hundred) {
        result +=
            threeDigits(
                hundred
            );
    }

    return result.trim();
};

// ============================================================
// COMPONENT
// ============================================================

const PrintPayslip = () => {
    const { id } =
        useParams();

    const [
        payslip,
        setPayslip,
    ] =
        useState(null);

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    // ========================================================
    // FETCH PAYSLIP
    // ========================================================

    useEffect(() => {
        api.get(
            `/payslip/${id}`
        )
            .then((res) =>
                setPayslip(
                    res.data
                )
            )
            .catch(
                console.error
            )
            .finally(() =>
                setLoading(
                    false
                )
            );
    }, [id]);

    if (loading) {
        return <Loading />;
    }

    if (!payslip) {
        return (
            <p className="py-12 text-center text-slate-400">
                Payslip not found
            </p>
        );
    }

    // ========================================================
    // HELPERS
    // ========================================================

    const fmt = (val) =>
        `₹${Number(
            val || 0
        ).toLocaleString(
            "en-IN"
        )}`;

    // ========================================================
    // STANDARD BREAKDOWN
    // ========================================================

    const basic =
        Number(
            payslip.basicSalary ||
            0
        );

    const hra =
        payslip.hra !==
            undefined &&
            payslip.hra !==
            null &&
            payslip.hra !== 0
            ? Number(
                payslip.hra
            )
            : basic * 0.4;

    const specialAllowance =
        Number(
            payslip.specialAllowance ||
            0
        );

    const siteAllowance =
        Number(
            payslip.siteAllowance ||
            0
        );

    const conveyance =
        Number(
            payslip.conveyance ||
            0
        );

    // ========================================================
    // CUSTOM FIELDS
    // ========================================================

    const customFields =
        Array.isArray(
            payslip.customFields
        )
            ? payslip.customFields
            : [];

    const customEarnings =
        customFields.filter(
            (cf) =>
                cf.type ===
                "EARNING"
        );

    const customDeductions =
        customFields.filter(
            (cf) =>
                cf.type ===
                "DEDUCTION"
        );

    const customEarningsSum =
        customEarnings.reduce(
            (
                acc,
                cf
            ) =>
                acc +
                Number(
                    cf.value ||
                    0
                ),
            0
        );

    const customDeductionsSum =
        customDeductions.reduce(
            (
                acc,
                cf
            ) =>
                acc +
                Number(
                    cf.value ||
                    0
                ),
            0
        );

    // ========================================================
    // GROSS EARNINGS
    // ========================================================

    const grossEarnings =
        payslip.grossSalary ||
        basic +
        hra +
        specialAllowance +
        siteAllowance +
        conveyance +
        customEarningsSum;

    // ========================================================
    // DEDUCTIONS
    // ========================================================

    const pfEmployee =
        payslip.pfEmployeeContribution !==
            undefined &&
            payslip.pfEmployeeContribution !==
            null
            ? Number(
                payslip.pfEmployeeContribution
            )
            : 1800;

    const professionalTax =
        Number(
            payslip.professionalTax ||
            0
        );

    const medicalEmployee =
        Number(
            payslip.medicalInsuranceEmployee ||
            0
        );

    const totalDeductions =
        payslip.deductions ||
        pfEmployee +
        professionalTax +
        medicalEmployee +
        customDeductionsSum;

    // ========================================================
    // NET PAYABLE
    // ========================================================

    const netPayable =
        payslip.netSalary &&
            payslip.netSalary !==
            basic
            ? Number(
                payslip.netSalary
            )
            : grossEarnings -
            totalDeductions;

    // ========================================================
    // EMPLOYEE DETAILS
    // ========================================================

    const designation =
        payslip.employee
            ?.designation ||
        payslip.employee
            ?.position ||
        "Staff";

    const department =
        typeof payslip.employee
            ?.department ===
            "object"
            ? payslip.employee
                ?.department
                ?.department_name ||
            payslip.employee
                ?.department
                ?.name ||
            "N/A"
            : payslip.employee
                ?.department ||
            "N/A";

    const period =
        format(
            new Date(
                payslip.year,
                payslip.month -
                1
            ),
            "MMMM yyyy"
        );

    const amountInWords =
        `Rupees ${numberToWords(
            Math.round(
                netPayable
            )
        )} Only`;

    const employeeCode =
        payslip.employee
            ?.employeeCode ||
        "N/A";

    const employeeName =
        `${payslip.employee
                ?.firstName ||
            ""
            } ${payslip.employee
                ?.lastName ||
            ""
            }`.trim() ||
        "N/A";

    const dateOfJoining =
        payslip.employee
            ?.joinDate
            ? format(
                new Date(
                    payslip.employee.joinDate
                ),
                "d/M/yyyy"
            )
            : "N/A";

    const bankName =
        payslip.employee
            ?.bankName ||
        "N/A";

    const bankAccountNumber =
        payslip.employee
            ?.bankAccountNumber ||
        "N/A";

    const uanNumber =
        payslip.employee
            ?.uanNumber ||
        "N/A";

    const panNumber =
        payslip.employee
            ?.panNumber ||
        "N/A";

    const workingDays =
        payslip.workingDays ??
        0;

    const actualWorkingDays =
        payslip.actualWorkingDays ??
        0;

    const lopDays =
        payslip.lopDays ??
        0;

    // ========================================================
    // EARNINGS ROWS
    // ========================================================

    const earningsRows = [
        {
            label: "Basic",
            value: basic,
        },

        {
            label: "HRA",
            value: hra,
        },

        {
            label:
                "Conveyance",
            value:
                conveyance,
        },

        {
            label:
                "Special Allowance",
            value:
                specialAllowance +
                siteAllowance,
        },

        ...customEarnings.map(
            (cf) => ({
                label:
                    cf.label,
                value:
                    Number(
                        cf.value ||
                        0
                    ),
            })
        ),
    ];

    // ========================================================
    // DEDUCTION ROWS
    // ========================================================

    const deductionsRows = [
        {
            label:
                "PF (Employee)",
            value:
                pfEmployee,
        },

        {
            label:
                "Professional Tax",
            value:
                professionalTax,
        },

        {
            label:
                "Health Insurance",
            value:
                medicalEmployee,
        },

        ...customDeductions.map(
            (cf) => ({
                label:
                    cf.label,
                value:
                    Number(
                        cf.value ||
                        0
                    ),
            })
        ),
    ];

    // ========================================================
    // EMPLOYEE SUMMARY
    // ========================================================

    const summaryRows = [
        [
            "Employee Code",
            employeeCode,
            "Employee Name",
            employeeName,
        ],

        [
            "Date of Joining",
            dateOfJoining,
            "Designation",
            designation,
        ],

        [
            "Working Days",
            workingDays,
            "Department",
            department,
        ],

        [
            "LOP Days",
            lopDays,
            "Actual Working Days",
            actualWorkingDays,
        ],

        [
            "Bank Name",
            bankName,
            "Bank A/C Number",
            bankAccountNumber,
        ],

        [
            "UAN",
            uanNumber,
            "PAN",
            panNumber,
        ],
    ];

    // ========================================================
    // ALIGN EARNINGS AND DEDUCTIONS
    // ========================================================

    const maxRows =
        Math.max(
            earningsRows.length,
            deductionsRows.length
        );

    const combinedRows =
        Array.from(
            {
                length:
                    maxRows,
            },
            (
                _,
                index
            ) => ({
                earning:
                    earningsRows[
                    index
                    ] ||
                    null,

                deduction:
                    deductionsRows[
                    index
                    ] ||
                    null,
            })
        );

    // ========================================================
    // UI
    // ========================================================

    return (
        <>
            {/* =================================================
                PRINT STYLES
            ================================================= */}

            <style>
                {`
                    .payslip-header-box {
                        border: 1.5px solid #334155;
                    }

                    .payslip-header-divider {
                        border-left: 1.5px solid #334155;
                    }

                    .payslip-table {
                        width: 100%;
                        border-collapse: collapse;
                        table-layout: fixed;
                    }

                    .payslip-table th,
                    .payslip-table td {
                        border: 1.5px solid #64748b;
                        padding: 9px 12px;
                        vertical-align: middle;
                        box-sizing: border-box;
                    }

                    .payslip-table th {
                        background: #f8fafc;
                        font-weight: 600;
                        color: #0f172a;
                        text-align: left;
                    }

                    .payslip-table td {
                        color: #334155;
                        overflow-wrap: anywhere;
                        word-break: break-word;
                        white-space: normal;
                    }

                    .payslip-table .section-heading {
                        background: #e2e8f0;
                        font-weight: 700;
                        color: #0f172a;
                        text-align: left;
                    }

                    .salary-table {
                        width: 100%;
                        border-collapse: collapse;
                        table-layout: fixed;
                    }

                    .salary-table th,
                    .salary-table td {
                        border: 1.5px solid #64748b;
                        padding: 9px 12px;
                        box-sizing: border-box;
                    }

                    .salary-table .salary-header {
                        background: #a5b4fc;
                        color: #0f172a;
                        font-weight: 700;
                    }

                    .salary-table .salary-total {
                        background: #a5b4fc;
                        color: #0f172a;
                        font-weight: 700;
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
                            margin: 0 !important;
                            padding: 0 !important;

                            -webkit-print-color-adjust:
                                exact !important;

                            print-color-adjust:
                                exact !important;
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

                        .payslip-header-box {
                            border:
                                1.5pt solid
                                #000000 !important;
                        }

                        .payslip-header-divider {
                            border-left:
                                1.5pt solid
                                #000000 !important;
                        }

                        .payslip-table,
                        .salary-table {
                            width: 100% !important;
                            border-collapse:
                                collapse !important;
                            table-layout:
                                fixed !important;
                        }

                        .payslip-table th,
                        .payslip-table td,
                        .salary-table th,
                        .salary-table td {
                            border:
                                1.5pt solid
                                #000000 !important;

                            box-sizing:
                                border-box !important;

                            -webkit-print-color-adjust:
                                exact !important;

                            print-color-adjust:
                                exact !important;
                        }

                        .payslip-table th {
                            background:
                                #f8fafc !important;
                        }

                        .payslip-table .section-heading {
                            background:
                                #e2e8f0 !important;
                        }

                        .salary-table .salary-header,
                        .salary-table .salary-total {
                            background:
                                #a5b4fc !important;
                        }

                        .payslip-no-break {
                            break-inside:
                                avoid !important;

                            page-break-inside:
                                avoid !important;
                        }
                    }
                `}
            </style>

            <div className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">

                {/* =================================================
                    PAYSLIP DOCUMENT
                ================================================= */}

                <div className="print-document mx-auto max-w-4xl bg-white p-8 shadow-xl print:p-0 print:shadow-none">

                    {/* =================================================
                        COMPANY HEADER
                    ================================================= */}

                    <div className="payslip-header-box payslip-no-break">

                        <div className="grid grid-cols-[190px_1fr]">

                            {/* LOGO */}

                            <div className="flex min-h-[145px] items-center justify-center px-5 py-5">

                                <img
                                    src={
                                        logo
                                    }
                                    alt="Wehark Solutions"
                                    className="max-h-20 w-full object-contain"
                                />

                            </div>

                            {/* COMPANY DETAILS */}

                            <div className="payslip-header-divider flex min-h-[145px] flex-col items-center justify-center px-6 py-5 text-center">

                                <h1 className="text-xl font-extrabold uppercase tracking-wide text-slate-900">
                                    WEHARK
                                    SOLUTIONS
                                    PRIVATE
                                    LIMITED
                                </h1>

                                <p className="mt-3 max-w-xl text-[13px] font-medium leading-6 text-slate-700">
                                    Earthen
                                    Phoenix,
                                    1st Floor,
                                    10th E
                                    Cross,
                                    Sanjeevappa
                                    Layout,
                                    Nagavarapalya,
                                    CV
                                    Ramannagar,
                                    Bangalore
                                    -
                                    560093
                                </p>

                                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-7 gap-y-1 text-[11px] font-bold text-slate-700">

                                    <span>
                                        CIN:
                                        U46909TN2024PTC17326
                                    </span>

                                    <span>
                                        GST:
                                        29AADCW9221H1Z2
                                    </span>

                                </div>

                            </div>

                        </div>

                    </div>

                    {/* =================================================
                        PAYSLIP TITLE
                    ================================================= */}

                    <div className="mt-5 border-[1.5px] border-slate-700 bg-slate-100 px-4 py-2 text-center">

                        <h2 className="text-xl font-extrabold uppercase tracking-wide text-indigo-900">
                            PAY
                            SLIP
                            -{" "}
                            {period}
                        </h2>

                    </div>

                    {/* =================================================
                        EMPLOYEE PAY SUMMARY
                    ================================================= */}

                    <div className="payslip-no-break">

                        <table className="payslip-table text-[13px]">

                            <colgroup>

                                <col
                                    style={{
                                        width:
                                            "25%",
                                    }}
                                />

                                <col
                                    style={{
                                        width:
                                            "25%",
                                    }}
                                />

                                <col
                                    style={{
                                        width:
                                            "25%",
                                    }}
                                />

                                <col
                                    style={{
                                        width:
                                            "25%",
                                    }}
                                />

                            </colgroup>

                            <thead>

                                <tr>

                                    <th
                                        colSpan={
                                            4
                                        }
                                        className="section-heading"
                                    >
                                        Employee
                                        Pay
                                        Summary
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
                                        <tr
                                            key={
                                                index
                                            }
                                        >

                                            <th>
                                                {
                                                    label1
                                                }
                                            </th>

                                            <td>
                                                {
                                                    value1
                                                }
                                            </td>

                                            <th>
                                                {
                                                    label2
                                                }
                                            </th>

                                            <td>
                                                {
                                                    value2
                                                }
                                            </td>

                                        </tr>
                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                    {/* =================================================
                        EARNINGS + DEDUCTIONS
                    ================================================= */}

                    <div className="payslip-no-break mt-5">

                        <table className="salary-table text-[13px]">

                            <colgroup>

                                <col
                                    style={{
                                        width:
                                            "30%",
                                    }}
                                />

                                <col
                                    style={{
                                        width:
                                            "20%",
                                    }}
                                />

                                <col
                                    style={{
                                        width:
                                            "30%",
                                    }}
                                />

                                <col
                                    style={{
                                        width:
                                            "20%",
                                    }}
                                />

                            </colgroup>

                            {/* HEADER */}

                            <thead>

                                <tr className="salary-header">

                                    <th className="text-left">
                                        Earnings
                                    </th>

                                    <th className="text-right">
                                        Amount
                                        (₹)
                                    </th>

                                    <th className="text-left">
                                        Deductions
                                    </th>

                                    <th className="text-right">
                                        Amount
                                        (₹)
                                    </th>

                                </tr>

                            </thead>

                            {/* BODY */}

                            <tbody>

                                {combinedRows.map(
                                    (
                                        row,
                                        index
                                    ) => (
                                        <tr
                                            key={
                                                index
                                            }
                                        >

                                            <td className="text-slate-700">
                                                {row
                                                    .earning
                                                    ?.label ||
                                                    ""}
                                            </td>

                                            <td className="text-right text-slate-900">
                                                {row
                                                    .earning
                                                    ? Number(
                                                        row
                                                            .earning
                                                            .value ||
                                                        0
                                                    ).toLocaleString(
                                                        "en-IN"
                                                    )
                                                    : ""}
                                            </td>

                                            <td className="text-slate-700">
                                                {row
                                                    .deduction
                                                    ?.label ||
                                                    ""}
                                            </td>

                                            <td className="text-right text-slate-900">
                                                {row
                                                    .deduction
                                                    ? Number(
                                                        row
                                                            .deduction
                                                            .value ||
                                                        0
                                                    ).toLocaleString(
                                                        "en-IN"
                                                    )
                                                    : ""}
                                            </td>

                                        </tr>
                                    )
                                )}

                                {/* TOTALS */}

                                <tr>

                                    <td className="salary-total">
                                        Gross
                                        Earnings
                                    </td>

                                    <td className="salary-total text-right">
                                        {fmt(
                                            grossEarnings
                                        )}
                                    </td>

                                    <td className="salary-total">
                                        Total
                                        Deductions
                                    </td>

                                    <td className="salary-total text-right">
                                        {fmt(
                                            totalDeductions
                                        )}
                                    </td>

                                </tr>

                            </tbody>

                        </table>

                    </div>

                    {/* =================================================
                        NET PAYABLE
                    ================================================= */}

                    <div className="payslip-no-break border-[1.5px] border-t-0 border-slate-700 bg-amber-50 px-4 py-2 text-center">

                        <p className="text-lg font-extrabold text-slate-900">

                            NET
                            PAYABLE:{" "}

                            {fmt(
                                netPayable
                            )}{" "}

                            /-

                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-600">

                            (
                            {
                                amountInWords
                            }
                            )

                        </p>

                    </div>

                    {/* =================================================
                        FOOTER
                    ================================================= */}

                    <div className="mt-4 border-t border-slate-300 pt-3 text-center">

                        <p className="text-[10px] font-medium text-slate-500">
                            Computer
                            generated
                            document
                            •
                            Payslip
                        </p>

                    </div>

                    {/* =================================================
                        EXISTING PRINT FUNCTIONALITY KEPT
                    ================================================= */}

                    <div className="mt-6 text-center print-hidden">

                        <button
                            type="button"
                            className="rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white shadow transition-colors hover:bg-indigo-700"
                            onClick={() =>
                                window.print()
                            }
                        >
                            Print
                            Payslip
                        </button>

                    </div>

                </div>

            </div>
        </>
    );
};

export default PrintPayslip;