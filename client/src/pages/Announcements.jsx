import {
    useState,
    useCallback,
    useEffect,
} from "react";

import {
    Megaphone,
    Plus,
    Pencil,
    Trash2,
    X,
    Loader2,
    Users,
    Building2,
    User,
    Check,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import toast from "react-hot-toast";
import { format } from "date-fns";
import Loading from "../components/Loading";

const Announcements = () => {
    const { user } = useAuth();

    const isAdmin =
        user?.role === "ADMIN";

    const [
        announcements,
        setAnnouncements,
    ] = useState([]);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        showModal,
        setShowModal,
    ] = useState(false);

    const [
        editingAnnouncement,
        setEditingAnnouncement,
    ] = useState(null);

    const [
        title,
        setTitle,
    ] = useState("");

    const [
        message,
        setMessage,
    ] = useState("");

    const [
        saving,
        setSaving,
    ] = useState(false);

    const [
        deletingId,
        setDeletingId,
    ] = useState(null);

    // ============================================================
    // TARGET AUDIENCE STATES
    // ============================================================

    const [
        targetType,
        setTargetType,
    ] = useState("ALL");

    const [
        targetDepartment,
        setTargetDepartment,
    ] = useState("");

    // Multiple employees can now be selected
    const [
        targetEmployeeIds,
        setTargetEmployeeIds,
    ] = useState([]);

    // ============================================================
    // DEPARTMENT + EMPLOYEE LISTS
    // ============================================================

    const [
        departments,
        setDepartments,
    ] = useState([]);

    const [
        employees,
        setEmployees,
    ] = useState([]);

    // ============================================================
    // FETCH ANNOUNCEMENTS
    // ============================================================

    const fetchAnnouncements =
        useCallback(async () => {
            try {
                const res =
                    await api.get(
                        "/announcements"
                    );

                setAnnouncements(
                    res.data?.data ||
                        []
                );
            } catch (error) {
                toast.error(
                    error?.response
                        ?.data?.error ||
                        error.message
                );
            } finally {
                setLoading(false);
            }
        }, []);

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    // ============================================================
    // LOAD DEPARTMENTS + EMPLOYEES
    // ============================================================

    useEffect(() => {
        if (!isAdmin) {
            return;
        }

        api.get("/departments")
            .then((res) => {
                setDepartments(
                    Array.isArray(
                        res.data
                    )
                        ? res.data
                        : res.data
                              ?.data ||
                              []
                );
            })
            .catch(() => {});

        api.get("/employees")
            .then((res) => {
                const list =
                    Array.isArray(
                        res.data
                    )
                        ? res.data
                        : res.data
                              ?.data ||
                              [];

                setEmployees(
                    list.filter(
                        (employee) =>
                            !employee.isDeleted
                    )
                );
            })
            .catch(() => {});
    }, [isAdmin]);

    // ============================================================
    // EMPLOYEE ID HELPER
    // ============================================================

    const getEmployeeId = (
        employee
    ) => {
        return String(
            employee?._id ||
                employee?.id ||
                employee ||
                ""
        );
    };

    // ============================================================
    // EMPLOYEE DEPARTMENT NAME HELPER
    // ============================================================

    const getEmployeeDepartment = (
        employee
    ) => {
        if (
            typeof employee
                ?.department ===
            "object"
        ) {
            return (
                employee.department
                    ?.name ||
                employee.department
                    ?.departmentName ||
                employee.department
                    ?.department_name ||
                "No Dept"
            );
        }

        return (
            employee?.department ||
            "No Dept"
        );
    };

    // ============================================================
    // TOGGLE MULTIPLE EMPLOYEE
    // ============================================================

    const toggleEmployee = (
        employeeId
    ) => {
        const id =
            String(employeeId);

        setTargetEmployeeIds(
            (previous) => {
                if (
                    previous.includes(
                        id
                    )
                ) {
                    return previous.filter(
                        (
                            currentId
                        ) =>
                            currentId !==
                            id
                    );
                }

                return [
                    ...previous,
                    id,
                ];
            }
        );
    };

    // ============================================================
    // SELECT ALL EMPLOYEES
    // ============================================================

    const selectAllEmployees =
        () => {
            const allIds =
                employees
                    .map(
                        getEmployeeId
                    )
                    .filter(
                        Boolean
                    );

            setTargetEmployeeIds(
                allIds
            );
        };

    // ============================================================
    // CLEAR SELECTED EMPLOYEES
    // ============================================================

    const clearSelectedEmployees =
        () => {
            setTargetEmployeeIds(
                []
            );
        };

    // ============================================================
    // OPEN CREATE MODAL
    // ============================================================

    const openCreateModal = () => {
        setEditingAnnouncement(
            null
        );

        setTitle("");
        setMessage("");

        setTargetType(
            "ALL"
        );

        setTargetDepartment(
            ""
        );

        setTargetEmployeeIds(
            []
        );

        setShowModal(true);
    };

    // ============================================================
    // OPEN EDIT MODAL
    // ============================================================

    const openEditModal = (
        announcement
    ) => {
        setEditingAnnouncement(
            announcement
        );

        setTitle(
            announcement.title ||
                ""
        );

        setMessage(
            announcement.message ||
                ""
        );

        setTargetType(
            announcement.targetType ||
                "ALL"
        );

        setTargetDepartment(
            announcement.targetDepartment ||
                ""
        );

        // New multiple employee format
        if (
            Array.isArray(
                announcement.targetEmployeeIds
            ) &&
            announcement
                .targetEmployeeIds
                .length > 0
        ) {
            const ids =
                announcement.targetEmployeeIds
                    .map(
                        (
                            employee
                        ) =>
                            getEmployeeId(
                                employee
                            )
                    )
                    .filter(
                        Boolean
                    );

            setTargetEmployeeIds(
                ids
            );
        }

        // Old single employee announcement compatibility
        else if (
            announcement.targetEmployeeId
        ) {
            setTargetEmployeeIds([
                getEmployeeId(
                    announcement.targetEmployeeId
                ),
            ]);
        } else {
            setTargetEmployeeIds(
                []
            );
        }

        setShowModal(true);
    };

    // ============================================================
    // SUBMIT
    // ============================================================

    const handleSubmit = async (
        e
    ) => {
        e.preventDefault();

        if (
            targetType ===
                "DEPARTMENT" &&
            !targetDepartment
        ) {
            toast.error(
                "Please select a target department"
            );

            return;
        }

        if (
            targetType ===
                "INDIVIDUAL" &&
            targetEmployeeIds.length ===
                0
        ) {
            toast.error(
                "Please select at least one employee"
            );

            return;
        }

        setSaving(true);

        const payload = {
            title,
            message,
            targetType,

            targetDepartment:
                targetType ===
                "DEPARTMENT"
                    ? targetDepartment
                    : null,

            targetEmployeeIds:
                targetType ===
                "INDIVIDUAL"
                    ? targetEmployeeIds
                    : [],

            // First employee also sent for
            // backward compatibility.
            targetEmployeeId:
                targetType ===
                    "INDIVIDUAL" &&
                targetEmployeeIds.length >
                    0
                    ? targetEmployeeIds[0]
                    : null,
        };

        try {
            if (
                editingAnnouncement
            ) {
                await api.put(
                    `/announcements/${
                        editingAnnouncement._id ||
                        editingAnnouncement.id
                    }`,
                    payload
                );

                toast.success(
                    "Announcement updated"
                );
            } else {
                await api.post(
                    "/announcements",
                    payload
                );

                toast.success(
                    "Announcement posted"
                );
            }

            setShowModal(false);

            fetchAnnouncements();
        } catch (error) {
            toast.error(
                error?.response?.data
                    ?.error ||
                    error.message
            );
        } finally {
            setSaving(false);
        }
    };

    // ============================================================
    // DELETE
    // ============================================================

    const handleDelete = async (
        id
    ) => {
        if (
            !confirm(
                "Delete this announcement?"
            )
        ) {
            return;
        }

        setDeletingId(id);

        try {
            await api.delete(
                `/announcements/${id}`
            );

            toast.success(
                "Announcement deleted"
            );

            fetchAnnouncements();
        } catch (error) {
            toast.error(
                error?.response?.data
                    ?.error ||
                    error.message
            );
        } finally {
            setDeletingId(null);
        }
    };

    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {
        return <Loading />;
    }

    // ============================================================
    // UI
    // ============================================================

    return (
        <div className="animate-fade-in">

            {/* =====================================================
                HEADER
            ===================================================== */}

            <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="page-title">
                        Announcements
                    </h1>

                    <p className="page-subtitle">
                        {isAdmin
                            ? "Post updates and news for your team"
                            : "Latest updates from your organization"}
                    </p>
                </div>

                {isAdmin && (
                    <button
                        onClick={
                            openCreateModal
                        }
                        className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto"
                    >
                        <Plus className="h-4 w-4" />

                        New Announcement
                    </button>
                )}
            </div>

            {/* =====================================================
                ANNOUNCEMENTS LIST
            ===================================================== */}

            {announcements.length ===
            0 ? (
                <div className="card p-12 text-center text-slate-400">
                    <Megaphone className="mx-auto mb-3 h-10 w-10 text-slate-300" />

                    No announcements yet
                </div>
            ) : (
                <div className="space-y-4">
                    {announcements.map(
                        (a) => {
                            // =================================================
                            // TARGET PERSON NAMES
                            // =================================================

                            const multiplePeople =
                                Array.isArray(
                                    a.targetEmployeeIds
                                )
                                    ? a.targetEmployeeIds
                                          .filter(
                                              Boolean
                                          )
                                          .map(
                                              (
                                                  employee
                                              ) => {
                                                  if (
                                                      typeof employee ===
                                                      "string"
                                                  ) {
                                                      const match =
                                                          employees.find(
                                                              (
                                                                  currentEmployee
                                                              ) =>
                                                                  getEmployeeId(
                                                                      currentEmployee
                                                                  ) ===
                                                                  employee
                                                          );

                                                      return match
                                                          ? `${match.firstName || ""} ${match.lastName || ""}`.trim()
                                                          : "";
                                                  }

                                                  return `${employee.firstName || ""} ${employee.lastName || ""}`.trim();
                                              }
                                          )
                                          .filter(
                                              Boolean
                                          )
                                    : [];

                            const oldTargetPersonName =
                                a
                                    .targetEmployeeId
                                    ?.firstName
                                    ? `${a.targetEmployeeId.firstName} ${a.targetEmployeeId.lastName || ""}`.trim()
                                    : null;

                            let targetPeopleLabel =
                                "Specific Employee";

                            if (
                                multiplePeople.length ===
                                1
                            ) {
                                targetPeopleLabel =
                                    multiplePeople[0];
                            } else if (
                                multiplePeople.length ===
                                2
                            ) {
                                targetPeopleLabel =
                                    multiplePeople.join(
                                        ", "
                                    );
                            } else if (
                                multiplePeople.length >
                                2
                            ) {
                                targetPeopleLabel =
                                    `${multiplePeople.length} Specific People`;
                            } else if (
                                oldTargetPersonName
                            ) {
                                targetPeopleLabel =
                                    oldTargetPersonName;
                            }

                            return (
                                <div
                                    key={
                                        a._id ||
                                        a.id
                                    }
                                    className="card relative overflow-hidden p-5 sm:p-6"
                                >
                                    <div className="absolute bottom-0 left-0 top-0 w-1 bg-indigo-500/70" />

                                    <div className="flex items-start justify-between gap-4">

                                        {/* CONTENT */}

                                        <div className="flex min-w-0 flex-1 items-start gap-3">

                                            <div className="shrink-0 rounded-lg bg-indigo-50 p-2">
                                                <Megaphone className="h-5 w-5 text-indigo-600" />
                                            </div>

                                            <div className="min-w-0">

                                                <div className="mb-1 flex flex-wrap items-center gap-2">

                                                    <h3 className="font-semibold text-slate-900">
                                                        {
                                                            a.title
                                                        }
                                                    </h3>

                                                    {/* TARGET AUDIENCE BADGE */}

                                                    {isAdmin && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">

                                                            {a.targetType ===
                                                            "DEPARTMENT" ? (
                                                                <>
                                                                    <Building2
                                                                        size={
                                                                            12
                                                                        }
                                                                        className="text-indigo-600"
                                                                    />

                                                                    <span>
                                                                        {
                                                                            a.targetDepartment
                                                                        }{" "}
                                                                        Dept
                                                                    </span>
                                                                </>
                                                            ) : a.targetType ===
                                                              "INDIVIDUAL" ? (
                                                                <>
                                                                    <Users
                                                                        size={
                                                                            12
                                                                        }
                                                                        className="text-emerald-600"
                                                                    />

                                                                    <span>
                                                                        {
                                                                            targetPeopleLabel
                                                                        }
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Users
                                                                        size={
                                                                            12
                                                                        }
                                                                        className="text-amber-600"
                                                                    />

                                                                    <span>
                                                                        Everyone
                                                                    </span>
                                                                </>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                                                    {
                                                        a.message
                                                    }
                                                </p>

                                                <p className="mt-2 text-xs text-slate-400">
                                                    Posted{" "}
                                                    {format(
                                                        new Date(
                                                            a.createdAt
                                                        ),
                                                        "MMM dd, yyyy 'at' h:mm a"
                                                    )}

                                                    {a.updatedAt !==
                                                        a.createdAt &&
                                                        " (edited)"}
                                                </p>
                                            </div>
                                        </div>

                                        {/* ADMIN ACTIONS */}

                                        {isAdmin && (
                                            <div className="flex shrink-0 gap-1.5">

                                                <button
                                                    onClick={() =>
                                                        openEditModal(
                                                            a
                                                        )
                                                    }
                                                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                                                    title="Edit announcement"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>

                                                <button
                                                    onClick={() =>
                                                        handleDelete(
                                                            a._id ||
                                                                a.id
                                                        )
                                                    }
                                                    disabled={
                                                        deletingId ===
                                                        (a._id ||
                                                            a.id)
                                                    }
                                                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600"
                                                    title="Delete announcement"
                                                >
                                                    {deletingId ===
                                                    (a._id ||
                                                        a.id) ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        }
                    )}
                </div>
            )}

            {/* =====================================================
                CREATE / EDIT MODAL
            ===================================================== */}

            {showModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                    onClick={() =>
                        setShowModal(
                            false
                        )
                    }
                >
                    <div
                        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl animate-fade-in"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        {/* MODAL HEADER */}

                        <div className="flex items-center justify-between p-6 pb-0">

                            <h2 className="text-lg font-semibold text-slate-800">
                                {editingAnnouncement
                                    ? "Edit Announcement"
                                    : "New Announcement"}
                            </h2>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowModal(
                                        false
                                    )
                                }
                                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* FORM */}

                        <form
                            onSubmit={
                                handleSubmit
                            }
                            className="space-y-4 p-6"
                        >

                            {/* TITLE */}

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Title
                                </label>

                                <input
                                    type="text"
                                    value={
                                        title
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setTitle(
                                            e
                                                .target
                                                .value
                                        )
                                    }
                                    required
                                    placeholder="e.g. Office closed on Friday"
                                />
                            </div>

                            {/* =================================================
                                TARGET AUDIENCE
                            ================================================= */}

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Post To
                                    (Target
                                    Audience)
                                </label>

                                {/* TARGET TYPE BUTTONS */}

                                <div className="mb-3 grid grid-cols-3 gap-2">

                                    {/* EVERYONE */}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTargetType(
                                                "ALL"
                                            );

                                            setTargetDepartment(
                                                ""
                                            );

                                            setTargetEmployeeIds(
                                                []
                                            );
                                        }}
                                        className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-xs font-semibold transition ${
                                            targetType ===
                                            "ALL"
                                                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        }`}
                                    >
                                        <Users className="mb-1 h-4 w-4" />

                                        Everyone
                                    </button>

                                    {/* DEPARTMENT */}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTargetType(
                                                "DEPARTMENT"
                                            );

                                            setTargetEmployeeIds(
                                                []
                                            );
                                        }}
                                        className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-xs font-semibold transition ${
                                            targetType ===
                                            "DEPARTMENT"
                                                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        }`}
                                    >
                                        <Building2 className="mb-1 h-4 w-4" />

                                        Department
                                    </button>

                                    {/* SPECIFIC PEOPLE */}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTargetType(
                                                "INDIVIDUAL"
                                            );

                                            setTargetDepartment(
                                                ""
                                            );
                                        }}
                                        className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-xs font-semibold transition ${
                                            targetType ===
                                            "INDIVIDUAL"
                                                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        }`}
                                    >
                                        <User className="mb-1 h-4 w-4" />

                                        Specific People
                                    </button>
                                </div>

                                {/* =================================================
                                    DEPARTMENT SELECT
                                ================================================= */}

                                {targetType ===
                                    "DEPARTMENT" && (
                                    <div>
                                        <select
                                            value={
                                                targetDepartment
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setTargetDepartment(
                                                    e
                                                        .target
                                                        .value
                                                )
                                            }
                                            required
                                            className="w-full text-sm"
                                        >
                                            <option value="">
                                                --
                                                Choose
                                                Department
                                                --
                                            </option>

                                            {departments.map(
                                                (
                                                    dept
                                                ) => {
                                                    const name =
                                                        typeof dept ===
                                                        "string"
                                                            ? dept
                                                            : dept.name ||
                                                              dept.departmentName ||
                                                              dept.department_name;

                                                    return (
                                                        <option
                                                            key={
                                                                name
                                                            }
                                                            value={
                                                                name
                                                            }
                                                        >
                                                            {
                                                                name
                                                            }
                                                        </option>
                                                    );
                                                }
                                            )}
                                        </select>
                                    </div>
                                )}

                                {/* =================================================
                                    MULTIPLE EMPLOYEE SELECTION
                                ================================================= */}

                                {targetType ===
                                    "INDIVIDUAL" && (
                                    <div className="space-y-3">

                                        {/* SELECTED EMPLOYEE CHIPS */}

                                        {targetEmployeeIds.length >
                                            0 && (
                                            <div className="flex flex-wrap gap-2">

                                                {targetEmployeeIds.map(
                                                    (
                                                        employeeId
                                                    ) => {
                                                        const employee =
                                                            employees.find(
                                                                (
                                                                    currentEmployee
                                                                ) =>
                                                                    getEmployeeId(
                                                                        currentEmployee
                                                                    ) ===
                                                                    employeeId
                                                            );

                                                        if (
                                                            !employee
                                                        ) {
                                                            return null;
                                                        }

                                                        return (
                                                            <div
                                                                key={
                                                                    employeeId
                                                                }
                                                                className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700"
                                                            >
                                                                <span>
                                                                    {
                                                                        employee.firstName
                                                                    }{" "}
                                                                    {
                                                                        employee.lastName
                                                                    }
                                                                </span>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        toggleEmployee(
                                                                            employeeId
                                                                        )
                                                                    }
                                                                    className="rounded-full p-0.5 transition hover:bg-indigo-100"
                                                                    title="Remove employee"
                                                                >
                                                                    <X
                                                                        size={
                                                                            12
                                                                        }
                                                                    />
                                                                </button>
                                                            </div>
                                                        );
                                                    }
                                                )}
                                            </div>
                                        )}

                                        {/* SELECT ALL / CLEAR */}

                                        <div className="flex items-center justify-between">

                                            <p className="text-xs font-medium text-slate-500">
                                                Select
                                                one or
                                                more
                                                employees
                                            </p>

                                            <div className="flex items-center gap-3">

                                                <button
                                                    type="button"
                                                    onClick={
                                                        selectAllEmployees
                                                    }
                                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                                                >
                                                    Select
                                                    All
                                                </button>

                                                {targetEmployeeIds.length >
                                                    0 && (
                                                    <button
                                                        type="button"
                                                        onClick={
                                                            clearSelectedEmployees
                                                        }
                                                        className="text-xs font-semibold text-rose-500 hover:text-rose-700"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* EMPLOYEE CHECKBOX LIST */}

                                        <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white">

                                            {employees.length ===
                                            0 ? (
                                                <div className="p-5 text-center text-sm text-slate-400">
                                                    No
                                                    employees
                                                    found
                                                </div>
                                            ) : (
                                                employees.map(
                                                    (
                                                        emp
                                                    ) => {
                                                        const employeeId =
                                                            getEmployeeId(
                                                                emp
                                                            );

                                                        const selected =
                                                            targetEmployeeIds.includes(
                                                                employeeId
                                                            );

                                                        return (
                                                            <label
                                                                key={
                                                                    employeeId
                                                                }
                                                                className={`flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3 transition last:border-b-0 ${
                                                                    selected
                                                                        ? "bg-indigo-50"
                                                                        : "bg-white hover:bg-slate-50"
                                                                }`}
                                                            >
                                                                {/* CHECKBOX */}

                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        selected
                                                                    }
                                                                    onChange={() =>
                                                                        toggleEmployee(
                                                                            employeeId
                                                                        )
                                                                    }
                                                                    className="h-4 w-4 cursor-pointer accent-indigo-600"
                                                                />

                                                                {/* EMPLOYEE DETAILS */}

                                                                <div className="min-w-0 flex-1">

                                                                    <p className="truncate text-sm font-semibold text-slate-800">
                                                                        {
                                                                            emp.firstName
                                                                        }{" "}
                                                                        {
                                                                            emp.lastName
                                                                        }
                                                                    </p>

                                                                    <p className="truncate text-xs text-slate-500">
                                                                        {getEmployeeDepartment(
                                                                            emp
                                                                        )}

                                                                        {emp.position
                                                                            ? ` • ${emp.position}`
                                                                            : ""}
                                                                    </p>
                                                                </div>

                                                                {/* SELECTED CHECK */}

                                                                {selected && (
                                                                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                                                                        <Check
                                                                            size={
                                                                                12
                                                                            }
                                                                            strokeWidth={
                                                                                3
                                                                            }
                                                                        />
                                                                    </div>
                                                                )}
                                                            </label>
                                                        );
                                                    }
                                                )
                                            )}
                                        </div>

                                        {/* SELECTED COUNT */}

                                        <div className="flex items-center justify-between">

                                            <p
                                                className={`text-xs font-semibold ${
                                                    targetEmployeeIds.length >
                                                    0
                                                        ? "text-indigo-600"
                                                        : "text-slate-400"
                                                }`}
                                            >
                                                {
                                                    targetEmployeeIds.length
                                                }{" "}
                                                employee
                                                {targetEmployeeIds.length !==
                                                1
                                                    ? "s"
                                                    : ""}{" "}
                                                selected
                                            </p>

                                            {employees.length >
                                                0 && (
                                                <p className="text-xs text-slate-400">
                                                    {
                                                        employees.length
                                                    }{" "}
                                                    available
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* =================================================
                                MESSAGE
                            ================================================= */}

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Message
                                </label>

                                <textarea
                                    value={
                                        message
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setMessage(
                                            e
                                                .target
                                                .value
                                        )
                                    }
                                    required
                                    rows={
                                        4
                                    }
                                    className="resize-none"
                                    placeholder="Write your announcement..."
                                />
                            </div>

                            {/* =================================================
                                BUTTONS
                            ================================================= */}

                            <div className="flex gap-3 pt-2">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowModal(
                                            false
                                        )
                                    }
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saving
                                    }
                                    className="btn-primary flex flex-1 items-center justify-center gap-2"
                                >
                                    {saving && (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    )}

                                    {editingAnnouncement
                                        ? "Update"
                                        : "Post"}
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