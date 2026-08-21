import { useCallback, useEffect, useMemo, useState } from "react";
import {
    BarChart3,
    Users,
    CalendarCheck,
    CalendarX,
    TrendingUp,
    Download,
    Clock3,
    Building2,
    CalendarDays,
    AlertTriangle,
    LogOut,
    Timer,
    ChevronRight,
    RefreshCw,
    FileText,
} from "lucide-react";
import api from "../api/axios";
import toast from "react-hot-toast";
import Loading from "../components/Loading";

const REPORT_TYPES = [
    {
        id: "monthly",
        label: "Monthly",
        icon: CalendarDays,
        description: "Monthly attendance summary",
    },
    {
        id: "employee",
        label: "Employee",
        icon: Users,
        description: "Individual employee report",
    },
    {
        id: "weekly",
        label: "Weekly",
        icon: CalendarCheck,
        description: "Week-wise attendance",
    },
    {
        id: "daily",
        label: "Daily",
        icon: Clock3,
        description: "Daily attendance",
    },
    {
        id: "department",
        label: "Department",
        icon: Building2,
        description: "Department comparison",
    },
    {
        id: "yearly",
        label: "Yearly",
        icon: BarChart3,
        description: "Year-wise attendance",
    },
    {
        id: "trend",
        label: "Attendance Trend",
        icon: TrendingUp,
        description: "Monthly attendance trend",
    },
    {
        id: "late",
        label: "Late Arrivals",
        icon: AlertTriangle,
        description: "Late arrival analysis",
    },
    {
        id: "early",
        label: "Early Exits",
        icon: LogOut,
        description: "Early exit analysis",
    },
    {
        id: "hours",
        label: "Working Hours",
        icon: Timer,
        description: "Working hours and overtime",
    },
];

const MONTHS = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: new Date(2000, index).toLocaleString("default", {
        month: "long",
    }),
}));

const STATUS_LABELS = {
    PRESENT: "Present",
    ABSENT: "Absent",
    HALF_DAY: "Half Day",
    LEAVE: "Leave",
    WEEK_OFF: "Week Off",
};

const formatDate = (date) => {
    if (!date) return "—";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) return "—";

    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatTime = (date) => {
    if (!date) return "—";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) return "—";

    return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatHours = (hours) => {
    if (hours === null || hours === undefined || hours === "") {
        return "—";
    }

    return `${Number(hours).toFixed(1)} hrs`;
};

const getMonthName = (month) => {
    return MONTHS.find((m) => m.value === Number(month))?.label || "—";
};

const getInitials = (name = "") => {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
};

const statusBadge = (status) => {
    const config = {
        PRESENT: "bg-emerald-50 text-emerald-700 border-emerald-100",
        ABSENT: "bg-rose-50 text-rose-700 border-rose-100",
        HALF_DAY: "bg-amber-50 text-amber-700 border-amber-100",
        LEAVE: "bg-blue-50 text-blue-700 border-blue-100",
        WEEK_OFF: "bg-slate-100 text-slate-600 border-slate-200",
        "—": "bg-slate-50 text-slate-500 border-slate-100",
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                config[status] ||
                "bg-slate-50 text-slate-600 border-slate-100"
            }`}
        >
            {STATUS_LABELS[status] || status || "—"}
        </span>
    );
};

const percentageBar = (value) => {
    const numericValue = Math.min(
        100,
        Math.max(0, Number(value) || 0)
    );

    return (
        <div className="flex items-center gap-3 min-w-[130px]">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${numericValue}%` }}
                />
            </div>

            <span className="text-sm font-medium text-slate-700 w-12 text-right">
                {numericValue}%
            </span>
        </div>
    );
};

const Reports = () => {
    const currentDate = new Date();

    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);

    const [reportType, setReportType] = useState("monthly");

    const [filterEmployeeId, setFilterEmployeeId] = useState("");
    const [filterDepartment, setFilterDepartment] = useState("");

    const [filterMonth, setFilterMonth] = useState(
        currentDate.getMonth() + 1
    );

    const [filterYear, setFilterYear] = useState(
        currentDate.getFullYear()
    );

    const [filterDate, setFilterDate] = useState(
        `${currentDate.getFullYear()}-${String(
            currentDate.getMonth() + 1
        ).padStart(2, "0")}-${String(currentDate.getDate()).padStart(
            2,
            "0"
        )}`
    );

    const [report, setReport] = useState(null);
    const [fetchingReport, setFetchingReport] = useState(false);

    /*
     * ============================================================
     * Load Employees
     * ============================================================
     */

    useEffect(() => {
        const loadEmployees = async () => {
            try {
                const res = await api.get("/employees");

                const data = Array.isArray(res.data)
                    ? res.data
                    : res.data?.employees || [];

                setEmployees(
                    data.filter((employee) => !employee.isDeleted)
                );
            } catch (error) {
                console.error("Load Employees Error:", error);
                toast.error("Failed to load employees");
            } finally {
                setLoading(false);
            }
        };

        loadEmployees();
    }, []);

    /*
     * ============================================================
     * Department list
     * ============================================================
     */

    const departments = useMemo(() => {
        return [
            ...new Set(
                employees
                    .map((employee) => employee.department)
                    .filter(Boolean)
            ),
        ].sort();
    }, [employees]);

    /*
     * ============================================================
     * Available years
     * ============================================================
     */

    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();

        return Array.from(
            { length: 6 },
            (_, index) => currentYear - index
        );
    }, []);

    /*
     * ============================================================
     * Fetch Report
     * ============================================================
     */

    const fetchReport = useCallback(async () => {
        setFetchingReport(true);

        try {
            let endpoint = "";
            const params = new URLSearchParams();

            /*
             * MONTHLY
             */
            if (reportType === "monthly") {
                endpoint = "/reports/attendance/monthly";

                params.append("month", filterMonth);
                params.append("year", filterYear);

                if (filterDepartment) {
                    params.append("department", filterDepartment);
                }

                if (filterEmployeeId) {
                    params.append("employeeId", filterEmployeeId);
                }
            }

            /*
             * EMPLOYEE
             */
            if (reportType === "employee") {
                if (!filterEmployeeId) {
                    setReport(null);
                    setFetchingReport(false);
                    return;
                }

                endpoint = `/reports/attendance/employee/${filterEmployeeId}`;

                params.append("year", filterYear);
                params.append("month", filterMonth);
            }

            /*
             * WEEKLY
             */
            if (reportType === "weekly") {
                endpoint = "/reports/attendance/weekly";

                params.append("date", filterDate);

                if (filterDepartment) {
                    params.append("department", filterDepartment);
                }

                if (filterEmployeeId) {
                    params.append("employeeId", filterEmployeeId);
                }
            }

            /*
             * DAILY
             */
            if (reportType === "daily") {
                endpoint = "/reports/attendance/daily";

                params.append("date", filterDate);

                if (filterDepartment) {
                    params.append("department", filterDepartment);
                }

                if (filterEmployeeId) {
                    params.append("employeeId", filterEmployeeId);
                }
            }

            /*
             * DEPARTMENT
             */
            if (reportType === "department") {
                endpoint = "/reports/attendance/department";

                params.append("month", filterMonth);
                params.append("year", filterYear);
            }

            /*
             * YEARLY
             */
            if (reportType === "yearly") {
                endpoint = "/reports/attendance/yearly";

                params.append("year", filterYear);

                if (filterDepartment) {
                    params.append("department", filterDepartment);
                }

                if (filterEmployeeId) {
                    params.append("employeeId", filterEmployeeId);
                }
            }

            /*
             * TREND
             */
            if (reportType === "trend") {
                endpoint = "/reports/attendance/trend";

                params.append("year", filterYear);

                if (filterDepartment) {
                    params.append("department", filterDepartment);
                }
            }

            /*
             * LATE
             */
            if (reportType === "late") {
                endpoint = "/reports/attendance/late-arrivals";

                params.append("month", filterMonth);
                params.append("year", filterYear);

                if (filterDepartment) {
                    params.append("department", filterDepartment);
                }

                if (filterEmployeeId) {
                    params.append("employeeId", filterEmployeeId);
                }
            }

            /*
             * EARLY EXIT
             */
            if (reportType === "early") {
                endpoint = "/reports/attendance/early-exits";

                params.append("month", filterMonth);
                params.append("year", filterYear);

                if (filterDepartment) {
                    params.append("department", filterDepartment);
                }

                if (filterEmployeeId) {
                    params.append("employeeId", filterEmployeeId);
                }
            }

            /*
             * WORKING HOURS
             */
            if (reportType === "hours") {
                endpoint = "/reports/attendance/working-hours";

                params.append("month", filterMonth);
                params.append("year", filterYear);

                if (filterDepartment) {
                    params.append("department", filterDepartment);
                }

                if (filterEmployeeId) {
                    params.append("employeeId", filterEmployeeId);
                }
            }

            if (!endpoint) return;

            const query = params.toString();

            const response = await api.get(
                `${endpoint}${query ? `?${query}` : ""}`
            );

            setReport(response.data);
        } catch (error) {
            console.error("Fetch Report Error:", error);

            setReport(null);

            toast.error(
                error?.response?.data?.error ||
                    "Failed to generate attendance report"
            );
        } finally {
            setFetchingReport(false);
        }
    }, [
        reportType,
        filterEmployeeId,
        filterDepartment,
        filterMonth,
        filterYear,
        filterDate,
    ]);

    useEffect(() => {
        if (!loading) {
            fetchReport();
        }
    }, [fetchReport, loading]);

    /*
     * ============================================================
     * Reset filters when changing report
     * ============================================================
     */

    const handleReportTypeChange = (type) => {
        setReportType(type);
        setReport(null);

        if (type !== "employee") {
            // Keep selected employee because it is a valid filter
            // for most reports.
        }
    };

    /*
     * ============================================================
     * Download / Print
     * ============================================================
     */

    const handlePrint = () => {
        window.print();
    };

    /*
     * ============================================================
     * Loading
     * ============================================================
     */

    if (loading) {
        return <Loading />;
    }

    const selectedReport = REPORT_TYPES.find(
        (item) => item.id === reportType
    );

    /*
     * ============================================================
     * Render
     * ============================================================
     */

    return (
        <div className="animate-fade-in pb-10">
            {/* =====================================================
                HEADER
            ====================================================== */}

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                    <h1 className="page-title">Attendance Reports</h1>

                    <p className="page-subtitle">
                        Analyze attendance, working hours, late arrivals,
                        early exits and employee performance.
                    </p>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                    <button
                        onClick={fetchReport}
                        disabled={fetchingReport}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw
                            className={`w-4 h-4 ${
                                fetchingReport ? "animate-spin" : ""
                            }`}
                        />

                        Refresh
                    </button>

                    <button
                        onClick={handlePrint}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200"
                    >
                        <Download className="w-4 h-4" />

                        Download
                    </button>
                </div>
            </div>

            {/* =====================================================
                REPORT TYPE SELECTOR
            ====================================================== */}

            <div className="card p-3 mb-6 print:hidden">
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {REPORT_TYPES.map((item) => {
                        const Icon = item.icon;
                        const active = reportType === item.id;

                        return (
                            <button
                                key={item.id}
                                onClick={() =>
                                    handleReportTypeChange(item.id)
                                }
                                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                    active
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                                }`}
                            >
                                <Icon className="w-4 h-4" />

                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* =====================================================
                REPORT TITLE
            ====================================================== */}

            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    {selectedReport &&
                        (() => {
                            const Icon = selectedReport.icon;
                            return <Icon className="w-5 h-5" />;
                        })()}
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        {selectedReport?.label} Attendance Report
                    </h2>

                    <p className="text-sm text-slate-500">
                        {selectedReport?.description}
                    </p>
                </div>
            </div>

            {/* =====================================================
                FILTERS
            ====================================================== */}

            <div className="card p-4 mb-6 print:hidden">
                <div className="flex flex-wrap items-end gap-3">
                    {/* Employee */}

                    {reportType !== "department" &&
                        reportType !== "trend" && (
                            <div className="min-w-[210px]">
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                                    Employee
                                </label>

                                <select
                                    value={filterEmployeeId}
                                    onChange={(e) =>
                                        setFilterEmployeeId(
                                            e.target.value
                                        )
                                    }
                                    className="w-full"
                                >
                                    <option value="">
                                        All Employees
                                    </option>

                                    {employees.map((employee) => (
                                        <option
                                            key={
                                                employee._id ||
                                                employee.id
                                            }
                                            value={
                                                employee._id ||
                                                employee.id
                                            }
                                        >
                                            {employee.firstName}{" "}
                                            {employee.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                    {/* Department */}

                    {reportType !== "department" &&
                        reportType !== "employee" &&
                        reportType !== "daily" &&
                        reportType !== "weekly" && (
                            <div className="min-w-[180px]">
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                                    Department
                                </label>

                                <select
                                    value={filterDepartment}
                                    onChange={(e) =>
                                        setFilterDepartment(
                                            e.target.value
                                        )
                                    }
                                    className="w-full"
                                >
                                    <option value="">
                                        All Departments
                                    </option>

                                    {departments.map((department) => (
                                        <option
                                            key={department}
                                            value={department}
                                        >
                                            {department}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                    {/* Month */}

                    {[
                        "monthly",
                        "employee",
                        "department",
                        "late",
                        "early",
                        "hours",
                    ].includes(reportType) && (
                        <div className="min-w-[150px]">
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">
                                Month
                            </label>

                            <select
                                value={filterMonth}
                                onChange={(e) =>
                                    setFilterMonth(
                                        Number(e.target.value)
                                    )
                                }
                                className="w-full"
                            >
                                {MONTHS.map((month) => (
                                    <option
                                        key={month.value}
                                        value={month.value}
                                    >
                                        {month.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Year */}

                    {[
                        "monthly",
                        "employee",
                        "department",
                        "yearly",
                        "trend",
                        "late",
                        "early",
                        "hours",
                    ].includes(reportType) && (
                        <div className="min-w-[110px]">
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">
                                Year
                            </label>

                            <select
                                value={filterYear}
                                onChange={(e) =>
                                    setFilterYear(
                                        Number(e.target.value)
                                    )
                                }
                                className="w-full"
                            >
                                {availableYears.map((year) => (
                                    <option
                                        key={year}
                                        value={year}
                                    >
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Date */}

                    {["weekly", "daily"].includes(reportType) && (
                        <div className="min-w-[170px]">
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">
                                Date
                            </label>

                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) =>
                                    setFilterDate(e.target.value)
                                }
                                className="w-full"
                            />
                        </div>
                    )}

                    {/* Department filter for weekly/daily */}

                    {["weekly", "daily"].includes(reportType) && (
                        <div className="min-w-[180px]">
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">
                                Department
                            </label>

                            <select
                                value={filterDepartment}
                                onChange={(e) =>
                                    setFilterDepartment(
                                        e.target.value
                                    )
                                }
                                className="w-full"
                            >
                                <option value="">
                                    All Departments
                                </option>

                                {departments.map((department) => (
                                    <option
                                        key={department}
                                        value={department}
                                    >
                                        {department}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {reportType === "employee" &&
                    !filterEmployeeId && (
                        <div className="mt-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700">
                            Select an employee to generate an
                            employee-wise attendance report.
                        </div>
                    )}
            </div>

            {/* =====================================================
                REPORT CONTENT
            ====================================================== */}

            {fetchingReport ? (
                <Loading />
            ) : !report ? (
                <div className="card py-16 text-center">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />

                    <h3 className="font-medium text-slate-700">
                        Select filters to generate a report
                    </h3>

                    <p className="text-sm text-slate-400 mt-1">
                        Your attendance report will appear here.
                    </p>
                </div>
            ) : (
                <>
                    {/* =================================================
                        1. MONTHLY REPORT
                    ================================================== */}

                    {reportType === "monthly" && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <SummaryCard
                                    title="Total Employees"
                                    value={
                                        report.summary
                                            ?.totalEmployees ?? 0
                                    }
                                    icon={Users}
                                    iconClass="bg-slate-100 text-slate-600"
                                />

                                <SummaryCard
                                    title="Average Attendance"
                                    value={`${report.summary?.avgAttendance ?? 0}%`}
                                    icon={TrendingUp}
                                    iconClass="bg-indigo-50 text-indigo-600"
                                />

                                <SummaryCard
                                    title="Present Today"
                                    value={
                                        report.summary
                                            ?.presentToday ?? 0
                                    }
                                    icon={CalendarCheck}
                                    iconClass="bg-emerald-50 text-emerald-600"
                                />

                                <SummaryCard
                                    title="Absent Today"
                                    value={
                                        report.summary
                                            ?.absentToday ?? 0
                                    }
                                    icon={CalendarX}
                                    iconClass="bg-rose-50 text-rose-600"
                                />
                            </div>

                            <div className="card overflow-hidden">
                                <ReportHeader
                                    title={`${getMonthName(
                                        filterMonth
                                    )} ${filterYear} Attendance`}
                                    subtitle="Employee-wise monthly attendance summary"
                                />

                                <div className="overflow-x-auto">
                                    <table className="table-modern">
                                        <thead>
                                            <tr>
                                                <th>Employee</th>
                                                <th>Department</th>
                                                <th>Working Days</th>
                                                <th>Present</th>
                                                <th>Absent</th>
                                                <th>Half Day</th>
                                                <th>Leave</th>
                                                <th>Late</th>
                                                <th>Early Exit</th>
                                                <th>Attendance</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {report.rows?.length ? (
                                                report.rows.map(
                                                    (row) => (
                                                        <tr
                                                            key={
                                                                row.employeeId
                                                            }
                                                        >
                                                            <td>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-semibold">
                                                                        {getInitials(
                                                                            row.employeeName
                                                                        )}
                                                                    </div>

                                                                    <div>
                                                                        <p className="font-medium text-slate-900">
                                                                            {
                                                                                row.employeeName
                                                                            }
                                                                        </p>

                                                                        <p className="text-xs text-slate-400">
                                                                            {
                                                                                row.employeeCode
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            <td>
                                                                {
                                                                    row.department
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    row.workingDays
                                                                }
                                                            </td>

                                                            <td className="text-emerald-600 font-medium">
                                                                {
                                                                    row.present
                                                                }
                                                            </td>

                                                            <td className="text-rose-600 font-medium">
                                                                {
                                                                    row.absent
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    row.halfDay
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    row.leave
                                                                }
                                                            </td>

                                                            <td className="text-amber-600">
                                                                {
                                                                    row.late
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    row.earlyExit
                                                                }
                                                            </td>

                                                            <td>
                                                                {percentageBar(
                                                                    row.attendancePercent
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                )
                                            ) : (
                                                <EmptyTableRow
                                                    colSpan={10}
                                                />
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {/* =================================================
                        2. EMPLOYEE REPORT
                    ================================================== */}

                    {reportType === "employee" && (
                        <>
                            <div className="card p-5 mb-6">
                                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                                        {getInitials(
                                            report.employee?.name
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <h2 className="text-lg font-semibold text-slate-900">
                                            {report.employee?.name}
                                        </h2>

                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                                            <span>
                                                {
                                                    report.employee
                                                        ?.employeeCode
                                                }
                                            </span>

                                            <span>
                                                {
                                                    report.employee
                                                        ?.department
                                                }
                                            </span>

                                            <span>
                                                {
                                                    report.employee
                                                        ?.position
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <SummaryCard
                                    title="Working Days"
                                    value={
                                        report.summary
                                            ?.totalWorkingDays ?? 0
                                    }
                                    icon={CalendarDays}
                                    iconClass="bg-slate-100 text-slate-600"
                                />

                                <SummaryCard
                                    title="Present"
                                    value={
                                        report.summary?.present ?? 0
                                    }
                                    icon={CalendarCheck}
                                    iconClass="bg-emerald-50 text-emerald-600"
                                />

                                <SummaryCard
                                    title="Absent"
                                    value={
                                        report.summary?.absent ?? 0
                                    }
                                    icon={CalendarX}
                                    iconClass="bg-rose-50 text-rose-600"
                                />

                                <SummaryCard
                                    title="Attendance"
                                    value={`${report.summary?.attendancePercent ?? 0}%`}
                                    icon={TrendingUp}
                                    iconClass="bg-indigo-50 text-indigo-600"
                                />
                            </div>

                            {/* Monthly performance */}

                            <div className="card overflow-hidden mb-6">
                                <ReportHeader
                                    title={`${filterYear} Monthly Performance`}
                                    subtitle="Attendance percentage throughout the year"
                                />

                                <div className="p-5">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {report.charts
                                            ?.monthlyAttendancePercent
                                            ?.map((item) => (
                                                <div
                                                    key={item.month}
                                                    className="border border-slate-100 rounded-xl p-4"
                                                >
                                                    <p className="text-xs text-slate-500">
                                                        {getMonthName(
                                                            item.month
                                                        )}
                                                    </p>

                                                    <p className="text-xl font-semibold text-slate-900 mt-1">
                                                        {item.value ===
                                                        null
                                                            ? "—"
                                                            : `${item.value}%`}
                                                    </p>

                                                    {item.value !==
                                                        null &&
                                                        percentageBar(
                                                            item.value
                                                        )}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>

                            {/* Daily history */}

                            <div className="card overflow-hidden">
                                <ReportHeader
                                    title={`${getMonthName(
                                        filterMonth
                                    )} Daily History`}
                                    subtitle="Detailed attendance history"
                                />

                                <div className="overflow-x-auto">
                                    <table className="table-modern">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Day</th>
                                                <th>Check In</th>
                                                <th>Check Out</th>
                                                <th>Working Hours</th>
                                                <th>Status</th>
                                                <th>Late</th>
                                                <th>Early Exit</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {report.dailyHistory
                                                ?.length ? (
                                                report.dailyHistory.map(
                                                    (row, index) => (
                                                        <tr
                                                            key={`${row.date}-${index}`}
                                                        >
                                                            <td>
                                                                {formatDate(
                                                                    row.date
                                                                )}
                                                            </td>

                                                            <td>
                                                                {
                                                                    row.dayOfWeek
                                                                }
                                                            </td>

                                                            <td>
                                                                {formatTime(
                                                                    row.checkIn
                                                                )}
                                                            </td>

                                                            <td>
                                                                {formatTime(
                                                                    row.checkOut
                                                                )}
                                                            </td>

                                                            <td>
                                                                {formatHours(
                                                                    row.workHours
                                                                )}
                                                            </td>

                                                            <td>
                                                                {statusBadge(
                                                                    row.status
                                                                )}
                                                            </td>

                                                            <td>
                                                                {row.late ? (
                                                                    <span className="text-amber-600 font-medium">
                                                                        Yes
                                                                    </span>
                                                                ) : (
                                                                    "No"
                                                                )}
                                                            </td>

                                                            <td>
                                                                {row.earlyExit ? (
                                                                    <span className="text-orange-600 font-medium">
                                                                        Yes
                                                                    </span>
                                                                ) : (
                                                                    "No"
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                )
                                            ) : (
                                                <EmptyTableRow
                                                    colSpan={8}
                                                />
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {/* =================================================
                        3. WEEKLY REPORT
                    ================================================== */}

                    {reportType === "weekly" && (
                        <div className="card overflow-hidden">
                            <ReportHeader
                                title="Weekly Attendance"
                                subtitle={`${formatDate(
                                    report.weekStart
                                )} - ${formatDate(
                                    report.weekEnd
                                )}`}
                            />

                            <div className="overflow-x-auto">
                                <table className="table-modern">
                                    <thead>
                                        <tr>
                                            <th>Employee</th>
                                            <th>Department</th>

                                            {report.weekDates?.map(
                                                (date, index) => (
                                                    <th
                                                        key={date}
                                                        className="text-center"
                                                    >
                                                        <div>
                                                            {
                                                                [
                                                                    "Mon",
                                                                    "Tue",
                                                                    "Wed",
                                                                    "Thu",
                                                                    "Fri",
                                                                    "Sat",
                                                                    "Sun",
                                                                ][
                                                                    index
                                                                ]
                                                            }
                                                        </div>

                                                        <div className="text-xs font-normal text-slate-400">
                                                            {new Date(
                                                                date
                                                            ).getDate()}
                                                        </div>
                                                    </th>
                                                )
                                            )}

                                            <th>Weekly %</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {report.rows?.length ? (
                                            report.rows.map((row) => (
                                                <tr
                                                    key={
                                                        row.employeeId
                                                    }
                                                >
                                                    <td className="font-medium text-slate-900">
                                                        {
                                                            row.employeeName
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            row.department
                                                        }
                                                    </td>

                                                    {row.days?.map(
                                                        (
                                                            status,
                                                            index
                                                        ) => (
                                                            <td
                                                                key={
                                                                    index
                                                                }
                                                                className="text-center"
                                                            >
                                                                <StatusCode
                                                                    status={
                                                                        status
                                                                    }
                                                                />
                                                            </td>
                                                        )
                                                    )}

                                                    <td>
                                                        {percentageBar(
                                                            row.weeklyPercent
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <EmptyTableRow
                                                colSpan={10}
                                            />
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
                                <Legend code="P" label="Present" />
                                <Legend code="A" label="Absent" />
                                <Legend code="L" label="Leave" />
                                <Legend code="HD" label="Half Day" />
                                <Legend code="WO" label="Week Off" />
                            </div>
                        </div>
                    )}

                    {/* =================================================
                        4. DAILY REPORT
                    ================================================== */}

                    {reportType === "daily" && (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                                <MiniStat
                                    title="Employees"
                                    value={
                                        report.stats
                                            ?.totalEmployees ?? 0
                                    }
                                />

                                <MiniStat
                                    title="Present"
                                    value={
                                        report.stats?.present ?? 0
                                    }
                                    valueClass="text-emerald-600"
                                />

                                <MiniStat
                                    title="Absent"
                                    value={
                                        report.stats?.absent ?? 0
                                    }
                                    valueClass="text-rose-600"
                                />

                                <MiniStat
                                    title="Leave"
                                    value={
                                        report.stats?.onLeave ?? 0
                                    }
                                    valueClass="text-blue-600"
                                />

                                <MiniStat
                                    title="Late"
                                    value={
                                        report.stats?.late ?? 0
                                    }
                                    valueClass="text-amber-600"
                                />

                                <MiniStat
                                    title="Early Exit"
                                    value={
                                        report.stats?.earlyExit ?? 0
                                    }
                                    valueClass="text-orange-600"
                                />
                            </div>

                            <div className="card overflow-hidden">
                                <ReportHeader
                                    title={`Attendance - ${formatDate(
                                        report.date
                                    )}`}
                                    subtitle="Daily employee attendance"
                                />

                                <div className="overflow-x-auto">
                                    <table className="table-modern">
                                        <thead>
                                            <tr>
                                                <th>Employee</th>
                                                <th>Department</th>
                                                <th>Check In</th>
                                                <th>Check Out</th>
                                                <th>Working Hours</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {report.rows?.length ? (
                                                report.rows.map(
                                                    (row) => (
                                                        <tr
                                                            key={
                                                                row.employeeId
                                                            }
                                                        >
                                                            <td className="font-medium text-slate-900">
                                                                {
                                                                    row.employeeName
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    row.department
                                                                }
                                                            </td>

                                                            <td>
                                                                {formatTime(
                                                                    row.checkIn
                                                                )}
                                                            </td>

                                                            <td>
                                                                {formatTime(
                                                                    row.checkOut
                                                                )}
                                                            </td>

                                                            <td>
                                                                {formatHours(
                                                                    row.workHours
                                                                )}
                                                            </td>

                                                            <td>
                                                                {statusBadge(
                                                                    row.status
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                )
                                            ) : (
                                                <EmptyTableRow
                                                    colSpan={6}
                                                />
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {/* =================================================
                        5. DEPARTMENT REPORT
                    ================================================== */}

                    {reportType === "department" && (
                        <div className="card overflow-hidden">
                            <ReportHeader
                                title={`${getMonthName(
                                    filterMonth
                                )} ${filterYear} Department Report`}
                                subtitle="Compare attendance across departments"
                            />

                            <div className="overflow-x-auto">
                                <table className="table-modern">
                                    <thead>
                                        <tr>
                                            <th>Department</th>
                                            <th>Employees</th>
                                            <th>Working Days</th>
                                            <th>Present</th>
                                            <th>Absent</th>
                                            <th>Leave</th>
                                            <th>Late</th>
                                            <th>Attendance</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {report.rows?.length ? (
                                            report.rows.map((row) => (
                                                <tr
                                                    key={
                                                        row.department
                                                    }
                                                >
                                                    <td>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                                <Building2 className="w-4 h-4" />
                                                            </div>

                                                            <span className="font-medium text-slate-900">
                                                                {
                                                                    row.department
                                                                }
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        {
                                                            row.employees
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            row.workingDays
                                                        }
                                                    </td>

                                                    <td className="text-emerald-600 font-medium">
                                                        {
                                                            row.present
                                                        }
                                                    </td>

                                                    <td className="text-rose-600 font-medium">
                                                        {
                                                            row.absent
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            row.leave
                                                        }
                                                    </td>

                                                    <td className="text-amber-600">
                                                        {
                                                            row.late
                                                        }
                                                    </td>

                                                    <td>
                                                        {percentageBar(
                                                            row.attendancePercent
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <EmptyTableRow
                                                colSpan={8}
                                            />
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* =================================================
                        6. YEARLY REPORT
                    ================================================== */}

                    {reportType === "yearly" && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <SummaryCard
                                    title="Average Attendance"
                                    value={`${report.stats?.averageAttendance ?? 0}%`}
                                    icon={TrendingUp}
                                    iconClass="bg-indigo-50 text-indigo-600"
                                />

                                <SummaryCard
                                    title="Total Present"
                                    value={
                                        report.stats
                                            ?.totalPresent ?? 0
                                    }
                                    icon={CalendarCheck}
                                    iconClass="bg-emerald-50 text-emerald-600"
                                />

                                <SummaryCard
                                    title="Total Absent"
                                    value={
                                        report.stats
                                            ?.totalAbsent ?? 0
                                    }
                                    icon={CalendarX}
                                    iconClass="bg-rose-50 text-rose-600"
                                />

                                <SummaryCard
                                    title="Total Late"
                                    value={
                                        report.stats?.totalLate ?? 0
                                    }
                                    icon={AlertTriangle}
                                    iconClass="bg-amber-50 text-amber-600"
                                />
                            </div>

                            <div className="card overflow-hidden">
                                <ReportHeader
                                    title={`${filterYear} Yearly Attendance`}
                                    subtitle="Monthly attendance performance for each employee"
                                />

                                <div className="overflow-x-auto">
                                    <table className="table-modern min-w-[1100px]">
                                        <thead>
                                            <tr>
                                                <th>Employee</th>

                                                {MONTHS.map(
                                                    (month) => (
                                                        <th
                                                            key={
                                                                month.value
                                                            }
                                                            className="text-center"
                                                        >
                                                            {month.label.slice(
                                                                0,
                                                                3
                                                            )}
                                                        </th>
                                                    )
                                                )}

                                                <th>Year Avg</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {report.rows?.length ? (
                                                report.rows.map(
                                                    (row) => (
                                                        <tr
                                                            key={
                                                                row.employeeId
                                                            }
                                                        >
                                                            <td className="font-medium text-slate-900 whitespace-nowrap">
                                                                {
                                                                    row.employeeName
                                                                }
                                                            </td>

                                                            {row.monthly?.map(
                                                                (
                                                                    value,
                                                                    index
                                                                ) => (
                                                                    <td
                                                                        key={
                                                                            index
                                                                        }
                                                                        className="text-center"
                                                                    >
                                                                        {value ===
                                                                        null ? (
                                                                            <span className="text-slate-300">
                                                                                —
                                                                            </span>
                                                                        ) : (
                                                                            <span
                                                                                className={`font-medium ${
                                                                                    value >=
                                                                                    90
                                                                                        ? "text-emerald-600"
                                                                                        : value >=
                                                                                            75
                                                                                          ? "text-indigo-600"
                                                                                          : value >=
                                                                                              60
                                                                                            ? "text-amber-600"
                                                                                            : "text-rose-600"
                                                                                }`}
                                                                            >
                                                                                {
                                                                                    value
                                                                                }
                                                                                %
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                )
                                                            )}

                                                            <td>
                                                                <span className="font-semibold text-indigo-600">
                                                                    {
                                                                        row.yearAvg
                                                                    }
                                                                    %
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )
                                                )
                                            ) : (
                                                <EmptyTableRow
                                                    colSpan={14}
                                                />
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {/* =================================================
                        7. TREND REPORT
                    ================================================== */}

                    {reportType === "trend" && (
                        <div className="card p-6">
                            <ReportHeader
                                title={`${filterYear} Attendance Trend`}
                                subtitle="Organization attendance percentage by month"
                            />

                            <div className="mt-6">
                                <div className="flex items-end gap-3 h-72 border-b border-l border-slate-200 px-4">
                                    {report.trend?.map(
                                        (item) => {
                                            const height = Math.max(
                                                4,
                                                Number(
                                                    item.attendancePercent
                                                ) || 0
                                            );

                                            return (
                                                <div
                                                    key={
                                                        item.month
                                                    }
                                                    className="flex-1 h-full flex flex-col justify-end items-center gap-2"
                                                >
                                                    <span className="text-xs font-medium text-slate-600">
                                                        {
                                                            item.attendancePercent
                                                        }
                                                        %
                                                    </span>

                                                    <div
                                                        className="w-full max-w-[52px] bg-indigo-500 rounded-t-lg transition-all hover:bg-indigo-600"
                                                        style={{
                                                            height: `${height}%`,
                                                        }}
                                                        title={`${getMonthName(
                                                            item.month
                                                        )}: ${
                                                            item.attendancePercent
                                                        }%`}
                                                    />

                                                    <span className="text-xs text-slate-400">
                                                        {getMonthName(
                                                            item.month
                                                        ).slice(
                                                            0,
                                                            3
                                                        )}
                                                    </span>
                                                </div>
                                            );
                                        }
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* =================================================
                        8. LATE ARRIVAL REPORT
                    ================================================== */}

                    {reportType === "late" && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <SummaryCard
                                    title="Total Late Arrivals"
                                    value={
                                        report.summary
                                            ?.totalLateArrivals ?? 0
                                    }
                                    icon={AlertTriangle}
                                    iconClass="bg-amber-50 text-amber-600"
                                />

                                <SummaryCard
                                    title="Frequently Late"
                                    value={
                                        report.summary
                                            ?.employeesFrequentlyLate ?? 0
                                    }
                                    icon={Users}
                                    iconClass="bg-rose-50 text-rose-600"
                                />

                                <SummaryCard
                                    title="Average Delay"
                                    value={`${report.summary?.averageDelayMinutes ?? 0} min`}
                                    icon={Clock3}
                                    iconClass="bg-indigo-50 text-indigo-600"
                                />

                                <SummaryCard
                                    title="Max Delay"
                                    value={`${report.summary?.maxDelayMinutes ?? 0} min`}
                                    icon={Timer}
                                    iconClass="bg-slate-100 text-slate-600"
                                />
                            </div>

                            <div className="card overflow-hidden">
                                <ReportHeader
                                    title="Late Arrivals"
                                    subtitle={`${getMonthName(
                                        filterMonth
                                    )} ${filterYear}`}
                                />

                                <div className="overflow-x-auto">
                                    <table className="table-modern">
                                        <thead>
                                            <tr>
                                                <th>Employee</th>
                                                <th>Department</th>
                                                <th>Date</th>
                                                <th>Expected</th>
                                                <th>Actual Check In</th>
                                                <th>Late By</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {report.rows?.length ? (
                                                report.rows.map(
                                                    (row, index) => (
                                                        <tr
                                                            key={`${row.employeeId}-${row.date}-${index}`}
                                                        >
                                                            <td className="font-medium text-slate-900">
                                                                {
                                                                    row.employeeName
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    row.department
                                                                }
                                                            </td>

                                                            <td>
                                                                {formatDate(
                                                                    row.date
                                                                )}
                                                            </td>

                                                            <td>
                                                                {
                                                                    row.expected
                                                                }
                                                            </td>

                                                            <td className="text-amber-600 font-medium">
                                                                {formatTime(
                                                                    row.checkIn
                                                                )}
                                                            </td>

                                                            <td>
                                                                <span className="inline-flex px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                                                                    {
                                                                        row.lateByMinutes
                                                                    }{" "}
                                                                    min
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )
                                                )
                                            ) : (
                                                <EmptyTableRow
                                                    colSpan={6}
                                                    message="No late arrivals found"
                                                />
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {/* =================================================
                        9. EARLY EXIT REPORT
                    ================================================== */}

                    {reportType === "early" && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                <SummaryCard
                                    title="Total Early Exits"
                                    value={
                                        report.summary
                                            ?.totalEarlyExits ?? 0
                                    }
                                    icon={LogOut}
                                    iconClass="bg-orange-50 text-orange-600"
                                />

                                <SummaryCard
                                    title="Average Early By"
                                    value={`${report.summary?.averageEarlyByMinutes ?? 0} min`}
                                    icon={Timer}
                                    iconClass="bg-indigo-50 text-indigo-600"
                                />
                            </div>

                            <div className="card overflow-hidden">
                                <ReportHeader
                                    title="Early Exit Report"
                                    subtitle={`${getMonthName(
                                        filterMonth
                                    )} ${filterYear}`}
                                />

                                <div className="overflow-x-auto">
                                    <table className="table-modern">
                                        <thead>
                                            <tr>
                                                <th>Employee</th>
                                                <th>Department</th>
                                                <th>Date</th>
                                                <th>Check In</th>
                                                <th>Check Out</th>
                                                <th>Expected Exit</th>
                                                <th>Left Early</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {report.rows?.length ? (
                                                report.rows.map(
                                                    (row, index) => (
                                                        <tr
                                                            key={`${row.employeeId}-${row.date}-${index}`}
                                                        >
                                                            <td className="font-medium text-slate-900">
                                                                {
                                                                    row.employeeName
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    row.department
                                                                }
                                                            </td>

                                                            <td>
                                                                {formatDate(
                                                                    row.date
                                                                )}
                                                            </td>

                                                            <td>
                                                                {formatTime(
                                                                    row.checkIn
                                                                )}
                                                            </td>

                                                            <td className="text-orange-600 font-medium">
                                                                {formatTime(
                                                                    row.checkOut
                                                                )}
                                                            </td>

                                                            <td>
                                                                {
                                                                    row.expectedExit
                                                                }
                                                            </td>

                                                            <td>
                                                                <span className="inline-flex px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-medium">
                                                                    {
                                                                        row.leftEarlyMinutes
                                                                    }{" "}
                                                                    min
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )
                                                )
                                            ) : (
                                                <EmptyTableRow
                                                    colSpan={7}
                                                    message="No early exits found"
                                                />
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {/* =================================================
                        10. WORKING HOURS REPORT
                    ================================================== */}

                    {reportType === "hours" && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <SummaryCard
                                    title="Total Records"
                                    value={
                                        report.summary
                                            ?.totalRecords ?? 0
                                    }
                                    icon={FileText}
                                    iconClass="bg-slate-100 text-slate-600"
                                />

                                <SummaryCard
                                    title="Total Working Hours"
                                    value={formatHours(
                                        report.summary
                                            ?.totalWorkingHours
                                    )}
                                    icon={Clock3}
                                    iconClass="bg-indigo-50 text-indigo-600"
                                />

                                <SummaryCard
                                    title="Total Overtime"
                                    value={formatHours(
                                        report.summary
                                            ?.totalOvertimeHours
                                    )}
                                    icon={Timer}
                                    iconClass="bg-emerald-50 text-emerald-600"
                                />

                                <SummaryCard
                                    title="Average Hours"
                                    value={formatHours(
                                        report.summary
                                            ?.averageWorkingHours
                                    )}
                                    icon={TrendingUp}
                                    iconClass="bg-amber-50 text-amber-600"
                                />
                            </div>

                            <div className="card overflow-hidden">
                                <ReportHeader
                                    title="Working Hours Report"
                                    subtitle={`${getMonthName(
                                        filterMonth
                                    )} ${filterYear}`}
                                />

                                <div className="overflow-x-auto">
                                    <table className="table-modern">
                                        <thead>
                                            <tr>
                                                <th>Employee</th>
                                                <th>Department</th>
                                                <th>Date</th>
                                                <th>Check In</th>
                                                <th>Check Out</th>
                                                <th>Working Hours</th>
                                                <th>Overtime</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {report.rows?.length ? (
                                                report.rows.map(
                                                    (row, index) => (
                                                        <tr
                                                            key={`${row.employeeId}-${row.date}-${index}`}
                                                        >
                                                            <td className="font-medium text-slate-900">
                                                                {
                                                                    row.employeeName
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    row.department
                                                                }
                                                            </td>

                                                            <td>
                                                                {formatDate(
                                                                    row.date
                                                                )}
                                                            </td>

                                                            <td>
                                                                {formatTime(
                                                                    row.checkIn
                                                                )}
                                                            </td>

                                                            <td>
                                                                {formatTime(
                                                                    row.checkOut
                                                                )}
                                                            </td>

                                                            <td className="font-medium text-slate-700">
                                                                {formatHours(
                                                                    row.workHours
                                                                )}
                                                            </td>

                                                            <td>
                                                                <span
                                                                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                                                        Number(
                                                                            row.overtime
                                                                        ) >
                                                                        0
                                                                            ? "bg-emerald-50 text-emerald-700"
                                                                            : "bg-slate-50 text-slate-500"
                                                                    }`}
                                                                >
                                                                    {formatHours(
                                                                        row.overtime
                                                                    )}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )
                                                )
                                            ) : (
                                                <EmptyTableRow
                                                    colSpan={7}
                                                    message="No working hours records found"
                                                />
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

/*
 * ================================================================
 * Reusable Components
 * ================================================================
 */

const SummaryCard = ({
    title,
    value,
    icon: Icon,
    iconClass = "",
}) => {
    return (
        <div className="card p-5 flex items-center justify-between">
            <div>
                <p className="text-sm text-slate-500">{title}</p>

                <p className="text-2xl font-bold text-slate-900 mt-1">
                    {value}
                </p>
            </div>

            <Icon
                className={`size-10 p-2.5 rounded-xl ${iconClass}`}
            />
        </div>
    );
};

const MiniStat = ({
    title,
    value,
    valueClass = "text-slate-900",
}) => {
    return (
        <div className="card p-4">
            <p className="text-xs text-slate-500">{title}</p>

            <p
                className={`text-xl font-bold mt-1 ${valueClass}`}
            >
                {value}
            </p>
        </div>
    );
};

const ReportHeader = ({ title, subtitle }) => {
    return (
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">
                {title}
            </h2>

            {subtitle && (
                <p className="text-xs text-slate-500 mt-1">
                    {subtitle}
                </p>
            )}
        </div>
    );
};

const EmptyTableRow = ({
    colSpan,
    message = "No data found",
}) => {
    return (
        <tr>
            <td
                colSpan={colSpan}
                className="text-center py-14 text-slate-400"
            >
                {message}
            </td>
        </tr>
    );
};

const StatusCode = ({ status }) => {
    const config = {
        P: "bg-emerald-50 text-emerald-700 border-emerald-100",
        A: "bg-rose-50 text-rose-700 border-rose-100",
        L: "bg-blue-50 text-blue-700 border-blue-100",
        HD: "bg-amber-50 text-amber-700 border-amber-100",
        WO: "bg-slate-100 text-slate-500 border-slate-200",
    };

    return (
        <span
            className={`inline-flex items-center justify-center min-w-9 px-2 py-1 rounded-lg border text-xs font-semibold ${
                config[status] ||
                "bg-slate-50 text-slate-400 border-slate-100"
            }`}
        >
            {status || "—"}
        </span>
    );
};

const Legend = ({ code, label }) => {
    return (
        <div className="flex items-center gap-2">
            <StatusCode status={code} />

            <span>{label}</span>
        </div>
    );
};

export default Reports;