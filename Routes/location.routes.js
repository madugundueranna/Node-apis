const express = require("express");
const { ROLES } = require("../Common/Constants");
const { authenticate, authorizeRole } = require("../Config/Authorize");
const {
  getCities,
  getCountries,
  getLocalities,
  getStates,
} = require("../Controllers/location.controller");

const router = express.Router();

router.use(authenticate, authorizeRole(ROLES.SALES_DIRECTOR, ROLES.FRANCHISE_SALES_MANAGER));

router.get("/countries", getCountries);
router.get("/states", getStates);
router.get("/cities", getCities);
router.get("/localities", getLocalities);

module.exports = router;
