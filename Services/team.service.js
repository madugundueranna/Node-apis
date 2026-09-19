const { ROLES } = require("../Common/Constants");
const { APP_ERRORS, createAppError } = require("../Common/AppError");
const { fromDateColumn } = require("../Common/Dates");
const { findRolesByName } = require("../Models/role.model");
const { findUsersByIds } = require("../Models/user.model");
const { findSalesDirectorProfileById } = require("../Models/sales-director.model");
const { findSalesManagerAssignments } = require("../Models/franchise-type.model");
const {
  findSalesManagerDetailByUserId,
  findSalesManagerDetailsBySalesDirectorId,
  findSalesManagerFranchiseTypes,
} = require("../Models/sales-manager.model");
const { numericRoleId } = require("./identity.service");
const { formatFranchiseTypeLabel } = require("./master.service");

// Read-only team views: a Sales Director's Franchise Sales Managers and
// franchise type assignments, a Franchise Sales Manager's Sales Director.
// Creating, editing and assigning people stays in the admin panel.

const notFound = (message) => createAppError(APP_ERRORS.RECORD_NOT_FOUND, { message });

// Only users rows that still hold the Franchise Sales Manager role (resolved by name)
const findSalesManagerUsers = async (userIds) => {
  if (userIds.length === 0) {
    return [];
  }

  const [roles, users] = await Promise.all([
    findRolesByName(ROLES.FRANCHISE_SALES_MANAGER),
    findUsersByIds(userIds),
  ]);
  const roleIds = new Set(roles.map((role) => role.id));

  return users.filter((user) => roleIds.has(numericRoleId(user.roleId)));
};

const presentFranchiseTypeSummary = (type) => ({
  id: Number(type.id),
  name: type.franchiseTypeName,
  code: type.franchiseTypeCode,
  label: formatFranchiseTypeLabel(type.franchiseTypeName, type.franchiseTypeCode),
  status: type.status,
});

const groupFranchiseTypesByUser = (assignments) =>
  assignments.reduce((byUser, { userId, franchiseType }) => {
    byUser.set(userId, [...(byUser.get(userId) || []), presentFranchiseTypeSummary(franchiseType)]);
    return byUser;
  }, new Map());

// Franchise Sales Managers under the logged-in Sales Director
const listMySalesManagers = async (auth) => {
  const details = await findSalesManagerDetailsBySalesDirectorId(auth.identity.id);
  const managers = await findSalesManagerUsers(details.map((detail) => detail.userId));

  if (managers.length === 0) {
    return [];
  }

  const joiningDates = new Map(details.map((detail) => [detail.userId, detail.dateOfJoining]));
  const typesByUser = groupFranchiseTypesByUser(
    await findSalesManagerFranchiseTypes(managers.map((manager) => manager.id))
  );

  return managers.map((manager) => ({
    id: manager.id,
    name: manager.firstName,
    mobile: manager.mobile,
    email: manager.email,
    profileImage: manager.profile,
    active: manager.userStatus === "A",
    dateOfJoining: fromDateColumn(joiningDates.get(manager.id) ?? null),
    franchiseTypes: typesByUser.get(manager.id) || [],
  }));
};

const getMySalesManager = async (auth, userId) => {
  const manager = (await listMySalesManagers(auth)).find((row) => row.id === userId);

  if (!manager) {
    throw notFound("Franchise Sales Manager not found.");
  }

  return manager;
};

// The Sales Director the logged-in Franchise Sales Manager reports to
const getMySalesDirector = async (auth) => {
  const detail = await findSalesManagerDetailByUserId(auth.identity.id);
  const salesDirector =
    detail && detail.salesDirectorId !== null
      ? await findSalesDirectorProfileById(detail.salesDirectorId)
      : null;

  if (!salesDirector) {
    throw notFound("Sales Director not found.");
  }

  return {
    id: Number(salesDirector.id),
    name: salesDirector.fullName,
    mobile: salesDirector.primaryPhone,
    email: salesDirector.primaryEmail,
    profileImage: salesDirector.profileImage,
    active: salesDirector.status === "Active",
  };
};

// The logged-in Sales Director's franchise types and which Franchise Sales
// Managers each one is assigned to. assignment: all | assigned | unassigned
const getFranchiseTypeAssignments = async (auth, assignment) => {
  const types = auth.identity.franchiseTypes;
  const assignments = await findSalesManagerAssignments(types.map((type) => type.id));
  const managers = await findSalesManagerUsers([...new Set(assignments.map((row) => row.userId))]);
  const managersById = new Map(managers.map((manager) => [manager.id, manager]));

  const managersByType = assignments.reduce((byType, { franchiseTypeId, userId }) => {
    const manager = managersById.get(userId);

    if (manager) {
      const typeId = Number(franchiseTypeId);
      byType.set(typeId, [
        ...(byType.get(typeId) || []),
        { id: manager.id, name: manager.firstName, active: manager.userStatus === "A" },
      ]);
    }

    return byType;
  }, new Map());

  return types
    .map((type) => {
      const salesManagers = managersByType.get(type.id) || [];

      return {
        franchiseType: {
          id: type.id,
          name: type.name,
          code: type.code,
          label: formatFranchiseTypeLabel(type.name, type.code),
          status: type.status,
          cityName: type.cityName,
        },
        assigned: salesManagers.length > 0,
        salesManagers,
      };
    })
    .filter(
      (row) =>
        assignment === "all" || (assignment === "assigned" ? row.assigned : !row.assigned)
    );
};

module.exports = {
  listMySalesManagers,
  getMySalesManager,
  getMySalesDirector,
  getFranchiseTypeAssignments,
};
