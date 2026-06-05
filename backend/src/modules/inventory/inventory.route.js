const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const { getMovementsController, getInventoriesController } = require("./inventory.controller");

const router = Router();

router.get("/movements", authenticate, getMovementsController);
router.get("/",          authenticate, getInventoriesController);

module.exports = router;
