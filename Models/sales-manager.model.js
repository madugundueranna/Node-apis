const { prisma } = require("../Config/Prisma");

// airpropx_franchise_sales_manager_details: links a Franchise Sales Manager
// (users row) to their Sales Director

const DETAIL_FIELDS = {
  userId: true,
  dateOfJoining: true,
  salesDirectorId: true,
};

const findSalesManagerDetailsBySalesDirectorId = async (salesDirectorId) => {
  return prisma.franchiseSalesManagerDetail.findMany({
    where: { salesDirectorId },
    select: DETAIL_FIELDS,
  });
};

const findSalesManagerDetailByUserId = async (userId) => {
  return prisma.franchiseSalesManagerDetail.findUnique({
    where: { userId },
    select: DETAIL_FIELDS,
  });
};

// Franchise types assigned to Franchise Sales Managers (not deleted types)
const findSalesManagerFranchiseTypes = async (userIds) => {
  return prisma.franchiseSalesManagerFranchiseType.findMany({
    where: { userId: { in: userIds }, franchiseType: { is: { deletedAt: null } } },
    select: {
      userId: true,
      franchiseType: {
        select: { id: true, franchiseTypeName: true, franchiseTypeCode: true, status: true },
      },
    },
    orderBy: { id: "asc" },
  });
};

module.exports = {
  findSalesManagerDetailsBySalesDirectorId,
  findSalesManagerDetailByUserId,
  findSalesManagerFranchiseTypes,
};
