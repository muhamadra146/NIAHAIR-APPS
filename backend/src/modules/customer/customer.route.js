const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validate.middleware");
const { ROLES } = require("../../common/constants/role.constant");
const { createCustomerSchema, updateCustomerSchema } = require("./customer.validation");
const { createNoteSchema, updateNoteSchema } = require("./customerNote.validation");
const {
  getAllController,
  getByIdController,
  createController,
  updateController,
} = require("./customer.controller");
const { syncFromAccurateController } = require("./customer.sync.controller");
const { syncToAccurateController, repairCustomerNoController, retryCustomerSyncController } = require("./customer.push.controller");
const { getNotesController, createNoteController, updateNoteController, deleteNoteController } = require("./customerNote.controller");

const router = Router();

// Sync — must be declared before /:id routes to prevent "sync" matching as an id param
router.post("/sync/accurate",        authenticate, authorize(ROLES.SUPER_ADMIN), syncFromAccurateController);
router.post("/repair/customer-no",   authenticate, authorize(ROLES.SUPER_ADMIN), repairCustomerNoController);
router.post("/retry/accurate-sync",  authenticate, authorize(ROLES.SUPER_ADMIN), retryCustomerSyncController);

// Read — POS_ROLES + OFFICE + FINANCE
const READ_ROLES  = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER, ROLES.OFFICE, ROLES.FINANCE];
// Write — POS_ROLES + OFFICE (FINANCE = view-only)
const WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER, ROLES.OFFICE];

// CRUD
router.get("/",    authenticate, authorize(...READ_ROLES),  getAllController);
router.get("/:id", authenticate, authorize(...READ_ROLES),  getByIdController);
router.post("/",   authenticate, authorize(...WRITE_ROLES), validate(createCustomerSchema), createController);
router.put("/:id", authenticate, authorize(...WRITE_ROLES), validate(updateCustomerSchema), updateController);

// Notes (CRM-008)
router.get(   "/:id/notes",           authenticate, authorize(...READ_ROLES),  getNotesController);
router.post(  "/:id/notes",           authenticate, authorize(...WRITE_ROLES), validate(createNoteSchema), createNoteController);
router.put(   "/:id/notes/:noteId",   authenticate, authorize(...WRITE_ROLES), validate(updateNoteSchema), updateNoteController);
router.delete("/:id/notes/:noteId",   authenticate, authorize(...WRITE_ROLES), deleteNoteController);

// Manual push sync retry
router.post("/:id/sync/accurate", authenticate, syncToAccurateController);

module.exports = router;
