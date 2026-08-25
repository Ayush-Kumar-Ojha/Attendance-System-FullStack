import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    UsersIcon,
    CalendarIcon,
    Building2Icon,
    FileTextIcon,
    ClockIcon,
    LogOutIcon,
    UserXIcon,
    X,
    Search,
    ChevronRight,
    UserCheck,
} from "lucide-react";
import { useDepartments } from "../hooks/useDepartments";
import api from "../api/axios";

const AttendanceDonut = ({ percent }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    return (
        <div className="relative w-28 h-28 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#4f46e5" strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-lg font-bold bg-indigo-600 rounded-full w-14 h-14 flex items-center justify-center shadow-md">
                    {percent}%
                </span>
            </div>
        </div>
    );
};

const AdminDashboard = ({ data }) => {
    const navigate = useNavigate();
    const { departments } = useDepartments();
    const [activeModal, setActiveModal] = useState(null); // "lateCheckIns" | "earlyCheckOuts" | "notCheckedIn" | null

    // Quick Employee Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [employees, setEmployees] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await api.get("/employees");
                const list = Array.isArray(res.data) ? res.data : res.data?.employees || [];
                setEmployees(list.filter((e) => !e.isDeleted));
            } catch (err) {
                console.error("Failed to load employees for search", err);
            }
        };
        fetchEmployees();
    }, []);

    // Filter employees by search term
    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const term = searchTerm.toLowerCase();
        return employees.filter((emp) => {
            const name = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
            const code = (emp.employeeCode || "").toLowerCase();
            const dept = (emp.department || "").toLowerCase();
            return name.includes(term) || code.includes(term) || dept.includes(term);
        });
    }, [searchTerm, employees]);

    // Close search dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setIsSearching(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelectEmployee = (empId) => {
        setSearchTerm("");
        setIsSearching(false);
        navigate(`/employees/${empId}`);
    };

    const stats = [
        { icon: UsersIcon, value: data.totalEmployees, label: "Total Employees", description: "Active workforce" },
        { icon: Building2Icon, value: departments.length, label: "Departments", description: "Organization units" },
        { icon: CalendarIcon, value: data.todayAttendance, label: "Today's Attendance", description: "Checked in today" },
        { icon: FileTextIcon, value: data.pendingLeaves, label: "Pending Leaves", description: "Awaiting approval" },
    ];

    const todayStats = [
        { key: "lateCheckIns", icon: ClockIcon, value: data.lateCheckIns ?? 0, names: data.lateCheckInEmployees, label: "Late Check-ins", description: "Checked in late today", color: "amber" },
        { key: "earlyCheckOuts", icon: LogOutIcon, value: data.earlyCheckOuts ?? 0, names: data.earlyCheckOutEmployees, label: "Early Check-outs", description: "Left before full hours", color: "rose" },
        { key: "notCheckedIn", icon: UserXIcon, value: data.notCheckedInYet ?? 0, names: data.notCheckedInEmployees, label: "Not Checked In Yet", description: "No activity today", color: "slate" },
    ];

    const colorMap = {
        amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
        rose: "bg-rose-50 text-rose-600 group-hover:bg-rose-100",
        slate: "bg-slate-100 text-slate-600 group-hover:bg-slate-200",
    };

    const activeStat = todayStats.find((s) => s.key === activeModal);

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header with Left-to-Right Title Slide Animation & Quick Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="page-header">
                    <h1 className="page-title animate-title-slide">
                        Dashboard
                    </h1>
                    <p className="page-subtitle">Welcome back, Admin - here's your overview</p>
                </div>

                {/* EMPLOYEE SEARCH BAR */}
                <div ref={searchRef} className="relative w-full sm:w-80">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            value={searchTerm}
                            onFocus={() => setIsSearching(true)}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setIsSearching(true);
                            }}
                            placeholder="Search employee by name..."
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-xs"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {isSearching && searchTerm.trim() && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-modal-in">
                            {searchResults.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400">
                                    No employee found matching "{searchTerm}"
                                </div>
                            ) : (
                                searchResults.map((emp) => {
                                    const empId = emp._id || emp.id;
                                    const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();

                                    return (
                                        <div
                                            key={empId}
                                            onClick={() => handleSelectEmployee(empId)}
                                            className="flex items-center justify-between rounded-lg p-2.5 hover:bg-slate-50 transition cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700 text-xs">
                                                    {emp.firstName?.[0] || "E"}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">{name}</p>
                                                    <p className="text-xs text-slate-500">{emp.position || "Employee"} • {emp.department || "Dept"}</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-slate-400" />
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
                {stats.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className="card card-hover p-5 sm:p-6 relative overflow-hidden group flex items-center justify-between">
                            <div>
                                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-slate-500/70 group-hover:bg-indigo-500/70 transition-colors" />
                                <p className="text-sm font-medium text-slate-700">{s.label}</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
                                <p className="text-xs text-slate-500 mt-1">{s.description}</p>
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
                    const isClickable = s.value > 0;

                    return (
                        <div
                            key={s.key}
                            onClick={() => isClickable && setActiveModal(s.key)}
                            className={`card card-hover p-5 sm:p-6 relative overflow-hidden group flex items-center justify-between ${isClickable ? "cursor-pointer" : ""}`}
                        >
                            <div>
                                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-slate-500/70 group-hover:bg-indigo-500/70 transition-colors" />
                                <p className="text-sm font-medium text-slate-700">{s.label}</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
                                <p className="text-xs text-slate-500 mt-1">{isClickable ? "Click to view names" : s.description}</p>
                            </div>
                            <Icon className={`size-10 p-2.5 rounded-lg transition-colors duration-200 ${colorMap[s.color]}`} />
                        </div>
                    );
                })}
            </div>

            {activeStat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-modal-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 pb-0">
                            <h2 className="text-lg font-semibold text-slate-800">{activeStat.label}</h2>
                            <button onClick={() => setActiveModal(null)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            {(!activeStat.names || activeStat.names.length === 0) ? (
                                <p className="text-center text-slate-400 py-6">No one to show</p>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {activeStat.names.map((name, i) => (
                                        <li key={i} className="py-3 text-sm font-medium text-slate-900">{name}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;