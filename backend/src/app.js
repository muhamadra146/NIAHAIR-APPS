require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const prisma = require("./config/prisma");
const {
    accurateRequest
} = require("./modules/accurate/accurate.client");
const errorHandler = require("./middlewares/error.middleware");
const { success } = require("./common/responses/apiResponse");
const authRouter = require("./modules/auth/auth.route");
const customerRouter = require("./modules/customer/customer.route");
const itemRouter = require("./modules/item/item.route");
const employeeRouter = require("./modules/employee/employee.route");
const employeeRoleRouter = require("./modules/employeeRole/employeeRole.route");
const branchRouter = require("./modules/branch/branch.route");
const commissionRuleRouter     = require("./modules/commissionRule/commissionRule.route");
const commissionCategoryRouter = require("./modules/commissionCategory/commissionCategory.route");
const unitRouter               = require("./modules/unit/unit.route");
const treatmentRouter               = require("./modules/treatment/treatment.route");
const treatmentItemRouter           = require("./modules/treatmentItem/treatmentItem.route");
const treatmentAssignmentRouter     = require("./modules/treatmentAssignment/treatmentAssignment.route");
const commissionRouter              = require("./modules/commission/commission.route");
const invoiceRouter                 = require("./modules/invoice/invoice.route");
const appointmentRouter             = require("./modules/appointment/appointment.route");
const appointmentPhotoRouter        = require("./modules/appointmentPhoto/appointmentPhoto.route");
const depositRouter                 = require("./modules/deposit/deposit.route");
const paymentMethodRouter           = require("./modules/paymentMethod/paymentMethod.route");
const cashAccountRouter             = require("./modules/cashAccount/cashAccount.route");
const paymentRouter                 = require("./modules/payment/payment.route");
const inventoryRouter               = require("./modules/inventory/inventory.route");
const warehouseRouter               = require("./modules/warehouse/warehouse.route");
const userRouter                    = require("./modules/user/user.route");
const userRoleRouter                = require("./modules/userRole/userRole.route");
const syncQueueRouter               = require("./modules/syncQueue/syncQueue.route");
const depositPaymentRouter          = require("./modules/depositPayment/depositPayment.route");
const shiftRouter                   = require("./modules/shift/shift.route");
const staffScheduleRouter           = require("./modules/staffSchedule/staffSchedule.route");
const attendanceRouter              = require("./modules/attendance/attendance.route");
const salaryRouter                  = require("./modules/salary/salary.route");
const loanRouter                    = require("./modules/loan/loan.route");
const payrollRouter                 = require("./modules/payroll/payroll.route");
const reportRouter                  = require("./modules/report/report.route");
const consultationRouter            = require("./modules/consultation/consultation.route");
const leaveRouter                   = require("./modules/leave/leave.route");
const leaveTypeRouter               = require("./modules/leaveType/leaveType.route");
const leaveQuotaRouter              = require("./modules/leaveQuota/leaveQuota.route");
const correctionRouter              = require("./modules/correction/correction.route");


const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());


app.get("/", (req, res) => {
    success(res, null, "Salon ERP API Running");
});

app.get("/health/db", async (req, res) => {
    try {

        const result = await prisma.$queryRaw`
            SELECT NOW()
        `;

        success(res, {
            database: "CONNECTED",
            result
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
});


app.use("/auth", authRouter);
app.use("/customers", customerRouter);
app.use("/items", itemRouter);
app.use("/employees", employeeRouter);
app.use("/employee-roles", employeeRoleRouter);
app.use("/branches", branchRouter);
app.use("/commission-rules",      commissionRuleRouter);
app.use("/commission-categories", commissionCategoryRouter);
app.use("/units",               unitRouter);
app.use("/treatment-sessions", treatmentRouter);
app.use("/treatment-items",    treatmentItemRouter);
app.use("/treatment-items/:itemId/assignments", treatmentAssignmentRouter);
app.use("/treatment-assignments",              treatmentAssignmentRouter);
app.use("/commissions",                        commissionRouter);
app.use("/invoices",                           invoiceRouter);
app.use("/appointments",                       appointmentRouter);
app.use("/appointments/:appointmentId/photos", appointmentPhotoRouter);
app.use("/appointments/:appointmentId/deposits", depositRouter);
app.use("/deposits",                             depositRouter);
app.use("/payment-methods",                      paymentMethodRouter);
app.use("/cash-accounts",                        cashAccountRouter);
app.use("/invoices/:invoiceId/payments",         paymentRouter);
app.use("/payments",                             paymentRouter);
app.use("/inventory",                            inventoryRouter);
app.use("/warehouses",                           warehouseRouter);
app.use("/users",                                userRouter);
app.use("/user-roles",                           userRoleRouter);
app.use("/sync-queues",                          syncQueueRouter);
app.use("/deposits/:depositId/payments",         depositPaymentRouter);
app.use("/deposit-payments",                     depositPaymentRouter);
app.use("/shifts",                               shiftRouter);
app.use("/staff-schedules",                      staffScheduleRouter);
app.use("/attendance",                           attendanceRouter);
app.use("/salary-settings",                      salaryRouter);
app.use("/loans",                                loanRouter);
app.use("/payroll",                              payrollRouter);
app.use("/reports",                              reportRouter);
app.use("/consultation-notes",                   consultationRouter);
app.use("/leaves",                               leaveRouter);
app.use("/leave-types",                          leaveTypeRouter);
app.use("/leave-quotas",                         leaveQuotaRouter);
app.use("/attendance-corrections",               correctionRouter);


// global error handler — must be last
app.use(errorHandler);


const { startWorkers } = require("./workers");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
    startWorkers();
});