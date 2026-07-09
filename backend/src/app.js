process.env.TZ = "Asia/Jakarta"; // WIB — must be set before any Date ops
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
const permissionRouter              = require("./modules/permission/permission.route");
const sickLeaveRouter               = require("./modules/sickLeave/sickLeave.route");
const membershipRouter              = require("./modules/membership/membership.route");
const stockTransferRouter           = require("./modules/stockTransfer/stockTransfer.route");
const settingRouter                 = require("./modules/setting/setting.route");
const itemCategoryRouter            = require("./modules/itemCategory/itemCategory.route");
const holidayRouter                 = require("./modules/holiday/holiday.route");
const materialUsageItemRouter       = require("./modules/materialUsage/materialUsageItem.route");


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


const v1 = express.Router();

v1.use("/auth", authRouter);
v1.use("/customers", customerRouter);
v1.use("/items", itemRouter);
v1.use("/employees", employeeRouter);
v1.use("/employee-roles", employeeRoleRouter);
v1.use("/branches", branchRouter);
v1.use("/commission-rules",      commissionRuleRouter);
v1.use("/commission-categories", commissionCategoryRouter);
v1.use("/units",               unitRouter);
v1.use("/treatment-sessions", treatmentRouter);
v1.use("/treatment-items",    treatmentItemRouter);
v1.use("/treatment-items/:itemId/assignments", treatmentAssignmentRouter);
v1.use("/treatment-assignments",              treatmentAssignmentRouter);
v1.use("/commissions",                        commissionRouter);
v1.use("/invoices",                           invoiceRouter);
v1.use("/appointments",                       appointmentRouter);
v1.use("/appointments/:appointmentId/photos", appointmentPhotoRouter);
v1.use("/appointments/:appointmentId/deposits", depositRouter);
v1.use("/deposits",                             depositRouter);
v1.use("/payment-methods",                      paymentMethodRouter);
v1.use("/cash-accounts",                        cashAccountRouter);
v1.use("/invoices/:invoiceId/payments",         paymentRouter);
v1.use("/payments",                             paymentRouter);
v1.use("/inventory",                            inventoryRouter);
v1.use("/warehouses",                           warehouseRouter);
v1.use("/users",                                userRouter);
v1.use("/user-roles",                           userRoleRouter);
v1.use("/sync-queues",                          syncQueueRouter);
v1.use("/deposits/:depositId/payments",         depositPaymentRouter);
v1.use("/deposit-payments",                     depositPaymentRouter);
v1.use("/shifts",                               shiftRouter);
v1.use("/staff-schedules",                      staffScheduleRouter);
v1.use("/attendance",                           attendanceRouter);
v1.use("/salary-settings",                      salaryRouter);
v1.use("/loans",                                loanRouter);
v1.use("/payroll",                              payrollRouter);
v1.use("/holidays",                             holidayRouter);
v1.use("/reports",                              reportRouter);
v1.use("/consultation-notes",                   consultationRouter);
v1.use("/leaves",                               leaveRouter);
v1.use("/leave-types",                          leaveTypeRouter);
v1.use("/leave-quotas",                         leaveQuotaRouter);
v1.use("/attendance-corrections",               correctionRouter);
v1.use("/permissions",                          permissionRouter);
v1.use("/sick-leaves",                          sickLeaveRouter);
v1.use("/memberships",                          membershipRouter);
v1.use("/stock-transfers",                      stockTransferRouter);
v1.use("/app-settings",                         settingRouter);
v1.use("/item-categories",                      itemCategoryRouter);
v1.use("/material-usage-items",                 materialUsageItemRouter);

app.use("/api/v1", v1);


// global error handler — must be last
app.use(errorHandler);


const { startWorkers } = require("./workers");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
    startWorkers();
});