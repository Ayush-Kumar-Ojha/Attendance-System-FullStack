import { Router } from "express";
import { getDepartments, createDepartment } from "../controllers/departmentController.js";
import { protect, protectAdmin } from "../middleware/auth.js";

const departmentRouter = Router();

departmentRouter.get("/", protect, getDepartments);
departmentRouter.post("/", protect, protectAdmin, createDepartment);

export default departmentRouter;