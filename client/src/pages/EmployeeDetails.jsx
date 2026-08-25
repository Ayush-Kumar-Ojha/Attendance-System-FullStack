import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    CalendarCheck,
    TrendingUp,
    Receipt,
    Building2,
    Mail,
    Phone,
    CalendarDays,
    CheckCircle2,
    AlertTriangle,
    FileText,
    Download,
    IndianRupee,
    WalletCards,
    MessageSquare,
    Clock,
    UserCheck,
    Image as ImageIcon,
} from "lucide-react";
import api from "../api/axios";
import toast from "react-hot-toast";
import Loading from "../components/Loading";
import { format } from "date-fns";

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
    const [userPosts, setUserPosts] = useState([]);
    const [activeTab, setActiveTab] = useState("overview");

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

            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1;

            // 2. Parallel API calls for strict employee-scoped real data
            const [attRes, leaveRes, payRes, claimRes, advRes, postsRes] = await Promise.allSettled([
                api.get(`/reports/attendance/employee/${id}`, { params: { year: currentYear } }),
                api.get("/leave", { params: { employeeId: id } }),
                api.get("/payslip", { params: { employeeId: id } }),
                api.get("/bill-claims", { params: { employeeId: id } }),
                api.get("/advance", { params: { employeeId: id } }),
                api.get("/posts"),
            ]);

            // Handle Attendance Data
            if (attRes.status === "fulfilled") {
                const report = attRes.value.data || {};
                setAttendanceLogs(report.dailyHistory || []);

                // Extract REAL monthly percentage trend array from report if available
                if (report.charts?.monthlyAttendancePercent) {
                    setMonthlyTrendData(report.charts.monthlyAttendancePercent);
                } else if (report.dailyHistory) {
                    // Compute real attendance % per month from history
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
                setLeaves(leaveRes.value.data?.data || []);
            }

            // Handle Payslips Data
            if (payRes.status === "fulfilled") {
                const list = payRes.value.data?.data || payRes.value.data || [];
                setPayslips(Array.isArray(list) ? list : []);
            }

            // Handle Bill Claims Data
            if (claimRes.status === "fulfilled") {
                setBillClaims(claimRes.value.data?.data || []);
            }

            // Handle Salary Advances Data
            if (advRes.status === "fulfilled") {
                setAdvances(advRes.value.data?.data || []);
            }

            // Handle Wall Posts Data (Filter for this author)
            if (postsRes.status === "fulfilled") {
                const allPosts = postsRes.value.data?.data || [];
                const empPosts = allPosts.filter(
                    (p) => p.author?.id === id || p.employeeId === id
                );
                setUserPosts(empPosts);
            }
        } catch (error) {
            console.error("Error loading employee full profile:", error);
            toast.error("Failed to load employee details");
        } font: {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchEmployeeData();
    }, [fetchEmployeeData]);

    // REAL STATISTICS COMPUTATION
    const stats = useMemo(() => {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        // 1. Leaves Taken THIS MONTH ONLY
        const currentMonthLeaves = leaves.filter((l) => {
            if (l.status !== "APPROVED") return false;
            const start = new Date(l.startDate);
            return start.getMonth() === currentMonth && start.getFullYear() === currentYear;
        });

        const leaveDaysThisMonth = currentMonthLeaves.reduce((acc, l) => {
            if (l.type === "HALF_DAY") return acc + 0.5;
            const start = new Date(l.startDate);
            const end = new Date(l.endDate);
            const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
            return acc + (diff > 0 ? diff : 1);
        }, 0);

        // All-time approved leaves count
        const totalLeavesTaken = leaves
            .filter((l) => l.status === "APPROVED")
            .reduce((acc, l) => {
                if (l.type === "HALF_DAY") return acc + 0.5;
                const start = new Date(l.startDate);
                const end = new Date(l.endDate);
                const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
                return acc + (diff > 0 ? diff : 1);
            }, 0);

        // 2. Real Net Salary & Increments
        const latestPayslip = payslips.length > 0 ? payslips[0] : null;
        const previousPayslip = payslips.length > 1 ? payslips[1] : null;

        let netSalary = employee?.basicSalary || 0;
        let salaryIncrease = 0;

        if (latestPayslip?.netSalary) {
            netSalary = Number(latestPayslip.netSalary);
            if (previousPayslip?.netSalary) {
                const prev = Number(previousPayslip.netSalary);
                if (prev > 0) {
                    salaryIncrease = Math.round(((netSalary - prev) / prev) * 100);
                }
            }
        }

        // 3. Real Claims & Advances
        const pendingBillClaims = billClaims.filter((c) => c.status === "PENDING");
        const approvedBillClaimsAmount = billClaims
            .filter((c) => c.status === "APPROVED")
            .reduce((sum, c) => sum + Number(c.amount || 0), 0);

        const pendingAdvances = advances.filter((a) => a.status === "PENDING");
        const totalAdvanceAmount = advances
            .filter((a) => a.status === "APPROVED")
            .reduce((sum, a) => sum + Number(a.amount || 0), 0);

        // 4. Real Attendance Percentage Calculation
        let attendancePercent = 0;
        if (attendanceLogs.length > 0) {
            const presentCount = attendanceLogs.filter(
                (log) => log.status === "PRESENT" || log.status === "HALF_DAY"
            ).length;
            attendancePercent = Math.round((presentCount / attendanceLogs.length) * 100);
        } else if (employee?.attendancePercent !== undefined) {
            attendancePercent = employee.attendancePercent;
        }

        return {
            attendancePercent,
            leaveDaysThisMonth,
            totalLeavesTaken,
            netSalary,
            salaryIncrease,
            pendingClaimsCount: pendingBillClaims.length + pendingAdvances.length,
            approvedBillClaimsAmount,
            totalAdvanceAmount,
            currentMonthLeavesList: currentMonthLeaves,
        };
    }, [employee, leaves, payslips, billClaims, advances, attendanceLogs]);

    // Filter Real Monthly Trend (Only display months since employee joined)
    const realMonthlyTrend = useMemo(() => {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const joinMonth = employee?.joinDate ? new Date(employee.joinDate).getMonth() + 1 : 1;
        const currentMonth = new Date().getMonth() + 1;

        if (monthlyTrendData.length === 0) {
            return [];
        }

        return monthlyTrendData
            .filter((item) => item.month >= joinMonth && item.month <= currentMonth)
            .map((item) => ({
                monthName: monthNames[item.month - 1] || `M${item.month}`,
                value: item.value ?? 0,
            }));
    }, [monthlyTrendData, employee]);

    // Real HR Insights Checklist
    const hrInsights = useMemo(() => {
        const insights = [];

        if (attendanceLogs.length === 0) {
            insights.push({
                type: "info",
                text: "No attendance records registered yet for this employee",
            });
        } else if (stats.attendancePercent >= 90) {
            insights.push({
                type: "success",
                text: `Attendance is consistently good (${stats.attendancePercent}%)`,
            });
        } else if (stats.attendancePercent >= 75) {
            insights.push({
                type: "warning",
                text: `Attendance is moderate (${stats.attendancePercent}%)`,
            });
        } else {
            insights.push({
                type: "error",
                text: `Low attendance recorded (${stats.attendancePercent}%)`,
            });
        }

        if (stats.leaveDaysThisMonth > 3) {
            insights.push({
                type: "warning",
                text: `${stats.leaveDaysThisMonth} leave days taken this month`,
            });
        } else {
            insights.push({
                type: "success",
                text: "No unusual leave pattern detected this month",
            });
        }

        if (stats.pendingClaimsCount > 0) {
            insights.push({
                type: "warning",
                text: `⚠ ${stats.pendingClaimsCount} claim / advance request(s) pending`,
            });
        } else {
            insights.push({
                type: "success",
                text: "All expense claims and advances are processed",
            });
        }

        if (stats.salaryIncrease > 0) {
            insights.push({
                type: "success",
                text: `Salary increased ${stats.salaryIncrease}% in recent payslips`,
            });
        } else {
            insights.push({
                type: "info",
                text: "Standard active payroll baseline",
            });
        }

        return insights;
    }, [stats, attendanceLogs]);

    if (loading) return <Loading />;

    const fullName = `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim() || "Employee";
    const initials = fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    // Profile Photo URL (Checks Settings uploaded image first)
    const avatarUrl = employee?.profilePicture || employee?.avatar || employee?.image || null;

    return (
        <div className="animate-fade-in-up pb-10 space-y-6">
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate("/dashboard")}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
                >
                    <ArrowLeft size={16} />
                    Back to Dashboard
                </button>
            </div>

            {/* Profile Header Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-5">
                        {/* Real Profile Picture or Initials Badge */}
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
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold ${
                                        employee?.isDeleted
                                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    }`}
                                >
                                    <span
                                        className={`h-2 w-2 rounded-full ${
                                            employee?.isDeleted ? "bg-rose-500" : "bg-emerald-500 animate-pulse"
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
                            onClick={() => setActiveTab("overview")}
                            className={`rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
                                activeTab === "overview"
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >
                            Overview 360°
                        </button>
                    </div>
                </div>
            </div>

            {/* 4 Real Metrics Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Real Attendance Metric */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm card-hover relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-500">Attendance</p>
                        <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                            <CalendarCheck size={18} />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        {attendanceLogs.length > 0 ? `${stats.attendancePercent}%` : "0%"}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                        {attendanceLogs.length > 0 ? `${attendanceLogs.length} total workdays logged` : "No attendance logs yet"}
                    </p>
                </div>

                {/* Real Leave Metric (This Month & Total) */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm card-hover relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-500">Leaves Taken</p>
                        <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                            <CalendarDays size={18} />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        {stats.leaveDaysThisMonth} <span className="text-xs font-normal text-slate-500">days this month</span>
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                        Total Leaves: <strong className="text-slate-800">{stats.totalLeavesTaken} days</strong>
                    </p>
                </div>

                {/* Real Payroll Metric */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm card-hover relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-500">Payroll / Salary</p>
                        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                            <IndianRupee size={18} />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        ₹{stats.netSalary.toLocaleString("en-IN")}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                        {payslips.length > 0 ? `${payslips.length} payslips issued` : "No payslips issued yet"}
                    </p>
                </div>

                {/* Real Bill Claims & Advances Metric */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm card-hover relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500" />
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-500">Claims & Advances</p>
                        <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
                            <Receipt size={18} />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        ₹{(stats.approvedBillClaimsAmount + stats.totalAdvanceAmount).toLocaleString("en-IN")}
                    </p>
                    <p className="mt-1 text-xs font-medium text-amber-600">
                        {stats.pendingClaimsCount > 0 ? `${stats.pendingClaimsCount} pending approval` : "No pending claims"}
                    </p>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left Column: Real Attendance & Real Payslips/Leaves */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Real Attendance Trend Chart */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-indigo-600" />
                                    Attendance Trend
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Actual monthly attendance since joining ({employee?.joinDate ? format(new Date(employee.joinDate), "MMM yyyy") : "N/A"})
                                </p>
                            </div>
                        </div>

                        {realMonthlyTrend.length === 0 ? (
                            <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                                No attendance history available yet for this employee.
                            </div>
                        ) : (
                            <div className="mt-4 flex h-48 items-end gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
                                {realMonthlyTrend.map((item) => (
                                    <div key={item.monthName} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                        <span className="text-[11px] font-semibold text-slate-700">{item.value}%</span>
                                        <div
                                            className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all hover:from-indigo-700 hover:to-indigo-500"
                                            style={{ height: `${Math.max(4, item.value)}%` }}
                                            title={`${item.monthName}: ${item.value}%`}
                                        />
                                        <span className="text-xs font-medium text-slate-500">{item.monthName}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Leaves Taken This Month */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <CalendarDays size={18} className="text-amber-600" />
                                    Leaves Taken This Month ({format(new Date(), "MMMM yyyy")})
                                </h3>
                                <p className="text-xs text-slate-500">Approved leaves in the current month</p>
                            </div>
                        </div>

                        {stats.currentMonthLeavesList.length === 0 ? (
                            <p className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                                No leaves taken this month.
                            </p>
                        ) : (
                            <div className="space-y-2.5">
                                {stats.currentMonthLeavesList.map((l) => (
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
                                            <span className="block text-[11px] text-emerald-600 font-medium">Approved</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Real Payroll History */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <IndianRupee size={18} className="text-emerald-600" />
                                    Payslips History
                                </h3>
                                <p className="text-xs text-slate-500">Disbursed salary records</p>
                            </div>
                        </div>

                        {payslips.length === 0 ? (
                            <p className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                                No payslips generated for this employee yet.
                            </p>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {payslips.map((p) => (
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
                                                title="View Payslip"
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

                {/* Right Column: HR Insights, Claims, Advances, and Wall Posts */}
                <div className="space-y-6">
                    {/* HR Insights Card */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    📌 HR Insights
                                </h3>
                                <p className="text-xs text-slate-500">Automated evaluation</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {hrInsights.map((insight, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-start gap-3 rounded-xl p-3.5 border text-xs font-medium ${
                                        insight.type === "success"
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

                    {/* Bill Claims & Advances */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                            <WalletCards size={15} className="text-violet-600" />
                            Claims & Salary Advances
                        </h4>

                        {billClaims.length === 0 && advances.length === 0 ? (
                            <p className="py-4 text-center text-xs text-slate-400">No claims or advance requests.</p>
                        ) : (
                            <div className="space-y-2 text-xs">
                                {billClaims.map((c) => (
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

                                {advances.map((a) => (
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

                    {/* Recent Community Wall Posts */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                            <MessageSquare size={15} className="text-indigo-600" />
                            Recent Wall Activity
                        </h4>

                        {userPosts.length === 0 ? (
                            <p className="py-4 text-center text-xs text-slate-400">No posts shared by this employee.</p>
                        ) : (
                            <div className="space-y-3">
                                {userPosts.slice(0, 3).map((post) => (
                                    <div key={post.id || post._id} className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-100 space-y-1">
                                        <p className="text-slate-800 font-medium line-clamp-2">"{post.text}"</p>
                                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                                            <span>{post.createdAt ? format(new Date(post.createdAt), "dd MMM yyyy") : "Recently"}</span>
                                            <span>❤️ {post.likes?.length || 0} Likes</span>
                                        </div>
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