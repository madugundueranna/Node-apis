const express = require("express");
const { API_PREFIX } = require("../Common/Constants");
const authRoutes = require("./auth.routes");
const dashboardRoutes = require("./dashboard.routes");
const leadRoutes = require("./lead.routes");
const lookupRoutes = require("./lookup.routes");
const locationRoutes = require("./location.routes");
const teamRoutes = require("./team.routes");

const router = express.Router();

// API responses carry session / personal data - never cache them
router.use(API_PREFIX, (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.use(`${API_PREFIX}/auth`, authRoutes);
router.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
router.use(`${API_PREFIX}/leads`, leadRoutes);
/*
{{baseUrl}}/leads?module=FR-FUTURE&status=FOLLOWUP&franchiseType=38&source=&assignedTo=&dateField=followup&dateFrom=2026-09-18&dateTo=2026-09-18&search=&page=1&per_page=10&sort=date&direction=asc
{{baseUrl}}/leads?module=FR-PENDING&status=&franchiseType=&source=&assignedTo=me&dateField=followup&dateFrom=&dateTo=2026-09-17&search=&page=1&per_page=20&sort=date&direction=asc
{{baseUrl}}/leads?module=&status=&franchiseType=&source=&assignedTo=&dateField=created&dateFrom=&dateTo=&search=9063285543&page=1&per_page=10&sort=createdAt&direction=desc
{{baseUrl}}/leads?module=&status=CALL&franchiseType=39&source=2&assignedTo=unassigned&dateField=followup&dateFrom=&dateTo=&search=&page=1&per_page=25&sort=status&direction=asc
{{baseUrl}}/leads?module=&status=&franchiseType=&source=&assignedTo=16&dateField=created&dateFrom=2026-09-01&dateTo=2026-09-18&search=&page=2&per_page=10&sort=createdAt&direction=desc

*/
router.use(`${API_PREFIX}/locations`, locationRoutes);
router.use(API_PREFIX, lookupRoutes);
router.use(API_PREFIX, teamRoutes);

module.exports = router;
