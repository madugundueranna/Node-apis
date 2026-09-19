const { LEAD_MESSAGES } = require("../Common/Constants");
const { createValidationError } = require("../Common/AppError");
const {
  formatDisplayDate,
  formatLocalDisplayDate,
  formatTime,
  fromDateColumn,
  getToday,
  localDayBoundaryToUtc,
  toDateColumn,
} = require("../Common/Dates");
const {
  CURRENT_HISTORY,
  LIVE_LEADS,
  findLeadSortRows,
  findLeadsByIds,
} = require("../Models/lead.model");
const {
  findLeadDropouts,
  findLeadHistory,
  findLeadTransfers,
} = require("../Models/lead-history.model");
const { buildLeadScope } = require("./lead.service");
const { getAssignableSalesDirectorId } = require("./lead-access.service");
const { formatFranchiseTypeLabel } = require("./master.service");
const {
  findScopedLeadOrFail,
  presentLead,
  presentLeadListRow,
  toLeadRecords,
} = require("./lead-record.service");
const {
  getEntryStatusId,
  getNoResponseLabel,
  getStatusIdsByCode,
  getStatusIdsMatchingName,
  getStatusName,
  loadStatusCatalog,
} = require("./status-catalog.service");

// Lead list and details - CodeIgniter Franchise_lead_model, always inside
// the logged-in user's lead scope.

const MATCH_NONE = { id: { in: [] } };

const withCurrentHistory = (condition) => ({
  statusHistory: { some: { ...CURRENT_HISTORY, ...condition } },
});

const WITHOUT_CURRENT_HISTORY = { statusHistory: { none: CURRENT_HISTORY } };

// Leads whose current status is one of statusIds (the entry status also
// covers leads that were never actioned)
const currentStatusCondition = (statusIds, entryStatusId) => {
  if (statusIds.length === 0) {
    return MATCH_NONE;
  }

  const conditions = [withCurrentHistory({ futureStatusId: { in: statusIds } })];

  if (entryStatusId !== null && statusIds.includes(entryStatusId)) {
    conditions.push(WITHOUT_CURRENT_HISTORY, withCurrentHistory({ futureStatusId: null }));
  }

  return { OR: conditions };
};

// Module date bucket on the current follow-up date
const moduleBucketCondition = (dateFilterType, today) => {
  const todayDate = toDateColumn(today);

  if (dateFilterType === "today") {
    return {
      OR: [WITHOUT_CURRENT_HISTORY, withCurrentHistory({ futureStatusDate: todayDate })],
    };
  }

  if (dateFilterType === "pending") {
    return withCurrentHistory({ futureStatusDate: { lt: todayDate } });
  }

  if (dateFilterType === "future") {
    return withCurrentHistory({ futureStatusDate: { gt: todayDate } });
  }

  return null;
};

const assignedToCondition = (auth, assignedTo) => {
  if (assignedTo === "") {
    return null;
  }

  if (assignedTo === "unassigned") {
    return { salesDirectorId: null };
  }

  if (assignedTo === "me") {
    const ownId = getAssignableSalesDirectorId(auth.identity);

    return ownId === null ? MATCH_NONE : { salesDirectorId: ownId };
  }

  return { salesDirectorId: assignedTo };
};

const dateRangeCondition = ({ dateField, dateFrom, dateTo }) => {
  if (!dateFrom && !dateTo) {
    return null;
  }

  if (dateField === "created") {
    return {
      createdAt: {
        ...(dateFrom ? { gte: localDayBoundaryToUtc(dateFrom) } : {}),
        ...(dateTo ? { lte: localDayBoundaryToUtc(dateTo, true) } : {}),
      },
    };
  }

  return withCurrentHistory({
    futureStatusDate: {
      ...(dateFrom ? { gte: toDateColumn(dateFrom) } : {}),
      ...(dateTo ? { lte: toDateColumn(dateTo) } : {}),
    },
  });
};

const searchCondition = (search, catalog) => {
  const contains = { contains: search };

  return {
    OR: [
      { customerName: contains },
      { mobileNumber: contains },
      { emailId: contains },
      {
        franchiseType: {
          is: { OR: [{ franchiseTypeName: contains }, { franchiseTypeCode: contains }] },
        },
      },
      { source: { is: { sourceName: contains } } },
      { salesDirector: { is: { fullName: contains } } },
      currentStatusCondition(getStatusIdsMatchingName(catalog, search), getEntryStatusId(catalog)),
    ],
  };
};

const buildLeadListWhere = ({ auth, filters, catalog, today }) => {
  const scope = buildLeadScope(auth);
  const conditions = [LIVE_LEADS, scope ?? MATCH_NONE];

  if (filters.module) {
    const module = catalog.modulesByCode.get(filters.module);

    if (!module) {
      throw createValidationError(LEAD_MESSAGES.UNKNOWN_MODULE);
    }

    conditions.push(moduleBucketCondition(module.dateFilterType, today));
  }

  if (filters.status) {
    conditions.push(
      currentStatusCondition(getStatusIdsByCode(catalog, filters.status), getEntryStatusId(catalog))
    );
  }

  if (filters.franchiseTypeId) {
    conditions.push({ franchiseTypeId: filters.franchiseTypeId });
  }

  if (filters.sourceId) {
    conditions.push({ sourceId: filters.sourceId });
  }

  conditions.push(assignedToCondition(auth, filters.assignedTo));
  conditions.push(dateRangeCondition(filters));

  if (filters.search) {
    conditions.push(searchCondition(filters.search, catalog));
  }

  return { AND: conditions.filter(Boolean) };
};

// MySQL ordering: NULL sorts first ascending, last descending
const compareValues = (a, b) => {
  if (a === b) {
    return 0;
  }
  if (a === null || a === undefined) {
    return -1;
  }
  if (b === null || b === undefined) {
    return 1;
  }
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b, "en", { sensitivity: "base" });
  }

  return a < b ? -1 : 1;
};

const SORT_VALUES = {
  name: (row) => row.customerName,
  date: (row) => fromDateColumn(row.statusHistory[0]?.futureStatusDate ?? null),
  phone: (row) => row.mobileNumber,
  franchiseType: (row) => row.franchiseType?.franchiseTypeName ?? null,
  status: (row, lead) => lead.currentStatusName,
  createdBy: (row, lead) => lead.createdByDisplay,
  createdAt: (row) => (row.createdAt ? row.createdAt.getTime() : null),
};

// Default: never-actioned leads first, then latest follow-up date, then newest
const compareDefault = (a, b) =>
  compareValues(a.row.statusHistory.length === 0, b.row.statusHistory.length === 0) * -1 ||
  compareValues(SORT_VALUES.date(a.row), SORT_VALUES.date(b.row)) * -1 ||
  Number(b.row.id) - Number(a.row.id);

const sortLeadRows = (entries, sort, direction) => {
  if (!sort) {
    return [...entries].sort(compareDefault);
  }

  const sign = direction === "desc" ? -1 : 1;
  const valueOf = SORT_VALUES[sort];

  return [...entries].sort(
    (a, b) =>
      compareValues(valueOf(a.row, a.lead), valueOf(b.row, b.lead)) * sign ||
      Number(b.row.id) - Number(a.row.id)
  );
};

// List title: "Module (Status)", the status alone for a module without a date bucket, or "All Leads"
const buildListMeta = (filters, catalog) => {
  const module = filters.module ? catalog.modulesByCode.get(filters.module) : null;
  const statusName = filters.status ? getStatusName(catalog, filters.status) : null;

  let title = statusName || "All Leads";
  if (module && statusName) {
    title = module.dateFilterType === "none" ? statusName : `${module.name} (${statusName})`;
  } else if (module) {
    title = module.name;
  }

  return { title, moduleName: module ? module.name : null, statusName };
};

// Sorting needs the current status / creator of every matching lead, so ids
// and sort keys are read first and only the requested page is loaded in full
const listLeads = async (auth, { filters, page, perPage, sort, direction }) => {
  const catalog = await loadStatusCatalog();
  const where = buildLeadListWhere({ auth, filters, catalog, today: getToday() });

  const sortRows = await findLeadSortRows(where);
  // Status and creator sorts need the resolved lead values; other sorts use the row
  const sortLeads =
    sort === "status" || sort === "createdBy" ? await toLeadRecords(sortRows, catalog) : [];
  const sorted = sortLeadRows(
    sortRows.map((row, index) => ({ row, lead: sortLeads[index] ?? null })),
    sort,
    direction
  );

  const total = sorted.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, lastPage);
  const pageIds = sorted
    .slice((currentPage - 1) * perPage, currentPage * perPage)
    .map(({ row }) => row.id);

  const pageRows = pageIds.length > 0 ? await findLeadsByIds(pageIds) : [];
  const rowsById = new Map(pageRows.map((row) => [String(row.id), row]));
  const orderedRows = pageIds.map((id) => rowsById.get(String(id))).filter(Boolean);
  const leads = await toLeadRecords(orderedRows, catalog);

  return {
    items: leads.map(presentLeadListRow),
    pagination: { page: currentPage, perPage, total, lastPage },
    meta: buildListMeta(filters, catalog),
  };
};

const presentHistoryRow = (row, catalog) => {
  let to = row.futureStatus?.statusTypeName ?? null;
  let comments = row.comments ?? "";

  if (row.actionType === "NO_RESPONSE") {
    to = getNoResponseLabel(catalog) || to;
  } else if (row.actionType === "FRANCHISE_TYPE_CHANGE") {
    const from = formatFranchiseTypeLabel(
      row.fromFranchiseType?.franchiseTypeName,
      row.fromFranchiseType?.franchiseTypeCode
    );
    const toType = formatFranchiseTypeLabel(
      row.toFranchiseType?.franchiseTypeName,
      row.toFranchiseType?.franchiseTypeCode
    );
    const transfer = row.transferType
      ? ` (${row.transferType.charAt(0).toUpperCase()}${row.transferType.slice(1)} Transfer)`
      : "";

    comments = `Franchise Type changed from ${from} to ${toType}${transfer}. ${comments}`.trim();
  }

  return {
    id: Number(row.id),
    actionType: row.actionType,
    from: row.completedStatus?.statusTypeName || "-",
    to: to || "-",
    date: formatLocalDisplayDate(row.createdAt),
    time: formatTime(row.futureStatusHours, row.futureStatusMinutes),
    scheduledDate: formatDisplayDate(fromDateColumn(row.futureStatusDate)),
    by: row.createdByName || "-",
    comments,
  };
};

// One entry per Drop Out activity with all of its reasons
const presentDropouts = (rows) => {
  const events = new Map();

  rows.forEach((row) => {
    const key = Number(row.statusHistoryId);

    if (!events.has(key)) {
      events.set(key, { date: formatLocalDisplayDate(row.createdAt), reasons: [] });
    }

    events.get(key).reasons.push({
      reason: row.dropoutReason?.dropoutReason ?? null,
      comments: row.comments,
    });
  });

  return [...events.values()];
};

const presentTransfer = (row) => ({
  fromFranchiseType: formatFranchiseTypeLabel(
    row.fromFranchiseType?.franchiseTypeName,
    row.fromFranchiseType?.franchiseTypeCode
  ),
  toFranchiseType: formatFranchiseTypeLabel(
    row.toFranchiseType?.franchiseTypeName,
    row.toFranchiseType?.franchiseTypeCode
  ),
  performedBy: row.createdByName,
  date: formatLocalDisplayDate(row.createdAt),
  transferType: row.transferType,
});

// Lead details with its history, dropouts and franchise type transfers
const getLeadDetails = async (auth, leadId) => {
  const catalog = await loadStatusCatalog();
  const lead = await findScopedLeadOrFail(auth, leadId, catalog);

  const [history, dropouts, transfers] = await Promise.all([
    findLeadHistory(lead.id),
    findLeadDropouts(lead.id),
    findLeadTransfers(lead.id),
  ]);

  return {
    lead: presentLead(lead),
    history: history.map((row) => presentHistoryRow(row, catalog)),
    dropouts: presentDropouts(dropouts),
    transfers: transfers.map(presentTransfer),
    permissions: { canEdit: auth.access.canEditLead },
  };
};

// The lead as the lead screens show it
const getPresentedLead = async (auth, leadId) => {
  const catalog = await loadStatusCatalog();

  return presentLead(await findScopedLeadOrFail(auth, leadId, catalog));
};

module.exports = {
  listLeads,
  getLeadDetails,
  getPresentedLead,
};
