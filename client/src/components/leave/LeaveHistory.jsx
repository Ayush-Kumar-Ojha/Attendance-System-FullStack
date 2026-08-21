import { Check, Loader2, X } from 'lucide-react'
import React, { useState } from 'react'
import { format, differenceInCalendarDays } from "date-fns"
import api from '../../api/axios'
import toast from 'react-hot-toast'

const LeaveHistory = ({ leaves, isAdmin, onUpdate }) => {
    const [processing, setProcessing] = useState(null)

    const handleStatusUpdate = async (id, status) => {
        setProcessing(id)
        try {
            await api.patch(`/leave/${id}`, { status })
            onUpdate();
        } catch (error) {
            toast.error(error?.response?.data?.error || error?.message)
        } finally {
            setProcessing(null)
        }
    }

    const getTotalDays = (leave) => {
        if (leave.type === "HALF_DAY") return 0.5;
        const days = differenceInCalendarDays(new Date(leave.endDate), new Date(leave.startDate)) + 1;
        return days;
    };

    const leaveTypeLabels = {
        SICK: "Sick",
        CASUAL: "Casual",
        ANNUAL: "Annual",
        MENSTRUAL: "Menstrual",
        HALF_DAY: "Half Day",
    };

    const halfPeriodLabels = {
        FIRST_HALF: "1st Half",
        SECOND_HALF: "2nd Half",
    };

    return (
        <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100"></div>
            <div className="overflow-x-auto">
                <table className="table-modern">
                    <thead>
                        <tr>
                            {isAdmin && <th>Employee</th>}
                            <th>Type</th>
                            <th>Dates</th>
                            <th>Total Days</th>
                            <th>Reason</th>
                            <th>Status</th>
                            {isAdmin && <th className='text-center'>Actions</th>}
                        </tr>
                    </thead>

                    <tbody>
                        {leaves.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={isAdmin ? 7 : 5}
                                    className="text-center py-12 text-slate-400"
                                >
                                    No leave applications found
                                </td>
                            </tr>
                        ) : (
                            leaves.map((leave) => {
                                const totalDays = getTotalDays(leave);
                                return (
                                    <tr key={leave._id || leave.id}>
                                        {isAdmin && (
                                            <td className="text-slate-900">
                                                {leave.employee?.firstName}{" "}
                                                {leave.employee?.lastName}
                                            </td>
                                        )}

                                        <td>
                                            <span className='inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium'>
                                                {leaveTypeLabels[leave.type] || leave.type}
                                                {leave.type === "HALF_DAY" && leave.halfDayPeriod && (
                                                    <span className="ml-1 text-slate-400">
                                                        ({halfPeriodLabels[leave.halfDayPeriod]})
                                                    </span>
                                                )}
                                            </span>
                                        </td>

                                        <td className="text-xs text-slate-500">
                                            {leave.type === "HALF_DAY"
                                                ? format(new Date(leave.startDate), "MMM dd")
                                                : `${format(new Date(leave.startDate), "MMM dd")}-${format(new Date(leave.endDate), "MMM dd")}`}
                                        </td>

                                        <td className="text-sm text-slate-600">
                                            {totalDays}{" "}
                                            <span className="text-xs text-slate-400">
                                                {totalDays === 1 ? "day" : "days"}
                                            </span>
                                        </td>

                                        <td className="max-w-xs truncate text-slate-500" title={leave.reason}>
                                            {leave.reason}
                                        </td>

                                        <td>
                                            <span
                                                className={`badge ${leave.status === "APPROVED"
                                                        ? "badge-success"
                                                        : leave.status === "REJECTED"
                                                            ? "badge-danger"
                                                            : "badge-warning"
                                                    }`}
                                            >
                                                {leave.status}
                                            </span>
                                        </td>

                                        {isAdmin && (
                                            <td>
                                                {leave.status === "PENDING" && (
                                                    <div className='flex justify-center gap-2'>
                                                        <button
                                                            onClick={() => handleStatusUpdate(leave._id || leave.id, "APPROVED")}
                                                            disabled={!!processing}
                                                            className='p-1.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors'
                                                        >
                                                            {processing === (leave._id || leave.id) ? (
                                                                <Loader2 className='w-4 h-4 animate-spin' />
                                                            ) : (
                                                                <Check className='w-4 h-4' />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(leave._id || leave.id, "REJECTED")}
                                                            disabled={!!processing}
                                                            className="p-1.5 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                                                        >
                                                            {processing === (leave._id || leave.id) ? (
                                                                <Loader2 className='w-4 h-4 animate-spin' />
                                                            ) : (
                                                                <X className='w-4 h-4' />
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default LeaveHistory;