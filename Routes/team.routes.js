const express = require("express");
const { ROLES } = require("../Common/Constants");
const { authenticate, authorizeRole } = require("../Config/Authorize");
const {
  getAssignments,
  getSalesDirector,
  getSalesManager,
  getSalesManagers,
} = require("../Controllers/team.controller");

// Mounted at the API prefix, so authentication is per route (never router-wide)
const router = express.Router();
const salesDirector = [authenticate, authorizeRole(ROLES.SALES_DIRECTOR)];
const salesManager = [authenticate, authorizeRole(ROLES.FRANCHISE_SALES_MANAGER)];

router.get("/team/franchise-sales-managers", salesDirector, getSalesManagers);
router.get("/team/franchise-sales-managers/:id", salesDirector, getSalesManager);
router.get("/team/sales-director", salesManager, getSalesDirector);
router.get("/franchise-types/assignments", salesDirector, getAssignments);

module.exports = router;
