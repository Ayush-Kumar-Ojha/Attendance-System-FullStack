import { AlertCircleIcon, CalendarIcon, ClockIcon } from 'lucide-react';

const AttendanceStats = ({ history }) => {
    const records = history || [];

    const totalPresent = records.filter(
        (h) => h.status === "PRESENT" || h.status === "LATE"
    ).length;

    const totalLate = records.filter(
        (h) => h.status === "LATE"
    ).length;

    // Only include days that actually have a computed workingHours value
    // (i.e. the employee has checked out) — ongoing/incomplete days are excluded.
    const completedRecords = records.filter(
        (h) => typeof h.workingHours === "number"
    );

    const avgWorkHours =
        completedRecords.length > 0
            ? (
                  completedRecords.reduce((sum, h) => sum + h.workingHours, 0) /
                  completedRecords.length
              ).toFixed(1)
            : "0";

    const stats = [
        { label: "Days Present", value: totalPresent, icon: CalendarIcon },
        { label: "Late Arrivals", value: totalLate, icon: AlertCircleIcon },
        { label: "Avg. Work Hrs", value: `${avgWorkHours} Hrs`, icon: ClockIcon },
    ];

    return (
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8'>
            {stats.map((s) => (
                <div
                    key={s.label}
                    className='card card-hover p-5 sm:p-6 flex items-center gap-4 relative overflow-hidden group'
                >
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-slate-500/70 group-hover:bg-indigo-500/70" />

                    <div className='p-3 bg-slate-100 rounded-lg group-hover:bg-indigo-50 transition-colors duration-200'>
                        <s.icon className="w-5 h-5 text-slate-600 group-hover:text-indigo-600 transition-colors duration-200" />
                    </div>

                    <div>
                        <p>{s.label}</p>
                        <p className="text-xl font-semibold text-slate-800">{s.value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AttendanceStats;