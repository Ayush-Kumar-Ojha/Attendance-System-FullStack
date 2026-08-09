import { useState, useCallback, useEffect, useMemo } from "react";
import Loading from "../components/Loading";
import PayslipList from "../components/payslip/PayslipList";
import GeneratePayslipForm from "../components/payslip/GeneratePayslipForm";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import toast from "react-hot-toast";
import { Search, Filter } from "lucide-react";

const Payslips = () => {
    const [payslips, setPayslips] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    // Filters
    const [filterEmployeeId, setFilterEmployeeId] = useState("");
    const [filterMonth, setFilterMonth] = useState("");
    const [filterYear, setFilterYear] = useState("");

    const fetchPayslips = useCallback(async () => {
        try {
            const res = await api.get("/payslip");
            setPayslips(res.data.data || res.data || []);
        } catch (error) {
            toast.error(error?.response?.data?.error || error?.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPayslips();
    }, [fetchPayslips]);

    useEffect(() => {
        if (isAdmin)
            api
                .get("/employees")
                .then((res) => setEmployees(res.data.filter((e) => !e.isDeleted)))
                .catch(() => { });
    }, [isAdmin]);

    const filteredPayslips = useMemo(() => {
        return payslips.filter((p) => {
            const empId = p.employee?._id || p.employee?.id || p.employeeId;
            if (filterEmployeeId && empId !== filterEmployeeId) return false;
            if (filterMonth && Number(p.month) !== Number(filterMonth)) return false;
            if (filterYear && Number(p.year) !== Number(filterYear)) return false;
            return true;
        });
    }, [payslips, filterEmployeeId, filterMonth, filterYear]);

    const availableYears = useMemo(() => {
        const years = new Set(payslips.map((p) => p.year));
        const currentYear = new Date().getFullYear();
        // Show current year + last 10 years, regardless of existing payslip data
        for (let y = currentYear; y >= currentYear - 10; y--) {
            years.add(y);
        }
        return Array.from(years).sort((a, b) => b - a);
    }, [payslips]);

    if (loading) return <Loading />;

    return (
        <div className="animate-fade-in p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Payslips</h1>
                    <p className="text-sm text-slate-500">
                        {isAdmin
                            ? "Generate and manage employee payslips"
                            : "Your payslip history - Select month/year to view or download"}
                    </p>
                </div>

                {isAdmin && (
                    <GeneratePayslipForm employees={employees} onSuccess={fetchPayslips} />
                )}
            </div>

            {/* Filter Controls (Available for Admin & Employees) */}
            <div className="card p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <Filter className="w-4 h-4 text-indigo-600" /> Filter By:
                </div>

                {isAdmin && (
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                            value={filterEmployeeId}
                            onChange={(e) => setFilterEmployeeId(e.target.value)}
                            className="pl-9 w-full border border-slate-300 rounded-lg py-2 text-sm bg-slate-50 focus:bg-white outline-none"
                        >
                            <option value="">All Employees</option>
                            {employees.map((e) => (
                                <option key={e._id || e.id} value={e._id || e.id}>
                                    {e.firstName} {e.lastName}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Month Filter */}
                <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="sm:w-40 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white outline-none"
                >
                    <option value="">All Months</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                            {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
                        </option>
                    ))}
                </select>

                {/* Year Filter */}
                <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="sm:w-32 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white outline-none"
                >
                    <option value="">All Years</option>
                    {availableYears.map((y) => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>

                {(filterEmployeeId || filterMonth || filterYear) && (
                    <button
                        onClick={() => {
                            setFilterEmployeeId("");
                            setFilterMonth("");
                            setFilterYear("");
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium underline"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {/* Payslip List Table */}
            <PayslipList payslips={filteredPayslips} isAdmin={isAdmin} />
        </div>
    );
};

export default Payslips;