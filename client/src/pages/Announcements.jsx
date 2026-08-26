import { useState, useCallback, useEffect } from "react";
import { Megaphone, Plus, Pencil, Trash2, X, Loader2, Users, Building2, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import toast from "react-hot-toast";
import { format } from "date-fns";
import Loading from "../components/Loading";

const Announcements = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // Target Audience States
    const [targetType, setTargetType] = useState("ALL"); // "ALL" | "DEPARTMENT" | "INDIVIDUAL"
    const [targetDepartment, setTargetDepartment] = useState("");
    const [targetEmployeeId, setTargetEmployeeId] = useState("");

    // Department & Employee Lists for Admin Selection
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);

    const fetchAnnouncements = useCallback(async () => {
        try {
            const res = await api.get("/announcements");
            setAnnouncements(res.data.data || []);
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    // Load departments & employees for Admin targeting options
    useEffect(() => {
        if (isAdmin) {
            api.get("/departments")
                .then((res) => setDepartments(Array.isArray(res.data) ? res.data : res.data?.data || []))
                .catch(() => {});

            api.get("/employees")
                .then((res) => {
                    const list = Array.isArray(res.data) ? res.data : [];
                    setEmployees(list.filter((e) => !e.isDeleted));
                })
                .catch(() => {});
        }
    }, [isAdmin]);

    const openCreateModal = () => {
        setEditingAnnouncement(null);
        setTitle("");
        setMessage("");
        setTargetType("ALL");
        setTargetDepartment("");
        setTargetEmployeeId("");
        setShowModal(true);
    };

    const openEditModal = (announcement) => {
        setEditingAnnouncement(announcement);
        setTitle(announcement.title);
        setMessage(announcement.message);
        setTargetType(announcement.targetType || "ALL");
        setTargetDepartment(announcement.targetDepartment || "");
        setTargetEmployeeId(announcement.targetEmployeeId?._id || announcement.targetEmployeeId || "");
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (targetType === "DEPARTMENT" && !targetDepartment) {
            toast.error("Please select a target department");
            return;
        }

        if (targetType === "INDIVIDUAL" && !targetEmployeeId) {
            toast.error("Please select a target employee");
            return;
        }

        setSaving(true);
        const payload = {
            title,
            message,
            targetType,
            targetDepartment: targetType === "DEPARTMENT" ? targetDepartment : null,
            targetEmployeeId: targetType === "INDIVIDUAL" ? targetEmployeeId : null,
        };

        try {
            if (editingAnnouncement) {
                await api.put(`/announcements/${editingAnnouncement._id || editingAnnouncement.id}`, payload);
                toast.success("Announcement updated");
            } else {
                await api.post("/announcements", payload);
                toast.success("Announcement posted");
            }
            setShowModal(false);
            fetchAnnouncements();
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this announcement?")) return;
        setDeletingId(id);
        try {
            await api.delete(`/announcements/${id}`);
            toast.success("Announcement deleted");
            fetchAnnouncements();
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message);
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="page-title">Announcements</h1>
                    <p className="page-subtitle">
                        {isAdmin
                            ? "Post updates and news for your team"
                            : "Latest updates from your organization"}
                    </p>
                </div>

                {isAdmin && (
                    <button
                        onClick={openCreateModal}
                        className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
                    >
                        <Plus className="w-4 h-4" />
                        New Announcement
                    </button>
                )}
            </div>

            {announcements.length === 0 ? (
                <div className="card p-12 text-center text-slate-400">
                    <Megaphone className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    No announcements yet
                </div>
            ) : (
                <div className="space-y-4">
                    {announcements.map((a) => {
                        const targetPersonName = a.targetEmployeeId?.firstName
                            ? `${a.targetEmployeeId.firstName} ${a.targetEmployeeId.lastName || ""}`
                            : null;

                        return (
                            <div key={a._id || a.id} className="card p-5 sm:p-6 relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/70" />

                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
                                            <Megaphone className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-slate-900">{a.title}</h3>

                                                {/* Target Audience Badge */}
                                                {isAdmin && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                        {a.targetType === "DEPARTMENT" ? (
                                                            <>
                                                                <Building2 size={12} className="text-indigo-600" />
                                                                <span>{a.targetDepartment} Dept</span>
                                                            </>
                                                        ) : a.targetType === "INDIVIDUAL" ? (
                                                            <>
                                                                <User size={12} className="text-emerald-600" />
                                                                <span>{targetPersonName || "Specific Employee"}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Users size={12} className="text-amber-600" />
                                                                <span>Everyone</span>
                                                            </>
                                                        )}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{a.message}</p>
                                            <p className="text-xs text-slate-400 mt-2">
                                                Posted {format(new Date(a.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                                                {a.updatedAt !== a.createdAt && " (edited)"}
                                            </p>
                                        </div>
                                    </div>

                                    {isAdmin && (
                                        <div className="flex gap-1.5 shrink-0">
                                            <button
                                                onClick={() => openEditModal(a)}
                                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(a._id || a.id)}
                                                disabled={deletingId === (a._id || a.id)}
                                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-rose-600 transition-colors"
                                            >
                                                {deletingId === (a._id || a.id) ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-6 pb-0">
                            <h2 className="text-lg font-semibold text-slate-800">
                                {editingAnnouncement ? "Edit Announcement" : "New Announcement"}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    placeholder="e.g. Office closed on Friday"
                                />
                            </div>

                            {/* TARGET AUDIENCE SELECTION */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Post To (Target Audience)
                                </label>
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setTargetType("ALL")}
                                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition ${
                                            targetType === "ALL"
                                                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        }`}
                                    >
                                        <Users className="w-4 h-4 mb-1" />
                                        Everyone
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setTargetType("DEPARTMENT")}
                                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition ${
                                            targetType === "DEPARTMENT"
                                                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        }`}
                                    >
                                        <Building2 className="w-4 h-4 mb-1" />
                                        Department
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setTargetType("INDIVIDUAL")}
                                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition ${
                                            targetType === "INDIVIDUAL"
                                                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        }`}
                                    >
                                        <User className="w-4 h-4 mb-1" />
                                        Specific Person
                                    </button>
                                </div>

                                {/* Select Department */}
                                {targetType === "DEPARTMENT" && (
                                    <div>
                                        <select
                                            value={targetDepartment}
                                            onChange={(e) => setTargetDepartment(e.target.value)}
                                            required
                                            className="w-full text-sm"
                                        >
                                            <option value="">-- Choose Department --</option>
                                            {departments.map((dept) => {
                                                const name = typeof dept === "string" ? dept : dept.name || dept.departmentName;
                                                return (
                                                    <option key={name} value={name}>
                                                        {name}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                )}

                                {/* Select Individual Employee */}
                                {targetType === "INDIVIDUAL" && (
                                    <div>
                                        <select
                                            value={targetEmployeeId}
                                            onChange={(e) => setTargetEmployeeId(e.target.value)}
                                            required
                                            className="w-full text-sm"
                                        >
                                            <option value="">-- Choose Employee --</option>
                                            {employees.map((emp) => (
                                                <option key={emp._id || emp.id} value={emp._id || emp.id}>
                                                    {emp.firstName} {emp.lastName} ({emp.department || "No Dept"})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Message
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    required
                                    rows={4}
                                    className="resize-none"
                                    placeholder="Write your announcement..."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {editingAnnouncement ? "Update" : "Post"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Announcements;