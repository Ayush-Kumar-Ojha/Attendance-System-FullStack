import { Inngest } from "inngest";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import LeaveApplication from "../models/LeaveApplication.js";
import User from "../models/User.js";
import sendEmail from "../config/nodemailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "attendance system" });

// (a) Cron: Check at 7 PM IST for employees who checked in but never checked out
const checkoutReminderCron = inngest.createFunction(
    { id: "checkout-reminder-cron", triggers: [{ cron: "TZ=Asia/Kolkata 0 19 * * *" }] }, // 7:00 PM IST daily
    async ({ step }) => {
        const today = await step.run("get-today-date", () => {
            const startUTC = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00+05:30")
            const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
            return { startUTC: startUTC.toISOString(), endUTC: endUTC.toISOString() }
        })

        const notCheckedOut = await step.run("get-not-checked-out", async () => {
            const records = await Attendance.find({
                date: { $gte: new Date(today.startUTC), $lt: new Date(today.endUTC) },
                checkIn: { $ne: null },
                checkOut: null,
            }).populate("employeeId").lean();
            return records.filter((r) => r.employeeId);
        })

        if (notCheckedOut.length > 0) {
            await step.run("send-checkout-reminders", async () => {
                const emailPromises = notCheckedOut.map((record) => {
                    const emp = record.employeeId;
                    return sendEmail({
                        to: emp.email,
                        subject: "Reminder: You haven't checked out yet",
                        body: `<div style="max-width: 600px; font-family: Arial, sans-serif;">
                            <h2>Hi ${emp.firstName}, 👋</h2>
                            <p style="font-size: 16px;">It's past 7:00 PM and we noticed you haven't checked out yet today.</p>
                            <p style="font-size: 16px;">You checked in at <strong>${new Date(record.checkIn).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}</strong>.</p>
                            <p style="font-size: 16px;">Please remember to check out before you leave.</p>
                            <br />
                            <p style="font-size: 14px; color: #666;">Department: ${emp.department || "N/A"}</p>
                            <br />
                            <p style="font-size: 16px;">Best Regards,</p>
                            <p style="font-size: 16px;"><strong>EMS</strong></p>
                        </div>`
                    });
                });
                await Promise.all(emailPromises);
                return { emailsSent: notCheckedOut.length };
            });
        }

        return { notCheckedOutCount: notCheckedOut.length };
    }
);

// (b) Cron: Check at 11 AM IST for employees who haven't checked in yet today
const attendanceReminderCron = inngest.createFunction(
    { id: "attendance-reminder-cron", triggers: [{ cron: "TZ=Asia/Kolkata 0 11 * * *" }] }, // 11:00 AM IST
    async ({ step }) => {
        const today = await step.run("get-today-date", () => {
            const startUTC = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00+05:30")
            const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
            return { startUTC: startUTC.toISOString(), endUTC: endUTC.toISOString() }
        })

        const activeEmployees = await step.run("get-active-employees", async () => {
            const employees = await Employee.find({
                isDeleted: false,
                employmentStatus: "ACTIVE",
            }).lean();
            return employees.map((e) => ({ _id: e._id.toString(), firstName: e.firstName, lastName: e.lastName, email: e.email, department: e.department }))
        })

        const onLeaveIds = await step.run("get-on-leave-ids", async () => {
            const leaves = await LeaveApplication.find({
                status: "APPROVED",
                startDate: { $lte: new Date(today.endUTC) },
                endDate: { $gte: new Date(today.startUTC) },
            }).lean();
            return leaves.map((l) => l.employeeId.toString())
        })

        const checkedInIds = await step.run("get-checked-in-ids", async () => {
            const attendances = await Attendance.find({
                date: { $gte: new Date(today.startUTC), $lt: new Date(today.endUTC) },
            }).lean();
            return attendances.map((a) => a.employeeId.toString())
        })

        const absentEmployees = activeEmployees.filter((emp) =>
            !onLeaveIds.includes(emp._id) && !checkedInIds.includes(emp._id))

        if (absentEmployees.length > 0) {
            await step.run("send-reminder-emails", async () => {
                const emailPromises = absentEmployees.map((emp) => {
                    return sendEmail({
                        to: emp.email,
                        subject: `Attendance Reminder — Please Mark Your Attendance`,
                        body: `<div style="max-width: 600px; font-family: Arial, sans-serif;">
                            <h2>Hi ${emp.firstName}, 👋</h2>
                            <p style="font-size: 16px;">We noticed you haven't marked your attendance yet today.</p>
                            <p style="font-size: 16px;">The deadline was <strong>11:00 AM</strong> and your attendance is still missing.</p>
                            <p style="font-size: 16px;">Please check in as soon as possible or contact your admin if you're facing any issues.</p>
                            <br />
                            <p style="font-size: 14px; color: #666;">Department: ${emp.department || "N/A"}</p>
                            <br />
                            <p style="font-size: 16px;">Best Regards,</p>
                            <p style="font-size: 16px;"><strong>EMS</strong></p>
                        </div>`,
                    })
                })
                await Promise.all(emailPromises)
                return { emailsSent: absentEmployees.length }
            })
        }

        return { totalActive: activeEmployees.length, onLeave: onLeaveIds.length, checkedIn: checkedInIds.length, absent: absentEmployees.length }
    }
);

// (c) Send Email to admin if leave application hasn't been actioned within 24 hours
const leaveApplicationReminder = inngest.createFunction(
    { id: "leave-application-reminder", triggers: [{ event: "leave/pending" }] },
    async ({ event, step }) => {
        const { leaveApplicationId } = event.data;

        // wait for 24 hours
        await step.sleepUntil("wait-for-the-24-hours", new Date(new Date().getTime() + 24 * 60 * 60 * 1000))

        const leaveApplication = await step.run("check-leave-status", async () => {
            return await LeaveApplication.findById(leaveApplicationId).lean();
        });

        if (leaveApplication?.status === "PENDING") {
            const employee = await step.run("get-employee", async () => {
                return await Employee.findById(leaveApplication.employeeId).lean();
            });

            const admins = await step.run("get-admins", async () => {
                return await User.find({ role: "ADMIN" }).lean();
            });

            if (employee && admins.length > 0) {
                await step.run("send-admin-reminder", async () => {
                    const emailPromises = admins.map((admin) =>
                        sendEmail({
                            to: admin.email,
                            subject: "Reminder: Pending Leave Application Needs Action",
                            body: `<div style="max-width: 600px; font-family: Arial, sans-serif;">
                                <h2>Hi Admin, 👋</h2>
                                <p style="font-size: 16px;">A leave application from <strong>${employee.firstName} ${employee.lastName}</strong> has been pending for over 24 hours.</p>
                                <p style="font-size: 16px;">Type: <strong>${leaveApplication.type}</strong></p>
                                <p style="font-size: 16px;">Dates: <strong>${new Date(leaveApplication.startDate).toLocaleDateString()} - ${new Date(leaveApplication.endDate).toLocaleDateString()}</strong></p>
                                <p style="font-size: 16px;">Reason: ${leaveApplication.reason}</p>
                                <p style="font-size: 16px;">Please review and take action as soon as possible.</p>
                                <br />
                                <p style="font-size: 16px;">Best Regards,</p>
                                <p style="font-size: 16px;"><strong>EMS</strong></p>
                            </div>`
                        })
                    );
                    await Promise.all(emailPromises);
                    return { emailsSent: admins.length };
                });
            }
        }
    }
);

// Create an empty array where we'll export future Inngest functions
export const functions = [
    checkoutReminderCron,
    attendanceReminderCron,
    leaveApplicationReminder,
];