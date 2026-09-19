const { DATE_BUCKETS, LEAD_SCOPES } = require("../Common/Constants");
const { getTimezone } = require("../Config/Config");
const {
  findFranchiseStatusTypes,
  findActiveFranchiseModules,
  findFranchiseSubModules,
} = require("../Models/dashboard.model");
const { countLeadsByStatusBucket } = require("./lead.service");
const { getActiveFranchiseTypes } = require("./franchise-type.service");

// Franchise Lead Dashboard - same data as the CodeIgniter CRM: structure from
// the admin-managed masters, counts over the user's visible leads.

const getToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: getTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const toStatus = (statusType) => ({
  id: Number(statusType.id),
  moduleId: Number(statusType.franchiseModuleId),
  subModuleId: Number(statusType.franchiseSubModuleId),
  name: statusType.statusTypeName,
  systemCode: statusType.systemCode || "",
  icon: statusType.icon,
  active: statusType.status === "Active",
  isEntryStatus: statusType.isEntryStatus === "Y",
  showOnDashboard: statusType.showOnDashboard === "Y",
  showAsSummaryCard: statusType.showAsSummaryCard === "Y",
  summaryCardOrder: statusType.summaryCardOrder,
});

const toModule = (module) => ({
  id: Number(module.id),
  name: module.moduleName,
  code: module.moduleCode,
  dateFilterType: module.dateFilterType,
  layout: module.dashboardLayout,
});

const toSubModule = (subModule) => ({
  id: Number(subModule.id),
  moduleId: Number(subModule.franchiseModuleId),
  name: subModule.subModuleName,
});

const getDashboardCatalog = async () => {
  const [statusTypes, modules, subModules] = await Promise.all([
    findFranchiseStatusTypes(),
    findActiveFranchiseModules(),
    findFranchiseSubModules(),
  ]);

  return {
    statuses: statusTypes
      .filter((statusType) => statusType.deletedAt === null)
      .map(toStatus),
    // Every status type id, soft-deleted ones too, to its system_code
    statusCodes: new Map(
      statusTypes.map((statusType) => [Number(statusType.id), statusType.systemCode])
    ),
    modules: modules.map(toModule),
    subModules: subModules.map(toSubModule),
  };
};

// Status a new lead starts at: the lowest Active id with the entry status's system_code
const findEntryStatusId = (statuses) => {
  const entry = statuses.find(
    (status) => status.isEntryStatus && status.active && status.systemCode
  );

  if (!entry) {
    return null;
  }

  return statuses.find(
    (status) => status.active && status.systemCode === entry.systemCode
  ).id;
};

const sumBuckets = (buckets = {}) =>
  Object.values(buckets).reduce((total, count) => total + count, 0);

// A module with a date filter counts one bucket; any other module counts all
const countForModule = (counts, systemCode, dateFilterType) => {
  const buckets = counts[systemCode] || {};

  return DATE_BUCKETS.includes(dateFilterType)
    ? buckets[dateFilterType] || 0
    : sumBuckets(buckets);
};

const buildModuleGroups = (module, statuses, subModulesById, counts) => {
  const groups = new Map();

  statuses
    .filter((status) => status.moduleId === module.id)
    .forEach((status) => {
      const subModule = subModulesById.get(status.subModuleId);
      const groupId = subModule ? subModule.id : 0;

      if (!groups.has(groupId)) {
        groups.set(groupId, {
          id: groupId,
          name: subModule ? subModule.name : module.name,
          statuses: [],
        });
      }

      groups.get(groupId).statuses.push({
        id: status.id,
        systemCode: status.systemCode,
        name: status.name,
        icon: status.icon,
        count: countForModule(counts, status.systemCode, module.dateFilterType),
        moduleCode: module.code,
      });
    });

  return [...groups.values()].sort((a, b) => a.id - b.id);
};

// Today / Pending / Future / Post Sale sections with their status cards
const buildModuleSections = (catalog, counts) => {
  const dashboardStatuses = catalog.statuses.filter(
    (status) => status.active && status.showOnDashboard && status.systemCode
  );
  const subModulesById = new Map(
    catalog.subModules.map((subModule) => [subModule.id, subModule])
  );

  // A duplicated module_code keeps its first position with the latest row
  const modulesByCode = new Map();
  catalog.modules.forEach((module) => modulesByCode.set(module.code, module));

  return [...modulesByCode.values()].map((module) => {
    const groups = buildModuleGroups(module, dashboardStatuses, subModulesById, counts);

    return {
      id: module.id,
      code: module.code,
      name: module.name,
      dateFilterType: module.dateFilterType,
      layout: module.layout,
      groups,
    };
  });
};

// Top cards (Visited / Agreement): all-time counts, one card per system_code
const buildSummaryCards = (catalog, counts) => {
  const modulesById = new Map(catalog.modules.map((module) => [module.id, module]));
  const seenSystemCodes = new Set();

  return catalog.statuses
    .filter((status) => status.active && status.showAsSummaryCard && status.systemCode)
    .sort((a, b) =>
      a.summaryCardOrder === b.summaryCardOrder
        ? a.id - b.id
        : a.summaryCardOrder - b.summaryCardOrder
    )
    .filter((status) => {
      if (seenSystemCodes.has(status.systemCode)) {
        return false;
      }
      seenSystemCodes.add(status.systemCode);
      return true;
    })
    .map((status) => {
      const module = modulesById.get(status.moduleId);

      return {
        systemCode: status.systemCode,
        name: status.name,
        icon: status.icon,
        count: sumBuckets(counts[status.systemCode]),
        moduleCode: module ? module.code : null,
      };
    });
};

const toFranchiseTypeLabel = (name, code) => {
  const trimmedName = String(name || "").trim();
  const trimmedCode = String(code || "").trim();

  return trimmedName && trimmedCode
    ? `${trimmedName} (${trimmedCode})`
    : trimmedName || trimmedCode;
};

// Dropdown: the user's Active franchise types, or every Active type for an ALL-scope role
const getDashboardFranchiseTypes = async ({ identity, access }) => {
  const franchiseTypeIds =
    access.leadScope === LEAD_SCOPES.ALL
      ? null
      : identity.franchiseTypes
          .filter((type) => type.status === "Active")
          .map((type) => type.id);

  const franchiseTypes = await getActiveFranchiseTypes(franchiseTypeIds);

  return franchiseTypes.map(({ id, name, code, cityId, cityName }) => ({
    id,
    name,
    code,
    label: toFranchiseTypeLabel(name, code),
    cityId,
    cityName,
  }));
};

// auth = authenticated { identity, access }; franchiseTypeId = optional filter (null = all)
const getDashboard = async (auth, franchiseTypeId = null) => {
  const catalog = await getDashboardCatalog();

  const [counts, franchiseTypes] = await Promise.all([
    countLeadsByStatusBucket({
      auth,
      franchiseTypeId,
      entryStatusId: findEntryStatusId(catalog.statuses),
      statusCodes: catalog.statusCodes,
      today: getToday(),
    }),
    getDashboardFranchiseTypes(auth),
  ]);

  return {
    selectedFranchiseTypeId: franchiseTypeId,
    franchiseTypes,
    summaryCards: buildSummaryCards(catalog, counts),
    modules: buildModuleSections(catalog, counts),
  };
};

module.exports = {
  getDashboard,
};
