import React, {
    useState,
} from "react";

import {
    CheckCircle2,
    XCircle,
    Clock,
    X,
    User,
    DollarSign,
} from "lucide-react";

import api from "../../api/axios";
import toast from "react-hot-toast";

// ============================================================
// HELPERS
// ============================================================

const getLeaveDays = (
    leave
) => {
    if (
        leave.type ===
        "HALF_DAY"
    ) {
        return 0.5;
    }

    const start =
        new Date(
            leave.startDate
        );

    const end =
        new Date(
            leave.endDate
        );

    const diffDays =
        Math.round(
            (
                end.getTime() -
                start.getTime()
            ) /
            (
                1000 *
                60 *
                60 *
                24
            )
        ) + 1;

    return diffDays;
};

const getLeaveTypeLabel = (
    type
) => {
    const labels = {
        SICK:
            "Sick Leave",

        CASUAL:
            "Casual Leave",

        ANNUAL:
            "Annual Leave",

        MENSTRUAL:
            "Wellness Leave",

        HALF_DAY:
            "Half Day",

        COMPENSATORY:
            "Compensatory Leave",
    };

    return (
        labels[type] ||
        type ||
        "—"
    );
};

const formatDate = (
    dateString
) => {
    if (!dateString) {
        return "—";
    }

    try {
        const d =
            new Date(
                dateString
            );

        return d.toLocaleDateString(
            "en-IN",
            {
                day:
                    "2-digit",

                month:
                    "short",

                year:
                    "numeric",
            }
        );
    } catch {
        return "—";
    }
};

// ============================================================
// COMPONENT
// ============================================================

const LeaveHistory = ({
    leaves = [],
    isAdmin = false,
    onUpdate,
}) => {
    const [
        selectedLeave,
        setSelectedLeave,
    ] =
        useState(null);

    const [
        showApprovalModal,
        setShowApprovalModal,
    ] =
        useState(false);

    const [
        actionLoading,
        setActionLoading,
    ] =
        useState(false);

    const [
        adminRemark,
        setAdminRemark,
    ] =
        useState("");

    // ========================================================
    // OPEN REVIEW MODAL
    // ========================================================

    const openReviewModal =
        (
            leave
        ) => {
            setSelectedLeave(
                leave
            );

            setAdminRemark(
                leave.adminRemark ||
                ""
            );

            setShowApprovalModal(
                true
            );
        };

    // ========================================================
    // CLOSE MODAL
    // ========================================================

    const closeReviewModal =
        () => {
            if (
                actionLoading
            ) {
                return;
            }

            setShowApprovalModal(
                false
            );

            setSelectedLeave(
                null
            );

            setAdminRemark(
                ""
            );
        };

    // ========================================================
    // UPDATE STATUS
    //
    // approveAsLop false:
    // APPROVED + PAID
    //
    // approveAsLop true:
    // APPROVED + UNPAID / LOP
    // ========================================================

    const handleUpdateStatus =
        async (
            leaveId,
            status,
            approveAsLop = false
        ) => {
            try {
                setActionLoading(
                    true
                );

                await api.patch(
                    `/leave/${leaveId}`,
                    {
                        status,

                        adminRemark,

                        isLop:
                            approveAsLop,
                    }
                );

                if (
                    status ===
                    "APPROVED" &&
                    approveAsLop
                ) {
                    toast.success(
                        "Leave approved as Loss of Pay"
                    );
                } else if (
                    status ===
                    "APPROVED"
                ) {
                    toast.success(
                        "Leave application approved"
                    );
                } else if (
                    status ===
                    "REJECTED"
                ) {
                    toast.success(
                        "Leave application rejected"
                    );
                }

                setShowApprovalModal(
                    false
                );

                setSelectedLeave(
                    null
                );

                setAdminRemark(
                    ""
                );

                if (
                    onUpdate
                ) {
                    await onUpdate();
                }
            } catch (
            error
            ) {
                console.error(
                    "Update Leave Status Error:",
                    error
                );

                toast.error(
                    error.response
                        ?.data
                        ?.error ||
                    "Failed to update leave status"
                );
            } finally {
                setActionLoading(
                    false
                );
            }
        };

    // ========================================================
    // STATUS BADGE
    // ========================================================

    const getStatusBadge =
        (
            leave
        ) => {
            // APPROVED AS LOP
            if (
                leave.status ===
                "APPROVED" &&
                (
                    leave.isLop ||
                    leave.paymentType ===
                    "UNPAID"
                )
            ) {
                return (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                        <DollarSign
                            size={
                                13
                            }
                        />

                        APPROVED
                        -
                        LOP
                    </span>
                );
            }

            // NORMAL APPROVED
            if (
                leave.status ===
                "APPROVED"
            ) {
                return (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2
                            size={
                                13
                            }
                        />

                        APPROVED
                    </span>
                );
            }

            // REJECTED
            if (
                leave.status ===
                "REJECTED"
            ) {
                return (
                    <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                        <XCircle
                            size={
                                13
                            }
                        />

                        REJECTED
                    </span>
                );
            }

            // PENDING
            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    <Clock
                        size={
                            13
                        }
                    />

                    PENDING
                </span>
            );
        };

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            {/* =================================================
                TABLE
            ================================================= */}

            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="px-6 py-4">
                                Employee
                            </th>

                            <th className="px-6 py-4">
                                Type
                            </th>

                            <th className="px-6 py-4">
                                Dates
                            </th>

                            <th className="px-6 py-4">
                                Total
                                Days
                            </th>

                            <th className="px-6 py-4">
                                Reason
                            </th>

                            <th className="px-6 py-4">
                                Status
                            </th>

                            {isAdmin && (
                                <th className="px-6 py-4 text-right">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {leaves.length ===
                            0 ? (
                            <tr>
                                <td
                                    colSpan={
                                        isAdmin
                                            ? 7
                                            : 6
                                    }
                                    className="px-6 py-12 text-center text-slate-400"
                                >
                                    No
                                    leave
                                    records
                                    found
                                </td>
                            </tr>
                        ) : (
                            leaves.map(
                                (
                                    leave
                                ) => {
                                    const totalDays =
                                        getLeaveDays(
                                            leave
                                        );

                                    const firstName =
                                        leave
                                            .employee
                                            ?.firstName ||
                                        leave
                                            .employeeId
                                            ?.firstName ||
                                        "";

                                    const lastName =
                                        leave
                                            .employee
                                            ?.lastName ||
                                        leave
                                            .employeeId
                                            ?.lastName ||
                                        "";

                                    return (
                                        <tr
                                            key={
                                                leave._id ||
                                                leave.id
                                            }
                                            className="transition hover:bg-slate-50/60"
                                        >
                                            {/* EMPLOYEE */}

                                            <td className="px-6 py-4 font-bold text-slate-900">
                                                <div className="flex items-center gap-2">
                                                    <User
                                                        size={
                                                            14
                                                        }
                                                        className="text-slate-400"
                                                    />

                                                    <span>
                                                        {firstName}{" "}
                                                        {lastName}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* TYPE */}

                                            <td className="px-6 py-4 text-slate-600">
                                                {getLeaveTypeLabel(
                                                    leave.type
                                                )}
                                            </td>

                                            {/* DATES */}

                                            <td className="px-6 py-4 text-slate-600">
                                                {formatDate(
                                                    leave.startDate
                                                )}

                                                {" - "}

                                                {formatDate(
                                                    leave.endDate
                                                )}
                                            </td>

                                            {/* DAYS */}

                                            <td className="px-6 py-4">
                                                <span className="font-bold text-slate-900">
                                                    {totalDays}{" "}
                                                    day
                                                    {totalDays !==
                                                        1
                                                        ? "s"
                                                        : ""}
                                                </span>
                                            </td>

                                            {/* REASON */}

                                            <td className="max-w-[200px] truncate px-6 py-4 text-slate-600">
                                                {
                                                    leave.reason
                                                }
                                            </td>

                                            {/* STATUS */}

                                            <td className="px-6 py-4">
                                                {getStatusBadge(
                                                    leave
                                                )}
                                            </td>

                                            {/* ADMIN ACTION */}

                                            {isAdmin && (
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openReviewModal(
                                                                leave
                                                            )
                                                        }
                                                        className="text-xs font-medium text-indigo-600 hover:underline"
                                                    >
                                                        {leave.status ===
                                                            "PENDING"
                                                            ? "Review"
                                                            : "Review / Edit"}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                }
                            )
                        )}
                    </tbody>
                </table>
            </div>

            {/* =================================================
                ADMIN REVIEW MODAL
            ================================================= */}

            {showApprovalModal &&
                selectedLeave && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
                        <div className="max-h-[90vh] w-full max-w-xl space-y-5 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                            {/* HEADER */}

                            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        Review
                                        Leave
                                        Request
                                    </h3>

                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Accept,
                                        reject,
                                        or
                                        accept
                                        the
                                        leave
                                        as
                                        Loss
                                        of
                                        Pay.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        closeReviewModal
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                    className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 disabled:opacity-50"
                                >
                                    <X
                                        size={
                                            18
                                        }
                                    />
                                </button>
                            </div>

                            {/* =================================================
                                LEAVE INFORMATION
                            ================================================= */}

                            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs">
                                {/* EMPLOYEE */}

                                <div className="flex justify-between gap-4">
                                    <span className="font-medium text-slate-500">
                                        Employee
                                    </span>

                                    <span className="text-right font-bold text-slate-900">
                                        {selectedLeave
                                            .employee
                                            ?.firstName ||
                                            selectedLeave
                                                .employeeId
                                                ?.firstName ||
                                            ""}

                                        {" "}

                                        {selectedLeave
                                            .employee
                                            ?.lastName ||
                                            selectedLeave
                                                .employeeId
                                                ?.lastName ||
                                            ""}
                                    </span>
                                </div>

                                {/* TYPE */}

                                <div className="flex justify-between gap-4">
                                    <span className="font-medium text-slate-500">
                                        Leave
                                        Type
                                    </span>

                                    <span className="text-right font-semibold text-slate-800">
                                        {getLeaveTypeLabel(
                                            selectedLeave.type
                                        )}
                                    </span>
                                </div>

                                {/* DURATION */}

                                <div className="flex justify-between gap-4">
                                    <span className="font-medium text-slate-500">
                                        Duration
                                    </span>

                                    <span className="font-bold text-slate-900">
                                        {getLeaveDays(
                                            selectedLeave
                                        )}{" "}
                                        day
                                        {getLeaveDays(
                                            selectedLeave
                                        ) !==
                                            1
                                            ? "s"
                                            : ""}
                                    </span>
                                </div>

                                {/* DATES */}

                                <div className="flex justify-between gap-4">
                                    <span className="font-medium text-slate-500">
                                        Dates
                                    </span>

                                    <span className="text-right font-semibold text-slate-800">
                                        {formatDate(
                                            selectedLeave.startDate
                                        )}

                                        {" - "}

                                        {formatDate(
                                            selectedLeave.endDate
                                        )}
                                    </span>
                                </div>

                                {/* HALF DAY */}

                                {selectedLeave.type ===
                                    "HALF_DAY" &&
                                    selectedLeave.halfDayPeriod && (
                                        <div className="flex justify-between gap-4">
                                            <span className="font-medium text-slate-500">
                                                Half
                                                Day
                                                Period
                                            </span>

                                            <span className="font-semibold text-slate-800">
                                                {selectedLeave.halfDayPeriod ===
                                                    "FIRST_HALF"
                                                    ? "First Half"
                                                    : "Second Half"}
                                            </span>
                                        </div>
                                    )}

                                {/* COMP OFF WORK DATE */}

                                {selectedLeave.type ===
                                    "COMPENSATORY" &&
                                    selectedLeave.workedDate && (
                                        <div className="flex justify-between gap-4">
                                            <span className="font-medium text-slate-500">
                                                Worked
                                                Extra
                                                On
                                            </span>

                                            <span className="font-semibold text-slate-800">
                                                {formatDate(
                                                    selectedLeave.workedDate
                                                )}
                                            </span>
                                        </div>
                                    )}

                                {/* CURRENT PAYMENT DECISION */}

                                {selectedLeave.status ===
                                    "APPROVED" && (
                                        <div className="flex justify-between gap-4">
                                            <span className="font-medium text-slate-500">
                                                Current
                                                Payment
                                                Status
                                            </span>

                                            <span
                                                className={
                                                    selectedLeave.isLop ||
                                                        selectedLeave.paymentType ===
                                                        "UNPAID"
                                                        ? "font-bold text-red-600"
                                                        : "font-bold text-emerald-700"
                                                }
                                            >
                                                {selectedLeave.isLop ||
                                                    selectedLeave.paymentType ===
                                                    "UNPAID"
                                                    ? "Loss of Pay"
                                                    : "Paid Leave"}
                                            </span>
                                        </div>
                                    )}

                                {/* REASON */}

                                {/* REASON */}

                                <div className="flex justify-between gap-4">
                                    <span className="font-medium text-slate-500">
                                        Reason
                                    </span>

                                    <span className="max-w-[65%] text-right font-semibold text-slate-800 whitespace-pre-wrap">
                                        {selectedLeave.reason || "—"}
                                    </span>
                                </div>
                            </div>

                            {/* =================================================
                                ADMIN REMARK
                            ================================================= */}

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Admin
                                    Remark

                                    <span className="font-normal text-slate-400">
                                        {" "}
                                        (Optional)
                                    </span>
                                </label>

                                <textarea
                                    value={
                                        adminRemark
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setAdminRemark(
                                            e
                                                .target
                                                .value
                                        )
                                    }
                                    rows={
                                        3
                                    }
                                    placeholder="Add a note for the employee..."
                                    className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>

                            {/* =================================================
                                ADMIN ACTIONS

                                EXACTLY THREE:
                                1. ACCEPT
                                2. ACCEPT AS LOP
                                3. REJECT
                            ================================================= */}

                            <div className="space-y-3 border-t border-slate-100 pt-4">
                                {/* ACCEPT - LIGHT GREEN */}
                                <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() =>
                                        handleUpdateStatus(
                                            selectedLeave._id || selectedLeave.id,
                                            "APPROVED",
                                            false
                                        )
                                    }
                                    className="flex w-full items-center justify-center rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-3.5 text-sm font-extrabold uppercase tracking-wide text-emerald-800 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {actionLoading
                                        ? "PROCESSING..."
                                        : "ACCEPT"}
                                </button>


                                {/* ACCEPT AS LOSS OF PAY - LIGHT BEIGE / AMBER */}
                                <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() =>
                                        handleUpdateStatus(
                                            selectedLeave._id || selectedLeave.id,
                                            "APPROVED",
                                            true
                                        )
                                    }
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-100 px-4 py-3.5 text-sm font-extrabold uppercase tracking-wide text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <DollarSign size={18} />

                                    {actionLoading
                                        ? "PROCESSING..."
                                        : "ACCEPT AS LOSS OF PAY"}
                                </button>


                                {/* REJECT - LIGHT RED */}
                                <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() =>
                                        handleUpdateStatus(
                                            selectedLeave._id || selectedLeave.id,
                                            "REJECTED",
                                            false
                                        )
                                    }
                                    className="flex w-full items-center justify-center rounded-xl border border-red-300 bg-red-100 px-4 py-3.5 text-sm font-extrabold uppercase tracking-wide text-red-700 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {actionLoading
                                        ? "PROCESSING..."
                                        : "REJECT"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
};

export default LeaveHistory;