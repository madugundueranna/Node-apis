const { prisma } = require("../Config/Prisma");

// Every status type, soft-deleted ones included: a lead's current status can
// still point at one of them. Callers drop deleted rows for the status flow.
const findAllStatusTypes = async () => {
  return prisma.franchiseStatusType.findMany({
    select: {
      id: true,
      franchiseModuleId: true,
      statusTypeName: true,
      systemCode: true,
      icon: true,
      status: true,
      isEntryStatus: true,
      isNoResponseStatus: true,
      requiresDropoutReason: true,
      deletedAt: true,
    },
    orderBy: { id: "asc" },
  });
};

const findActiveStatusTransitions = async () => {
  return prisma.franchiseStatusTransition.findMany({
    where: { status: "Active" },
    select: { fromSystemCode: true, toSystemCode: true },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });
};

module.exports = {
  findAllStatusTypes,
  findActiveStatusTransitions,
};
