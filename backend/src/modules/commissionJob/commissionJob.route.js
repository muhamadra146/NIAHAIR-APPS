const router = require("express").Router({ mergeParams: true });
const authenticate = require("../../middlewares/auth.middleware");
const ctrl = require("./commissionJob.controller");

// mergeParams: true → categoryId tersedia dari parent router
router.get("/",        authenticate, ctrl.list);
router.post("/",       authenticate, ctrl.create);
router.put("/:id",     authenticate, ctrl.update);
router.delete("/:id",  authenticate, ctrl.remove);

module.exports = router;
