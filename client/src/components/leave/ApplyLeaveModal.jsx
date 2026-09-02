import React, { useState } from "react";
import {
    Loader2,
    X,
    FileText,
    CalendarDays,
    Send,
    ShieldAlert,
    Clock,
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const MONTHLY_PAID_LEAVE_LIMIT = 3;

const getLeaveDays = (leave) => {
    if (leave.type === "HALF_DAY") return 0.5;
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
};

// Helper: Get taken/approved/pending leave days for current employee in target month
const getTakenDaysInMonth = (leaves, referenceDate) => {
    const refMonth = referenceDate.getMonth();
    const refYear = referenceDate.getFullYear();

    return leaves
        .filter((leave) => leave.status === "APPROVED" || leave.status === "PENDING")
        .filter((leave) => leave.type !== "COMPENSATORY")
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
    const isCompensatory = leaveType === "COMPENSATORY";

    const submitLeave = async (data) => {
        setLoading(true);

        try {
            await api.post("/leave", data);
            toast.success("Leave application submitted successfully!");
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || err?.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        if (isHalfDay || isCompensatory) {
            data.endDate = data.startDate;
        }

        if (isCompensatory && !data.workedDate) {
            toast.error("Please select the date on which you worked extra");
            return;
        }

        const startDate = new Date(data.startDate);
        const takenDays = getTakenDaysInMonth(leaves, startDate);
        const requestedDays = isHalfDay ? 0.5 : (Math.round((new Date(data.endDate).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        // Check if employee already reached 3 days OR if this request pushes total over 3 days
        if (!isCompensatory && (takenDays >= MONTHLY_PAID_LEAVE_LIMIT || takenDays + requestedDays > MONTHLY_PAID_LEAVE_LIMIT)) {
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-xs"
            onClick={onClose}
        >
            <div
                className="relative bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg animate-fade-in"
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
                            <option value="MENSTRUAL">Wellness Leave</option>
                            <option value="HALF_DAY">Half Day Leave</option>
                            <option value="COMPENSATORY">Compensation Leave (Comp Off)</option>
                        </select>
                    </div>

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

                    {isCompensatory && (
                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
                                <Clock className="w-4 h-4 text-indigo-600" />
                                Date Worked Extra (Weekend / Holiday)
                            </div>
                            <input
                                type="date"
                                name="workedDate"
                                required
                                max={new Date().toISOString().split("T")[0]}
                                className="w-full text-sm bg-white"
                            />
                            <p className="text-[11px] text-indigo-600">
                                Select the Sunday, weekend, or holiday date you worked extra.
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                            <CalendarDays className="w-4 h-4 text-slate-400" />
                            {isHalfDay || isCompensatory ? "Requested Leave Date" : "Duration"}
                        </label>

                        {isHalfDay || isCompensatory ? (
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

                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                            Reason / Emergency Situation Details
                        </label>

                        <textarea
                            name="reason"
                            required
                            rows={3}
                            className="resize-none"
                            placeholder={
                                isCompensatory
                                    ? "Explain why you worked on the weekend/holiday..."
                                    : "Describe your leave reason or emergency situation..."
                            }
                        ></textarea>
                    </div>

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

            {/* Monthly leave limit warning modal with Emergency & LOP Notice */}
            {showLimitWarning && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/20"
                    onClick={() => setShowLimitWarning(false)}
                >
                    <div
                        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-amber-50 shrink-0 text-amber-600">
                                <ShieldAlert className="w-6 h-6" />
                            </div>

                            <div>
                                <h3 className="text-base font-semibold text-slate-900">
                                    Monthly Paid Leave Limit Reached (3 Days)
                                </h3>
                                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                                    You have already taken <strong>{alreadyTakenDays}</strong> day(s) of leave this month.
                                </p>
                                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 leading-relaxed">
                                    <strong>Loss of Pay (LOP) Notice:</strong> Submitting this 4th / extra leave will be counted as <strong>Loss of Pay (LOP)</strong> unless it is reviewed and approved by Admin as a <strong>Paid Emergency</strong>.
                                </div>
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
                                {loading ? "Submitting..." : "Submit for Emergency Review"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApplyLeaveModal;