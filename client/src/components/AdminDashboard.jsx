import {
    useState,
    useEffect,
    useMemo,
    useRef,
} from "react";

import {
    createPortal,
} from "react-dom";

import {
    useNavigate,
} from "react-router-dom";

import {
    UsersIcon,
    CalendarIcon,
    Building2Icon,
    FileTextIcon,
    FileText,
    FileX,
    ClockIcon,
    LogOutIcon,
    UserXIcon,
    X,
    Search,
    ChevronRight,
    FolderOpen,
    Download,
    Loader2,
    PencilLine,
    Save,
    UserRoundCheck,
    CalendarDays,
    Clock3,
    ShieldCheck,
} from "lucide-react";

import {
    useDepartments,
} from "../hooks/useDepartments";

import api from "../api/axios";

import toast from "react-hot-toast";

// ============================================================
// ATTENDANCE DONUT
// ============================================================

const AttendanceDonut = ({
    percent,
}) => {
    const radius =
        45;

    const circumference =
        2 *
        Math.PI *
        radius;

    const offset =
        circumference -
        (percent / 100) *
            circumference;

    return (
        <div className="relative h-28 w-28 shrink-0">

            <svg
                viewBox="0 0 100 100"
                className="h-full w-full -rotate-90"
            >

                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="10"
                />

                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="10"
                    strokeDasharray={
                        circumference
                    }
                    strokeDashoffset={
                        offset
                    }
                    strokeLinecap="round"
                />

            </svg>

            <div className="absolute inset-0 flex items-center justify-center">

                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white shadow-md">
                    {percent}%
                </span>

            </div>

        </div>
    );
};

// ============================================================
// ADMIN DASHBOARD
// ============================================================

const AdminDashboard = ({
    data,
}) => {
    const navigate =
        useNavigate();

    const {
        departments,
    } =
        useDepartments();

    const [
        activeModal,
        setActiveModal,
    ] =
        useState(
            null
        );

    // ============================================================
    // EMPLOYEE DOCUMENTS
    // ============================================================

    const [
        showDocsModal,
        setShowDocsModal,
    ] =
        useState(
            false
        );

    const [
        selectedEmpId,
        setSelectedEmpId,
    ] =
        useState(
            ""
        );

    const [
        selectedEmpDocs,
        setSelectedEmpDocs,
    ] =
        useState(
            []
        );

    const [
        loadingDocs,
        setLoadingDocs,
    ] =
        useState(
            false
        );

    // ============================================================
    // QUICK EMPLOYEE SEARCH
    // ============================================================

    const [
        searchTerm,
        setSearchTerm,
    ] =
        useState(
            ""
        );

    const [
        employees,
        setEmployees,
    ] =
        useState(
            []
        );

    const [
        isSearching,
        setIsSearching,
    ] =
        useState(
            false
        );

    const searchRef =
        useRef(
            null
        );

    // ============================================================
    // ADMIN ATTENDANCE OVERRIDE
    // ============================================================

    const [
        showAttendanceOverride,
        setShowAttendanceOverride,
    ] =
        useState(
            false
        );

    const [
        overrideLoading,
        setOverrideLoading,
    ] =
        useState(
            false
        );

    const [
        overrideSaving,
        setOverrideSaving,
    ] =
        useState(
            false
        );

    const [
        existingAttendance,
        setExistingAttendance,
    ] =
        useState(
            null
        );

    const [
        attendanceOverride,
        setAttendanceOverride,
    ] =
        useState({
            employeeId:
                "",

            date:
                "",

            status:
                "PRESENT",

            checkInTime:
                "",

            checkOutTime:
                "",

            reason:
                "",
        });

    // ============================================================
    // FETCH EMPLOYEES
    // ============================================================

    useEffect(
        () => {
            const fetchEmployees =
                async () => {
                    try {
                        const res =
                            await api.get(
                                "/employees"
                            );

                        const list =
                            Array.isArray(
                                res.data
                            )
                                ? res.data
                                : res.data
                                      ?.employees ||
                                  [];

                        setEmployees(
                            list.filter(
                                (
                                    employee
                                ) =>
                                    !employee.isDeleted
                            )
                        );

                    } catch (
                        error
                    ) {
                        console.error(
                            "Failed to load employees for search",
                            error
                        );
                    }
                };

            fetchEmployees();

        },
        []
    );

    // ============================================================
    // EMPLOYEE DOCUMENTS
    // ============================================================

    const fetchEmployeeDocs =
        async (
            empId
        ) => {
            if (
                !empId
            ) {
                setSelectedEmpDocs(
                    []
                );

                return;
            }

            setLoadingDocs(
                true
            );

            try {
                const res =
                    await api.get(
                        `/employees/${empId}/documents`
                    );

                setSelectedEmpDocs(
                    res.data
                        ?.documents ||
                        []
                );

            } catch (
                error
            ) {
                console.error(
                    "Failed to load employee documents",
                    error
                );

                setSelectedEmpDocs(
                    []
                );

            } finally {
                setLoadingDocs(
                    false
                );
            }
        };

    // ============================================================
    // DOWNLOAD EMPLOYEE DOCUMENT
    // ============================================================

    const handleDownloadDocument =
        async (
            employeeId,
            documentId,
            fileName
        ) => {
            if (
                !employeeId ||
                !documentId
            ) {
                alert(
                    "Document information is missing."
                );

                return;
            }

            try {
                const response =
                    await api.get(
                        `/employees/${employeeId}/documents/${documentId}/download`,
                        {
                            responseType:
                                "blob",
                        }
                    );

                const contentType =
                    response.headers[
                        "content-type"
                    ] ||
                    "application/octet-stream";

                const blob =
                    new Blob(
                        [
                            response.data,
                        ],
                        {
                            type:
                                contentType,
                        }
                    );

                const url =
                    window.URL.createObjectURL(
                        blob
                    );

                const link =
                    document.createElement(
                        "a"
                    );

                link.href =
                    url;

                link.download =
                    fileName ||
                    "employee-document";

                document.body.appendChild(
                    link
                );

                link.click();

                link.remove();

                setTimeout(
                    () => {
                        window.URL.revokeObjectURL(
                            url
                        );
                    },
                    1000
                );

            } catch (
                error
            ) {
                console.error(
                    "Employee document download failed:",
                    error
                );

                let message =
                    "Failed to download employee document.";

                if (
                    error.response
                        ?.data instanceof
                    Blob
                ) {
                    try {
                        const text =
                            await error.response.data.text();

                        const parsed =
                            JSON.parse(
                                text
                            );

                        message =
                            parsed.error ||
                            message;

                        console.error(
                            "Backend download error:",
                            parsed
                        );

                    } catch {
                        // Ignore JSON parsing error
                    }
                }

                alert(
                    message
                );
            }
        };

    // ============================================================
    // QUICK SEARCH
    // ============================================================

    const searchResults =
        useMemo(
            () => {
                if (
                    !searchTerm.trim()
                ) {
                    return [];
                }

                const term =
                    searchTerm.toLowerCase();

                return employees.filter(
                    (
                        employee
                    ) => {
                        const name =
                            `${employee.firstName || ""} ${employee.lastName || ""}`.toLowerCase();

                        const code =
                            (
                                employee.employeeCode ||
                                ""
                            ).toLowerCase();

                        const dept =
                            (
                                employee.department ||
                                ""
                            ).toLowerCase();

                        return (
                            name.includes(
                                term
                            ) ||
                            code.includes(
                                term
                            ) ||
                            dept.includes(
                                term
                            )
                        );
                    }
                );
            },
            [
                searchTerm,
                employees,
            ]
        );

    // ============================================================
    // CLOSE SEARCH ON OUTSIDE CLICK
    // ============================================================

    useEffect(
        () => {
            const handleClickOutside =
                (
                    event
                ) => {
                    if (
                        searchRef.current &&
                        !searchRef.current.contains(
                            event.target
                        )
                    ) {
                        setIsSearching(
                            false
                        );
                    }
                };

            document.addEventListener(
                "mousedown",
                handleClickOutside
            );

            return () =>
                document.removeEventListener(
                    "mousedown",
                    handleClickOutside
                );
        },
        []
    );

    const handleSelectEmployee =
        (
            empId
        ) => {
            setSearchTerm(
                ""
            );

            setIsSearching(
                false
            );

            navigate(
                `/employees/${empId}`
            );
        };

    // ============================================================
    // ADMIN ATTENDANCE OVERRIDE HELPERS
    // ============================================================

    const resetAttendanceOverride =
        () => {
            setAttendanceOverride({
                employeeId:
                    "",

                date:
                    "",

                status:
                    "PRESENT",

                checkInTime:
                    "",

                checkOutTime:
                    "",

                reason:
                    "",
            });

            setExistingAttendance(
                null
            );
        };

    const closeAttendanceOverride =
        () => {
            if (
                overrideSaving
            ) {
                return;
            }

            setShowAttendanceOverride(
                false
            );

            resetAttendanceOverride();
        };

    const formatTimeForInput =
        (
            dateValue
        ) => {
            if (
                !dateValue
            ) {
                return "";
            }

            try {
                return new Date(
                    dateValue
                ).toLocaleTimeString(
                    "en-GB",
                    {
                        timeZone:
                            "Asia/Kolkata",

                        hour:
                            "2-digit",

                        minute:
                            "2-digit",

                        hour12:
                            false,
                    }
                );

            } catch {
                return "";
            }
        };

    // ============================================================
    // FETCH EXISTING ATTENDANCE FOR ADMIN
    // ============================================================

    const fetchExistingAttendance =
        async (
            employeeId,
            date
        ) => {
            if (
                !employeeId ||
                !date
            ) {
                setExistingAttendance(
                    null
                );

                return;
            }

            try {
                setOverrideLoading(
                    true
                );

                const response =
                    await api.get(
                        "/attendance/admin/record",
                        {
                            params: {
                                employeeId,
                                date,
                            },
                        }
                    );

                const record =
                    response.data
                        ?.data ||
                    null;

                setExistingAttendance(
                    record
                );

                if (
                    record
                ) {
                    setAttendanceOverride(
                        (
                            previous
                        ) => ({
                            ...previous,

                            status:
                                record.status ||
                                "PRESENT",

                            checkInTime:
                                formatTimeForInput(
                                    record.checkIn
                                ),

                            checkOutTime:
                                formatTimeForInput(
                                    record.checkOut
                                ),

                            reason:
                                "",
                        })
                    );

                } else {
                    setAttendanceOverride(
                        (
                            previous
                        ) => ({
                            ...previous,

                            status:
                                "PRESENT",

                            checkInTime:
                                "",

                            checkOutTime:
                                "",

                            reason:
                                "",
                        })
                    );
                }

            } catch (
                error
            ) {
                console.error(
                    "Fetch attendance override record error:",
                    error
                );

                setExistingAttendance(
                    null
                );

                toast.error(
                    error.response
                        ?.data
                        ?.error ||
                        "Failed to load attendance for selected date"
                );

            } finally {
                setOverrideLoading(
                    false
                );
            }
        };

    // ============================================================
    // OVERRIDE FORM CHANGE
    // ============================================================

    const handleOverrideChange =
        (
            event
        ) => {
            const {
                name,
                value,
            } =
                event.target;

            const next =
                {
                    ...attendanceOverride,

                    [name]:
                        value,
                };

            if (
                name ===
                    "status" &&
                value ===
                    "ABSENT"
            ) {
                next.checkInTime =
                    "";

                next.checkOutTime =
                    "";
            }

            setAttendanceOverride(
                next
            );

            if (
                name ===
                    "employeeId" ||
                name ===
                    "date"
            ) {
                const employeeId =
                    name ===
                    "employeeId"
                        ? value
                        : attendanceOverride.employeeId;

                const date =
                    name ===
                    "date"
                        ? value
                        : attendanceOverride.date;

                fetchExistingAttendance(
                    employeeId,
                    date
                );
            }
        };

    // ============================================================
    // SAVE ADMIN OVERRIDE
    // ============================================================

    const handleSaveAttendanceOverride =
        async (
            event
        ) => {
            event.preventDefault();

            const {
                employeeId,
                date,
                status,
                checkInTime,
                checkOutTime,
                reason,
            } =
                attendanceOverride;

            if (
                !employeeId
            ) {
                toast.error(
                    "Please select an employee."
                );

                return;
            }

            if (
                !date
            ) {
                toast.error(
                    "Please select an attendance date."
                );

                return;
            }

            if (
                !reason.trim()
            ) {
                toast.error(
                    "Please enter a reason for the admin override."
                );

                return;
            }

            if (
                status !==
                    "ABSENT" &&
                (
                    !checkInTime ||
                    !checkOutTime
                )
            ) {
                toast.error(
                    "Clock in and clock out time are required for Present or Late attendance."
                );

                return;
            }

            if (
                status !==
                    "ABSENT" &&
                checkOutTime <=
                    checkInTime
            ) {
                toast.error(
                    "Clock out time must be after clock in time."
                );

                return;
            }

            try {
                setOverrideSaving(
                    true
                );

                const response =
                    await api.put(
                        "/attendance/admin/override",
                        {
                            employeeId,
                            date,
                            status,

                            checkInTime:
                                status ===
                                "ABSENT"
                                    ? null
                                    : checkInTime,

                            checkOutTime:
                                status ===
                                "ABSENT"
                                    ? null
                                    : checkOutTime,

                            reason:
                                reason.trim(),
                        }
                    );

                toast.success(
                    response.data
                        ?.message ||
                        "Attendance updated successfully."
                );

                setExistingAttendance(
                    response.data
                        ?.data ||
                        null
                );

                setShowAttendanceOverride(
                    false
                );

                resetAttendanceOverride();

            } catch (
                error
            ) {
                console.error(
                    "Admin attendance override error:",
                    error
                );

                toast.error(
                    error.response
                        ?.data
                        ?.error ||
                        "Failed to update attendance"
                );

            } finally {
                setOverrideSaving(
                    false
                );
            }
        };

    // ============================================================
    // DASHBOARD STATISTICS
    // ============================================================

    const stats = [
        {
            icon:
                UsersIcon,

            value:
                data.totalEmployees,

            label:
                "Total Employees",

            description:
                "Active workforce",
        },

        {
            icon:
                Building2Icon,

            value:
                departments.length,

            label:
                "Departments",

            description:
                "Organization units",
        },

        {
            icon:
                CalendarIcon,

            value:
                data.todayAttendance,

            label:
                "Today's Attendance",

            description:
                "Checked in today",
        },

        {
            icon:
                FileTextIcon,

            value:
                data.pendingLeaves,

            label:
                "Pending Leaves",

            description:
                "Awaiting approval",
        },
    ];

    const todayStats = [
        {
            key:
                "lateCheckIns",

            icon:
                ClockIcon,

            value:
                data.lateCheckIns ??
                0,

            names:
                data.lateCheckInEmployees,

            label:
                "Late Check-ins",

            description:
                "Checked in late today",

            color:
                "amber",
        },

        {
            key:
                "earlyCheckOuts",

            icon:
                LogOutIcon,

            value:
                data.earlyCheckOuts ??
                0,

            names:
                data.earlyCheckOutEmployees,

            label:
                "Early Check-outs",

            description:
                "Left before full hours",

            color:
                "rose",
        },

        {
            key:
                "notCheckedIn",

            icon:
                UserXIcon,

            value:
                data.notCheckedInYet ??
                0,

            names:
                data.notCheckedInEmployees,

            label:
                "Not Checked In Yet",

            description:
                "No activity today",

            color:
                "slate",
        },

        {
            key:
                "weekendHolidayWork",

            icon:
                CalendarIcon,

            value:
                data.weekendHolidayWorkCount ??
                0,

            names:
                data.weekendHolidayWorkEmployees,

            label:
                "Weekend / Holiday Work",

            description:
                "Worked extra / comp off",

            color:
                "amber",
        },
    ];

    const colorMap = {
        amber:
            "bg-amber-50 text-amber-600 group-hover:bg-amber-100",

        rose:
            "bg-rose-50 text-rose-600 group-hover:bg-rose-100",

        slate:
            "bg-slate-100 text-slate-600 group-hover:bg-slate-200",
    };

    const activeStat =
        todayStats.find(
            (
                stat
            ) =>
                stat.key ===
                activeModal
        );

    // ============================================================
    // UI
    // ============================================================

    return (
        <div className="animate-fade-in-up space-y-6">

            {/* =====================================================
                HEADER
            ===================================================== */}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="page-header">

                    <h1 className="page-title animate-title-slide">
                        Dashboard
                    </h1>

                    <p className="page-subtitle">
                        Welcome back, Admin -
                        here's your overview
                    </p>

                </div>

                {/* EMPLOYEE SEARCH BAR */}

                <div
                    ref={
                        searchRef
                    }
                    className="relative w-full sm:w-80"
                >

                    <div className="relative">

                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                            type="text"
                            value={
                                searchTerm
                            }
                            onFocus={() =>
                                setIsSearching(
                                    true
                                )
                            }
                            onChange={(
                                event
                            ) => {
                                setSearchTerm(
                                    event.target.value
                                );

                                setIsSearching(
                                    true
                                );
                            }}
                            placeholder="Search employee by name..."
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />

                        {searchTerm && (

                            <button
                                onClick={() =>
                                    setSearchTerm(
                                        ""
                                    )
                                }
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X
                                    size={
                                        15
                                    }
                                />
                            </button>

                        )}

                    </div>

                    {/* AUTOCOMPLETE */}

                    {isSearching &&
                        searchTerm.trim() && (

                            <div className="animate-modal-in absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">

                                {searchResults.length ===
                                0 ? (

                                    <div className="p-4 text-center text-xs text-slate-400">
                                        No employee
                                        found matching
                                        "
                                        {
                                            searchTerm
                                        }
                                        "
                                    </div>

                                ) : (

                                    searchResults.map(
                                        (
                                            employee
                                        ) => {
                                            const empId =
                                                employee._id ||
                                                employee.id;

                                            const name =
                                                `${employee.firstName || ""} ${employee.lastName || ""}`.trim();

                                            return (

                                                <div
                                                    key={
                                                        empId
                                                    }
                                                    onClick={() =>
                                                        handleSelectEmployee(
                                                            empId
                                                        )
                                                    }
                                                    className="flex cursor-pointer items-center justify-between rounded-lg p-2.5 transition hover:bg-slate-50"
                                                >

                                                    <div className="flex items-center gap-3">

                                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                                                            {employee
                                                                .firstName
                                                                ?.[0] ||
                                                                "E"}
                                                        </div>

                                                        <div>

                                                            <p className="text-sm font-semibold text-slate-800">
                                                                {
                                                                    name
                                                                }
                                                            </p>

                                                            <p className="text-xs text-slate-500">
                                                                {employee.position ||
                                                                    "Employee"}{" "}
                                                                •{" "}
                                                                {employee.department ||
                                                                    "Dept"}
                                                            </p>

                                                        </div>

                                                    </div>

                                                    <ChevronRight
                                                        size={
                                                            16
                                                        }
                                                        className="text-slate-400"
                                                    />

                                                </div>

                                            );
                                        }
                                    )

                                )}

                            </div>

                        )}

                </div>

            </div>

            {/* =====================================================
                STAT CARDS
            ===================================================== */}

            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">

                {stats.map(
                    (
                        stat
                    ) => {
                        const Icon =
                            stat.icon;

                        return (

                            <div
                                key={
                                    stat.label
                                }
                                className="card card-hover group relative flex items-center justify-between overflow-hidden p-5 sm:p-6"
                            >

                                <div>

                                    <div className="absolute bottom-0 left-0 top-0 w-1 rounded-r-full bg-slate-500/70 transition-colors group-hover:bg-indigo-500/70" />

                                    <p className="text-sm font-medium text-slate-700">
                                        {
                                            stat.label
                                        }
                                    </p>

                                    <p className="mt-1 text-2xl font-bold text-slate-900">
                                        {
                                            stat.value
                                        }
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        {
                                            stat.description
                                        }
                                    </p>

                                </div>

                                <Icon className="size-10 rounded-lg bg-slate-100 p-2.5 text-slate-600 transition-colors duration-200 group-hover:bg-indigo-50 group-hover:text-indigo-600" />

                            </div>

                        );
                    }
                )}

            </div>

            {/* =====================================================
                QUICK ADMIN ACTIONS
            ===================================================== */}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <h2 className="text-sm font-semibold text-slate-700">
                    Today's Snapshot
                </h2>

                <div className="flex flex-wrap gap-2">

                    {/* NEW ADMIN ATTENDANCE OVERRIDE */}

                    <button
                        type="button"
                        onClick={() => {
                            resetAttendanceOverride();

                            setShowAttendanceOverride(
                                true
                            );
                        }}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >

                        <PencilLine
                            size={
                                15
                            }
                        />

                        Attendance Override

                    </button>

                    {/* EXISTING DOCUMENT BUTTON */}

                    <button
                        onClick={() =>
                            setShowDocsModal(
                                true
                            )
                        }
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >

                        <FolderOpen
                            size={
                                15
                            }
                        />

                        Employee Documents

                    </button>

                </div>

            </div>

            {/* =====================================================
                TODAY SNAPSHOT
            ===================================================== */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">

                <div className="card card-hover relative flex items-center gap-5 overflow-hidden p-5 sm:p-6">

                    <div className="absolute bottom-0 left-0 top-0 w-1 rounded-r-full bg-indigo-500/70" />

                    <AttendanceDonut
                        percent={
                            data.attendancePercent ??
                            0
                        }
                    />

                    <div>

                        <p className="text-sm font-medium text-slate-700">
                            Attendance %
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            of active employees
                            today
                        </p>

                    </div>

                </div>

                {todayStats.map(
                    (
                        stat
                    ) => {
                        const Icon =
                            stat.icon;

                        const isClickable =
                            stat.value >
                            0;

                        return (

                            <div
                                key={
                                    stat.key
                                }
                                onClick={() =>
                                    isClickable &&
                                    setActiveModal(
                                        stat.key
                                    )
                                }
                                className={`card card-hover group relative flex items-center justify-between overflow-hidden p-5 sm:p-6 ${
                                    isClickable
                                        ? "cursor-pointer"
                                        : ""
                                }`}
                            >

                                <div>

                                    <div className="absolute bottom-0 left-0 top-0 w-1 rounded-r-full bg-slate-500/70 transition-colors group-hover:bg-indigo-500/70" />

                                    <p className="text-sm font-medium text-slate-700">
                                        {
                                            stat.label
                                        }
                                    </p>

                                    <p className="mt-1 text-2xl font-bold text-slate-900">
                                        {
                                            stat.value
                                        }
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">

                                        {isClickable
                                            ? "Click to view names"
                                            : stat.description}

                                    </p>

                                </div>

                                <Icon
                                    className={`size-10 rounded-lg p-2.5 transition-colors duration-200 ${colorMap[stat.color]}`}
                                />

                            </div>

                        );
                    }
                )}

            </div>

            {/* =====================================================
                SNAPSHOT MODAL
            ===================================================== */}

            {activeStat &&
                createPortal(

                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-md"
                        onClick={() =>
                            setActiveModal(
                                null
                            )
                        }
                    >

                        <div
                            className="animate-modal-in relative w-full max-w-md rounded-2xl bg-white shadow-2xl"
                            onClick={(
                                event
                            ) =>
                                event.stopPropagation()
                            }
                        >

                            <div className="flex items-center justify-between p-6 pb-0">

                                <h2 className="text-lg font-semibold text-slate-800">
                                    {
                                        activeStat.label
                                    }
                                </h2>

                                <button
                                    onClick={() =>
                                        setActiveModal(
                                            null
                                        )
                                    }
                                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                >

                                    <X className="h-5 w-5" />

                                </button>

                            </div>

                            <div className="p-6">

                                {!activeStat.names ||
                                activeStat.names.length ===
                                    0 ? (

                                    <p className="py-6 text-center text-slate-400">
                                        No one to show
                                    </p>

                                ) : (

                                    <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">

                                        {activeStat.names.map(
                                            (
                                                name,
                                                index
                                            ) => (

                                                <li
                                                    key={
                                                        index
                                                    }
                                                    className="py-3 text-sm font-medium text-slate-900"
                                                >
                                                    {
                                                        name
                                                    }
                                                </li>

                                            )
                                        )}

                                    </ul>

                                )}

                            </div>

                        </div>

                    </div>,

                    document.body

                )}

            {/* =====================================================
                EMPLOYEE DOCUMENT MODAL
                EXISTING FUNCTIONALITY
            ===================================================== */}

            {showDocsModal &&
                createPortal(

                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-md"
                        onClick={() =>
                            setShowDocsModal(
                                false
                            )
                        }
                    >

                        <div
                            className="animate-modal-in relative w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
                            onClick={(
                                event
                            ) =>
                                event.stopPropagation()
                            }
                        >

                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">

                                <div className="flex items-center gap-2.5">

                                    <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">

                                        <FolderOpen
                                            size={
                                                20
                                            }
                                        />

                                    </div>

                                    <div>

                                        <h2 className="text-base font-bold text-slate-900">
                                            Employee
                                            Documents
                                        </h2>

                                        <p className="text-xs text-slate-500">
                                            Select an
                                            employee to
                                            download their
                                            uploaded files
                                        </p>

                                    </div>

                                </div>

                                <button
                                    onClick={() =>
                                        setShowDocsModal(
                                            false
                                        )
                                    }
                                    className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                >

                                    <X className="h-5 w-5" />

                                </button>

                            </div>

                            {/* SELECT EMPLOYEE */}

                            <div>

                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Select
                                    Employee *
                                </label>

                                <select
                                    value={
                                        selectedEmpId
                                    }
                                    onChange={(
                                        event
                                    ) => {
                                        setSelectedEmpId(
                                            event.target.value
                                        );

                                        fetchEmployeeDocs(
                                            event.target.value
                                        );
                                    }}
                                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-indigo-500"
                                >

                                    <option value="">
                                        -- Choose an
                                        Employee --
                                    </option>

                                    {employees.map(
                                        (
                                            employee
                                        ) => (

                                            <option
                                                key={
                                                    employee._id ||
                                                    employee.id
                                                }
                                                value={
                                                    employee._id ||
                                                    employee.id
                                                }
                                            >
                                                {
                                                    employee.firstName
                                                }{" "}
                                                {
                                                    employee.lastName
                                                }{" "}
                                                (
                                                {
                                                    employee.employeeCode
                                                }
                                                )
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                            {/* DOCUMENTS LIST */}

                            {selectedEmpId ? (

                                <div className="pt-2">

                                    {loadingDocs ? (

                                        <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">

                                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />

                                            <span>
                                                Fetching employee
                                                documents...
                                            </span>

                                        </div>

                                    ) : !selectedEmpDocs ||
                                      selectedEmpDocs.length ===
                                          0 ? (

                                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">

                                            <FileX
                                                size={
                                                    32
                                                }
                                                className="mx-auto mb-2 text-slate-300"
                                            />

                                            <p className="text-sm font-semibold text-slate-700">
                                                No attachments
                                                found
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                This employee
                                                has not uploaded
                                                or attached any
                                                documents yet.
                                            </p>

                                        </div>

                                    ) : (

                                        <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">

                                            {selectedEmpDocs.map(
                                                (
                                                    doc
                                                ) => (

                                                    <div
                                                        key={
                                                            doc._id ||
                                                            doc.name
                                                        }
                                                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3"
                                                    >

                                                        <div className="flex min-w-0 items-center gap-3">

                                                            <div className="shrink-0 rounded-lg bg-indigo-100 p-2 text-indigo-700">

                                                                <FileText
                                                                    size={
                                                                        16
                                                                    }
                                                                />

                                                            </div>

                                                            <div className="min-w-0">

                                                                <p className="truncate text-sm font-semibold text-slate-800">
                                                                    {
                                                                        doc.name
                                                                    }
                                                                </p>

                                                                <p className="truncate text-[11px] text-slate-400">
                                                                    {
                                                                        doc.fileName
                                                                    }
                                                                </p>

                                                            </div>

                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleDownloadDocument(
                                                                    selectedEmpId,
                                                                    doc._id,
                                                                    doc.fileName ||
                                                                        doc.name
                                                                )
                                                            }
                                                            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                                                        >

                                                            <Download
                                                                size={
                                                                    14
                                                                }
                                                            />

                                                            Download

                                                        </button>

                                                    </div>

                                                )
                                            )}

                                        </div>

                                    )}

                                </div>

                            ) : (

                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-xs text-slate-400">
                                    Pick an employee
                                    from the dropdown
                                    above to view
                                    their documents.
                                </div>

                            )}

                        </div>

                    </div>,

                    document.body

                )}

            {/* =====================================================
                ADMIN ATTENDANCE OVERRIDE MODAL
                NEW FUNCTIONALITY
            ===================================================== */}

            {showAttendanceOverride &&
                createPortal(

                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
                        onClick={
                            closeAttendanceOverride
                        }
                    >

                        <div
                            className="animate-modal-in max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
                            onClick={(
                                event
                            ) =>
                                event.stopPropagation()
                            }
                        >

                            {/* HEADER */}

                            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">

                                <div className="flex items-start gap-3">

                                    <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">

                                        <UserRoundCheck
                                            size={
                                                22
                                            }
                                        />

                                    </div>

                                    <div>

                                        <h2 className="text-lg font-bold text-slate-900">
                                            Attendance
                                            Override
                                        </h2>

                                        <p className="mt-1 text-xs text-slate-500">
                                            Correct or
                                            override an
                                            employee's
                                            attendance
                                            record.
                                        </p>

                                    </div>

                                </div>

                                <button
                                    type="button"
                                    disabled={
                                        overrideSaving
                                    }
                                    onClick={
                                        closeAttendanceOverride
                                    }
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                                >

                                    <X
                                        size={
                                            18
                                        }
                                    />

                                </button>

                            </div>

                            {/* ADMIN INFORMATION */}

                            <div className="mx-6 mt-5 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">

                                <ShieldCheck
                                    size={
                                        18
                                    }
                                    className="mt-0.5 shrink-0 text-emerald-600"
                                />

                                <div className="text-xs leading-relaxed text-emerald-800">

                                    <p className="font-semibold text-emerald-900">
                                        Admin Override
                                    </p>

                                    <p className="mt-1">
                                        Admin attendance
                                        corrections have
                                        no monthly limit.
                                        The updated record
                                        will appear in the
                                        employee's
                                        attendance history.
                                    </p>

                                </div>

                            </div>

                            {/* FORM */}

                            <form
                                onSubmit={
                                    handleSaveAttendanceOverride
                                }
                                className="space-y-5 p-6"
                            >

                                {/* EMPLOYEE */}

                                <div>

                                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                        Employee *
                                    </label>

                                    <select
                                        name="employeeId"
                                        value={
                                            attendanceOverride.employeeId
                                        }
                                        onChange={
                                            handleOverrideChange
                                        }
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    >

                                        <option value="">
                                            Select employee
                                        </option>

                                        {employees.map(
                                            (
                                                employee
                                            ) => (

                                                <option
                                                    key={
                                                        employee._id ||
                                                        employee.id
                                                    }
                                                    value={
                                                        employee._id ||
                                                        employee.id
                                                    }
                                                >
                                                    {
                                                        employee.firstName
                                                    }{" "}
                                                    {
                                                        employee.lastName
                                                    }
                                                    {employee.employeeCode
                                                        ? ` (${employee.employeeCode})`
                                                        : ""}
                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>

                                {/* DATE */}

                                <div>

                                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">

                                        <CalendarDays
                                            size={
                                                14
                                            }
                                        />

                                        Attendance Date *

                                    </label>

                                    <input
                                        type="date"
                                        name="date"
                                        value={
                                            attendanceOverride.date
                                        }
                                        onChange={
                                            handleOverrideChange
                                        }
                                        required
                                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    />

                                </div>

                                {/* EXISTING RECORD */}

                                {overrideLoading ? (

                                    <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">

                                        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />

                                        Loading existing
                                        attendance...

                                    </div>

                                ) : attendanceOverride.employeeId &&
                                  attendanceOverride.date ? (

                                    existingAttendance ? (

                                        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">

                                            <p className="text-xs font-semibold text-indigo-900">
                                                Existing
                                                Attendance
                                                Found
                                            </p>

                                            <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-indigo-800">

                                                <div>
                                                    <span className="text-indigo-500">
                                                        Status
                                                    </span>

                                                    <p className="font-semibold">
                                                        {
                                                            existingAttendance.status
                                                        }
                                                    </p>
                                                </div>

                                                <div>
                                                    <span className="text-indigo-500">
                                                        Day Type
                                                    </span>

                                                    <p className="font-semibold">
                                                        {existingAttendance.dayType ||
                                                            "In Progress"}
                                                    </p>
                                                </div>

                                                <div>
                                                    <span className="text-indigo-500">
                                                        Check In
                                                    </span>

                                                    <p className="font-semibold">
                                                        {existingAttendance.checkIn
                                                            ? formatTimeForInput(
                                                                  existingAttendance.checkIn
                                                              )
                                                            : "-"}
                                                    </p>
                                                </div>

                                                <div>
                                                    <span className="text-indigo-500">
                                                        Check Out
                                                    </span>

                                                    <p className="font-semibold">
                                                        {existingAttendance.checkOut
                                                            ? formatTimeForInput(
                                                                  existingAttendance.checkOut
                                                              )
                                                            : "-"}
                                                    </p>
                                                </div>

                                            </div>

                                        </div>

                                    ) : (

                                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                                            No attendance
                                            exists for this
                                            employee on the
                                            selected date.
                                            Saving will create
                                            a new attendance
                                            record.
                                        </div>

                                    )

                                ) : null}

                                {/* STATUS */}

                                <div>

                                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                        Attendance Status *
                                    </label>

                                    <div className="grid grid-cols-3 gap-2">

                                        {[
                                            "PRESENT",
                                            "LATE",
                                            "ABSENT",
                                        ].map(
                                            (
                                                status
                                            ) => (

                                                <button
                                                    key={
                                                        status
                                                    }
                                                    type="button"
                                                    onClick={() =>
                                                        setAttendanceOverride(
                                                            (
                                                                previous
                                                            ) => ({
                                                                ...previous,

                                                                status,

                                                                ...(status ===
                                                                "ABSENT"
                                                                    ? {
                                                                          checkInTime:
                                                                              "",

                                                                          checkOutTime:
                                                                              "",
                                                                      }
                                                                    : {}),
                                                            })
                                                        )
                                                    }
                                                    className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                                                        attendanceOverride.status ===
                                                        status
                                                            ? status ===
                                                              "ABSENT"
                                                                ? "border-red-300 bg-red-50 text-red-700"
                                                                : status ===
                                                                  "LATE"
                                                                ? "border-amber-300 bg-amber-50 text-amber-700"
                                                                : "border-emerald-300 bg-emerald-50 text-emerald-700"
                                                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                                    }`}
                                                >
                                                    {
                                                        status
                                                    }
                                                </button>

                                            )
                                        )}

                                    </div>

                                </div>

                                {/* TIMES */}

                                {attendanceOverride.status !==
                                    "ABSENT" && (

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                                        <div>

                                            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">

                                                <Clock3
                                                    size={
                                                        14
                                                    }
                                                />

                                                Clock In *

                                            </label>

                                            <input
                                                type="time"
                                                name="checkInTime"
                                                value={
                                                    attendanceOverride.checkInTime
                                                }
                                                onChange={
                                                    handleOverrideChange
                                                }
                                                required
                                                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                            />

                                        </div>

                                        <div>

                                            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">

                                                <Clock3
                                                    size={
                                                        14
                                                    }
                                                />

                                                Clock Out *

                                            </label>

                                            <input
                                                type="time"
                                                name="checkOutTime"
                                                value={
                                                    attendanceOverride.checkOutTime
                                                }
                                                onChange={
                                                    handleOverrideChange
                                                }
                                                required
                                                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                            />

                                        </div>

                                    </div>

                                )}

                                {/* REASON */}

                                <div>

                                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                        Override Reason *
                                    </label>

                                    <textarea
                                        name="reason"
                                        value={
                                            attendanceOverride.reason
                                        }
                                        onChange={
                                            handleOverrideChange
                                        }
                                        rows={
                                            3
                                        }
                                        maxLength={
                                            500
                                        }
                                        required
                                        placeholder="Example: Employee confirmed attendance through HR / manager."
                                        className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    />

                                    <p className="mt-1 text-right text-[10px] text-slate-400">
                                        {
                                            attendanceOverride.reason.length
                                        }
                                        /500
                                    </p>

                                </div>

                                {/* ACTIONS */}

                                <div className="flex gap-3 border-t border-slate-100 pt-4">

                                    <button
                                        type="button"
                                        disabled={
                                            overrideSaving
                                        }
                                        onClick={
                                            closeAttendanceOverride
                                        }
                                        className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={
                                            overrideSaving ||
                                            overrideLoading
                                        }
                                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >

                                        {overrideSaving ? (

                                            <>
                                                <Loader2
                                                    size={
                                                        16
                                                    }
                                                    className="animate-spin"
                                                />

                                                Saving...
                                            </>

                                        ) : (

                                            <>
                                                <Save
                                                    size={
                                                        16
                                                    }
                                                />

                                                Save Override
                                            </>

                                        )}

                                    </button>

                                </div>

                            </form>

                        </div>

                    </div>,

                    document.body

                )}

        </div>
    );
};

export default AdminDashboard;