import React, { useState } from "react";
import {
    Loader2,
    X,
    FileText,
    CalendarDays,
    Send,
    AlertTriangle,
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const MONTHLY_PAID_LEAVE_LIMIT = 3; // matches server/controllers/leaveController.js

// Same day-count logic as the backend (HALF_DAY = 0.5, else inclusive day span)
const getLeaveDays = (leave) => {
    if (leave.type === "HALF_DAY") return 0.5;
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
};

// Sum of already-APPROVED leave days in the same month/year as `referenceDate`
const getApprovedDaysInMonth = (leaves, referenceDate) => {
    const refMonth = referenceDate.getMonth();
    const refYear = referenceDate.getFullYear();

    return leaves
        .filter((leave) => leave.status === "APPROVED")
        .filter((leave) => {
            const d = new Date(leave.startDate);
            return d.getMonth() === refMonth && d.getFullYear() === refYear;
        })
        .reduce((sum, leave) => sum + getLeaveDays(leave), 0);
};

const ApplyLeaveModal = ({ open, onClose, onSuccess, leaves = [] }) => {
    const [loading, setLoading] = useState(false);
    const [leaveType, setLeaveType] = useState("SICK");

    const [showLimitWarning, setShowLimitWarning] = useState(false);
    const [pendingData, setPendingData] = useState(null);
    const [alreadyTakenDays, setAlreadyTakenDays] = useState(0);

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const minDate = tomorrow.toISOString().split("T")[0];

    const isHalfDay = leaveType === "HALF_DAY";

    const submitLeave = async (data) => {
        setLoading(true);

        try {
            await api.post('/leave', data)
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || err?.message)
        }
        finally { setLoading(false) }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget)
        const data = Object.fromEntries(formData.entries())

        // For half day, force start and end date to be the same
        if (isHalfDay) {
            data.endDate = data.startDate;
        }

        const startDate = new Date(data.startDate);
        const takenDays = getApprovedDaysInMonth(leaves, startDate);

        if (takenDays >= MONTHLY_PAID_LEAVE_LIMIT) {
            setAlreadyTakenDays(takenDays);
            setPendingData(data);
            setShowLimitWarning(true);
            return;
        }

        await submitLeave(data);
    };

    const confirmProceedAnyway = () => {
        setShowLimitWarning(false);
        if (pendingData) submitLeave(pendingData);
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 pb-0">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">
                            Apply for Leave
                        </h2>

                        <p className="text-sm text-slate-400 mt-0.5">
                            Submit your leave request for approval
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            Leave Type
                        </label>

                        <select
                            name="type"
                            required
                            value={leaveType}
                            onChange={(e) => setLeaveType(e.target.value)}
                        >
                            <option value="SICK">Sick Leave</option>
                            <option value="CASUAL">Casual Leave</option>
                            <option value="ANNUAL">Annual Leave</option>
                            <option value="MENSTRUAL">Menstrual Leave</option>
                            <option value="HALF_DAY">Half Day Leave</option>
                        </select>
                    </div>

                    {/* Half Day sub-selection */}
                    {isHalfDay && (
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">
                                Which Half?
                            </label>
                            <select name="halfDayPeriod" required>
                                <option value="FIRST_HALF">First Half</option>
                                <option value="SECOND_HALF">Second Half</option>
                            </select>
                        </div>
                    )}

                    {/* Duration */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                            <CalendarDays className="w-4 h-4 text-slate-400" />
                            {isHalfDay ? "Date" : "Duration"}
                        </label>

                        {isHalfDay ? (
                            <input
                                type="date"
                                name="startDate"
                                required
                                min={minDate}
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
                                        min={minDate}
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
                                        min={minDate}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                            Reason
                        </label>

                        <textarea
                            name="reason"
                            required
                            rows={3}
                            className="resize-none"
                            placeholder="Briefly describe why you need this leave..."
                        ></textarea>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            type="button"
                            className="btn-secondary flex-1"
                        >
                            Cancel
                        </button>

                        <button
                            disabled={loading}
                            type="submit"
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}

                            {loading ? "Submitting..." : "Submit"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Monthly leave limit reminder */}
            {showLimitWarning && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
                    onClick={() => setShowLimitWarning(false)}
                >
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 rounded-full bg-amber-50 shrink-0">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                            </div>

                            <div>
                                <h3 className="text-base font-semibold text-slate-900">
                                    Monthly leave limit reached
                                </h3>

                                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                                    You've already taken <strong>{alreadyTakenDays}</strong> approved leave day
                                    {alreadyTakenDays === 1 ? "" : "s"} this month, which covers your paid leave allowance.
                                    Any leave beyond {MONTHLY_PAID_LEAVE_LIMIT} days in a month is treated as{" "}
                                    <strong>unpaid leave</strong>. Do you still want to submit this request?
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowLimitWarning(false)}
                                type="button"
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={confirmProceedAnyway}
                                disabled={loading}
                                type="button"
                                className="btn-primary flex-1 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {loading ? "Submitting..." : "Proceed Anyway"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApplyLeaveModal;