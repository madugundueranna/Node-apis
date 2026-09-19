const { prisma } = require("../Config/Prisma");

const ROLE_FIELDS = {
  id: true,
  name: true,
  roleStatus: true,
};

// master_role.name is not unique, so a name can match several rows
const findRolesByName = async (name) => {
  return prisma.masterRole.findMany({
    where: { name },
    select: ROLE_FIELDS,
  });
};

const findRoleByIdAndName = async (roleId, name) => {
  return prisma.masterRole.findFirst({
    where: { id: roleId, name },
    select: ROLE_FIELDS,
  });
};

const findActiveRoleAccessByRoleId = async (roleId) => {
  return prisma.franchiseCrmRoleAccess.findUnique({
    where: { roleId, status: "Active" },
    select: {
      roleId: true,
      canLogin: true,
      leadScope: true,
      canAddLead: true,
      canEditLead: true,
      canImportLeads: true,
      canChangeFranchiseType: true,
    },
  });
};

module.exports = {
  findRolesByName,
  findRoleByIdAndName,
  findActiveRoleAccessByRoleId,
};
