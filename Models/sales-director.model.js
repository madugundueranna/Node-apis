const { prisma } = require("../Config/Prisma");

const SALES_DIRECTOR_FIELDS = {
  id: true,
  fullName: true,
  primaryEmail: true,
  primaryPhone: true,
  profileImage: true,
  roleId: true,
  status: true,
};

const findSalesDirectorById = async (salesDirectorId) => {
  return prisma.salesDirector.findUnique({
    where: { id: salesDirectorId, deletedAt: null },
    select: SALES_DIRECTOR_FIELDS,
  });
};

const findSalesDirectorsByRoleIds = async (roleIds) => {
  return prisma.salesDirector.findMany({
    where: { deletedAt: null, roleId: { in: roleIds } },
    select: SALES_DIRECTOR_FIELDS,
    orderBy: { id: "desc" },
  });
};

const findSalesDirectorProfileById = async (salesDirectorId) => {
  return prisma.salesDirector.findFirst({
    where: { id: salesDirectorId, deletedAt: null },
    select: SALES_DIRECTOR_FIELDS,
  });
};

// Active Sales Directors for the "Assigned To" filter; where narrows them
const findActiveSalesDirectors = async (where = {}) => {
  return prisma.salesDirector.findMany({
    where: { status: "Active", deletedAt: null, ...where },
    select: { id: true, fullName: true },
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
  });
};

module.exports = {
  findSalesDirectorById,
  findSalesDirectorsByRoleIds,
  findSalesDirectorProfileById,
  findActiveSalesDirectors,
};
