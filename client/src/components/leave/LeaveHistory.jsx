import React, { useState } from "react";
import {
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    ShieldCheck,
    DollarSign,
    X,
    User,
} from "lucide-react";

import api from "../../api/axios";
import toast from "react-hot-toast";

const MONTHLY_PAID_LEAVE_LIMIT = 3;

// ============================================================
// HELPERS
// ============================================================

const getLeaveDays = (leave) => {
    // Half-day must count as 0.5 leave.
    // Two half-day leaves = 1 full leave day.
    if (leave.type === "HALF_DAY") {
        return 0.5;
    }

    const start =
        new Date(leave.startDate);

    const end =
        new Date(leave.endDate);

    const diffDays =
        Math.round(
            (end.getTime() -
                start.getTime()) /
                (1000 * 60 * 60 * 24)
        ) + 1;

    return diffDays;
};

const getLeaveTypeLabel = (type) => {
    const labels = {
        SICK: "Sick Leave",
        CASUAL: "Casual Leave",
        ANNUAL: "Annual Leave",

        // Keep database value MENSTRUAL.
        // Only change what user sees.
        MENSTRUAL: "Wellness Leave",

        HALF_DAY: "Half Day",
        COMPENSATORY: "Compensatory Leave",
    };

    return labels[type] || type || "—";
};

const formatDate = (dateString) => {
    if (!dateString) {
        return "—";
    }

    try {
        const d =
            new Date(dateString);

        return d.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
            }
        );
    } catch {
        return "—";
    }
};

const getEmployeeId = (leave) => {
    return (
        leave.employeeId?._id ||
        leave.employeeId ||
        leave.employee?._id ||
        leave.employee?.id
    );
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
    ] = useState(null);

    const [
        showApprovalModal,
        setShowApprovalModal,
    ] = useState(false);

    const [
        actionLoading,
        setActionLoading,
    ] = useState(false);

    const [
        adminRemark,
        setAdminRemark,
    ] = useState("");

    // ========================================================
    // MONTHLY PAID LEAVE USAGE
    // ========================================================

    const getMonthlyPaidUsage = (
        leave
    ) => {
        if (!leave?.startDate) {
            return 0;
        }

        const employeeId =
            getEmployeeId(leave);

        const selectedDate =
            new Date(
                leave.startDate
            );

        const month =
            selectedDate.getMonth();

        const year =
            selectedDate.getFullYear();

        return leaves
            .filter((otherLeave) => {
                // Do not count current leave itself.
                if (
                    String(
                        otherLeave._id ||
                            otherLeave.id
                    ) ===
                    String(
                        leave._id ||
                            leave.id
                    )
                ) {
                    return false;
                }

                const otherEmployeeId =
                    getEmployeeId(
                        otherLeave
                    );

                // Only count leaves belonging
                // to this specific employee.
                if (
                    employeeId &&
                    otherEmployeeId &&
                    String(
                        employeeId
                    ) !==
                        String(
                            otherEmployeeId
                        )
                ) {
                    return false;
                }

                // Only approved leave consumes quota.
                if (
                    otherLeave.status !==
                    "APPROVED"
                ) {
                    return false;
                }

                // Emergency paid leave does not
                // consume normal 3-day quota.
                if (
                    otherLeave.isEmergencyOverride
                ) {
                    return false;
                }

                // LOP does not consume paid quota.
                if (
                    otherLeave.isLop ||
                    otherLeave.paymentType ===
                        "UNPAID"
                ) {
                    return false;
                }

                // Comp-off does not consume
                // normal paid quota.
                if (
                    otherLeave.type ===
                    "COMPENSATORY"
                ) {
                    return false;
                }

                if (
                    !otherLeave.startDate
                ) {
                    return false;
                }

                const date =
                    new Date(
                        otherLeave.startDate
                    );

                return (
                    date.getMonth() ===
                        month &&
                    date.getFullYear() ===
                        year
                );
            })
            .reduce(
                (sum, current) =>
                    sum +
                    getLeaveDays(
                        current
                    ),
                0
            );
    };

    // ========================================================
    // DOES REQUEST EXCEED 3-DAY PAID QUOTA?
    // ========================================================

    const checkIsExceedingQuota = (
        leave
    ) => {
        if (!leave) {
            return false;
        }

        // Compensatory leave should not
        // affect paid leave quota.
        if (
            leave.type ===
            "COMPENSATORY"
        ) {
            return false;
        }

        const alreadyUsed =
            getMonthlyPaidUsage(
                leave
            );

        const requested =
            getLeaveDays(leave);

        return (
            alreadyUsed +
                requested >
            MONTHLY_PAID_LEAVE_LIMIT
        );
    };

    // ========================================================
    // OPEN REVIEW MODAL
    // ========================================================

    const openReviewModal = (
        leave
    ) => {
        setSelectedLeave(leave);

        setAdminRemark(
            leave.adminRemark || ""
        );

        setShowApprovalModal(
            true
        );
    };

    const closeReviewModal = () => {
        if (actionLoading) {
            return;
        }

        setShowApprovalModal(
            false
        );

        setSelectedLeave(
            null
        );

        setAdminRemark("");
    };

    // ========================================================
    // UPDATE STATUS
    // ========================================================

    const handleUpdateStatus =
        async (
            leaveId,
            status,
            extraPayload = {}
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

                        ...extraPayload,
                    }
                );

                if (
                    status ===
                    "REJECTED"
                ) {
                    toast.success(
                        "Leave application rejected"
                    );
                } else if (
                    extraPayload.isEmergencyOverride
                ) {
                    toast.success(
                        "Leave approved as Special Emergency Case!"
                    );
                } else if (
                    extraPayload.isLop
                ) {
                    toast.success(
                        "Leave approved as Loss of Pay (LOP)!"
                    );
                } else {
                    toast.success(
                        "Leave approved successfully!"
                    );
                }

                setShowApprovalModal(
                    false
                );

                setSelectedLeave(
                    null
                );

                setAdminRemark("");

                if (onUpdate) {
                    await onUpdate();
                }
            } catch (error) {
                console.error(
                    "Update Leave Status Error:",
                    error
                );

                toast.error(
                    error.response?.data
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

    const getStatusBadge = (
        leave
    ) => {
        if (
            leave.status ===
            "APPROVED"
        ) {
            if (
                leave.isEmergencyOverride
            ) {
                return (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                        <ShieldCheck
                            size={13}
                        />

                        APPROVED
                        (Paid Emergency)
                    </span>
                );
            }

            if (
                leave.isLop ||
                leave.paymentType ===
                    "UNPAID"
            ) {
                return (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                        <DollarSign
                            size={13}
                        />

                        APPROVED
                        (LOP / Loss of Pay)
                    </span>
                );
            }

            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2
                        size={13}
                    />

                    APPROVED
                </span>
            );
        }

        if (
            leave.status ===
            "REJECTED"
        ) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                    <XCircle
                        size={13}
                    />

                    REJECTED
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                <Clock size={13} />

                PENDING
            </span>
        );
    };

    // ========================================================
    // UI
    // ========================================================

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">

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
                                Total Days
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
                                    No leave
                                    records found
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

                                    const exceeding =
                                        checkIsExceedingQuota(
                                            leave
                                        );

                                    return (

                                        <tr
                                            key={
                                                leave._id ||
                                                leave.id
                                            }
                                            className="transition hover:bg-slate-50/60"
                                        >

                                            <td className="px-6 py-4 font-bold text-slate-900">

                                                <div className="flex items-center gap-2">

                                                    <User
                                                        size={
                                                            14
                                                        }
                                                        className="text-slate-400"
                                                    />

                                                    <span>
                                                        {leave
                                                            .employee
                                                            ?.firstName ||
                                                            ""}
                                                        {" "}
                                                        {leave
                                                            .employee
                                                            ?.lastName ||
                                                            ""}
                                                    </span>

                                                </div>

                                            </td>

                                            <td className="px-6 py-4 text-slate-600">

                                                <span>
                                                    {getLeaveTypeLabel(
                                                        leave.type
                                                    )}
                                                </span>

                                            </td>

                                            <td className="px-6 py-4 text-slate-600">

                                                {formatDate(
                                                    leave.startDate
                                                )}

                                                {" - "}

                                                {formatDate(
                                                    leave.endDate
                                                )}

                                            </td>

                                            <td className="px-6 py-4">

                                                <span
                                                    className={`font-bold ${
                                                        exceeding
                                                            ? "text-amber-700"
                                                            : "text-slate-900"
                                                    }`}
                                                >
                                                    {
                                                        totalDays
                                                    }{" "}
                                                    day
                                                    {totalDays !==
                                                    1
                                                        ? "s"
                                                        : ""}
                                                </span>

                                            </td>

                                            <td className="max-w-[200px] truncate px-6 py-4 text-slate-600">
                                                {
                                                    leave.reason
                                                }
                                            </td>

                                            <td className="px-6 py-4">
                                                {getStatusBadge(
                                                    leave
                                                )}
                                            </td>

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

            {/* =====================================================
                ADMIN REVIEW MODAL
            ===================================================== */}

            {showApprovalModal &&
                selectedLeave &&
                (() => {

                    const usedPaid =
                        getMonthlyPaidUsage(
                            selectedLeave
                        );

                    const requested =
                        getLeaveDays(
                            selectedLeave
                        );

                    const totalAfterApproval =
                        usedPaid +
                        requested;

                    const exceedsQuota =
                        checkIsExceedingQuota(
                            selectedLeave
                        );

                    const isCompensatory =
                        selectedLeave.type ===
                        "COMPENSATORY";

                    /*
                        LOP is enabled ONLY when
                        employee crosses 3 paid days.

                        Example:

                        Used 2 + Request 1 = 3
                        LOP disabled.

                        Used 2.5 + Request 0.5 = 3
                        LOP disabled.

                        Used 3 + Request 0.5 = 3.5
                        LOP enabled.
                    */

                    const canApproveAsLop =
                        exceedsQuota &&
                        !isCompensatory;

                    /*
                        Normal paid approval is allowed
                        only while within quota.

                        Compensatory leave is separate
                        from this quota.
                    */

                    const canNormalApprove =
                        !exceedsQuota ||
                        isCompensatory;

                    return (

                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">

                            <div className="max-h-[90vh] w-full max-w-xl space-y-5 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">

                                {/* HEADER */}

                                <div className="flex items-start justify-between border-b border-slate-100 pb-3">

                                    <div>

                                        <h3 className="text-base font-bold text-slate-900">
                                            Review Leave
                                            Request
                                        </h3>

                                        <p className="mt-0.5 text-xs text-slate-500">
                                            Review the
                                            employee's leave
                                            request and select
                                            the appropriate
                                            approval action.
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

                                {/* LEAVE INFORMATION */}

                                <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs">

                                    <div className="flex justify-between gap-4">

                                        <span className="font-medium text-slate-500">
                                            Employee
                                        </span>

                                        <span className="text-right font-bold text-slate-900">

                                            {selectedLeave
                                                .employee
                                                ?.firstName ||
                                                ""}

                                            {" "}

                                            {selectedLeave
                                                .employee
                                                ?.lastName ||
                                                ""}

                                        </span>

                                    </div>

                                    <div className="flex justify-between gap-4">

                                        <span className="font-medium text-slate-500">
                                            Leave Type
                                        </span>

                                        <span className="text-right font-semibold text-slate-800">

                                            {getLeaveTypeLabel(
                                                selectedLeave.type
                                            )}

                                        </span>

                                    </div>

                                    <div className="flex justify-between gap-4">

                                        <span className="font-medium text-slate-500">
                                            Duration
                                        </span>

                                        <span className="font-bold text-amber-700">
                                            {
                                                requested
                                            }{" "}
                                            Day
                                            {requested !==
                                            1
                                                ? "s"
                                                : ""}
                                        </span>

                                    </div>

                                    <div className="flex justify-between gap-4">

                                        <span className="font-medium text-slate-500">
                                            Paid Used This Month
                                        </span>

                                        <span className="font-bold text-indigo-600">
                                            {
                                                usedPaid
                                            }{" "}
                                            /{" "}
                                            {
                                                MONTHLY_PAID_LEAVE_LIMIT
                                            }
                                        </span>

                                    </div>

                                    <div className="flex justify-between gap-4">

                                        <span className="font-medium text-slate-500">
                                            Paid Usage If Normally Approved
                                        </span>

                                        <span
                                            className={`font-bold ${
                                                exceedsQuota
                                                    ? "text-red-600"
                                                    : "text-emerald-600"
                                            }`}
                                        >
                                            {
                                                totalAfterApproval
                                            }{" "}
                                            /{" "}
                                            {
                                                MONTHLY_PAID_LEAVE_LIMIT
                                            }
                                        </span>

                                    </div>

                                    {selectedLeave.type ===
                                        "HALF_DAY" &&
                                        selectedLeave.halfDayPeriod && (

                                            <div className="flex justify-between gap-4">

                                                <span className="font-medium text-slate-500">
                                                    Half Day Period
                                                </span>

                                                <span className="font-semibold text-slate-800">
                                                    {selectedLeave.halfDayPeriod ===
                                                    "FIRST_HALF"
                                                        ? "First Half"
                                                        : "Second Half"}
                                                </span>

                                            </div>

                                        )}

                                    {selectedLeave.type ===
                                        "COMPENSATORY" &&
                                        selectedLeave.workedDate && (

                                            <div className="flex justify-between gap-4">

                                                <span className="font-medium text-slate-500">
                                                    Extra Worked Date
                                                </span>

                                                <span className="font-semibold text-slate-800">
                                                    {formatDate(
                                                        selectedLeave.workedDate
                                                    )}
                                                </span>

                                            </div>

                                        )}

                                    <div className="border-t border-slate-200 pt-3">

                                        <span className="font-medium text-slate-500">
                                            Reason
                                        </span>

                                        <p className="mt-1 leading-relaxed text-slate-800">
                                            {
                                                selectedLeave.reason
                                            }
                                        </p>

                                    </div>

                                </div>

                                {/* QUOTA INFORMATION */}

                                {exceedsQuota ? (

                                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">

                                        <AlertTriangle
                                            size={
                                                18
                                            }
                                            className="mt-0.5 shrink-0 text-amber-600"
                                        />

                                        <div>

                                            <strong className="font-semibold text-amber-950">
                                                Monthly Paid Leave Limit Exceeded
                                            </strong>

                                            <p className="mt-1 leading-relaxed text-amber-800">

                                                This employee
                                                has already used{" "}

                                                <strong>
                                                    {
                                                        usedPaid
                                                    }
                                                </strong>{" "}

                                                paid leave
                                                day(s) this month.

                                                {" "}This request
                                                adds{" "}

                                                <strong>
                                                    {
                                                        requested
                                                    }
                                                </strong>{" "}

                                                day(s), resulting
                                                in{" "}

                                                <strong>
                                                    {
                                                        totalAfterApproval
                                                    }
                                                </strong>{" "}

                                                paid days.

                                                {" "}Normal paid
                                                approval would
                                                exceed the{" "}

                                                <strong>
                                                    3-day monthly quota.
                                                </strong>

                                                {" "}Please choose
                                                Special Emergency
                                                or Loss of Pay.

                                            </p>

                                        </div>

                                    </div>

                                ) : (

                                    !isCompensatory && (

                                        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900">

                                            <CheckCircle2
                                                size={
                                                    18
                                                }
                                                className="mt-0.5 shrink-0 text-emerald-600"
                                            />

                                            <div>

                                                <strong className="font-semibold text-emerald-950">
                                                    Within Monthly Paid Leave Limit
                                                </strong>

                                                <p className="mt-1 leading-relaxed text-emerald-800">
                                                    This request
                                                    can be approved
                                                    normally as paid
                                                    leave. LOP is not
                                                    applicable because
                                                    the employee has
                                                    not exceeded the
                                                    3-day monthly paid
                                                    leave quota.
                                                </p>

                                            </div>

                                        </div>

                                    )

                                )}

                                {/* ADMIN REMARK */}

                                <div>

                                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                        Admin Remark
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
                                                e.target
                                                    .value
                                            )
                                        }
                                        rows={3}
                                        placeholder="Add a note for the employee..."
                                        className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    />

                                </div>

                                {/* =================================================
                                    FOUR ADMIN ACTIONS
                                ================================================= */}

                                <div className="space-y-2.5 border-t border-slate-100 pt-4">

                                    {/* 1. SPECIAL EMERGENCY */}

                                    <button
                                        type="button"
                                        disabled={
                                            actionLoading
                                        }
                                        onClick={() =>
                                            handleUpdateStatus(
                                                selectedLeave._id ||
                                                    selectedLeave.id,
                                                "APPROVED",
                                                {
                                                    isEmergencyOverride:
                                                        true,

                                                    isLop:
                                                        false,
                                                }
                                            )
                                        }
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >

                                        <ShieldCheck
                                            size={
                                                16
                                            }
                                        />

                                        Approve as Special
                                        Emergency Case
                                        (Paid)

                                    </button>

                                    {/* 2. LOSS OF PAY */}

                                    <button
                                        type="button"
                                        disabled={
                                            actionLoading ||
                                            !canApproveAsLop
                                        }
                                        onClick={() =>
                                            handleUpdateStatus(
                                                selectedLeave._id ||
                                                    selectedLeave.id,
                                                "APPROVED",
                                                {
                                                    isEmergencyOverride:
                                                        false,

                                                    isLop:
                                                        true,
                                                }
                                            )
                                        }
                                        className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold transition ${
                                            canApproveAsLop
                                                ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                                                : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                        }`}
                                    >

                                        <DollarSign
                                            size={
                                                16
                                            }
                                        />

                                        {canApproveAsLop
                                            ? "Approve as Loss of Pay (LOP)"
                                            : "Loss of Pay (Available Only After Paid Quota Is Exceeded)"}

                                    </button>

                                    {/* 3. NORMAL PAID APPROVAL */}

                                    <button
                                        type="button"
                                        disabled={
                                            actionLoading ||
                                            !canNormalApprove
                                        }
                                        onClick={() =>
                                            handleUpdateStatus(
                                                selectedLeave._id ||
                                                    selectedLeave.id,
                                                "APPROVED",
                                                {
                                                    isEmergencyOverride:
                                                        false,

                                                    isLop:
                                                        false,
                                                }
                                            )
                                        }
                                        className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold transition ${
                                            canNormalApprove
                                                ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                                : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                        }`}
                                    >

                                        <CheckCircle2
                                            size={
                                                16
                                            }
                                        />

                                        {canNormalApprove
                                            ? "Approve Normally (Paid)"
                                            : "Normal Paid Approval Unavailable — Quota Exceeded"}

                                    </button>

                                    {/* 4. REJECT */}

                                    <button
                                        type="button"
                                        disabled={
                                            actionLoading
                                        }
                                        onClick={() =>
                                            handleUpdateStatus(
                                                selectedLeave._id ||
                                                    selectedLeave.id,
                                                "REJECTED",
                                                {
                                                    isEmergencyOverride:
                                                        false,

                                                    isLop:
                                                        false,
                                                }
                                            )
                                        }
                                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >

                                        <XCircle
                                            size={
                                                16
                                            }
                                        />

                                        Reject Application

                                    </button>

                                </div>

                            </div>

                        </div>

                    );

                })()}

        </div>
    );
};

export default LeaveHistory;