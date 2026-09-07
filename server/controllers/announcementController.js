import Announcement from "../models/Announcement.js";
import Employee from "../models/Employee.js";

// ============================================================
// HELPER - NORMALIZE EMPLOYEE IDS
// ============================================================

const getSelectedEmployeeIds = ({
    targetEmployeeIds,
    targetEmployeeId,
}) => {
    let ids = [];

    if (Array.isArray(targetEmployeeIds)) {
        ids = targetEmployeeIds;
    } else if (targetEmployeeIds) {
        ids = [targetEmployeeIds];
    }

    // Backward compatibility
    if (
        ids.length === 0 &&
        targetEmployeeId
    ) {
        ids = [targetEmployeeId];
    }

    // Remove empty + duplicate values
    return [
        ...new Set(
            ids
                .filter(Boolean)
                .map((id) =>
                    String(id).trim()
                )
                .filter(Boolean)
        ),
    ];
};

// ============================================================
// GET ALL ANNOUNCEMENTS
// GET /api/announcements
// ============================================================

export const getAnnouncements = async (
    req,
    res
) => {
    try {
        const session =
            req.session;

        const userId =
            req.user?._id ||
            req.user?.id ||
            session?.userId;

        const role =
            req.user?.role ||
            session?.role;

        const isAdmin =
            role === "ADMIN";

        // ========================================================
        // ADMIN - SEE ALL ANNOUNCEMENTS
        // ========================================================

        if (isAdmin) {
            const announcements =
                await Announcement.find()
                    .populate(
                        "targetEmployeeId",
                        "firstName lastName department position"
                    )
                    .populate(
                        "targetEmployeeIds",
                        "firstName lastName department position"
                    )
                    .sort({
                        createdAt: -1,
                    });

            return res.json({
                data: announcements,
            });
        }

        // ========================================================
        // FIND CURRENT EMPLOYEE
        // ========================================================

        const employee =
            await Employee.findOne({
                userId,
            });

        // If employee record is unavailable,
        // only show announcements for everyone.
        if (!employee) {
            const announcements =
                await Announcement.find({
                    $or: [
                        {
                            targetType:
                                "ALL",
                        },
                        {
                            targetType: {
                                $exists:
                                    false,
                            },
                        },
                    ],
                })
                    .populate(
                        "targetEmployeeId",
                        "firstName lastName"
                    )
                    .populate(
                        "targetEmployeeIds",
                        "firstName lastName"
                    )
                    .sort({
                        createdAt: -1,
                    });

            return res.json({
                data: announcements,
            });
        }

        // ========================================================
        // EMPLOYEE ANNOUNCEMENTS
        //
        // Employee receives:
        // 1. Everyone announcements
        // 2. Their department announcements
        // 3. New multi-person individual announcements
        // 4. Old single-person announcements
        // ========================================================

        const announcements =
            await Announcement.find({
                $or: [
                    {
                        targetType:
                            "ALL",
                    },

                    {
                        targetType: {
                            $exists:
                                false,
                        },
                    },

                    {
                        targetType:
                            "DEPARTMENT",

                        targetDepartment:
                            employee.department,
                    },

                    {
                        targetType:
                            "INDIVIDUAL",

                        targetEmployeeIds:
                            employee._id,
                    },

                    // Old announcements
                    {
                        targetType:
                            "INDIVIDUAL",

                        targetEmployeeId:
                            employee._id,
                    },
                ],
            })
                .populate(
                    "targetEmployeeId",
                    "firstName lastName"
                )
                .populate(
                    "targetEmployeeIds",
                    "firstName lastName"
                )
                .sort({
                    createdAt: -1,
                });

        return res.json({
            data: announcements,
        });
    } catch (error) {
        console.error(
            "Get Announcements Error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to fetch announcements",
        });
    }
};

// ============================================================
// CREATE ANNOUNCEMENT
// POST /api/announcements
// ============================================================

export const createAnnouncement = async (
    req,
    res
) => {
    try {
        const {
            title,
            message,
            targetType,
            targetDepartment,
            targetEmployeeId,
            targetEmployeeIds,
        } = req.body;

        // ========================================================
        // VALIDATION
        // ========================================================

        if (!title || !message) {
            return res
                .status(400)
                .json({
                    error:
                        "Title and message are required",
                });
        }

        if (
            targetType ===
                "DEPARTMENT" &&
            !targetDepartment
        ) {
            return res
                .status(400)
                .json({
                    error:
                        "Please select a department",
                });
        }

        const selectedEmployeeIds =
            getSelectedEmployeeIds({
                targetEmployeeIds,
                targetEmployeeId,
            });

        if (
            targetType ===
                "INDIVIDUAL" &&
            selectedEmployeeIds.length ===
                0
        ) {
            return res
                .status(400)
                .json({
                    error:
                        "Please select at least one employee",
                });
        }

        // ========================================================
        // CREATE
        // ========================================================

        const announcement =
            await Announcement.create({
                title: title.trim(),

                message:
                    message.trim(),

                postedBy:
                    req.session
                        ?.userId ||
                    req.user?._id,

                targetType:
                    targetType ||
                    "ALL",

                targetDepartment:
                    targetType ===
                    "DEPARTMENT"
                        ? targetDepartment
                        : null,

                targetEmployeeIds:
                    targetType ===
                    "INDIVIDUAL"
                        ? selectedEmployeeIds
                        : [],

                // Keep first employee in old field
                // for backward compatibility.
                targetEmployeeId:
                    targetType ===
                        "INDIVIDUAL" &&
                    selectedEmployeeIds.length >
                        0
                        ? selectedEmployeeIds[0]
                        : null,
            });

        const populatedAnnouncement =
            await Announcement.findById(
                announcement._id
            )
                .populate(
                    "targetEmployeeId",
                    "firstName lastName"
                )
                .populate(
                    "targetEmployeeIds",
                    "firstName lastName"
                );

        return res.status(201).json({
            success: true,
            data:
                populatedAnnouncement,
        });
    } catch (error) {
        console.error(
            "Create Announcement Error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to create announcement",
        });
    }
};

// ============================================================
// UPDATE ANNOUNCEMENT
// PUT /api/announcements/:id
// ============================================================

export const updateAnnouncement = async (
    req,
    res
) => {
    try {
        const {
            title,
            message,
            targetType,
            targetDepartment,
            targetEmployeeId,
            targetEmployeeIds,
        } = req.body;

        if (!title || !message) {
            return res
                .status(400)
                .json({
                    error:
                        "Title and message are required",
                });
        }

        if (
            targetType ===
                "DEPARTMENT" &&
            !targetDepartment
        ) {
            return res
                .status(400)
                .json({
                    error:
                        "Please select a department",
                });
        }

        const selectedEmployeeIds =
            getSelectedEmployeeIds({
                targetEmployeeIds,
                targetEmployeeId,
            });

        if (
            targetType ===
                "INDIVIDUAL" &&
            selectedEmployeeIds.length ===
                0
        ) {
            return res
                .status(400)
                .json({
                    error:
                        "Please select at least one employee",
                });
        }

        const announcement =
            await Announcement.findByIdAndUpdate(
                req.params.id,
                {
                    title:
                        title.trim(),

                    message:
                        message.trim(),

                    targetType:
                        targetType ||
                        "ALL",

                    targetDepartment:
                        targetType ===
                        "DEPARTMENT"
                            ? targetDepartment
                            : null,

                    targetEmployeeIds:
                        targetType ===
                        "INDIVIDUAL"
                            ? selectedEmployeeIds
                            : [],

                    targetEmployeeId:
                        targetType ===
                            "INDIVIDUAL" &&
                        selectedEmployeeIds.length >
                            0
                            ? selectedEmployeeIds[0]
                            : null,
                },
                {
                    new: true,
                }
            )
                .populate(
                    "targetEmployeeId",
                    "firstName lastName"
                )
                .populate(
                    "targetEmployeeIds",
                    "firstName lastName"
                );

        if (!announcement) {
            return res
                .status(404)
                .json({
                    error:
                        "Announcement not found",
                });
        }

        return res.json({
            success: true,
            data: announcement,
        });
    } catch (error) {
        console.error(
            "Update Announcement Error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to update announcement",
        });
    }
};

// ============================================================
// DELETE ANNOUNCEMENT
// DELETE /api/announcements/:id
// ============================================================

export const deleteAnnouncement = async (
    req,
    res
) => {
    try {
        const announcement =
            await Announcement.findByIdAndDelete(
                req.params.id
            );

        if (!announcement) {
            return res
                .status(404)
                .json({
                    error:
                        "Announcement not found",
                });
        }

        return res.json({
            success: true,
            message:
                "Announcement deleted",
        });
    } catch (error) {
        console.error(
            "Delete Announcement Error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to delete announcement",
        });
    }
};