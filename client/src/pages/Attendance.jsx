import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    PencilLine,
    ShieldAlert,
    X,
} from "lucide-react";

import CheckInButton from "../components/attendance/CheckInButton";

import AttendanceStats from "../components/attendance/AttendanceStats";

import AttendanceHistory from "../components/attendance/AttendanceHistory";

import api from "../api/axios";

import toast from "react-hot-toast";

import Loading from "../components/Loading";

const Attendance = () => {
    const [
        history,
        setHistory,
    ] = useState(
        []
    );

    const [
        loading,
        setLoading,
    ] = useState(
        true
    );

    const [
        isDeleted,
        setIsDeleted,
    ] = useState(
        false
    );

    // ============================================================
    // CORRECTION USAGE
    // ============================================================

    const [
        correctionUsage,
        setCorrectionUsage,
    ] = useState(
        {
            used:
                0,

            limit:
                2,

            remaining:
                2,
        }
    );

    // ============================================================
    // CORRECTION MODAL
    // ============================================================

    const [
        showCorrectionModal,
        setShowCorrectionModal,
    ] = useState(
        false
    );

    const [
        correctionSubmitting,
        setCorrectionSubmitting,
    ] = useState(
        false
    );

    const [
        correctionForm,
        setCorrectionForm,
    ] = useState(
        {
            date:
                "",

            checkInTime:
                "",

            checkOutTime:
                "",

            reason:
                "",
        }
    );

    // ============================================================
    // FETCH ATTENDANCE
    // ============================================================

    const fetchData =
        useCallback(
            async () => {
                try {
                    const res =
                        await api.get(
                            "/attendance"
                        );

                    const json =
                        res.data;

                    setHistory(
                        json.data ||
                            []
                    );

                    setIsDeleted(
                        Boolean(
                            json.employee
                                ?.isDeleted
                        )
                    );

                    if (
                        json.correctionUsage
                    ) {
                        setCorrectionUsage(
                            json.correctionUsage
                        );
                    }

                } catch (
                    error
                ) {
                    toast.error(
                        error
                            ?.response
                            ?.data
                            ?.error ||
                            error
                                ?.message ||
                            "Failed to fetch attendance"
                    );

                } finally {
                    setLoading(
                        false
                    );
                }
            },
            []
        );

    useEffect(
        () => {
            fetchData();
        },
        [
            fetchData,
        ]
    );

    // ============================================================
    // YESTERDAY
    // Maximum selectable correction date.
    // ============================================================

    const maxCorrectionDate =
        useMemo(
            () => {
                const yesterday =
                    new Date();

                yesterday.setDate(
                    yesterday.getDate() -
                        1
                );

                return yesterday.toLocaleDateString(
                    "en-CA"
                );
            },
            []
        );

    // ============================================================
    // TODAY RECORD
    // ============================================================

    const todayRecord =
        useMemo(
            () => {
                const today =
                    new Date();

                today.setHours(
                    0,
                    0,
                    0,
                    0
                );

                return history.find(
                    (
                        record
                    ) =>
                        new Date(
                            record.date
                        ).toDateString() ===
                        today.toDateString()
                );
            },
            [
                history,
            ]
        );

    // ============================================================
    // FORM CHANGE
    // ============================================================

    const handleCorrectionChange =
        (
            event
        ) => {
            const {
                name,
                value,
            } =
                event.target;

            setCorrectionForm(
                (
                    previous
                ) => ({
                    ...previous,

                    [name]:
                        value,
                })
            );
        };

    // ============================================================
    // OPEN MODAL
    // ============================================================

    const openCorrectionModal =
        () => {
            if (
                isDeleted
            ) {
                toast.error(
                    "Your employee account is deactivated."
                );

                return;
            }

            if (
                correctionUsage.remaining <=
                0
            ) {
                toast.error(
                    "You have already used your 2 attendance corrections for this month. Please contact HR/Admin."
                );

                return;
            }

            setCorrectionForm(
                {
                    date:
                        "",

                    checkInTime:
                        "",

                    checkOutTime:
                        "",

                    reason:
                        "",
                }
            );

            setShowCorrectionModal(
                true
            );
        };

    // ============================================================
    // SUBMIT CORRECTION
    // ============================================================

    const submitCorrection =
        async (
            event
        ) => {
            event.preventDefault();

            if (
                !correctionForm.date ||
                !correctionForm.checkInTime ||
                !correctionForm.checkOutTime ||
                !correctionForm.reason.trim()
            ) {
                toast.error(
                    "Please fill all attendance correction fields."
                );

                return;
            }

            if (
                correctionForm.checkOutTime <=
                correctionForm.checkInTime
            ) {
                toast.error(
                    "Clock out time must be after clock in time."
                );

                return;
            }

            try {
                setCorrectionSubmitting(
                    true
                );

                const response =
                    await api.post(
                        "/attendance/correction",
                        {
                            date:
                                correctionForm.date,

                            checkInTime:
                                correctionForm.checkInTime,

                            checkOutTime:
                                correctionForm.checkOutTime,

                            reason:
                                correctionForm.reason.trim(),
                        }
                    );

                toast.success(
                    response.data
                        ?.message ||
                        "Attendance corrected successfully"
                );

                if (
                    response.data
                        ?.correctionUsage
                ) {
                    setCorrectionUsage(
                        response.data
                            .correctionUsage
                    );
                }

                setShowCorrectionModal(
                    false
                );

                setCorrectionForm(
                    {
                        date:
                            "",

                        checkInTime:
                            "",

                        checkOutTime:
                            "",

                        reason:
                            "",
                    }
                );

                await fetchData();

            } catch (
                error
            ) {
                toast.error(
                    error
                        ?.response
                        ?.data
                        ?.error ||
                        error
                            ?.message ||
                        "Failed to correct attendance"
                );

            } finally {
                setCorrectionSubmitting(
                    false
                );
            }
        };

    if (
        loading
    ) {
        return (
            <Loading />
        );
    }

    return (
        <div className="animate-fade-in">

            {/* =====================================================
                HEADER
            ===================================================== */}

            <div className="page-header">

                <h1 className="page-title">
                    Attendance
                </h1>

                <p className="page-subtitle">
                    Track your work hours
                    and daily check-ins
                </p>

            </div>

            {/* =====================================================
                DEACTIVATED WARNING / NORMAL CLOCK IN
            ===================================================== */}

            {isDeleted ? (

                <div className="mb-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">

                    <p className="text-rose-600">
                        You can no longer
                        clock in or out
                        because your employee
                        records have been
                        marked as deleted.
                    </p>

                </div>

            ) : (

                <div className="mb-8">

                    <CheckInButton
                        todayRecord={
                            todayRecord
                        }
                        onAction={
                            fetchData
                        }
                    />

                </div>

            )}

            {/* =====================================================
                EXISTING ATTENDANCE STATS
            ===================================================== */}

            <AttendanceStats
                history={
                    history
                }
            />

            {/* =====================================================
                EMPLOYEE ATTENDANCE CORRECTION
            ===================================================== */}

            <div className="mb-8 mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">

                    <div className="flex items-start gap-4">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

                            <PencilLine
                                size={
                                    20
                                }
                            />

                        </div>

                        <div>

                            <div className="flex flex-wrap items-center gap-2">

                                <h3 className="font-semibold text-slate-900">
                                    Missed Attendance Correction
                                </h3>

                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">

                                    {
                                        correctionUsage.used
                                    }{" "}
                                    /{" "}
                                    {
                                        correctionUsage.limit
                                    }{" "}
                                    Used

                                </span>

                            </div>

                            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
                                Forgot to mark
                                attendance on a
                                previous date? You
                                can correct missed
                                attendance up to{" "}
                                <strong className="font-semibold text-slate-700">
                                    2 times per month
                                </strong>.
                            </p>

                            <div className="mt-3 flex flex-wrap gap-4 text-xs">

                                <div className="flex items-center gap-1.5 text-slate-500">

                                    <CalendarDays
                                        size={
                                            14
                                        }
                                    />

                                    Past dates only

                                </div>

                                <div className="flex items-center gap-1.5 text-slate-500">

                                    <Clock3
                                        size={
                                            14
                                        }
                                    />

                                    {
                                        correctionUsage.remaining
                                    }{" "}
                                    correction
                                    {correctionUsage.remaining !==
                                    1
                                        ? "s"
                                        : ""}{" "}
                                    remaining

                                </div>

                            </div>

                        </div>

                    </div>

                    <button
                        type="button"
                        onClick={
                            openCorrectionModal
                        }
                        disabled={
                            isDeleted ||
                            correctionUsage.remaining <=
                                0
                        }
                        className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                            correctionUsage.remaining >
                                0 &&
                            !isDeleted
                                ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                                : "cursor-not-allowed bg-slate-100 text-slate-400"
                        }`}
                    >

                        {correctionUsage.remaining >
                        0
                            ? "Correct Missed Attendance"
                            : "Monthly Limit Reached"}

                    </button>

                </div>

                {/* LIMIT PROGRESS */}

                <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">

                    <div className="flex items-center justify-between text-xs">

                        <span className="font-medium text-slate-500">
                            Monthly correction
                            usage
                        </span>

                        <span className="font-semibold text-slate-700">

                            {
                                correctionUsage.used
                            }{" "}
                            of{" "}
                            {
                                correctionUsage.limit
                            }

                        </span>

                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">

                        <div
                            className="h-full rounded-full bg-indigo-500 transition-all"
                            style={{
                                width:
                                    `${Math.min(
                                        (correctionUsage.used /
                                            correctionUsage.limit) *
                                            100,
                                        100
                                    )}%`,
                            }}
                        />

                    </div>

                </div>

            </div>

            {/* =====================================================
                HISTORY
            ===================================================== */}

            <AttendanceHistory
                history={
                    history
                }
            />

            {/* =====================================================
                CORRECTION MODAL
            ===================================================== */}

            {showCorrectionModal && (

                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">

                    <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">

                        {/* HEADER */}

                        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">

                            <div>

                                <h2 className="text-lg font-bold text-slate-900">
                                    Correct Missed Attendance
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    Enter your actual
                                    clock-in and
                                    clock-out details
                                    for a missed date.
                                </p>

                            </div>

                            <button
                                type="button"
                                disabled={
                                    correctionSubmitting
                                }
                                onClick={() =>
                                    setShowCorrectionModal(
                                        false
                                    )
                                }
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                            >

                                <X
                                    size={
                                        18
                                    }
                                />

                            </button>

                        </div>

                        {/* LIMIT INFORMATION */}

                        <div className="mx-6 mt-5 flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4">

                            <ShieldAlert
                                size={
                                    18
                                }
                                className="mt-0.5 shrink-0 text-indigo-600"
                            />

                            <div className="text-xs leading-relaxed text-indigo-900">

                                <p className="font-semibold">
                                    Monthly correction
                                    allowance
                                </p>

                                <p className="mt-1 text-indigo-700">
                                    You have used{" "}
                                    <strong>
                                        {
                                            correctionUsage.used
                                        }
                                    </strong>{" "}
                                    of{" "}
                                    <strong>
                                        {
                                            correctionUsage.limit
                                        }
                                    </strong>{" "}
                                    corrections this
                                    month. After the
                                    limit is reached,
                                    further changes
                                    must be handled by
                                    HR/Admin.
                                </p>

                            </div>

                        </div>

                        {/* FORM */}

                        <form
                            onSubmit={
                                submitCorrection
                            }
                            className="space-y-5 p-6"
                        >

                            {/* DATE */}

                            <div>

                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Attendance Date
                                </label>

                                <input
                                    type="date"
                                    name="date"
                                    value={
                                        correctionForm.date
                                    }
                                    max={
                                        maxCorrectionDate
                                    }
                                    onChange={
                                        handleCorrectionChange
                                    }
                                    required
                                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />

                                <p className="mt-1 text-[11px] text-slate-400">
                                    Only previous
                                    dates can be
                                    selected.
                                </p>

                            </div>

                            {/* TIMES */}

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                                <div>

                                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                        Clock In
                                    </label>

                                    <input
                                        type="time"
                                        name="checkInTime"
                                        value={
                                            correctionForm.checkInTime
                                        }
                                        onChange={
                                            handleCorrectionChange
                                        }
                                        required
                                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    />

                                </div>

                                <div>

                                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                        Clock Out
                                    </label>

                                    <input
                                        type="time"
                                        name="checkOutTime"
                                        value={
                                            correctionForm.checkOutTime
                                        }
                                        onChange={
                                            handleCorrectionChange
                                        }
                                        required
                                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    />

                                </div>

                            </div>

                            {/* REASON */}

                            <div>

                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Reason
                                </label>

                                <textarea
                                    name="reason"
                                    value={
                                        correctionForm.reason
                                    }
                                    onChange={
                                        handleCorrectionChange
                                    }
                                    required
                                    maxLength={
                                        300
                                    }
                                    rows={
                                        3
                                    }
                                    placeholder="Example: Forgot to mark attendance yesterday"
                                    className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />

                                <p className="mt-1 text-right text-[10px] text-slate-400">
                                    {
                                        correctionForm.reason.length
                                    }
                                    /300
                                </p>

                            </div>

                            {/* IMPORTANT NOTE */}

                            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">

                                <strong>
                                    Note:
                                </strong>{" "}

                                Completed normal
                                attendance records
                                cannot be edited by
                                employees. An
                                auto-checkout or
                                genuinely missed
                                attendance record can
                                be corrected using
                                this feature.

                            </div>

                            {/* BUTTONS */}

                            <div className="flex gap-3 border-t border-slate-100 pt-4">

                                <button
                                    type="button"
                                    disabled={
                                        correctionSubmitting
                                    }
                                    onClick={() =>
                                        setShowCorrectionModal(
                                            false
                                        )
                                    }
                                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        correctionSubmitting
                                    }
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >

                                    {correctionSubmitting ? (

                                        <>
                                            <Clock3
                                                size={
                                                    16
                                                }
                                                className="animate-spin"
                                            />

                                            Saving...
                                        </>

                                    ) : (

                                        <>
                                            <CheckCircle2
                                                size={
                                                    16
                                                }
                                            />

                                            Save Correction
                                        </>

                                    )}

                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </div>
    );
};

export default Attendance;