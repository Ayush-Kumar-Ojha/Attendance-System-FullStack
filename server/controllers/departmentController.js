import Department from "../models/Department.js";
import { DEPARTMENTS as DEFAULT_DEPARTMENTS } from "../constants/departments.js";

// ======================================
// Get Departments (auto-seeds defaults on first call)
// GET /api/departments
// ======================================
export const getDepartments = async (req, res) => {
    try {
        const count = await Department.countDocuments();

        if (count === 0) {
            await Department.insertMany(
                DEFAULT_DEPARTMENTS.map((name) => ({ name }))
            );
        }

        const departments = await Department.find().sort({ name: 1 });
        return res.json(departments.map((d) => d.name));
    } catch (error) {
        console.error("Get Departments Error:", error);
        return res.status(500).json({ error: "Failed to fetch departments" });
    }
};

// ======================================
// Create Department
// POST /api/departments
// ======================================
export const createDepartment = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Department name is required" });
        }

        const trimmed = name.trim();

        const existing = await Department.findOne({
            name: { $regex: `^${trimmed}$`, $options: "i" },
        });

        if (existing) {
            return res.status(400).json({ error: "Department already exists" });
        }

        const department = await Department.create({ name: trimmed });

        return res.status(201).json({
            success: true,
            department: department.name,
        });
    } catch (error) {
        console.error("Create Department Error:", error);

        if (error.code === 11000) {
            return res.status(400).json({ error: "Department already exists" });
        }

        return res.status(500).json({ error: "Failed to create department" });
    }
};