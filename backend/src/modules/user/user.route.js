const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const {
  getAllController, getByIdController, createController,
  updateController, resetPasswordController, changeOwnPasswordController, deactivateController, deleteController,
} = require("./user.controller");
const { createUserSchema, updateUserSchema, resetPasswordSchema, changeOwnPasswordSchema } = require("./user.validation");

const router = Router();

router.get("/",    authenticate, authorize(ROLES.SUPER_ADMIN), getAllController);
router.post("/",   authenticate, authorize(ROLES.SUPER_ADMIN), validate(createUserSchema), createController);
router.get("/:id", authenticate, getByIdController);
router.put("/:id", authenticate, authorize(ROLES.SUPER_ADMIN), validate(updateUserSchema), updateController);

// Self-service: change own password (any authenticated user)
router.patch("/me/password", authenticate, validate(changeOwnPasswordSchema), changeOwnPasswordController);

// Static sub-resource routes before /:id catch-all
router.patch("/:id/password", authenticate, authorize(ROLES.SUPER_ADMIN), validate(resetPasswordSchema), resetPasswordController);
router.delete("/:id",         authenticate, authorize(ROLES.SUPER_ADMIN), deleteController);

module.exports = router;
