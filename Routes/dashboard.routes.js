const express = require("express");
const { ROLES } = require("../Common/Constants");
const { authenticate, authorizeRole } = require("../Config/Authorize");
const { getFranchiseLeadDashboard } = require("../Controllers/dashboard.controller");

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorizeRole(ROLES.SALES_DIRECTOR, ROLES.FRANCHISE_SALES_MANAGER),
  getFranchiseLeadDashboard
);

module.exports = router;
