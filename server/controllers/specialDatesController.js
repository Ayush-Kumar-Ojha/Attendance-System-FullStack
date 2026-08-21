import Employee from "../models/Employee.js";
import { differenceInYears } from "date-fns";

const isTodayMatch = (date) => {
    if (!date) return false;
    const today = new Date();
    const d = new Date(date);
    return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
};

// Get special dates (own for employee, all + today's celebrations for admin)
// GET /api/special-dates
export const getSpecialDates = async (req, res) => {
    try {
        const session = req.session;
        const isAdmin = session.role === "ADMIN";

        if (isAdmin) {
            const employees = await Employee.find({ isDeleted: false }).lean();

            const today = [];

            employees.forEach((emp) => {
                const name = `${emp.firstName} ${emp.lastName}`;

                if (isTodayMatch(emp.dateOfBirth)) {
                    today.push({ employeeId: emp._id.toString(), name, type: "birthday", message: emp.specialDateMessage || "" });
                }
                if (isTodayMatch(emp.anniversaryDate)) {
                    today.push({ employeeId: emp._id.toString(), name, type: "anniversary", message: emp.specialDateMessage || "" });
                }
                if (isTodayMatch(emp.joinDate)) {
                    const years = differenceInYears(new Date(), new Date(emp.joinDate));
                    if (years > 0) {
                        today.push({ employeeId: emp._id.toString(), name, type: "workAnniversary", years, message: emp.specialDateMessage || "" });
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
            const employee = await Employee.findOne({ userId: session.userId }).lean();

            if (!employee) {
                return res.status(404).json({ error: "Employee not found" });
            }

            const isSpecialDateToday =
                isTodayMatch(employee.dateOfBirth) ||
                isTodayMatch(employee.anniversaryDate) ||
                isTodayMatch(employee.joinDate);

            return res.json({
                data: {
                    dateOfBirth: employee.dateOfBirth,
                    anniversaryDate: employee.anniversaryDate,
                    joinDate: employee.joinDate,
                    hrMessage: isSpecialDateToday ? employee.specialDateMessage || "" : "",
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
        const session = req.session;
        const { dateOfBirth, anniversaryDate } = req.body;

        const employee = await Employee.findOne({ userId: session.userId });

        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        employee.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
        employee.anniversaryDate = anniversaryDate ? new Date(anniversaryDate) : null;

        await employee.save();

        return res.json({ success: true });
    } catch (error) {
        console.error("Update Special Dates Error:", error);
        return res.status(500).json({ error: "Failed to update special dates" });
    }
};

// Admin: set HR message for a specific employee's special date
// POST /api/special-dates/:employeeId/message
export const setHrMessage = async (req, res) => {
    try {
        const { message } = req.body;
        const employee = await Employee.findByIdAndUpdate(
            req.params.employeeId,
            { specialDateMessage: message || "" },
            { new: true }
        );
        if (!employee) return res.status(404).json({ error: "Employee not found" });
        return res.json({ success: true });
    } catch (error) {
        console.error("Set HR Message Error:", error);
        return res.status(500).json({ error: "Failed to save message" });
    }
};