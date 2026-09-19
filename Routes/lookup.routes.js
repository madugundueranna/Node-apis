const express = require("express");
const { ROLES } = require("../Common/Constants");
const { authenticate, authorizeRole } = require("../Config/Authorize");
const {
  getCities,
  getCityFranchiseTypes,
  getCountries,
  getHealth,
  getInternalTypes,
  getLeadLookups,
  getLeadStatuses,
  getStates,
} = require("../Controllers/lookup.controller");

// Mounted at the API prefix, so authentication is per route (never router-wide)
const router = express.Router();
const crmUser = [authenticate, authorizeRole(ROLES.SALES_DIRECTOR, ROLES.FRANCHISE_SALES_MANAGER)];

router.get("/health", getHealth);

router.get("/lookups", crmUser, getLeadLookups);
router.get("/lead-statuses", crmUser, getLeadStatuses);

router.get("/change-type/internal", crmUser, getInternalTypes);
router.get("/change-type/countries", crmUser, getCountries);
router.get("/change-type/states", crmUser, getStates);
router.get("/change-type/cities", crmUser, getCities);
router.get("/change-type/franchise-types", crmUser, getCityFranchiseTypes);

module.exports = router;
