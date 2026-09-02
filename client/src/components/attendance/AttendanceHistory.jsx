import {
    getDayTypeDisplay,
    getWorkingHoursDisplay,
} from "../../assets/assets";

import {
    format,
} from "date-fns";

import {
    Bot,
} from "lucide-react";

const AttendanceHistory = ({
    history,
}) => {
    return (
        <div className="card overflow-hidden">

            <div className="border-b border-slate-100 px-6 py-4">
                <h3 className="font-semibold text-slate-900">
                    Recent Activity
                </h3>
            </div>

            <div className="overflow-x-auto">

                <table className="table-modern">

                    <thead>
                        <tr>
                            <th className="px-6 py-4">
                                Date
                            </th>

                            <th className="px-6 py-4">
                                Check In
                            </th>

                            <th className="px-6 py-4">
                                Check Out
                            </th>

                            <th className="px-6 py-4">
                                Working Hours
                            </th>

                            <th className="px-6 py-4">
                                Day Type
                            </th>

                            <th className="px-6 py-4">
                                Status
                            </th>
                        </tr>
                    </thead>

                    <tbody>

                        {!history ||
                        history.length ===
                            0 ? (

                            <tr>
                                <td
                                    colSpan={6}
                                    className="py-12 text-center text-slate-400"
                                >
                                    No records found
                                </td>
                            </tr>

                        ) : (

                            history.map(
                                (
                                    record
                                ) => {
                                    const originalDayType =
                                        getDayTypeDisplay(
                                            record
                                        );

                                    let dayType =
                                        originalDayType;

                                    // =================================================
                                    // ONGOING SHIFT
                                    // =================================================

                                    if (
                                        record.checkIn &&
                                        !record.checkOut
                                    ) {
                                        dayType = {
                                            label:
                                                "In Progress",

                                            className:
                                                "badge-info",
                                        };
                                    }

                                    // =================================================
                                    // WEEKEND COMPLETED SHIFT
                                    // =================================================

                                    else if (
                                        record.isWeekendOrHoliday &&
                                        record.checkIn &&
                                        record.checkOut
                                    ) {
                                        dayType = {
                                            label:
                                                "Weekend Work",

                                            className:
                                                "badge-warning",
                                        };
                                    }

                                    // =================================================
                                    // OLD THREE QUARTER DAY RECORDS
                                    // DISPLAY AS SHORT DAY
                                    // =================================================

                                    else if (
                                        originalDayType?.label ===
                                        "Three Quarter Day"
                                    ) {
                                        dayType = {
                                            label:
                                                "Short Day",

                                            className:
                                                originalDayType.className,
                                        };
                                    }

                                    const isCorrection =
                                        record.source ===
                                        "EMPLOYEE_CORRECTION";

                                    const isAutoCheckout =
                                        record.autoCheckedOut ||
                                        record.source ===
                                            "AUTO_CHECKOUT";

                                    return (

                                        <tr
                                            key={
                                                record.id ||
                                                record._id ||
                                                record.date
                                            }
                                        >

                                            <td className="px-6 py-4 font-medium text-slate-900">

                                                <div className="flex flex-col gap-1">

                                                    <span>
                                                        {format(
                                                            new Date(
                                                                record.date
                                                            ),
                                                            "MMM dd, yyyy"
                                                        )}
                                                    </span>

                                                    {isCorrection && (

                                                        <span
                                                            className="w-fit text-xs font-normal not-italic text-slate-500"
                                                            title={
                                                                record.correctionReason ||
                                                                "Attendance corrected by employee"
                                                            }
                                                        >
                                                            (Corrected)
                                                        </span>

                                                    )}

                                                    {isAutoCheckout && (

                                                        <span className="inline-flex w-fit items-center gap-1 text-[10px] font-semibold text-amber-600">

                                                            <Bot
                                                                size={11}
                                                            />

                                                            Auto checkout

                                                        </span>

                                                    )}

                                                </div>

                                            </td>

                                            <td className="px-6 py-4 text-slate-600">

                                                {record.checkIn
                                                    ? format(
                                                          new Date(
                                                              record.checkIn
                                                          ),
                                                          "hh:mm a"
                                                      )
                                                    : "-"}

                                            </td>

                                            <td className="px-6 py-4 text-slate-600">

                                                {record.checkOut
                                                    ? format(
                                                          new Date(
                                                              record.checkOut
                                                          ),
                                                          "hh:mm a"
                                                      )
                                                    : "-"}

                                            </td>

                                            <td className="px-6 py-4 font-medium text-slate-600">

                                                {getWorkingHoursDisplay(
                                                    record
                                                )}

                                            </td>

                                            <td className="px-6 py-4">

                                                {dayType?.label &&
                                                dayType.label !==
                                                    "-" ? (

                                                    <span
                                                        className={`badge ${dayType.className}`}
                                                    >
                                                        {
                                                            dayType.label
                                                        }
                                                    </span>

                                                ) : (

                                                    "-"

                                                )}

                                            </td>

                                            <td className="px-6 py-4">

                                                <div className="flex flex-col items-start gap-1.5">

                                                    <span
                                                        className={`badge ${
                                                            record.status ===
                                                            "PRESENT"
                                                                ? "badge-success"

                                                                : record.status ===
                                                                  "LATE"
                                                                ? "badge-warning"

                                                                : "badge-danger"
                                                        }`}
                                                    >
                                                        {
                                                            record.status
                                                        }
                                                    </span>

                                                    {isCorrection &&
                                                        record.correctionReason && (

                                                            <span
                                                                className="max-w-[180px] truncate text-[10px] text-slate-400"
                                                                title={
                                                                    record.correctionReason
                                                                }
                                                            >
                                                                {
                                                                    record.correctionReason
                                                                }
                                                            </span>

                                                        )}

                                                </div>

                                            </td>

                                        </tr>

                                    );
                                }
                            )

                        )}

                    </tbody>

                </table>

            </div>

        </div>
    );
};

export default AttendanceHistory;