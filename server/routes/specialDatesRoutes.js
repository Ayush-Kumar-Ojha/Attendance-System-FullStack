import { Router } from "express";
import { protect, protectAdmin } from "../middleware/auth.js";
import { getSpecialDates, updateSpecialDates, setHrMessage } from "../controllers/specialDatesController.js";

const specialDatesRouter = Router();

specialDatesRouter.get("/", protect, getSpecialDates);
specialDatesRouter.post("/", protect, updateSpecialDates);
specialDatesRouter.post("/:employeeId/message", protect, protectAdmin, setHrMessage);

export default specialDatesRouter;