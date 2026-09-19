const { findActiveFranchiseModules } = require("../Models/dashboard.model");
const {
  getAssignees,
  getDropoutReasons,
  getSources,
  getUserFranchiseTypeOptions,
} = require("./master.service");
const {
  getModuleFilterOptions,
  getStatusFilterOptions,
  getStatusFlow,
  loadStatusCatalog,
} = require("./status-catalog.service");

// Dropdown data for the lead screens - CodeIgniter Api_lookups::index
const getLookups = async (auth) => {
  const [catalog, franchiseTypes, sources, assignees, dropoutReasons] = await Promise.all([
    loadStatusCatalog(),
    getUserFranchiseTypeOptions(auth),
    getSources(),
    getAssignees(auth),
    getDropoutReasons(),
  ]);

  return {
    franchiseTypes,
    sources,
    statuses: getStatusFilterOptions(catalog),
    modules: getModuleFilterOptions(catalog),
    assignees,
    dropoutReasons,
    permissions: {
      leadScope: auth.access.leadScope,
      canAddLead: auth.access.canAddLead,
      canEditLead: auth.access.canEditLead,
      canImportLeads: auth.access.canImportLeads,
      canChangeFranchiseType: auth.access.canChangeFranchiseType,
    },
  };
};

// Every Active lead status and the statuses it can move to
const getLeadStatusFlow = async () => getStatusFlow(await loadStatusCatalog());

// Uptime check that also reads from the database
const checkHealth = async () => {
  await findActiveFranchiseModules();

  return { time: new Date().toISOString() };
};

module.exports = {
  getLookups,
  getLeadStatusFlow,
  checkHealth,
};
