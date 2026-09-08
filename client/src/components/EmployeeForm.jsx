import { useEffect, useState } from "react";
import {
    Loader2Icon,
    Plus,
    Trash2,
    X,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../api/axios";
import { useDepartments } from "../hooks/useDepartments";

const genId = () =>
    `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;

const fmtDate = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toISOString().split("T")[0];
};

const sectionConfig = [
    {
        title: "Personal Details",
        fields: [
            ["employeeName", "Name", "text"],
            ["fatherName", "Father's Name", "text"],
            [
                "gender",
                "Gender",
                "select",
                ["", "MALE", "FEMALE", "OTHER"],
            ],
            ["bloodGroup", "Blood Group", "text"],
            ["dateOfBirth", "Date of Birth", "date"],
            ["birthPlace", "Birth Place", "text"],
            ["nationality", "Nationality", "text"],
            ["motherTongue", "Mother Tongue", "text"],
            ["languages", "Language", "text"],
            ["phone", "Phone Number", "text"],
            ["passportNumber", "Passport Number", "text"],
            [
                "identificationMark",
                "Identification Mark",
                "text",
            ],
            [
                "maritalStatus",
                "Marital Status",
                "select",
                [
                    "",
                    "SINGLE",
                    "MARRIED",
                    "DIVORCED",
                    "WIDOWED",
                ],
            ],
            [
                "numberOfChildren",
                "Number of Children",
                "number",
            ],
        ],
    },

    {
        title: "Employment Details",
        fields: [
            ["joinDate", "Date of Joining", "date"],
            ["manpowerType", "Manpower Type", "text"],
            ["vendorCode", "Vendor Code", "text"],
            ["employeeCode", "Employee Code", "text"],
            ["email", "Employee Email ID", "email"],
            ["department", "Department", "department"],
            ["position", "Designation", "text"],
            ["basicSalary", "Basic Salary", "number"],
            ["allowances", "Allowances", "number"],
            ["deductions", "Deductions", "number"],
            [
                "confirmationDate",
                "Confirmation Date",
                "date",
            ],
            [
                "anniversaryDate",
                "Anniversary Date",
                "date",
            ],
            ["aadharNumber", "Aadhaar Number", "text"],
            ["panNumber", "PAN Number", "text"],
            ["bio", "Bio", "textarea"],
        ],
    },

    {
        title: "Safety / PPE Details",
        fields: [
            [
                "safetyIssued",
                "Safety Issued or Not",
                "text",
            ],
            ["shoeSize", "Shoe Size", "text"],
            ["shoeIssueDate", "Shoe Issue Date", "date"],
            ["safetyHelmet", "Safety Helmet", "text"],
            ["helmetColor", "Helmet Color", "text"],
            [
                "helmetIssueDate",
                "Helmet Issue Date",
                "date",
            ],
            ["jacket", "Jacket", "text"],
            ["jacketIssueDate", "Jacket Issue Date", "date"],
            ["jacketSize", "Jacket Size", "text"],
            [
                "eyeProtectionEquipment",
                "Eye Protection Equipment",
                "text",
            ],
        ],
    },

    {
        title: "Permanent Address",
        fields: [
            [
                "permanentAddressLine1",
                "Permanent Address Line 1",
                "text",
            ],
            [
                "permanentAddressLine2",
                "Permanent Address Line 2",
                "text",
            ],
            ["permanentCity", "Permanent City", "text"],
            [
                "permanentCountry",
                "Permanent Country",
                "text",
            ],
            ["permanentState", "Permanent State", "text"],
            [
                "permanentPinCode",
                "Permanent Pin Code",
                "text",
            ],
        ],
    },

    {
        title: "Present Address",
        fields: [
            [
                "presentAddressLine1",
                "Present Address Line 1",
                "text",
            ],
            [
                "presentAddressLine2",
                "Present Address Line 2",
                "text",
            ],
            ["presentCity", "Present City", "text"],
            ["village", "Present Village", "text"],
            ["presentCountry", "Present Country", "text"],
            ["presentState", "Present State", "text"],
            ["presentPinCode", "Present Pin Code", "text"],
            ["mobileNumber", "Mobile Number", "text"],
        ],
    },

    {
        title: "Emergency Contact",
        fields: [
            [
                "emergencyContactPersonName",
                "Emergency Contact Person Name",
                "text",
            ],
            [
                "emergencyContactPersonRelation",
                "Emergency Contact Person Relation",
                "text",
            ],
            [
                "emergencyContactPersonAddress",
                "Emergency Contact Person Address",
                "textarea",
            ],
            [
                "emergencyMobileNumber",
                "Emergency Mobile Number",
                "text",
            ],
        ],
    },

    {
        title: "Education",
        fields: [
            ["qualification", "Qualification", "text"],
            ["specialization", "Specialization", "text"],
            [
                "collegeSchoolName",
                "College / School Name",
                "text",
            ],
            [
                "boardUniversityName",
                "Board / University Name",
                "text",
            ],
            ["yearOfPassing", "Year of Passing", "text"],
        ],
    },

    {
        title: "Document References",
        fields: [
            ["resume", "Resume", "text"],
            [
                "appointmentLetter",
                "Appointment Letter",
                "text",
            ],
            [
                "degreeCertificate",
                "Degree Certificate",
                "text",
            ],
            ["kycDocument", "KYC Document", "text"],
            [
                "medicalCertificate",
                "Medical Certificate",
                "text",
            ],
            [
                "previousEmploymentAppointmentLetter",
                "Previous Employment Appointment Letter",
                "text",
            ],
            [
                "previousEmploymentRelevantExperienceLetter",
                "Previous Employment Relevant Experience Letter",
                "text",
            ],
            [
                "policeVerification",
                "Police Verification",
                "text",
            ],
        ],
    },

    {
        title: "Bank & Statutory Details",
        fields: [
            [
                "bankAccountNumber",
                "Bank Account Number",
                "text",
            ],
            [
                "bankAccountName",
                "Bank Account Name",
                "text",
            ],
            [
                "bankAccountType",
                "Bank Account Type",
                "text",
            ],
            ["ifscCode", "IFSC Code", "text"],
            ["bankName", "Bank Name", "text"],
            ["branchName", "Branch Name", "text"],
            ["uanNumber", "UAN Number", "text"],
            ["pfNumber", "PF Number", "text"],
            ["esiNumber", "ESI Number", "text"],
        ],
    },
];

const EmployeeForm = ({
    initialData,
    onSuccess,
    onCancel,
}) => {
    const { departments } = useDepartments();

    const isEditMode = Boolean(initialData);

    const [loading, setLoading] = useState(false);

    const [customFields, setCustomFields] = useState([]);
    const [customSections, setCustomSections] = useState([]);
    const [dynamicFields, setDynamicFields] = useState([]);

    const [addingSection, setAddingSection] =
        useState(false);

    const [newSectionTitle, setNewSectionTitle] =
        useState("");

    const [
        addingFieldForSectionId,
        setAddingFieldForSectionId,
    ] = useState(null);

    const [
        newSectionFieldLabel,
        setNewSectionFieldLabel,
    ] = useState("");

    const [
        addingFieldForFixedSection,
        setAddingFieldForFixedSection,
    ] = useState(null);

    const [
        newFixedFieldLabel,
        setNewFixedFieldLabel,
    ] = useState("");

    useEffect(() => {
        const incomingCustomFields = Array.isArray(
            initialData?.customFields
        )
            ? initialData.customFields
            : [];

        const incomingCustomSections = Array.isArray(
            initialData?.customSections
        )
            ? initialData.customSections
            : [];

        const incomingDynamicFields = Array.isArray(
            initialData?.dynamicFields
        )
            ? initialData.dynamicFields
            : [];

        setCustomFields(
            incomingCustomFields.map((field) => ({
                ...field,
                id: field.id || field._id || genId(),
            }))
        );

        setCustomSections(
            incomingCustomSections.map((section) => ({
                ...section,

                id:
                    section.id ||
                    section._id ||
                    genId(),

                fields: Array.isArray(section.fields)
                    ? section.fields.map((field) => ({
                        ...field,

                        id:
                            field.id ||
                            field._id ||
                            genId(),
                    }))
                    : [],
            }))
        );

        setDynamicFields(
            incomingDynamicFields.map((field) => ({
                ...field,

                id:
                    field.id ||
                    field._id ||
                    genId(),
            }))
        );

        setAddingSection(false);
        setNewSectionTitle("");

        setAddingFieldForSectionId(null);
        setNewSectionFieldLabel("");

        setAddingFieldForFixedSection(null);
        setNewFixedFieldLabel("");
    }, [initialData]);

    const employeeName = initialData
        ? (
            initialData.name ||
            `${initialData.firstName || ""} ${
                initialData.lastName || ""
            }`
        )
            .trim()
            .replace(/\s+/g, " ")
        : "";

    const defaultValueFor = (name) => {
        if (name === "employeeName") {
            return employeeName;
        }

        const value = initialData?.[name];

        if (name.toLowerCase().includes("date")) {
            return fmtDate(value);
        }

        return value ?? "";
    };

    const renderField = ([
        name,
        label,
        type,
        options,
    ]) => {
        const common = {
            name,
            defaultValue: defaultValueFor(name),
            className: "w-full",
        };

        if (type === "select") {
            return (
                <div key={name}>
                    <label className="mb-2 block">
                        {label}
                    </label>

                    <select {...common}>
                        {(options || []).map((option) => (
                            <option
                                key={option || "blank"}
                                value={option}
                            >
                                {option || "Select"}
                            </option>
                        ))}
                    </select>
                </div>
            );
        }

        if (type === "department") {
            const departmentOptions =
                Array.isArray(departments)
                    ? departments
                    : [];

            return (
                <div key={name}>
                    <label className="mb-2 block">
                        {label}
                    </label>

                    <select {...common}>
                        <option value="">
                            Select Department
                        </option>

                        {departmentOptions.map(
                            (department) => (
                                <option
                                    key={department}
                                    value={department}
                                >
                                    {department}
                                </option>
                            )
                        )}
                    </select>
                </div>
            );
        }

        if (type === "textarea") {
            return (
                <div
                    key={name}
                    className="sm:col-span-2"
                >
                    <label className="mb-2 block">
                        {label}
                    </label>

                    <textarea
                        {...common}
                        rows={3}
                        className="w-full resize-none"
                    />
                </div>
            );
        }

        return (
            <div key={name}>
                <label className="mb-2 block">
                    {label}
                </label>

                <input
                    {...common}
                    type={type}
                    step={
                        type === "number"
                            ? "any"
                            : undefined
                    }
                />
            </div>
        );
    };

    const getFieldsForFixedSection = (
        sectionTitle
    ) =>
        customFields.filter(
            (field) =>
                String(field.section || "")
                    .trim()
                    .toLowerCase() ===
                String(sectionTitle)
                    .trim()
                    .toLowerCase()
        );

    const addFieldToFixedSection = (
        sectionTitle
    ) => {
        const label = newFixedFieldLabel.trim();

        if (!label) {
            toast.error("Enter a field name");
            return;
        }

        const alreadyExists = customFields.some(
            (field) =>
                String(field.section || "")
                    .trim()
                    .toLowerCase() ===
                    String(sectionTitle)
                        .trim()
                        .toLowerCase() &&
                String(field.label || "")
                    .trim()
                    .toLowerCase() ===
                    label.toLowerCase()
        );

        if (alreadyExists) {
            toast.error(
                "This field already exists in this section"
            );
            return;
        }

        setCustomFields((previous) => [
            ...previous,
            {
                id: genId(),
                section: sectionTitle,
                label,
                value: "",
            },
        ]);

        setNewFixedFieldLabel("");
        setAddingFieldForFixedSection(null);
    };

    const updateFixedSectionField = (
        fieldId,
        value
    ) => {
        setCustomFields((previous) =>
            previous.map((field) =>
                field.id === fieldId
                    ? {
                        ...field,
                        value,
                    }
                    : field
            )
        );
    };

    const removeFixedSectionField = (
        fieldId
    ) => {
        setCustomFields((previous) =>
            previous.filter(
                (field) => field.id !== fieldId
            )
        );
    };

    const addSection = () => {
        const title = newSectionTitle.trim();

        if (!title) {
            toast.error("Enter a section name");
            return;
        }

        const alreadyExists = customSections.some(
            (section) =>
                String(section.title || "")
                    .trim()
                    .toLowerCase() ===
                title.toLowerCase()
        );

        if (alreadyExists) {
            toast.error(
                "A section with this name already exists"
            );
            return;
        }

        setCustomSections((previous) => [
            ...previous,
            {
                id: genId(),
                title,
                fields: [],
            },
        ]);

        setNewSectionTitle("");
        setAddingSection(false);

        toast.success("Section created");
    };

    const removeSection = (sectionId) => {
        setCustomSections((previous) =>
            previous.filter(
                (section) =>
                    section.id !== sectionId
            )
        );

        if (
            addingFieldForSectionId === sectionId
        ) {
            setAddingFieldForSectionId(null);
            setNewSectionFieldLabel("");
        }
    };

    const addFieldToSection = (sectionId) => {
        const label =
            newSectionFieldLabel.trim();

        if (!label) {
            toast.error("Enter a field name");
            return;
        }

        const targetSection =
            customSections.find(
                (section) =>
                    section.id === sectionId
            );

        const alreadyExists =
            targetSection?.fields?.some(
                (field) =>
                    String(field.label || "")
                        .trim()
                        .toLowerCase() ===
                    label.toLowerCase()
            );

        if (alreadyExists) {
            toast.error(
                "This field already exists in this section"
            );
            return;
        }

        setCustomSections((previous) =>
            previous.map((section) =>
                section.id === sectionId
                    ? {
                        ...section,

                        fields: [
                            ...(section.fields || []),

                            {
                                id: genId(),
                                label,
                                value: "",
                            },
                        ],
                    }
                    : section
            )
        );

        setNewSectionFieldLabel("");
        setAddingFieldForSectionId(null);
    };

    const updateSectionField = (
        sectionId,
        fieldId,
        value
    ) => {
        setCustomSections((previous) =>
            previous.map((section) =>
                section.id === sectionId
                    ? {
                        ...section,

                        fields: (
                            section.fields || []
                        ).map((field) =>
                            field.id === fieldId
                                ? {
                                    ...field,
                                    value,
                                }
                                : field
                        ),
                    }
                    : section
            )
        );
    };

    const removeSectionField = (
        sectionId,
        fieldId
    ) => {
        setCustomSections((previous) =>
            previous.map((section) =>
                section.id === sectionId
                    ? {
                        ...section,

                        fields: (
                            section.fields || []
                        ).filter(
                            (field) =>
                                field.id !== fieldId
                        ),
                    }
                    : section
            )
        );
    };

    const updateDynamicField = (
        fieldId,
        value
    ) => {
        setDynamicFields((previous) =>
            previous.map((field) =>
                field.id === fieldId
                    ? {
                        ...field,
                        value,
                    }
                    : field
            )
        );
    };

    const removeDynamicField = (fieldId) => {
        setDynamicFields((previous) =>
            previous.filter(
                (field) => field.id !== fieldId
            )
        );
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (loading) return;

        setLoading(true);

        try {
            const form = event.currentTarget;

            const data = Object.fromEntries(
                new FormData(form).entries()
            );

            const fullName = String(
                data.employeeName || ""
            )
                .trim()
                .replace(/\s+/g, " ");

            if (!fullName) {
                toast.error(
                    "Employee name is required"
                );
                return;
            }

            const parts = fullName.split(" ");

            data.name = fullName;
            data.firstName = parts[0] || "";
            data.lastName =
                parts.slice(1).join(" ");

            delete data.employeeName;

            [
                "basicSalary",
                "allowances",
                "deductions",
                "numberOfChildren",
            ].forEach((key) => {
                const value = String(
                    data[key] ?? ""
                ).trim();

                if (!value) {
                    data[key] = null;
                    return;
                }

                const number = Number(value);

                data[key] = Number.isFinite(number)
                    ? number
                    : null;
            });

            data.employeeCode = String(
                data.employeeCode || ""
            ).trim();

            data.email = String(
                data.email || ""
            )
                .trim()
                .toLowerCase();

            data.position = String(
                data.position || ""
            ).trim();

            data.gender = String(
                data.gender || ""
            ).trim();

            data.dynamicFields =
                dynamicFields.map(
                    ({
                        section,
                        label,
                        key,
                        value,
                    }) => ({
                        section:
                            section ||
                            "Excel Fields",

                        label: label || "",
                        key: key || "",
                        value: value ?? "",
                    })
                );

            data.customFields =
                customFields.map(
                    ({
                        section,
                        label,
                        value,
                    }) => ({
                        section:
                            section ||
                            "Additional Details",

                        label: label || "",
                        value: value ?? "",
                    })
                );

            data.customSections =
                customSections.map(
                    ({
                        title,
                        fields,
                    }) => ({
                        title: title || "",

                        fields: Array.isArray(
                            fields
                        )
                            ? fields.map(
                                ({
                                    label,
                                    value,
                                }) => ({
                                    label:
                                        label ||
                                        "",

                                    value:
                                        value ??
                                        "",
                                })
                            )
                            : [],
                    })
                );

            const employeeId =
                initialData?._id ||
                initialData?.id;

            if (
                isEditMode &&
                !employeeId
            ) {
                throw new Error(
                    "Employee ID is missing"
                );
            }

            if (isEditMode) {
                await api.put(
                    `/employees/${employeeId}`,
                    data
                );
            } else {
                const response =
                    await api.post(
                        "/employees",
                        data
                    );

                const temporaryPassword =
                    response?.data
                        ?.temporaryPassword;

                if (temporaryPassword) {
                    toast.success(
                        `Employee created. Temporary password: ${temporaryPassword}`,
                        {
                            duration: 8000,
                        }
                    );
                }
            }

            if (isEditMode) {
                toast.success(
                    "Employee updated successfully"
                );
            } else {
                toast.success(
                    "Employee created successfully"
                );
            }

            onSuccess?.();
        } catch (error) {
            console.error(
                "Employee submit error:",
                error
            );

            toast.error(
                error?.response?.data?.error ||
                error?.message ||
                "Something went wrong"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-6"
        >
            {sectionConfig.map((section) => {
                const sectionCustomFields =
                    getFieldsForFixedSection(
                        section.title
                    );

                const isAddingField =
                    addingFieldForFixedSection ===
                    section.title;

                return (
                    <section
                        key={section.title}
                        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
                    >
                        <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="text-lg font-semibold text-slate-900">
                                {section.title}
                            </h3>

                            <button
                                type="button"
                                onClick={() => {
                                    if (
                                        isAddingField
                                    ) {
                                        setAddingFieldForFixedSection(
                                            null
                                        );

                                        setNewFixedFieldLabel(
                                            ""
                                        );

                                        return;
                                    }

                                    setAddingFieldForFixedSection(
                                        section.title
                                    );

                                    setNewFixedFieldLabel(
                                        ""
                                    );
                                }}
                                className="inline-flex w-fit items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-100"
                            >
                                {isAddingField ? (
                                    <X className="h-4 w-4" />
                                ) : (
                                    <Plus className="h-4 w-4" />
                                )}

                                {isAddingField
                                    ? "Cancel"
                                    : "Add Field"}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            {section.fields.map(
                                renderField
                            )}

                            {sectionCustomFields.map(
                                (field) => (
                                    <div
                                        key={field.id}
                                    >
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <label>
                                                {
                                                    field.label
                                                }
                                            </label>

                                            <button
                                                type="button"
                                                title="Remove field"
                                                onClick={() =>
                                                    removeFixedSectionField(
                                                        field.id
                                                    )
                                                }
                                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <input
                                            type="text"
                                            value={
                                                field.value ??
                                                ""
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateFixedSectionField(
                                                    field.id,
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder={`Enter ${field.label}`}
                                            className="w-full"
                                        />
                                    </div>
                                )
                            )}
                        </div>

                        {isAddingField && (
                            <div className="mt-6 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <input
                                        type="text"
                                        value={
                                            newFixedFieldLabel
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setNewFixedFieldLabel(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        onKeyDown={(
                                            event
                                        ) => {
                                            if (
                                                event.key ===
                                                "Enter"
                                            ) {
                                                event.preventDefault();

                                                addFieldToFixedSection(
                                                    section.title
                                                );
                                            }
                                        }}
                                        placeholder="Enter field name"
                                        className="flex-1"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            addFieldToFixedSection(
                                                section.title
                                            )
                                        }
                                        className="btn-primary inline-flex items-center justify-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Create Field
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                );
            })}

            {dynamicFields.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {dynamicFields.map(
                            (field) => (
                                <div
                                    key={field.id}
                                >
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <label>
                                            {
                                                field.label
                                            }
                                        </label>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeDynamicField(
                                                    field.id
                                                )
                                            }
                                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <input
                                        type="text"
                                        value={
                                            field.value ??
                                            ""
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateDynamicField(
                                                field.id,
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder={`Enter ${field.label}`}
                                        className="w-full"
                                    />
                                </div>
                            )
                        )}
                    </div>
                </section>
            )}

            {customSections.map((section) => (
                <section
                    key={section.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
                >
                    <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <h3 className="text-lg font-semibold text-slate-900">
                            {section.title}
                        </h3>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setAddingFieldForSectionId(
                                        section.id
                                    );

                                    setNewSectionFieldLabel(
                                        ""
                                    );
                                }}
                                className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-600"
                            >
                                <Plus className="h-4 w-4" />
                                Add Field
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    removeSection(
                                        section.id
                                    )
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600"
                            >
                                <Trash2 className="h-4 w-4" />
                                Remove Section
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {(section.fields || []).map(
                            (field) => (
                                <div
                                    key={field.id}
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <label>
                                            {
                                                field.label
                                            }
                                        </label>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeSectionField(
                                                    section.id,
                                                    field.id
                                                )
                                            }
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <input
                                        type="text"
                                        value={
                                            field.value ??
                                            ""
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateSectionField(
                                                section.id,
                                                field.id,
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        className="w-full"
                                    />
                                </div>
                            )
                        )}
                    </div>

                    {addingFieldForSectionId ===
                        section.id && (
                        <div className="mt-5 flex gap-3">
                            <input
                                type="text"
                                value={
                                    newSectionFieldLabel
                                }
                                onChange={(
                                    event
                                ) =>
                                    setNewSectionFieldLabel(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                placeholder="Enter field name"
                                className="flex-1"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    addFieldToSection(
                                        section.id
                                    )
                                }
                                className="btn-primary"
                            >
                                Create Field
                            </button>
                        </div>
                    )}
                </section>
            ))}

            {addingSection ? (
                <section className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/30 p-5">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newSectionTitle}
                            onChange={(event) =>
                                setNewSectionTitle(
                                    event.target.value
                                )
                            }
                            placeholder="Enter section name"
                            className="flex-1"
                        />

                        <button
                            type="button"
                            onClick={addSection}
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Create Section
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setAddingSection(false);
                                setNewSectionTitle("");
                            }}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </section>
            ) : (
                <button
                    type="button"
                    onClick={() =>
                        setAddingSection(true)
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-5 py-5 text-sm font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                >
                    <Plus className="h-4 w-4" />
                    Add New Section
                </button>
            )}

            <div className="sticky bottom-0 z-20 flex justify-end gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="btn-secondary"
                    >
                        Cancel
                    </button>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary inline-flex min-w-[150px] items-center justify-center gap-2"
                >
                    {loading && (
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                    )}

                    {loading
                        ? isEditMode
                            ? "Updating..."
                            : "Creating..."
                        : isEditMode
                            ? "Update Employee"
                            : "Create Employee"}
                </button>
            </div>
        </form>
    );
};

export default EmployeeForm;