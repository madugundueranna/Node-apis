const { LEAD_SCOPES, ROLES } = require("../Common/Constants");
const {
  countCurrentHistoryByStatusAndDate,
  countLeadsWithoutCurrentHistory,
} = require("../Models/lead.model");

const LIVE_LEADS = {
  deletedAt: null,
  status: { not: "Inactive" },
};

// Leads the logged-in user may see, from the role's lead_scope. Returns a
// Prisma condition, or null when the user can see no leads.
//
//   ALL              every lead
//   FRANCHISE_TYPES  every lead of the user's franchise types
//   OWN              leads assigned to the user, plus unassigned leads of their
//                    franchise types. sales_director_id is a foreign key to
//                    airpropx_sales_directors, so a Franchise Sales Manager
//                    (a users row) only gets the unassigned leads.
const buildLeadScope = ({ identity, access }) => {
  const franchiseTypeIds = identity.franchiseTypes.map((type) => type.id);
  const inFranchiseTypes = { franchiseTypeId: { in: franchiseTypeIds } };
  const hasFranchiseTypes = franchiseTypeIds.length > 0;

  if (access.leadScope === LEAD_SCOPES.ALL) {
    return {};
  }

  if (access.leadScope === LEAD_SCOPES.FRANCHISE_TYPES) {
    return hasFranchiseTypes ? inFranchiseTypes : null;
  }

  if (identity.type === ROLES.SALES_DIRECTOR) {
    return hasFranchiseTypes
      ? {
          OR: [
            { salesDirectorId: identity.id },
            { salesDirectorId: null, ...inFranchiseTypes },
          ],
        }
      : { salesDirectorId: identity.id };
  }

  return hasFranchiseTypes ? { salesDirectorId: null, ...inFranchiseTypes } : null;
};

// Follow-up date bucket of a DATE column value
const getFollowUpBucket = (futureStatusDate, today) => {
  if (futureStatusDate === null) {
    return "undated";
  }

  const date = futureStatusDate.toISOString().slice(0, 10);

  if (date === today) {
    return "today";
  }

  return date < today ? "pending" : "future";
};

const addBucketCount = (counts, systemCode, bucket, count) => {
  if (systemCode === null || count === 0) {
    return;
  }

  counts[systemCode] = counts[systemCode] || {};
  counts[systemCode][bucket] = (counts[systemCode][bucket] || 0) + count;
};

// Visible lead counts: { systemCode: { today, pending, future, undated } }.
// A lead's status is the future status of its current history row; a lead
// with no current history row is at the entry status and counts as "today".
const countLeadsByStatusBucket = async ({
  auth,
  franchiseTypeId,
  entryStatusId,
  statusCodes,
  today,
}) => {
  const scope = buildLeadScope(auth);

  if (scope === null) {
    return {};
  }

  const leadWhere = {
    AND: [LIVE_LEADS, scope, franchiseTypeId ? { franchiseTypeId } : {}],
  };

  const [historyGroups, leadsWithoutHistory] = await Promise.all([
    countCurrentHistoryByStatusAndDate(leadWhere),
    countLeadsWithoutCurrentHistory(leadWhere),
  ]);

   const counts = {}; 
  const systemCodeOf = (statusId) =>
    statusId === null ? null : statusCodes.get(statusId) ?? null;

  historyGroups.forEach((group) => {
    const statusId =
      group.futureStatusId === null ? entryStatusId : Number(group.futureStatusId);

    addBucketCount(
      counts,
      systemCodeOf(statusId),
      getFollowUpBucket(group.futureStatusDate, today),
      group._count._all
    );
  });

  addBucketCount(counts, systemCodeOf(entryStatusId), "today", leadsWithoutHistory);

  return counts;
};

module.exports = {
  buildLeadScope,
  countLeadsByStatusBucket,
};
