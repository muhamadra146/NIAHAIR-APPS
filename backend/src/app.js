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
const treatmentRouter          = require("./modules/treatment/treatment.route");


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


// global error handler — must be last
app.use(errorHandler);


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});