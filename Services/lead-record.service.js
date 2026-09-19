const { LEAD_MESSAGES } = require("../Common/Constants");
const { APP_ERRORS, createAppError } = require("../Common/AppError");
const {
  formatDisplayDate,
  formatLocalDisplayDate,
  formatTime,
  fromDateColumn,
} = require("../Common/Dates");
const { LIVE_LEADS, findLead } = require("../Models/lead.model");
const { findUserNamesByIds } = require("../Models/user.model");
const { buildLeadScope } = require("./lead.service");
const { getEntryStatusId } = require("./status-catalog.service");
const { formatFranchiseTypeLabel } = require("./master.service");

// A lead is at the future status of its current history row; a lead with no
// history yet (new or imported, never actioned) is at the entry status.

const toNumberOrNull = (value) => (value === null || value === undefined ? null : Number(value));

// Leads created from the admin panel carry a users.id (created_by_role_id NULL)
const getAdminCreatorIds = (rows) => [
  ...new Set(
    rows
      .filter((row) => row.createdByRoleId === null && row.createdBy !== null)
      .map((row) => Number(row.createdBy))
  ),
];

// users.id -> display name (first + last name, else username)
const getAdminCreatorNames = async (rows) => {
  const userIds = getAdminCreatorIds(rows);

  if (userIds.length === 0) {
    return new Map();
  }

  const users = await findUserNamesByIds(userIds);

  return new Map(
    users.map((user) => {
      const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

      return [user.id, fullName || user.username || null];
    })
  );
};

const getCreatedByDisplay = (row, history, creatorNames) =>
  history?.createdByName ??
  row.createdByName ??
  (row.createdByRoleId === null && row.createdBy !== null
    ? creatorNames.get(Number(row.createdBy)) ?? null
    : null);

// Prisma lead row -> plain lead record used by every lead service
const toLeadRecord = (row, catalog, creatorNames = new Map()) => {
  const history = row.statusHistory[0] ?? null;
  const statusId =
    history && history.futureStatusId !== null
      ? Number(history.futureStatusId)
      : getEntryStatusId(catalog);
  const status = statusId === null ? null : catalog.allStatusesById.get(statusId) ?? null;

  return {
    id: Number(row.id),
    customerName: row.customerName,
    mobileNumber: row.mobileNumber,
    emailId: row.emailId,
    comments: row.comments,
    franchiseTypeId: Number(row.franchiseTypeId),
    franchiseTypeName: row.franchiseType?.franchiseTypeName ?? null,
    franchiseTypeCode: row.franchiseType?.franchiseTypeCode ?? null,
    franchiseTypeCityId: row.franchiseType?.cityId ?? null,
    sourceId: Number(row.sourceId),
    sourceName: row.source?.sourceName ?? null,
    salesDirectorId: toNumberOrNull(row.salesDirectorId),
    assignedToName: row.salesDirector?.fullName ?? null,
    leadOrigin: row.leadOrigin,
    createdAt: row.createdAt,
    createdByDisplay: getCreatedByDisplay(row, history, creatorNames),
    historyId: history ? Number(history.id) : null,
    futureStatusDate: history ? fromDateColumn(history.futureStatusDate) : null,
    futureStatusHours: history?.futureStatusHours ?? null,
    futureStatusMinutes: history?.futureStatusMinutes ?? null,
    currentStatusId: status ? status.id : null,
    currentSystemCode: status ? status.systemCode || null : null,
    currentStatusName: status ? status.name : null,
  };
};

const toLeadRecords = async (rows, catalog) => {
  const creatorNames = await getAdminCreatorNames(rows);

  return rows.map((row) => toLeadRecord(row, catalog, creatorNames));
};

// Same fields as the CodeIgniter lead list row
const presentLeadListRow = (lead) => ({
  id: lead.id,
  name: lead.customerName,
  mobile: lead.mobileNumber,
  email: lead.emailId,
  followUpDate: lead.futureStatusDate,
  followUpDateDisplay: formatDisplayDate(lead.futureStatusDate),
  followUpTime: formatTime(lead.futureStatusHours, lead.futureStatusMinutes),
  franchiseTypeId: lead.franchiseTypeId,
  franchiseTypeName: lead.franchiseTypeName,
  franchiseTypeCode: lead.franchiseTypeCode,
  franchiseTypeLabel: formatFranchiseTypeLabel(lead.franchiseTypeName, lead.franchiseTypeCode),
  sourceId: lead.sourceId,
  sourceName: lead.sourceName,
  statusCode: lead.currentSystemCode,
  statusName: lead.currentStatusName,
  isNew: lead.historyId === null,
  assignedToId: lead.salesDirectorId,
  assignedToName: lead.assignedToName,
  createdBy: lead.createdByDisplay,
  createdDate: formatLocalDisplayDate(lead.createdAt),
  origin: lead.leadOrigin,
});

const presentLead = (lead) => ({ ...presentLeadListRow(lead), comments: lead.comments });

// The lead, only when it is inside the user's lead scope (db: a transaction client)
const findScopedLeadRow = async (auth, leadId, db) => {
  const scope = buildLeadScope(auth);

  if (scope === null) {
    return null;
  }

  return findLead({ AND: [LIVE_LEADS, scope, { id: leadId }] }, db);
};

const findScopedLeadOrFail = async (auth, leadId, catalog, db) => {
  const row = await findScopedLeadRow(auth, leadId, db);

  if (!row) {
    throw createAppError(APP_ERRORS.RECORD_NOT_FOUND, { message: LEAD_MESSAGES.NOT_FOUND });
  }

  const [lead] = await toLeadRecords([row], catalog);

  return lead;
};

module.exports = {
  toLeadRecords,
  presentLeadListRow,
  presentLead,
  findScopedLeadOrFail,
};
