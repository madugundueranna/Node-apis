const { prisma } = require("../Config/Prisma");

// A lead's current state is its is_current, not deleted history row
const CURRENT_HISTORY = {
  isCurrent: "Y",
  deletedAt: null,
};

// Leads that are neither deleted nor deactivated
const LIVE_LEADS = {
  deletedAt: null,
  status: { not: "Inactive" },
};

const CURRENT_HISTORY_SELECT = {
  where: CURRENT_HISTORY,
  orderBy: { id: "desc" },
  take: 1,
};

// Fields every lead screen shows
const LEAD_FIELDS = {
  id: true,
  customerName: true,
  mobileNumber: true,
  emailId: true,
  comments: true,
  franchiseTypeId: true,
  sourceId: true,
  salesDirectorId: true,
  leadOrigin: true,
  createdAt: true,
  createdBy: true,
  createdByRoleId: true,
  createdByName: true,
  franchiseType: {
    select: { franchiseTypeName: true, franchiseTypeCode: true, cityId: true },
  },
  source: { select: { sourceName: true } },
  salesDirector: { select: { fullName: true } },
  statusHistory: {
    ...CURRENT_HISTORY_SELECT,
    select: {
      id: true,
      futureStatusId: true,
      futureStatusDate: true,
      futureStatusHours: true,
      futureStatusMinutes: true,
      createdByName: true,
    },
  },
};

// Only what the list sort needs
const LEAD_SORT_FIELDS = {
  id: true,
  customerName: true,
  mobileNumber: true,
  createdAt: true,
  createdBy: true,
  createdByRoleId: true,
  createdByName: true,
  franchiseType: { select: { franchiseTypeName: true } },
  statusHistory: {
    ...CURRENT_HISTORY_SELECT,
    select: { id: true, futureStatusId: true, futureStatusDate: true, createdByName: true },
  },
};

// Current history rows of the matching leads, grouped by status and follow-up date
const countCurrentHistoryByStatusAndDate = async (leadWhere) => {
  return prisma.franchiseLeadStatusHistory.groupBy({
    by: ["futureStatusId", "futureStatusDate"],
    where: {
      ...CURRENT_HISTORY,
      lead: { is: leadWhere },
    },
    _count: { _all: true },
  });
};

const countLeadsWithoutCurrentHistory = async (leadWhere) => {
  return prisma.franchiseLead.count({
    where: {
      AND: [leadWhere, { statusHistory: { none: CURRENT_HISTORY } }],
    },
  });
};

const findLeadSortRows = async (where) => {
  return prisma.franchiseLead.findMany({ where, select: LEAD_SORT_FIELDS });
};

const findLeadsByIds = async (leadIds) => {
  return prisma.franchiseLead.findMany({
    where: { id: { in: leadIds } },
    select: LEAD_FIELDS,
  });
};

const findLead = async (where, db = prisma) => {
  return db.franchiseLead.findFirst({ where, select: LEAD_FIELDS });
};

// Row lock for the rest of the transaction. Prisma has no SELECT ... FOR
// UPDATE, so this one statement is raw SQL (a parameterized tagged template).
const lockLead = async (tx, leadId) => {
  await tx.$queryRaw`SELECT id FROM airpropx_franchise_leads WHERE id = ${leadId} FOR UPDATE`;
};

// Id of a live imported lead with this mobile number, optionally ignoring one lead
const findLiveLeadIdByMobile = async (mobileNumber, exceptLeadId = null, db = prisma) => {
  const lead = await db.franchiseLead.findFirst({
    where: {
      mobileNumber,
      status: "Imported",
      deletedAt: null,
      ...(exceptLeadId ? { id: { not: exceptLeadId } } : {}),
    },
    select: { id: true },
  });

  return lead ? Number(lead.id) : null;
};

const findLiveLeadMobiles = async (mobileNumbers) => {
  const rows = await prisma.franchiseLead.findMany({
    where: { mobileNumber: { in: mobileNumbers }, status: "Imported", deletedAt: null },
    select: { mobileNumber: true },
    distinct: ["mobileNumber"],
  });

  return rows.map((row) => row.mobileNumber.trim());
};

const createLead = async (data, db = prisma) => {
  return db.franchiseLead.create({ data, select: { id: true } });
};

const createLeads = async (rows, db = prisma) => {
  return db.franchiseLead.createMany({ data: rows });
};

const updateLead = async (leadId, data, db = prisma) => {
  return db.franchiseLead.update({ where: { id: leadId }, data, select: { id: true } });
};

module.exports = {
  CURRENT_HISTORY,
  LIVE_LEADS,
  countCurrentHistoryByStatusAndDate,
  countLeadsWithoutCurrentHistory,
  findLeadSortRows,
  findLeadsByIds,
  findLead,
  lockLead,
  findLiveLeadIdByMobile,
  findLiveLeadMobiles,
  createLead,
  createLeads,
  updateLead,
};
