import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  PlusIcon,
  Download,
  Filter,
  Info,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  UserCheck,
} from "lucide-react";

import * as XLSX from "xlsx";

import Loading from "../components/Loading";
import LeaveHistory from "../components/leave/LeaveHistory";
import ApplyLeaveModal from "../components/leave/ApplyLeaveModal";
import DocumentAttachment from "../components/leave/DocumentAttachment";

import {
  useAuth,
} from "../context/AuthContext";

import api from "../api/axios";
import toast from "react-hot-toast";

// ============================================================
// CONSTANTS
// ============================================================

const MONTHLY_PAID_LEAVE_LIMIT =
  3;

const currentDate =
  new Date();

// ============================================================
// GET LEAVE DAYS
// ============================================================

const getLeaveDays = (
  leave
) => {
  if (
    leave.type ===
    "HALF_DAY"
  ) {
    return 0.5;
  }

  const start =
    new Date(
      leave.startDate
    );

  const end =
    new Date(
      leave.endDate
    );

  if (
    Number.isNaN(
      start.getTime()
    ) ||
    Number.isNaN(
      end.getTime()
    )
  ) {
    return 0;
  }

  const diffDays =
    Math.round(
      (
        end.getTime() -
        start.getTime()
      ) /
      (
        1000 *
        60 *
        60 *
        24
      )
    ) + 1;

  return diffDays;
};

// ============================================================
// MONTHLY STATS
// ============================================================

const calculateMonthlyStats =
  (
    leavesList,
    selectedMonth,
    selectedYear
  ) => {
    const monthNum =
      selectedMonth
        ? Number(
          selectedMonth
        )
        : currentDate.getMonth() +
        1;

    const yearNum =
      selectedYear
        ? Number(
          selectedYear
        )
        : currentDate.getFullYear();

    // ========================================================
    // FILTER SELECTED MONTH
    // ========================================================

    const monthLeaves =
      leavesList.filter(
        (
          leave
        ) => {
          if (
            !leave.startDate
          ) {
            return false;
          }

          const d =
            new Date(
              leave.startDate
            );

          return (
            d.getMonth() +
            1 ===
            monthNum &&
            d.getFullYear() ===
            yearNum
          );
        }
      );

    const approvedLeaves =
      monthLeaves.filter(
        (
          leave
        ) =>
          leave.status ===
          "APPROVED"
      );

    const pendingLeaves =
      monthLeaves.filter(
        (
          leave
        ) =>
          leave.status ===
          "PENDING"
      );

    let totalApprovedDays =
      0;

    let paidApprovedDays =
      0;

    let lopDays =
      0;

    let compensatoryDays =
      0;

    approvedLeaves.forEach(
      (
        leave
      ) => {
        const days =
          getLeaveDays(
            leave
          );

        totalApprovedDays +=
          days;

        // COMPENSATORY LEAVE
        if (
          leave.type ===
          "COMPENSATORY"
        ) {
          compensatoryDays +=
            days;

          return;
        }

        // LOSS OF PAY
        if (
          leave.isLop ||
          leave.paymentType ===
          "UNPAID"
        ) {
          lopDays +=
            days;

          return;
        }

        // NORMAL PAID LEAVE
        paidApprovedDays +=
          days;
      }
    );

    // ========================================================
    // PAID LEAVE USED
    //
    // Employee has max 3 days in paid monthly pocket.
    // ========================================================

    const quotaPaidUsed =
      Math.min(
        MONTHLY_PAID_LEAVE_LIMIT,
        paidApprovedDays
      );

    // ========================================================
    // PAID LEAVE REMAINING
    // ========================================================

    const quotaPaidRemaining =
      Math.max(
        0,

        MONTHLY_PAID_LEAVE_LIMIT -
        quotaPaidUsed
      );

    // ========================================================
    // EXTRA DAYS
    //
    // IMPORTANT:
    //
    // Extra Days DOES NOT automatically mean LOP.
    //
    // It only tells how many approved non-compensatory leave
    // days crossed the normal 3-day monthly allowance.
    //
    // Admin separately decides LOP.
    // ========================================================

    const quotaRelevantApprovedDays =
      paidApprovedDays +
      lopDays;

    const extraDaysTaken =
      Math.max(
        0,

        quotaRelevantApprovedDays -
        MONTHLY_PAID_LEAVE_LIMIT
      );

    return {
      monthName:
        new Date(
          2000,
          monthNum - 1
        ).toLocaleString(
          "en-IN",
          {
            month:
              "long",
          }
        ),

      yearNum,

      totalApprovedDays,

      paidApprovedDays,

      quotaPaidUsed,

      quotaPaidRemaining,

      extraDaysTaken,

      lopDays,

      compensatoryDays,

      pendingCount:
        pendingLeaves.length,

      approvedCount:
        approvedLeaves.length,

      totalRequests:
        monthLeaves.length,
    };
  };

// ============================================================
// YEARLY STATS
// ============================================================

const calculateYearlyStats =
  (
    leavesList,
    selectedYear
  ) => {
    const yearNum =
      selectedYear
        ? Number(
          selectedYear
        )
        : currentDate.getFullYear();

    const yearLeaves =
      leavesList.filter(
        (
          leave
        ) => {
          if (
            !leave.startDate
          ) {
            return false;
          }

          return (
            new Date(
              leave.startDate
            ).getFullYear() ===
            yearNum
          );
        }
      );

    const approvedLeaves =
      yearLeaves.filter(
        (
          leave
        ) =>
          leave.status ===
          "APPROVED"
      );

    const pendingLeaves =
      yearLeaves.filter(
        (
          leave
        ) =>
          leave.status ===
          "PENDING"
      );

    const rejectedLeaves =
      yearLeaves.filter(
        (
          leave
        ) =>
          leave.status ===
          "REJECTED"
      );

    let approvedDays =
      0;

    let paidDays =
      0;

    let lopDays =
      0;

    let compensatoryDays =
      0;

    approvedLeaves.forEach(
      (
        leave
      ) => {
        const days =
          getLeaveDays(
            leave
          );

        approvedDays +=
          days;

        if (
          leave.type ===
          "COMPENSATORY"
        ) {
          compensatoryDays +=
            days;

          return;
        }

        if (
          leave.isLop ||
          leave.paymentType ===
          "UNPAID"
        ) {
          lopDays +=
            days;

          return;
        }

        paidDays +=
          days;
      }
    );

    return {
      yearNum,

      totalRequests:
        yearLeaves.length,

      approvedCount:
        approvedLeaves.length,

      approvedDays,

      paidDays,

      lopDays,

      compensatoryDays,

      pendingCount:
        pendingLeaves.length,

      rejectedCount:
        rejectedLeaves.length,
    };
  };

// ============================================================
// COMPONENT
// ============================================================

const Leave = () => {
  const {
    user,
  } =
    useAuth();

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    leaves,
    setLeaves,
  ] =
    useState([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    showModal,
    setShowModal,
  ] =
    useState(false);

  const [
    isDeleted,
    setIsDeleted,
  ] =
    useState(false);


  const [
    employeeGender,
    setEmployeeGender,
  ] =
    useState("");

  const [
    documents,
    setDocuments,
  ] =
    useState({
      HOLIDAY_LIST:
        null,

      LEAVE_POLICY:
        null,
    });

  const isAdmin =
    user?.role ===
    "ADMIN";

  const [
    employees,
    setEmployees,
  ] =
    useState([]);

  // ==========================================================
  // FILTERS
  // ==========================================================

  const [
    filterEmployeeId,
    setFilterEmployeeId,
  ] =
    useState("");

  const [
    filterMonth,
    setFilterMonth,
  ] =
    useState(
      String(
        currentDate.getMonth() +
        1
      )
    );

  const [
    filterYear,
    setFilterYear,
  ] =
    useState(
      String(
        currentDate.getFullYear()
      )
    );

  const [
    filterStatus,
    setFilterStatus,
  ] =
    useState("");

  // Existing search functionality/state retained.
  const [
    search,
  ] =
    useState("");

  // ==========================================================
  // FETCH LEAVES
  // ==========================================================

  const fetchLeaves =
    useCallback(
      async () => {
        try {
          const params =
            {};

          // Admin filters are sent to backend.
          if (
            isAdmin
          ) {
            if (
              filterEmployeeId
            ) {
              params.employeeId =
                filterEmployeeId;
            }

            if (
              filterMonth
            ) {
              params.month =
                filterMonth;
            }

            if (
              filterYear
            ) {
              params.year =
                filterYear;
            }

            if (
              filterStatus
            ) {
              params.status =
                filterStatus;
            }
          }

          const res =
            await api.get(
              "/leave",
              {
                params,
              }
            );

          setLeaves(
            res.data
              .data ||
            []
          );
          if (!isAdmin) {
            setEmployeeGender(
              res.data
                ?.employee
                ?.gender ||
              ""
            );
          }

          if (
            res.data
              .employee
              ?.isDeleted
          ) {
            setIsDeleted(
              true
            );
          } else {
            setIsDeleted(
              false
            );
          }
        } catch (
        error
        ) {
          toast.error(
            error
              ?.response
              ?.data
              ?.error ||
            error.message
          );
        } finally {
          setLoading(
            false
          );
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

  // ==========================================================
  // FETCH DOCUMENTS
  // ==========================================================

  const fetchDocuments =
    useCallback(
      async () => {
        try {
          const res =
            await api.get(
              "/documents"
            );

          setDocuments(
            res.data
          );
        } catch (
        error
        ) {
          console.error(
            "Leave document fetch error:",
            error
          );
        }
      },
      []
    );

  // ==========================================================
  // INITIAL LOAD / REFRESH
  // ==========================================================

  useEffect(
    () => {
      fetchLeaves();
    },
    [
      fetchLeaves,
    ]
  );

  useEffect(
    () => {
      fetchDocuments();
    },
    [
      fetchDocuments,
    ]
  );

  // ==========================================================
  // FETCH EMPLOYEES FOR ADMIN FILTER
  // ==========================================================

  useEffect(
    () => {
      if (
        !isAdmin
      ) {
        return;
      }

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
                : [];

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
          (
            error
          ) => {
            console.error(
              "Fetch employees for leave filter error:",
              error
            );
          }
        );
    },
    [
      isAdmin,
    ]
  );

  // ==========================================================
  // LOCAL SEARCH FILTER
  // ==========================================================

  const filteredLeaves =
    useMemo(
      () => {
        if (
          !isAdmin ||
          !search.trim()
        ) {
          return leaves;
        }

        const value =
          search.toLowerCase();

        return leaves.filter(
          (
            leave
          ) => {
            const employeeName =
              `${leave
                .employee
                ?.firstName ||
                ""
                } ${leave
                  .employee
                  ?.lastName ||
                ""
                }`.toLowerCase();

            return (
              employeeName.includes(
                value
              ) ||
              leave.reason
                ?.toLowerCase()
                .includes(
                  value
                ) ||
              leave.type
                ?.toLowerCase()
                .includes(
                  value
                )
            );
          }
        );
      },
      [
        leaves,
        search,
        isAdmin,
      ]
    );

  // ==========================================================
  // AVAILABLE YEARS
  // ==========================================================

  const availableYears =
    Array.from(
      {
        length:
          6,
      },

      (
        _,
        index
      ) =>
        currentDate.getFullYear() -
        index
    );

  // ==========================================================
  // SELECTED ADMIN EMPLOYEE
  // ==========================================================

  const selectedEmployeeObj =
    useMemo(
      () => {
        if (
          !isAdmin ||
          !filterEmployeeId
        ) {
          return null;
        }

        return employees.find(
          (
            employee
          ) =>
            String(
              employee._id ||
              employee.id
            ) ===
            String(
              filterEmployeeId
            )
        );
      },
      [
        isAdmin,
        filterEmployeeId,
        employees,
      ]
    );

  // ==========================================================
  // MONTHLY STATISTICS
  // ==========================================================

  const monthlyStats =
    useMemo(
      () =>
        calculateMonthlyStats(
          filteredLeaves,
          filterMonth,
          filterYear
        ),
      [
        filteredLeaves,
        filterMonth,
        filterYear,
      ]
    );

  // ==========================================================
  // YEARLY STATISTICS
  // ==========================================================

  const yearlyStats =
    useMemo(
      () =>
        calculateYearlyStats(
          filteredLeaves,
          filterYear
        ),
      [
        filteredLeaves,
        filterYear,
      ]
    );

  // ==========================================================
  // EXPORT LEAVE REPORT
  // ==========================================================

  const exportLeaves =
    () => {
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
          (
            leave
          ) => ({
            Employee:
              `${leave
                .employee
                ?.firstName ||
                ""
                } ${leave
                  .employee
                  ?.lastName ||
                ""
                }`.trim(),

            Type:
              leave.type
                ?.replaceAll(
                  "_",
                  " "
                ) ||
              "",

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
                ? leave.halfDayPeriod.replaceAll(
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

            "Payment Decision":
              leave.status !==
                "APPROVED"
                ? "-"
                : leave.isLop ||
                  leave.paymentType ===
                  "UNPAID"
                  ? "LOSS OF PAY"
                  : "PAID",

            Reason:
              leave.reason ||
              "",

            "Admin Remark":
              leave.adminRemark ||
              "",

            Status:
              leave.status,
          })
        );

      const worksheet =
        XLSX.utils.json_to_sheet(
          rows
        );

      worksheet[
        "!cols"
      ] =
        Object.keys(
          rows[0]
        ).map(
          (
            key
          ) => ({
            wch:
              Math.max(
                key.length,
                16
              ),
          })
        );

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

      if (
        filterStatus
      ) {
        parts.push(
          filterStatus.toLowerCase()
        );
      }

      if (
        filterMonth
      ) {
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
                month:
                  "short",
              }
            )
            .toLowerCase()
        );
      }

      if (
        filterYear
      ) {
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

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading
  ) {
    return (
      <Loading />
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="animate-fade-in space-y-6">
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">
            Leave
            Management
          </h1>

          <p className="page-subtitle">
            {isAdmin
              ? "Manage leave applications and employee monthly reports"
              : "Your monthly leave tracker and history"}
          </p>
        </div>

        {/* EMPLOYEE APPLY */}

        {!isAdmin &&
          !isDeleted && (
            <button
              onClick={() =>
                setShowModal(
                  true
                )
              }
              className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <PlusIcon className="w-4 h-4" />

              Apply
              for
              Leave
            </button>
          )}

        {/* ADMIN DOWNLOAD */}

        {isAdmin && (
          <button
            onClick={
              exportLeaves
            }
            className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto"
            type="button"
          >
            <Download className="w-4 h-4" />

            Download
          </button>
        )}
      </div>

      {/* =====================================================
          HOLIDAY LIST + LEAVE POLICY
      ===================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* =====================================================
          CLIENT LOCATION NOTE
      ===================================================== */}

      <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 shadow-xs">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />

        <p className="leading-relaxed">
          <strong className="font-semibold text-amber-950">
            Engineers
            working
            in
            client
            location:
          </strong>{" "}

          Leaves
          and
          holidays
          for
          on-site
          /
          client-deployed
          employees
          are
          applicable
          as
          per
          the
          respective
          client's
          location
          guidelines
          and
          project
          schedule.
        </p>
      </div>

      {/* =====================================================
          EMPLOYEE MONTHLY SUMMARY
      ===================================================== */}

      {!isAdmin && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          {/* HEADER */}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                <Calendar
                  size={
                    20
                  }
                />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Monthly
                  Leave
                  Summary
                </h2>

                <p className="text-xs text-slate-500 mt-0.5">
                  {
                    monthlyStats.monthName
                  }{" "}
                  {
                    monthlyStats.yearNum
                  }

                  {" • "}

                  Paid
                  leave
                  allowance:{" "}

                  {
                    MONTHLY_PAID_LEAVE_LIMIT
                  }{" "}
                  days
                </p>
              </div>
            </div>

            {/* MONTH + YEAR */}

            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={
                  filterMonth
                }
                onChange={(
                  e
                ) =>
                  setFilterMonth(
                    e
                      .target
                      .value
                  )
                }
                className="min-w-[170px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              >
                {Array.from(
                  {
                    length:
                      12,
                  },

                  (
                    _,
                    index
                  ) =>
                    index +
                    1
                ).map(
                  (
                    month
                  ) => (
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
                        month -
                        1
                      ).toLocaleString(
                        "en-IN",
                        {
                          month:
                            "long",
                        }
                      )}
                    </option>
                  )
                )}
              </select>

              <select
                value={
                  filterYear
                }
                onChange={(
                  e
                ) =>
                  setFilterYear(
                    e
                      .target
                      .value
                  )
                }
                className="min-w-[120px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              >
                {availableYears.map(
                  (
                    year
                  ) => (
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

          {/* =================================================
              MONTHLY CARDS
          ================================================= */}

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mt-5">
            {/* PAID REMAINING */}

            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Paid
                    Leave
                    Remaining
                  </p>

                  <p className="text-xl font-bold text-emerald-600 mt-2">
                    {
                      monthlyStats.quotaPaidRemaining
                    }

                    <span className="text-xs font-medium text-slate-400 ml-1">
                      /{" "}
                      {
                        MONTHLY_PAID_LEAVE_LIMIT
                      }
                    </span>
                  </p>
                </div>

                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                  <CheckCircle2
                    size={
                      18
                    }
                  />
                </div>
              </div>
            </div>

            {/* PAID USED */}

            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Paid
                    Leave
                    Used
                  </p>

                  <p className="text-xl font-bold text-indigo-600 mt-2">
                    {
                      monthlyStats.quotaPaidUsed
                    }

                    <span className="text-xs font-medium text-slate-400 ml-1">
                      /{" "}
                      {
                        MONTHLY_PAID_LEAVE_LIMIT
                      }
                    </span>
                  </p>
                </div>

                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                  <Calendar
                    size={
                      18
                    }
                  />
                </div>
              </div>
            </div>

            {/* EXTRA DAYS */}

            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Extra
                    Days
                    Taken
                  </p>

                  <p className="text-xl font-bold text-amber-700 mt-2">
                    {
                      monthlyStats.extraDaysTaken
                    }

                    <span className="text-xs font-medium text-slate-400 ml-1">
                      days
                    </span>
                  </p>
                </div>

                <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                  <AlertTriangle
                    size={
                      18
                    }
                  />
                </div>
              </div>
            </div>

            {/* LOP */}

            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    LOP
                    (Loss
                    of
                    Pay)
                  </p>

                  <p className="text-xl font-bold text-red-600 mt-2">
                    {
                      monthlyStats.lopDays
                    }

                    <span className="text-xs font-medium text-slate-400 ml-1">
                      days
                    </span>
                  </p>
                </div>

                <div className="p-2 rounded-lg bg-red-100 text-red-600">
                  <DollarSign
                    size={
                      18
                    }
                  />
                </div>
              </div>
            </div>

            {/* PENDING */}

            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Pending
                    Requests
                  </p>

                  <p className="text-xl font-bold text-blue-600 mt-2">
                    {
                      monthlyStats.pendingCount
                    }

                    <span className="text-xs font-medium text-slate-400 ml-1">
                      request(s)
                    </span>
                  </p>
                </div>

                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <AlertTriangle
                    size={
                      18
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          EMPLOYEE YEARLY SUMMARY
      ===================================================== */}

      {!isAdmin && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Yearly
                Leave
                Summary
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Overall
                leave
                usage
                for{" "}
                {
                  yearlyStats.yearNum
                }
              </p>
            </div>

            <select
              value={
                filterYear
              }
              onChange={(
                e
              ) =>
                setFilterYear(
                  e
                    .target
                    .value
                )
              }
              className="min-w-[120px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
            >
              {availableYears.map(
                (
                  year
                ) => (
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

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mt-5">
            {/* TOTAL REQUESTS */}

            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500">
                Total
                Requests
              </p>

              <p className="text-xl font-bold text-slate-900 mt-2">
                {
                  yearlyStats.totalRequests
                }
              </p>
            </div>

            {/* APPROVED */}

            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500">
                Approved
                Leave
              </p>

              <p className="text-xl font-bold text-emerald-700 mt-2">
                {
                  yearlyStats.approvedDays
                }

                <span className="text-xs font-medium text-slate-400 ml-1">
                  days
                </span>
              </p>
            </div>

            {/* PAID */}

            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500">
                Paid
                Leave
              </p>

              <p className="text-xl font-bold text-indigo-600 mt-2">
                {
                  yearlyStats.paidDays
                }

                <span className="text-xs font-medium text-slate-400 ml-1">
                  days
                </span>
              </p>
            </div>

            {/* LOP */}

            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500">
                Loss
                of
                Pay
              </p>

              <p className="text-xl font-bold text-red-600 mt-2">
                {
                  yearlyStats.lopDays
                }

                <span className="text-xs font-medium text-slate-400 ml-1">
                  days
                </span>
              </p>
            </div>

            {/* PENDING */}

            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500">
                Pending
                Requests
              </p>

              <p className="text-xl font-bold text-blue-600 mt-2">
                {
                  yearlyStats.pendingCount
                }
              </p>
            </div>

            {/* REJECTED */}

            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500">
                Rejected
                Requests
              </p>

              <p className="text-xl font-bold text-red-500 mt-2">
                {
                  yearlyStats.rejectedCount
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          ADMIN FILTERS
      ===================================================== */}

      {isAdmin && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter
                size={
                  18
                }
                className="text-slate-500"
              />

              <h2 className="text-sm font-semibold text-slate-900">
                Filter
                &
                Generate
                Employee
                Monthly
                Report
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* EMPLOYEE */}

              <select
                value={
                  filterEmployeeId
                }
                onChange={(
                  e
                ) =>
                  setFilterEmployeeId(
                    e
                      .target
                      .value
                  )
                }
                className="text-xs"
              >
                <option value="">
                  All
                  Employees
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
                    </option>
                  )
                )}
              </select>

              {/* MONTH */}

              <select
                value={
                  filterMonth
                }
                onChange={(
                  e
                ) =>
                  setFilterMonth(
                    e
                      .target
                      .value
                  )
                }
                className="text-xs"
              >
                <option value="">
                  All
                  Months
                </option>

                {Array.from(
                  {
                    length:
                      12,
                  },

                  (
                    _,
                    index
                  ) =>
                    index +
                    1
                ).map(
                  (
                    month
                  ) => (
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
                        month -
                        1
                      ).toLocaleString(
                        "en-IN",
                        {
                          month:
                            "long",
                        }
                      )}
                    </option>
                  )
                )}
              </select>

              {/* YEAR */}

              <select
                value={
                  filterYear
                }
                onChange={(
                  e
                ) =>
                  setFilterYear(
                    e
                      .target
                      .value
                  )
                }
                className="text-xs"
              >
                {availableYears.map(
                  (
                    year
                  ) => (
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

              {/* STATUS */}

              <select
                value={
                  filterStatus
                }
                onChange={(
                  e
                ) =>
                  setFilterStatus(
                    e
                      .target
                      .value
                  )
                }
                className="text-xs"
              >
                <option value="">
                  All
                  Status
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

          {/* =================================================
              ADMIN SELECTED EMPLOYEE REPORT
          ================================================= */}

          {selectedEmployeeObj && (
            <div className="bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/90 border border-indigo-100 rounded-2xl p-5 shadow-xs">
              {/* REPORT HEADER */}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-indigo-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
                    <UserCheck
                      size={
                        20
                      }
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Monthly
                      Report
                      —{" "}
                      {
                        selectedEmployeeObj.firstName
                      }{" "}
                      {
                        selectedEmployeeObj.lastName
                      }
                    </h3>

                    <p className="text-xs text-slate-500 mt-0.5">
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

                <div className="flex items-center gap-2 bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-indigo-700">
                  <Calendar
                    size={
                      14
                    }
                  />

                  <span>
                    Quota
                    Limit:{" "}
                    {
                      MONTHLY_PAID_LEAVE_LIMIT
                    }{" "}
                    Paid
                    Leaves
                    /
                    Month
                  </span>
                </div>
              </div>

              {/* =================================================
                  ADMIN REPORT CARDS

                  Existing report kept and expanded.
              ================================================= */}

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 text-xs">
                {/* TOTAL APPROVED */}

                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <p className="text-slate-500 font-semibold text-[11px]">
                    Total
                    Approved
                  </p>

                  <p className="text-lg font-bold text-slate-900 mt-0.5">
                    {
                      monthlyStats.totalApprovedDays
                    }

                    <span className="text-[10px] font-normal text-slate-400 ml-1">
                      days
                    </span>
                  </p>
                </div>

                {/* PAID REMAINING */}

                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <p className="text-slate-500 font-semibold text-[11px]">
                    Paid
                    Remaining
                  </p>

                  <p className="text-lg font-bold text-emerald-600 mt-0.5">
                    {
                      monthlyStats.quotaPaidRemaining
                    }{" "}

                    /{" "}

                    {
                      MONTHLY_PAID_LEAVE_LIMIT
                    }
                  </p>
                </div>

                {/* PAID USED */}

                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <p className="text-slate-500 font-semibold text-[11px]">
                    Paid
                    Quota
                    Used
                  </p>

                  <p className="text-lg font-bold text-indigo-600 mt-0.5">
                    {
                      monthlyStats.quotaPaidUsed
                    }{" "}

                    /{" "}

                    {
                      MONTHLY_PAID_LEAVE_LIMIT
                    }
                  </p>
                </div>

                {/* EXTRA */}

                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <p className="text-slate-500 font-semibold text-[11px]">
                    Extra
                    Days
                  </p>

                  <p className="text-lg font-bold text-amber-600 mt-0.5">
                    {
                      monthlyStats.extraDaysTaken
                    }

                    <span className="text-[10px] font-normal text-slate-400 ml-1">
                      days
                    </span>
                  </p>
                </div>

                {/* LOP */}

                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <p className="text-slate-500 font-semibold text-[11px]">
                    LOP
                    (Unpaid)
                  </p>

                  <p className="text-lg font-bold text-red-600 mt-0.5">
                    {
                      monthlyStats.lopDays
                    }

                    <span className="text-[10px] font-normal text-slate-400 ml-1">
                      days
                    </span>
                  </p>
                </div>

                {/* PENDING */}

                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <p className="text-slate-500 font-semibold text-[11px]">
                    Pending
                  </p>

                  <p className="text-lg font-bold text-blue-600 mt-0.5">
                    {
                      monthlyStats.pendingCount
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          LEAVE HISTORY

          EXISTING FUNCTIONALITY RETAINED
      ===================================================== */}

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

      {/* =====================================================
          APPLY LEAVE MODAL

          Existing modal retained.
          Current leave list is passed so it can show the
          3-day paid-leave warning.
      ===================================================== */}

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
        employeeGender={
          employeeGender
        }
      />
    </div>
  );
};

export default Leave;