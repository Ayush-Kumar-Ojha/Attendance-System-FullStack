import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Plus,
  Search,
  X,
  Download,
  Upload,
  FileSpreadsheet,
  Loader2,
  Trash2,
  ArchiveRestore,
  RotateCcw,
} from "lucide-react";

import toast from "react-hot-toast";
import * as XLSX from "xlsx";

import EmployeeCard from "../components/EmployeeCard";
import EmployeeForm from "../components/EmployeeForm";
import AddDepartmentModal from "../components/AddDepartmentModal";

import {
  useDepartments,
} from "../hooks/useDepartments";

import {
  downloadEmployeeTemplate,
} from "../utils/employeeTemplate";

import api from "../api/axios";

const Employees = () => {
  const [
    employees,
    setEmployees,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selectedDept,
    setSelectedDept,
  ] = useState("");

  const [
    showCreateModal,
    setShowCreateModal,
  ] = useState(false);

  const [
    editEmployee,
    setEditEmployee,
  ] = useState(null);

  const [
    showAddDeptModal,
    setShowAddDeptModal,
  ] = useState(false);

  const [
    uploadingExcel,
    setUploadingExcel,
  ] = useState(false);

  const [
    selectedEmployeeIds,
    setSelectedEmployeeIds,
  ] = useState([]);

  const [
    deletingSelected,
    setDeletingSelected,
  ] = useState(false);

  const [
    showDeletedEmployees,
    setShowDeletedEmployees,
  ] = useState(false);

  const [
    deletedEmployees,
    setDeletedEmployees,
  ] = useState([]);

  const [
    loadingDeletedEmployees,
    setLoadingDeletedEmployees,
  ] = useState(false);

  const [
    restoringEmployeeId,
    setRestoringEmployeeId,
  ] = useState("");

  // =================================================
  // DELETED EMPLOYEE SELECTION
  // =================================================

  const [
    selectedDeletedEmployeeIds,
    setSelectedDeletedEmployeeIds,
  ] = useState([]);

  const [
    permanentlyDeletingEmployees,
    setPermanentlyDeletingEmployees,
  ] = useState(false);

  const fileInputRef =
    useRef(null);

  const {
    departments,
    addDepartment,
  } = useDepartments();

  // =================================================
  // EMPLOYEE ID
  // =================================================

  const getEmployeeId = (employee) =>
    String(
      employee?._id ||
      employee?.id ||
      ""
    );

  // =================================================
  // FETCH EMPLOYEES
  // =================================================

  const fetchEmployees =
    useCallback(
      async () => {
        setLoading(true);

        try {
          const url =
            selectedDept
              ? `/employees?department=${encodeURIComponent(
                selectedDept
              )}`
              : "/employees";

          const response =
            await api.get(url);

          setEmployees(
            Array.isArray(
              response.data
            )
              ? response.data
              : []
          );
        } catch (error) {
          console.error(
            "Failed to fetch employees:",
            error
          );

          toast.error(
            error.response
              ?.data
              ?.error ||
            "Failed to fetch employees"
          );
        } finally {
          setLoading(false);
        }
      },
      [selectedDept]
    );

  // =================================================
  // FETCH DELETED EMPLOYEES
  // =================================================

  const fetchDeletedEmployees =
    useCallback(
      async () => {
        setLoadingDeletedEmployees(
          true
        );

        try {
          const response =
            await api.get(
              "/employees/deleted"
            );

          const data =
            Array.isArray(
              response.data
            )
              ? response.data
              : [];

          setDeletedEmployees(
            data
          );

          /*
           * Remove selections that no longer exist
           * in the Deleted Employees response.
           */
          const availableIds =
            new Set(
              data
                .map(
                  (employee) =>
                    String(
                      employee?._id ||
                      employee?.id ||
                      ""
                    )
                )
                .filter(Boolean)
            );

          setSelectedDeletedEmployeeIds(
            (current) =>
              current.filter(
                (id) =>
                  availableIds.has(
                    id
                  )
              )
          );
        } catch (error) {
          console.error(
            "Failed to fetch deleted employees:",
            error
          );

          toast.error(
            error.response?.data?.error ||
            "Failed to fetch deleted employees"
          );
        } finally {
          setLoadingDeletedEmployees(
            false
          );
        }
      },
      []
    );

  // =================================================
  // RESTORE EMPLOYEE
  // =================================================

  const handleRestoreEmployee =
    async (employee) => {
      const employeeId =
        getEmployeeId(
          employee
        );

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
          `Restore ${employeeName} to the Employees page?`
        );

      if (!confirmed) {
        return;
      }

      setRestoringEmployeeId(
        employeeId
      );

      try {
        const response =
          await api.patch(
            `/employees/${employeeId}/restore`
          );

        toast.success(
          response.data?.message ||
          "Employee restored successfully"
        );

        // Remove restored employee
        // from deleted selection.
        setSelectedDeletedEmployeeIds(
          (current) =>
            current.filter(
              (id) =>
                id !== employeeId
            )
        );

        await fetchEmployees();
        await fetchDeletedEmployees();
      } catch (error) {
        console.error(
          "Restore employee error:",
          error
        );

        toast.error(
          error.response?.data?.error ||
          error.message ||
          "Failed to restore employee"
        );
      } finally {
        setRestoringEmployeeId(
          ""
        );
      }
    };

  useEffect(() => {
    fetchEmployees();
    fetchDeletedEmployees();
  }, [
    fetchEmployees,
    fetchDeletedEmployees,
  ]);

  // =================================================
  // SEARCH
  // =================================================

  const filtered =
    employees.filter(
      (employee) => {
        const dynamicValues =
          (
            Array.isArray(
              employee.dynamicFields
            )
              ? employee.dynamicFields
              : []
          )
            .flatMap(
              (
                field
              ) => [
                  field
                    ?.section,

                  field
                    ?.label,

                  field
                    ?.value,
                ]
            )
            .filter(
              Boolean
            );

        const customFieldValues =
          (
            Array.isArray(
              employee.customFields
            )
              ? employee.customFields
              : []
          )
            .flatMap(
              (
                field
              ) => [
                  field
                    ?.label,

                  field
                    ?.value,
                ]
            )
            .filter(
              Boolean
            );

        const customSectionValues =
          (
            Array.isArray(
              employee.customSections
            )
              ? employee.customSections
              : []
          )
            .flatMap(
              (
                section
              ) => [
                  section
                    ?.title,

                  ...(section.fields ||
                    []).flatMap(
                      (
                        field
                      ) => [
                          field
                            ?.label,

                          field
                            ?.value,
                        ]
                    ),
                ]
            )
            .filter(
              Boolean
            );

        const searchText =
          [
            employee.employeeCode,

            employee.name,

            employee.firstName,

            employee.lastName,

            employee.position,

            employee.department,

            employee.email,

            ...dynamicValues,

            ...customFieldValues,

            ...customSectionValues,
          ]
            .filter(
              Boolean
            )
            .join(
              " "
            )
            .toLowerCase();

        return searchText.includes(
          search.toLowerCase()
        );
      }
    );

  // =================================================
  // EMPLOYEE CARD SELECTION / MULTI DELETE
  // =================================================

  const toggleEmployeeSelection = (
    employeeId
  ) => {
    const id = String(
      employeeId || ""
    );

    if (!id) return;

    setSelectedEmployeeIds(
      (current) =>
        current.includes(id)
          ? current.filter(
            (item) =>
              item !== id
          )
          : [
            ...current,
            id,
          ]
    );
  };

  const visibleEmployeeIds =
    filtered
      .map(getEmployeeId)
      .filter(Boolean);

  const allVisibleSelected =
    visibleEmployeeIds.length >
    0 &&
    visibleEmployeeIds.every(
      (id) =>
        selectedEmployeeIds.includes(
          id
        )
    );

  const toggleSelectAllVisible =
    () => {
      setSelectedEmployeeIds(
        (current) => {
          if (
            allVisibleSelected
          ) {
            return current.filter(
              (id) =>
                !visibleEmployeeIds.includes(
                  id
                )
            );
          }

          return Array.from(
            new Set([
              ...current,
              ...visibleEmployeeIds,
            ])
          );
        }
      );
    };

  const handleDeleteSelected =
    async () => {
      if (
        selectedEmployeeIds.length ===
        0
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Are you sure you want to delete ${selectedEmployeeIds.length
          } selected employee card${selectedEmployeeIds.length ===
            1
            ? ""
            : "s"
          }?`
        );

      if (!confirmed) {
        return;
      }

      setDeletingSelected(true);

      try {
        const results =
          await Promise.allSettled(
            selectedEmployeeIds.map(
              (employeeId) =>
                api.delete(
                  `/employees/${employeeId}`
                )
            )
          );

        const deletedCount =
          results.filter(
            (result) =>
              result.status ===
              "fulfilled"
          ).length;

        const failedCount =
          results.length -
          deletedCount;

        if (
          deletedCount > 0
        ) {
          toast.success(
            `${deletedCount} employee card${deletedCount === 1
              ? ""
              : "s"
            } deleted`
          );
        }

        if (
          failedCount > 0
        ) {
          toast.error(
            `${failedCount} employee card${failedCount === 1
              ? ""
              : "s"
            } could not be deleted`
          );
        }

        setSelectedEmployeeIds(
          []
        );

        await fetchEmployees();
        await fetchDeletedEmployees();
      } catch (error) {
        console.error(
          "Delete selected employees error:",
          error
        );

        toast.error(
          error.response?.data
            ?.error ||
          error.message ||
          "Failed to delete selected employees"
        );
      } finally {
        setDeletingSelected(
          false
        );
      }
    };

  // =================================================
  // DELETED EMPLOYEE SELECTION
  // =================================================

  const toggleDeletedEmployeeSelection = (
    employeeId
  ) => {
    const id = String(
      employeeId || ""
    );

    if (!id) {
      return;
    }

    setSelectedDeletedEmployeeIds(
      (current) =>
        current.includes(id)
          ? current.filter(
            (item) =>
              item !== id
          )
          : [
            ...current,
            id,
          ]
    );
  };

  const deletedEmployeeIds =
    deletedEmployees
      .map(getEmployeeId)
      .filter(Boolean);

  const allDeletedEmployeesSelected =
    deletedEmployeeIds.length >
    0 &&
    deletedEmployeeIds.every(
      (id) =>
        selectedDeletedEmployeeIds.includes(
          id
        )
    );

  const toggleSelectAllDeletedEmployees =
    () => {
      setSelectedDeletedEmployeeIds(
        (current) => {
          if (
            allDeletedEmployeesSelected
          ) {
            return current.filter(
              (id) =>
                !deletedEmployeeIds.includes(
                  id
                )
            );
          }

          return Array.from(
            new Set([
              ...current,
              ...deletedEmployeeIds,
            ])
          );
        }
      );
    };

  // =================================================
  // PERMANENTLY REMOVE DELETED EMPLOYEES
  // FROM PORTAL ONLY
  // =================================================

  const handlePermanentlyDeleteSelected =
    async () => {
      if (
        selectedDeletedEmployeeIds.length ===
        0
      ) {
        toast.error(
          "Please select at least one employee"
        );

        return;
      }

      const count =
        selectedDeletedEmployeeIds.length;

      const confirmed =
        window.confirm(
          `Permanently remove ${count} selected employee${count === 1
            ? ""
            : "s"
          } from the Deleted Employees portal?\n\nThe employee data will remain in the database.`
        );

      if (!confirmed) {
        return;
      }

      setPermanentlyDeletingEmployees(
        true
      );

      try {
        const response =
          await api.patch(
            "/employees/deleted/permanent-hide",
            {
              employeeIds:
                selectedDeletedEmployeeIds,
            }
          );

        toast.success(
          response.data?.message ||
          `${count} employee${count === 1
            ? ""
            : "s"
          } removed from Deleted Employees`
        );

        setSelectedDeletedEmployeeIds(
          []
        );

        await fetchDeletedEmployees();
      } catch (error) {
        console.error(
          "Permanent portal delete error:",
          error
        );

        toast.error(
          error.response?.data?.error ||
          error.message ||
          "Failed to permanently remove selected employees"
        );
      } finally {
        setPermanentlyDeletingEmployees(
          false
        );
      }
    };

  // =================================================
  // DATE
  // =================================================

  const formatExcelDate = (
    value
  ) => {
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
      return "";
    }

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() +
        1
      ).padStart(
        2,
        "0"
      );

    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      );

    return `${year}-${month}-${day}`;
  };

  // =================================================
  // DOWNLOAD ALL EMPLOYEE DATA
  // =================================================

  const exportEmployees = () => {
    if (
      employees.length ===
      0
    ) {
      toast.error(
        "No employees to download"
      );

      return;
    }

    const dynamicFieldColumns =
      [];

    const customFieldColumns =
      [];

    const customSectionColumns =
      [];

    employees.forEach(
      (
        employee
      ) => {
        (
          Array.isArray(
            employee.dynamicFields
          )
            ? employee.dynamicFields
            : []
        ).forEach(
          (
            field
          ) => {
            if (
              !field?.label
            ) {
              return;
            }

            const key =
              field.key ||
              `${field.section ||
              "Excel Fields"
              }::${field.label
              }`;

            if (
              !dynamicFieldColumns.some(
                (
                  column
                ) =>
                  column.key ===
                  key
              )
            ) {
              dynamicFieldColumns.push(
                {
                  key,

                  section:
                    field.section ||
                    "Excel Fields",

                  label:
                    field.label,
                }
              );
            }
          }
        );

        (
          Array.isArray(
            employee.customFields
          )
            ? employee.customFields
            : []
        ).forEach(
          (
            field
          ) => {
            if (
              !field?.label
            ) {
              return;
            }

            const columnName =
              `[Custom Field] ${field.label}`;

            if (
              !customFieldColumns.includes(
                columnName
              )
            ) {
              customFieldColumns.push(
                columnName
              );
            }
          }
        );

        (
          Array.isArray(
            employee.customSections
          )
            ? employee.customSections
            : []
        ).forEach(
          (
            section
          ) => {
            (
              section.fields ||
              []
            ).forEach(
              (
                field
              ) => {
                if (
                  !section
                    ?.title ||
                  !field
                    ?.label
                ) {
                  return;
                }

                const columnName =
                  `[${section.title}] ${field.label}`;

                if (
                  !customSectionColumns.includes(
                    columnName
                  )
                ) {
                  customSectionColumns.push(
                    columnName
                  );
                }
              }
            );
          }
        );
      }
    );

    const duplicateDynamicLabels =
      new Set(
        dynamicFieldColumns
          .filter(
            (
              column,
              index,
              all
            ) =>
              all.some(
                (
                  other,
                  otherIndex
                ) =>
                  otherIndex !==
                  index &&
                  other.label ===
                  column.label
              )
          )
          .map(
            (
              column
            ) =>
              column.label
          )
      );

    const rows =
      employees.map(
        (
          employee
        ) => {
          const fullName =
            employee.name ||
            `${employee.firstName ||
              ""
              } ${employee.lastName ||
              ""
              }`.trim();

          const row = {
            Name:
              fullName,

            "Father's Name":
              employee.fatherName ||
              "",

            Gender:
              employee.gender ||
              "",

            "Blood Group":
              employee.bloodGroup ||
              "",

            "Date of Birth":
              formatExcelDate(
                employee.dateOfBirth
              ),

            "Date of Joining":
              formatExcelDate(
                employee.joinDate
              ),

            "Birth Place":
              employee.birthPlace ||
              "",

            Nationality:
              employee.nationality ||
              "",

            "Mother Tongue":
              employee.motherTongue ||
              "",

            Language:
              employee.languages ||
              "",

            "Phone Number":
              employee.phone ||
              "",

            "Passport Number":
              employee.passportNumber ||
              "",

            "Identification Mark":
              employee.identificationMark ||
              "",

            "Manpower Type":
              employee.manpowerType ||
              "",

            "Vendor Code":
              employee.vendorCode ||
              "",

            "Marital Status":
              employee.maritalStatus ||
              "",

            "Number of Children":
              employee.numberOfChildren ??
              "",

            "Safety Issued Or Not":
              employee.safetyIssued ||
              "",

            "Shoe Size":
              employee.shoeSize ||
              "",

            "Shoe Issue Date":
              formatExcelDate(
                employee.shoeIssueDate
              ),

            "Safety Helmet":
              employee.safetyHelmet ||
              "",

            "Helmet Color":
              employee.helmetColor ||
              "",

            "Helmet Issue Date":
              formatExcelDate(
                employee.helmetIssueDate
              ),

            Jacket:
              employee.jacket ||
              "",

            "Jacket Size":
              employee.jacketSize ||
              "",

            "Jacket Issue Date":
              formatExcelDate(
                employee.jacketIssueDate
              ),

            "Eye Protection Equipment":
              employee.eyeProtectionEquipment ||
              "",

            "Permanent Address Line 1":
              employee.permanentAddressLine1 ||
              "",

            "Permanent Address Line 2":
              employee.permanentAddressLine2 ||
              "",

            "Permanent City":
              employee.permanentCity ||
              "",

            "Permanent Country":
              employee.permanentCountry ||
              "",

            "Permanent State":
              employee.permanentState ||
              "",

            "Permanent Pin Code":
              employee.permanentPinCode ||
              "",

            "Present Address Line 1":
              employee.presentAddressLine1 ||
              "",

            "Present Address Line 2":
              employee.presentAddressLine2 ||
              "",

            "Present City":
              employee.presentCity ||
              "",

            Village:
              employee.village ||
              "",

            "Present Country":
              employee.presentCountry ||
              "",

            "Present State":
              employee.presentState ||
              "",

            "Present Pin Code":
              employee.presentPinCode ||
              "",

            "Mobile Number":
              employee.mobileNumber ||
              "",

            "Emergency Contact Person Name":
              employee.emergencyContactPersonName ||
              "",

            "Emergency Contact Person Relation":
              employee.emergencyContactPersonRelation ||
              "",

            "Emergency Contact Person Address":
              employee.emergencyContactPersonAddress ||
              "",

            "Emergency Mobile Number":
              employee.emergencyMobileNumber ||
              "",

            Qualification:
              employee.qualification ||
              "",

            Specialization:
              employee.specialization ||
              "",

            "College / School Name":
              employee.collegeSchoolName ||
              "",

            "Board / University Name":
              employee.boardUniversityName ||
              "",

            "Year of Passing":
              employee.yearOfPassing ||
              "",

            Resume:
              employee.resume ||
              employee.cvUrl ||
              "",

            "Appointment Letter":
              employee.appointmentLetter ||
              "",

            "Degree Certificate":
              employee.degreeCertificate ||
              "",

            "KYC Document":
              employee.kycDocument ||
              "",

            "Medical Certificate":
              employee.medicalCertificate ||
              "",

            "Previous Employment Appointment Letter":
              employee.previousEmploymentAppointmentLetter ||
              "",

            "Previous Employment Relevant Experience Letter":
              employee.previousEmploymentRelevantExperienceLetter ||
              "",

            "Police Verification":
              employee.policeVerification ||
              "",

            "Bank Account Number":
              employee.bankAccountNumber ||
              "",

            "Bank Account Name":
              employee.bankAccountName ||
              "",

            "Bank Account Type":
              employee.bankAccountType ||
              "",

            "IFSC Code":
              employee.ifscCode ||
              "",

            "Bank Name":
              employee.bankName ||
              "",

            "Branch Name":
              employee.branchName ||
              "",

            "UAN Number":
              employee.uanNumber ||
              "",

            "PF Number":
              employee.pfNumber ||
              "",

            "ESI Number":
              employee.esiNumber ||
              "",

            "Employee Code":
              employee.employeeCode ||
              "",

            "Employee Email ID":
              employee.email ||
              "",

            Department:
              employee.department ||
              "",

            Designation:
              employee.position ||
              "",

            "Basic Salary":
              employee.basicSalary ??
              "",

            Allowance:
              employee.allowances ??
              "",

            Deductions:
              employee.deductions ??
              "",

            "System Role":
              employee.user
                ?.role ||
              "EMPLOYEE",

            "Anniversary Date":
              formatExcelDate(
                employee.anniversaryDate
              ),

            "Confirmation Date":
              formatExcelDate(
                employee.confirmationDate
              ),

            "Aadhaar Number":
              employee.aadharNumber ||
              "",

            "PAN Number":
              employee.panNumber ||
              "",
          };

          dynamicFieldColumns.forEach(
            (
              column
            ) => {
              const field =
                (
                  employee.dynamicFields ||
                  []
                ).find(
                  (
                    item
                  ) => {
                    const itemKey =
                      item.key ||
                      `${item.section ||
                      "Excel Fields"
                      }::${item.label
                      }`;

                    return (
                      itemKey ===
                      column.key
                    );
                  }
                );

              const columnName =
                duplicateDynamicLabels.has(
                  column.label
                )
                  ? `[${column.section}] ${column.label}`
                  : column.label;

              row[
                columnName
              ] =
                field?.value ||
                "";
            }
          );

          customFieldColumns.forEach(
            (
              columnName
            ) => {
              const label =
                columnName.replace(
                  /^\[Custom Field\]\s*/,
                  ""
                );

              const field =
                (
                  employee.customFields ||
                  []
                ).find(
                  (
                    item
                  ) =>
                    item.label ===
                    label
                );

              row[
                columnName
              ] =
                field?.value ||
                "";
            }
          );

          customSectionColumns.forEach(
            (
              columnName
            ) => {
              const match =
                columnName.match(
                  /^\[(.+?)\]\s(.+)$/
                );

              if (!match) {
                row[
                  columnName
                ] =
                  "";

                return;
              }

              const sectionTitle =
                match[1];

              const fieldLabel =
                match[2];

              const section =
                (
                  employee.customSections ||
                  []
                ).find(
                  (
                    item
                  ) =>
                    item.title ===
                    sectionTitle
                );

              const field =
                section?.fields?.find(
                  (
                    item
                  ) =>
                    item.label ===
                    fieldLabel
                );

              row[
                columnName
              ] =
                field?.value ||
                "";
            }
          );

          return row;
        }
      );

    const worksheet =
      XLSX.utils.json_to_sheet(
        rows
      );

    worksheet["!cols"] =
      Object.keys(
        rows[0]
      ).map(
        (
          header
        ) => ({
          wch:
            Math.max(
              header.length +
              2,
              18
            ),
        })
      );

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Employees"
    );

    XLSX.writeFile(
      workbook,
      `Employee_Data_${new Date()
        .toISOString()
        .split(
          "T"
        )[0]
      }.xlsx`
    );

    toast.success(
      "Employee data downloaded"
    );
  };

  // =================================================
  // EXCEL UPLOAD
  // =================================================

  const openExcelUpload = () => {
    if (
      uploadingExcel
    ) {
      return;
    }

    fileInputRef.current?.click();
  };

  const handleExcelUpload =
    async (event) => {
      const file =
        event.target
          .files?.[0];

      event.target.value =
        "";

      if (!file) {
        return;
      }

      const lowerName =
        file.name.toLowerCase();

      if (
        !lowerName.endsWith(
          ".xlsx"
        ) &&
        !lowerName.endsWith(
          ".xls"
        )
      ) {
        toast.error(
          "Please select an Excel file (.xlsx or .xls)"
        );

        return;
      }

      if (
        file.size >
        10 *
        1024 *
        1024
      ) {
        toast.error(
          "Excel file must be smaller than 10MB"
        );

        return;
      }

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      setUploadingExcel(
        true
      );

      try {
        const response =
          await api.post(
            "/employees/bulk-upload",
            formData,
            {
              headers:
              {
                "Content-Type":
                  "multipart/form-data",
              },
            }
          );

        const result =
          response.data;

        const created =
          result.created || 0;

        const updated =
          result.updated || 0;

        const restored =
          result.restored || 0;

        const skipped =
          result.skippedCount ??
          result.skipped?.length ??
          0;

        toast.success(
          restored > 0
            ? `${created} created, ${updated} updated, ${restored} restored, ${skipped} skipped`
            : `${created} created, ${updated} updated, ${skipped} skipped`,
          {
            duration: 5000,
          }
        );

        if (
          Array.isArray(
            result.skipped
          ) &&
          result.skipped
            .length >
          0
        ) {
          console.table(
            result.skipped
          );
        }

        if (
          Array.isArray(
            result.dynamicColumns
          ) &&
          result.dynamicColumns
            .length >
          0
        ) {
          console.table(
            result.dynamicColumns
          );
        }

        await fetchEmployees();

        // Important when an Excel upload
        // restores a previously deleted employee.
        await fetchDeletedEmployees();
      } catch (
      error
      ) {
        console.error(
          "Excel upload error:",
          error
        );

        toast.error(
          error.response
            ?.data
            ?.error ||
          error.message ||
          "Failed to upload Excel file"
        );
      } finally {
        setUploadingExcel(
          false
        );
      }
    };

  return (
    <div className="animate-fade-in">
      <input
        ref={
          fileInputRef
        }
        type="file"
        accept=".xlsx,.xls"
        onChange={
          handleExcelUpload
        }
        className="hidden"
      />

      {/* =================================================
    PAGE HEADER
================================================= */}

      <div className="flex items-center justify-between gap-5 mb-8">
        <div className="shrink-0">
          <h1 className="page-title">
            Employees
          </h1>

          <p className="page-subtitle">
            Manage your team members
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 flex-nowrap">
          {/* Deleted Employees */}
          <button
            type="button"
            onClick={() => {
              setShowDeletedEmployees(true);
              setSelectedDeletedEmployeeIds([]);
              fetchDeletedEmployees();
            }}
            className="btn-secondary flex items-center gap-1.5 justify-center whitespace-nowrap px-3 py-2 text-sm"
          >
            <ArchiveRestore size={15} />

            Deleted Employees

            {deletedEmployees.length > 0
              ? ` (${deletedEmployees.length})`
              : ""}
          </button>

          {/* Add Using Excel */}
          <button
            type="button"
            onClick={openExcelUpload}
            disabled={uploadingExcel}
            className="btn-primary flex items-center gap-1.5 justify-center whitespace-nowrap px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploadingExcel ? (
              <Loader2
                size={15}
                className="animate-spin"
              />
            ) : (
              <Upload size={15} />
            )}

            {uploadingExcel
              ? "Uploading..."
              : "Add Using Excel"}
          </button>

          {/* Add Using Form */}
          <button
            type="button"
            onClick={() =>
              setShowCreateModal(true)
            }
            className="btn-secondary flex items-center gap-1.5 justify-center whitespace-nowrap px-3 py-2 text-sm"
          >
            <Plus size={15} />
            Add Using Form
          </button>

          {/* Download Employee Data */}
          <button
            type="button"
            onClick={exportEmployees}
            className="btn-secondary flex items-center gap-1.5 justify-center whitespace-nowrap px-3 py-2 text-sm"
          >
            <Download size={15} />
            Download Data
          </button>

          {/* Excel Template */}
          <button
            type="button"
            onClick={downloadEmployeeTemplate}
            className="btn-secondary flex items-center gap-1.5 justify-center whitespace-nowrap px-3 py-2 text-sm"
          >
            <FileSpreadsheet size={15} />
            Excel Template
          </button>
        </div>
      </div>

      {/* =================================================
          SEARCH + DEPARTMENT FILTER
      ================================================= */}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />

          <input
            placeholder="Search employees..."
            className="w-full pl-10"
            value={
              search
            }
            onChange={(
              event
            ) =>
              setSearch(
                event
                  .target
                  .value
              )
            }
          />
        </div>

        <select
          value={
            selectedDept
          }
          onChange={(
            event
          ) =>
            setSelectedDept(
              event
                .target
                .value
            )
          }
          className="max-w-48"
        >
          <option value="">
            All Departments
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

        <button
          type="button"
          onClick={() =>
            setShowAddDeptModal(
              true
            )
          }
          className="btn-secondary flex items-center gap-2 whitespace-nowrap"
        >
          <Plus
            size={16}
          />

          Add Department
        </button>
      </div>

      {/* =================================================
          MULTIPLE EMPLOYEE SELECTION
      ================================================= */}

      {!loading &&
        filtered.length > 0 && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 select-none">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />

              <span>
                Select all visible
              </span>
            </label>

            {selectedEmployeeIds.length >
              0 && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-slate-600">
                    {
                      selectedEmployeeIds.length
                    }{" "}
                    employee
                    {selectedEmployeeIds.length ===
                      1
                      ? ""
                      : "s"}{" "}
                    selected
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedEmployeeIds(
                        []
                      )
                    }
                    disabled={
                      deletingSelected
                    }
                    className="text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
                  >
                    Clear selection
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleDeleteSelected
                    }
                    disabled={
                      deletingSelected
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingSelected ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}

                    {deletingSelected
                      ? "Deleting..."
                      : "Delete Selected"}
                  </button>
                </div>
              )}
          </div>
        )}

      {/* =================================================
          EMPLOYEE CARDS
      ================================================= */}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filtered.length ===
            0 ? (
            <p className="col-span-full text-center py-16 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
              No employees found
            </p>
          ) : (
            filtered.map(
              (
                employee
              ) => {
                const employeeId =
                  getEmployeeId(
                    employee
                  );

                return (
                  <EmployeeCard
                    key={
                      employeeId
                    }
                    employee={
                      employee
                    }
                    onDelete={() => {
                      setSelectedEmployeeIds(
                        (
                          current
                        ) =>
                          current.filter(
                            (
                              id
                            ) =>
                              id !==
                              employeeId
                          )
                      );

                      fetchEmployees();
                      fetchDeletedEmployees();
                    }}
                    onEdit={
                      setEditEmployee
                    }
                    selectable={
                      true
                    }
                    selected={
                      selectedEmployeeIds.includes(
                        employeeId
                      )
                    }
                    onSelect={
                      toggleEmployeeSelection
                    }
                  />
                );
              }
            )
          )}
        </div>
      )}

      {/* =================================================
          DELETED EMPLOYEES
      ================================================= */}

      {showDeletedEmployees && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => {
            setShowDeletedEmployees(
              false
            );

            setSelectedDeletedEmployeeIds(
              []
            );
          }}
        >
          <div
            className="relative my-8 w-full max-w-6xl rounded-2xl bg-white shadow-2xl"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-100 bg-white p-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Deleted Employees
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  Open Employee Details to see the complete saved data, restore an employee, or select deleted employees to remove them permanently from this portal.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowDeletedEmployees(
                    false
                  );

                  setSelectedDeletedEmployeeIds(
                    []
                  );
                }}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">

              {/* =============================================
                  DELETED EMPLOYEE MULTI-SELECTION BAR
              ============================================= */}

              {!loadingDeletedEmployees &&
                deletedEmployees.length > 0 && (
                  <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={
                          allDeletedEmployeesSelected
                        }
                        onChange={
                          toggleSelectAllDeletedEmployees
                        }
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />

                      <span>
                        Select all deleted employees
                      </span>
                    </label>

                    {selectedDeletedEmployeeIds.length >
                      0 && (
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-sm font-medium text-slate-600">
                            {
                              selectedDeletedEmployeeIds.length
                            }{" "}
                            employee
                            {selectedDeletedEmployeeIds.length ===
                              1
                              ? ""
                              : "s"}{" "}
                            selected
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedDeletedEmployeeIds(
                                []
                              )
                            }
                            disabled={
                              permanentlyDeletingEmployees
                            }
                            className="text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
                          >
                            Clear selection
                          </button>

                          <button
                            type="button"
                            onClick={
                              handlePermanentlyDeleteSelected
                            }
                            disabled={
                              permanentlyDeletingEmployees
                            }
                            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {permanentlyDeletingEmployees ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}

                            {permanentlyDeletingEmployees
                              ? "Deleting..."
                              : "Delete Permanently"}
                          </button>
                        </div>
                      )}
                  </div>
                )}

              {loadingDeletedEmployees ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
                </div>
              ) : deletedEmployees.length ===
                0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-16 text-center text-slate-400">
                  No deleted employee cards
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {deletedEmployees.map(
                    (employee) => {
                      const employeeId =
                        getEmployeeId(
                          employee
                        );

                      return (
                        <div
                          key={
                            employeeId
                          }
                          className="space-y-2"
                        >
                          <EmployeeCard
                            employee={
                              employee
                            }
                            selectable={
                              true
                            }
                            allowDeletedSelection={
                              true
                            }
                            selected={
                              selectedDeletedEmployeeIds.includes(
                                employeeId
                              )
                            }
                            onSelect={
                              toggleDeletedEmployeeSelection
                            }
                          />

                          <button
                            type="button"
                            onClick={() =>
                              handleRestoreEmployee(
                                employee
                              )
                            }
                            disabled={
                              restoringEmployeeId ===
                              employeeId
                            }
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {restoringEmployeeId ===
                              employeeId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}

                            {restoringEmployeeId ===
                              employeeId
                              ? "Restoring..."
                              : "Restore Employee"}
                          </button>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          ADD EMPLOYEE MODAL
      ================================================= */}

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-black/40 backdrop-blur-sm"
          onClick={() =>
            setShowCreateModal(
              false
            )
          }
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 animate-fade-in"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between p-6 pb-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Add New Employee
                </h2>

                <p className="text-sm text-slate-500 mt-0.5">
                  Create a user account and employee profile
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCreateModal(
                    false
                  )
                }
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <EmployeeForm
                onSuccess={() => {
                  setShowCreateModal(
                    false
                  );

                  fetchEmployees();
                }}
                onCancel={() =>
                  setShowCreateModal(
                    false
                  )
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          EDIT EMPLOYEE MODAL
      ================================================= */}

      {editEmployee && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-black/40 backdrop-blur-sm"
          onClick={() =>
            setEditEmployee(
              null
            )
          }
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 animate-fade-in"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between p-6 pb-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Edit Employee
                </h2>

                <p className="text-sm text-slate-500 mt-0.5">
                  Update employee details, dynamic Excel fields, custom fields and sections
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditEmployee(
                    null
                  )
                }
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <EmployeeForm
                initialData={
                  editEmployee
                }
                onSuccess={() => {
                  setEditEmployee(
                    null
                  );

                  fetchEmployees();
                }}
                onCancel={() =>
                  setEditEmployee(
                    null
                  )
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          ADD DEPARTMENT MODAL
      ================================================= */}

      <AddDepartmentModal
        open={
          showAddDeptModal
        }
        onClose={() =>
          setShowAddDeptModal(
            false
          )
        }
        onAdd={
          addDepartment
        }
      />
    </div>
  );
};

export default Employees;