const { prisma } = require("../Config/Prisma");

// Lead sources and dropout reasons (enum('A','I') status + soft delete)

const ACTIVE = { status: "A", deletedAt: null };

const SOURCE_FIELDS = { id: true, sourceName: true, code: true };

const findActiveSources = async () => {
  return prisma.franchiseSourceName.findMany({
    where: ACTIVE,
    select: SOURCE_FIELDS,
    orderBy: [{ sourceName: "asc" }, { id: "asc" }],
  });
};

const findActiveSourceById = async (sourceId) => {
  return prisma.franchiseSourceName.findFirst({
    where: { ...ACTIVE, id: sourceId },
    select: SOURCE_FIELDS,
  });
};

// Codes are matched case-insensitively by the column collation
const findActiveSourcesByCodes = async (codes) => {
  return prisma.franchiseSourceName.findMany({
    where: { ...ACTIVE, code: { in: codes } },
    select: { id: true, code: true },
  });
};

const findActiveDropoutReasons = async () => {
  return prisma.franchiseLeadDropoutReason.findMany({
    where: ACTIVE,
    select: { id: true, dropoutReason: true },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });
};

const findActiveDropoutReasonsByIds = async (reasonIds) => {
  return prisma.franchiseLeadDropoutReason.findMany({
    where: { ...ACTIVE, id: { in: reasonIds } },
    select: { id: true },
  });
};

module.exports = {
  findActiveSources,
  findActiveSourceById,
  findActiveSourcesByCodes,
  findActiveDropoutReasons,
  findActiveDropoutReasonsByIds,
};
