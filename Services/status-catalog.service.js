const { findAllStatusTypes, findActiveStatusTransitions } = require("../Models/status.model");
const { findActiveFranchiseModules } = require("../Models/dashboard.model");

// Statuses, transitions and modules from the admin-managed masters - the
// CodeIgniter Franchise_status_model. No status id or code is hardcoded:
// behaviour comes from the row flags and the transition table.
//
// Canonical status: the same logical status (system_code) exists once per
// module. Writes store the lowest Active id of the system_code; reads match on
// system_code.

const toStatus = (row) => ({
  id: Number(row.id),
  moduleId: Number(row.franchiseModuleId),
  name: row.statusTypeName,
  systemCode: row.systemCode || "",
  icon: row.icon,
  active: row.status === "Active",
  deleted: row.deletedAt !== null,
  isEntryStatus: row.isEntryStatus === "Y",
  isNoResponseStatus: row.isNoResponseStatus === "Y",
  requiresDropoutReason: row.requiresDropoutReason === "Y",
});

const toModule = (row) => ({
  id: Number(row.id),
  name: row.moduleName,
  code: row.moduleCode,
  dateFilterType: row.dateFilterType,
});

const groupNextCodes = (transitions) =>
  transitions.reduce((nextCodes, { fromSystemCode, toSystemCode }) => {
    nextCodes.set(fromSystemCode, [...(nextCodes.get(fromSystemCode) || []), toSystemCode]);
    return nextCodes;
  }, new Map());

const loadStatusCatalog = async () => {
  const [statusRows, transitions, moduleRows] = await Promise.all([
    findAllStatusTypes(),
    findActiveStatusTransitions(),
    findActiveFranchiseModules(),
  ]);

  const allStatuses = statusRows.map(toStatus);
  const statuses = allStatuses.filter((status) => !status.deleted);

  const canonicalByCode = new Map();
  statuses.forEach((status) => {
    if (status.systemCode && status.active && !canonicalByCode.has(status.systemCode)) {
      canonicalByCode.set(status.systemCode, status);
    }
  });

  // A duplicated module_code keeps its first position with the latest row
  const modulesByCode = new Map();
  moduleRows.map(toModule).forEach((module) => modulesByCode.set(module.code, module));

  return {
    allStatuses,
    statuses,
    allStatusesById: new Map(allStatuses.map((status) => [status.id, status])),
    statusesById: new Map(statuses.map((status) => [status.id, status])),
    canonicalByCode,
    nextCodesByCode: groupNextCodes(transitions),
    modulesByCode,
  };
};

// Canonical id of the status a new / imported lead starts at, or null
const getEntryStatusId = (catalog) => {
  const entry = catalog.statuses.find(
    (status) => status.isEntryStatus && status.active && status.systemCode
  );
  const canonical = entry ? catalog.canonicalByCode.get(entry.systemCode) : null;

  return canonical ? canonical.id : null;
};

const getCanonicalStatusId = (catalog, systemCode) => {
  const canonical = catalog.canonicalByCode.get(systemCode);

  return canonical ? canonical.id : null;
};

const requiresDropoutReason = (catalog, systemCode) =>
  catalog.statuses.some(
    (status) => status.systemCode === systemCode && status.active && status.requiresDropoutReason
  );

const getAllowedNextCodes = (catalog, systemCode) =>
  catalog.nextCodesByCode.get(systemCode) || [];

// Next-status options: Active, configured statuses reachable by an Active transition
const getMovableStatuses = (catalog, systemCode) =>
  getAllowedNextCodes(catalog, systemCode)
    .filter((code) => catalog.canonicalByCode.has(code))
    .map((code) => {
      const status = catalog.canonicalByCode.get(code);

      return {
        id: status.id,
        systemCode: code,
        name: status.name,
        icon: status.icon,
        requiresDropoutReason: requiresDropoutReason(catalog, code),
      };
    });

// Terminal = no onward move and no Change Franchise Type
const isTerminalStatus = (catalog, systemCode) =>
  getMovableStatuses(catalog, systemCode).length === 0;

// Label of No Response history rows (the row flagged is_no_response_status, active or not)
const getNoResponseLabel = (catalog) => {
  const status = catalog.statuses.find((row) => row.isNoResponseStatus);

  return status ? status.name : null;
};

const getStatusName = (catalog, systemCode) => {
  const canonical = catalog.canonicalByCode.get(systemCode);
  const any = catalog.statuses.find((status) => status.systemCode === systemCode);

  return canonical?.name ?? any?.name ?? systemCode;
};

// Every status id (soft-deleted included) a lead's current status can have for a code
const getStatusIdsByCode = (catalog, systemCode) =>
  catalog.allStatuses.filter((status) => status.systemCode === systemCode).map((status) => status.id);

const getStatusIdsMatchingName = (catalog, term) => {
  const needle = term.toLowerCase();

  return catalog.allStatuses
    .filter((status) => status.name.toLowerCase().includes(needle))
    .map((status) => status.id);
};

// One option per Active system_code, for filter dropdowns
const getStatusFilterOptions = (catalog) =>
  [...catalog.canonicalByCode.values()]
    .sort((a, b) => a.id - b.id)
    .map((status) => ({ code: status.systemCode, name: status.name }));

const getModuleFilterOptions = (catalog) =>
  [...catalog.modulesByCode.values()].map((module) => ({
    code: module.code,
    name: module.name,
    dateFilterType: module.dateFilterType,
  }));

// The lead status flow: every Active status and where it can move next
const getStatusFlow = (catalog) => {
  const entryStatusId = getEntryStatusId(catalog);

  return [...catalog.canonicalByCode.values()]
    .sort((a, b) => a.id - b.id)
    .map((status) => {
      const next = getMovableStatuses(catalog, status.systemCode);

      return {
        id: status.id,
        systemCode: status.systemCode,
        name: status.name,
        icon: status.icon,
        isEntryStatus: status.id === entryStatusId,
        requiresDropoutReason: requiresDropoutReason(catalog, status.systemCode),
        isTerminal: next.length === 0,
        next: next.map(({ systemCode, name }) => ({ systemCode, name })),
      };
    });
};

module.exports = {
  loadStatusCatalog,
  getEntryStatusId,
  getCanonicalStatusId,
  requiresDropoutReason,
  getAllowedNextCodes,
  getMovableStatuses,
  isTerminalStatus,
  getNoResponseLabel,
  getStatusName,
  getStatusIdsByCode,
  getStatusIdsMatchingName,
  getStatusFilterOptions,
  getModuleFilterOptions,
  getStatusFlow,
};
