import { Inngest } from "inngest";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import LeaveApplication from "../models/LeaveApplication.js";
import sendEmail from "../config/nodemailer.js";

// Create Inngest client
export const inngest = new Inngest({
    id: "attendance-system",
});


// ================================
// Auto Check-out for employees
// ================================

const autoCheckOut = inngest.createFunction(
    {
        id: "auto-check-out",
        triggers: [{ event: "employee/check-out" }],
    },

    async ({ event, step }) => {

        const { employeeId, attendanceId } = event.data;


        // Wait for 9 hours
        await step.sleepUntil(
            "wait-for-9-hours",
            new Date(Date.now() + 9 * 60 * 60 * 1000)
        );


        let attendance =
            await Attendance.findById(attendanceId);


        if (!attendance?.checkOut) {

            const employee =
                await Employee.findById(employeeId);


            // Send reminder email
            await sendEmail({
                to: employee.email,
                subject: "Attendance Check-Out Reminder",

                body: `
                <div style="max-width:600px;font-family:Arial">

                    <h2>
                    Hi ${employee.firstName}, 👋
                    </h2>

                    <p>
                    You checked-in today in ${employee.department}.
                    </p>

                    <p>
                    Check-in time:
                    <strong>
                    ${attendance?.checkIn?.toLocaleTimeString()}
                    </strong>
                    </p>

                    <p>
                    Please make sure to check-out within one hour.
                    </p>

                    <br/>

                    <p>
                    Best Regards,
                    </p>

                    <p>
                    QuickEMS
                    </p>

                </div>
                `
            });



            // Wait additional 1 hour
            await step.sleepUntil(
                "wait-for-1-hour",
                new Date(Date.now() + 1 * 60 * 60 * 1000)
            );


            attendance =
                await Attendance.findById(attendanceId);



            // Auto checkout
            if (!attendance?.checkOut) {

                attendance.checkOut =
                    new Date(
                        new Date(attendance.checkIn).getTime()
                        +
                        4 * 60 * 60 * 1000
                    );


                attendance.workingHours = 4;
                attendance.dayType = "Half Day";
                attendance.status = "LATE";


                await attendance.save();
            }

        }

    }
);



// ================================
// Leave Application Reminder
// ================================

const leaveApplicationReminder = inngest.createFunction(
    {
        id: "leave-application-reminder",
        triggers: [
            {
                event: "leave/pending"
            }
        ],
    },


    async ({ event, step }) => {


        const { leaveApplicationId } = event.data;



        // Wait 24 hours
        await step.sleepUntil(
            "wait-for-24-hours",
            new Date(Date.now() + 24 * 60 * 60 * 1000)
        );



        const leaveApplication =
            await LeaveApplication.findById(
                leaveApplicationId
            );



        if (leaveApplication?.status === "PENDING") {


            const employee =
                await Employee.findById(
                    leaveApplication.employeeId
                );



            // Notify Admin
            await sendEmail({

                to: process.env.ADMIN_EMAIL,

                subject:
                "Pending Leave Application Reminder",


                body: `

                <div style="max-width:600px;font-family:Arial">

                    <h2>
                    Leave Approval Pending
                    </h2>


                    <p>
                    Employee:
                    ${employee.firstName}
                    ${employee.lastName}
                    </p>


                    <p>
                    Their leave application has been pending
                    for more than 24 hours.
                    </p>


                    <p>
                    Please review and take action.
                    </p>


                    <br/>


                    <p>
                    Regards,
                    </p>


                    <p>
                    QuickEMS
                    </p>


                </div>

                `

            });

        }

    }

);




// ================================
// Attendance Reminder Cron
// ================================

const attendanceReminderCron = inngest.createFunction(

    {
        id: "attendance-reminder-cron",

        triggers: [
            {
                cron:
                "TZ=Asia/Kolkata 30 11 * * *"
            }
        ],
    },


    async ({ step }) => {



        const today =
        await step.run(
            "get-today-date",
            () => {


                const startUTC =
                new Date(
                    new Date()
                    .toLocaleDateString(
                        "en-CA",
                        {
                            timeZone:
                            "Asia/Kolkata"
                        }
                    )
                    +
                    "T00:00:00+05:30"
                );



                const endUTC =
                new Date(
                    startUTC.getTime()
                    +
                    24 * 60 * 60 * 1000
                );


                return {

                    startUTC:
                    startUTC.toISOString(),


                    endUTC:
                    endUTC.toISOString()

                };

            }
        );





        const activeEmployees =
        await step.run(
            "get-active-employees",

            async () => {


                const employees =
                await Employee.find({

                    isDeleted:false,

                    employmentStatus:"ACTIVE"

                })
                .lean();



                return employees.map(e => ({

                    _id:
                    e._id.toString(),

                    firstName:
                    e.firstName,

                    lastName:
                    e.lastName,

                    email:
                    e.email,

                    department:
                    e.department

                }));

            }
        );






        const onLeaveIds =
        await step.run(
            "get-on-leave-ids",

            async () => {


                const leaves =
                await LeaveApplication.find({

                    status:"APPROVED",

                    startDate:
                    {
                        $lte:
                        new Date(today.endUTC)
                    },

                    endDate:
                    {
                        $gte:
                        new Date(today.startUTC)
                    }

                })
                .lean();



                return leaves.map(
                    l =>
                    l.employeeId.toString()
                );

            }
        );







        const checkedInIds =
        await step.run(
            "get-checked-in-ids",

            async () => {


                const attendance =
                await Attendance.find({

                    date:
                    {
                        $gte:
                        new Date(today.startUTC),

                        $lt:
                        new Date(today.endUTC)
                    }

                })
                .lean();



                return attendance.map(
                    a =>
                    a.employeeId.toString()
                );

            }
        );






        const absentEmployees =
        activeEmployees.filter(
            emp =>
            !onLeaveIds.includes(emp._id)
            &&
            !checkedInIds.includes(emp._id)
        );







        if(absentEmployees.length > 0){


            await step.run(
                "send-reminder-emails",

                async()=>{


                    const emailPromises =
                    absentEmployees.map(emp =>

                        sendEmail({

                            to:
                            emp.email,


                            subject:
                            "Attendance Reminder — Please Mark Your Attendance",



                            body:

                            `

                            <div style="max-width:600px;font-family:Arial">

                            <h2>
                            Hi ${emp.firstName}, 👋
                            </h2>


                            <p>
                            We noticed you haven't marked attendance today.
                            </p>


                            <p>
                            Deadline was <strong>11:30 AM</strong>.
                            </p>


                            <p>
                            Please check-in or contact admin.
                            </p>


                            <br/>

                            <p>
                            Department:
                            ${emp.department}
                            </p>


                            <br/>

                            <p>
                            Regards,
                            </p>


                            <strong>
                            QuickEMS
                            </strong>


                            </div>

                            `

                        })

                    );


                    await Promise.all(emailPromises);


                    return {
                        emailsSent:
                        absentEmployees.length
                    };


                }
            );


        }





        return {

            totalActive:
            activeEmployees.length,


            onLeave:
            onLeaveIds.length,


            checkedIn:
            checkedInIds.length,


            absent:
            absentEmployees.length

        };

    }

);




// Export all functions

export const functions = [

    autoCheckOut,

    leaveApplicationReminder,

    attendanceReminderCron

];