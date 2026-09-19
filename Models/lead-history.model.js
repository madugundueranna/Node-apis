const { prisma } = require("../Config/Prisma");

const TYPE_LABEL_FIELDS = { select: { franchiseTypeName: true, franchiseTypeCode: true } };

// Activity history of a lead, newest first
const findLeadHistory = async (leadId) => {
  return prisma.franchiseLeadStatusHistory.findMany({
    where: { leadId, deletedAt: null },
    select: {
      id: true,
      actionType: true,
      comments: true,
      createdAt: true,
      createdByName: true,
      futureStatusDate: true,
      futureStatusHours: true,
      futureStatusMinutes: true,
      transferType: true,
      completedStatus: { select: { statusTypeName: true } },
      futureStatus: { select: { statusTypeName: true } },
      fromFranchiseType: TYPE_LABEL_FIELDS,
      toFranchiseType: TYPE_LABEL_FIELDS,
    },
    orderBy: { id: "desc" },
  });
};

// Change Franchise Type events of a lead, oldest first
const findLeadTransfers = async (leadId) => {
  return prisma.franchiseLeadStatusHistory.findMany({
    where: { leadId, actionType: "FRANCHISE_TYPE_CHANGE", deletedAt: null },
    select: {
      transferType: true,
      createdAt: true,
      createdByName: true,
      fromFranchiseType: TYPE_LABEL_FIELDS,
      toFranchiseType: TYPE_LABEL_FIELDS,
    },
    orderBy: { id: "asc" },
  });
};

const findLeadDropouts = async (leadId) => {
  return prisma.franchiseLeadDropout.findMany({
    where: { leadId },
    select: {
      statusHistoryId: true,
      comments: true,
      createdAt: true,
      dropoutReason: { select: { dropoutReason: true } },
    },
    orderBy: { id: "asc" },
  });
};

// The lead's current history row(s) stop being current
const closeCurrentHistory = async (tx, leadId, updatedBy) => {
  return tx.franchiseLeadStatusHistory.updateMany({
    where: { leadId, isCurrent: "Y" },
    data: { isCurrent: "N", updatedBy },
  });
};

const createHistory = async (tx, data) => {
  return tx.franchiseLeadStatusHistory.create({ data, select: { id: true } });
};

const createDropouts = async (tx, rows) => {
  return tx.franchiseLeadDropout.createMany({ data: rows });
};

module.exports = {
  findLeadHistory,
  findLeadTransfers,
  findLeadDropouts,
  closeCurrentHistory,
  createHistory,
  createDropouts,
};
