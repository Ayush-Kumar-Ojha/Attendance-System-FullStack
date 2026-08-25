import { useState, useMemo } from "react";
import {
    Plus,
    Trash2,
    Printer,
    Search,
    Filter,
    ArrowLeft,
    FileText,
    Eye,
    Clock,
    CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import logo from "../assets/logo.jpg";

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

// Sample past gate passes data
const INITIAL_PAST_PASSES = [
    {
        id: 1,
        gatePassNo: "GP-2026-001",
        passType: "Returnable",
        to: "TechCorp India Pvt Ltd, Whitefield, Bengaluru",
        modeOfTransport: "DOCKET #7712",
        purpose: "Equipment Repair & Calibration",
        createdAt: "2026-08-24",
    },
    {
        id: 2,
        gatePassNo: "GP-2026-002",
        passType: "Non-Returnable",
        to: "Apex Logistics, Electronic City, Bengaluru",
        modeOfTransport: "Vehicle KA-01-MJ-4321",
        purpose: "Scrap Material Disposal",
        createdAt: "2026-08-20",
    },
    {
        id: 3,
        gatePassNo: "GP-2026-003",
        passType: "Returnable",
        to: "SmartSys Solutions, Indiranagar, Bengaluru",
        modeOfTransport: "Courier Express",
        purpose: "Demo Unit Testing",
        createdAt: "2026-08-15",
    },
];

const GatePass = () => {
    // Navigation view: 'list' (History Page) | 'create' (Form Page)
    const [view, setView] = useState("list");

    // History state
    const [pastPasses, setPastPasses] = useState(INITIAL_PAST_PASSES);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [monthFilter, setMonthFilter] = useState("");
    const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));

    // Gate Pass Form state (Manual Gate Pass No.)
    const [passType, setPassType] = useState("Returnable");
    const [to, setTo] = useState("");
    const [gatePassNo, setGatePassNo] = useState("");
    const [modeOfTransport, setModeOfTransport] = useState("");
    const [purpose, setPurpose] = useState("");
    const [items, setItems] = useState([emptyItem(), emptyItem()]);
    const [approvalName, setApprovalName] = useState(emptyApprovalRow());
    const [approvalEmpNo, setApprovalEmpNo] = useState(emptyApprovalRow());

    // Filter Logic
    const filteredPasses = useMemo(() => {
        return pastPasses.filter((pass) => {
            const matchesSearch =
                !search.trim() ||
                pass.to.toLowerCase().includes(search.toLowerCase()) ||
                pass.gatePassNo.toLowerCase().includes(search.toLowerCase()) ||
                pass.purpose.toLowerCase().includes(search.toLowerCase());

            const matchesType = !typeFilter || pass.passType === typeFilter;

            const passDate = new Date(pass.createdAt);
            const matchesMonth =
                !monthFilter || passDate.getMonth() + 1 === Number(monthFilter);

            const matchesYear =
                !yearFilter || passDate.getFullYear() === Number(yearFilter);

            return matchesSearch && matchesType && matchesMonth && matchesYear;
        });
    }, [pastPasses, search, typeFilter, monthFilter, yearFilter]);

    // Statistics
    const stats = useMemo(() => {
        const returnable = pastPasses.filter((p) => p.passType === "Returnable").length;
        const nonReturnable = pastPasses.filter((p) => p.passType === "Non-Returnable").length;
        return {
            total: pastPasses.length,
            returnable,
            nonReturnable,
        };
    }, [pastPasses]);

    const updateItem = (index, field, value) => {
        setItems((prev) =>
            prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
        );
    };

    const addItemRow = () => setItems((prev) => [...prev, emptyItem()]);

    const removeItemRow = (index) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const handleOpenCreateForm = () => {
        setGatePassNo("");
        setTo("");
        setModeOfTransport("");
        setPurpose("");
        setItems([emptyItem(), emptyItem()]);
        setApprovalName(emptyApprovalRow());
        setApprovalEmpNo(emptyApprovalRow());
        setView("create");
    };

    // Detail Fields with Manual Gate Pass No.
    const detailFields = [
        { label: "Gate Pass No.", value: gatePassNo, onChange: setGatePassNo, placeholder: "Enter Gate Pass No." },
        { label: "Mode of Transport / DOCKET No.", value: modeOfTransport, onChange: setModeOfTransport },
        { label: "Purpose", value: purpose, onChange: setPurpose },
    ];

    // =========================================
    // VIEW 1: GATE PASS HISTORY PAGE
    // =========================================
    if (view === "list") {
        return (
            <div className="min-h-screen bg-slate-50 p-4 md:p-6 animate-fade-in-up">
                <div className="mx-auto max-w-7xl space-y-6">
                    {/* Header (Left Icon Removed) with Title Slide Animation */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 animate-title-slide">
                                Gate Pass
                            </h1>
                            <p className="text-sm text-slate-500">
                                View past gate passes and generate new ones
                            </p>
                        </div>

                        <button
                            onClick={handleOpenCreateForm}
                            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 cursor-pointer"
                        >
                            <Plus size={19} />
                            Generate Gate Pass
                        </button>
                    </div>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm card-hover">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500">Total Gate Passes</p>
                                    <p className="mt-0.5 text-xl font-bold text-slate-900">{stats.total}</p>
                                </div>
                                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                    <FileText size={20} />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm card-hover">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500">Returnable</p>
                                    <p className="mt-0.5 text-xl font-bold text-slate-900">{stats.returnable}</p>
                                </div>
                                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                                    <Clock size={20} />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm card-hover">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500">Non-Returnable</p>
                                    <p className="mt-0.5 text-xl font-bold text-slate-900">{stats.nonReturnable}</p>
                                </div>
                                <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
                                    <CheckCircle2 size={20} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters Section */}
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="mb-2 flex items-center gap-2">
                            <Filter size={16} className="text-slate-500" />
                            <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-4">
                            <div className="relative md:col-span-1">
                                <Search
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search recipient, gate pass no..."
                                    className="w-full rounded-xl border border-slate-200 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>

                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                            >
                                <option value="">All Pass Types</option>
                                <option value="Returnable">Returnable</option>
                                <option value="Non-Returnable">Non-Returnable</option>
                            </select>

                            <select
                                value={monthFilter}
                                onChange={(e) => setMonthFilter(e.target.value)}
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                            >
                                <option value="">All Months</option>
                                {Array.from({ length: 12 }, (_, index) => (
                                    <option key={index + 1} value={index + 1}>
                                        {new Date(2000, index).toLocaleString("en-IN", { month: "long" })}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={yearFilter}
                                onChange={(e) => setYearFilter(e.target.value)}
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                            >
                                {Array.from({ length: 6 }, (_, index) => {
                                    const year = new Date().getFullYear() - index;
                                    return (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>

                    {/* Past Gate Passes Table */}
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-slate-900">Past Gate Passes</h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {filteredPasses.length} record{filteredPasses.length !== 1 ? "s" : ""} found
                                </p>
                            </div>
                        </div>

                        {filteredPasses.length === 0 ? (
                            <div className="flex min-h-[250px] flex-col items-center justify-center px-6 text-center">
                                <div className="mb-3 rounded-full bg-slate-100 p-3">
                                    <FileText size={24} className="text-slate-400" />
                                </div>
                                <h3 className="font-semibold text-slate-800">No gate passes found</h3>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-5 py-3">Gate Pass No.</th>
                                            <th className="px-5 py-3">Date</th>
                                            <th className="px-5 py-3">Pass Type</th>
                                            <th className="px-5 py-3">Recipient / To</th>
                                            <th className="px-5 py-3">Purpose</th>
                                            <th className="px-5 py-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {filteredPasses.map((pass) => (
                                            <tr key={pass.id} className="transition hover:bg-slate-50">
                                                <td className="px-5 py-3.5 font-medium text-slate-800">
                                                    {pass.gatePassNo}
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600">
                                                    {format(new Date(pass.createdAt), "dd MMM yyyy")}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span
                                                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                                            pass.passType === "Returnable"
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                : "bg-violet-50 text-violet-700 border-violet-200"
                                                        }`}
                                                    >
                                                        {pass.passType}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 max-w-[220px] truncate text-slate-700">
                                                    {pass.to}
                                                </td>
                                                <td className="px-5 py-3.5 max-w-[200px] truncate text-slate-600">
                                                    {pass.purpose || "—"}
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <button
                                                        onClick={() => {
                                                            setPassType(pass.passType);
                                                            setGatePassNo(pass.gatePassNo);
                                                            setTo(pass.to);
                                                            setModeOfTransport(pass.modeOfTransport);
                                                            setPurpose(pass.purpose);
                                                            setView("create");
                                                        }}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                                                    >
                                                        <Eye size={14} />
                                                        View / Print
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // =========================================
    // VIEW 2: GATE PASS FORM PAGE
    // =========================================
    return (
        <div className="max-w-3xl mx-auto p-6 bg-white animate-fade-in my-6 print:my-0 print:p-0">

            {/* Controls (hidden on print) */}
            <div className="flex items-center justify-between mb-6 print:hidden">
                <button
                    onClick={() => setView("list")}
                    className="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition cursor-pointer"
                >
                    <ArrowLeft size={16} />
                    Back to Gate Passes
                </button>

                {/* On-screen Pass Type Toggle Buttons */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                        type="button"
                        onClick={() => setPassType("Returnable")}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                            passType === "Returnable"
                                ? "bg-white text-indigo-700 shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        Returnable
                    </button>
                    <button
                        type="button"
                        onClick={() => setPassType("Non-Returnable")}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                            passType === "Non-Returnable"
                                ? "bg-white text-indigo-700 shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        Non-Returnable
                    </button>
                </div>

                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                    <Printer size={16} />
                    Download / Print
                </button>
            </div>

            {/* 1. CENTERED LOGO */}
            <div className="flex justify-center mb-6">
                <img src={logo} alt="Wehark Solutions" className="h-16 object-contain" />
            </div>

            {/* 2. CENTERED TITLE & FAR-RIGHT TODAY'S AUTO-FILLED DATE */}
            <div className="relative flex items-center justify-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 text-center">
                    {passType === "Returnable" ? "Returnable Gate Pass" : "Non-Returnable Gate Pass"}
                </h2>

                <div className="absolute right-0 text-sm font-bold text-slate-900">
                    Date: <span className="font-semibold">{format(new Date(), "dd MMM yyyy")}</span>
                </div>
            </div>

            <div className="space-y-5">

                {/* SECTION 1 — Company / To / Clean Border Aligned Fields / Items */}
                <div className="border border-slate-800 text-[12px]">

                    {/* Company block */}
                    <div className="border-b border-slate-800 text-center py-2.5 px-3">
                        <p className="font-bold text-[14px]">WEHARK SOLUTIONS PRIVATE LIMITED</p>
                        <p className="mt-1">Earthen Phoenix, 1<sup>st</sup> Foor, 10<sup>th</sup> E Cross, Nagavarapalya, CV</p>
                        <p>Ramannagar, Bengaluru - 560093</p>
                        <p>Ph No.: +91 8867590544</p>
                        <p className="mt-1 font-semibold">GSTN: 29AADCW9221H1Z2</p>
                    </div>

                    {/* To / Gate Pass No (Manual) / Transport / Purpose */}
                    <div className="grid grid-cols-2 border-b border-slate-800">
                        <div className="border-r border-slate-800 p-2.5 flex flex-col justify-start">
                            <p className="font-semibold mb-1">To,</p>
                            <textarea
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                placeholder="Recipient name & address"
                                rows={6}
                                className="w-full resize-none border-none outline-none text-slate-800 bg-transparent text-[12px]"
                            />
                        </div>

                        <div className="flex flex-col justify-between">
                            {detailFields.map((field, index) => (
                                <div
                                    key={field.label}
                                    className={`flex flex-1 items-stretch ${
                                        index !== detailFields.length - 1 ? "border-b border-slate-800" : ""
                                    }`}
                                >
                                    <div className="w-1/2 border-r border-slate-800 p-2.5 font-semibold flex items-center">
                                        {field.label}
                                    </div>
                                    <div className="w-1/2 p-2.5 flex items-center">
                                        <input
                                            value={field.value}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            placeholder={field.placeholder || ""}
                                            className="w-full border-none outline-none bg-transparent"
                                        />
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
                                            className="print:hidden text-indigo-600 hover:text-indigo-800 cursor-pointer"
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
                                                    className="print:hidden text-slate-300 hover:text-rose-500 shrink-0 cursor-pointer"
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

                {/* SECTION 2 — Approval matrix */}
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