const { LEAD_SCOPES } = require("../Common/Constants");
const {
  findActiveSources,
  findActiveDropoutReasons,
  findActiveDropoutReasonsByIds,
} = require("../Models/master.model");
const { findActiveSalesDirectors } = require("../Models/sales-director.model");
const { findSalesDirectorAssignments } = require("../Models/franchise-type.model");
const { getActiveFranchiseTypes } = require("./franchise-type.service");
const {
  getAssignableSalesDirectorId,
  getAssignedFranchiseTypeIds,
  getCreatableFranchiseTypeIds,
} = require("./lead-access.service");

// Dropdown data of the lead screens - CodeIgniter Franchise_master_model

// "Name (CODE)", or whichever part exists
const formatFranchiseTypeLabel = (name, code) => {
  const trimmedName = String(name || "").trim();
  const trimmedCode = String(code || "").trim();

  return trimmedName && trimmedCode
    ? `${trimmedName} (${trimmedCode})`
    : trimmedName || trimmedCode;
};

// type: { id, name, code, cityId, cityName } from franchise-type.service
const presentFranchiseType = ({ id, name, code, cityId, cityName }) => ({
  id,
  name,
  code,
  label: formatFranchiseTypeLabel(name, code),
  cityId,
  cityName,
});

// Active franchise types the user works with (every Active type for an ALL-scope role)
const getUserFranchiseTypeOptions = async (auth) => {
  const types = await getActiveFranchiseTypes(getCreatableFranchiseTypeIds(auth));
  
  return types.map(presentFranchiseType);
};

const getSources = async () => {
  const sources = await findActiveSources();

  return sources.map((source) => ({
    id: Number(source.id),
    name: source.sourceName,
    code: source.code,
  }));
};

const getDropoutReasons = async () => {
  const reasons = await findActiveDropoutReasons();

  return reasons.map((reason) => ({ id: Number(reason.id), name: reason.dropoutReason }));
};

const getValidDropoutReasonIds = async (reasonIds) => {
  if (reasonIds.length === 0) {
    return [];
  }

  const reasons = await findActiveDropoutReasonsByIds(reasonIds);

  return reasons.map((reason) => Number(reason.id));
};

const presentSalesDirector = (salesDirector) => ({
  id: Number(salesDirector.id),
  name: salesDirector.fullName,
});

// Sales Directors the user may filter the lead list by
const getAssignees = async ({ identity, access }) => {
  if (access.leadScope === LEAD_SCOPES.OWN) {
    const ownId = getAssignableSalesDirectorId(identity);

    if (ownId === null) {
      return [];
    }

    return (await findActiveSalesDirectors({ id: ownId })).map(presentSalesDirector);
  }

  if (access.leadScope === LEAD_SCOPES.FRANCHISE_TYPES) {
    const typeIds = getAssignedFranchiseTypeIds(identity);

    if (typeIds.length === 0) {
      return [];
    }

    return (
      await findActiveSalesDirectors({
        franchiseTypes: { some: { franchiseTypeId: { in: typeIds } } },
      })
    ).map(presentSalesDirector);
  }

  return (await findActiveSalesDirectors()).map(presentSalesDirector);
};

// franchise type id -> Sales Director id; the earliest active assignment wins
// (the rule the admin lead import uses)
const getSalesDirectorOwners = async (franchiseTypeIds) => {
  if (franchiseTypeIds.length === 0) {
    return new Map();
  }

  const assignments = await findSalesDirectorAssignments(franchiseTypeIds);
  const owners = new Map();

  assignments.forEach(({ franchiseTypeId, salesDirectorId }) => {
    const typeId = Number(franchiseTypeId);

    if (!owners.has(typeId)) {
      owners.set(typeId, Number(salesDirectorId));
    }
  });

  return owners;
};

module.exports = {
  formatFranchiseTypeLabel,
  presentFranchiseType,
  getUserFranchiseTypeOptions,
  getSources,
  getDropoutReasons,
  getValidDropoutReasonIds,
  getAssignees,
  getSalesDirectorOwners,
};
