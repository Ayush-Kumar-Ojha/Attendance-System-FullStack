import React, { useEffect, useMemo, useState } from "react";
import {
    WalletCards,
    Plus,
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    Clock3,
    Eye,
    IndianRupee,
    X,
    RefreshCw,
    Download,
    FileSpreadsheet,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const Advance = () => {
    const { user } = useAuth();

    const isAdmin =
        user?.role === "ADMIN" ||
        user?.role === "admin" ||
        user?.user?.role === "ADMIN";

    const currentDate = new Date();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [statusFilter, setStatusFilter] = useState("");
    const [monthFilter, setMonthFilter] = useState("");
    const [yearFilter, setYearFilter] = useState(
        String(currentDate.getFullYear())
    );
    const [search, setSearch] = useState("");
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [remark, setRemark] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [voucherRequest, setVoucherRequest] = useState(null);
    const [showVoucherForm, setShowVoucherForm] = useState(false);
    const [generatingVoucher, setGeneratingVoucher] = useState(false);

    const [voucherFields, setVoucherFields] = useState({
        employeeCode: "",
        employeeName: "",
        email: "",
        phone: "",
        joinDate: "",
        designation: "",
        department: "",
        panNumber: "",
        uanNumber: "",
        bankName: "",
        bankAccountNumber: "",
        amount: "",
        reason: "",
    });

    const formatDateInput = (date) => {
        if (!date) return "";
        try {
            return new Date(date).toISOString().split("T")[0];
        } catch {
            return "";
        }
    };

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const params = {};

            if (isAdmin) {
                if (statusFilter) params.status = statusFilter;
                if (monthFilter) params.month = monthFilter;
                if (yearFilter) params.year = yearFilter;
            }

            const response = await api.get("/advances", { params });
            setRequests(response.data?.data || []);
        } catch (error) {
            console.error("Fetch Advance Requests Error:", error);
            toast.error(
                error.response?.data?.error ||
                    "Failed to load advance requests"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [statusFilter, monthFilter, yearFilter, isAdmin]);

    const resetForm = () => {
        setAmount("");
        setReason("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!amount || Number(amount) <= 0) {
            toast.error("Enter a valid advance amount");
            return;
        }

        try {
            setSubmitting(true);
            await api.post("/advances", {
                amount: Number(amount),
                reason,
            });

            toast.success("Advance request submitted successfully");
            resetForm();
            setShowForm(false);
            await fetchRequests();
        } catch (error) {
            console.error("Create Advance Request Error:", error);
            toast.error(
                error.response?.data?.error ||
                    "Failed to submit advance request"
            );
        } finally {
            setSubmitting(false);
        }
    };

    const openDetails = (request) => {
        setSelectedRequest(request);
        setRemark(request.adminRemark || "");
        setShowDetails(true);
    };

    const updateStatus = async (status) => {
        if (!selectedRequest) return;

        if (status === "REJECTED" && !remark.trim()) {
            toast.error("Please enter a reason for rejection");
            return;
        }

        try {
            setActionLoading(true);
            await api.put(`/advances/${selectedRequest.id}/status`, {
                status,
                adminRemark: remark,
            });

            toast.success(
                status === "APPROVED"
                    ? "Advance request approved"
                    : "Advance request rejected"
            );

            setShowDetails(false);
            setSelectedRequest(null);
            setRemark("");
            await fetchRequests();
        } catch (error) {
            console.error("Update Advance Status Error:", error);
            toast.error(
                error.response?.data?.error ||
                    "Failed to update advance request"
            );
        } finally {
            setActionLoading(false);
        }
    };

    const openVoucherForm = (request) => {
        const employee = request.employee || {};

        setVoucherRequest(request);
        setVoucherFields({
            employeeCode: employee.employeeCode || "",
            employeeName: `${employee.firstName || ""} ${employee.lastName || ""}`.trim(),
            email: employee.email || "",
            phone: employee.phone || "",
            joinDate: formatDateInput(employee.joinDate),
            designation: employee.position || "",
            department: employee.department || "",
            panNumber: employee.panNumber || "",
            uanNumber: employee.uanNumber || "",
            bankName: employee.bankName || "",
            bankAccountNumber: employee.bankAccountNumber || "",
            amount: request.amount || "",
            reason: request.reason || "",
        });

        setShowDetails(false);
        setShowVoucherForm(true);
    };

    const handleVoucherFieldChange = (field, value) => {
        setVoucherFields((previous) => ({
            ...previous,
            [field]: value,
        }));
    };

    const handleGenerateVoucher = async (event) => {
        event.preventDefault();
        if (!voucherRequest) return;

        try {
            setGeneratingVoucher(true);

            const response = await api.post(
                `/advances/${voucherRequest.id}/generate-voucher`,
                voucherFields
            );

            const voucherId = response.data?.data?.id;

            toast.success("Advance voucher generated");
            setShowVoucherForm(false);
            setVoucherRequest(null);

            if (voucherId) {
                window.open(
                    `/print/advance-voucher/${voucherId}`,
                    "_blank"
                );
            }

            await fetchRequests();
        } catch (error) {
            console.error("Generate Advance Voucher Error:", error);
            toast.error(
                error.response?.data?.error ||
                    "Failed to generate voucher"
            );
        } finally {
            setGeneratingVoucher(false);
        }
    };

    const filteredRequests = useMemo(() => {
        if (!search.trim()) return requests;

        const value = search.toLowerCase();

        return requests.filter((request) => {
            const employeeName = `${
                request.employee?.firstName || ""
            } ${request.employee?.lastName || ""}`.toLowerCase();

            return (
                employeeName.includes(value) ||
                request.reason?.toLowerCase().includes(value) ||
                request.status?.toLowerCase().includes(value)
            );
        });
    }, [requests, search]);

    const statistics = useMemo(() => {
        const pending = requests.filter(
            (item) => item.status === "PENDING"
        );
        const approved = requests.filter(
            (item) => item.status === "APPROVED"
        );
        const rejected = requests.filter(
            (item) => item.status === "REJECTED"
        );

        const sumAmount = (items) =>
            items.reduce(
                (sum, item) => sum + Number(item.amount || 0),
                0
            );

        return {
            total: requests.length,
            pending: pending.length,
            approved: approved.length,
            rejected: rejected.length,
            approvedAmount: sumAmount(approved),
            pendingAmount: sumAmount(pending),
        };
    }, [requests]);

    const formatCurrency = (value) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(Number(value || 0));

    const formatDate = (date) => {
        if (!date) return "-";

        return new Date(date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const exportRequests = () => {
        if (filteredRequests.length === 0) {
            toast.error("No requests to export for the current filters");
            return;
        }

        const rows = filteredRequests.map((request) => ({
            "Employee Code": request.employee?.employeeCode || "",
            "Employee Name": `${request.employee?.firstName || ""} ${request.employee?.lastName || ""}`.trim(),
            Designation: request.employee?.position || "",
            Date: formatDate(request.createdAt),
            Amount: Number(request.amount || 0),
            Reason: request.reason || "",
            Status: request.status,
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet["!cols"] = Object.keys(rows[0]).map((key) => ({
            wch: Math.max(key.length, 16),
        }));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Advance Requests"
        );

        const parts = ["advance_requests"];
        if (statusFilter) parts.push(statusFilter.toLowerCase());
        if (monthFilter) {
            parts.push(
                new Date(2000, Number(monthFilter) - 1)
                    .toLocaleString("en-IN", { month: "short" })
                    .toLowerCase()
            );
        }
        if (yearFilter) parts.push(yearFilter);

        XLSX.writeFile(workbook, `${parts.join("_")}.xlsx`);
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case "APPROVED":
                return "bg-emerald-50 text-emerald-700 border-emerald-200";
            case "REJECTED":
                return "bg-red-50 text-red-700 border-red-200";
            default:
                return "bg-amber-50 text-amber-700 border-amber-200";
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "APPROVED":
                return <CheckCircle2 size={14} />;
            case "REJECTED":
                return <XCircle size={14} />;
            default:
                return <Clock3 size={14} />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-violet-100 p-3 text-violet-600">
                            <WalletCards size={25} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                Salary Advance
                            </h1>
                            <p className="text-sm text-slate-500">
                                {isAdmin
                                    ? "Review employee salary advance requests"
                                    : "Request and track your salary advance"}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {isAdmin && (
                            <button
                                onClick={exportRequests}
                                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
                            >
                                <Download size={17} />
                                Download
                            </button>
                        )}

                        {!isAdmin && (
                            <button
                                onClick={() => setShowForm(true)}
                                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-violet-700"
                            >
                                <Plus size={19} />
                                Request Advance
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Requests"
                        value={statistics.total}
                        icon={<WalletCards size={20} />}
                    />
                    <StatCard
                        title="Pending"
                        value={statistics.pending}
                        icon={<Clock3 size={20} />}
                    />
                    <StatCard
                        title="Approved"
                        value={statistics.approved}
                        icon={<CheckCircle2 size={20} />}
                    />
                    <StatCard
                        title="Approved Amount"
                        value={formatCurrency(statistics.approvedAmount)}
                        icon={<IndianRupee size={20} />}
                    />
                </div>

                {isAdmin && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-4 flex items-center gap-2">
                            <Filter size={18} className="text-slate-500" />
                            <h2 className="font-semibold text-slate-900">
                                Filters
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                            <div className="relative">
                                <Search
                                    size={17}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search employee..."
                                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(event) =>
                                    setStatusFilter(event.target.value)
                                }
                                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                            >
                                <option value="">All Status</option>
                                <option value="PENDING">Pending</option>
                                <option value="APPROVED">Approved</option>
                                <option value="REJECTED">Rejected</option>
                            </select>

                            <select
                                value={monthFilter}
                                onChange={(event) =>
                                    setMonthFilter(event.target.value)
                                }
                                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                            >
                                <option value="">All Months</option>
                                {Array.from({ length: 12 }, (_, index) => (
                                    <option key={index + 1} value={index + 1}>
                                        {new Date(
                                            2000,
                                            index
                                        ).toLocaleString("en-IN", {
                                            month: "long",
                                        })}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={yearFilter}
                                onChange={(event) =>
                                    setYearFilter(event.target.value)
                                }
                                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
                            >
                                {Array.from({ length: 6 }, (_, index) => {
                                    const year =
                                        currentDate.getFullYear() - index;
                                    return (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>
                )}

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-slate-900">
                                    Advance Requests
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    {filteredRequests.length} request
                                    {filteredRequests.length !== 1 ? "s" : ""}
                                </p>
                            </div>
                            <button
                                onClick={fetchRequests}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex min-h-[300px] items-center justify-center">
                            <div className="flex items-center gap-3 text-slate-500">
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-violet-600" />
                                Loading requests...
                            </div>
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                            <div className="mb-4 rounded-full bg-slate-100 p-4">
                                <WalletCards
                                    size={28}
                                    className="text-slate-400"
                                />
                            </div>
                            <h3 className="font-semibold text-slate-800">
                                No advance requests found
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                                {isAdmin
                                    ? "No requests match the selected filters."
                                    : "You haven't requested a salary advance yet."}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full">
                                    <thead className="bg-slate-50">
                                        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            {isAdmin && (
                                                <th className="px-5 py-4">
                                                    Employee
                                                </th>
                                            )}
                                            <th className="px-5 py-4">Date</th>
                                            <th className="px-5 py-4">Amount</th>
                                            <th className="px-5 py-4">Reason</th>
                                            <th className="px-5 py-4">Status</th>
                                            {isAdmin && (
                                                <th className="px-5 py-4 text-left">
                                                    Generate Advance
                                                </th>
                                            )}
                                            {!isAdmin && (
                                                <th className="px-5 py-4 text-left">
                                                    Download Voucher
                                                </th>
                                            )}
                                            <th className="px-5 py-4 text-left">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredRequests.map((request) => (
                                            <tr
                                                key={request.id}
                                                className="transition hover:bg-slate-50"
                                            >
                                                {isAdmin && (
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                                                                {request.employee?.firstName?.[0] ||
                                                                    "E"}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-slate-800">
                                                                    {request.employee?.firstName} {request.employee?.lastName}
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    {request.employee?.position}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="px-5 py-4 text-sm text-slate-600">
                                                    {formatDate(request.createdAt)}
                                                </td>
                                                <td className="px-5 py-4 font-semibold text-slate-900">
                                                    {formatCurrency(request.amount)}
                                                </td>
                                                <td className="max-w-[250px] px-5 py-4 text-sm text-slate-600">
                                                    <span className="line-clamp-2">
                                                        {request.reason || "No reason provided"}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusStyle(request.status)}`}>
                                                        {getStatusIcon(request.status)}
                                                        {request.status}
                                                    </span>
                                                </td>
                                                {isAdmin && (
                                                    <td className="px-5 py-4 text-left">
                                                        {request.status === "APPROVED" ? (
                                                            request.advanceVoucherId ? (
                                                                <button
                                                                    onClick={() => window.open(`/print/advance-voucher/${request.advanceVoucherId}`, "_blank")}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                                                >
                                                                    <Download size={15} />
                                                                    Download
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => openVoucherForm(request)}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                                                                >
                                                                    <FileSpreadsheet size={15} />
                                                                    Generate
                                                                </button>
                                                            )
                                                        ) : (
                                                            <span className="text-xs text-slate-400">&mdash;</span>
                                                        )}
                                                    </td>
                                                )}
                                                {!isAdmin && (
                                                    <td className="px-5 py-4 text-left">
                                                        {request.status === "APPROVED" && request.advanceVoucherId ? (
                                                            <button
                                                                onClick={() => window.open(`/print/advance-voucher/${request.advanceVoucherId}`, "_blank")}
                                                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                                            >
                                                                <Download size={15} />
                                                                Download
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">&mdash;</span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="px-5 py-4 text-left">
                                                    <button
                                                        onClick={() => openDetails(request)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                                    >
                                                        <Eye size={15} />
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="divide-y divide-slate-100 md:hidden">
                                {filteredRequests.map((request) => (
                                    <div key={request.id} className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                {isAdmin && (
                                                    <p className="font-semibold text-slate-800">
                                                        {request.employee?.firstName} {request.employee?.lastName}
                                                    </p>
                                                )}
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {formatDate(request.createdAt)}
                                                </p>
                                            </div>
                                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${getStatusStyle(request.status)}`}>
                                                {getStatusIcon(request.status)}
                                                {request.status}
                                            </span>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-slate-500">Amount</p>
                                                <p className="font-bold text-slate-900">
                                                    {formatCurrency(request.amount)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => openDetails(request)}
                                                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
                                            >
                                                <Eye size={15} />
                                                View
                                            </button>
                                        </div>

                                        {isAdmin && request.status === "APPROVED" && (
                                            request.advanceVoucherId ? (
                                                <button
                                                    onClick={() => window.open(`/print/advance-voucher/${request.advanceVoucherId}`, "_blank")}
                                                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                                                >
                                                    <Download size={15} />
                                                    Download Voucher
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => openVoucherForm(request)}
                                                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700"
                                                >
                                                    <FileSpreadsheet size={15} />
                                                    Generate Advance
                                                </button>
                                            )
                                        )}

                                        {!isAdmin && request.status === "APPROVED" && request.advanceVoucherId && (
                                            <button
                                                onClick={() => window.open(`/print/advance-voucher/${request.advanceVoucherId}`, "_blank")}
                                                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                                            >
                                                <Download size={15} />
                                                Download
                                            </button>
                                        )}

                                        {request.reason && (
                                            <p className="mt-3 text-sm text-slate-600">
                                                {request.reason}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showForm && (
                <Modal
                    title="Request Salary Advance"
                    subtitle="Submit your request for admin approval."
                    onClose={() => {
                        resetForm();
                        setShowForm(false);
                    }}
                >
                    <form onSubmit={handleSubmit} className="space-y-5 p-5">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Advance Amount *
                            </label>
                            <div className="relative">
                                <IndianRupee
                                    size={17}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={amount}
                                    onChange={(event) => setAmount(event.target.value)}
                                    placeholder="Enter amount"
                                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Reason
                            </label>
                            <textarea
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                rows={5}
                                placeholder="Why do you need this advance?"
                                className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                            />
                        </div>

                        <div className="rounded-xl bg-violet-50 p-4 text-sm text-violet-800">
                            Your request will be marked as <strong>PENDING</strong> until an administrator reviews it.
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    resetForm();
                                    setShowForm(false);
                                }}
                                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                            >
                                {submitting && (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                )}
                                {submitting ? "Submitting..." : "Submit Request"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {showDetails && selectedRequest && (
                <Modal
                    title="Advance Request"
                    subtitle={`Submitted on ${formatDate(selectedRequest.createdAt)}`}
                    onClose={() => setShowDetails(false)}
                >
                    <div className="space-y-5 p-5">
                        {isAdmin && (
                            <div className="rounded-xl bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Employee
                                </p>
                                <p className="mt-1 font-semibold text-slate-900">
                                    {selectedRequest.employee?.firstName} {selectedRequest.employee?.lastName}
                                </p>
                                <p className="text-sm text-slate-500">
                                    {selectedRequest.employee?.position}
                                </p>
                            </div>
                        )}

                        <div className="rounded-2xl bg-violet-50 p-5 text-center">
                            <p className="text-sm text-violet-700">Requested Amount</p>
                            <p className="mt-1 text-3xl font-bold text-violet-900">
                                {formatCurrency(selectedRequest.amount)}
                            </p>
                            <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyle(selectedRequest.status)}`}>
                                {getStatusIcon(selectedRequest.status)}
                                {selectedRequest.status}
                            </span>
                        </div>

                        <div>
                            <p className="mb-2 text-sm font-semibold text-slate-700">Reason</p>
                            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                                {selectedRequest.reason || "No reason provided"}
                            </div>
                        </div>

                        {selectedRequest.adminRemark && (
                            <div className="rounded-xl border border-slate-200 p-4">
                                <p className="mb-1 text-sm font-semibold text-slate-700">Admin Remark</p>
                                <p className="text-sm text-slate-600">{selectedRequest.adminRemark}</p>
                            </div>
                        )}

                        {isAdmin && selectedRequest.status === "PENDING" && (
                            <div className="border-t border-slate-100 pt-5">
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Admin Remark
                                </label>
                                <textarea
                                    value={remark}
                                    onChange={(event) => setRemark(event.target.value)}
                                    rows={3}
                                    placeholder="Add a remark..."
                                    className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                                />
                                <div className="mt-3 flex gap-3">
                                    <button
                                        onClick={() => updateStatus("REJECTED")}
                                        disabled={actionLoading}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                                    >
                                        <XCircle size={18} />
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => updateStatus("APPROVED")}
                                        disabled={actionLoading}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        <CheckCircle2 size={18} />
                                        Approve
                                    </button>
                                </div>
                            </div>
                        )}

                        {isAdmin && selectedRequest.status === "APPROVED" && (
                            <div className="border-t border-slate-100 pt-5">
                                {selectedRequest.advanceVoucherId ? (
                                    <button
                                        onClick={() => window.open(`/print/advance-voucher/${selectedRequest.advanceVoucherId}`, "_blank")}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
                                    >
                                        <Download size={18} />
                                        Download Voucher
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => openVoucherForm(selectedRequest)}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white hover:bg-violet-700"
                                    >
                                        <FileSpreadsheet size={18} />
                                        Generate Advance
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {showVoucherForm && voucherRequest && (
                <Modal
                    title="Generate Advance"
                    subtitle="Review the details below, then generate a printable voucher."
                    onClose={() => {
                        setShowVoucherForm(false);
                        setVoucherRequest(null);
                    }}
                    maxWidth="max-w-2xl"
                >
                    <form onSubmit={handleGenerateVoucher} className="space-y-5 p-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <VoucherInput label="Employee Code" value={voucherFields.employeeCode} onChange={(value) => handleVoucherFieldChange("employeeCode", value)} />
                            <VoucherInput label="Employee Name" value={voucherFields.employeeName} onChange={(value) => handleVoucherFieldChange("employeeName", value)} />
                            <VoucherInput label="Email ID" type="email" value={voucherFields.email} onChange={(value) => handleVoucherFieldChange("email", value)} />
                            <VoucherInput label="Phone No" value={voucherFields.phone} onChange={(value) => handleVoucherFieldChange("phone", value)} />
                            <VoucherInput label="Joining Date" type="date" value={voucherFields.joinDate} onChange={(value) => handleVoucherFieldChange("joinDate", value)} />
                            <VoucherInput label="Designation" value={voucherFields.designation} onChange={(value) => handleVoucherFieldChange("designation", value)} />
                            <VoucherInput label="Department" value={voucherFields.department} onChange={(value) => handleVoucherFieldChange("department", value)} />
                            <VoucherInput label="PAN" value={voucherFields.panNumber} onChange={(value) => handleVoucherFieldChange("panNumber", value)} />
                            <VoucherInput label="UAN No" value={voucherFields.uanNumber} onChange={(value) => handleVoucherFieldChange("uanNumber", value)} />
                            <VoucherInput label="Bank Name" value={voucherFields.bankName} onChange={(value) => handleVoucherFieldChange("bankName", value)} />
                            <VoucherInput label="Bank Account No" value={voucherFields.bankAccountNumber} onChange={(value) => handleVoucherFieldChange("bankAccountNumber", value)} />
                            <VoucherInput label="Advance Amount" type="number" required value={voucherFields.amount} onChange={(value) => handleVoucherFieldChange("amount", value)} />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Reason</label>
                            <textarea
                                value={voucherFields.reason}
                                onChange={(event) => handleVoucherFieldChange("reason", event.target.value)}
                                rows={3}
                                className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-500"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowVoucherForm(false);
                                    setVoucherRequest(null);
                                }}
                                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={generatingVoucher}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                            >
                                {generatingVoucher && (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                )}
                                {generatingVoucher ? "Generating..." : "Generate Voucher"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

const Modal = ({ title, subtitle, onClose, children, maxWidth = "max-w-lg" }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className={`max-h-[95vh] w-full ${maxWidth} overflow-y-auto rounded-2xl bg-white shadow-2xl`}>
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                    <p className="text-sm text-slate-500">{subtitle}</p>
                </div>
                <button
                    onClick={onClose}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                    <X size={20} />
                </button>
            </div>
            {children}
        </div>
    </div>
);

const VoucherInput = ({
    label,
    type = "text",
    value,
    onChange,
    required = false,
}) => (
    <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            {label}
        </label>
        <input
            type={type}
            value={value}
            required={required}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
        />
    </div>
);

const StatCard = ({ title, value, icon }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm text-slate-500">{title}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
            </div>
            <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                {icon}
            </div>
        </div>
    </div>
);

export default Advance;