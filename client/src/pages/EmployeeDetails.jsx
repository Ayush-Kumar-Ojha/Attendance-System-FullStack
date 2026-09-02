import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    CalendarCheck,
    TrendingUp,
    Receipt,
    CalendarDays,
    CheckCircle2,
    AlertTriangle,
    Download,
    IndianRupee,
    WalletCards,
    Filter,
} from "lucide-react";
import api from "../api/axios";
import toast from "react-hot-toast";
import Loading from "../components/Loading";
import { format } from "date-fns";

const currentDate = new Date();

const EmployeeDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [employee, setEmployee] = useState(null);
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [monthlyTrendData, setMonthlyTrendData] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [payslips, setPayslips] = useState([]);
    const [billClaims, setBillClaims] = useState([]);
    const [advances, setAdvances] = useState([]);

    // Month & Year Global Filter State (Default to current month & year)
    const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));

    const monthNum = Number(selectedMonth);
    const yearNum = Number(selectedYear);

    const availableYears = useMemo(() => {
        const curY = currentDate.getFullYear();
        return Array.from({ length: 6 }, (_, i) => curY - i);
    }, []);

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const fetchEmployeeData = useCallback(async () => {
        try {
            setLoading(true);

            // 1. Fetch Profile
            let empData = null;
            try {
                const empRes = await api.get(`/employees/${id}`);
                empData = empRes.data?.data || empRes.data;
            } catch {
                const allEmpRes = await api.get("/employees");
                const list = Array.isArray(allEmpRes.data)
                    ? allEmpRes.data
                    : allEmpRes.data?.employees || [];
                empData = list.find((e) => (e._id || e.id) === id);
            }

            if (!empData) {
                toast.error("Employee not found");
                navigate("/dashboard");
                return;
            }
            setEmployee(empData);

            // 2. Parallel API calls for strict employee-scoped real data
            const [attRes, leaveRes, payRes, claimRes, advRes] = await Promise.allSettled([
                api.get(`/reports/attendance/employee/${id}`, { params: { year: Number(selectedYear) } }),
                api.get("/leave", { params: { employeeId: id } }),
                api.get("/payslip", { params: { employeeId: id } }),
                api.get("/bill-claims", { params: { employeeId: id } }),
                api.get("/advance", { params: { employeeId: id } }),
            ]);

            // Handle Attendance Data
            if (attRes.status === "fulfilled") {
                const report = attRes.value.data || {};
                setAttendanceLogs(report.dailyHistory || []);

                if (report.charts?.monthlyAttendancePercent) {
                    setMonthlyTrendData(report.charts.monthlyAttendancePercent);
                } else if (report.dailyHistory) {
                    const monthMap = {};
                    report.dailyHistory.forEach((log) => {
                        const m = new Date(log.date).getMonth() + 1;
                        if (!monthMap[m]) monthMap[m] = { present: 0, total: 0 };
                        monthMap[m].total += 1;
                        if (log.status === "PRESENT" || log.status === "HALF_DAY") {
                            monthMap[m].present += log.status === "HALF_DAY" ? 0.5 : 1;
                        }
                    });

                    const computedTrend = Object.keys(monthMap).map((m) => ({
                        month: Number(m),
                        value: Math.round((monthMap[m].present / monthMap[m].total) * 100),
                    }));
                    setMonthlyTrendData(computedTrend);
                }
            }

            // Handle Leaves Data
            if (leaveRes.status === "fulfilled") {
                setLeaves(leaveRes.value.data?.data || leaveRes.value.data || []);
            }

            // ==========================================
            // HANDLE PAYSLIPS - STRICT EMPLOYEE FILTER
            // ==========================================
            if (payRes.status === "fulfilled") {
                const raw =
                    payRes.value.data?.data ||
                    payRes.value.data?.payslips ||
                    payRes.value.data ||
                    [];

                const list = Array.isArray(raw)
                    ? raw
                    : [];

                const employeePayslips = list.filter((p) => {
                    const payslipEmployeeId =
                        p.employeeId?._id ||
                        p.employeeId?.id ||
                        p.employeeId ||
                        p.employee?._id ||
                        p.employee?.id ||
                        p.employee ||
                        "";

                    return (
                        String(payslipEmployeeId) ===
                        String(id)
                    );
                });

                console.log(
                    "Employee:",
                    id,
                    "All payslips:",
                    list,
                    "Filtered payslips:",
                    employeePayslips
                );

                setPayslips(employeePayslips);
            }

            // Handle Bill Claims Data
            if (claimRes.status === "fulfilled") {
                setBillClaims(claimRes.value.data?.data || claimRes.value.data || []);
            }

            // Handle Salary Advances Data
            if (advRes.status === "fulfilled") {
                setAdvances(advRes.value.data?.data || advRes.value.data || []);
            }
        } catch (error) {
            console.error("Error loading employee full profile:", error);
            toast.error("Failed to load employee details");
        } finally {
            setLoading(false);
        }
    }, [id, navigate, selectedYear]);

    useEffect(() => {
        fetchEmployeeData();
    }, [fetchEmployeeData]);

    // FILTERED LOGS FOR SELECTED MONTH & YEAR
    const selectedMonthAttendanceLogs = useMemo(() => {
        return attendanceLogs.filter((log) => {
            if (!log.date) return false;
            const d = new Date(log.date);
            return d.getMonth() + 1 === monthNum && d.getFullYear() === yearNum;
        });
    }, [attendanceLogs, monthNum, yearNum]);

    // ATTENDANCE % FOR SELECTED MONTH & YEAR
    const attendancePercentForSelectedMonth = useMemo(() => {
        if (selectedMonthAttendanceLogs.length === 0) return 0;
        const presentDays = selectedMonthAttendanceLogs.reduce((acc, log) => {
            if (log.status === "PRESENT") return acc + 1;
            if (log.status === "HALF_DAY") return acc + 0.5;
            return acc;
        }, 0);

        return Math.round((presentDays / selectedMonthAttendanceLogs.length) * 100);
    }, [selectedMonthAttendanceLogs]);

    // FILTERED LEAVES FOR SELECTED MONTH & YEAR
    const selectedMonthLeaves = useMemo(() => {
        return leaves.filter((l) => {
            if (!l.startDate) return false;
            const d = new Date(l.startDate);
            return d.getMonth() + 1 === monthNum && d.getFullYear() === yearNum;
        });
    }, [leaves, monthNum, yearNum]);

    const approvedLeavesSelectedMonth = useMemo(() => {
        return selectedMonthLeaves.filter((l) => l.status === "APPROVED");
    }, [selectedMonthLeaves]);

    const pendingLeavesSelectedMonth = useMemo(() => {
        return selectedMonthLeaves.filter((l) => l.status === "PENDING");
    }, [selectedMonthLeaves]);

    const approvedLeaveDaysSelectedMonth = useMemo(() => {
        return approvedLeavesSelectedMonth.reduce((acc, l) => {
            if (l.type === "HALF_DAY") return acc + 0.5;
            const start = new Date(l.startDate);
            const end = new Date(l.endDate);
            const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
            return acc + (diff > 0 ? diff : 1);
        }, 0);
    }, [approvedLeavesSelectedMonth]);

    // ==========================================
    // PAYSLIP FOR EXACT SELECTED MONTH + YEAR
    // ==========================================

    const selectedMonthPayslip = useMemo(() => {
        return (
            payslips.find(
                (p) =>
                    Number(p.month) === monthNum &&
                    Number(p.year) === yearNum
            ) || null
        );
    }, [payslips, monthNum, yearNum]);

    // FILTERED CLAIMS & SALARY ADVANCES FOR SELECTED MONTH & YEAR
    const selectedMonthClaims = useMemo(() => {
        return billClaims.filter((c) => {
            const dateStr = c.createdAt || c.date || c.billDate;
            if (!dateStr) return true;
            const d = new Date(dateStr);
            return d.getMonth() + 1 === monthNum && d.getFullYear() === yearNum;
        });
    }, [billClaims, monthNum, yearNum]);

    const selectedMonthAdvances = useMemo(() => {
        return advances.filter((a) => {
            const dateStr = a.createdAt || a.date || a.requestDate;
            if (!dateStr) return true;
            const d = new Date(dateStr);
            return d.getMonth() + 1 === monthNum && d.getFullYear() === yearNum;
        });
    }, [advances, monthNum, yearNum]);

    const approvedClaimsAmount = useMemo(() => {
        return selectedMonthClaims
            .filter((c) => c.status === "APPROVED")
            .reduce((sum, c) => sum + Number(c.amount || 0), 0);
    }, [selectedMonthClaims]);

    const approvedAdvanceAmount = useMemo(() => {
        return selectedMonthAdvances
            .filter((a) => a.status === "APPROVED")
            .reduce((sum, a) => sum + Number(a.amount || 0), 0);
    }, [selectedMonthAdvances]);

    const pendingClaimsCount = useMemo(() => {
        const pendingC = selectedMonthClaims.filter((c) => c.status === "PENDING").length;
        const pendingA = selectedMonthAdvances.filter((a) => a.status === "PENDING").length;
        return pendingC + pendingA;
    }, [selectedMonthClaims, selectedMonthAdvances]);

    // 12-MONTH ATTENDANCE TREND CHART FOR SELECTED YEAR
    const fullYearTrend = useMemo(() => {
        const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthMap = {};

        attendanceLogs.forEach((log) => {
            if (!log.date) return;
            const d = new Date(log.date);
            if (d.getFullYear() === yearNum) {
                const m = d.getMonth() + 1;
                if (!monthMap[m]) monthMap[m] = { present: 0, total: 0 };
                monthMap[m].total += 1;
                if (log.status === "PRESENT" || log.status === "HALF_DAY") {
                    monthMap[m].present += log.status === "HALF_DAY" ? 0.5 : 1;
                }
            }
        });

        return Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            let value = 0;

            if (monthlyTrendData.length > 0) {
                const found = monthlyTrendData.find((item) => Number(item.month) === m);
                if (found) value = found.value ?? 0;
            }

            if (value === 0 && monthMap[m] && monthMap[m].total > 0) {
                value = Math.round((monthMap[m].present / monthMap[m].total) * 100);
            }

            return {
                month: m,
                monthName: shortMonths[i],
                value,
                isSelected: m === monthNum,
                hasData: (monthMap[m]?.total || 0) > 0 || value > 0,
            };
        });
    }, [attendanceLogs, monthlyTrendData, yearNum, monthNum]);

    // REAL HR INSIGHTS EVALUATION FOR SELECTED MONTH & YEAR
    const hrInsights = useMemo(() => {
        const insights = [];

        if (selectedMonthAttendanceLogs.length === 0) {
            insights.push({
                type: "info",
                text: `No attendance records logged for ${monthNames[monthNum - 1]} ${yearNum}`,
            });
        } else if (attendancePercentForSelectedMonth >= 90) {
            insights.push({
                type: "success",
                text: `Attendance is excellent (${attendancePercentForSelectedMonth}%) in ${monthNames[monthNum - 1]}`,
            });
        } else if (attendancePercentForSelectedMonth >= 75) {
            insights.push({
                type: "warning",
                text: `Attendance is moderate (${attendancePercentForSelectedMonth}%) in ${monthNames[monthNum - 1]}`,
            });
        } else {
            insights.push({
                type: "error",
                text: `Low attendance recorded (${attendancePercentForSelectedMonth}%) in ${monthNames[monthNum - 1]}`,
            });
        }

        if (approvedLeaveDaysSelectedMonth > 3) {
            insights.push({
                type: "warning",
                text: `${approvedLeaveDaysSelectedMonth} leave days taken in ${monthNames[monthNum - 1]} (Exceeds 3-day paid limit)`,
            });
        } else {
            insights.push({
                type: "success",
                text: `No unusual leave pattern detected in ${monthNames[monthNum - 1]}`,
            });
        }

        if (pendingClaimsCount > 0) {
            insights.push({
                type: "warning",
                text: `⚠ ${pendingClaimsCount} claim/advance request(s) pending for ${monthNames[monthNum - 1]}`,
            });
        } else {
            insights.push({
                type: "success",
                text: `All expense claims and advances processed for ${monthNames[monthNum - 1]}`,
            });
        }

        if (selectedMonthPayslip) {
            insights.push({
                type: "info",
                text: `Payslip issued for ${monthNames[monthNum - 1]
                    } ${yearNum} (₹${Number(
                        selectedMonthPayslip.netSalary ?? 0
                    ).toLocaleString("en-IN")} Net)`,
            });
        } else {
            insights.push({
                type: "info",
                text: `No payslip generated for ${monthNames[monthNum - 1]
                    } ${yearNum}`,
            });
        }

        return insights;
    }, [
        selectedMonthAttendanceLogs,
        attendancePercentForSelectedMonth,
        approvedLeaveDaysSelectedMonth,
        pendingClaimsCount,
        selectedMonthPayslip,
        monthNum,
        yearNum,
        monthNames
    ]);

    // SINGLE LATEST PAYSLIP FOR PAYSLIP HISTORY (Requirement 10)
    const singleLatestPayslip = useMemo(() => {
        return payslips.length > 0 ? [payslips[0]] : [];
    }, [payslips]);

    if (loading) return <Loading />;

    const fullName = `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim() || "Employee";
    const initials = fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    // Profile Photo URL (Requirement 1: Uploaded photo from settings)
    const avatarUrl =
        employee?.profilePicture ||
        employee?.avatar ||
        employee?.image ||
        employee?.photo ||
        employee?.photoUrl ||
        employee?.userId?.profilePicture ||
        employee?.user?.profilePicture ||
        null;

    return (
        <div className="animate-fade-in-up pb-10 space-y-6">
            {/* Top Navigation & Global Month/Year Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                    onClick={() => navigate("/dashboard")}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer w-fit"
                >
                    <ArrowLeft size={16} />
                    Back to Dashboard
                </button>

                {/* MONTH & YEAR FILTER DROPDOWNS */}
                <div className="flex items-center gap-2.5 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-slate-500">
                        <Filter size={14} className="text-indigo-600" />
                        <span>Filter Period:</span>
                    </div>

                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                        {monthNames.map((m, i) => (
                            <option key={i + 1} value={i + 1}>
                                {m}
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                        {availableYears.map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Profile Header Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-5">
                        {/* Requirement 1: Real Uploaded Profile Picture or Initials Badge */}
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={fullName}
                                className="h-16 w-16 shrink-0 rounded-2xl object-cover border-2 border-indigo-100 shadow-md"
                            />
                        ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-md shadow-indigo-200">
                                {initials}
                            </div>
                        )}

                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-slate-900 animate-title-slide">
                                    {fullName}
                                </h1>
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold ${employee?.isDeleted
                                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        }`}
                                >
                                    <span
                                        className={`h-2 w-2 rounded-full ${employee?.isDeleted ? "bg-rose-500" : "bg-emerald-500 animate-pulse"
                                            }`}
                                    />
                                    {employee?.isDeleted ? "Inactive" : "Active"}
                                </span>
                            </div>

                            <p className="mt-0.5 font-medium text-indigo-600 text-sm">
                                {employee?.position || "Team Member"} • {employee?.department || "General"}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                <span>Code: <strong className="text-slate-700">{employee?.employeeCode || "N/A"}</strong></span>
                                <span>Joined: <strong className="text-slate-700">{employee?.joinDate ? format(new Date(employee.joinDate), "dd MMM yyyy") : "N/A"}</strong></span>
                                <span>Email: <strong className="text-slate-700">{employee?.email || "N/A"}</strong></span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 border-t border-slate-100 pt-4 sm:border-t-0 sm:pt-0">
                        <button
                            className="rounded-xl px-4 py-2 text-xs font-semibold bg-indigo-600 text-white shadow-sm"
                        >
                            Overview 360°
                        </button>
                    </div>
                </div>
            </div>

            {/* 4 FILTERED METRICS CARDS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Requirement 2: Attendance % for selected month & year */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm card-hover relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-500">Attendance ({monthNames[monthNum - 1].slice(0, 3)})</p>
                        <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                            <CalendarCheck size={18} />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        {attendancePercentForSelectedMonth}%
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                        {selectedMonthAttendanceLogs.length} workdays logged in {monthNames[monthNum - 1].slice(0, 3)} {yearNum}
                    </p>
                </div>

                {/* Requirement 3: Leaves summary for selected month & year */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm card-hover relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-500">Leaves ({monthNames[monthNum - 1].slice(0, 3)})</p>
                        <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                            <CalendarDays size={18} />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        {approvedLeaveDaysSelectedMonth} <span className="text-xs font-normal text-slate-500">days taken</span>
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                        Total Applied: <strong className="text-slate-800">{selectedMonthLeaves.length}</strong> • Pending: <strong className="text-amber-700">{pendingLeavesSelectedMonth.length}</strong>
                    </p>
                </div>

                {/* Requirement 4: Payslip amount for selected month & year (or latest) */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm card-hover relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-500">Payroll / Salary</p>
                        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                            <IndianRupee size={18} />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        ₹{Number(
                            selectedMonthPayslip?.netSalary ?? 0
                        ).toLocaleString("en-IN")}
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-500">
                        {selectedMonthPayslip
                            ? `For ${monthNames[monthNum - 1].slice(0, 3)} ${yearNum}`
                            : `No payslip generated for ${monthNames[monthNum - 1].slice(0, 3)} ${yearNum}`}
                    </p>
                </div>

                {/* Requirement 7: Claims & Salary Advances for selected month & year */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm card-hover relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500" />
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-500">Claims & Advances</p>
                        <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
                            <Receipt size={18} />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        ₹{(approvedClaimsAmount + approvedAdvanceAmount).toLocaleString("en-IN")}
                    </p>
                    <p className="mt-1 text-xs font-medium text-amber-600">
                        {pendingClaimsCount > 0 ? `${pendingClaimsCount} pending in ${monthNames[monthNum - 1].slice(0, 3)}` : "No pending claims"}
                    </p>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left Column: Attendance Trend, Leaves list, Payslips */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Requirement 5: Corrected Attendance Trend Bar Chart */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-indigo-600" />
                                    Attendance Trend ({yearNum})
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Actual monthly attendance rate for year {yearNum}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 flex h-48 items-end gap-2.5 rounded-xl bg-slate-50 p-4 border border-slate-100">
                            {fullYearTrend.map((item) => (
                                <div key={item.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                    <span className={`text-[10px] font-bold ${item.isSelected ? "text-indigo-700" : "text-slate-600"}`}>
                                        {item.hasData ? `${item.value}%` : "—"}
                                    </span>
                                    <div
                                        className={`w-full max-w-[32px] rounded-t-md transition-all ${item.isSelected
                                            ? "bg-indigo-600 ring-2 ring-indigo-200"
                                            : item.hasData
                                                ? "bg-indigo-400 hover:bg-indigo-500"
                                                : "bg-slate-200"
                                            }`}
                                        style={{ height: `${item.hasData ? Math.max(12, item.value * 0.8) : 4}%` }}
                                        title={`${item.monthName} ${yearNum}: ${item.value}%`}
                                    />
                                    <span className={`text-[11px] font-medium ${item.isSelected ? "font-bold text-indigo-700" : "text-slate-500"}`}>
                                        {item.monthName}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Requirement 8: Leaves Taken (Selected Month & Year) */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <CalendarDays size={18} className="text-amber-600" />
                                    Leaves Taken ({monthNames[monthNum - 1]} {yearNum})
                                </h3>
                                <p className="text-xs text-slate-500">Leave applications for the selected period</p>
                            </div>
                        </div>

                        {selectedMonthLeaves.length === 0 ? (
                            <p className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                                No leave applications found for {monthNames[monthNum - 1]} {yearNum}.
                            </p>
                        ) : (
                            <div className="space-y-2.5">
                                {selectedMonthLeaves.map((l) => (
                                    <div key={l._id || l.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs border border-slate-100">
                                        <div>
                                            <span className="font-semibold text-slate-800 uppercase tracking-wider">{l.type?.replace("_", " ")}</span>
                                            <p className="text-slate-500 mt-0.5">{l.reason || "No reason provided"}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-slate-900">
                                                {l.startDate ? format(new Date(l.startDate), "dd MMM") : "-"}
                                                {l.endDate && l.endDate !== l.startDate ? ` - ${format(new Date(l.endDate), "dd MMM")}` : ""}
                                            </span>
                                            <span className={`block text-[11px] font-semibold ${l.status === "APPROVED" ? "text-emerald-600" : l.status === "REJECTED" ? "text-rose-600" : "text-amber-600"}`}>
                                                {l.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Requirement 10: Payslips History (Only latest single payslip visible) */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <IndianRupee size={18} className="text-emerald-600" />
                                    Latest Payslip Record
                                </h3>
                                <p className="text-xs text-slate-500">Most recently issued salary payslip</p>
                            </div>
                        </div>

                        {singleLatestPayslip.length === 0 ? (
                            <p className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                                No payslip issued for this employee yet.
                            </p>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {singleLatestPayslip.map((p) => (
                                    <div key={p._id || p.id} className="flex items-center justify-between py-3">
                                        <div>
                                            <p className="font-semibold text-slate-900 text-xs">
                                                {format(new Date(p.year, p.month - 1), "MMMM yyyy")}
                                            </p>
                                            <p className="text-[11px] text-slate-500">Gross: ₹{Number(p.grossSalary || 0).toLocaleString("en-IN")}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-slate-900 text-sm">
                                                ₹{Number(p.netSalary || 0).toLocaleString("en-IN")}
                                            </span>
                                            <button
                                                onClick={() => window.open(`/print/payslips/${p._id || p.id}`, "_blank")}
                                                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
                                                title="View / Download Payslip"
                                            >
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: HR Insights and Claims/Advances */}
                <div className="space-y-6">
                    {/* Requirement 6: HR Insights */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    📌 HR Insights ({monthNames[monthNum - 1].slice(0, 3)})
                                </h3>
                                <p className="text-xs text-slate-500">Automated evaluation</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {hrInsights.map((insight, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-start gap-3 rounded-xl p-3.5 border text-xs font-medium ${insight.type === "success"
                                        ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                                        : insight.type === "warning"
                                            ? "bg-amber-50 text-amber-900 border-amber-200"
                                            : insight.type === "error"
                                                ? "bg-rose-50 text-rose-900 border-rose-200"
                                                : "bg-slate-50 text-slate-800 border-slate-200"
                                        }`}
                                >
                                    {insight.type === "success" && (
                                        <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                                    )}
                                    {insight.type === "warning" && (
                                        <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                                    )}
                                    {insight.type === "error" && (
                                        <AlertTriangle size={16} className="text-rose-600 mt-0.5 shrink-0" />
                                    )}
                                    {insight.type === "info" && (
                                        <CheckCircle2 size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                                    )}
                                    <span className="leading-relaxed">{insight.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Requirement 7: Claims & Advances (Filtered for Month & Year) */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                            <WalletCards size={15} className="text-violet-600" />
                            Claims & Salary Advances ({monthNames[monthNum - 1].slice(0, 3)})
                        </h4>

                        {selectedMonthClaims.length === 0 && selectedMonthAdvances.length === 0 ? (
                            <p className="py-4 text-center text-xs text-slate-400">No claims or advance requests for {monthNames[monthNum - 1]} {yearNum}.</p>
                        ) : (
                            <div className="space-y-2 text-xs">
                                {selectedMonthClaims.map((c) => (
                                    <div key={c.id || c._id} className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                                        <div>
                                            <p className="font-semibold text-slate-800">Bill: ₹{c.amount}</p>
                                            <p className="text-[11px] text-slate-500 truncate max-w-[140px]">{c.reason || "Expense Claim"}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : c.status === "REJECTED" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>
                                            {c.status}
                                        </span>
                                    </div>
                                ))}

                                {selectedMonthAdvances.map((a) => (
                                    <div key={a.id || a._id} className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                                        <div>
                                            <p className="font-semibold text-slate-800">Advance: ₹{a.amount}</p>
                                            <p className="text-[11px] text-slate-500 truncate max-w-[140px]">{a.reason || "Salary Advance"}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : a.status === "REJECTED" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>
                                            {a.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDetails;