const { Router }    = require("express");
const authenticate  = require("../../middlewares/auth.middleware");
const upload        = require("../../middlewares/upload.middleware");
const { listController, uploadController, deleteController } = require("./appointmentPhoto.controller");

const router = Router({ mergeParams: true });

router.get("/",              authenticate, listController);
router.post("/",             authenticate, upload.single("photo"), uploadController);
router.delete("/:photoId",   authenticate, deleteController);

module.exports = router;
