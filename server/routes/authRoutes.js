import{Router} from "express"
import { changePassword, login, session } from "../controllers/authController.js";


const authRouter=Router();

authRouter.post("/login",login)
authRouter.get("/session",session)
authRouter.post("/change-password",changePassword)

export default authRouter;