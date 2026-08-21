import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDepartments } from "../hooks/useDepartments";
import { Loader2Icon } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios";

const EmployeeForm = ({
    initialData,
    onSuccess,
    onCancel,
}) => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);

    const { departments } = useDepartments();

    const isEditMode = !!initialData;

    const optional = " (Optional)";

    // ==========================================
    // Convert stored firstName + lastName
    // into one Employee Name field
    // ==========================================

    const employeeName = initialData
        ? `${initialData.firstName || ""} ${initialData.lastName || ""}`.trim()
        : "";

    // ==========================================
    // Format date for input[type=date]
    // ==========================================

    const formatDate = (date) => {
        if (!date) return "";

        try {
            return new Date(date)
                .toISOString()
                .split("T")[0];
        } catch {
            return "";
        }
    };

    // ==========================================
    // Submit
    // ==========================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        setLoading(true);

        const formData = new FormData(e.currentTarget);

        const data = Object.fromEntries(
            formData.entries()
        );

        // ==========================================
        // Split Employee Name
        // ==========================================

        const fullName = data.employeeName
            ?.trim()
            .replace(/\s+/g, " ");

        if (!fullName) {
            toast.error("Employee name is required");
            setLoading(false);
            return;
        }

        const nameParts = fullName.split(" ");

        data.firstName = nameParts[0];

        data.lastName =
            nameParts.slice(1).join(" ") || "-";

        delete data.employeeName;

        // ==========================================
        // Don't send empty password while editing
        // ==========================================

        if (isEditMode && !data.password) {
            delete data.password;
        }

        try {
            const url = isEditMode
                ? `/employees/${initialData.id}`
                : "/employees";

            const method = isEditMode
                ? "put"
                : "post";

            await api[method](url, data);

            toast.success(
                isEditMode
                    ? "Employee updated successfully"
                    : "Employee created successfully"
            );

            if (onSuccess) {
                onSuccess();
            } else {
                navigate("/employees");
            }
        } catch (error) {
            console.error(
                "Employee submit error:",
                error
            );

            toast.error(
                error.response?.data?.error ||
                error.message ||
                "Something went wrong"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-6 max-w-3xl animate-fade-in"
        >

            {/* ================================================= */}
            {/* PERSONAL INFORMATION */}
            {/* ================================================= */}

            <div className="card p-5 sm:p-6">

                <h3 className="font-medium mb-6 pb-4 border-b border-slate-100">
                    Personal Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm text-slate-700">

                    {/* Employee Code */}

                    <div>
                        <label className="block mb-2">
                            Employee Code
                        </label>

                        <input
                            name="employeeCode"
                            required
                            placeholder="e.g. EMP001"
                            defaultValue={
                                initialData?.employeeCode ||
                                ""
                            }
                        />
                    </div>

                    {/* Employee Name */}

                    <div>
                        <label className="block mb-2">
                            Employee Name
                        </label>

                        <input
                            name="employeeName"
                            required
                            placeholder="Enter full name"
                            defaultValue={employeeName}
                        />
                    </div>

                    {/* Gender */}

                    <div>
                        <label className="block mb-2">
                            Gender
                        </label>

                        <select
                            name="gender"
                            required
                            defaultValue={
                                initialData?.gender || ""
                            }
                        >
                            <option value="">
                                Select Gender
                            </option>

                            <option value="MALE">
                                Male
                            </option>

                            <option value="FEMALE">
                                Female
                            </option>

                            <option value="OTHER">
                                Other
                            </option>
                        </select>
                    </div>

                    {/* Marital Status */}

                    <div>
                        <label className="block mb-2">
                            Marital Status{optional}
                        </label>

                        <select
                            name="maritalStatus"
                            defaultValue={
                                initialData?.maritalStatus ||
                                ""
                            }
                        >
                            <option value="">
                                Select Marital Status
                            </option>

                            <option value="SINGLE">
                                Single
                            </option>

                            <option value="MARRIED">
                                Married
                            </option>

                            <option value="DIVORCED">
                                Divorced
                            </option>

                            <option value="WIDOWED">
                                Widowed
                            </option>
                        </select>
                    </div>

                    {/* Email */}

                    <div>
                        <label className="block mb-2">
                            Email ID
                        </label>

                        <input
                            type="email"
                            name="email"
                            required
                            placeholder="employee@company.com"
                            defaultValue={
                                initialData?.email || ""
                            }
                        />
                    </div>

                    {/* Phone */}

                    <div>
                        <label className="block mb-2">
                            Phone Number
                        </label>

                        <input
                            name="phone"
                            required
                            placeholder="Enter phone number"
                            defaultValue={
                                initialData?.phone || ""
                            }
                        />
                    </div>

                    {/* Birth Date */}

                    <div>
                        <label className="block mb-2">
                            Birth Date{optional}
                        </label>

                        <input
                            type="date"
                            name="dateOfBirth"
                            defaultValue={formatDate(
                                initialData?.dateOfBirth
                            )}
                        />
                    </div>

                    {/* Joining Date */}

                    <div>
                        <label className="block mb-2">
                            Joining Date
                        </label>

                        <input
                            type="date"
                            name="joinDate"
                            required
                            defaultValue={formatDate(
                                initialData?.joinDate
                            )}
                        />
                    </div>

                    {/* Confirmation Date */}

                    <div>
                        <label className="block mb-2">
                            Confirmation Date{optional}
                        </label>

                        <input
                            type="date"
                            name="confirmationDate"
                            defaultValue={formatDate(
                                initialData?.confirmationDate
                            )}
                        />
                    </div>

                    {/* Aadhaar */}

                    <div>
                        <label className="block mb-2">
                            Aadhaar Number
                        </label>

                        <input
                            name="aadharNumber"
                            required
                            inputMode="numeric"
                            maxLength={12}
                            placeholder="12 digit Aadhaar number"
                            defaultValue={
                                initialData?.aadharNumber ||
                                ""
                            }
                        />
                    </div>

                    {/* Bio */}

                    <div className="sm:col-span-2">

                        <label className="block mb-2">
                            Bio{optional}
                        </label>

                        <textarea
                            name="bio"
                            rows={3}
                            defaultValue={
                                initialData?.bio || ""
                            }
                            className="resize-none"
                            placeholder="Brief description..."
                        />

                    </div>

                </div>
            </div>


            {/* ================================================= */}
            {/* BANK & STATUTORY DETAILS */}
            {/* ================================================= */}

            <div className="card p-5 sm:p-6">

                <h3 className="font-medium mb-6 pb-4 border-b border-slate-100">
                    Bank & Statutory Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm text-slate-700">

                    {/* Bank Name */}

                    <div>
                        <label className="block mb-2">
                            Bank Name
                        </label>

                        <input
                            name="bankName"
                            required
                            placeholder="e.g. Bank of India"
                            defaultValue={
                                initialData?.bankName || ""
                            }
                        />
                    </div>

                    {/* Bank Account Number */}

                    <div>
                        <label className="block mb-2">
                            Bank Account Number
                        </label>

                        <input
                            name="bankAccountNumber"
                            required
                            inputMode="numeric"
                            placeholder="Enter bank account number"
                            defaultValue={
                                initialData?.bankAccountNumber || ""
                            }
                        />
                    </div>

                    {/* UAN Number */}

                    <div>
                        <label className="block mb-2">
                            UAN Number
                        </label>

                        <input
                            name="uanNumber"
                            required
                            inputMode="numeric"
                            maxLength={12}
                            placeholder="12 digit UAN number"
                            defaultValue={
                                initialData?.uanNumber || ""
                            }
                        />
                    </div>

                    {/* PAN Number */}

                    <div>
                        <label className="block mb-2">
                            PAN Number
                        </label>

                        <input
                            name="panNumber"
                            required
                            maxLength={10}
                            style={{ textTransform: "uppercase" }}
                            placeholder="e.g. ABCDE1234F"
                            defaultValue={
                                initialData?.panNumber || ""
                            }
                        />
                    </div>

                </div>
            </div>


            {/* ================================================= */}
            {/* EMPLOYEE PROFILE */}
            {/* ================================================= */}

            {isEditMode &&
                (
                    initialData?.image ||
                    initialData?.skills?.length > 0 ||
                    initialData?.cvUrl
                ) && (

                    <div className="card p-5 sm:p-6">

                        <h3 className="text-base font-medium text-slate-900 mb-6 pb-4 border-b border-slate-100">
                            Employee Profile (Self-Managed)
                        </h3>

                        <div className="space-y-5 text-sm text-slate-700">

                            {/* Photo */}

                            {initialData?.image && (
                                <div>

                                    <label className="block mb-2 text-slate-600">
                                        Photo
                                    </label>

                                    <img
                                        src={
                                            initialData.image
                                        }
                                        alt="Employee"
                                        className="w-16 h-16 rounded-full object-cover border border-slate-200"
                                    />

                                </div>
                            )}

                            {/* Skills */}

                            {initialData?.skills?.length >
                                0 && (

                                    <div>

                                        <label className="block mb-2 text-slate-600">
                                            Skills
                                        </label>

                                        <div className="flex flex-wrap gap-2">

                                            {initialData.skills.map(
                                                (skill) => (
                                                    <span
                                                        key={skill}
                                                        className="inline-block bg-indigo-50 text-indigo-700 text-xs px-3 py-1 rounded-full"
                                                    >
                                                        {skill}
                                                    </span>
                                                )
                                            )}

                                        </div>

                                    </div>
                                )}

                            {/* CV */}

                            {initialData?.cvUrl && (
                                <div>

                                    <label className="block mb-2 text-slate-600">
                                        CV / Resume
                                    </label>

                                    {initialData.cvUrl.startsWith(
                                        "http"
                                    ) ? (
                                        <a
                                            href={
                                                initialData.cvUrl
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium underline"
                                        >
                                            {
                                                initialData.cvFileName ||
                                                "View CV"
                                            }
                                        </a>
                                    ) : (
                                        <p className="text-sm text-amber-600">
                                            This CV was uploaded before a system update and needs to be re-uploaded by the employee.
                                        </p>
                                    )}

                                </div>
                            )}

                            <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
                                These fields are managed by the employee via their own Settings page.
                            </p>

                        </div>

                    </div>
                )}


            {/* ================================================= */}
            {/* EMPLOYMENT DETAILS */}
            {/* ================================================= */}

            <div className="card p-5 sm:p-6">

                <h3 className="text-base font-medium text-slate-900 mb-6 pb-4 border-b border-slate-100">
                    Employment Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm text-slate-700">

                    {/* Department */}

                    <div>

                        <label className="block mb-2">
                            Department
                        </label>

                        <select
                            name="department"
                            defaultValue={
                                initialData?.department ||
                                ""
                            }
                        >

                            <option value="">
                                Select Department
                            </option>

                            {departments.map(
                                (deptName) => (
                                    <option
                                        key={deptName}
                                        value={deptName}
                                    >
                                        {deptName}
                                    </option>
                                )
                            )}

                        </select>

                    </div>

                    {/* Designation */}

                    <div>

                        <label className="block mb-2">
                            Designation
                        </label>

                        <input
                            name="position"
                            required
                            placeholder="e.g. Software Developer"
                            defaultValue={
                                initialData?.position ||
                                ""
                            }
                        />

                    </div>

                    {/* Basic Salary */}

                    <div>

                        <label className="block mb-2">
                            Basic Salary
                        </label>

                        <input
                            type="number"
                            name="basicSalary"
                            required
                            min="0"
                            step="0.01"
                            defaultValue={
                                initialData?.basicSalary ??
                                0
                            }
                        />

                    </div>

                    {/* Allowances */}

                    <div>

                        <label className="block mb-2">
                            Allowances
                        </label>

                        <input
                            type="number"
                            name="allowances"
                            min="0"
                            step="0.01"
                            defaultValue={
                                initialData?.allowances ??
                                0
                            }
                        />

                    </div>

                    {/* Deductions */}

                    <div>

                        <label className="block mb-2">
                            Deductions
                        </label>

                        <input
                            type="number"
                            name="deductions"
                            min="0"
                            step="0.01"
                            defaultValue={
                                initialData?.deductions ??
                                0
                            }
                        />

                    </div>

                    {/* Status */}

                    {isEditMode && (

                        <div>

                            <label className="block mb-2">
                                Status
                            </label>

                            <select
                                name="employmentStatus"
                                defaultValue={
                                    initialData?.employmentStatus ||
                                    "ACTIVE"
                                }
                            >

                                <option value="ACTIVE">
                                    Active
                                </option>

                                <option value="INACTIVE">
                                    Inactive
                                </option>

                            </select>

                        </div>

                    )}

                </div>

            </div>


            {/* ================================================= */}
            {/* ACCOUNT SETUP */}
            {/* ================================================= */}

            <div className="card p-5 sm:p-6">

                <h3 className="text-base font-medium text-slate-900 mb-6 pb-4 border-b border-slate-100">
                    Account Setup
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm text-slate-700">

                    {/* Password */}

                    {!isEditMode && (

                        <div>

                            <label className="block mb-2">
                                Temporary Password
                            </label>

                            <input
                                type="password"
                                name="password"
                                required
                                placeholder="Create temporary password"
                            />

                        </div>

                    )}

                    {/* Change Password */}

                    {isEditMode && (

                        <div>

                            <label className="block mb-2">
                                Change Password{optional}
                            </label>

                            <input
                                type="password"
                                name="password"
                                placeholder="Leave blank to keep current"
                            />

                        </div>

                    )}

                    {/* Role */}

                    <div>

                        <label className="block mb-2">
                            System Role
                        </label>

                        <select
                            name="role"
                            defaultValue={
                                initialData?.user?.role ||
                                "EMPLOYEE"
                            }
                        >

                            <option value="EMPLOYEE">
                                Employee
                            </option>

                            <option value="ADMIN">
                                Admin
                            </option>

                        </select>

                    </div>

                </div>

            </div>


            {/* ================================================= */}
            {/* BUTTONS */}
            {/* ================================================= */}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">

                <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                        onCancel
                            ? onCancel()
                            : navigate(-1)
                    }
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex items-center justify-center"
                >

                    {loading && (
                        <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                    )}

                    {isEditMode
                        ? "Update Employee"
                        : "Create Employee"}

                </button>

            </div>

        </form>
    );
};

export default EmployeeForm;
