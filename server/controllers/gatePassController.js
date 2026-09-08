import mongoose from "mongoose";

import GatePass from "../models/GatePass.js";
import Employee from "../models/Employee.js";
import GatePassItemMaster from "../models/GatePassItemMaster.js";

// ============================================================
// AUTH HELPERS
// ============================================================

const getUserId = (req) =>
    req.user?._id ||
    req.user?.id ||
    req.user?.userId ||
    req.session?.userId;

const getUserRole = (req) =>
    (
        req.user?.role ||
        req.session?.role ||
        ""
    ).toUpperCase();

// ============================================================
// REGEX HELPER
// ============================================================

const escapeRegex = (value) =>
    String(value).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

// ============================================================
// NORMALIZE STRING
// ============================================================

const normalizeString = (value) =>
    String(value || "")
        .trim()
        .toLowerCase();

// ============================================================
// FIND LOGGED-IN EMPLOYEE
// ============================================================

const findLoggedInEmployee = async (
    req
) => {
    const userId =
        getUserId(req);

    if (!userId) {
        return null;
    }

    const orConditions = [
        {
            userId,
        },
    ];

    if (req.user?.email) {
        orConditions.push({
            email:
                req.user.email,
        });
    }

    return Employee.findOne({
        $or: orConditions,

        isDeleted: {
            $ne: true,
        },
    });
};

// ============================================================
// EMPLOYEE DISPLAY NAME
// ============================================================

const getEmployeeDisplayName = (
    employee
) => {
    if (!employee) {
        return "";
    }

    return `${employee.firstName || ""} ${
        employee.lastName || ""
    }`.trim();
};

// ============================================================
// EMPLOYEE DESIGNATION
//
// Your Employee model generally uses "position".
// "designation" is also checked for compatibility.
// ============================================================

const getEmployeeDesignation = (
    employee
) => {
    if (!employee) {
        return "";
    }

    return (
        employee.position ||
        employee.designation ||
        ""
    );
};

// ============================================================
// IS SYAM - MANAGER
//
// IMPORTANT:
//
// Actual required employee:
//      Name        -> Syam
//      Designation -> Manager
//
// We intentionally do NOT use "Shyam" here.
//
// Only that employee receives Gate Pass approval rights.
// ============================================================

const isSyamManager = (
    employee
) => {
    if (!employee) {
        return false;
    }

    const firstName =
        normalizeString(
            employee.firstName
        );

    const fullName =
        normalizeString(
            getEmployeeDisplayName(
                employee
            )
        );

    const designation =
        normalizeString(
            getEmployeeDesignation(
                employee
            )
        );

    const isSyam =
        firstName === "syam" ||
        fullName === "syam";

    const isManager =
        designation === "manager";

    return (
        isSyam &&
        isManager
    );
};

// ============================================================
// FIND THE ACTUAL SYAM MANAGER EMPLOYEE
//
// This is used whenever a new Gate Pass is sent for approval.
//
// We first search using likely indexed/normal fields and then
// verify using isSyamManager().
//
// This prevents some random "Syam" employee who is NOT Manager
// from becoming the Gate Pass approver.
// ============================================================

const findSyamManager = async () => {
    const candidates =
        await Employee.find({
            isDeleted: {
                $ne: true,
            },

            firstName: {
                $regex:
                    /^syam$/i,
            },
        });

    const syamManager =
        candidates.find(
            (employee) =>
                isSyamManager(
                    employee
                )
        );

    return (
        syamManager ||
        null
    );
};

// ============================================================
// ACCESS INFORMATION
// ============================================================

const getAccessInfo = async (
    req
) => {
    const role =
        getUserRole(req);

    const userId =
        getUserId(req);

    const employee =
        await findLoggedInEmployee(
            req
        );

    const isGatePassApprover =
        isSyamManager(
            employee
        );

    // Existing admin visibility remains.
    //
    // Syam can also view the Gate Passes so that his
    // Pending Approvals section can be populated.
    const canViewAll =
        role === "ADMIN" ||
        isGatePassApprover;

    return {
        role,
        userId,
        employee,
        canViewAll,
        isGatePassApprover,
    };
};

// ============================================================
// CAN PRINT
//
// Historical Gate Pass:
//      approvalRequired !== true
//      -> printable
//
// New Gate Pass:
//      must be APPROVED
// ============================================================

const getCanPrint = (
    gatePass
) => {
    if (
        gatePass?.approvalRequired !==
        true
    ) {
        return true;
    }

    return (
        String(
            gatePass?.approvalStatus ||
            ""
        ).toUpperCase() ===
        "APPROVED"
    );
};

// ============================================================
// CAN CURRENT EMPLOYEE APPROVE THIS PASS
// ============================================================

const getCanApprove = (
    gatePass,
    employee
) => {
    if (
        !gatePass ||
        !employee ||
        !isSyamManager(
            employee
        )
    ) {
        return false;
    }

    if (
        gatePass.approvalRequired !==
        true
    ) {
        return false;
    }

    if (
        String(
            gatePass.approvalStatus
        ).toUpperCase() !==
        "PENDING"
    ) {
        return false;
    }

    if (
        !gatePass.approverEmployeeId
    ) {
        return false;
    }

    return (
        String(
            gatePass.approverEmployeeId
        ) ===
        String(
            employee._id
        )
    );
};

// ============================================================
// NORMALIZE GATE PASS RESPONSE
//
// Frontend receives:
//      id
//      canPrint
//      canApprove
//      approvalStatus
//      approver info
// ============================================================

const normalizeGatePassForResponse = (
    gatePass,
    employee = null
) => {
    const plain =
        typeof gatePass?.toObject ===
        "function"
            ? gatePass.toObject()
            : {
                ...gatePass,
            };

    const id =
        plain?._id
            ? String(
                plain._id
            )
            : plain?.id
                ? String(
                    plain.id
                )
                : "";

    // Old historical Gate Passes should behave as approved
    // from the frontend's point of view.
    const frontendApprovalStatus =
        plain.approvalRequired ===
        true
            ? String(
                plain.approvalStatus ||
                "PENDING"
            ).toUpperCase()
            : "APPROVED";

    return {
        ...plain,

        id,

        approvalStatus:
            frontendApprovalStatus,

        canPrint:
            getCanPrint(
                plain
            ),

        canApprove:
            getCanApprove(
                plain,
                employee
            ),
    };
};

// ============================================================
// GET GATE PASS HISTORY
//
// ADMIN
//      -> all
//
// SYAM - MANAGER
//      -> all, including pending approval requests
//
// OTHER EMPLOYEES
//      -> only their own
//
// Frontend can use:
//
// response.data.isGatePassApprover
//
// to show:
//
//      Pending Approvals
//
// only in Syam's portal.
// ============================================================

export const getGatePasses = async (
    req,
    res
) => {
    try {
        const {
            userId,
            employee,
            canViewAll,
            isGatePassApprover,
        } =
            await getAccessInfo(
                req
            );

        if (!userId) {
            return res
                .status(401)
                .json({
                    error:
                        "User authentication failed. Please login again.",
                });
        }

        const query = {};

        if (!canViewAll) {
            const ownConditions =
                [
                    {
                        creatorUserId:
                            userId,
                    },
                ];

            if (
                employee?._id
            ) {
                ownConditions.push(
                    {
                        creatorEmployeeId:
                            employee._id,
                    }
                );
            }

            query.$or =
                ownConditions;
        }

        const gatePasses =
            await GatePass.find(
                query
            )
                .sort({
                    gatePassDate:
                        -1,

                    createdAt:
                        -1,
                })
                .lean();

        const data =
            gatePasses.map(
                (pass) =>
                    normalizeGatePassForResponse(
                        pass,
                        employee
                    )
            );

        // ====================================================
        // PENDING APPROVALS
        //
        // Returned only for Syam - Manager.
        //
        // This makes frontend implementation very easy:
        //
        // if (isGatePassApprover) {
        //     show pendingApprovals
        // }
        // ====================================================

        const pendingApprovals =
            isGatePassApprover
                ? data.filter(
                    (pass) =>
                        pass.approvalRequired ===
                            true &&
                        pass.approvalStatus ===
                            "PENDING" &&
                        String(
                            pass.approverEmployeeId
                        ) ===
                            String(
                                employee._id
                            )
                )
                : [];

        return res.json({
            success: true,

            canViewAll,

            isGatePassApprover,

            pendingApprovalCount:
                pendingApprovals.length,

            pendingApprovals,

            data,
        });
    } catch (error) {
        console.error(
            "Get Gate Passes Error:",
            error
        );

        return res
            .status(500)
            .json({
                error:
                    "Failed to fetch gate pass history",
            });
    }
};

// ============================================================
// GET ITEM DETAILS / UOM
//
// WH Part No. is the main lookup key.
//
// Example:
// GET /api/gate-passes/item-details?whPartNo=WH-CABLE-001
// ============================================================

export const getGatePassItemDetails =
    async (
        req,
        res
    ) => {
        try {
            const whPartNo =
                String(
                    req.query
                        .whPartNo ||
                    ""
                ).trim();

            if (!whPartNo) {
                return res.json({
                    success: true,
                    data: null,
                });
            }

            const item =
                await GatePassItemMaster.findOne(
                    {
                        whPartNo: {
                            $regex:
                                `^${escapeRegex(
                                    whPartNo
                                )}$`,

                            $options:
                                "i",
                        },

                        isActive: {
                            $ne: false,
                        },
                    }
                ).lean();

            return res.json({
                success: true,

                data:
                    item ||
                    null,
            });
        } catch (error) {
            console.error(
                "Get Gate Pass Item Details Error:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Failed to get item details",
                });
        }
    };

// ============================================================
// CREATE / UPDATE ITEM MASTER
//
// ADMIN ONLY
// ============================================================

export const saveGatePassItemMaster =
    async (
        req,
        res
    ) => {
        try {
            const role =
                getUserRole(
                    req
                );

            if (
                role !==
                "ADMIN"
            ) {
                return res
                    .status(403)
                    .json({
                        error:
                            "Only Admin can manage Gate Pass Item Master",
                    });
            }

            const {
                idNo,
                whPartNo,
                description,
                manufacturerPartNo,
                uom,
            } = req.body;

            const normalizedWhPartNo =
                String(
                    whPartNo ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            const normalizedUom =
                String(
                    uom ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            if (
                !normalizedWhPartNo
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "WH Part No. is required",
                    });
            }

            if (
                !normalizedUom
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "UOM is required",
                    });
            }

            const item =
                await GatePassItemMaster.findOneAndUpdate(
                    {
                        whPartNo:
                            normalizedWhPartNo,
                    },
                    {
                        $set: {
                            idNo:
                                String(
                                    idNo ||
                                    ""
                                ).trim(),

                            whPartNo:
                                normalizedWhPartNo,

                            description:
                                String(
                                    description ||
                                    ""
                                ).trim(),

                            manufacturerPartNo:
                                String(
                                    manufacturerPartNo ||
                                    ""
                                ).trim(),

                            uom:
                                normalizedUom,

                            isActive:
                                true,
                        },
                    },
                    {
                        new: true,
                        upsert: true,
                        runValidators:
                            true,
                        setDefaultsOnInsert:
                            true,
                    }
                );

            return res.json({
                success: true,

                data:
                    item,
            });
        } catch (error) {
            console.error(
                "Save Gate Pass Item Master Error:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        error.message ||
                        "Failed to save Item Master",
                });
        }
    };

// ============================================================
// RESOLVE UOM
//
// First checks the CURRENT WH Part No. in Item Master.
//
// Existing UOM is used only as a backward compatibility
// fallback.
// ============================================================

const resolveItemUom = async (
    item
) => {
    const partNo =
        String(
            item?.partNo ||
            ""
        ).trim();

    if (partNo) {
        const masterItem =
            await GatePassItemMaster.findOne(
                {
                    whPartNo: {
                        $regex:
                            `^${escapeRegex(
                                partNo
                            )}$`,

                        $options:
                            "i",
                    },

                    isActive: {
                        $ne: false,
                    },
                }
            ).lean();

        if (
            masterItem?.uom
        ) {
            return String(
                masterItem.uom
            )
                .trim()
                .toUpperCase();
        }

        // WH Part No. was entered but no matching
        // Item Master exists.
        return "";
    }

    // Old Gate Pass compatibility.
    if (
        String(
            item?.uom ||
            ""
        ).trim()
    ) {
        return String(
            item.uom
        )
            .trim()
            .toUpperCase();
    }

    return "";
};

// ============================================================
// CREATE / SEND GATE PASS TO SYAM
//
// THIS IS THE IMPORTANT NEW WORKFLOW.
//
// User fills your SAME existing Gate Pass form.
//
// When frontend clicks:
//
//      Send to Syam for Approval
//
// POST /gate-passes
//
// Backend:
//      1. Finds Syam - Manager
//      2. Saves Gate Pass
//      3. Sets status PENDING
//      4. Assigns it to Syam's Employee _id
//      5. DOES NOT approve
//
// Frontend must NOT call window.print() after this.
// ============================================================

export const createGatePass = async (
    req,
    res
) => {
    try {
        const {
            role,
            userId,
            employee,
            canViewAll,
            isGatePassApprover,
        } =
            await getAccessInfo(
                req
            );

        if (!userId) {
            return res
                .status(401)
                .json({
                    error:
                        "User authentication failed. Please login again.",
                });
        }

        if (
            role !==
                "ADMIN" &&
            !employee
        ) {
            return res
                .status(404)
                .json({
                    error:
                        "Employee profile not found for logged-in user",
                });
        }

        // ====================================================
        // FIND SYAM - MANAGER
        // ====================================================

        const syamManager =
            await findSyamManager();

        if (!syamManager) {
            return res
                .status(404)
                .json({
                    error:
                        'Gate Pass approver not found. Please make sure employee "Syam" exists with designation "Manager".',
                });
        }

        const {
            gatePassNo,
            passType,
            to,
            modeOfTransport,
            purpose,
            gatePassDate,
            items,
            approvalName,
            approvalEmpNo,
            approvalDept,
        } = req.body;

        if (
            passType &&
            ![
                "Returnable",
                "Non-Returnable",
            ].includes(
                passType
            )
        ) {
            return res
                .status(400)
                .json({
                    error:
                        "Invalid gate pass type",
                });
        }

        const createdByName =
            employee
                ? getEmployeeDisplayName(
                    employee
                )
                : "Admin";

        const incomingItems =
            Array.isArray(
                items
            )
                ? items
                : [];

        // ====================================================
        // AUTOMATIC SERIAL NUMBER + AUTOMATIC UOM
        // ====================================================

        const preparedItems =
            await Promise.all(
                incomingItems.map(
                    async (
                        item,
                        index
                    ) => {
                        const uom =
                            await resolveItemUom(
                                item
                            );

                        return {
                            ...item,

                            itemNo:
                                String(
                                    index +
                                    1
                                ),

                            uom:
                                uom ||
                                "",
                        };
                    }
                )
            );

        // ====================================================
        // SAVE PENDING GATE PASS
        // ====================================================

        const gatePass =
            await GatePass.create(
                {
                    creatorUserId:
                        userId,

                    creatorEmployeeId:
                        employee?._id ||
                        null,

                    createdByName,

                    createdByRole:
                        role,

                    gatePassNo:
                        gatePassNo ||
                        "",

                    passType:
                        passType ||
                        "Returnable",

                    to:
                        to ||
                        "",

                    modeOfTransport:
                        modeOfTransport ||
                        "",

                    purpose:
                        purpose ||
                        "",

                    gatePassDate:
                        gatePassDate
                            ? new Date(
                                `${gatePassDate}T00:00:00`
                            )
                            : new Date(),

                    items:
                        preparedItems,

                    // =========================================
                    // ORIGINAL PRINT MATRIX
                    // =========================================

                    approvalName:
                        approvalName &&
                        typeof approvalName ===
                            "object"
                            ? approvalName
                            : {},

                    approvalEmpNo:
                        approvalEmpNo &&
                        typeof approvalEmpNo ===
                            "object"
                            ? approvalEmpNo
                            : {},

                    approvalDept:
                        approvalDept &&
                        typeof approvalDept ===
                            "object"
                            ? approvalDept
                            : {},

                    // =========================================
                    // NEW APPROVAL WORKFLOW
                    // =========================================

                    approvalRequired:
                        true,

                    approvalStatus:
                        "PENDING",

                    approverEmployeeId:
                        syamManager._id,

                    approverName:
                        getEmployeeDisplayName(
                            syamManager
                        ) ||
                        "Syam",

                    approverDesignation:
                        getEmployeeDesignation(
                            syamManager
                        ) ||
                        "Manager",

                    approvalActionByEmployeeId:
                        null,

                    approvalActionByName:
                        "",

                    approvalRemark:
                        "",

                    approvedAt:
                        null,

                    rejectedAt:
                        null,
                }
            );

        return res
            .status(201)
            .json({
                success: true,

                message:
                    "Gate Pass sent to Syam (Manager) for approval.",

                canViewAll,

                isGatePassApprover,

                data:
                    normalizeGatePassForResponse(
                        gatePass,
                        employee
                    ),
            });
    } catch (error) {
        console.error(
            "Create Gate Pass Error:",
            error
        );

        return res
            .status(500)
            .json({
                error:
                    error.message ||
                    "Failed to create gate pass",
            });
    }
};

// ============================================================
// APPROVE / REJECT GATE PASS
//
// ONLY:
//
//      Employee Name: Syam
//      Designation:   Manager
//
// can do this.
//
// Even Admin cannot approve unless Admin's logged-in employee
// profile itself is Syam Manager.
//
// Additionally, the Gate Pass must actually be assigned to
// Syam's employee _id.
// ============================================================

export const updateGatePassApproval =
    async (
        req,
        res
    ) => {
        try {
            const {
                userId,
                employee,
                isGatePassApprover,
            } =
                await getAccessInfo(
                    req
                );

            if (!userId) {
                return res
                    .status(401)
                    .json({
                        error:
                            "User authentication failed. Please login again.",
                    });
            }

            // =================================================
            // ONLY SYAM MANAGER
            // =================================================

            if (
                !employee ||
                !isGatePassApprover ||
                !isSyamManager(
                    employee
                )
            ) {
                return res
                    .status(403)
                    .json({
                        error:
                            "Only Syam (Manager) can approve or reject Gate Passes.",
                    });
            }

            const gatePassId =
                req.params.id;

            if (
                !mongoose.Types.ObjectId.isValid(
                    gatePassId
                )
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Invalid Gate Pass ID",
                    });
            }

            const gatePass =
                await GatePass.findById(
                    gatePassId
                );

            if (!gatePass) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Gate Pass not found",
                    });
            }

            // =================================================
            // OLD RECORDS DO NOT REQUIRE THIS WORKFLOW
            // =================================================

            if (
                gatePass.approvalRequired !==
                true
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "This historical Gate Pass does not require approval.",
                    });
            }

            // =================================================
            // VERIFY IT WAS ASSIGNED TO THIS EXACT EMPLOYEE
            // =================================================

            if (
                !gatePass.approverEmployeeId ||
                String(
                    gatePass.approverEmployeeId
                ) !==
                    String(
                        employee._id
                    )
            ) {
                return res
                    .status(403)
                    .json({
                        error:
                            "This Gate Pass is not assigned to you for approval.",
                    });
            }

            // =================================================
            // ONLY PENDING CAN BE ACTIONED
            // =================================================

            if (
                String(
                    gatePass.approvalStatus
                ).toUpperCase() !==
                "PENDING"
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            `This Gate Pass is already ${gatePass.approvalStatus}.`,
                    });
            }

            const requestedStatus =
                String(
                    req.body?.status ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            if (
                ![
                    "APPROVED",
                    "REJECTED",
                ].includes(
                    requestedStatus
                )
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            'Status must be either "APPROVED" or "REJECTED".',
                    });
            }

            const remark =
                String(
                    req.body?.remark ||
                    ""
                ).trim();

            const actionByName =
                getEmployeeDisplayName(
                    employee
                ) ||
                "Syam";

            // =================================================
            // APPROVE
            // =================================================

            if (
                requestedStatus ===
                "APPROVED"
            ) {
                gatePass.approvalStatus =
                    "APPROVED";

                gatePass.approvedAt =
                    new Date();

                gatePass.rejectedAt =
                    null;

                gatePass.approvalActionByEmployeeId =
                    employee._id;

                gatePass.approvalActionByName =
                    actionByName;

                gatePass.approvalRemark =
                    remark;

                // =============================================
                // ALSO UPDATE YOUR EXISTING PRINT APPROVAL
                // MATRIX SO "Approved By" CAN SHOW SYAM.
                // =============================================

                const approvalName =
                    gatePass.approvalName &&
                    typeof gatePass.approvalName ===
                        "object"
                        ? {
                            ...gatePass.approvalName,
                        }
                        : {};

                approvalName[
                    "Approved By"
                ] =
                    actionByName;

                gatePass.approvalName =
                    approvalName;

                const approvalEmpNo =
                    gatePass.approvalEmpNo &&
                    typeof gatePass.approvalEmpNo ===
                        "object"
                        ? {
                            ...gatePass.approvalEmpNo,
                        }
                        : {};

                if (
                    employee.employeeCode
                ) {
                    approvalEmpNo[
                        "Approved By"
                    ] =
                        employee.employeeCode;
                }

                gatePass.approvalEmpNo =
                    approvalEmpNo;

                const approvalDept =
                    gatePass.approvalDept &&
                    typeof gatePass.approvalDept ===
                        "object"
                        ? {
                            ...gatePass.approvalDept,
                        }
                        : {};

                if (
                    employee.department
                ) {
                    approvalDept[
                        "Approved By"
                    ] =
                        employee.department;
                }

                gatePass.approvalDept =
                    approvalDept;
            }

            // =================================================
            // REJECT
            // =================================================

            if (
                requestedStatus ===
                "REJECTED"
            ) {
                gatePass.approvalStatus =
                    "REJECTED";

                gatePass.rejectedAt =
                    new Date();

                gatePass.approvedAt =
                    null;

                gatePass.approvalActionByEmployeeId =
                    employee._id;

                gatePass.approvalActionByName =
                    actionByName;

                gatePass.approvalRemark =
                    remark;
            }

            await gatePass.save();

            return res.json({
                success: true,

                message:
                    requestedStatus ===
                    "APPROVED"
                        ? "Gate Pass approved successfully. The requester can now print it."
                        : "Gate Pass rejected successfully.",

                data:
                    normalizeGatePassForResponse(
                        gatePass,
                        employee
                    ),
            });
        } catch (error) {
            console.error(
                "Update Gate Pass Approval Error:",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        error.message ||
                        "Failed to update Gate Pass approval",
                });
        }
    };