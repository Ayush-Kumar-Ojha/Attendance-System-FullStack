import {
    UsersIcon,
    CalendarIcon,
    Building2Icon,
    FileTextIcon,
    ClockIcon,
    LogOutIcon,
    UserXIcon,
} from "lucide-react";
import { useDepartments } from "../hooks/useDepartments";

const AttendanceDonut = ({ percent }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    return (
        <div className="relative w-28 h-28 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="10"
                />
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-lg font-bold bg-indigo-600 rounded-full w-14 h-14 flex items-center justify-center">
                    {percent}%
                </span>
            </div>
        </div>
    );
};

const AdminDashboard = ({ data }) => {
    const { departments } = useDepartments();

    const stats = [
        {
            icon: UsersIcon,
            value: data.totalEmployees,
            label: "Total Employees",
            description: "Active workforce",
        },
        {
            icon: Building2Icon,
            value: departments.length,
            label: "Departments",
            description: "Organization units",
        },
        {
            icon: CalendarIcon,
            value: data.todayAttendance,
            label: "Today's Attendance",
            description: "Checked in today",
        },
        {
            icon: FileTextIcon,
            value: data.pendingLeaves,
            label: "Pending Leaves",
            description: "Awaiting approval",
        },
    ];

    const todayStats = [
        {
            icon: ClockIcon,
            value: data.lateCheckIns ?? 0,
            label: "Late Check-ins",
            description: "Checked in late today",
            color: "amber",
        },
        {
            icon: LogOutIcon,
            value: data.earlyCheckOuts ?? 0,
            label: "Early Check-outs",
            description: "Left before full hours",
            color: "rose",
        },
        {
            icon: UserXIcon,
            value: data.notCheckedInYet ?? 0,
            label: "Not Checked In Yet",
            description: "No activity today",
            color: "slate",
        },
    ];

    const colorMap = {
        amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
        rose: "bg-rose-50 text-rose-600 group-hover:bg-rose-100",
        slate: "bg-slate-100 text-slate-600 group-hover:bg-slate-200",
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>

                <p className="page-subtitle">
                    Welcome back, Admin - here's your overview
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
                {stats.map((s) => {
                    const Icon = s.icon;

                    return (
                        <div
                            key={s.label}
                            className="card card-hover p-5 sm:p-6 relative overflow-hidden group flex items-center justify-between"
                        >
                            <div>
                                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-slate-500/70 group-hover:bg-indigo-500/70" />

                                <p className="text-sm font-medium text-slate-700">
                                    {s.label}
                                </p>

                                <p className="text-2xl font-bold text-slate-900 mt-1">
                                    {s.value}
                                </p>

                                <p className="text-xs text-slate-500 mt-1">
                                    {s.description}
                                </p>
                            </div>

                            <Icon className="size-10 p-2.5 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors duration-200" />
                        </div>
                    );
                })}
            </div>

            <h2 className="text-sm font-semibold text-slate-700 mb-3">Today's Snapshot</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                <div className="card card-hover p-5 sm:p-6 flex items-center gap-5 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-indigo-500/70" />
                    <AttendanceDonut percent={data.attendancePercent ?? 0} />
                    <div>
                        <p className="text-sm font-medium text-slate-700">Attendance %</p>
                        <p className="text-xs text-slate-500 mt-1">of active employees today</p>
                    </div>
                </div>

                {todayStats.map((s) => {
                    const Icon = s.icon;

                    return (
                        <div
                            key={s.label}
                            className="card card-hover p-5 sm:p-6 relative overflow-hidden group flex items-center justify-between"
                        >
                            <div>
                                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-slate-500/70 group-hover:bg-indigo-500/70" />

                                <p className="text-sm font-medium text-slate-700">
                                    {s.label}
                                </p>

                                <p className="text-2xl font-bold text-slate-900 mt-1">
                                    {s.value}
                                </p>

                                <p className="text-xs text-slate-500 mt-1">
                                    {s.description}
                                </p>
                            </div>

                            <Icon className={`size-10 p-2.5 rounded-lg transition-colors duration-200 ${colorMap[s.color]}`} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminDashboard;