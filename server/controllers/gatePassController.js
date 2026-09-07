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

    return `${
        employee.firstName || ""
    } ${
        employee.lastName || ""
    }`.trim();
};

// ============================================================
// SHYAM SPECIAL ACCESS
// ============================================================

const isShyamEmployee = (
    employee
) => {
    if (!employee) {
        return false;
    }

    const firstName =
        String(
            employee.firstName || ""
        )
            .trim()
            .toLowerCase();

    const fullName =
        getEmployeeDisplayName(
            employee
        )
            .trim()
            .toLowerCase();

    return (
        firstName === "shyam" ||
        fullName === "shyam"
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

    const canViewAll =
        role === "ADMIN" ||
        isShyamEmployee(
            employee
        );

    return {
        role,
        userId,
        employee,
        canViewAll,
    };
};

// ============================================================
// GET GATE PASS HISTORY
//
// ADMIN  -> ALL
// SHYAM  -> ALL
// OTHERS -> OWN
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
                (pass) => ({
                    ...pass,

                    id:
                        pass._id.toString(),
                })
            );

        return res.json({
            success: true,

            canViewAll,

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
// This prevents an old UOM remaining when WH Part No. changes.
//
// Existing UOM is used only as a backward-compatibility fallback.
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

        // WH Part No. was entered but no
        // Item Master record exists.
        // Do not accidentally retain another item's UOM.
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
// CREATE GATE PASS
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

                            // Automatic:
                            // 1, 2, 3...
                            itemNo:
                                String(
                                    index +
                                        1
                                ),

                            // From Item Master
                            uom:
                                uom ||
                                "",
                        };
                    }
                )
            );

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
                }
            );

        return res
            .status(201)
            .json({
                success: true,

                canViewAll,

                data: {
                    ...gatePass.toObject(),

                    id:
                        gatePass._id.toString(),
                },
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