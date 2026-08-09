import express from "express";
import cors from "cors";
import "dotenv/config";
import multer from "multer";
import connectDB from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import employeesRouter from "./routes/employeeRoutes.js";
import profileRouter from "./routes/profileRoutes.js";
import attendanceRouter from "./routes/attendanceRoutes.js";
import leaveRouter from "./routes/leaveRoutes.js";
import payslipRouter from "./routes/payslipsRoute.js";
import dashboardRouter from "./routes/dashboardRoutes.js";
import departmentRouter from "./routes/departmentRoutes.js";
import announcementRouter from "./routes/announcementRoutes.js";
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import specialDatesRouter from "./routes/specialDatesRoutes.js";
import reportRouter from "./routes/reportRoutes.js";

const app = express()
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.get("/", (req, res)=> res.send("Server is running"))
app.use("/api/auth",authRouter)
app.use("/api/employees", multer().none(), employeesRouter)
app.use("/api/profile",profileRouter)
app.use("/api/attendance",attendanceRouter)
app.use("/api/leave", multer().none(), leaveRouter)
app.use("/api/payslip",payslipRouter)
app.use("/api/dashboard",dashboardRouter)
app.use("/api/departments",departmentRouter)
app.use("/api/announcements",announcementRouter)
app.use("/api/special-dates", specialDatesRouter)
app.use("/api/reports", reportRouter)

app.use("/api/inngest", serve({ client: inngest, functions }));

await connectDB()
app.listen(PORT, ()=> console.log(`Server running on port ${PORT}`))