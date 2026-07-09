const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const { deleteController } = require("./materialUsage.controller");

const router = Router();

router.delete("/:id", authenticate, deleteController);

module.exports = router;
