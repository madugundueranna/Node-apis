const express = require("express");
const { ROLES } = require("../Common/Constants");
const { authenticate, authorizeRole } = require("../Config/Authorize");
const {
  createLead,
  getLead,
  getLeads,
  getNextActivity,
  importLeadRows,
  saveActivity,
  saveLeadNoResponse,
  updateLead,
} = require("../Controllers/lead.controller");

const router = express.Router();

router.use(authenticate, authorizeRole(ROLES.SALES_DIRECTOR, ROLES.FRANCHISE_SALES_MANAGER));

router.get("/", getLeads);
router.post("/", createLead);
router.post("/import", importLeadRows);
router.get("/:id", getLead);
router.put("/:id", updateLead);
router.get("/:id/next-activity", getNextActivity);
router.post("/:id/activity", saveActivity);
router.post("/:id/no-response", saveLeadNoResponse);

module.exports = router;
