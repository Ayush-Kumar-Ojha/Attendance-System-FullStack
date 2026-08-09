import { Router } from "express"
import { changePassword, login, session, forgotPassword, resetPassword } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";


const authRouter = Router();

authRouter.post("/login", login)
authRouter.get("/session", protect, session)
authRouter.post("/change-password", protect, changePassword)
authRouter.post("/forgot-password", forgotPassword)
authRouter.post("/reset-password/:token", resetPassword)

export default authRouter;