import {
    useMemo,
    useState,
} from "react";

import {
    PencilIcon,
    Trash2Icon,
    ChevronDown,
} from "lucide-react";

import toast from "react-hot-toast";
import api from "../api/axios";

const EmployeeCard = ({
    employee,
    onDelete,
    onEdit,
    selectable = false,
    selected = false,
    onSelect,
    allowDeletedSelection = false,
}) => {
    const [
        showDetails,
        setShowDetails,
    ] = useState(false);

    const employeeId =
        employee?._id ||
        employee?.id ||
        "";

    const firstInitial =
        employee?.firstName?.[0] ||
        employee?.name?.[0] ||
        "E";

    const lastInitial =
        employee?.lastName?.[0] ||
        "";

    const handleDelete = async () => {
        if (!employeeId) {
            toast.error(
                "Employee ID not found"
            );
            return;
        }

        const employeeName =
            employee?.name ||
            `${employee?.firstName || ""} ${employee?.lastName || ""
                }`.trim() ||
            "this employee";

        const confirmed =
            window.confirm(
                `Are you sure you want to delete ${employeeName}?`
            );

        if (!confirmed) {
            return;
        }

        try {
            await api.delete(
                `/employees/${employeeId}`
            );

            toast.success(
                "Employee card deleted"
            );

            onDelete?.(employeeId);
        } catch (error) {
            console.error(
                "Delete Employee Error:",
                error
            );

            if (
                error?.code ===
                "ERR_NETWORK" ||
                error?.message ===
                "Network Error"
            ) {
                toast.error(
                    "Cannot connect to the backend server. Make sure the server is running."
                );
                return;
            }

            toast.error(
                error.response?.data
                    ?.error ||
                error.message ||
                "Failed to delete employee"
            );
        }
    };

    const dynamicFields =
        Array.isArray(
            employee?.dynamicFields
        )
            ? employee.dynamicFields
            : [];

    const customFields =
        Array.isArray(
            employee?.customFields
        )
            ? employee.customFields
            : [];

    const customSections =
        Array.isArray(
            employee?.customSections
        )
            ? employee.customSections
            : [];

    const formatDate = (value) => {
        if (!value) {
            return "";
        }

        try {
            const date =
                new Date(value);

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return String(value);
            }

            return date.toLocaleDateString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                }
            );
        } catch {
            return String(value);
        }
    };

    const standardDetails =
        useMemo(
            () => [
                [
                    "Employee Code",
                    employee?.employeeCode,
                ],
                [
                    "Email",
                    employee?.email,
                ],
                [
                    "Temporary Password",
                    employee?.temporaryPassword,
                ],
                [
                    "Phone",
                    employee?.phone ||
                    employee?.mobileNumber,
                ],
                [
                    "Department",
                    employee?.department,
                ],
                [
                    "Designation",
                    employee?.position ||
                    employee?.designation,
                ],
                [
                    "Father's Name",
                    employee?.fatherName,
                ],
                [
                    "Gender",
                    employee?.gender,
                ],
                [
                    "Blood Group",
                    employee?.bloodGroup,
                ],
                [
                    "Date of Birth",
                    formatDate(
                        employee?.dateOfBirth
                    ),
                ],
                [
                    "Date of Joining",
                    formatDate(
                        employee?.joinDate
                    ),
                ],
                [
                    "Birth Place",
                    employee?.birthPlace,
                ],
                [
                    "Nationality",
                    employee?.nationality,
                ],
                [
                    "Mother Tongue",
                    employee?.motherTongue,
                ],
                [
                    "Languages",
                    employee?.languages,
                ],
                [
                    "Passport Number",
                    employee?.passportNumber,
                ],
                [
                    "Identification Mark",
                    employee?.identificationMark,
                ],
                [
                    "Manpower Type",
                    employee?.manpowerType,
                ],
                [
                    "Vendor Code",
                    employee?.vendorCode,
                ],
                [
                    "Marital Status",
                    employee?.maritalStatus,
                ],
                [
                    "Number of Children",
                    employee?.numberOfChildren,
                ],
                [
                    "Safety Issued",
                    employee?.safetyIssued,
                ],
                [
                    "Shoe Size",
                    employee?.shoeSize,
                ],
                [
                    "Shoe Issue Date",
                    formatDate(
                        employee?.shoeIssueDate
                    ),
                ],
                [
                    "Safety Helmet",
                    employee?.safetyHelmet,
                ],
                [
                    "Helmet Color",
                    employee?.helmetColor,
                ],
                [
                    "Helmet Issue Date",
                    formatDate(
                        employee
                            ?.helmetIssueDate
                    ),
                ],
                [
                    "Jacket",
                    employee?.jacket,
                ],
                [
                    "Jacket Size",
                    employee?.jacketSize,
                ],
                [
                    "Jacket Issue Date",
                    formatDate(
                        employee
                            ?.jacketIssueDate
                    ),
                ],
                [
                    "Eye Protection Equipment",
                    employee
                        ?.eyeProtectionEquipment,
                ],
                [
                    "Permanent Address Line 1",
                    employee
                        ?.permanentAddressLine1,
                ],
                [
                    "Permanent Address Line 2",
                    employee
                        ?.permanentAddressLine2,
                ],
                [
                    "Permanent City",
                    employee?.permanentCity,
                ],
                [
                    "Permanent State",
                    employee?.permanentState,
                ],
                [
                    "Permanent Country",
                    employee
                        ?.permanentCountry,
                ],
                [
                    "Permanent Pin Code",
                    employee
                        ?.permanentPinCode,
                ],
                [
                    "Present Address Line 1",
                    employee
                        ?.presentAddressLine1,
                ],
                [
                    "Present Address Line 2",
                    employee
                        ?.presentAddressLine2,
                ],
                [
                    "Present City",
                    employee?.presentCity,
                ],
                [
                    "Village",
                    employee?.village,
                ],
                [
                    "Present State",
                    employee?.presentState,
                ],
                [
                    "Present Country",
                    employee?.presentCountry,
                ],
                [
                    "Present Pin Code",
                    employee?.presentPinCode,
                ],
                [
                    "Mobile Number",
                    employee?.mobileNumber,
                ],
                [
                    "Emergency Contact Person",
                    employee
                        ?.emergencyContactPersonName,
                ],
                [
                    "Emergency Contact Relation",
                    employee
                        ?.emergencyContactPersonRelation,
                ],
                [
                    "Emergency Contact Address",
                    employee
                        ?.emergencyContactPersonAddress,
                ],
                [
                    "Emergency Mobile Number",
                    employee
                        ?.emergencyMobileNumber,
                ],
                [
                    "Qualification",
                    employee?.qualification,
                ],
                [
                    "Specialization",
                    employee?.specialization,
                ],
                [
                    "College / School",
                    employee
                        ?.collegeSchoolName,
                ],
                [
                    "Board / University",
                    employee
                        ?.boardUniversityName,
                ],
                [
                    "Year of Passing",
                    employee?.yearOfPassing,
                ],
                [
                    "Bank Account Number",
                    employee
                        ?.bankAccountNumber,
                ],
                [
                    "Bank Account Name",
                    employee
                        ?.bankAccountName,
                ],
                [
                    "Bank Account Type",
                    employee
                        ?.bankAccountType,
                ],
                [
                    "IFSC Code",
                    employee?.ifscCode,
                ],
                [
                    "Bank Name",
                    employee?.bankName,
                ],
                [
                    "Branch Name",
                    employee?.branchName,
                ],
                [
                    "UAN Number",
                    employee?.uanNumber,
                ],
                [
                    "PF Number",
                    employee?.pfNumber,
                ],
                [
                    "ESI Number",
                    employee?.esiNumber,
                ],
                [
                    "Aadhaar Number",
                    employee?.aadharNumber,
                ],
                [
                    "PAN Number",
                    employee?.panNumber,
                ],
                [
                    "Basic Salary",
                    employee?.basicSalary,
                ],
                [
                    "Allowances",
                    employee?.allowances,
                ],
                [
                    "Deductions",
                    employee?.deductions,
                ],
                [
                    "Anniversary Date",
                    formatDate(
                        employee
                            ?.anniversaryDate
                    ),
                ],
                [
                    "Confirmation Date",
                    formatDate(
                        employee
                            ?.confirmationDate
                    ),
                ],
                [
                    "Employment Status",
                    employee
                        ?.employmentStatus,
                ],
                [
                    "Bio",
                    employee?.bio,
                ],
            ],
            [employee]
        );

    const hasDetails =
        standardDetails.some(
            ([, value]) =>
                value !==
                undefined &&
                value !== null &&
                value !== ""
        ) ||
        dynamicFields.length > 0 ||
        customFields.length > 0 ||
        customSections.some(
            (section) =>
                Array.isArray(
                    section?.fields
                ) &&
                section.fields.length >
                0
        );

    return (
        <div
            className={`group relative card card-hover overflow-hidden transition-all ${
                selected
                    ? "ring-2 ring-indigo-500 ring-offset-2"
                    : ""
            }`}
        >
            <div className="relative aspect-4/3 w-full overflow-hidden bg-linear-to-br from-slate-100 to-slate-50">
                {employee?.image ? (
                    <img
                        src={
                            employee.image
                        }
                        alt={
                            employee.name ||
                            `${employee.firstName || ""} ${employee.lastName ||
                            ""
                            }`
                        }
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-linear-to-br from-indigo-100 to-slate-100 flex items-center justify-center">
                            <span className="text-2xl font-medium text-indigo-400">
                                {
                                    firstInitial
                                }{" "}
                                {
                                    lastInitial
                                }
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="absolute top-3 left-3 flex gap-2 z-20">
                <span className="bg-white/90 backdrop-blur-sm px-2.5 py-1 text-xs text-slate-600 rounded-lg shadow-sm">
                    {employee.department ||
                        "Remote"}

                    {employee.isDeleted && (
                        <span className="text-red-400">
                            {" "}
                            DELETED
                        </span>
                    )}
                </span>
            </div>

            {/* ==========================================
                EMPLOYEE SELECTION CHECKBOX

                Normal employee:
                selectable=true works as before.

                Deleted employee:
                checkbox is shown only when
                allowDeletedSelection=true.
            ========================================== */}

            {selectable &&
                (!employee.isDeleted ||
                    allowDeletedSelection) && (
                    <label
                        className={`absolute right-3 top-3 z-30 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border shadow-md backdrop-blur-sm transition-all ${
                            selected
                                ? "border-indigo-500 bg-indigo-50"
                                : "border-slate-200 bg-white/95 hover:border-indigo-300"
                        }`}
                        title={
                            selected
                                ? "Unselect employee"
                                : "Select employee"
                        }
                        onClick={(
                            event
                        ) =>
                            event.stopPropagation()
                        }
                    >
                        <input
                            type="checkbox"
                            checked={
                                selected
                            }
                            onChange={() =>
                                onSelect?.(
                                    employeeId
                                )
                            }
                            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                    </label>
                )}

            {!employee.isDeleted && (
                <div className="absolute inset-x-0 top-0 aspect-4/3 bg-linear-to-t from-indigo-700/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6 gap-3 pointer-events-none">
                    <button
                        type="button"
                        onClick={() =>
                            onEdit?.(
                                employee
                            )
                        }
                        className="pointer-events-auto p-2.5 bg-white/90 backdrop-blur-sm text-slate-700 hover:text-indigo-600 rounded-xl shadow-lg transition-all hover:scale-105"
                        title="Edit employee"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>

                    <button
                        type="button"
                        onClick={
                            handleDelete
                        }
                        className="pointer-events-auto p-2.5 bg-white/90 backdrop-blur-sm text-slate-700 hover:text-rose-600 rounded-xl shadow-lg transition-all hover:scale-105"
                        title="Delete employee"
                    >
                        <Trash2Icon className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="p-5">
                <h3 className="text-slate-900">
                    {employee.firstName ||
                        employee.name ||
                        "Employee"}{" "}
                    {employee.lastName ||
                        ""}
                </h3>

                {(employee.position ||
                    employee.designation) && (
                        <p className="text-xs text-slate-500">
                            {employee.position ||
                                employee.designation}
                        </p>
                    )}

                {hasDetails && (
                    <div className="mt-4 border-t border-slate-100 pt-3">
                        <button
                            type="button"
                            onClick={() =>
                                setShowDetails(
                                    (
                                        previous
                                    ) =>
                                        !previous
                                )
                            }
                            className="w-full flex items-center justify-between text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                            <span>
                                Employee Details
                            </span>

                            <ChevronDown
                                className={`w-4 h-4 transition-transform ${
                                    showDetails
                                        ? "rotate-180"
                                        : ""
                                }`}
                            />
                        </button>

                        {showDetails && (
                            <div className="mt-3 max-h-96 overflow-y-auto pr-1 space-y-4">
                                <div className="space-y-2">
                                    {standardDetails.map(
                                        ([
                                            label,
                                            value,
                                        ]) => (
                                            <div
                                                key={
                                                    label
                                                }
                                                className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                                            >
                                                <span className="text-xs font-medium text-slate-600">
                                                    {
                                                        label
                                                    }
                                                </span>

                                                <span className="max-w-[55%] break-words text-right text-xs text-slate-800">
                                                    {value ===
                                                        undefined ||
                                                    value ===
                                                        null ||
                                                    value ===
                                                        ""
                                                        ? "—"
                                                        : String(
                                                            value
                                                        )}
                                                </span>
                                            </div>
                                        )
                                    )}
                                </div>

                                {dynamicFields.length >
                                    0 && (
                                        <div className="pt-2 border-t border-slate-100">
                                            <div className="space-y-2">
                                                {dynamicFields.map(
                                                    (
                                                        field,
                                                        index
                                                    ) => (
                                                        <div
                                                            key={
                                                                field.key ||
                                                                `${field.section}-${field.label}-${index}`
                                                            }
                                                            className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                                                        >
                                                            <span className="text-xs font-medium text-slate-600">
                                                                {
                                                                    field.label
                                                                }
                                                            </span>

                                                            <span className="max-w-[55%] break-words text-right text-xs text-slate-800">
                                                                {field.value ===
                                                                    undefined ||
                                                                field.value ===
                                                                    null ||
                                                                field.value ===
                                                                    ""
                                                                    ? "—"
                                                                    : String(
                                                                        field.value
                                                                    )}
                                                            </span>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {customFields.length >
                                    0 && (
                                        <div className="pt-2 border-t border-slate-100">
                                            <div className="space-y-2">
                                                {customFields.map(
                                                    (
                                                        field,
                                                        index
                                                    ) => (
                                                        <div
                                                            key={
                                                                field.id ||
                                                                `${field.section}-${field.label}-${index}`
                                                            }
                                                            className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                                                        >
                                                            <span className="text-xs font-medium text-slate-600">
                                                                {
                                                                    field.label
                                                                }
                                                            </span>

                                                            <span className="max-w-[55%] break-words text-right text-xs text-slate-800">
                                                                {field.value ===
                                                                    undefined ||
                                                                field.value ===
                                                                    null ||
                                                                field.value ===
                                                                    ""
                                                                    ? "—"
                                                                    : String(
                                                                        field.value
                                                                    )}
                                                            </span>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {customSections.map(
                                    (
                                        section,
                                        sectionIndex
                                    ) =>
                                        Array.isArray(
                                            section
                                                ?.fields
                                        ) &&
                                        section
                                            .fields
                                            .length >
                                            0 ? (
                                            <div
                                                key={
                                                    section.id ||
                                                    `${section.title}-${sectionIndex}`
                                                }
                                                className="pt-2 border-t border-slate-100"
                                            >
                                                {section.title && (
                                                    <p className="mb-2 text-xs font-semibold text-indigo-600">
                                                        {
                                                            section.title
                                                        }
                                                    </p>
                                                )}

                                                <div className="space-y-2">
                                                    {section.fields.map(
                                                        (
                                                            field,
                                                            fieldIndex
                                                        ) => (
                                                            <div
                                                                key={
                                                                    field.id ||
                                                                    `${field.label}-${fieldIndex}`
                                                                }
                                                                className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                                                            >
                                                                <span className="text-xs font-medium text-slate-600">
                                                                    {
                                                                        field.label
                                                                    }
                                                                </span>

                                                                <span className="max-w-[55%] break-words text-right text-xs text-slate-800">
                                                                    {field.value ===
                                                                        undefined ||
                                                                    field.value ===
                                                                        null ||
                                                                    field.value ===
                                                                        ""
                                                                        ? "—"
                                                                        : String(
                                                                            field.value
                                                                        )}
                                                                </span>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        ) : null
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeCard;