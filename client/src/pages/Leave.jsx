import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PlusIcon,
  ThermometerIcon,
  UmbrellaIcon,
  PalmtreeIcon,
  Download,
  Filter,
  Info,
} from "lucide-react";
import * as XLSX from "xlsx";
import Loading from "../components/Loading";
import LeaveHistory from "../components/leave/LeaveHistory";
import ApplyLeaveModal from "../components/leave/ApplyLeaveModal";
import DocumentAttachment from "../components/leave/DocumentAttachment";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import toast from "react-hot-toast";

const getLeaveDays = (leave) => {
  if (leave.type === "HALF_DAY") return 0.5;
  const start = new Date(leave.startDate);
  const end = new Date(leave.endDate);
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

const currentDate = new Date();

const Leave = () => {
  const { user } = useAuth();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [documents, setDocuments] = useState({ HOLIDAY_LIST: null, LEAVE_POLICY: null });

  const isAdmin = user?.role === "ADMIN";

  const [employees, setEmployees] = useState([]);
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState(String(currentDate.getFullYear()));
  const [filterStatus, setFilterStatus] = useState("");
  const [search] = useState("");

  const fetchLeaves = useCallback(async () => {
    try {
      const params = {};

      if (isAdmin) {
        if (filterEmployeeId) params.employeeId = filterEmployeeId;
        if (filterMonth) params.month = filterMonth;
        if (filterYear) params.year = filterYear;
        if (filterStatus) params.status = filterStatus;
      }

      const res = await api.get("/leave", { params });

      setLeaves(res.data.data || []);

      if (res.data.employee?.isDeleted) {
        setIsDeleted(true);
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, filterEmployeeId, filterMonth, filterYear, filterStatus]);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await api.get("/documents");
      setDocuments(res.data);
    } catch (error) {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    if (isAdmin) {
      api
        .get("/employees")
        .then((res) => setEmployees(res.data.filter((e) => !e.isDeleted)))
        .catch(() => {});
    }
  }, [isAdmin]);

  const filteredLeaves = useMemo(() => {
    if (!isAdmin || !search.trim()) return leaves;

    const value = search.toLowerCase();

    return leaves.filter((leave) => {
      const employeeName = `${leave.employee?.firstName || ""} ${leave.employee?.lastName || ""}`.toLowerCase();
      return (
        employeeName.includes(value) ||
        leave.reason?.toLowerCase().includes(value) ||
        leave.type?.toLowerCase().includes(value)
      );
    });
  }, [leaves, search, isAdmin]);

  const availableYears = Array.from({ length: 6 }, (_, i) => currentDate.getFullYear() - i);

  const exportLeaves = () => {
    if (filteredLeaves.length === 0) {
      toast.error("No leave records to export");
      return;
    }

    const rows = filteredLeaves.map((leave) => ({
      "Employee": `${leave.employee?.firstName || ""} ${leave.employee?.lastName || ""}`.trim(),
      "Type": leave.type?.replace("_", " ") || "",
      "Worked Extra Date": leave.workedDate ? new Date(leave.workedDate).toLocaleDateString("en-IN") : "-",
      "Half Day Period": leave.halfDayPeriod ? leave.halfDayPeriod.replace("_", " ") : "",
      "Start Date": leave.startDate ? new Date(leave.startDate).toLocaleDateString("en-IN") : "",
      "End Date": leave.endDate ? new Date(leave.endDate).toLocaleDateString("en-IN") : "",
      "Total Days": getLeaveDays(leave),
      "Reason": leave.reason || "",
      "Status": leave.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = Object.keys(rows[0]).map((k) => ({ wch: Math.max(k.length, 16) }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leave Records");

    const parts = ["leave_records"];
    if (filterStatus) parts.push(filterStatus.toLowerCase());
    if (filterMonth) parts.push(new Date(2000, filterMonth - 1).toLocaleString("en-IN", { month: "short" }).toLowerCase());
    if (filterYear) parts.push(filterYear);

    XLSX.writeFile(workbook, `${parts.join("_")}.xlsx`);
  };

  if (loading) return <Loading />;

  const approvedLeaves = leaves.filter((leave) => leave.status === "APPROVED");
  const sickCount = approvedLeaves.filter((leave) => leave.type === "SICK").length;
  const casualCount = approvedLeaves.filter((leave) => leave.type === "CASUAL").length;
  const annualCount = approvedLeaves.filter((leave) => leave.type === "ANNUAL").length;

  const leaveStats = [
    { label: "Sick Leave", value: sickCount, icon: ThermometerIcon },
    { label: "Casual Leave", value: casualCount, icon: UmbrellaIcon },
    { label: "Annual Leave", value: annualCount, icon: PalmtreeIcon },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">
            {isAdmin ? "Manage leave applications" : "Your leave history and requests"}
          </p>
        </div>

        {!isAdmin && !isDeleted && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <PlusIcon className="w-4 h-4" />
            Apply for Leave
          </button>
        )}

        {isAdmin && (
          <button
            onClick={exportLeaves}
            className="btn-secondary flex items-center gap-2 w-full sm:w-auto justify-center"
            type="button"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <DocumentAttachment
          type="HOLIDAY_LIST"
          label="Holiday List"
          doc={documents.HOLIDAY_LIST}
          isAdmin={isAdmin}
          onUpdate={fetchDocuments}
        />
        <DocumentAttachment
          type="LEAVE_POLICY"
          label="Leave Policy"
          doc={documents.LEAVE_POLICY}
          isAdmin={isAdmin}
          onUpdate={fetchDocuments}
        />
      </div>

      <div className="mb-8 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900 shadow-xs">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-amber-950">Engineers working in client location:</strong> Leaves and holidays for on-site / client-deployed employees are applicable as per the respective client's location guidelines and project schedule.
        </p>
      </div>

      {!isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-5 mb-8">
          {leaveStats.map((stat) => (
            <div
              key={stat.label}
              className="card card-hover p-5 sm:p-6 flex items-center gap-4 relative overflow-hidden group"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-slate-500/70 group-hover:bg-indigo-500" />
              <div className="p-3 bg-slate-100 rounded-lg group-hover:bg-indigo-50 transition-colors duration-200">
                <stat.icon className="w-5 h-5 text-slate-600 group-hover:text-indigo-600 transition-colors duration-200" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 tracking-tight">
                  {stat.value}{" "}
                  <span className="text-sm font-normal text-slate-400">taken</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="card p-4 mb-6">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={18} className="text-slate-500" />
            <h2 className="font-semibold text-slate-900">Filters</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp._id || emp.id} value={emp._id || emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>

            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="">All Months</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString("en-IN", { month: "long" })}
                </option>
              ))}
            </select>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      )}

      <LeaveHistory
        leaves={filteredLeaves}
        isAdmin={isAdmin}
        onUpdate={fetchLeaves}
      />

      <ApplyLeaveModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchLeaves}
        leaves={leaves}
      />
    </div>
  );
};

export default Leave;