import {
    ChevronDown,
    PencilIcon,
    Trash2Icon,
} from "lucide-react";

import {
    useMemo,
    useState,
} from "react";

import api from "../api/axios";
import toast from "react-hot-toast";

const formatDate = (value) => {
    if (!value) {
        return "";
    }

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
        "en-IN"
    );
};

const EmployeeCard = ({
    employee,
    onDelete,
    onEdit,
}) => {
    const [
        showDetails,
        setShowDetails,
    ] = useState(false);

    const handleDelete = async () => {
        if (
            !confirm(
                "Are you sure you want to delete this employee?"
            )
        ) {
            return;
        }

        try {
            await api.delete(
                `/employees/${
                    employee.id ||
                    employee._id
                }`
            );

            onDelete?.();
        } catch (err) {
            toast.error(
                err.response?.data
                    ?.error ||
                    err.message
            );
        }
    };

    const firstInitial =
        employee?.firstName?.[0] ||
        employee?.name?.[0] ||
        "E";

    const lastInitial =
        employee?.lastName?.[0] ||
        "";

    const dynamicFields =
        Array.isArray(
            employee?.dynamicFields
        )
            ? employee.dynamicFields
            : [];

    const standardDetails =
        useMemo(
            () => [
                [
                    "Employee Code",
                    employee
                        ?.employeeCode,
                ],

                [
                    "Email",
                    employee?.email,
                ],

                [
                    "Phone Number",
                    employee?.phone,
                ],

                [
                    "Mobile Number",
                    employee
                        ?.mobileNumber,
                ],

                [
                    "Father's Name",
                    employee
                        ?.fatherName,
                ],

                [
                    "Gender",
                    employee?.gender,
                ],

                [
                    "Blood Group",
                    employee
                        ?.bloodGroup,
                ],

                [
                    "Date of Birth",
                    formatDate(
                        employee
                            ?.dateOfBirth
                    ),
                ],

                [
                    "Date of Joining",
                    formatDate(
                        employee
                            ?.joinDate
                    ),
                ],

                [
                    "Birth Place",
                    employee
                        ?.birthPlace,
                ],

                [
                    "Nationality",
                    employee
                        ?.nationality,
                ],

                [
                    "Mother Tongue",
                    employee
                        ?.motherTongue,
                ],

                [
                    "Language",
                    employee
                        ?.languages,
                ],

                [
                    "Passport Number",
                    employee
                        ?.passportNumber,
                ],

                [
                    "Identification Mark",
                    employee
                        ?.identificationMark,
                ],

                [
                    "Manpower Type",
                    employee
                        ?.manpowerType,
                ],

                [
                    "Vendor Code",
                    employee
                        ?.vendorCode,
                ],

                [
                    "Marital Status",
                    employee
                        ?.maritalStatus,
                ],

                [
                    "Number of Children",
                    employee
                        ?.numberOfChildren,
                ],

                [
                    "Safety Issued Or Not",
                    employee
                        ?.safetyIssued,
                ],

                [
                    "Shoe Size",
                    employee
                        ?.shoeSize,
                ],

                [
                    "Shoe Issue Date",
                    formatDate(
                        employee
                            ?.shoeIssueDate
                    ),
                ],

                [
                    "Safety Helmet",
                    employee
                        ?.safetyHelmet,
                ],

                [
                    "Helmet Color",
                    employee
                        ?.helmetColor,
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
                    employee
                        ?.jacketSize,
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
                    employee
                        ?.permanentCity,
                ],

                [
                    "Permanent Country",
                    employee
                        ?.permanentCountry,
                ],

                [
                    "Permanent State",
                    employee
                        ?.permanentState,
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
                    employee
                        ?.presentCity,
                ],

                [
                    "Village",
                    employee?.village,
                ],

                [
                    "Present Country",
                    employee
                        ?.presentCountry,
                ],

                [
                    "Present State",
                    employee
                        ?.presentState,
                ],

                [
                    "Present Pin Code",
                    employee
                        ?.presentPinCode,
                ],

                [
                    "Emergency Contact Person Name",
                    employee
                        ?.emergencyContactPersonName,
                ],

                [
                    "Emergency Contact Person Relation",
                    employee
                        ?.emergencyContactPersonRelation,
                ],

                [
                    "Emergency Contact Person Address",
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
                    employee
                        ?.qualification,
                ],

                [
                    "Specialization",
                    employee
                        ?.specialization,
                ],

                [
                    "College / School Name",
                    employee
                        ?.collegeSchoolName,
                ],

                [
                    "Board / University Name",
                    employee
                        ?.boardUniversityName,
                ],

                [
                    "Year of Passing",
                    employee
                        ?.yearOfPassing,
                ],

                [
                    "Resume",
                    employee?.resume,
                ],

                [
                    "Appointment Letter",
                    employee
                        ?.appointmentLetter,
                ],

                [
                    "Degree Certificate",
                    employee
                        ?.degreeCertificate,
                ],

                [
                    "KYC Document",
                    employee
                        ?.kycDocument,
                ],

                [
                    "Medical Certificate",
                    employee
                        ?.medicalCertificate,
                ],

                [
                    "Previous Employment Appointment Letter",
                    employee
                        ?.previousEmploymentAppointmentLetter,
                ],

                [
                    "Previous Employment Relevant Experience Letter",
                    employee
                        ?.previousEmploymentRelevantExperienceLetter,
                ],

                [
                    "Police Verification",
                    employee
                        ?.policeVerification,
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
                    employee
                        ?.ifscCode,
                ],

                [
                    "Bank Name",
                    employee
                        ?.bankName,
                ],

                [
                    "Branch Name",
                    employee
                        ?.branchName,
                ],

                [
                    "UAN Number",
                    employee
                        ?.uanNumber,
                ],

                [
                    "PF Number",
                    employee
                        ?.pfNumber,
                ],

                [
                    "ESI Number",
                    employee
                        ?.esiNumber,
                ],

                [
                    "Basic Salary",
                    employee
                        ?.basicSalary,
                ],

                [
                    "Allowance",
                    employee
                        ?.allowances,
                ],

                [
                    "Deductions",
                    employee
                        ?.deductions,
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
                    "Aadhaar Number",
                    employee
                        ?.aadharNumber,
                ],

                [
                    "PAN Number",
                    employee
                        ?.panNumber,
                ],

                [
                    "Bio",
                    employee?.bio,
                ],

                [
                    "Employment Status",
                    employee
                        ?.employmentStatus,
                ],
            ],
            [employee]
        );

    const hasDetails =
        standardDetails.some(
            ([, value]) =>
                value !== undefined &&
                value !== null &&
                value !== ""
        ) ||
        dynamicFields.length >
            0;

    return (
        <div className="group relative card card-hover overflow-hidden">
            <div className="relative aspect-4/3 w-full overflow-hidden bg-linear-to-br from-slate-100 to-slate-50">
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
            </div>

            <div className="absolute top-3 left-3 flex gap-2">
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
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>

                    <button
                        type="button"
                        onClick={
                            handleDelete
                        }
                        className="pointer-events-auto p-2.5 bg-white/90 backdrop-blur-sm text-slate-700 hover:text-rose-600 rounded-xl shadow-lg transition-all hover:scale-105"
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

                <p className="text-xs text-slate-500">
                    {employee.position ||
                        employee.designation ||
                        "—"}
                </p>

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
                                Employee
                                Details
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
                                        <p className="text-[11px] font-semibold text-indigo-600 mb-2">
                                            Dynamic
                                            Excel
                                            Fields
                                        </p>

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
                                                        className="rounded-lg bg-indigo-50/50 px-3 py-2"
                                                    >
                                                        {field.section && (
                                                            <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">
                                                                {
                                                                    field.section
                                                                }
                                                            </p>
                                                        )}

                                                        <div className="flex items-start justify-between gap-3">
                                                            <span className="text-xs font-medium text-slate-600">
                                                                {
                                                                    field.label
                                                                }
                                                            </span>

                                                            <span className="max-w-[55%] break-words text-right text-xs text-slate-800">
                                                                {field.value ||
                                                                    "—"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
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