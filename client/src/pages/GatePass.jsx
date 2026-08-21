import { useState } from "react";
import { Plus, Trash2, Printer } from "lucide-react";
import { format } from "date-fns";
import logo from "../assets/logo.jpg";
import stamp from "../assets/stamp.png";

// Challan No format: <FY start><FY end>/<month>/<day> Dated <full date>
// FY runs April - March, matching standard Indian financial year convention.
const generateChallanNo = () => {
    const today = new Date();
    const year = today.getFullYear();
    const isBeforeApril = today.getMonth() < 3; // Jan-Mar belongs to previous FY

    const fyStart = isBeforeApril ? year - 1 : year;
    const fyEnd = fyStart + 1;

    const fyCode = `${String(fyStart).slice(-2)}${String(fyEnd).slice(-2)}`;
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    const datedText = format(today, "dd MMM yyyy");

    return `${fyCode}/${month}/${day} Dated ${datedText}`;
};

const emptyItem = () => ({
    itemNo: "",
    description: "",
    qty: "",
    hsnCode: "",
    remarks: "",
});

const APPROVAL_COLUMNS = [
    "Requested By",
    "Approved By",
    "Authorised By",
    "MTL Issued By",
    "Received By",
];

const emptyApprovalRow = () =>
    Object.fromEntries(APPROVAL_COLUMNS.map((col) => [col, ""]));

const GatePass = () => {
    const [passType, setPassType] = useState("Returnable"); // Returnable | Non-Returnable

    const [to, setTo] = useState("");
    const [challanNo] = useState(generateChallanNo());
    const [yourOrderNo, setYourOrderNo] = useState("");
    const [modeOfTransport, setModeOfTransport] = useState("");
    const [purpose, setPurpose] = useState("");

    const [items, setItems] = useState([emptyItem(), emptyItem()]);

    const [approvalName, setApprovalName] = useState(emptyApprovalRow());
    const [approvalEmpNo, setApprovalEmpNo] = useState(emptyApprovalRow());

    const updateItem = (index, field, value) => {
        setItems((prev) =>
            prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
        );
    };

    const addItemRow = () => setItems((prev) => [...prev, emptyItem()]);

    const removeItemRow = (index) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const detailFields = [
        { label: "Challan No.", value: challanNo, readOnly: true },
        { label: "Your Order No.", value: yourOrderNo, onChange: setYourOrderNo },
        { label: "Mode of Transport /DOCKET No.", value: modeOfTransport, onChange: setModeOfTransport },
        { label: "Purpose", value: purpose, onChange: setPurpose },
    ];

    return (
        <div className="max-w-3xl mx-auto p-6 bg-white animate-fade-in my-6 print:my-0 print:p-0">

            {/* Controls (hidden on print) */}
            <div className="flex items-center justify-between mb-6 print:hidden">
                <div>
                    <h1 className="text-lg font-semibold text-slate-900">Generate Gate Pass</h1>
                    <p className="text-sm text-slate-500">Fill in the details below, then download or print.</p>
                </div>

                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow hover:bg-indigo-700 transition-colors"
                >
                    <Printer size={16} />
                    Download / Print
                </button>
            </div>

            {/* Letterhead */}
            <div className="flex items-start justify-between border-b border-slate-300 pb-3 mb-4">
                <img src={logo} alt="Wehark Solutions" className="h-14" />

                <div className="text-right text-[11px] leading-tight text-slate-800">
                    <p className="italic font-semibold">WeHark Solutions Private Limited</p>
                    <p>Sales@weharksolutions.com</p>
                    <p>www.weharksolutions.com</p>
                    <p>Phone: 080- 41557568</p>
                </div>
            </div>

            {/* Title — click Returnable / Non-Returnable to select */}
            <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-slate-900">
                    <button
                        type="button"
                        onClick={() => setPassType("Returnable")}
                        className={`bg-transparent border-none p-0 cursor-pointer ${
                            passType === "Returnable"
                                ? "text-slate-900 underline decoration-2 underline-offset-4"
                                : "text-slate-400"
                        }`}
                    >
                        Returnable
                    </button>
                    <span className="mx-1.5">/</span>
                    <button
                        type="button"
                        onClick={() => setPassType("Non-Returnable")}
                        className={`bg-transparent border-none p-0 cursor-pointer ${
                            passType === "Non-Returnable"
                                ? "text-slate-900 underline decoration-2 underline-offset-4"
                                : "text-slate-400"
                        }`}
                    >
                        Non - Returnable
                    </button>
                    <span className="ml-1.5">Gate Pass</span>
                </h2>
            </div>

            <div className="space-y-5">

                {/* ============================= */}
                {/* SECTION 1 — Company / To / Challan / Items */}
                {/* ============================= */}
                <div className="border border-slate-800 text-[12px]">

                    {/* Company block */}
                    <div className="border-b border-slate-800 text-center py-2 px-3">
                        <p className="font-bold text-[14px]">WEHARK SOLUTIONS PRIVATE LIMITED</p>
                        <p className="mt-1">Earthen Phoenix, 1<sup>st</sup> Foor, 10<sup>th</sup> E Cross, Nagavarapalya, CV</p>
                        <p>Ramannagar, Bengaluru - 560093</p>
                        <p>Ph No.: +91 8867590544</p>
                        <p className="mt-1 font-semibold">GSTN: 29AADCW9221H1Z2</p>
                    </div>

                    {/* To / Challan / Order / Transport / Purpose */}
                    <div className="grid grid-cols-2 border-b border-slate-800">
                        <div className="border-r border-slate-800 p-2">
                            <p className="font-semibold mb-1">To,</p>
                            <textarea
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                placeholder="Recipient name & address"
                                rows={6}
                                className="w-full resize-none border-none outline-none text-slate-800 bg-transparent"
                            />
                        </div>

                        <div className="flex flex-col">
                            {detailFields.map((field, index) => (
                                <div
                                    key={field.label}
                                    className={`flex flex-1 ${index !== detailFields.length - 1 ? "border-b border-slate-800" : ""}`}
                                >
                                    <div className="w-1/2 border-r border-slate-800 p-2 font-semibold">
                                        {field.label}
                                    </div>
                                    <div className="w-1/2 p-2">
                                        {field.readOnly ? (
                                            field.value
                                        ) : (
                                            <input
                                                value={field.value}
                                                onChange={(e) => field.onChange(e.target.value)}
                                                className="w-full border-none outline-none bg-transparent"
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Items table */}
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800">
                                <th className="w-16 border-r border-slate-800 p-2 text-center">Item No.</th>
                                <th className="border-r border-slate-800 p-2 text-center">Description</th>
                                <th className="w-16 border-r border-slate-800 p-2 text-center">QTY/</th>
                                <th className="w-24 border-r border-slate-800 p-2 text-center">HSN Code</th>
                                <th className="w-28 p-2 text-center">
                                    <span className="flex items-center justify-center gap-1">
                                        Remarks
                                        <button
                                            type="button"
                                            onClick={addItemRow}
                                            className="print:hidden text-indigo-600 hover:text-indigo-800"
                                            title="Add row"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </span>
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map((item, index) => (
                                <tr key={index} className="border-b border-slate-800 last:border-b-0">
                                    <td className="border-r border-slate-800 p-1">
                                        <input
                                            value={item.itemNo}
                                            onChange={(e) => updateItem(index, "itemNo", e.target.value)}
                                            className="w-full border-none outline-none bg-transparent text-center"
                                        />
                                    </td>
                                    <td className="border-r border-slate-800 p-1">
                                        <input
                                            value={item.description}
                                            onChange={(e) => updateItem(index, "description", e.target.value)}
                                            className="w-full border-none outline-none bg-transparent"
                                        />
                                    </td>
                                    <td className="border-r border-slate-800 p-1">
                                        <input
                                            value={item.qty}
                                            onChange={(e) => updateItem(index, "qty", e.target.value)}
                                            className="w-full border-none outline-none bg-transparent text-center"
                                        />
                                    </td>
                                    <td className="border-r border-slate-800 p-1">
                                        <input
                                            value={item.hsnCode}
                                            onChange={(e) => updateItem(index, "hsnCode", e.target.value)}
                                            className="w-full border-none outline-none bg-transparent text-center"
                                        />
                                    </td>
                                    <td className="p-1">
                                        <div className="flex items-center gap-1">
                                            <input
                                                value={item.remarks}
                                                onChange={(e) => updateItem(index, "remarks", e.target.value)}
                                                className="w-full border-none outline-none bg-transparent"
                                            />
                                            {items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeItemRow(index)}
                                                    className="print:hidden text-slate-300 hover:text-rose-500 shrink-0"
                                                    title="Remove row"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ============================= */}
                {/* SECTION 2 — Approval matrix */}
                {/* ============================= */}
                <div className="border border-slate-800 text-[12px]">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800">
                                <th className="w-24 border-r border-slate-800 p-2"></th>
                                {APPROVAL_COLUMNS.map((col) => (
                                    <th key={col} className="border-r border-slate-800 p-2 text-center last:border-r-0">
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-slate-800">
                                <td className="border-r border-slate-800 p-2 font-semibold">Name</td>
                                {APPROVAL_COLUMNS.map((col) => (
                                    <td key={col} className="border-r border-slate-800 p-1 last:border-r-0">
                                        <input
                                            value={approvalName[col]}
                                            onChange={(e) =>
                                                setApprovalName((prev) => ({ ...prev, [col]: e.target.value }))
                                            }
                                            className="w-full border-none outline-none bg-transparent text-center"
                                        />
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="border-r border-slate-800 p-2 font-semibold">Emp.No</td>
                                {APPROVAL_COLUMNS.map((col) => (
                                    <td key={col} className="border-r border-slate-800 p-1 last:border-r-0">
                                        <input
                                            value={approvalEmpNo[col]}
                                            onChange={(e) =>
                                                setApprovalEmpNo((prev) => ({ ...prev, [col]: e.target.value }))
                                            }
                                            className="w-full border-none outline-none bg-transparent text-center"
                                        />
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ============================= */}
                {/* SECTION 3 — Company stamp */}
                {/* ============================= */}
                <div className="border border-slate-800 flex items-center justify-center py-4">
                    <img src={stamp} alt="Company Stamp" className="h-24 opacity-90 object-contain" />
                </div>
            </div>

            {/* Note */}
            <p className="text-[11px] text-slate-700 mt-4">
                Note: This is a computer-generated gate pass; therefore, a signature is not required.
            </p>

            {/* Footer */}
            <div className="mt-6 pt-2 border-t border-slate-300 text-center text-[10px] text-slate-500">
                CIN: U27104TN2024PTC173268&nbsp;&nbsp;&nbsp;&nbsp;GSTN: 29AADCW9221H1Z2&nbsp;&nbsp;&nbsp;&nbsp;MSME/ UDYAM Reg No: UDYAM-TN-24-0121823
            </div>
        </div>
    );
};

export default GatePass;