import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PlusIcon,
  Download,
  Filter,
  Info,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  DollarSign,
  UserCheck,
  Clock3,
  XCircle,
  CalendarDays,
  TrendingUp,
} from "lucide-react";

import * as XLSX from "xlsx";

import Loading from "../components/Loading";
import LeaveHistory from "../components/leave/LeaveHistory";
import ApplyLeaveModal from "../components/leave/ApplyLeaveModal";
import DocumentAttachment from "../components/leave/DocumentAttachment";

import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import toast from "react-hot-toast";

// ============================================================
// LEAVE POLICY
// ============================================================

const MONTHLY_PAID_LEAVE_LIMIT = 3;
const ANNUAL_PAID_LEAVE_LIMIT =
  MONTHLY_PAID_LEAVE_LIMIT * 12;

// ============================================================
// HELPERS
// ============================================================

const getLeaveDays = (leave) => {
  /*
    IMPORTANT:

    1 HALF DAY = 0.5 leave

    Therefore:

    1 half day  = 0.5
    2 half days = 1
    3 half days = 1.5
    4 half days = 2
  */

  if (leave.type === "HALF_DAY") {
    return 0.5;
  }

  const start = new Date(leave.startDate);
  const end = new Date(leave.endDate);

  return (
    Math.round(
      (end.getTime() - start.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1
  );
};

const getLeaveTypeLabel = (type) => {
  const labels = {
    SICK: "Sick Leave",
    CASUAL: "Casual Leave",
    ANNUAL: "Annual Leave",

    // Keep database value MENSTRUAL,
    // but show Wellness Leave in UI.
    MENSTRUAL: "Wellness Leave",

    HALF_DAY: "Half Day",
    COMPENSATORY: "Compensatory Leave",
  };

  return labels[type] || type || "";
};

const currentDate = new Date();

// ============================================================
// MONTHLY STATS
// ============================================================

const calculateMonthlyStats = (
  leavesList,
  selectedMonth,
  selectedYear
) => {
  const monthNum = selectedMonth
    ? Number(selectedMonth)
    : currentDate.getMonth() + 1;

  const yearNum = selectedYear
    ? Number(selectedYear)
    : currentDate.getFullYear();

  const monthLeaves = leavesList.filter((leave) => {
    if (!leave.startDate) {
      return false;
    }

    const date = new Date(leave.startDate);

    return (
      date.getMonth() + 1 === monthNum &&
      date.getFullYear() === yearNum
    );
  });

  const approvedLeaves = monthLeaves.filter(
    (leave) => leave.status === "APPROVED"
  );

  const pendingLeaves = monthLeaves.filter(
    (leave) => leave.status === "PENDING"
  );

  const rejectedLeaves = monthLeaves.filter(
    (leave) => leave.status === "REJECTED"
  );

  let totalApprovedDays = 0;
  let emergencyPaidDays = 0;
  let lopDays = 0;
  let standardPaidDays = 0;
  let pendingDays = 0;
  let rejectedDays = 0;

  approvedLeaves.forEach((leave) => {
    const days = getLeaveDays(leave);

    totalApprovedDays += days;

    if (leave.isEmergencyOverride) {
      emergencyPaidDays += days;
    } else if (
      leave.isLop ||
      leave.paymentType === "UNPAID"
    ) {
      lopDays += days;
    } else if (leave.type !== "COMPENSATORY") {
      standardPaidDays += days;
    }
  });

  pendingLeaves.forEach((leave) => {
    pendingDays += getLeaveDays(leave);
  });

  rejectedLeaves.forEach((leave) => {
    rejectedDays += getLeaveDays(leave);
  });

  /*
    Compatibility with any older records where
    normal paid leave exceeded 3 days.
  */

  if (standardPaidDays > MONTHLY_PAID_LEAVE_LIMIT) {
    const excessDays =
      standardPaidDays - MONTHLY_PAID_LEAVE_LIMIT;

    lopDays += excessDays;

    standardPaidDays =
      MONTHLY_PAID_LEAVE_LIMIT;
  }

  const quotaPaidUsed = Math.min(
    MONTHLY_PAID_LEAVE_LIMIT,
    standardPaidDays
  );

  const quotaPaidRemaining = Math.max(
    0,
    MONTHLY_PAID_LEAVE_LIMIT - quotaPaidUsed
  );

  const extraDaysTaken =
    emergencyPaidDays + lopDays;

  return {
    monthName: new Date(
      2000,
      monthNum - 1
    ).toLocaleString("en-IN", {
      month: "long",
    }),

    monthNum,
    yearNum,

    totalApprovedDays,

    quotaPaidUsed,
    quotaPaidRemaining,

    extraDaysTaken,

    emergencyPaidDays,
    lopDays,

    pendingDays,
    rejectedDays,

    pendingCount: pendingLeaves.length,
    approvedCount: approvedLeaves.length,
    rejectedCount: rejectedLeaves.length,

    totalRequests: monthLeaves.length,
  };
};

// ============================================================
// ANNUAL STATS
// ============================================================

const calculateAnnualStats = (
  leavesList,
  selectedYear
) => {
  const yearNum = selectedYear
    ? Number(selectedYear)
    : currentDate.getFullYear();

  const yearLeaves = leavesList.filter((leave) => {
    if (!leave.startDate) {
      return false;
    }

    return (
      new Date(
        leave.startDate
      ).getFullYear() === yearNum
    );
  });

  const approvedLeaves = yearLeaves.filter(
    (leave) => leave.status === "APPROVED"
  );

  const pendingLeaves = yearLeaves.filter(
    (leave) => leave.status === "PENDING"
  );

  const rejectedLeaves = yearLeaves.filter(
    (leave) => leave.status === "REJECTED"
  );

  let normalPaidDays = 0;
  let emergencyPaidDays = 0;
  let lopDays = 0;

  let totalApprovedDays = 0;
  let pendingDays = 0;
  let rejectedDays = 0;

  let sickDays = 0;
  let casualDays = 0;
  let annualDays = 0;
  let wellnessDays = 0;
  let halfDays = 0;
  let compensatoryDays = 0;

  approvedLeaves.forEach((leave) => {
    const days = getLeaveDays(leave);

    totalApprovedDays += days;

    if (leave.isEmergencyOverride) {
      emergencyPaidDays += days;
    } else if (
      leave.isLop ||
      leave.paymentType === "UNPAID"
    ) {
      lopDays += days;
    } else if (leave.type !== "COMPENSATORY") {
      normalPaidDays += days;
    }

    switch (leave.type) {
      case "SICK":
        sickDays += days;
        break;

      case "CASUAL":
        casualDays += days;
        break;

      case "ANNUAL":
        annualDays += days;
        break;

      case "MENSTRUAL":
        wellnessDays += days;
        break;

      case "HALF_DAY":
        halfDays += days;
        break;

      case "COMPENSATORY":
        compensatoryDays += days;
        break;

      default:
        break;
    }
  });

  pendingLeaves.forEach((leave) => {
    pendingDays += getLeaveDays(leave);
  });

  rejectedLeaves.forEach((leave) => {
    rejectedDays += getLeaveDays(leave);
  });

  const paidRemaining = Math.max(
    0,
    ANNUAL_PAID_LEAVE_LIMIT - normalPaidDays
  );

  return {
    yearNum,

    annualEntitlement:
      ANNUAL_PAID_LEAVE_LIMIT,

    paidUsed: normalPaidDays,
    paidRemaining,

    totalApprovedDays,

    emergencyPaidDays,
    lopDays,

    pendingDays,
    rejectedDays,

    totalRequests: yearLeaves.length,

    approvedRequests:
      approvedLeaves.length,

    pendingRequests:
      pendingLeaves.length,

    rejectedRequests:
      rejectedLeaves.length,

    sickDays,
    casualDays,
    annualDays,

    wellnessDays,

    halfDays,
    compensatoryDays,
  };
};

// ============================================================
// COMPONENT
// ============================================================

const Leave = () => {
  const { user } = useAuth();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] =
    useState(false);

  const [isDeleted, setIsDeleted] =
    useState(false);

  const [documents, setDocuments] = useState({
    HOLIDAY_LIST: null,
    LEAVE_POLICY: null,
  });

  const isAdmin =
    user?.role === "ADMIN";

  // ========================================================
  // ADMIN FILTERS
  // ========================================================

  const [employees, setEmployees] =
    useState([]);

  const [
    filterEmployeeId,
    setFilterEmployeeId,
  ] = useState("");

  const [
    filterMonth,
    setFilterMonth,
  ] = useState(
    String(
      currentDate.getMonth() + 1
    )
  );

  const [
    filterYear,
    setFilterYear,
  ] = useState(
    String(
      currentDate.getFullYear()
    )
  );

  const [
    filterStatus,
    setFilterStatus,
  ] = useState("");

  const [search] = useState("");

  // ========================================================
  // FETCH LEAVES
  // ========================================================

  const fetchLeaves = useCallback(
    async () => {
      try {
        const params = {};

        if (isAdmin) {
          if (filterEmployeeId) {
            params.employeeId =
              filterEmployeeId;
          }

          if (filterMonth) {
            params.month =
              filterMonth;
          }

          if (filterYear) {
            params.year =
              filterYear;
          }

          if (filterStatus) {
            params.status =
              filterStatus;
          }
        }

        const res = await api.get(
          "/leave",
          {
            params,
          }
        );

        setLeaves(
          res.data.data || []
        );

        if (
          res.data.employee?.isDeleted
        ) {
          setIsDeleted(true);
        } else {
          setIsDeleted(false);
        }
      } catch (error) {
        toast.error(
          error?.response?.data?.error ||
            error.message
        );
      } finally {
        setLoading(false);
      }
    },
    [
      isAdmin,
      filterEmployeeId,
      filterMonth,
      filterYear,
      filterStatus,
    ]
  );

  // ========================================================
  // FETCH DOCUMENTS
  // ========================================================

  const fetchDocuments =
    useCallback(async () => {
      try {
        const res =
          await api.get(
            "/documents"
          );

        setDocuments(
          res.data
        );
      } catch (error) {
        console.error(
          "Leave document fetch error:",
          error
        );
      }
    }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ========================================================
  // ADMIN EMPLOYEE LIST
  // ========================================================

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    api
      .get("/employees")
      .then((res) => {
        const list =
          Array.isArray(res.data)
            ? res.data
            : [];

        setEmployees(
          list.filter(
            (employee) =>
              !employee.isDeleted
          )
        );
      })
      .catch((error) => {
        console.error(
          "Fetch employees for leave filter error:",
          error
        );
      });
  }, [isAdmin]);

  // ========================================================
  // FILTERED LEAVES
  // ========================================================

  const filteredLeaves =
    useMemo(() => {
      if (
        !isAdmin ||
        !search.trim()
      ) {
        return leaves;
      }

      const value =
        search.toLowerCase();

      return leaves.filter(
        (leave) => {
          const employeeName =
            `${
              leave.employee?.firstName ||
              ""
            } ${
              leave.employee?.lastName ||
              ""
            }`.toLowerCase();

          return (
            employeeName.includes(
              value
            ) ||
            leave.reason
              ?.toLowerCase()
              .includes(value) ||
            leave.type
              ?.toLowerCase()
              .includes(value)
          );
        }
      );
    }, [
      leaves,
      search,
      isAdmin,
    ]);

  // ========================================================
  // YEARS
  // ========================================================

  const availableYears =
    Array.from(
      {
        length: 6,
      },
      (_, index) =>
        currentDate.getFullYear() -
        index
    );

  // ========================================================
  // SELECTED ADMIN EMPLOYEE
  // ========================================================

  const selectedEmployeeObj =
    useMemo(() => {
      if (
        !isAdmin ||
        !filterEmployeeId
      ) {
        return null;
      }

      return employees.find(
        (employee) =>
          String(
            employee._id ||
              employee.id
          ) ===
          String(
            filterEmployeeId
          )
      );
    }, [
      isAdmin,
      filterEmployeeId,
      employees,
    ]);

  // ========================================================
  // MONTHLY STATS
  // ========================================================

  const monthlyStats =
    useMemo(() => {
      return calculateMonthlyStats(
        filteredLeaves,
        filterMonth,
        filterYear
      );
    }, [
      filteredLeaves,
      filterMonth,
      filterYear,
    ]);

  // ========================================================
  // ANNUAL STATS
  // ========================================================

  const annualStats =
    useMemo(() => {
      return calculateAnnualStats(
        leaves,
        filterYear
      );
    }, [
      leaves,
      filterYear,
    ]);

  // ========================================================
  // EXPORT
  // ========================================================

  const exportLeaves = () => {
    if (
      filteredLeaves.length ===
      0
    ) {
      toast.error(
        "No leave records to export"
      );

      return;
    }

    const rows =
      filteredLeaves.map(
        (leave) => ({
          Employee:
            `${
              leave.employee?.firstName ||
              ""
            } ${
              leave.employee?.lastName ||
              ""
            }`.trim(),

          Type:
            getLeaveTypeLabel(
              leave.type
            ),

          "Worked Extra Date":
            leave.workedDate
              ? new Date(
                  leave.workedDate
                ).toLocaleDateString(
                  "en-IN"
                )
              : "-",

          "Half Day Period":
            leave.halfDayPeriod
              ? leave.halfDayPeriod.replace(
                  "_",
                  " "
                )
              : "",

          "Start Date":
            leave.startDate
              ? new Date(
                  leave.startDate
                ).toLocaleDateString(
                  "en-IN"
                )
              : "",

          "End Date":
            leave.endDate
              ? new Date(
                  leave.endDate
                ).toLocaleDateString(
                  "en-IN"
                )
              : "",

          "Total Days":
            getLeaveDays(
              leave
            ),

          "Emergency Paid Override":
            leave.isEmergencyOverride
              ? "YES"
              : "NO",

          "LOP Leave":
            leave.isLop ||
            leave.paymentType ===
              "UNPAID"
              ? "YES"
              : "NO",

          "Payment Type":
            leave.paymentType ||
            "",

          Reason:
            leave.reason || "",

          Status:
            leave.status,

          "Admin Remark":
            leave.adminRemark ||
            "",
        })
      );

    const worksheet =
      XLSX.utils.json_to_sheet(
        rows
      );

    worksheet["!cols"] =
      Object.keys(
        rows[0]
      ).map((key) => ({
        wch: Math.max(
          key.length,
          16
        ),
      }));

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Leave Records"
    );

    const parts = [
      "leave_records",
    ];

    if (filterStatus) {
      parts.push(
        filterStatus.toLowerCase()
      );
    }

    if (filterMonth) {
      parts.push(
        new Date(
          2000,
          Number(
            filterMonth
          ) - 1
        )
          .toLocaleString(
            "en-IN",
            {
              month: "short",
            }
          )
          .toLowerCase()
      );
    }

    if (filterYear) {
      parts.push(
        filterYear
      );
    }

    XLSX.writeFile(
      workbook,
      `${parts.join(
        "_"
      )}.xlsx`
    );
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="animate-fade-in space-y-6">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">

        <div>
          <h1 className="page-title">
            Leave Management
          </h1>

          <p className="page-subtitle">
            {isAdmin
              ? "Manage leave applications and employee monthly reports"
              : "Your monthly and annual leave tracker and history"}
          </p>
        </div>

        {!isAdmin &&
          !isDeleted && (
            <button
              onClick={() =>
                setShowModal(true)
              }
              className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto"
            >
              <PlusIcon className="h-4 w-4" />

              Apply for Leave
            </button>
          )}

        {isAdmin && (
          <button
            onClick={
              exportLeaves
            }
            className="btn-secondary flex w-full items-center justify-center gap-2 sm:w-auto"
            type="button"
          >
            <Download className="h-4 w-4" />

            Download
          </button>
        )}

      </div>

      {/* =================================================
          DOCUMENTS
      ================================================= */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        <DocumentAttachment
          type="HOLIDAY_LIST"
          label="Holiday List"
          doc={
            documents.HOLIDAY_LIST
          }
          isAdmin={
            isAdmin
          }
          onUpdate={
            fetchDocuments
          }
        />

        <DocumentAttachment
          type="LEAVE_POLICY"
          label="Leave Policy"
          doc={
            documents.LEAVE_POLICY
          }
          isAdmin={
            isAdmin
          }
          onUpdate={
            fetchDocuments
          }
        />

      </div>

      {/* =================================================
          CLIENT LOCATION NOTICE
      ================================================= */}

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900 shadow-xs">

        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

        <p className="leading-relaxed">

          <strong className="font-semibold text-amber-950">
            Engineers working in client location:
          </strong>

          {" "}

          Leaves and holidays for
          on-site / client-deployed
          employees are applicable
          as per the respective
          client's location
          guidelines and project
          schedule.

        </p>

      </div>

      {/* =================================================
          EMPLOYEE PORTAL
      ================================================= */}

      {!isAdmin && (

        <div className="space-y-6">

          {/* =========================================
              MONTHLY LEAVE SUMMARY
          ========================================= */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            {/* MONTHLY HEADER */}

            <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                  <Calendar size={20} />
                </div>

                <div>

                  <h2 className="text-sm font-bold text-slate-900">
                    Monthly Leave Summary
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {monthlyStats.monthName}{" "}
                    {monthlyStats.yearNum}
                    {" • "}
                    Paid leave allowance:{" "}
                    {MONTHLY_PAID_LEAVE_LIMIT} days
                  </p>

                </div>

              </div>

              {/* Wider filters */}

              <div className="flex flex-wrap items-center gap-3">

                <select
                  value={
                    filterMonth
                  }
                  onChange={(event) =>
                    setFilterMonth(
                      event.target.value
                    )
                  }
                  className="min-w-[170px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >

                  {Array.from(
                    {
                      length: 12,
                    },
                    (
                      _,
                      index
                    ) =>
                      index + 1
                  ).map((month) => (

                    <option
                      key={
                        month
                      }
                      value={
                        month
                      }
                    >
                      {new Date(
                        2000,
                        month - 1
                      ).toLocaleString(
                        "en-IN",
                        {
                          month:
                            "long",
                        }
                      )}
                    </option>

                  ))}

                </select>

                <select
                  value={
                    filterYear
                  }
                  onChange={(event) =>
                    setFilterYear(
                      event.target.value
                    )
                  }
                  className="min-w-[120px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >

                  {availableYears.map(
                    (year) => (

                      <option
                        key={
                          year
                        }
                        value={
                          year
                        }
                      >
                        {
                          year
                        }
                      </option>

                    )
                  )}

                </select>

              </div>

            </div>

            {/* =========================================
                MONTHLY CARDS - SAME BOX
            ========================================= */}

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">

              {/* PAID REMAINING */}

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">

                <div className="flex items-start justify-between gap-2">

                  <div>

                    <p className="text-xs font-semibold text-slate-500">
                      Paid Remaining
                    </p>

                    <p className="mt-2 text-xl font-bold text-emerald-600">
                      {
                        monthlyStats.quotaPaidRemaining
                      }

                      <span className="ml-1 text-xs font-medium text-slate-400">
                        / 3
                      </span>
                    </p>

                  </div>

                  <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                    <CheckCircle2
                      size={
                        18
                      }
                    />
                  </div>

                </div>

              </div>

              {/* PAID USED */}

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">

                <div className="flex items-start justify-between gap-2">

                  <div>

                    <p className="text-xs font-semibold text-slate-500">
                      Paid Used
                    </p>

                    <p className="mt-2 text-xl font-bold text-indigo-600">
                      {
                        monthlyStats.quotaPaidUsed
                      }

                      <span className="ml-1 text-xs font-medium text-slate-400">
                        / 3
                      </span>
                    </p>

                  </div>

                  <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
                    <Calendar
                      size={
                        18
                      }
                    />
                  </div>

                </div>

              </div>

              {/* APPROVED */}

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">

                <div className="flex items-start justify-between gap-2">

                  <div>

                    <p className="text-xs font-semibold text-slate-500">
                      Approved Days
                    </p>

                    <p className="mt-2 text-xl font-bold text-slate-900">
                      {
                        monthlyStats.totalApprovedDays
                      }
                    </p>

                  </div>

                  <div className="rounded-lg bg-slate-200/70 p-2 text-slate-600">
                    <TrendingUp
                      size={
                        18
                      }
                    />
                  </div>

                </div>

              </div>

              {/* PENDING */}

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">

                <div className="flex items-start justify-between gap-2">

                  <div>

                    <p className="text-xs font-semibold text-slate-500">
                      Pending
                    </p>

                    <p className="mt-2 text-xl font-bold text-blue-600">
                      {
                        monthlyStats.pendingDays
                      }

                      <span className="ml-1 text-xs font-medium text-slate-400">
                        days
                      </span>
                    </p>

                  </div>

                  <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                    <Clock3
                      size={
                        18
                      }
                    />
                  </div>

                </div>

              </div>

              {/* EXTRA DAYS */}

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">

                <div className="flex items-start justify-between gap-2">

                  <div>

                    <p className="text-xs font-semibold text-slate-500">
                      Extra Days
                    </p>

                    <p className="mt-2 text-xl font-bold text-amber-700">
                      {
                        monthlyStats.extraDaysTaken
                      }

                      <span className="ml-1 text-xs font-medium text-slate-400">
                        days
                      </span>
                    </p>

                  </div>

                  <div className="rounded-lg bg-amber-100 p-2 text-amber-600">
                    <AlertTriangle
                      size={
                        18
                      }
                    />
                  </div>

                </div>

              </div>

              {/* EMERGENCY */}

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">

                <div className="flex items-start justify-between gap-2">

                  <div>

                    <p className="text-xs font-semibold text-slate-500">
                      Emergency Paid
                    </p>

                    <p className="mt-2 text-xl font-bold text-emerald-700">
                      {
                        monthlyStats.emergencyPaidDays
                      }

                      <span className="ml-1 text-xs font-medium text-slate-400">
                        days
                      </span>
                    </p>

                  </div>

                  <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                    <ShieldCheck
                      size={
                        18
                      }
                    />
                  </div>

                </div>

              </div>

              {/* LOP */}

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">

                <div className="flex items-start justify-between gap-2">

                  <div>

                    <p className="text-xs font-semibold text-slate-500">
                      LOP
                    </p>

                    <p className="mt-2 text-xl font-bold text-red-600">
                      {
                        monthlyStats.lopDays
                      }

                      <span className="ml-1 text-xs font-medium text-slate-400">
                        days
                      </span>
                    </p>

                  </div>

                  <div className="rounded-lg bg-red-100 p-2 text-red-600">
                    <DollarSign
                      size={
                        18
                      }
                    />
                  </div>

                </div>

              </div>

              {/* REJECTED */}

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">

                <div className="flex items-start justify-between gap-2">

                  <div>

                    <p className="text-xs font-semibold text-slate-500">
                      Rejected
                    </p>

                    <p className="mt-2 text-xl font-bold text-red-600">
                      {
                        monthlyStats.rejectedCount
                      }

                      <span className="ml-1 text-xs font-medium text-slate-400">
                        requests
                      </span>
                    </p>

                  </div>

                  <div className="rounded-lg bg-red-100 p-2 text-red-600">
                    <XCircle
                      size={
                        18
                      }
                    />
                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* =========================================
              ANNUAL TRACKER
          ========================================= */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">

            <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                  <CalendarDays
                    size={
                      20
                    }
                  />
                </div>

                <div>

                  <h2 className="text-sm font-bold text-slate-900">
                    Annual Leave Tracker —{" "}
                    {
                      annualStats.yearNum
                    }
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Complete yearly leave usage,
                    balance and approval history
                  </p>

                </div>

              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700">
                Annual Paid Entitlement:{" "}
                {
                  annualStats.annualEntitlement
                }{" "}
                Days
              </div>

            </div>

            {/* ANNUAL MAIN STATS */}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">

                <p className="text-[11px] font-semibold text-slate-500">
                  Paid Used
                </p>

                <p className="mt-1 text-xl font-bold text-indigo-600">
                  {
                    annualStats.paidUsed
                  }
                </p>

                <p className="mt-0.5 text-[10px] text-slate-400">
                  of{" "}
                  {
                    annualStats.annualEntitlement
                  }{" "}
                  days
                </p>

              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">

                <p className="text-[11px] font-semibold text-slate-500">
                  Paid Remaining
                </p>

                <p className="mt-1 text-xl font-bold text-emerald-600">
                  {
                    annualStats.paidRemaining
                  }
                </p>

                <p className="mt-0.5 text-[10px] text-slate-400">
                  days available
                </p>

              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                <p className="text-[11px] font-semibold text-slate-500">
                  Total Approved
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {
                    annualStats.totalApprovedDays
                  }
                </p>

                <p className="mt-0.5 text-[10px] text-slate-400">
                  leave days
                </p>

              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">

                <p className="text-[11px] font-semibold text-slate-500">
                  Pending Days
                </p>

                <p className="mt-1 text-xl font-bold text-blue-600">
                  {
                    annualStats.pendingDays
                  }
                </p>

                <p className="mt-0.5 text-[10px] text-slate-400">
                  {
                    annualStats.pendingRequests
                  }{" "}
                  request(s)
                </p>

              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">

                <p className="text-[11px] font-semibold text-slate-500">
                  Emergency Paid
                </p>

                <p className="mt-1 text-xl font-bold text-emerald-700">
                  {
                    annualStats.emergencyPaidDays
                  }
                </p>

                <p className="mt-0.5 text-[10px] text-slate-400">
                  days
                </p>

              </div>

              <div className="rounded-xl border border-red-100 bg-red-50/60 p-4">

                <p className="text-[11px] font-semibold text-slate-500">
                  LOP
                </p>

                <p className="mt-1 text-xl font-bold text-red-600">
                  {
                    annualStats.lopDays
                  }
                </p>

                <p className="mt-0.5 text-[10px] text-slate-400">
                  unpaid days
                </p>

              </div>

              <div className="rounded-xl border border-emerald-100 bg-white p-4">

                <p className="text-[11px] font-semibold text-slate-500">
                  Approved Requests
                </p>

                <p className="mt-1 text-xl font-bold text-emerald-700">
                  {
                    annualStats.approvedRequests
                  }
                </p>

              </div>

              <div className="rounded-xl border border-red-100 bg-white p-4">

                <p className="text-[11px] font-semibold text-slate-500">
                  Rejected Requests
                </p>

                <p className="mt-1 text-xl font-bold text-red-600">
                  {
                    annualStats.rejectedRequests
                  }
                </p>

              </div>

            </div>

            {/* =====================================
                LEAVE TYPE BREAKDOWN
            ===================================== */}

            <div className="mt-5 border-t border-slate-100 pt-4">

              <h3 className="mb-3 text-xs font-bold text-slate-700">
                Leave Type Breakdown
              </h3>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">

                <div className="rounded-xl bg-slate-50 p-3">

                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Sick
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-800">
                    {
                      annualStats.sickDays
                    }
                  </p>

                </div>

                <div className="rounded-xl bg-slate-50 p-3">

                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Casual
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-800">
                    {
                      annualStats.casualDays
                    }
                  </p>

                </div>

                <div className="rounded-xl bg-slate-50 p-3">

                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Annual
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-800">
                    {
                      annualStats.annualDays
                    }
                  </p>

                </div>

                <div className="rounded-xl bg-slate-50 p-3">

                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Wellness Leave
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-800">
                    {
                      annualStats.wellnessDays
                    }
                  </p>

                </div>

                <div className="rounded-xl bg-slate-50 p-3">

                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Half Day
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-800">
                    {
                      annualStats.halfDays
                    }
                  </p>

                </div>

                <div className="rounded-xl bg-slate-50 p-3">

                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Comp Off
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-800">
                    {
                      annualStats.compensatoryDays
                    }
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>

      )}

      {/* =================================================
          ADMIN PORTAL
      ================================================= */}

      {isAdmin && (

        <div className="space-y-4">

          {/* FILTERS */}

          <div className="card p-4">

            <div className="mb-4 flex items-center gap-2">

              <Filter
                size={
                  18
                }
                className="text-slate-500"
              />

              <h2 className="text-sm font-semibold text-slate-900">
                Filter & Generate Employee Monthly Report
              </h2>

            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">

              <select
                value={
                  filterEmployeeId
                }
                onChange={(event) =>
                  setFilterEmployeeId(
                    event.target.value
                  )
                }
                className="text-xs"
              >

                <option value="">
                  All Employees
                </option>

                {employees.map(
                  (employee) => (

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
                    </option>

                  )
                )}

              </select>

              <select
                value={
                  filterMonth
                }
                onChange={(event) =>
                  setFilterMonth(
                    event.target.value
                  )
                }
                className="text-xs"
              >

                <option value="">
                  All Months
                </option>

                {Array.from(
                  {
                    length: 12,
                  },
                  (
                    _,
                    index
                  ) =>
                    index + 1
                ).map((month) => (

                  <option
                    key={
                      month
                    }
                    value={
                      month
                    }
                  >
                    {new Date(
                      2000,
                      month - 1
                    ).toLocaleString(
                      "en-IN",
                      {
                        month:
                          "long",
                      }
                    )}
                  </option>

                ))}

              </select>

              <select
                value={
                  filterYear
                }
                onChange={(event) =>
                  setFilterYear(
                    event.target.value
                  )
                }
                className="text-xs"
              >

                {availableYears.map(
                  (year) => (

                    <option
                      key={
                        year
                      }
                      value={
                        year
                      }
                    >
                      {
                        year
                      }
                    </option>

                  )
                )}

              </select>

              <select
                value={
                  filterStatus
                }
                onChange={(event) =>
                  setFilterStatus(
                    event.target.value
                  )
                }
                className="text-xs"
              >

                <option value="">
                  All Status
                </option>

                <option value="PENDING">
                  Pending
                </option>

                <option value="APPROVED">
                  Approved
                </option>

                <option value="REJECTED">
                  Rejected
                </option>

              </select>

            </div>

          </div>

          {/* ADMIN MONTHLY EMPLOYEE REPORT */}

          {selectedEmployeeObj && (

            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/90 p-5 shadow-xs">

              <div className="flex flex-col justify-between gap-4 border-b border-indigo-100 pb-3 sm:flex-row sm:items-center">

                <div className="flex items-center gap-3">

                  <div className="rounded-xl bg-indigo-600 p-2.5 text-white">
                    <UserCheck
                      size={
                        20
                      }
                    />
                  </div>

                  <div>

                    <h3 className="text-sm font-bold text-slate-900">
                      Monthly Report —{" "}
                      {
                        selectedEmployeeObj.firstName
                      }{" "}
                      {
                        selectedEmployeeObj.lastName
                      }
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-500">

                      {selectedEmployeeObj.position ||
                        "Employee"}

                      {" • "}

                      {
                        monthlyStats.monthName
                      }{" "}
                      {
                        monthlyStats.yearNum
                      }

                    </p>

                  </div>

                </div>

                <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700">

                  <Calendar
                    size={
                      14
                    }
                  />

                  <span>
                    Quota Limit: 3 Paid Leaves / Month
                  </span>

                </div>

              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 lg:grid-cols-7">

                <div className="rounded-xl border border-slate-200 bg-white p-3">

                  <p className="text-[11px] font-semibold text-slate-500">
                    Total Approved
                  </p>

                  <p className="mt-0.5 text-lg font-bold text-slate-900">
                    {
                      monthlyStats.totalApprovedDays
                    }

                    <span className="ml-1 text-[10px] font-normal text-slate-400">
                      days
                    </span>
                  </p>

                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">

                  <p className="text-[11px] font-semibold text-slate-500">
                    Paid Quota Used
                  </p>

                  <p className="mt-0.5 text-lg font-bold text-indigo-600">
                    {
                      monthlyStats.quotaPaidUsed
                    }{" "}
                    / 3
                  </p>

                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">

                  <p className="text-[11px] font-semibold text-slate-500">
                    Paid Remaining
                  </p>

                  <p className="mt-0.5 text-lg font-bold text-emerald-600">
                    {
                      monthlyStats.quotaPaidRemaining
                    }{" "}
                    / 3
                  </p>

                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">

                  <p className="text-[11px] font-semibold text-slate-500">
                    Emergency Paid
                  </p>

                  <p className="mt-0.5 text-lg font-bold text-emerald-600">
                    {
                      monthlyStats.emergencyPaidDays
                    }

                    <span className="ml-1 text-[10px] font-normal text-slate-400">
                      days
                    </span>
                  </p>

                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">

                  <p className="text-[11px] font-semibold text-slate-500">
                    LOP
                  </p>

                  <p className="mt-0.5 text-lg font-bold text-red-600">
                    {
                      monthlyStats.lopDays
                    }

                    <span className="ml-1 text-[10px] font-normal text-slate-400">
                      days
                    </span>
                  </p>

                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">

                  <p className="text-[11px] font-semibold text-slate-500">
                    Pending
                  </p>

                  <p className="mt-0.5 text-lg font-bold text-blue-600">
                    {
                      monthlyStats.pendingCount
                    }
                  </p>

                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">

                  <p className="text-[11px] font-semibold text-slate-500">
                    Rejected
                  </p>

                  <p className="mt-0.5 text-lg font-bold text-red-600">
                    {
                      monthlyStats.rejectedCount
                    }
                  </p>

                </div>

              </div>

            </div>

          )}

        </div>

      )}

      {/* =================================================
          LEAVE HISTORY
      ================================================= */}

      <LeaveHistory
        leaves={
          filteredLeaves
        }
        isAdmin={
          isAdmin
        }
        onUpdate={
          fetchLeaves
        }
      />

      {/* =================================================
          APPLY LEAVE MODAL
      ================================================= */}

      <ApplyLeaveModal
        open={
          showModal
        }
        onClose={() =>
          setShowModal(
            false
          )
        }
        onSuccess={
          fetchLeaves
        }
        leaves={
          leaves
        }
      />

    </div>
  );
};

export default Leave;