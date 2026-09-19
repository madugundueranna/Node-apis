const { ROLES } = require("../Common/Constants");
const {
  findRolesByName,
  findRoleByIdAndName,
} = require("../Models/role.model");
const {
  findSalesDirectorById,
  findSalesDirectorsByRoleIds,
} = require("../Models/sales-director.model");
const {
  findUserById,
  findUsersWhereRoleIdContains,
} = require("../Models/user.model");
const {
  getSalesDirectorFranchiseTypes,
  getSalesManagerFranchiseTypes,
} = require("./franchise-type.service");

// CRM login identities:
//   Sales Director           airpropx_sales_directors row whose role_id is the role
//   Franchise Sales Manager  users row whose role_id is the role
// Roles are always resolved from master_role by name, never by a fixed id.

const MAX_MOBILE_MATCHES = 5;

const isLoginRole = (roleName) => Object.values(ROLES).includes(roleName);

// Stored phone numbers contain separators: compare the last 10 characters
// without spaces, "-" and "+" (same rule as the CodeIgniter CRM)
const lastTenPhoneCharacters = (phone) =>
  phone === null ? null : phone.replace(/[ +-]/g, "").slice(-10);

// users.role_id is TEXT: read its leading digits like MySQL CAST(role_id AS UNSIGNED)
const numericRoleId = (roleIdText) => {
  const match = /^\s*\+?(\d+)/.exec(roleIdText ?? "");

  return match ? Number(match[1]) : null;
};

const toIdentity = (type, person, role) => ({
  type,
  ...person,
  roleId: role.id,
  roleName: role.name,
  roleActive: role.roleStatus === "A",
});

const toSalesDirectorIdentity = (salesDirector, role) =>
  toIdentity(
    ROLES.SALES_DIRECTOR,
    {
      id: Number(salesDirector.id),
      name: salesDirector.fullName,
      mobile: salesDirector.primaryPhone,
      email: salesDirector.primaryEmail,
      profileImage: salesDirector.profileImage,
      active: salesDirector.status === "Active",
    },
    role
  );

const toSalesManagerIdentity = (user, role) =>
  toIdentity(
    ROLES.FRANCHISE_SALES_MANAGER,
    {
      id: user.id,
      name: user.firstName,
      mobile: user.mobile,
      email: user.email,
      profileImage: user.profile,
      active: user.userStatus === "A",
    },
    role
  );

const findSalesDirectorIdentitiesByMobile = async (mobile, roles) => {
  const rolesById = new Map(roles.map((role) => [role.id, role]));
  const salesDirectors = await findSalesDirectorsByRoleIds([...rolesById.keys()]);

  return salesDirectors
    .filter((salesDirector) => lastTenPhoneCharacters(salesDirector.primaryPhone) === mobile)
    .slice(0, MAX_MOBILE_MATCHES)
    .map((salesDirector) =>
      toSalesDirectorIdentity(salesDirector, rolesById.get(salesDirector.roleId))
    );
};

const findSalesManagerIdentitiesByMobile = async (mobile, roles) => {
  const rolesById = new Map(roles.map((role) => [role.id, role]));
  const users = await findUsersWhereRoleIdContains([...rolesById.keys()]);

  return users
    .filter(
      (user) =>
        rolesById.has(numericRoleId(user.roleId)) &&
        lastTenPhoneCharacters(user.mobile) === mobile
    )
    .slice(0, MAX_MOBILE_MATCHES)
    .map((user) =>
      toSalesManagerIdentity(user, rolesById.get(numericRoleId(user.roleId)))
    );
};

// Identities that have this mobile number AND hold the requested role
const findIdentitiesByMobile = async (mobile, roleName) => {
  if (!isLoginRole(roleName)) {
    return [];
  }

  const roles = await findRolesByName(roleName);

  if (roles.length === 0) {
    return [];
  }

  return roleName === ROLES.SALES_DIRECTOR
    ? findSalesDirectorIdentitiesByMobile(mobile, roles)
    : findSalesManagerIdentitiesByMobile(mobile, roles);
};

const findSalesDirectorIdentityById = async (salesDirectorId, roleName) => {
  const salesDirector = await findSalesDirectorById(salesDirectorId);

  if (!salesDirector || salesDirector.roleId === null) {
    return null;
  }

  const role = await findRoleByIdAndName(salesDirector.roleId, roleName);

  return role ? toSalesDirectorIdentity(salesDirector, role) : null;
};

const findSalesManagerIdentityById = async (userId, roleName) => {
  const user = await findUserById(userId);
  const roleId = user ? numericRoleId(user.roleId) : null;

  if (roleId === null) {
    return null;
  }

  const role = await findRoleByIdAndName(roleId, roleName);

  return role ? toSalesManagerIdentity(user, role) : null;
};

// The identity with this id, only while it still holds the role
const findIdentityById = async (id, roleName) => {
  if (roleName === ROLES.SALES_DIRECTOR) {
    return findSalesDirectorIdentityById(id, roleName);
  }

  if (roleName === ROLES.FRANCHISE_SALES_MANAGER) {
    return findSalesManagerIdentityById(id, roleName);
  }

  return null;
};

const getIdentityFranchiseTypes = async (identity) => {
  return identity.type === ROLES.SALES_DIRECTOR
    ? getSalesDirectorFranchiseTypes(identity.id)
    : getSalesManagerFranchiseTypes(identity.id);
};

module.exports = {
  isLoginRole,
  numericRoleId,
  findIdentitiesByMobile,
  findIdentityById,
  getIdentityFranchiseTypes,
};
