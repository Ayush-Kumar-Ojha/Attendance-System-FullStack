import {
    useEffect,
    useState,
} from "react";

import {
    Loader2Icon,
    Plus,
    X,
} from "lucide-react";

import toast from "react-hot-toast";

import api from "../api/axios";

import {
    useDepartments,
} from "../hooks/useDepartments";

const genId = () =>
    `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;

const fmtDate = (value) => {
    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    return Number.isNaN(
        date.getTime()
    )
        ? ""
        : date
              .toISOString()
              .split("T")[0];
};

const sectionConfig = [
    {
        title:
            "Personal Details",

        fields: [
            [
                "employeeName",
                "Name",
                "text",
            ],

            [
                "fatherName",
                "Father's Name",
                "text",
            ],

            [
                "gender",
                "Gender",
                "select",
                [
                    "MALE",
                    "FEMALE",
                    "OTHER",
                ],
            ],

            [
                "bloodGroup",
                "Blood Group",
                "text",
            ],

            [
                "dateOfBirth",
                "Date of Birth",
                "date",
            ],

            [
                "birthPlace",
                "Birth Place",
                "text",
            ],

            [
                "nationality",
                "Nationality",
                "text",
            ],

            [
                "motherTongue",
                "Mother Tongue",
                "text",
            ],

            [
                "languages",
                "Language",
                "text",
            ],

            [
                "phone",
                "Phone Number",
                "text",
            ],

            [
                "passportNumber",
                "Passport Number",
                "text",
            ],

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
        title:
            "Employment Details",

        fields: [
            [
                "joinDate",
                "Date of Joining",
                "date",
            ],

            [
                "manpowerType",
                "Manpower Type",
                "text",
            ],

            [
                "vendorCode",
                "Vendor Code",
                "text",
            ],

            [
                "employeeCode",
                "Employee Code",
                "text",
            ],

            [
                "email",
                "Employee Email ID",
                "email",
            ],

            [
                "department",
                "Department",
                "department",
            ],

            [
                "position",
                "Designation",
                "text",
            ],

            [
                "basicSalary",
                "Basic Salary",
                "number",
            ],

            [
                "allowances",
                "Allowances",
                "number",
            ],

            [
                "deductions",
                "Deductions",
                "number",
            ],

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

            [
                "aadharNumber",
                "Aadhaar Number",
                "text",
            ],

            [
                "panNumber",
                "PAN Number",
                "text",
            ],

            [
                "bio",
                "Bio",
                "textarea",
            ],
        ],
    },

    {
        title:
            "Safety / PPE Details",

        fields: [
            [
                "safetyIssued",
                "Safety Issued or Not",
                "text",
            ],

            [
                "shoeSize",
                "Shoe Size",
                "text",
            ],

            [
                "shoeIssueDate",
                "Shoe Issue Date",
                "date",
            ],

            [
                "safetyHelmet",
                "Safety Helmet",
                "text",
            ],

            [
                "helmetColor",
                "Helmet Color",
                "text",
            ],

            [
                "helmetIssueDate",
                "Helmet Issue Date",
                "date",
            ],

            [
                "jacket",
                "Jacket",
                "text",
            ],

            [
                "jacketIssueDate",
                "Jacket Issue Date",
                "date",
            ],

            [
                "jacketSize",
                "Jacket Size",
                "text",
            ],

            [
                "eyeProtectionEquipment",
                "Eye Protection Equipment",
                "text",
            ],
        ],
    },

    {
        title:
            "Permanent Address",

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

            [
                "permanentCity",
                "Permanent City",
                "text",
            ],

            [
                "permanentCountry",
                "Permanent Country",
                "text",
            ],

            [
                "permanentState",
                "Permanent State",
                "text",
            ],

            [
                "permanentPinCode",
                "Permanent Pin Code",
                "text",
            ],
        ],
    },

    {
        title:
            "Present Address",

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

            [
                "presentCity",
                "Present City",
                "text",
            ],

            [
                "village",
                "Present Village",
                "text",
            ],

            [
                "presentCountry",
                "Present Country",
                "text",
            ],

            [
                "presentState",
                "Present State",
                "text",
            ],

            [
                "presentPinCode",
                "Present Pin Code",
                "text",
            ],

            [
                "mobileNumber",
                "Mobile Number",
                "text",
            ],
        ],
    },

    {
        title:
            "Emergency Contact",

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
            [
                "qualification",
                "Qualification",
                "text",
            ],

            [
                "specialization",
                "Specialization",
                "text",
            ],

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

            [
                "yearOfPassing",
                "Year of Passing",
                "text",
            ],
        ],
    },

    {
        title:
            "Document References",

        fields: [
            [
                "resume",
                "Resume",
                "text",
            ],

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

            [
                "kycDocument",
                "KYC Document",
                "text",
            ],

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
        title:
            "Bank & Statutory Details",

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

            [
                "ifscCode",
                "IFSC Code",
                "text",
            ],

            [
                "bankName",
                "Bank Name",
                "text",
            ],

            [
                "branchName",
                "Branch Name",
                "text",
            ],

            [
                "uanNumber",
                "UAN Number",
                "text",
            ],

            [
                "pfNumber",
                "PF Number",
                "text",
            ],

            [
                "esiNumber",
                "ESI Number",
                "text",
            ],
        ],
    },
];

const EmployeeForm = ({
    initialData,
    onSuccess,
    onCancel,
}) => {
    const {
        departments,
    } = useDepartments();

    const isEditMode =
        !!initialData;

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        customFields,
        setCustomFields,
    ] = useState([]);

    const [
        customSections,
        setCustomSections,
    ] = useState([]);

    const [
        dynamicFields,
        setDynamicFields,
    ] = useState([]);

    const [
        addingSection,
        setAddingSection,
    ] = useState(false);

    const [
        newSectionTitle,
        setNewSectionTitle,
    ] = useState("");

    const [
        addingFieldForSectionId,
        setAddingFieldForSectionId,
    ] = useState(null);

    const [
        newSectionFieldLabel,
        setNewSectionFieldLabel,
    ] = useState("");

    useEffect(() => {
        setCustomFields(
            Array.isArray(
                initialData
                    ?.customFields
            )
                ? initialData.customFields.map(
                      (
                          field
                      ) => ({
                          ...field,

                          id:
                              genId(),
                      })
                  )
                : []
        );

        setCustomSections(
            Array.isArray(
                initialData
                    ?.customSections
            )
                ? initialData.customSections.map(
                      (
                          section
                      ) => ({
                          ...section,

                          id:
                              genId(),

                          fields:
                              (
                                  section.fields ||
                                  []
                              ).map(
                                  (
                                      field
                                  ) => ({
                                      ...field,

                                      id:
                                          genId(),
                                  })
                              ),
                      })
                  )
                : []
        );

        setDynamicFields(
            Array.isArray(
                initialData
                    ?.dynamicFields
            )
                ? initialData.dynamicFields.map(
                      (
                          field
                      ) => ({
                          ...field,

                          id:
                              genId(),
                      })
                  )
                : []
        );
    }, [initialData]);

    const employeeName =
        initialData
            ? `${initialData.firstName || ""} ${
                  initialData.lastName ||
                  ""
              }`.trim()
            : "";

    const defaultValueFor = (
        name
    ) => {
        if (
            name ===
            "employeeName"
        ) {
            return employeeName;
        }

        const value =
            initialData?.[name];

        if (
            name
                .toLowerCase()
                .includes("date")
        ) {
            return fmtDate(
                value
            );
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

            defaultValue:
                defaultValueFor(
                    name
                ),

            className:
                "w-full",
        };

        if (
            type === "select"
        ) {
            return (
                <div key={name}>
                    <label className="block mb-2">
                        {label}
                    </label>

                    <select
                        {...common}
                    >
                        {(
                            options ||
                            []
                        ).map(
                            (
                                option
                            ) => (
                                <option
                                    key={
                                        option ||
                                        "blank"
                                    }
                                    value={
                                        option
                                    }
                                >
                                    {option ||
                                        "Select"}
                                </option>
                            )
                        )}
                    </select>
                </div>
            );
        }

        if (
            type ===
            "department"
        ) {
            return (
                <div key={name}>
                    <label className="block mb-2">
                        {label}
                    </label>

                    <select
                        {...common}
                    >
                        <option value="">
                            Select
                            Department
                        </option>

                        {departments.map(
                            (
                                department
                            ) => (
                                <option
                                    key={
                                        department
                                    }
                                    value={
                                        department
                                    }
                                >
                                    {
                                        department
                                    }
                                </option>
                            )
                        )}
                    </select>
                </div>
            );
        }

        if (
            type ===
            "textarea"
        ) {
            return (
                <div
                    key={
                        name
                    }
                    className="sm:col-span-2"
                >
                    <label className="block mb-2">
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
                <label className="block mb-2">
                    {label}
                </label>

                <input
                    {...common}
                    type={type}
                    step={
                        type ===
                        "number"
                            ? "any"
                            : undefined
                    }
                />
            </div>
        );
    };

    const handleSubmit =
        async (event) => {
            event.preventDefault();

            setLoading(
                true
            );

            try {
                const data =
                    Object.fromEntries(
                        new FormData(
                            event.currentTarget
                        ).entries()
                    );

                const fullName =
                    String(
                        data.employeeName ||
                            ""
                    )
                        .trim()
                        .replace(
                            /\s+/g,
                            " "
                        );

                const parts =
                    fullName
                        ? fullName.split(
                              " "
                          )
                        : [
                              "Employee",
                          ];

                data.firstName =
                    parts[0] ||
                    "Employee";

                data.lastName =
                    parts
                        .slice(1)
                        .join(" ") ||
                    "-";

                delete data.employeeName;

                [
                    "basicSalary",
                    "allowances",
                    "deductions",
                    "numberOfChildren",
                ].forEach(
                    (key) => {
                        data[key] =
                            Number(
                                data[
                                    key
                                ]
                            ) ||
                            0;
                    }
                );

                // Existing manual-form behavior preserved.
                if (
                    !data.employeeCode
                ) {
                    data.employeeCode =
                        initialData
                            ?.employeeCode ||
                        `EMP${Date.now()}`;
                }

                if (
                    !data.email
                ) {
                    data.email =
                        initialData
                            ?.email ||
                        `${data.employeeCode.toLowerCase()}@placeholder.local`;
                }

                if (
                    !data.position
                ) {
                    data.position =
                        "Employee";
                }

                if (
                    !data.gender
                ) {
                    data.gender =
                        "OTHER";
                }

                if (
                    !isEditMode &&
                    !data.password
                ) {
                    data.password =
                        `Temp@${data.employeeCode}`;
                }

                if (
                    isEditMode &&
                    !data.password
                ) {
                    delete data.password;
                }

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

                            label,

                            key,

                            value:
                                value ??
                                "",
                        })
                    );

                data.customFields =
                    customFields.map(
                        ({
                            section,
                            label,
                            value,
                        }) => ({
                            section,

                            label,

                            value,
                        })
                    );

                data.customSections =
                    customSections.map(
                        ({
                            title,
                            fields,
                        }) => ({
                            title,

                            fields:
                                (
                                    fields ||
                                    []
                                ).map(
                                    ({
                                        label,
                                        value,
                                    }) => ({
                                        label,

                                        value,
                                    })
                                ),
                        })
                    );

                const url =
                    isEditMode
                        ? `/employees/${
                              initialData._id ||
                              initialData.id
                          }`
                        : "/employees";

                await api[
                    isEditMode
                        ? "put"
                        : "post"
                ](
                    url,
                    data
                );

                toast.success(
                    isEditMode
                        ? "Employee updated successfully"
                        : "Employee created successfully"
                );

                onSuccess?.();
            } catch (error) {
                console.error(
                    "Employee submit error:",
                    error
                );

                toast.error(
                    error.response
                        ?.data
                        ?.error ||
                        error.message ||
                        "Something went wrong"
                );
            } finally {
                setLoading(
                    false
                );
            }
        };

    const addSection = () => {
        const title =
            newSectionTitle.trim();

        if (!title) {
            return toast.error(
                "Enter a section name"
            );
        }

        setCustomSections(
            (
                previous
            ) => [
                ...previous,

                {
                    id:
                        genId(),

                    title,

                    fields:
                        [],
                },
            ]
        );

        setNewSectionTitle(
            ""
        );

        setAddingSection(
            false
        );
    };

    const addFieldToSection = (
        sectionId
    ) => {
        const label =
            newSectionFieldLabel.trim();

        if (!label) {
            return toast.error(
                "Enter a field name"
            );
        }

        setCustomSections(
            (
                previous
            ) =>
                previous.map(
                    (
                        section
                    ) =>
                        section.id ===
                        sectionId
                            ? {
                                  ...section,

                                  fields: [
                                      ...(section.fields ||
                                          []),

                                      {
                                          id:
                                              genId(),

                                          label,

                                          value:
                                              "",
                                      },
                                  ],
                              }
                            : section
                )
        );

        setNewSectionFieldLabel(
            ""
        );

        setAddingFieldForSectionId(
            null
        );
    };

    return (
        <form
            onSubmit={
                handleSubmit
            }
            className="space-y-6 max-w-4xl animate-fade-in pb-8"
        >
            {sectionConfig.map(
                (
                    section
                ) => (
                    <div
                        key={
                            section.title
                        }
                        className="card p-5 sm:p-6"
                    >
                        <h3 className="font-medium mb-6 pb-4 border-b border-slate-100">
                            {
                                section.title
                            }
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm text-slate-700">
                            {section.fields.map(
                                renderField
                            )}
                        </div>
                    </div>
                )
            )}

            <div className="card p-5 sm:p-6">
                <h3 className="font-medium mb-6 pb-4 border-b border-slate-100">
                    Account Setup
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm text-slate-700">
                    <div>
                        <label className="block mb-2">
                            Temporary
                            Password
                        </label>

                        <input
                            type="password"
                            name="password"
                            placeholder={
                                isEditMode
                                    ? "Leave blank to keep current"
                                    : "Blank = auto-generated"
                            }
                        />
                    </div>

                    <div>
                        <label className="block mb-2">
                            System Role
                        </label>

                        <select
                            name="role"
                            defaultValue={
                                initialData
                                    ?.user
                                    ?.role ||
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

            {dynamicFields.length >
                0 && (
                <div className="card p-5 sm:p-6 border-indigo-100">
                    <div className="mb-6 pb-4 border-b border-slate-100">
                        <h3 className="font-medium">
                            Excel Dynamic
                            Fields
                        </h3>

                        <p className="text-xs text-slate-500 mt-1">
                            These fields
                            were detected
                            automatically
                            from uploaded
                            Excel files.
                        </p>
                    </div>

                    {Object.entries(
                        dynamicFields.reduce(
                            (
                                groups,
                                field
                            ) => {
                                const section =
                                    field.section ||
                                    "Excel Fields";

                                if (
                                    !groups[
                                        section
                                    ]
                                ) {
                                    groups[
                                        section
                                    ] =
                                        [];
                                }

                                groups[
                                    section
                                ].push(
                                    field
                                );

                                return groups;
                            },
                            {}
                        )
                    ).map(
                        ([
                            section,
                            fields,
                        ]) => (
                            <div
                                key={
                                    section
                                }
                                className="mb-6 last:mb-0"
                            >
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                                    {
                                        section
                                    }
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {fields.map(
                                        (
                                            field
                                        ) => (
                                            <div
                                                key={
                                                    field.id ||
                                                    field.key ||
                                                    field.label
                                                }
                                            >
                                                <label className="block mb-2">
                                                    {
                                                        field.label
                                                    }
                                                </label>

                                                <input
                                                    value={
                                                        field.value ??
                                                        ""
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setDynamicFields(
                                                            (
                                                                previous
                                                            ) =>
                                                                previous.map(
                                                                    (
                                                                        item
                                                                    ) =>
                                                                        item.id ===
                                                                        field.id
                                                                            ? {
                                                                                  ...item,

                                                                                  value:
                                                                                      event
                                                                                          .target
                                                                                          .value,
                                                                              }
                                                                            : item
                                                                )
                                                        )
                                                    }
                                                />
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        )
                    )}
                </div>
            )}

            {customFields.length >
                0 && (
                <div className="card p-5 sm:p-6">
                    <h3 className="font-medium mb-6 pb-4 border-b border-slate-100">
                        Existing Custom
                        Fields
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {customFields.map(
                            (
                                field
                            ) => (
                                <div
                                    key={
                                        field.id
                                    }
                                >
                                    <label className="flex items-center justify-between mb-2">
                                        <span>
                                            {
                                                field.label
                                            }
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setCustomFields(
                                                    (
                                                        previous
                                                    ) =>
                                                        previous.filter(
                                                            (
                                                                item
                                                            ) =>
                                                                item.id !==
                                                                field.id
                                                        )
                                                )
                                            }
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </label>

                                    <input
                                        value={
                                            field.value ||
                                            ""
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setCustomFields(
                                                (
                                                    previous
                                                ) =>
                                                    previous.map(
                                                        (
                                                            item
                                                        ) =>
                                                            item.id ===
                                                            field.id
                                                                ? {
                                                                      ...item,

                                                                      value:
                                                                          event
                                                                              .target
                                                                              .value,
                                                                  }
                                                                : item
                                                    )
                                            )
                                        }
                                    />
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}

            {customSections.map(
                (
                    section
                ) => (
                    <div
                        key={
                            section.id
                        }
                        className="card p-5 sm:p-6 border-indigo-100"
                    >
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                            <h3 className="font-semibold">
                                {
                                    section.title
                                }
                            </h3>

                            <button
                                type="button"
                                onClick={() =>
                                    setCustomSections(
                                        (
                                            previous
                                        ) =>
                                            previous.filter(
                                                (
                                                    item
                                                ) =>
                                                    item.id !==
                                                    section.id
                                            )
                                    )
                                }
                                className="text-slate-400 hover:text-rose-500 flex items-center gap-1"
                            >
                                <X className="w-4 h-4" />

                                Remove
                                Section
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {(
                                section.fields ||
                                []
                            ).map(
                                (
                                    field
                                ) => (
                                    <div
                                        key={
                                            field.id
                                        }
                                    >
                                        <label className="block mb-2">
                                            {
                                                field.label
                                            }
                                        </label>

                                        <input
                                            value={
                                                field.value ||
                                                ""
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setCustomSections(
                                                    (
                                                        previous
                                                    ) =>
                                                        previous.map(
                                                            (
                                                                item
                                                            ) =>
                                                                item.id ===
                                                                section.id
                                                                    ? {
                                                                          ...item,

                                                                          fields:
                                                                              item.fields.map(
                                                                                  (
                                                                                      itemField
                                                                                  ) =>
                                                                                      itemField.id ===
                                                                                      field.id
                                                                                          ? {
                                                                                                ...itemField,

                                                                                                value:
                                                                                                    event
                                                                                                        .target
                                                                                                        .value,
                                                                                            }
                                                                                          : itemField
                                                                              ),
                                                                      }
                                                                    : item
                                                        )
                                                )
                                            }
                                        />
                                    </div>
                                )
                            )}
                        </div>

                        <div className="mt-4">
                            {addingFieldForSectionId ===
                            section.id ? (
                                <div className="flex gap-2">
                                    <input
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
                                        placeholder="New field name"
                                    />

                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={() =>
                                            addFieldToSection(
                                                section.id
                                            )
                                        }
                                    >
                                        Add
                                    </button>

                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() =>
                                            setAddingFieldForSectionId(
                                                null
                                            )
                                        }
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="text-indigo-600 flex items-center gap-1"
                                    onClick={() =>
                                        setAddingFieldForSectionId(
                                            section.id
                                        )
                                    }
                                >
                                    <Plus className="w-4 h-4" />

                                    Add Field
                                </button>
                            )}
                        </div>
                    </div>
                )
            )}

            {addingSection ? (
                <div className="card p-5 sm:p-6 flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="block mb-2">
                            New Section
                            Name
                        </label>

                        <input
                            value={
                                newSectionTitle
                            }
                            onChange={(
                                event
                            ) =>
                                setNewSectionTitle(
                                    event
                                        .target
                                        .value
                                )
                            }
                        />
                    </div>

                    <button
                        type="button"
                        className="btn-primary"
                        onClick={
                            addSection
                        }
                    >
                        Add Section
                    </button>

                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() =>
                            setAddingSection(
                                false
                            )
                        }
                    >
                        Cancel
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() =>
                        setAddingSection(
                            true
                        )
                    }
                    className="btn-secondary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />

                    Add New
                    Section
                </button>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                    type="button"
                    className="btn-secondary"
                    onClick={
                        onCancel
                    }
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    disabled={
                        loading
                    }
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