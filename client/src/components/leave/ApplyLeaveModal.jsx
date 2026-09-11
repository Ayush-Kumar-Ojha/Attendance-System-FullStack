import React, {
    useState,
} from "react";

import {
    Loader2,
    X,
    FileText,
    CalendarDays,
    Send,
    Clock,
} from "lucide-react";

import api from "../../api/axios";
import toast from "react-hot-toast";

const MONTHLY_PAID_LEAVE_LIMIT =
    3;

// ============================================================
// HELPERS
// ============================================================

const getLeaveDays = (
    leave
) => {
    if (
        leave?.type ===
        "HALF_DAY"
    ) {
        return 0.5;
    }

    const start =
        new Date(
            leave?.startDate
        );

    const end =
        new Date(
            leave?.endDate ||
            leave?.startDate
        );

    if (
        Number.isNaN(
            start.getTime()
        ) ||
        Number.isNaN(
            end.getTime()
        )
    ) {
        return 0;
    }

    return (
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
        ) + 1
    );
};

// ============================================================
// CALCULATE POSSIBLE PAID DAYS
//
// Used only for warning.
//
// Includes:
// - already approved paid leaves
// - pending leave requests
//
// Excludes:
// - rejected
// - approved LOP
// - compensatory leave
// ============================================================

const getPotentialPaidDaysForMonth =
    (
        leaves,
        startDate
    ) => {
        const requestDate =
            new Date(
                startDate
            );

        if (
            Number.isNaN(
                requestDate.getTime()
            )
        ) {
            return 0;
        }

        return leaves
            .filter(
                (
                    leave
                ) => {
                    if (
                        !leave?.startDate
                    ) {
                        return false;
                    }

                    const leaveDate =
                        new Date(
                            leave.startDate
                        );

                    const sameMonth =
                        leaveDate.getMonth() ===
                        requestDate.getMonth() &&
                        leaveDate.getFullYear() ===
                        requestDate.getFullYear();

                    if (!sameMonth) {
                        return false;
                    }

                    if (
                        leave.type ===
                        "COMPENSATORY"
                    ) {
                        return false;
                    }

                    if (
                        leave.status ===
                        "REJECTED"
                    ) {
                        return false;
                    }

                    if (
                        leave.status ===
                        "PENDING"
                    ) {
                        return true;
                    }

                    return (
                        leave.status ===
                        "APPROVED" &&
                        !leave.isLop &&
                        leave.paymentType !==
                        "UNPAID"
                    );
                }
            )
            .reduce(
                (
                    total,
                    leave
                ) =>
                    total +
                    getLeaveDays(
                        leave
                    ),
                0
            );
    };

// ============================================================
// COMPONENT
// ============================================================

const ApplyLeaveModal = ({
    open,
    onClose,
    onSuccess,
    leaves = [],
    employeeGender = "",
}) => {
    const [
        loading,
        setLoading,
    ] =
        useState(false);

    const [
        leaveType,
        setLeaveType,
    ] =
        useState("SICK");

    const today =
        new Date();

    const tomorrow =
        new Date(today);

    tomorrow.setDate(
        today.getDate() + 1
    );

    const minDate =
        tomorrow
            .toISOString()
            .split("T")[0];

    const isHalfDay =
        leaveType ===
        "HALF_DAY";

    const isCompensatory =
        leaveType ===
        "COMPENSATORY";

    const isFemaleEmployee =
        String(
            employeeGender ||
            ""
        )
            .trim()
            .toUpperCase() ===
        "FEMALE";

    // ========================================================
    // SUBMIT LEAVE
    // ========================================================

    const submitLeave =
        async (
            data
        ) => {
            setLoading(true);

            try {
                await api.post(
                    "/leave",
                    data
                );

                toast.success(
                    "Leave application submitted successfully!"
                );

                if (
                    onSuccess
                ) {
                    await onSuccess();
                }

                onClose();
            } catch (
            err
            ) {
                toast.error(
                    err.response
                        ?.data
                        ?.error ||
                    err?.message ||
                    "Failed to submit leave application"
                );
            } finally {
                setLoading(
                    false
                );
            }
        };

    // ========================================================
    // HANDLE FORM
    // ========================================================

    const handleSubmit =
        async (
            e
        ) => {
            e.preventDefault();

            const formData =
                new FormData(
                    e.currentTarget
                );

            const data =
                Object.fromEntries(
                    formData.entries()
                );

            // WELLNESS LEAVE - FEMALE EMPLOYEES ONLY
            if (
                data.type ===
                "MENSTRUAL" &&
                !isFemaleEmployee
            ) {
                toast.error(
                    "Wellness Leave is available only to female employees."
                );

                setLeaveType(
                    "SICK"
                );

                return;
            }

            // Half Day and Comp Off
            // are always single-day leave requests.
            if (
                isHalfDay ||
                isCompensatory
            ) {
                data.endDate =
                    data.startDate;
            }

            // =================================================
            // END DATE VALIDATION
            // =================================================

            if (
                data.startDate &&
                data.endDate &&
                new Date(
                    data.endDate
                ) <
                new Date(
                    data.startDate
                )
            ) {
                toast.error(
                    "End date cannot be before start date"
                );

                return;
            }

            // =================================================
            // COMPENSATORY VALIDATION
            // =================================================

            if (
                isCompensatory &&
                !data.workedDate
            ) {
                toast.error(
                    "Please select the date on which you worked extra"
                );

                return;
            }

            // =================================================
            // 3-DAY MONTHLY PAID LEAVE REMINDER
            //
            // IMPORTANT:
            // This DOES NOT stop the employee from applying.
            // It only warns them.
            //
            // Admin still decides:
            // Accept / LOP / Reject.
            // =================================================

            if (
                !isCompensatory &&
                data.startDate
            ) {
                const existingPotentialPaidDays =
                    getPotentialPaidDaysForMonth(
                        leaves,
                        data.startDate
                    );

                const requestedDays =
                    getLeaveDays({
                        type:
                            data.type,

                        startDate:
                            data.startDate,

                        endDate:
                            data.endDate,
                    });

                const potentialTotal =
                    existingPotentialPaidDays +
                    requestedDays;

                if (
                    potentialTotal >
                    MONTHLY_PAID_LEAVE_LIMIT
                ) {
                    toast(
                        `Reminder: this request may take you above your ${MONTHLY_PAID_LEAVE_LIMIT}-day paid leave allowance for this month. You can still submit the request. The admin will decide whether the leave is accepted as paid leave or Loss of Pay.`,
                        {
                            icon:
                                "⚠️",

                            duration:
                                7000,
                        }
                    );
                }
            }

            await submitLeave(
                data
            );
        };

    if (!open) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-xs"
            onClick={
                onClose
            }
        >
            <div
                className="relative bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg animate-fade-in"
                onClick={(
                    e
                ) =>
                    e.stopPropagation()
                }
            >
                {/* HEADER */}

                <div className="flex items-center justify-between p-6 pb-0">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">
                            Apply
                            for
                            Leave
                        </h2>

                        <p className="text-sm text-slate-400 mt-0.5">
                            Submit
                            your
                            leave
                            request
                            for
                            approval
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        disabled={
                            loading
                        }
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form
                    onSubmit={
                        handleSubmit
                    }
                    className="p-6 space-y-5"
                >
                    {/* LEAVE TYPE */}

                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                            <FileText className="w-4 h-4 text-slate-400" />

                            Leave
                            Type
                        </label>

                        <select
                            name="type"
                            required
                            value={
                                leaveType
                            }
                            onChange={(
                                e
                            ) =>
                                setLeaveType(
                                    e
                                        .target
                                        .value
                                )
                            }
                        >

                            {!isFemaleEmployee && (
                                <p className="mt-2 text-xs text-rose-500">
                                    Wellness Leave is available only to female employees.
                                </p>
                            )}
                            <option value="SICK">
                                Sick
                                Leave
                            </option>

                            <option value="CASUAL">
                                Casual
                                Leave
                            </option>

                            <option value="ANNUAL">
                                Annual
                                Leave
                            </option>

                            <option
                                value="MENSTRUAL"
                                disabled={
                                    !isFemaleEmployee
                                }
                            >
                                Wellness Leave
                                {!isFemaleEmployee
                                    ? " (Female employees only)"
                                    : ""}
                            </option>

                            <option value="HALF_DAY">
                                Half
                                Day
                                Leave
                            </option>

                            <option value="COMPENSATORY">
                                Compensation
                                Leave
                                (Comp
                                Off)
                            </option>
                        </select>
                    </div>

                    {/* HALF DAY */}

                    {isHalfDay && (
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">
                                Which
                                Half?
                            </label>

                            <select
                                name="halfDayPeriod"
                                required
                            >
                                <option value="FIRST_HALF">
                                    First
                                    Half
                                </option>

                                <option value="SECOND_HALF">
                                    Second
                                    Half
                                </option>
                            </select>
                        </div>
                    )}

                    {/* COMPENSATORY */}

                    {isCompensatory && (
                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
                                <Clock className="w-4 h-4 text-indigo-600" />

                                Date
                                Worked
                                Extra
                                (Weekend
                                /
                                Holiday)
                            </div>

                            <input
                                type="date"
                                name="workedDate"
                                required
                                max={new Date()
                                    .toISOString()
                                    .split(
                                        "T"
                                    )[0]}
                                className="w-full text-sm bg-white"
                            />

                            <p className="text-[11px] text-indigo-600">
                                Select
                                the
                                Sunday,
                                weekend,
                                or
                                holiday
                                date
                                you
                                worked
                                extra.
                            </p>
                        </div>
                    )}

                    {/* DURATION */}

                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                            <CalendarDays className="w-4 h-4 text-slate-400" />

                            {isHalfDay ||
                                isCompensatory
                                ? "Requested Leave Date"
                                : "Duration"}
                        </label>

                        {isHalfDay ||
                            isCompensatory ? (
                            <input
                                type="date"
                                name="startDate"
                                required
                                min={
                                    minDate
                                }
                            />
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="block text-xs text-slate-400 mb-1">
                                        From
                                    </span>

                                    <input
                                        type="date"
                                        name="startDate"
                                        required
                                        min={
                                            minDate
                                        }
                                    />
                                </div>

                                <div>
                                    <span className="block text-xs text-slate-400 mb-1">
                                        To
                                    </span>

                                    <input
                                        type="date"
                                        name="endDate"
                                        required
                                        min={
                                            minDate
                                        }
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* REASON */}

                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                            Reason
                            /
                            Situation
                            Details
                        </label>

                        <textarea
                            name="reason"
                            required
                            rows={
                                3
                            }
                            className="resize-none"
                            placeholder={
                                isCompensatory
                                    ? "Explain why you worked on the weekend/holiday..."
                                    : "Describe your leave reason..."
                            }
                        />
                    </div>

                    {/* POLICY */}

                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs leading-relaxed text-indigo-700">
                        Employees
                        have
                        a
                        monthly
                        paid
                        leave
                        allowance
                        of{" "}
                        <strong>
                            {
                                MONTHLY_PAID_LEAVE_LIMIT
                            }{" "}
                            days
                        </strong>
                        .

                        {" "}

                        If
                        your
                        request
                        exceeds
                        the
                        monthly
                        allowance,
                        you
                        can
                        still
                        submit
                        it.
                        The
                        admin
                        will
                        decide
                        whether
                        it
                        is
                        accepted
                        normally
                        or
                        accepted
                        as
                        Loss
                        of
                        Pay.

                        {" "}

                        Half-day
                        leave
                        counts
                        as
                        0.5
                        day.
                    </div>

                    {/* BUTTONS */}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={
                                onClose
                            }
                            type="button"
                            disabled={
                                loading
                            }
                            className="btn-secondary flex-1 disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            disabled={
                                loading
                            }
                            type="submit"
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}

                            {loading
                                ? "Submitting..."
                                : "Submit"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ApplyLeaveModal;