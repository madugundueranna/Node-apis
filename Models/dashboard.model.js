const { prisma } = require("../Config/Prisma");

// Soft-deleted status types are included: a lead's current status can still
// point at one of them
const findFranchiseStatusTypes = async () => {
  return prisma.franchiseStatusType.findMany({
    select: {
      id: true,
      franchiseModuleId: true,
      franchiseSubModuleId: true,
      statusTypeName: true,
      systemCode: true,
      icon: true,
      status: true,
      isEntryStatus: true,
      showOnDashboard: true,
      showAsSummaryCard: true,
      summaryCardOrder: true,
      deletedAt: true,
    },
    orderBy: { id: "asc" },
  });
};

const findActiveFranchiseModules = async () => {
  return prisma.franchiseModule.findMany({
    where: { status: "Active", deletedAt: null },
    select: {
      id: true,
      moduleName: true,
      moduleCode: true,
      dateFilterType: true,
      dashboardLayout: true,
    },
    orderBy: { id: "asc" },
  });
};

const findFranchiseSubModules = async () => {
  return prisma.franchiseSubModule.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      franchiseModuleId: true,
      subModuleName: true,
    },
    orderBy: { id: "asc" },
  });
};

module.exports = {
  findFranchiseStatusTypes,
  findActiveFranchiseModules,
  findFranchiseSubModules,
};
