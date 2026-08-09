import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { getSpecialDates, updateSpecialDates } from "../controllers/specialDatesController.js";

const specialDatesRouter = Router();

specialDatesRouter.get("/", protect, getSpecialDates);
specialDatesRouter.post("/", protect, updateSpecialDates);

export default specialDatesRouter;