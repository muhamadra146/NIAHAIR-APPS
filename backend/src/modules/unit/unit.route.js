const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");
const { ROLES } = require("../../common/constants/role.constant");
const { getAllController, getByIdController } = require("./unit.controller");
const { syncFromAccurateController } = require("./unit.sync.controller");

const router = Router();

// Static route first — prevents "sync" from being captured as :id
router.post("/sync/accurate", authenticate, authorize(ROLES.SUPER_ADMIN), syncFromAccurateController);

// Read-only CRUD — write is Accurate-owned
router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);

module.exports = router;
