import { useState, useEffect, useCallback } from "react";
import { BarChart3, Users, CalendarCheck, CalendarX, TrendingUp, Download } from "lucide-react";
import api from "../api/axios";
import toast from "react-hot-toast";
import Loading from "../components/Loading";

const Reports = () => {
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);

    const [filterEmployeeId, setFilterEmployeeId] = useState("");
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());

    const [report, setReport] = useState(null);
    const [fetchingReport, setFetchingReport] = useState(false);

    useEffect(() => {
        api.get("/employees")
            .then((res) => setEmployees(res.data.filter((e) => !e.isDeleted)))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const fetchReport = useCallback(async () => {
        setFetchingReport(true);
        try {
            const params = new URLSearchParams({
                month: filterMonth,
                year: filterYear,
            });
            if (filterEmployeeId) params.append("employeeId", filterEmployeeId);

            const res = await api.get(`/reports/attendance?${params.toString()}`);
            setReport(res.data);
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message);
        } finally {
            setFetchingReport(false);
        }
    }, [filterEmployeeId, filterMonth, filterYear]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const availableYears = (() => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let y = currentYear; y >= currentYear - 5; y--) years.push(y);
        return years;
    })();

    if (loading) return <Loading />;

    const isIndividual = !!filterEmployeeId;
    const summary = report?.summary;

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="page-title">Attendance Reports</h1>
                    <p className="page-subtitle">
                        {isIndividual
                            ? "Individual employee attendance summary"
                            : "Overall attendance across your organization"}
                    </p>
                </div>

                <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200 print:hidden"
                >
                    <Download className="w-4 h-4" />
                    Download
                </button>
            </div>

            {/* Filters */}
            <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-center print:hidden">
                <select
                    value={filterEmployeeId}
                    onChange={(e) => setFilterEmployeeId(e.target.value)}
                    className="sm:w-56"
                >
                    <option value="">All Employees (Overview)</option>
                    {employees.map((e) => (
                        <option key={e._id || e.id} value={e._id || e.id}>
                            {e.firstName} {e.lastName}
                        </option>
                    ))}
                </select>

                <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(Number(e.target.value))}
                    className="sm:w-40"
                >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                            {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
                        </option>
                    ))}
                </select>

                <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(Number(e.target.value))}
                    className="sm:w-32"
                >
                    {availableYears.map((y) => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>
            </div>

            {fetchingReport || !report ? (
                <Loading />
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
                        <div className="card p-5 sm:p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Total Working Days</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{summary.totalWorkingDays}</p>
                            </div>
                            <BarChart3 className="size-9 p-2 rounded-lg bg-slate-100 text-slate-600" />
                        </div>

                        <div className="card p-5 sm:p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">
                                    {isIndividual ? "Days Present" : "Total Present (All Employees)"}
                                </p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{summary.daysPresent}</p>
                            </div>
                            <CalendarCheck className="size-9 p-2 rounded-lg bg-emerald-50 text-emerald-600" />
                        </div>

                        <div className="card p-5 sm:p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">
                                    {isIndividual ? "Days Absent" : "Total Absent (All Employees)"}
                                </p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{summary.daysAbsent}</p>
                            </div>
                            <CalendarX className="size-9 p-2 rounded-lg bg-rose-50 text-rose-600" />
                        </div>

                        <div className="card p-5 sm:p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Attendance %</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{summary.attendancePercent}%</p>
                            </div>
                            <TrendingUp className="size-9 p-2 rounded-lg bg-indigo-50 text-indigo-600" />
                        </div>
                    </div>

                    {/* Metric Table (matches the simple format requested) */}
                    <div className="card overflow-hidden mb-8">
                        <div className="px-6 py-4 border-b border-slate-100">
                            <h2 className="font-medium text-slate-900">Summary</h2>
                        </div>
                        <table className="table-modern">
                            <thead>
                                <tr>
                                    <th>Metric</th>
                                    <th>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="text-slate-700">Total Working Days</td>
                                    <td className="text-slate-900 font-medium">{summary.totalWorkingDays}</td>
                                </tr>
                                <tr>
                                    <td className="text-slate-700">Days Present</td>
                                    <td className="text-slate-900 font-medium">{summary.daysPresent}</td>
                                </tr>
                                <tr>
                                    <td className="text-slate-700">Days Absent</td>
                                    <td className="text-slate-900 font-medium">{summary.daysAbsent}</td>
                                </tr>
                                <tr>
                                    <td className="text-slate-700">Attendance %</td>
                                    <td className="text-slate-900 font-medium">{summary.attendancePercent}%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Per-employee breakdown (overview mode only) */}
                    {!isIndividual && report.perEmployee && (
                        <div className="card overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h2 className="font-medium text-slate-900 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-slate-400" />
                                    Per-Employee Breakdown
                                </h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="table-modern">
                                    <thead>
                                        <tr>
                                            <th>Employee</th>
                                            <th>Days Present</th>
                                            <th>Days Absent</th>
                                            <th>Attendance %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.perEmployee.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="text-center py-12 text-slate-400">
                                                    No data found
                                                </td>
                                            </tr>
                                        ) : (
                                            report.perEmployee.map((emp) => (
                                                <tr key={emp.employeeId}>
                                                    <td className="text-slate-900">{emp.name}</td>
                                                    <td className="text-slate-600">{emp.daysPresent}</td>
                                                    <td className="text-slate-600">{emp.daysAbsent}</td>
                                                    <td className="text-slate-600">{emp.attendancePercent}%</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Reports;