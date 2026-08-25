import { useCallback, useEffect, useState } from "react";
import { Plus, Search, X, Download } from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import EmployeeCard from "../components/EmployeeCard";
import EmployeeForm from "../components/EmployeeForm";
import AddDepartmentModal from "../components/AddDepartmentModal";
import { useDepartments } from "../hooks/useDepartments";
import api from "../api/axios";

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);

  const { departments, addDepartment } = useDepartments();

  const fetchEmployees = useCallback(async () => {
    setLoading(true);

    try {
      const url = selectedDept
        ? `/employees?department=${selectedDept}`
        : "/employees";

      const res = await api.get(url);
      setEmployees(res.data);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDept]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const filtered = employees.filter((emp) =>
    `${emp.firstName} ${emp.lastName} ${emp.position}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const exportEmployees = () => {
    if (employees.length === 0) {
      toast.error("No employees to export");
      return;
    }

    const customLabels = [];
    employees.forEach((emp) => {
      (Array.isArray(emp.customFields) ? emp.customFields : []).forEach((f) => {
        if (!customLabels.includes(f.label)) customLabels.push(f.label);
      });
    });

    const rows = employees.map((emp) => {
      const base = {
        "Employee Code": emp.employeeCode || "",
        "First Name": emp.firstName || "",
        "Last Name": emp.lastName || "",
        "Gender": emp.gender || "",
        "Marital Status": emp.maritalStatus || "",
        "Email": emp.email || "",
        "Phone": emp.phone || "",
        "Department": emp.department || "",
        "Designation": emp.position || "",
        "Basic Salary": emp.basicSalary ?? "",
        "Allowances": emp.allowances ?? "",
        "Deductions": emp.deductions ?? "",
        "Join Date": emp.joinDate ? new Date(emp.joinDate).toLocaleDateString("en-IN") : "",
        "Confirmation Date": emp.confirmationDate ? new Date(emp.confirmationDate).toLocaleDateString("en-IN") : "",
        "Aadhaar Number": emp.aadharNumber || "",
        "Bank Name": emp.bankName || "",
        "Bank Account Number": emp.bankAccountNumber || "",
        "UAN Number": emp.uanNumber || "",
        "PAN Number": emp.panNumber || "",
        "Status": emp.employmentStatus || "",
        "System Role": emp.user?.role || "",
      };

      customLabels.forEach((label) => {
        const match = (Array.isArray(emp.customFields) ? emp.customFields : []).find((f) => f.label === label);
        base[label] = match ? match.value : "";
      });

      return base;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = Object.keys(rows[0]).map((k) => ({ wch: Math.max(k.length, 16) }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");

    XLSX.writeFile(workbook, `employees_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="animate-fade-in-up">
      {/* Header with Left-to-Right Title Slide Animation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="page-title animate-title-slide">Employees</h1>
          <p className="page-subtitle">Manage your team members</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={exportEmployees}
            className="btn-secondary flex items-center gap-2 justify-center"
            type="button"
          >
            <Download size={16} />
            Download
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2 justify-center"
            type="button"
          >
            <Plus size={16} />
            Add Employee
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />

          <input
            placeholder="Search employees..."
            className="w-full pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="max-w-40"
        >
          <option value="">All Departments</option>

          {departments.map((deptName) => (
            <option key={deptName} value={deptName}>
              {deptName}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowAddDeptModal(true)}
          className="btn-secondary flex items-center gap-2 whitespace-nowrap"
          type="button"
        >
          <Plus size={16} />
          Add Department
        </button>
      </div>

      {/* Employee Cards */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filtered.length === 0 ? (
            <p className="col-span-full text-center py-16 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
              No employees found
            </p>
          ) : (
            filtered.map((emp) => (
              <EmployeeCard
                key={emp.id}
                employee={emp}
                onDelete={fetchEmployees}
                onEdit={setEditEmployee}
              />
            ))
          )}
        </div>
      )}

      {/* Create Employee Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-black/40 backdrop-blur-sm"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 pb-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Add New Employee
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Create a user account and employee profile
                </p>
              </div>

              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <EmployeeForm
                onSuccess={() => {
                  setShowCreateModal(false);
                  fetchEmployees();
                }}
                onCancel={() => setShowCreateModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editEmployee && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-black/40 backdrop-blur-sm"
          onClick={() => setEditEmployee(null)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 pb-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Edit Employee
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Update employee details
                </p>
              </div>

              <button
                onClick={() => setEditEmployee(null)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <EmployeeForm
                initialData={editEmployee}
                onSuccess={() => {
                  setEditEmployee(null);
                  fetchEmployees();
                }}
                onCancel={() => setEditEmployee(null)}
              />
            </div>
          </div>
        </div>
      )}

      <AddDepartmentModal
        open={showAddDeptModal}
        onClose={() => setShowAddDeptModal(false)}
        onAdd={addDepartment}
      />
    </div>
  );
};

export default Employees;