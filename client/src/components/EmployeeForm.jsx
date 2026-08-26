import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDepartments } from "../hooks/useDepartments";
import { Loader2Icon, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios";

const genFieldId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

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
    // Custom fields (per fixed section)
    // ==========================================
    const [customFields, setCustomFields] = useState([]);
    const [addingFieldFor, setAddingFieldFor] = useState(null);
    const [newFieldLabel, setNewFieldLabel] = useState("");

    // ==========================================
    // Custom sections (admin-defined sections)
    // ==========================================
    const [customSections, setCustomSections] = useState([]);
    const [addingSection, setAddingSection] = useState(false);
    const [newSectionTitle, setNewSectionTitle] = useState("");
    const [addingFieldForSectionId, setAddingFieldForSectionId] = useState(null);
    const [newSectionFieldLabel, setNewSectionFieldLabel] = useState("");

    // SYNC STATE WHEN INITIAL DATA LOADS ASYNCHRONOUSLY
    useEffect(() => {
        if (initialData) {
            if (Array.isArray(initialData.customFields)) {
                setCustomFields(
                    initialData.customFields.map((f) => ({
                        id: genFieldId(),
                        section: f.section || "personal",
                        label: f.label,
                        value: f.value || "",
                    }))
                );
            }

            if (Array.isArray(initialData.customSections)) {
                setCustomSections(
                    initialData.customSections.map((s) => ({
                        id: genFieldId(),
                        title: s.title,
                        fields: (s.fields || []).map((f) => ({
                            id: genFieldId(),
                            label: f.label,
                            value: f.value || "",
                        })),
                    }))
                );
            }
        }
    }, [initialData]);

    const fieldsForSection = (section) =>
        customFields.filter((f) => f.section === section);

    const startAddField = (section) => {
        setAddingFieldFor(section);
        setNewFieldLabel("");
    };

    const confirmAddField = (section) => {
        const label = newFieldLabel.trim();
        if (!label) {
            toast.error("Enter a field name");
            return;
        }

        setCustomFields((prev) => [
            ...prev,
            { id: genFieldId(), section, label, value: "" },
        ]);

        setAddingFieldFor(null);
        setNewFieldLabel("");
    };

    const updateCustomFieldValue = (id, value) => {
        setCustomFields((prev) =>
            prev.map((f) => (f.id === id ? { ...f, value } : f))
        );
    };

    const removeCustomField = (id) => {
        setCustomFields((prev) => prev.filter((f) => f.id !== id));
    };

    const confirmAddSection = () => {
        const title = newSectionTitle.trim();
        if (!title) {
            toast.error("Enter a section name");
            return;
        }

        setCustomSections((prev) => [
            ...prev,
            { id: genFieldId(), title, fields: [] },
        ]);

        setAddingSection(false);
        setNewSectionTitle("");
        toast.success(`Section "${title}" added`);
    };

    const removeSection = (sectionId) => {
        setCustomSections((prev) => prev.filter((s) => s.id !== sectionId));
    };

    const confirmAddSectionField = (sectionId) => {
        const label = newSectionFieldLabel.trim();
        if (!label) {
            toast.error("Enter a field name");
            return;
        }

        setCustomSections((prev) =>
            prev.map((s) =>
                s.id === sectionId
                    ? {
                        ...s,
                        fields: [
                            ...s.fields,
                            { id: genFieldId(), label, value: "" },
                        ],
                    }
                    : s
            )
        );

        setAddingFieldForSectionId(null);
        setNewSectionFieldLabel("");
    };

    const updateSectionFieldValue = (sectionId, fieldId, value) => {
        setCustomSections((prev) =>
            prev.map((s) =>
                s.id === sectionId
                    ? {
                        ...s,
                        fields: s.fields.map((f) =>
                            f.id === fieldId ? { ...f, value } : f
                        ),
                    }
                    : s
            )
        );
    };

    const removeSectionField = (sectionId, fieldId) => {
        setCustomSections((prev) =>
            prev.map((s) =>
                s.id === sectionId
                    ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
                    : s
            )
        );
    };

    const employeeName = initialData
        ? `${initialData.firstName || ""} ${initialData.lastName || ""}`.trim()
        : "";

    const formatDate = (date) => {
        if (!date) return "";
        try {
            return new Date(date).toISOString().split("T")[0];
        } catch {
            return "";
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        const fullName = data.employeeName?.trim().replace(/\s+/g, " ");
        if (!fullName) {
            toast.error("Employee name is required");
            setLoading(false);
            return;
        }

        const nameParts = fullName.split(" ");
        data.firstName = nameParts[0];
        data.lastName = nameParts.slice(1).join(" ") || "-";
        delete data.employeeName;

        if (isEditMode && !data.password) {
            delete data.password;
        }

        // Attach customFields and customSections to the payload
        data.customFields = customFields.map(({ section, label, value }) => ({ section, label, value }));
        data.customSections = customSections.map(({ title, fields }) => ({
            title,
            fields: fields.map(({ label, value }) => ({ label, value })),
        }));

        try {
            const url = isEditMode
                ? `/employees/${initialData._id || initialData.id}`
                : "/employees";

            const method = isEditMode ? "put" : "post";

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
            console.error("Employee submit error:", error);
            toast.error(
                error.response?.data?.error || error.message || "Something went wrong"
            );
        } finally {
            setLoading(false);
        }
    };

    const AddFieldRow = ({ section }) => (
        <div className="sm:col-span-2">
            {addingFieldFor === section ? (
                <div className="flex items-end gap-2">
                    <div className="flex-1">
                        <label className="block mb-2">New Field Name</label>
                        <input
                            value={newFieldLabel}
                            onChange={(e) => setNewFieldLabel(e.target.value)}
                            placeholder="e.g. Blood Group"
                            autoFocus
                        />
                    </div>
                    <button type="button" onClick={() => confirmAddField(section)} className="btn-primary shrink-0">
                        Add
                    </button>
                    <button type="button" onClick={() => setAddingFieldFor(null)} className="p-2.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => startAddField(section)}
                    className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                    <Plus className="w-4 h-4" />
                    Add Field
                </button>
            )}
        </div>
    );

    const CustomFieldInputs = ({ section }) =>
        fieldsForSection(section).map((field) => (
            <div key={field.id}>
                <label className="flex items-center justify-between mb-2">
                    <span>{field.label}</span>
                    <button
                        type="button"
                        onClick={() => removeCustomField(field.id)}
                        className="text-slate-300 hover:text-rose-500"
                        title="Remove field"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </label>
                <input
                    value={field.value}
                    onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
                />
            </div>
        ));

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl animate-fade-in pb-8">
            {/* PERSONAL INFORMATION */}
            <div className="card p-5 sm:p-6">
                <h3 className="font-medium mb-6 pb-4 border-b border-slate-100">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm text-slate-700">
                    <div>
                        <label className="block mb-2">Employee Code</label>
                        <input name="employeeCode" required placeholder="e.g. EMP001" defaultValue={initialData?.employeeCode || ""} />
                    </div>

                    <div>
                        <label className="block mb-2">Employee Name</label>
                        <input name="employeeName" required placeholder="Enter full name" defaultValue={employeeName} />
                    </div>

                    <div>
                        <label className="block mb-2">Gender</label>
                        <select name="gender" required defaultValue={initialData?.gender || ""}>
                            <option value="">Select Gender</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block mb-2">Marital Status{optional}</label>
                        <select name="maritalStatus" defaultValue={initialData?.maritalStatus || ""}>
                            <option value="">Select Marital Status</option>
                            <option value="SINGLE">Single</option>
                            <option value="MARRIED">Married</option>
                            <option value="DIVORCED">Divorced</option>
                            <option value="WIDOWED">Widowed</option>
                        </select>
                    </div>

                    <div>
                        <label className="block mb-2">Email ID</label>
                        <input type="email" name="email" required placeholder="employee@company.com" defaultValue={initialData?.email || ""} />
                    </div>

                    <div>
                        <label className="block mb-2">Phone Number</label>
                        <input name="phone" required placeholder="Enter phone number" defaultValue={initialData?.phone || ""} />
                    </div>

                    <div>
                        <label className="block mb-2">Birth Date{optional}</label>
                        <input type="date" name="dateOfBirth" defaultValue={formatDate(initialData?.dateOfBirth)} />
                    </div>

                    <div>
                        <label className="block mb-2">Joining Date</label>
                        <input type="date" name="joinDate" required defaultValue={formatDate(initialData?.joinDate)} />
                    </div>

                    <div>
                        <label className="block mb-2">Confirmation Date{optional}</label>
                        <input type="date" name="confirmationDate" defaultValue={formatDate(initialData?.confirmationDate)} />
                    </div>

                    <div>
                        <label className="block mb-2">Aadhaar Number</label>
                        <input name="aadharNumber" required inputMode="numeric" maxLength={12} placeholder="12 digit Aadhaar number" defaultValue={initialData?.aadharNumber || ""} />
                    </div>

                    <div className="sm:col-span-2">
                        <label className="block mb-2">Bio{optional}</label>
                        <textarea name="bio" rows={3} defaultValue={initialData?.bio || ""} className="resize-none" placeholder="Brief description..." />
                    </div>

                    <CustomFieldInputs section="personal" />
                    <AddFieldRow section="personal" />
                </div>
            </div>

            {/* BANK & STATUTORY DETAILS */}
            <div className="card p-5 sm:p-6">
                <h3 className="font-medium mb-6 pb-4 border-b border-slate-100">Bank & Statutory Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm text-slate-700">
                    <div>
                        <label className="block mb-2">Bank Name</label>
                        <input name="bankName" required placeholder="e.g. Bank of India" defaultValue={initialData?.bankName || ""} />
                    </div>

                    <div>
                        <label className="block mb-2">Bank Account Number</label>
                        <input name="bankAccountNumber" required inputMode="numeric" placeholder="Enter bank account number" defaultValue={initialData?.bankAccountNumber || ""} />
                    </div>

                    <div>
                        <label className="block mb-2">UAN Number</label>
                        <input name="uanNumber" required inputMode="numeric" maxLength={12} placeholder="12 digit UAN number" defaultValue={initialData?.uanNumber || ""} />
                    </div>

                    <div>
                        <label className="block mb-2">PAN Number</label>
                        <input name="panNumber" required maxLength={10} style={{ textTransform: "uppercase" }} placeholder="e.g. ABCDE1234F" defaultValue={initialData?.panNumber || ""} />
                    </div>

                    <CustomFieldInputs section="bank" />
                    <AddFieldRow section="bank" />
                </div>
            </div>

            {/* EMPLOYMENT DETAILS */}
            <div className="card p-5 sm:p-6">
                <h3 className="text-base font-medium text-slate-900 mb-6 pb-4 border-b border-slate-100">Employment Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm text-slate-700">
                    <div>
                        <label className="block mb-2">Department</label>
                        <select name="department" defaultValue={initialData?.department || ""}>
                            <option value="">Select Department</option>
                            {departments.map((deptName) => (
                                <option key={deptName} value={deptName}>{deptName}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block mb-2">Designation</label>
                        <input name="position" required placeholder="e.g. Software Developer" defaultValue={initialData?.position || ""} />
                    </div>

                    <div>
                        <label className="block mb-2">Basic Salary</label>
                        <input type="number" name="basicSalary" required min="0" step="0.01" defaultValue={initialData?.basicSalary ?? 0} />
                    </div>

                    <div>
                        <label className="block mb-2">Allowances</label>
                        <input type="number" name="allowances" min="0" step="0.01" defaultValue={initialData?.allowances ?? 0} />
                    </div>

                    <div>
                        <label className="block mb-2">Deductions</label>
                        <input type="number" name="deductions" min="0" step="0.01" defaultValue={initialData?.deductions ?? 0} />
                    </div>

                    {isEditMode && (
                        <div>
                            <label className="block mb-2">Status</label>
                            <select name="employmentStatus" defaultValue={initialData?.employmentStatus || "ACTIVE"}>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    )}

                    <CustomFieldInputs section="employment" />
                    <AddFieldRow section="employment" />
                </div>
            </div>

            {/* ACCOUNT SETUP */}
            <div className="card p-5 sm:p-6">
                <h3 className="text-base font-medium text-slate-900 mb-6 pb-4 border-b border-slate-100">Account Setup</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm text-slate-700">
                    {!isEditMode && (
                        <div>
                            <label className="block mb-2">Temporary Password</label>
                            <input type="password" name="password" required placeholder="Create temporary password" />
                        </div>
                    )}

                    {isEditMode && (
                        <div>
                            <label className="block mb-2">Change Password{optional}</label>
                            <input type="password" name="password" placeholder="Leave blank to keep current" />
                        </div>
                    )}

                    <div>
                        <label className="block mb-2">System Role</label>
                        <select name="role" defaultValue={initialData?.user?.role || "EMPLOYEE"}>
                            <option value="EMPLOYEE">Employee</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>

                    <CustomFieldInputs section="account" />
                    <AddFieldRow section="account" />
                </div>
            </div>

            {/* DYNAMIC CUSTOM SECTIONS */}
            {customSections.map((section) => (
                <div key={section.id} className="card p-5 sm:p-6 border-indigo-100 animate-fade-in">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-800">{section.title}</h3>
                        <button
                            type="button"
                            onClick={() => removeSection(section.id)}
                            className="text-slate-400 hover:text-rose-500 flex items-center gap-1 text-xs"
                            title="Remove section"
                        >
                            <X className="w-4 h-4" /> Remove Section
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm text-slate-700">
                        {section.fields.map((field) => (
                            <div key={field.id}>
                                <label className="flex items-center justify-between mb-2">
                                    <span>{field.label}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeSectionField(section.id, field.id)}
                                        className="text-slate-300 hover:text-rose-500"
                                        title="Remove field"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </label>
                                <input
                                    value={field.value}
                                    onChange={(e) => updateSectionFieldValue(section.id, field.id, e.target.value)}
                                />
                            </div>
                        ))}

                        <div className="sm:col-span-2">
                            {addingFieldForSectionId === section.id ? (
                                <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <label className="block mb-2">New Field Name</label>
                                        <input
                                            value={newSectionFieldLabel}
                                            onChange={(e) => setNewSectionFieldLabel(e.target.value)}
                                            placeholder="e.g. Emergency Contact"
                                            autoFocus
                                        />
                                    </div>
                                    <button type="button" onClick={() => confirmAddSectionField(section.id)} className="btn-primary shrink-0">
                                        Add
                                    </button>
                                    <button type="button" onClick={() => setAddingFieldForSectionId(null)} className="p-2.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAddingFieldForSectionId(section.id);
                                        setNewSectionFieldLabel("");
                                    }}
                                    className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                >
                                    <Plus className="w-4 h-4" /> Add Field
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {/* SINGLE "ADD NEW SECTION" BUTTON AT BOTTOM */}
            <div>
                {addingSection ? (
                    <div className="card p-5 sm:p-6 border-2 border-indigo-200 bg-indigo-50/30 flex items-end gap-2 animate-fade-in">
                        <div className="flex-1">
                            <label className="block mb-2 text-sm font-semibold text-indigo-900">
                                New Section Name
                            </label>
                            <input
                                value={newSectionTitle}
                                onChange={(e) => setNewSectionTitle(e.target.value)}
                                placeholder="e.g. Emergency Contact Details"
                                autoFocus
                            />
                        </div>
                        <button type="button" onClick={confirmAddSection} className="btn-primary shrink-0">
                            Add Section
                        </button>
                        <button type="button" onClick={() => setAddingSection(false)} className="p-2.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => {
                            setAddingSection(true);
                            setNewSectionTitle("");
                        }}
                        className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-xl transition-colors border border-indigo-100 shadow-xs"
                    >
                        <Plus className="w-4 h-4" />
                        Add New Section
                    </button>
                )}
            </div>

            {/* BUTTONS */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => (onCancel ? onCancel() : navigate(-1))}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex items-center justify-center"
                >
                    {loading && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                    {isEditMode ? "Update Employee" : "Create Employee"}
                </button>
            </div>
        </form>
    );
};

export default EmployeeForm;