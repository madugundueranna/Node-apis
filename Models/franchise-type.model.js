const { prisma } = require("../Config/Prisma");

const FRANCHISE_TYPE_FIELDS = {
  id: true,
  franchiseTypeName: true,
  franchiseTypeCode: true,
  status: true,
  cityId: true,
};

const ORDER_BY_NAME = [{ franchiseTypeName: "asc" }, { id: "asc" }];

const findFranchiseTypesBySalesDirectorId = async (salesDirectorId) => {
  return prisma.franchiseType.findMany({
    where: {
      deletedAt: null,
      salesDirectorFranchiseTypes: { some: { salesDirectorId } },
    },
    select: FRANCHISE_TYPE_FIELDS,
    orderBy: ORDER_BY_NAME,
  });
};

const findFranchiseTypesBySalesManagerId = async (userId) => {
  return prisma.franchiseType.findMany({
    where: {
      deletedAt: null,
      salesManagerFranchiseTypes: { some: { userId } },
    },
    select: FRANCHISE_TYPE_FIELDS,
    orderBy: ORDER_BY_NAME,
  });
};

const findActiveFranchiseTypes = async () => {
  return prisma.franchiseType.findMany({
    where: { status: "Active", deletedAt: null },
    select: FRANCHISE_TYPE_FIELDS,
    orderBy: ORDER_BY_NAME,
  });
};

const findActiveFranchiseTypesByIds = async (franchiseTypeIds) => {
  return prisma.franchiseType.findMany({
    where: {
      id: { in: franchiseTypeIds },
      status: "Active",
      deletedAt: null,
    },
    select: FRANCHISE_TYPE_FIELDS,
    orderBy: ORDER_BY_NAME,
  });
};

const ACTIVE_FRANCHISE_TYPE = { status: "Active", deletedAt: null };

const findActiveFranchiseTypeById = async (franchiseTypeId) => {
  return prisma.franchiseType.findFirst({
    where: { ...ACTIVE_FRANCHISE_TYPE, id: franchiseTypeId },
    select: FRANCHISE_TYPE_FIELDS,
  });
};

// Codes are matched case-insensitively by the column collation
const findActiveFranchiseTypesByCodes = async (codes) => {
  return prisma.franchiseType.findMany({
    where: { ...ACTIVE_FRANCHISE_TYPE, franchiseTypeCode: { in: codes } },
    select: { id: true, franchiseTypeCode: true },
  });
};

const findActiveFranchiseTypesInCity = async (cityId) => {
  return prisma.franchiseType.findMany({
    where: { ...ACTIVE_FRANCHISE_TYPE, cityId },
    select: FRANCHISE_TYPE_FIELDS,
    orderBy: ORDER_BY_NAME,
  });
};

// Distinct country / state / city ids of Active franchise types (the Change
// Franchise Type cascade only offers places that have one)
const findActiveFranchiseTypeLocationIds = async (locationField, where = {}) => {
  const rows = await prisma.franchiseType.findMany({
    where: { ...ACTIVE_FRANCHISE_TYPE, ...where },
    select: { [locationField]: true },
    distinct: [locationField],
  });

  return rows.map((row) => row[locationField]);
};

// Sales Director assignments of franchise types (Active, not deleted Sales
// Directors), oldest assignment first
const findSalesDirectorAssignments = async (franchiseTypeIds) => {
  return prisma.salesDirectorFranchiseType.findMany({
    where: {
      franchiseTypeId: { in: franchiseTypeIds },
      salesDirector: { is: { status: "Active", deletedAt: null } },
    },
    select: { franchiseTypeId: true, salesDirectorId: true },
    orderBy: { id: "asc" },
  });
};

// Franchise Sales Managers (users) assigned to franchise types
const findSalesManagerAssignments = async (franchiseTypeIds) => {
  return prisma.franchiseSalesManagerFranchiseType.findMany({
    where: { franchiseTypeId: { in: franchiseTypeIds } },
    select: { franchiseTypeId: true, userId: true },
    orderBy: { id: "asc" },
  });
};

module.exports = {
  findFranchiseTypesBySalesDirectorId,
  findFranchiseTypesBySalesManagerId,
  findActiveFranchiseTypes,
  findActiveFranchiseTypesByIds,
  findActiveFranchiseTypeById,
  findActiveFranchiseTypesByCodes,
  findActiveFranchiseTypesInCity,
  findActiveFranchiseTypeLocationIds,
  findSalesDirectorAssignments,
  findSalesManagerAssignments,
};
