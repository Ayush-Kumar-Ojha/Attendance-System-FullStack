import React, { useEffect, useMemo, useState } from "react";
import {
    Receipt,
    Plus,
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    Clock3,
    Eye,
    Upload,
    IndianRupee,
    X,
    RefreshCw,
    Image as ImageIcon,
    FileSpreadsheet,
    Download,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const BillClaims = () => {
    const { user } = useAuth();

    const isAdmin =
        user?.role === "ADMIN" ||
        user?.role === "admin" ||
        user?.user?.role === "ADMIN";

    const currentDate = new Date();

    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);

    // ==============================
    // Create claim
    // ==============================

    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [billFile, setBillFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");

    // ==============================
    // Filters
    // ==============================

    const [statusFilter, setStatusFilter] = useState("");
    const [monthFilter, setMonthFilter] = useState("");
    const [yearFilter, setYearFilter] = useState(
        String(currentDate.getFullYear())
    );

    const [search, setSearch] = useState("");

    // ==============================
    // Details
    // ==============================

    const [selectedClaim, setSelectedClaim] = useState(null);
    const [showDetails, setShowDetails] = useState(false);

    const [actionLoading, setActionLoading] = useState(false);
    const [remark, setRemark] = useState("");

    // ==============================
    // Voucher
    // ==============================

    const [voucherClaim, setVoucherClaim] = useState(null);
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

    // ==============================
    // Helpers
    // ==============================

    const formatDateInput = (date) => {
        if (!date) return "";

        try {
            const parsed = new Date(date);

            if (Number.isNaN(parsed.getTime())) {
                return "";
            }

            return parsed.toISOString().split("T")[0];
        } catch {
            return "";
        }
    };

    const formatCurrency = (amountValue) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(Number(amountValue || 0));
    };

    const formatDate = (date) => {
        if (!date) return "-";

        try {
            const parsed = new Date(date);

            if (Number.isNaN(parsed.getTime())) {
                return "-";
            }

            return parsed.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
        } catch {
            return "-";
        }
    };

    // ==============================
    // Fetch claims
    // ==============================

    const fetchClaims = async () => {
        try {
            setLoading(true);

            const params = {};

            if (isAdmin) {
                if (statusFilter) {
                    params.status = statusFilter;
                }

                if (monthFilter) {
                    params.month = monthFilter;
                }

                if (yearFilter) {
                    params.year = yearFilter;
                }
            }

            const response = await api.get("/bill-claims", {
                params,
            });

            setClaims(response.data?.data || []);
        } catch (error) {
            console.error("Fetch Bill Claims Error:", error);

            toast.error(
                error.response?.data?.error ||
                    error.response?.data?.message ||
                    "Failed to load bill claims"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClaims();
    }, [statusFilter, monthFilter, yearFilter, isAdmin]);

    // ==============================
    // Create claim form
    // ==============================

    const resetForm = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        setAmount("");
        setReason("");
        setBillFile(null);
        setPreviewUrl("");
    };

    const closeCreateModal = () => {
        if (submitting) return;

        resetForm();
        setShowForm(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type.toLowerCase())) {
            toast.error("Only JPG, PNG and WEBP images are allowed");

            e.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Bill image must be below 5 MB");

            e.target.value = "";
            return;
        }

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        const objectUrl = URL.createObjectURL(file);

        setBillFile(file);
        setPreviewUrl(objectUrl);
    };

    const removeSelectedFile = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        setBillFile(null);
        setPreviewUrl("");
    };

    // ==============================
    // SUBMIT BILL CLAIM
    // ==============================

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (submitting) {
            return;
        }

        const numericAmount = Number(amount);

        if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
            toast.error("Enter a valid expense amount");
            return;
        }

        if (!billFile) {
            toast.error("Please upload the bill image");
            return;
        }

        if (!billFile.type.startsWith("image/")) {
            toast.error("Please upload a valid image");
            return;
        }

        try {
            setSubmitting(true);

            const formData = new FormData();

            formData.append("amount", String(numericAmount));
            formData.append("reason", reason.trim());
            formData.append("bill", billFile);

            const response = await api.post(
                "/bill-claims",
                formData
            );

            if (!response.data?.success) {
                throw new Error(
                    response.data?.error ||
                        "Failed to submit bill claim"
                );
            }

            toast.success("Bill claim submitted successfully");

            resetForm();
            setShowForm(false);

            await fetchClaims();
        } catch (error) {
            console.error(
                "Create Bill Claim Error:",
                error
            );

            const serverMessage =
                error.response?.data?.error ||
                error.response?.data?.message;

            if (serverMessage) {
                toast.error(serverMessage);
            } else if (error.response?.status === 400) {
                toast.error(
                    "Invalid bill claim data. Please check the amount and bill image."
                );
            } else if (error.response?.status === 401) {
                toast.error(
                    "Your session has expired. Please login again."
                );
            } else if (error.response?.status === 403) {
                toast.error(
                    "You are not authorized to submit a bill claim."
                );
            } else if (error.response?.status === 413) {
                toast.error(
                    "Bill image is too large."
                );
            } else {
                toast.error(
                    "Failed to submit bill claim"
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    // ==============================
    // Details
    // ==============================

    const openDetails = (claim) => {
        setSelectedClaim(claim);
        setRemark(claim.adminRemark || "");
        setShowDetails(true);
    };

    const closeDetails = () => {
        if (actionLoading) return;

        setShowDetails(false);
        setSelectedClaim(null);
        setRemark("");
    };

    // ==============================
    // Approve / Reject
    // ==============================

    const updateClaimStatus = async (status) => {
        if (!selectedClaim || actionLoading) {
            return;
        }

        const claimId = selectedClaim.id || selectedClaim._id;

        if (status === "REJECTED" && !remark.trim()) {
            toast.error("Please enter a reason for rejection");
            return;
        }

        try {
            setActionLoading(true);

            await api.put(
                `/bill-claims/${claimId}/status`,
                {
                    status,
                    adminRemark: remark.trim(),
                }
            );

            toast.success(
                status === "APPROVED"
                    ? "Bill claim approved"
                    : "Bill claim rejected"
            );

            closeDetails();

            await fetchClaims();
        } catch (error) {
            console.error(
                "Update Bill Claim Error:",
                error
            );

            toast.error(
                error.response?.data?.error ||
                    "Failed to update claim"
            );
        } finally {
            setActionLoading(false);
        }
    };

    // ==============================
    // Admin - Mark Tracking Chain Step Done
    // ==============================

    const handleMarkStepDone = async (claimId, stepKey) => {
        try {
            setActionLoading(true);

            const response = await api.patch(
                `/bill-claims/${claimId}/tracking/${stepKey}`,
                {}
            );

            toast.success("Tracking step marked as completed");

            if (selectedClaim && (selectedClaim.id === claimId || selectedClaim._id === claimId)) {
                setSelectedClaim((prev) => ({
                    ...prev,
                    trackingChain: response.data?.data || prev.trackingChain,
                }));
            }

            await fetchClaims();
        } catch (error) {
            console.error("Mark Tracking Step Error:", error);
            toast.error(
                error.response?.data?.error ||
                    "Failed to update tracking step"
            );
        } finally {
            setActionLoading(false);
        }
    };

    // ==============================
    // Voucher
    // ==============================

    const openVoucherForm = (claim) => {
        const emp = claim.employee || {};

        setVoucherClaim(claim);

        setVoucherFields({
            employeeCode: emp.employeeCode || "",
            employeeName:
                `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
            email: emp.email || "",
            phone: emp.phone || "",
            joinDate: formatDateInput(emp.joinDate),
            designation: emp.position || "",
            department:
                typeof emp.department === "object"
                    ? emp.department?.department_name ||
                      emp.department?.name ||
                      ""
                    : emp.department || "",
            panNumber: emp.panNumber || "",
            uanNumber: emp.uanNumber || "",
            bankName: emp.bankName || "",
            bankAccountNumber: emp.bankAccountNumber || "",
            amount: claim.amount || "",
            reason: claim.reason || "",
        });

        setShowDetails(false);
        setShowVoucherForm(true);
    };

    const handleVoucherFieldChange = (field, value) => {
        setVoucherFields((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const closeVoucherForm = () => {
        if (generatingVoucher) return;

        setShowVoucherForm(false);
        setVoucherClaim(null);
    };

    const handleGenerateVoucher = async (e) => {
        e.preventDefault();

        if (!voucherClaim || generatingVoucher) {
            return;
        }

        const claimId = voucherClaim.id || voucherClaim._id;

        try {
            setGeneratingVoucher(true);

            const response = await api.post(
                `/bill-claims/${claimId}/generate-voucher`,
                {
                    ...voucherFields,
                    amount: Number(voucherFields.amount),
                }
            );

            const voucherId = response.data?.data?.id || response.data?.data?._id;

            if (!voucherId) {
                throw new Error(
                    "Voucher ID was not returned by server"
                );
            }

            toast.success("Bill voucher generated");

            setShowVoucherForm(false);
            setVoucherClaim(null);

            window.open(
                `/print/bill-voucher/${voucherId}`,
                "_blank"
            );

            await fetchClaims();
        } catch (error) {
            console.error(
                "Generate Bill Voucher Error:",
                error
            );

            toast.error(
                error.response?.data?.error ||
                    "Failed to generate voucher"
            );
        } finally {
            setGeneratingVoucher(false);
        }
    };

    const openVoucher = (voucherId) => {
        const id = typeof voucherId === "object" ? (voucherId._id || voucherId.id) : voucherId;

        if (!id) {
            toast.error("Voucher is not available");
            return;
        }

        window.open(
            `/print/bill-voucher/${id}`,
            "_blank"
        );
    };

    // ==============================
    // Search
    // ==============================

    const filteredClaims = useMemo(() => {
        if (!search.trim()) {
            return claims;
        }

        const value = search.toLowerCase().trim();

        return claims.filter((claim) => {
            const employeeName =
                `${claim.employee?.firstName || ""} ${
                    claim.employee?.lastName || ""
                }`.toLowerCase();

            const employeeCode =
                claim.employee?.employeeCode?.toLowerCase() || "";

            const reason =
                claim.reason?.toLowerCase() || "";

            const status =
                claim.status?.toLowerCase() || "";

            const referenceId =
                claim.referenceId?.toLowerCase() || "";

            return (
                employeeName.includes(value) ||
                employeeCode.includes(value) ||
                reason.includes(value) ||
                status.includes(value) ||
                referenceId.includes(value)
            );
        });
    }, [claims, search]);

    // ==============================
    // Statistics
    // ==============================

    const statistics = useMemo(() => {
        const pending = claims.filter(
            (item) => item.status === "PENDING"
        );

        const approved = claims.filter(
            (item) => item.status === "APPROVED"
        );

        const rejected = claims.filter(
            (item) => item.status === "REJECTED"
        );

        const approvedAmount = approved.reduce(
            (sum, item) =>
                sum + Number(item.amount || 0),
            0
        );

        const pendingAmount = pending.reduce(
            (sum, item) =>
                sum + Number(item.amount || 0),
            0
        );

        return {
            total: claims.length,
            pending: pending.length,
            approved: approved.length,
            rejected: rejected.length,
            approvedAmount,
            pendingAmount,
        };
    }, [claims]);

    // ==============================
    // Status UI
    // ==============================

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

    // ==============================
    // Excel export
    // ==============================

    const exportClaims = () => {
        if (filteredClaims.length === 0) {
            toast.error(
                "No claims to export for the current filters"
            );
            return;
        }

        const rows = filteredClaims.map((claim) => ({
            "Reference ID": claim.referenceId || "",
            "Employee Code":
                claim.employee?.employeeCode || "",
            "Employee Name":
                `${claim.employee?.firstName || ""} ${
                    claim.employee?.lastName || ""
                }`.trim(),
            "Designation":
                claim.employee?.position || "",
            "Date": formatDate(claim.createdAt),
            "Amount": Number(claim.amount || 0),
            "Reason": claim.reason || "",
            "Status": claim.status || "",
            "Admin Remark":
                claim.adminRemark || "",
        }));

        const worksheet =
            XLSX.utils.json_to_sheet(rows);

        worksheet["!cols"] = Object.keys(rows[0]).map(
            (key) => ({
                wch: Math.max(key.length + 2, 16),
            })
        );

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Bill Claims"
        );

        const parts = ["bill_claims"];

        if (statusFilter) {
            parts.push(
                statusFilter.toLowerCase()
            );
        }

        if (monthFilter) {
            parts.push(
                new Date(
                    2000,
                    Number(monthFilter) - 1
                )
                    .toLocaleString("en-IN", {
                        month: "short",
                    })
                    .toLowerCase()
            );
        }

        if (yearFilter) {
            parts.push(yearFilter);
        }

        XLSX.writeFile(
            workbook,
            `${parts.join("_")}.xlsx`
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">
            <div className="mx-auto max-w-7xl space-y-6">

                {/* ================= HEADER ================= */}

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-indigo-100 p-3 text-indigo-600">
                            <Receipt size={25} />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                Bill Claims
                            </h1>

                            <p className="text-sm text-slate-500">
                                {isAdmin
                                    ? "Review and manage employee expense claims"
                                    : "Submit and track your expense reimbursements"}
                            </p>
                        </div>
                    </div>

                    {!isAdmin && (
                        <button
                            type="button"
                            onClick={() => setShowForm(true)}
                            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                        >
                            <Plus size={19} />
                            Submit Bill Claim
                        </button>
                    )}

                    {isAdmin && (
                        <button
                            type="button"
                            onClick={exportClaims}
                            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
                        >
                            <Download size={17} />
                            Download
                        </button>
                    )}
                </div>

                {/* ================= STATISTICS ================= */}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Claims"
                        value={statistics.total}
                        icon={<Receipt size={20} />}
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
                        value={formatCurrency(
                            statistics.approvedAmount
                        )}
                        icon={<IndianRupee size={20} />}
                    />
                </div>

                {/* ================= ADMIN FILTERS ================= */}

                {isAdmin && (
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="mb-2 flex items-center gap-2">
                            <Filter
                                size={16}
                                className="text-slate-500"
                            />

                            <h2 className="text-sm font-semibold text-slate-900">
                                Filters
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-4">
                            <div className="relative">
                                <Search
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    value={search}
                                    onChange={(e) =>
                                        setSearch(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Search employee or ref..."
                                    className="w-full rounded-xl border border-slate-200 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(
                                        e.target.value
                                    )
                                }
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                            >
                                <option value="">
                                    All Status
                                </option>
                                <option value="PENDING">
                                    Pending
                                </option>
                                <option value="APPROVED">
                                    Approved
                                </option>
                                <option value="REJECTED">
                                    Rejected
                                </option>
                            </select>

                            <select
                                value={monthFilter}
                                onChange={(e) =>
                                    setMonthFilter(
                                        e.target.value
                                    )
                                }
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                            >
                                <option value="">
                                    All Months
                                </option>

                                {Array.from(
                                    { length: 12 },
                                    (_, index) => (
                                        <option
                                            key={
                                                index + 1
                                            }
                                            value={
                                                index + 1
                                            }
                                        >
                                            {new Date(
                                                2000,
                                                index
                                            ).toLocaleString(
                                                "en-IN",
                                                {
                                                    month: "long",
                                                }
                                            )}
                                        </option>
                                    )
                                )}
                            </select>

                            <select
                                value={yearFilter}
                                onChange={(e) =>
                                    setYearFilter(
                                        e.target.value
                                    )
                                }
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                            >
                                <option value="">
                                    All Years
                                </option>
                                {Array.from(
                                    { length: 6 },
                                    (_, index) => {
                                        const year =
                                            currentDate.getFullYear() -
                                            index;

                                        return (
                                            <option
                                                key={year}
                                                value={year}
                                            >
                                                {year}
                                            </option>
                                        );
                                    }
                                )}
                            </select>
                        </div>
                    </div>
                )}

                {/* ================= CLAIM HISTORY ================= */}

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-slate-900">
                                    Claim History
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    {filteredClaims.length} claim
                                    {filteredClaims.length !== 1
                                        ? "s"
                                        : ""}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={fetchClaims}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex min-h-[300px] items-center justify-center">
                            <div className="flex items-center gap-3 text-slate-500">
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
                                Loading claims...
                            </div>
                        </div>
                    ) : filteredClaims.length === 0 ? (
                        <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                            <div className="mb-4 rounded-full bg-slate-100 p-4">
                                <Receipt
                                    size={28}
                                    className="text-slate-400"
                                />
                            </div>

                            <h3 className="font-semibold text-slate-800">
                                No bill claims found
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                                {isAdmin
                                    ? "There are no claims matching your filters."
                                    : "You haven't submitted any bill claims yet."}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* ================= DESKTOP ================= */}

                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full">
                                    <thead className="bg-slate-50">
                                        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            <th className="px-5 py-4">
                                                Ref ID
                                            </th>

                                            {isAdmin && (
                                                <th className="px-5 py-4">
                                                    Employee
                                                </th>
                                            )}

                                            <th className="px-5 py-4">
                                                Date
                                            </th>

                                            <th className="px-5 py-4">
                                                Amount
                                            </th>

                                            <th className="px-5 py-4">
                                                Reason
                                            </th>

                                            <th className="px-5 py-4">
                                                Status
                                            </th>

                                            <th className="px-5 py-4">
                                                Voucher
                                            </th>

                                            <th className="px-5 py-4">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {filteredClaims.map(
                                            (claim) => (
                                                <tr
                                                    key={
                                                        claim.id ||
                                                        claim._id
                                                    }
                                                    className="transition hover:bg-slate-50"
                                                >
                                                    <td className="px-5 py-4 text-xs font-mono font-semibold text-indigo-600">
                                                        {claim.referenceId || "—"}
                                                    </td>

                                                    {isAdmin && (
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                                                                    {claim
                                                                        .employee
                                                                        ?.firstName?.[0] ||
                                                                        "E"}
                                                                </div>

                                                                <div>
                                                                    <p className="font-medium text-slate-800">
                                                                        {
                                                                            claim
                                                                                .employee
                                                                                ?.firstName
                                                                        }{" "}
                                                                        {
                                                                            claim
                                                                                .employee
                                                                                ?.lastName
                                                                        }
                                                                    </p>

                                                                    <p className="text-xs text-slate-500">
                                                                        {
                                                                            claim
                                                                                .employee
                                                                                ?.position
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    )}

                                                    <td className="px-5 py-4 text-sm text-slate-600">
                                                        {formatDate(
                                                            claim.createdAt
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-4 font-semibold text-slate-900">
                                                        {formatCurrency(
                                                            claim.amount
                                                        )}
                                                    </td>

                                                    <td className="max-w-[220px] px-5 py-4 text-sm text-slate-600">
                                                        <span className="line-clamp-2">
                                                            {claim.reason ||
                                                                "No reason provided"}
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusStyle(
                                                                claim.status
                                                            )}`}
                                                        >
                                                            {getStatusIcon(
                                                                claim.status
                                                            )}

                                                            {claim.status}
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        {claim.status ===
                                                            "APPROVED" &&
                                                        claim.billVoucherId ? (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openVoucher(
                                                                        claim.billVoucherId
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                                            >
                                                                <Download
                                                                    size={
                                                                        15
                                                                    }
                                                                />
                                                                Download
                                                            </button>
                                                        ) : isAdmin &&
                                                          claim.status ===
                                                              "APPROVED" ? (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openVoucherForm(
                                                                        claim
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                                                            >
                                                                <FileSpreadsheet
                                                                    size={
                                                                        15
                                                                    }
                                                                />
                                                                Generate
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openDetails(
                                                                    claim
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                                        >
                                                            <Eye
                                                                size={
                                                                    15
                                                                }
                                                            />
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* ================= MOBILE ================= */}

                            <div className="divide-y divide-slate-100 md:hidden">
                                {filteredClaims.map(
                                    (claim) => (
                                        <div
                                            key={
                                                claim.id ||
                                                claim._id
                                            }
                                            className="p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    {claim.referenceId && (
                                                        <span className="mb-1 block text-xs font-mono font-semibold text-indigo-600">
                                                            {claim.referenceId}
                                                        </span>
                                                    )}

                                                    {isAdmin && (
                                                        <p className="mb-1 text-sm font-semibold text-slate-800">
                                                            {
                                                                claim
                                                                    .employee
                                                                    ?.firstName
                                                            }{" "}
                                                            {
                                                                claim
                                                                    .employee
                                                                    ?.lastName
                                                            }
                                                        </p>
                                                    )}

                                                    <p className="text-xs text-slate-500">
                                                        {formatDate(
                                                            claim.createdAt
                                                        )}
                                                    </p>
                                                </div>

                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${getStatusStyle(
                                                        claim.status
                                                    )}`}
                                                >
                                                    {getStatusIcon(
                                                        claim.status
                                                    )}

                                                    {claim.status}
                                                </span>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-slate-500">
                                                        Amount
                                                    </p>

                                                    <p className="font-bold text-slate-900">
                                                        {formatCurrency(
                                                            claim.amount
                                                        )}
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openDetails(
                                                            claim
                                                        )
                                                    }
                                                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
                                                >
                                                    <Eye
                                                        size={
                                                            15
                                                        }
                                                    />
                                                    View
                                                </button>
                                            </div>

                                            {claim.status ===
                                                "APPROVED" &&
                                                claim.billVoucherId && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openVoucher(
                                                                claim.billVoucherId
                                                            )
                                                        }
                                                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                                                    >
                                                        <Download
                                                            size={
                                                                15
                                                            }
                                                        />
                                                        Download Voucher
                                                    </button>
                                                )}

                                            {isAdmin &&
                                                claim.status ===
                                                    "APPROVED" &&
                                                !claim.billVoucherId && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openVoucherForm(
                                                                claim
                                                            )
                                                        }
                                                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700"
                                                    >
                                                        <FileSpreadsheet
                                                            size={
                                                                15
                                                            }
                                                        />
                                                        Generate Voucher
                                                    </button>
                                                )}

                                            {claim.reason && (
                                                <p className="mt-3 text-sm text-slate-600">
                                                    {
                                                        claim.reason
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* =========================================================
                CREATE BILL CLAIM MODAL
            ========================================================= */}

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 p-5">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Submit Bill Claim
                                </h2>

                                <p className="text-sm text-slate-500">
                                    Upload your bill and request reimbursement.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeCreateModal}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="space-y-5 p-5"
                        >
                            {/* Amount */}

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Expense Amount *
                                </label>

                                <div className="relative">
                                    <IndianRupee
                                        size={17}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        value={amount}
                                        onChange={(e) =>
                                            setAmount(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter amount"
                                        className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Reason */}

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Reason
                                </label>

                                <textarea
                                    value={reason}
                                    onChange={(e) =>
                                        setReason(
                                            e.target.value
                                        )
                                    }
                                    rows={4}
                                    placeholder="What was this expense for?"
                                    className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>

                            {/* Bill upload */}

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Bill / Receipt *
                                </label>

                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-indigo-400 hover:bg-indigo-50">
                                    <Upload
                                        size={28}
                                        className="mb-2 text-indigo-500"
                                    />

                                    <span className="text-sm font-semibold text-slate-700">
                                        Click to upload bill
                                    </span>

                                    <span className="mt-1 text-xs text-slate-500">
                                        JPG, PNG or WEBP • Maximum 5 MB
                                    </span>

                                    <input
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                                        onChange={
                                            handleFileChange
                                        }
                                        className="hidden"
                                    />
                                </label>

                                {billFile && (
                                    <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                                        <ImageIcon
                                            size={20}
                                            className="text-indigo-600"
                                        />

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-slate-800">
                                                {
                                                    billFile.name
                                                }
                                            </p>

                                            <p className="text-xs text-slate-500">
                                                {(
                                                    billFile.size /
                                                    1024 /
                                                    1024
                                                ).toFixed(
                                                    2
                                                )}{" "}
                                                MB
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={
                                                removeSelectedFile
                                            }
                                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200"
                                        >
                                            <X size={17} />
                                        </button>
                                    </div>
                                )}

                                {previewUrl && (
                                    <div className="mt-3 overflow-hidden rounded-xl border border-slate-300 bg-white">
                                        <img
                                            src={previewUrl}
                                            alt="Bill preview"
                                            className="max-h-80 w-full object-contain"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Buttons */}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeCreateModal}
                                    disabled={submitting}
                                    className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {submitting && (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    )}

                                    {submitting
                                        ? "Submitting..."
                                        : "Submit Claim"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =========================================================
                DETAILS MODAL WITH PAYMENT TRACKING TIMELINE
            ========================================================= */}

            {showDetails && selectedClaim && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 p-5">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Bill Claim Details
                                </h2>

                                <p className="text-sm text-slate-500">
                                    Submitted on{" "}
                                    {formatDate(
                                        selectedClaim.createdAt
                                    )}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeDetails}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5 p-5">
                            {/* Employee */}

                            {isAdmin && (
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Employee
                                    </p>

                                    <p className="mt-1 font-semibold text-slate-900">
                                        {
                                            selectedClaim
                                                .employee
                                                ?.firstName
                                        }{" "}
                                        {
                                            selectedClaim
                                                .employee
                                                ?.lastName
                                        }
                                    </p>

                                    <p className="text-sm text-slate-500">
                                        {
                                            selectedClaim
                                                .employee
                                                ?.position
                                        }
                                    </p>

                                    {selectedClaim.referenceId && (
                                        <p className="mt-2 text-xs font-mono font-semibold text-indigo-600">
                                            Reference:{" "}
                                            {
                                                selectedClaim.referenceId
                                            }
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Amount / Status */}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-xl border border-slate-200 p-4">
                                    <p className="text-xs text-slate-500">
                                        Amount
                                    </p>

                                    <p className="mt-1 text-xl font-bold text-slate-900">
                                        {formatCurrency(
                                            selectedClaim.amount
                                        )}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-slate-200 p-4">
                                    <p className="text-xs text-slate-500">
                                        Status
                                    </p>

                                    <span
                                        className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusStyle(
                                            selectedClaim.status
                                        )}`}
                                    >
                                        {getStatusIcon(
                                            selectedClaim.status
                                        )}

                                        {
                                            selectedClaim.status
                                        }
                                    </span>
                                </div>
                            </div>

                            {/* =========================================================
                                PAYMENT TRACKING PROGRESS TIMELINE
                            ========================================================= */}

                            {selectedClaim.trackingChain && selectedClaim.trackingChain.length > 0 && (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                                    <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                                        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                            <Clock3 size={16} className="text-indigo-600" />
                                            Payment Progress Tracker
                                        </h3>

                                        {selectedClaim.referenceId && (
                                            <span className="rounded-md bg-indigo-100 px-2.5 py-1 font-mono text-xs font-bold text-indigo-700">
                                                {selectedClaim.referenceId}
                                            </span>
                                        )}
                                    </div>

                                    {/* Timeline list */}
                                    <div className="relative space-y-4 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                                        {selectedClaim.trackingChain.map((stepItem, index) => {
                                            const isDone = stepItem.status === "DONE";
                                            const isPreviousDone =
                                                index === 0 ||
                                                selectedClaim.trackingChain[index - 1]?.status === "DONE";

                                            const canMarkDone =
                                                isAdmin && !isDone && isPreviousDone;

                                            return (
                                                <div
                                                    key={stepItem.step}
                                                    className="relative flex items-start gap-3.5 pl-1"
                                                >
                                                    {/* Step Circle */}
                                                    <div
                                                        className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                                                            isDone
                                                                ? "bg-emerald-600 text-white ring-4 ring-emerald-50"
                                                                : canMarkDone
                                                                ? "bg-indigo-600 text-white ring-4 ring-indigo-50 animate-pulse"
                                                                : "bg-slate-200 text-slate-500"
                                                        }`}
                                                    >
                                                        {isDone ? (
                                                            <CheckCircle2 size={15} />
                                                        ) : (
                                                            index + 1
                                                        )}
                                                    </div>

                                                    {/* Step Information */}
                                                    <div className="min-w-0 flex-1 pt-0.5">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <p
                                                                className={`text-sm font-semibold ${
                                                                    isDone
                                                                        ? "text-emerald-900"
                                                                        : canMarkDone
                                                                        ? "text-indigo-900"
                                                                        : "text-slate-600"
                                                                }`}
                                                            >
                                                                {stepItem.label}
                                                            </p>

                                                            {isDone && stepItem.completedAt && (
                                                                <span className="text-xs text-slate-500">
                                                                    {formatDate(
                                                                        stepItem.completedAt
                                                                    )}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {stepItem.notes && (
                                                            <p className="mt-1 text-xs italic text-slate-500">
                                                                "{stepItem.notes}"
                                                            </p>
                                                        )}

                                                        {/* Action Button for Admin to mark next step as DONE */}
                                                        {canMarkDone && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleMarkStepDone(
                                                                        selectedClaim.id ||
                                                                            selectedClaim._id,
                                                                        stepItem.step
                                                                    )
                                                                }
                                                                disabled={actionLoading}
                                                                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                                                            >
                                                                <CheckCircle2 size={13} />
                                                                Mark "{stepItem.label}" Completed
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Reason */}

                            <div>
                                <p className="mb-2 text-sm font-semibold text-slate-700">
                                    Reason
                                </p>

                                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                                    {selectedClaim.reason ||
                                        "No reason provided"}
                                </div>
                            </div>

                            {/* Bill */}

                            {selectedClaim.billImage && (
                                <div>
                                    <p className="mb-2 text-sm font-semibold text-slate-700">
                                        Uploaded Bill
                                    </p>

                                    <a
                                        href={
                                            selectedClaim.billImage
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block overflow-hidden rounded-xl border border-slate-200"
                                    >
                                        <img
                                            src={
                                                selectedClaim.billImage
                                            }
                                            alt="Uploaded bill"
                                            className="max-h-80 w-full object-contain"
                                        />
                                    </a>
                                </div>
                            )}

                            {/* Admin remark */}

                            {selectedClaim.adminRemark && (
                                <div className="rounded-xl border border-slate-200 p-4">
                                    <p className="mb-1 text-sm font-semibold text-slate-700">
                                        Admin Remark
                                    </p>

                                    <p className="text-sm text-slate-600">
                                        {
                                            selectedClaim.adminRemark
                                        }
                                    </p>
                                </div>
                            )}

                            {/* Admin approval */}

                            {isAdmin &&
                                selectedClaim.status ===
                                    "PENDING" && (
                                    <div className="border-t border-slate-100 pt-5">
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                                            Admin Remark
                                        </label>

                                        <textarea
                                            value={remark}
                                            onChange={(e) =>
                                                setRemark(
                                                    e.target
                                                        .value
                                                )
                                            }
                                            rows={3}
                                            placeholder="Add a remark..."
                                            className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                        />

                                        <div className="mt-3 flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    updateClaimStatus(
                                                        "REJECTED"
                                                    )
                                                }
                                                disabled={
                                                    actionLoading
                                                }
                                                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                                            >
                                                <XCircle
                                                    size={18}
                                                />
                                                Reject
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    updateClaimStatus(
                                                        "APPROVED"
                                                    )
                                                }
                                                disabled={
                                                    actionLoading
                                                }
                                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                            >
                                                <CheckCircle2
                                                    size={18}
                                                />
                                                Approve
                                            </button>
                                        </div>
                                    </div>
                                )}

                            {/* Voucher */}

                            {selectedClaim.status ===
                                "APPROVED" && (
                                <div className="border-t border-slate-100 pt-5">
                                    {selectedClaim.billVoucherId ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openVoucher(
                                                    selectedClaim.billVoucherId
                                                )
                                            }
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
                                        >
                                            <Download size={18} />
                                            Download Voucher
                                        </button>
                                    ) : isAdmin ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openVoucherForm(
                                                    selectedClaim
                                                )
                                            }
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700"
                                        >
                                            <FileSpreadsheet
                                                size={18}
                                            />
                                            Generate Voucher
                                        </button>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================
                VOUCHER MODAL
            ========================================================= */}

            {showVoucherForm && voucherClaim && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 p-5">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Generate Bill Voucher
                                </h2>

                                <p className="text-sm text-slate-500">
                                    Review the details and generate the printable voucher.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeVoucherForm
                                }
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form
                            onSubmit={
                                handleGenerateVoucher
                            }
                            className="space-y-5 p-5"
                        >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {[
                                    [
                                        "employeeCode",
                                        "Employee Code",
                                    ],
                                    [
                                        "employeeName",
                                        "Employee Name",
                                    ],
                                    ["email", "Email ID"],
                                    ["phone", "Phone No"],
                                    [
                                        "joinDate",
                                        "Joining Date",
                                    ],
                                    [
                                        "designation",
                                        "Designation",
                                    ],
                                    ["department", "Department"],
                                    ["panNumber", "PAN"],
                                    ["uanNumber", "UAN No"],
                                    ["bankName", "Bank Name"],
                                    [
                                        "bankAccountNumber",
                                        "Bank Account No",
                                    ],
                                ].map(
                                    ([field, label]) => (
                                        <div
                                            key={field}
                                        >
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                                {label}
                                            </label>

                                            <input
                                                type={
                                                    field ===
                                                    "joinDate"
                                                        ? "date"
                                                        : field ===
                                                            "email"
                                                          ? "email"
                                                          : "text"
                                                }
                                                value={
                                                    voucherFields[
                                                        field
                                                    ]
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    handleVoucherFieldChange(
                                                        field,
                                                        e.target
                                                            .value
                                                    )
                                                }
                                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    )
                                )}
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Bill Amount
                                </label>

                                <div className="relative">
                                    <IndianRupee
                                        size={16}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        value={
                                            voucherFields.amount
                                        }
                                        onChange={(e) =>
                                            handleVoucherFieldChange(
                                                "amount",
                                                e.target
                                                    .value
                                            )
                                        }
                                        className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500"
                                        required
                                    />
                                </div>

                                <label className="mb-1.5 mt-4 block text-sm font-semibold text-slate-700">
                                    Reason
                                </label>

                                <textarea
                                    value={
                                        voucherFields.reason
                                    }
                                    onChange={(e) =>
                                        handleVoucherFieldChange(
                                            "reason",
                                            e.target.value
                                        )
                                    }
                                    rows={3}
                                    className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={
                                        closeVoucherForm
                                    }
                                    disabled={
                                        generatingVoucher
                                    }
                                    className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        generatingVoucher
                                    }
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                                >
                                    {generatingVoucher && (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    )}

                                    {generatingVoucher
                                        ? "Generating..."
                                        : "Generate Voucher"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({
    title,
    value,
    icon,
}) => {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-medium text-slate-500">
                        {title}
                    </p>

                    <p className="mt-0.5 text-xl font-bold text-slate-900">
                        {value}
                    </p>
                </div>

                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                    {icon}
                </div>
            </div>
        </div>
    );
};

export default BillClaims;