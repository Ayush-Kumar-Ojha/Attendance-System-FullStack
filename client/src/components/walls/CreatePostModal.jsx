import {
    useState,
    useRef,
    useEffect,
} from "react";

import {
    X,
    Image as ImageIcon,
    Loader2,
    Users,
    Building2,
    UserRound,
    Check,
} from "lucide-react";

import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useDepartments } from "../../hooks/useDepartments";

const CreatePostModal = ({
    open,
    onClose,
    onSuccess,
}) => {
    const { user } = useAuth();

    const isAdmin =
        user?.role === "ADMIN";

    const {
        departments,
    } =
        useDepartments();

    // ============================================================
    // POST STATE
    // ============================================================

    const [
        text,
        setText,
    ] =
        useState("");

    const [
        imageFiles,
        setImageFiles,
    ] =
        useState([]);

    const [
        imagePreviews,
        setImagePreviews,
    ] =
        useState([]);

    const [
        posting,
        setPosting,
    ] =
        useState(false);

    const fileInputRef =
        useRef(null);

    // ============================================================
    // AUDIENCE STATE
    // ============================================================

    const [
        audienceType,
        setAudienceType,
    ] =
        useState(
            "EVERYONE"
        );

    const [
        selectedDepartments,
        setSelectedDepartments,
    ] =
        useState([]);

    const [
        employees,
        setEmployees,
    ] =
        useState([]);

    const [
        selectedEmployeeIds,
        setSelectedEmployeeIds,
    ] =
        useState([]);

    // ============================================================
    // FETCH EMPLOYEES FOR ADMIN AUDIENCE SELECTION
    // ============================================================

    useEffect(
        () => {
            if (
                isAdmin &&
                open
            ) {
                api
                    .get(
                        "/employees"
                    )
                    .then(
                        (
                            res
                        ) => {
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
                        }
                    )
                    .catch(
                        () => {}
                    );
            }
        },
        [
            isAdmin,
            open,
        ]
    );

    if (!open) {
        return null;
    }

    // ============================================================
    // IMAGE HANDLING
    // ============================================================

    const handleImageChange =
        (
            e
        ) => {
            const files =
                Array.from(
                    e.target.files
                ).slice(
                    0,
                    5 -
                        imageFiles.length
                );

            if (
                files.length ===
                0
            ) {
                return;
            }

            setImageFiles(
                (
                    prev
                ) => [
                    ...prev,
                    ...files,
                ]
            );

            setImagePreviews(
                (
                    prev
                ) => [
                    ...prev,
                    ...files.map(
                        (
                            file
                        ) =>
                            URL.createObjectURL(
                                file
                            )
                    ),
                ]
            );

            // Allows selecting same file again later
            e.target.value =
                "";
        };

    const removeImage =
        (
            index
        ) => {
            setImageFiles(
                (
                    prev
                ) =>
                    prev.filter(
                        (
                            _,
                            i
                        ) =>
                            i !==
                            index
                    )
            );

            setImagePreviews(
                (
                    prev
                ) => {
                    const removed =
                        prev[
                            index
                        ];

                    if (
                        removed
                    ) {
                        URL.revokeObjectURL(
                            removed
                        );
                    }

                    return prev.filter(
                        (
                            _,
                            i
                        ) =>
                            i !==
                            index
                    );
                }
            );
        };

    // ============================================================
    // AUDIENCE HANDLING
    // ============================================================

    const handleAudienceChange =
        (
            type
        ) => {
            setAudienceType(
                type
            );

            /*
                We clear selections belonging to other audience
                types so stale values are never accidentally sent.
            */

            if (
                type !==
                "DEPARTMENT"
            ) {
                setSelectedDepartments(
                    []
                );
            }

            if (
                type !==
                "SPECIFIC"
            ) {
                setSelectedEmployeeIds(
                    []
                );
            }
        };

    // ============================================================
    // DEPARTMENT
    // ============================================================

    const addDepartment =
        (
            department
        ) => {
            if (
                !department
            ) {
                return;
            }

            setSelectedDepartments(
                (
                    prev
                ) => {
                    if (
                        prev.includes(
                            department
                        )
                    ) {
                        return prev;
                    }

                    return [
                        ...prev,
                        department,
                    ];
                }
            );
        };

    const removeDepartment =
        (
            department
        ) => {
            setSelectedDepartments(
                (
                    prev
                ) =>
                    prev.filter(
                        (
                            item
                        ) =>
                            item !==
                            department
                    )
            );
        };

    // ============================================================
    // EMPLOYEE
    // ============================================================

    const addEmployee =
        (
            employeeId
        ) => {
            if (
                !employeeId
            ) {
                return;
            }

            setSelectedEmployeeIds(
                (
                    prev
                ) => {
                    if (
                        prev.includes(
                            employeeId
                        )
                    ) {
                        return prev;
                    }

                    return [
                        ...prev,
                        employeeId,
                    ];
                }
            );
        };

    const removeEmployee =
        (
            employeeId
        ) => {
            setSelectedEmployeeIds(
                (
                    prev
                ) =>
                    prev.filter(
                        (
                            id
                        ) =>
                            id !==
                            employeeId
                    )
            );
        };

    const getEmployeeName =
        (
            employeeId
        ) => {
            const employee =
                employees.find(
                    (
                        emp
                    ) =>
                        (
                            emp._id ||
                            emp.id
                        ) ===
                        employeeId
                );

            if (
                !employee
            ) {
                return "Employee";
            }

            return `${employee.firstName || ""} ${employee.lastName || ""}`.trim();
        };

    // ============================================================
    // AUDIENCE PREVIEW
    // ============================================================

    const audiencePreview =
        () => {
            if (
                audienceType ===
                "EVERYONE"
            ) {
                return "Visible to everyone";
            }

            if (
                audienceType ===
                "DEPARTMENT"
            ) {
                if (
                    selectedDepartments.length ===
                    0
                ) {
                    return "Select at least one department";
                }

                const count =
                    employees.filter(
                        (
                            employee
                        ) =>
                            selectedDepartments.includes(
                                employee.department
                            )
                    ).length;

                return `Visible to ${count} employee${
                    count !== 1
                        ? "s"
                        : ""
                } in ${selectedDepartments.join(
                    ", "
                )}`;
            }

            if (
                audienceType ===
                "SPECIFIC"
            ) {
                if (
                    selectedEmployeeIds.length ===
                    0
                ) {
                    return "Select at least one employee";
                }

                return `Visible to ${selectedEmployeeIds.length} selected employee${
                    selectedEmployeeIds.length !==
                    1
                        ? "s"
                        : ""
                }`;
            }

            return "";
        };

    // ============================================================
    // RESET FORM
    // ============================================================

    const resetForm =
        () => {
            imagePreviews.forEach(
                (
                    preview
                ) => {
                    URL.revokeObjectURL(
                        preview
                    );
                }
            );

            setText("");

            setImageFiles(
                []
            );

            setImagePreviews(
                []
            );

            setAudienceType(
                "EVERYONE"
            );

            setSelectedDepartments(
                []
            );

            setSelectedEmployeeIds(
                []
            );
        };

    // ============================================================
    // CLOSE MODAL
    // ============================================================

    const handleClose =
        () => {
            if (
                posting
            ) {
                return;
            }

            onClose();
        };

    // ============================================================
    // SUBMIT POST
    // ============================================================

    const handleSubmit =
        async (
            e
        ) => {
            e.preventDefault();

            if (
                !text.trim()
            ) {
                return;
            }

            if (
                isAdmin &&
                audienceType ===
                    "DEPARTMENT" &&
                selectedDepartments.length ===
                    0
            ) {
                return;
            }

            if (
                isAdmin &&
                audienceType ===
                    "SPECIFIC" &&
                selectedEmployeeIds.length ===
                    0
            ) {
                return;
            }

            setPosting(
                true
            );

            const formData =
                new FormData();

            formData.append(
                "text",
                text
            );

            imageFiles.forEach(
                (
                    file
                ) =>
                    formData.append(
                        "images",
                        file
                    )
            );

            if (
                isAdmin
            ) {
                formData.append(
                    "audienceType",
                    audienceType
                );

                if (
                    audienceType ===
                    "DEPARTMENT"
                ) {
                    formData.append(
                        "departments",
                        JSON.stringify(
                            selectedDepartments
                        )
                    );
                }

                if (
                    audienceType ===
                    "SPECIFIC"
                ) {
                    formData.append(
                        "employeeIds",
                        JSON.stringify(
                            selectedEmployeeIds
                        )
                    );
                }
            }

            try {
                await api.post(
                    "/posts",
                    formData
                );

                resetForm();

                onSuccess?.();

                onClose();

            } catch (
                error
            ) {
                console.error(
                    "Create Post Error:",
                    error
                );

            } finally {
                setPosting(
                    false
                );
            }
        };

    // ============================================================
    // OPTIONS
    // ============================================================

    const audienceOptions =
        [
            {
                value:
                    "EVERYONE",

                label:
                    "Everyone",

                icon:
                    Users,
            },

            {
                value:
                    "DEPARTMENT",

                label:
                    "Department",

                icon:
                    Building2,
            },

            {
                value:
                    "SPECIFIC",

                label:
                    "Specific Person",

                icon:
                    UserRound,
            },
        ];

    // ============================================================
    // UI
    // ============================================================

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm"
            onClick={
                handleClose
            }
        >

            <div
                className="relative my-6 max-h-[calc(100vh-48px)] w-full max-w-xl overflow-y-auto rounded-2xl border border-indigo-100 bg-white shadow-2xl animate-fade-in"
                onClick={(
                    e
                ) =>
                    e.stopPropagation()
                }
            >

                {/* =================================================
                    HEADER
                ================================================= */}

                <div className="flex items-center justify-between p-6 pb-0">

                    <h2 className="text-lg font-semibold text-slate-900">
                        Create Post
                    </h2>

                    <button
                        type="button"
                        onClick={
                            handleClose
                        }
                        disabled={
                            posting
                        }
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>

                </div>

                {/* =================================================
                    FORM
                ================================================= */}

                <form
                    onSubmit={
                        handleSubmit
                    }
                    className="space-y-4 p-6"
                >

                    {/* POST TEXT */}

                    <textarea
                        value={
                            text
                        }
                        onChange={(
                            e
                        ) =>
                            setText(
                                e.target.value
                            )
                        }
                        rows={
                            4
                        }
                        maxLength={
                            2000
                        }
                        className="w-full resize-none"
                        placeholder="What's on your mind?"
                    />

                    <div className="-mt-2 flex justify-end text-[11px] text-slate-400">
                        {text.length}
                        /2000
                    </div>

                    {/* =================================================
                        IMAGE PREVIEWS
                    ================================================= */}

                    {imagePreviews.length >
                        0 && (

                        <div className="flex gap-2 overflow-x-auto pb-1">

                            {imagePreviews.map(
                                (
                                    src,
                                    index
                                ) => (

                                    <div
                                        key={
                                            `${src}-${index}`
                                        }
                                        className="relative shrink-0"
                                    >

                                        <img
                                            src={
                                                src
                                            }
                                            alt=""
                                            className="h-24 w-24 rounded-xl border border-indigo-100 object-cover"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeImage(
                                                    index
                                                )
                                            }
                                            className="absolute -right-1.5 -top-1.5 rounded-full border border-slate-200 bg-white p-0.5 text-slate-500 shadow-sm hover:text-rose-600"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>

                                    </div>

                                )
                            )}

                        </div>

                    )}

                    <input
                        ref={
                            fileInputRef
                        }
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={
                            handleImageChange
                        }
                    />

                    <button
                        type="button"
                        onClick={() =>
                            fileInputRef.current?.click()
                        }
                        disabled={
                            imageFiles.length >=
                            5
                        }
                        className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
                    >

                        <ImageIcon className="h-4 w-4" />

                        Add Images (
                        {
                            imageFiles.length
                        }
                        /5)

                    </button>

                    {/* =================================================
                        ADMIN AUDIENCE
                    ================================================= */}

                    {isAdmin && (

                        <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">

                            {/* TITLE */}

                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">

                                <Users className="h-4 w-4 text-indigo-500" />

                                Audience

                            </label>

                            {/* =================================================
                                3 AUDIENCE CARDS
                            ================================================= */}

                            <div className="grid grid-cols-3 gap-2.5">

                                {audienceOptions.map(
                                    (
                                        option
                                    ) => {
                                        const Icon =
                                            option.icon;

                                        const active =
                                            audienceType ===
                                            option.value;

                                        return (

                                            <button
                                                key={
                                                    option.value
                                                }
                                                type="button"
                                                onClick={() =>
                                                    handleAudienceChange(
                                                        option.value
                                                    )
                                                }
                                                className={`relative flex min-h-[74px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center transition-all ${
                                                    active
                                                        ? "border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-100"
                                                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/40"
                                                }`}
                                            >

                                                <Icon
                                                    size={
                                                        19
                                                    }
                                                    strokeWidth={
                                                        1.8
                                                    }
                                                />

                                                <span
                                                    className={`text-xs sm:text-sm ${
                                                        active
                                                            ? "font-semibold"
                                                            : "font-medium"
                                                    }`}
                                                >
                                                    {
                                                        option.label
                                                    }
                                                </span>

                                            </button>

                                        );
                                    }
                                )}

                            </div>

                            {/* =================================================
                                DEPARTMENT SELECT
                            ================================================= */}

                            {audienceType ===
                                "DEPARTMENT" && (

                                <div className="space-y-3">

                                    <select
                                        value=""
                                        onChange={(
                                            e
                                        ) => {
                                            addDepartment(
                                                e.target.value
                                            );
                                        }}
                                        className="w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    >

                                        <option value="">
                                            -- Choose Department --
                                        </option>

                                        {departments.map(
                                            (
                                                department
                                            ) => (

                                                <option
                                                    key={
                                                        typeof department ===
                                                        "string"
                                                            ? department
                                                            : department._id ||
                                                              department.name
                                                    }
                                                    value={
                                                        typeof department ===
                                                        "string"
                                                            ? department
                                                            : department.name
                                                    }
                                                >
                                                    {typeof department ===
                                                    "string"
                                                        ? department
                                                        : department.name}
                                                </option>

                                            )
                                        )}

                                    </select>

                                    {/* SELECTED DEPARTMENTS */}

                                    {selectedDepartments.length >
                                        0 && (

                                        <div className="flex flex-wrap gap-2">

                                            {selectedDepartments.map(
                                                (
                                                    department
                                                ) => (

                                                    <div
                                                        key={
                                                            department
                                                        }
                                                        className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700"
                                                    >

                                                        <Check
                                                            size={
                                                                12
                                                            }
                                                        />

                                                        <span>
                                                            {
                                                                department
                                                            }
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeDepartment(
                                                                    department
                                                                )
                                                            }
                                                            className="ml-0.5 rounded-full p-0.5 text-indigo-400 transition hover:bg-indigo-100 hover:text-indigo-700"
                                                        >
                                                            <X
                                                                size={
                                                                    12
                                                                }
                                                            />
                                                        </button>

                                                    </div>

                                                )
                                            )}

                                        </div>

                                    )}

                                </div>

                            )}

                            {/* =================================================
                                SPECIFIC PERSON SELECT
                            ================================================= */}

                            {audienceType ===
                                "SPECIFIC" && (

                                <div className="space-y-3">

                                    <select
                                        value=""
                                        onChange={(
                                            e
                                        ) => {
                                            addEmployee(
                                                e.target.value
                                            );
                                        }}
                                        className="w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    >

                                        <option value="">
                                            -- Choose Employee --
                                        </option>

                                        {employees.map(
                                            (
                                                employee
                                            ) => {
                                                const employeeId =
                                                    employee._id ||
                                                    employee.id;

                                                const selected =
                                                    selectedEmployeeIds.includes(
                                                        employeeId
                                                    );

                                                return (

                                                    <option
                                                        key={
                                                            employeeId
                                                        }
                                                        value={
                                                            employeeId
                                                        }
                                                        disabled={
                                                            selected
                                                        }
                                                    >
                                                        {employee.firstName}{" "}
                                                        {employee.lastName}
                                                        {employee.employeeCode
                                                            ? ` (${employee.employeeCode})`
                                                            : ""}
                                                    </option>

                                                );
                                            }
                                        )}

                                    </select>

                                    {/* SELECTED PEOPLE */}

                                    {selectedEmployeeIds.length >
                                        0 && (

                                        <div className="flex flex-wrap gap-2">

                                            {selectedEmployeeIds.map(
                                                (
                                                    employeeId
                                                ) => (

                                                    <div
                                                        key={
                                                            employeeId
                                                        }
                                                        className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700"
                                                    >

                                                        <UserRound
                                                            size={
                                                                12
                                                            }
                                                        />

                                                        <span>
                                                            {getEmployeeName(
                                                                employeeId
                                                            )}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeEmployee(
                                                                    employeeId
                                                                )
                                                            }
                                                            className="ml-0.5 rounded-full p-0.5 text-indigo-400 transition hover:bg-indigo-100 hover:text-indigo-700"
                                                        >
                                                            <X
                                                                size={
                                                                    12
                                                                }
                                                            />
                                                        </button>

                                                    </div>

                                                )
                                            )}

                                        </div>

                                    )}

                                </div>

                            )}

                            {/* =================================================
                                AUDIENCE PREVIEW
                            ================================================= */}

                            <p
                                className={`text-xs font-medium ${
                                    (
                                        audienceType ===
                                            "DEPARTMENT" &&
                                        selectedDepartments.length ===
                                            0
                                    ) ||
                                    (
                                        audienceType ===
                                            "SPECIFIC" &&
                                        selectedEmployeeIds.length ===
                                            0
                                    )
                                        ? "text-amber-600"
                                        : "text-indigo-600"
                                }`}
                            >
                                {
                                    audiencePreview()
                                }
                            </p>

                        </div>

                    )}

                    {/* =================================================
                        ACTION BUTTONS
                    ================================================= */}

                    <div className="flex gap-3 pt-2">

                        <button
                            type="button"
                            onClick={
                                handleClose
                            }
                            disabled={
                                posting
                            }
                            className="btn-secondary flex-1 disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={
                                posting ||
                                !text.trim() ||
                                (
                                    isAdmin &&
                                    audienceType ===
                                        "DEPARTMENT" &&
                                    selectedDepartments.length ===
                                        0
                                ) ||
                                (
                                    isAdmin &&
                                    audienceType ===
                                        "SPECIFIC" &&
                                    selectedEmployeeIds.length ===
                                        0
                                )
                            }
                            className="btn-primary flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >

                            {posting && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}

                            Post

                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
};

export default CreatePostModal;