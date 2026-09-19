const { prisma } = require("../Config/Prisma");

const USER_FIELDS = {
  id: true,
  firstName: true,
  email: true,
  mobile: true,
  profile: true,
  roleId: true,
  userStatus: true,
};

const findUserById = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: USER_FIELDS,
  });
};

// users.role_id is a TEXT column without a foreign key, so it is matched as
// text here; callers check the exact numeric role id
const findUsersWhereRoleIdContains = async (roleIds) => {
  return prisma.user.findMany({
    where: {
      OR: roleIds.map((roleId) => ({ roleId: { contains: String(roleId) } })),
    },
    select: USER_FIELDS,
    orderBy: { id: "desc" },
  });
};

// Names of admin-panel users who created leads
const findUserNamesByIds = async (userIds) => {
  return prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, firstName: true, lastName: true, username: true },
  });
};

const findUsersByIds = async (userIds) => {
  return prisma.user.findMany({
    where: { id: { in: userIds } },
    select: USER_FIELDS,
    orderBy: [{ firstName: "asc" }, { id: "asc" }],
  });
};

module.exports = {
  findUserById,
  findUsersWhereRoleIdContains,
  findUserNamesByIds,
  findUsersByIds,
};
