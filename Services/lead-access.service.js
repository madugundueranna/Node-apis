const { LEAD_SCOPES, ROLES } = require("../Common/Constants");
const { APP_ERRORS, createAppError } = require("../Common/AppError");

// Who may do what with leads, from the logged-in identity and the role's
// airpropx_franchise_crm_role_access row.

// Leads can be assigned only to Sales Directors: airpropx_franchise_leads.
// sales_director_id is a foreign key to airpropx_sales_directors. A Franchise
// Sales Manager is a users row, so leads are never assigned to one.
const getAssignableSalesDirectorId = (identity) =>
  identity.type === ROLES.SALES_DIRECTOR ? identity.id : null;

const getAssignedFranchiseTypeIds = (identity, { activeOnly = false } = {}) =>
  identity.franchiseTypes
    .filter((type) => !activeOnly || type.status === "Active")
    .map((type) => type.id);

// Franchise types the user may use for a new or imported lead; null = any Active type
const getCreatableFranchiseTypeIds = ({ identity, access }) =>
  access.leadScope === LEAD_SCOPES.ALL
    ? null
    : getAssignedFranchiseTypeIds(identity, { activeOnly: true });

// permission: canAddLead | canEditLead | canImportLeads | canChangeFranchiseType
const requirePermission = (access, permission) => {
  if (!access[permission]) {
    throw createAppError(APP_ERRORS.PERMISSION_DENIED);
  }
};

module.exports = {
  getAssignableSalesDirectorId,
  getAssignedFranchiseTypeIds,
  getCreatableFranchiseTypeIds,
  requirePermission,
};
