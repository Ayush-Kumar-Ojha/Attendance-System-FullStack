import Employee from "../models/Employee.js";
import { differenceInYears } from "date-fns";

const isTodayMatch = (date) => {
    if (!date) return false;
    const today = new Date();
    const d = new Date(date);
    return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
};

const getUserId = (req) =>
    req.user?._id || req.user?.id || req.user?.userId || req.session?.userId;

const getUserRole = (req) =>
    (req.user?.role || req.session?.role || "").toUpperCase();

// Get special dates (own for employee, all + today's celebrations for admin)
// GET /api/special-dates
export const getSpecialDates = async (req, res) => {
    try {
        const isAdmin = getUserRole(req) === "ADMIN";
        const userId = getUserId(req);

        if (isAdmin) {
            const employees = await Employee.find({ isDeleted: false }).lean();
            const today = [];

            employees.forEach((emp) => {
                const name = `${emp.firstName} ${emp.lastName}`;

                if (isTodayMatch(emp.dateOfBirth)) {
                    today.push({
                        employeeId: emp._id.toString(),
                        name,
                        type: "birthday",
                        message: emp.specialDateMessage || "",
                    });
                }
                if (isTodayMatch(emp.anniversaryDate)) {
                    today.push({
                        employeeId: emp._id.toString(),
                        name,
                        type: "anniversary",
                        message: emp.specialDateMessage || "",
                    });
                }
                if (isTodayMatch(emp.joinDate)) {
                    const years = differenceInYears(new Date(), new Date(emp.joinDate));
                    if (years > 0) {
                        today.push({
                            employeeId: emp._id.toString(),
                            name,
                            type: "workAnniversary",
                            years,
                            message: emp.specialDateMessage || "",
                        });
                    }
                }
            });

            const all = employees.map((emp) => ({
                employeeId: emp._id.toString(),
                name: `${emp.firstName} ${emp.lastName}`,
                department: emp.department,
                dateOfBirth: emp.dateOfBirth,
                anniversaryDate: emp.anniversaryDate,
                joinDate: emp.joinDate,
            }));

            return res.json({ today, all });
        } else {
            const employee = await Employee.findOne({
                $or: [{ userId }, { user: userId }, { _id: userId }],
                isDeleted: { $ne: true },
            }).lean();

            if (!employee) {
                return res.status(404).json({ error: "Employee not found" });
            }

            // Check if special date message was sent in the last 24 hours
            let activeMessage = "";
            if (employee.specialDateMessage && employee.specialDateMessageCreatedAt) {
                const elapsedMs = new Date() - new Date(employee.specialDateMessageCreatedAt);
                const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
                if (elapsedMs < TWENTY_FOUR_HOURS_MS) {
                    activeMessage = employee.specialDateMessage;
                }
            }

            return res.json({
                data: {
                    dateOfBirth: employee.dateOfBirth,
                    anniversaryDate: employee.anniversaryDate,
                    joinDate: employee.joinDate,
                    hrMessage: activeMessage,
                },
            });
        }
    } catch (error) {
        console.error("Get Special Dates Error:", error);
        return res.status(500).json({ error: "Failed to fetch special dates" });
    }
};

// Update own special dates (employee only)
// POST /api/special-dates
export const updateSpecialDates = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { dateOfBirth, anniversaryDate } = req.body;

        const employee = await Employee.findOne({
            $or: [{ userId }, { user: userId }, { _id: userId }],
        });

        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        if (dateOfBirth) employee.dateOfBirth = new Date(dateOfBirth);
        if (anniversaryDate) employee.anniversaryDate = new Date(anniversaryDate);

        await employee.save();

        return res.json({ success: true });
    } catch (error) {
        console.error("Update Special Dates Error:", error);
        return res.status(500).json({ error: "Failed to update special dates" });
    }
};

// Admin: set HR message for a specific employee's special date (active for 24h)
// POST /api/special-dates/:employeeId/message
export const setHrMessage = async (req, res) => {
    try {
        const { message } = req.body;
        const employee = await Employee.findByIdAndUpdate(
            req.params.employeeId,
            {
                specialDateMessage: message || "",
                specialDateMessageCreatedAt: message ? new Date() : null,
            },
            { new: true }
        );

        if (!employee) return res.status(404).json({ error: "Employee not found" });

        return res.json({ success: true, data: employee });
    } catch (error) {
        console.error("Set HR Message Error:", error);
        return res.status(500).json({ error: "Failed to save message" });
    }
};