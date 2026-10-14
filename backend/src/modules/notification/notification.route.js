const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const { listController, summaryController, markReadController, markAllReadController } = require("./notification.controller");

// Notifikasi milik user yang login (lonceng di aplikasi)
const router = Router();

router.get("/",            authenticate, listController);
router.get("/summary",     authenticate, summaryController);
router.patch("/read-all",  authenticate, markAllReadController);
router.patch("/:id/read",  authenticate, markReadController);

module.exports = router;
