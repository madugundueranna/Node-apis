const { LEAD_MESSAGES } = require("../Common/Constants");
const { createValidationError } = require("../Common/AppError");
const { getToday, toDateColumn, toLocalDateString } = require("../Common/Dates");
const { runTransaction } = require("../Config/Prisma");
const { findActiveFranchiseTypeById } = require("../Models/franchise-type.model");
const { lockLead, updateLead } = require("../Models/lead.model");
const {
  closeCurrentHistory,
  createDropouts,
  createHistory,
} = require("../Models/lead-history.model");
const { getAssignableSalesDirectorId, requirePermission } = require("./lead-access.service");
const {
  formatFranchiseTypeLabel,
  getDropoutReasons,
  getSalesDirectorOwners,
  getValidDropoutReasonIds,
} = require("./master.service");
const { findScopedLeadOrFail, presentLead } = require("./lead-record.service");
const { getInternalTransferTypes } = require("./franchise-transfer.service");
const {
  getAllowedNextCodes,
  getCanonicalStatusId,
  getMovableStatuses,
  isTerminalStatus,
  loadStatusCatalog,
  requiresDropoutReason,
} = require("./status-catalog.service");

// Lead movement - CodeIgniter Franchise_lead_flow_model. Each action closes
// the current history row and inserts the new current one, in a transaction
// with the lead row locked. Allowed moves, the dropout requirement and
// terminal statuses all come from the status masters.

const truncate = (value, maxLength) => (value ? String(value).slice(0, maxLength) : value);

const actorFields = (identity, ip) => ({
  createdBy: identity.id,
  createdByRoleId: identity.roleId,
  createdByName: truncate(identity.name, 150),
  createdIp: truncate(ip, 45),
});

// Closes the current history row and inserts the new current one. A lead
// with no history yet first gets its LEAD_CREATED row at the entry status.
// An unassigned lead is claimed by an acting Sales Director.
const recordTransition = async (tx, { auth, ip, lead, entry }) => {
  const { identity } = auth;
  const actor = actorFields(identity, ip);

  if (lead.historyId === null) {
    if (!lead.currentStatusId) {
      throw createValidationError(LEAD_MESSAGES.ENTRY_STATUS_MISSING);
    }

    await createHistory(tx, {
      leadId: lead.id,
      actionType: "LEAD_CREATED",
      completedStatusId: null,
      futureStatusId: lead.currentStatusId,
      futureStatusDate: toDateColumn(lead.createdAt ? toLocalDateString(lead.createdAt) : getToday()),
      comments: lead.leadOrigin === "Manual" ? "Franchise Lead Added" : "Imported Franchise Lead",
      isCurrent: "N",
      ...actor,
    });
  } else {
    await closeCurrentHistory(tx, lead.id, identity.id);
  }

  const history = await createHistory(tx, {
    leadId: lead.id,
    completedStatusId: lead.currentStatusId,
    transferType: null,
    fromFranchiseTypeId: null,
    toFranchiseTypeId: null,
    isCurrent: "Y",
    ...actor,
    ...entry,
  });

  const ownId = getAssignableSalesDirectorId(identity);
  await updateLead(
    lead.id,
    {
      updatedBy: identity.id,
      updatedByRoleId: identity.roleId,
      ...(lead.salesDirectorId === null && ownId !== null ? { salesDirectorId: ownId } : {}),
    },
    tx
  );

  return Number(history.id);
};

const getNextActivityOptions = async (auth, leadId) => {
  const catalog = await loadStatusCatalog();
  const lead = await findScopedLeadOrFail(auth, leadId, catalog);
  const futureStatusOptions = getMovableStatuses(catalog, lead.currentSystemCode);

  return {
    lead: presentLead(lead),
    currentStatus: { code: lead.currentSystemCode, name: lead.currentStatusName },
    futureStatusOptions,
    canChangeFranchiseType: auth.access.canChangeFranchiseType && futureStatusOptions.length > 0,
    dropoutReasons: await getDropoutReasons(),
    defaultDate: getToday(),
  };
};

// The canonical status to move to; posted per-module duplicate ids are never stored
const resolveNextStatus = (catalog, lead, statusTypeId) => {
  const status = catalog.statusesById.get(statusTypeId);

  if (!status || !status.active || !status.systemCode) {
    throw createValidationError(LEAD_MESSAGES.STATUS_NOT_CONFIGURED);
  }

  if (!getAllowedNextCodes(catalog, lead.currentSystemCode).includes(status.systemCode)) {
    throw createValidationError(LEAD_MESSAGES.TRANSITION_NOT_ALLOWED);
  }

  const canonicalId = getCanonicalStatusId(catalog, status.systemCode);

  if (!canonicalId) {
    throw createValidationError(LEAD_MESSAGES.STATUS_NOT_CONFIGURED);
  }

  return { id: canonicalId, systemCode: status.systemCode };
};

const moveLeadStatus = async (auth, leadId, move, ip) => {
  const catalog = await loadStatusCatalog();

  return runTransaction(async (tx) => {
    await lockLead(tx, leadId);
    const lead = await findScopedLeadOrFail(auth, leadId, catalog, tx);
    const nextStatus = resolveNextStatus(catalog, lead, move.statusTypeId);

    const needsDropout = requiresDropoutReason(catalog, nextStatus.systemCode);
    const reasonIds = needsDropout ? await getValidDropoutReasonIds(move.dropoutReasonIds) : [];

    if (needsDropout && reasonIds.length === 0) {
      throw createValidationError(LEAD_MESSAGES.DROPOUT_REASON_REQUIRED);
    }

    const historyId = await recordTransition(tx, {
      auth,
      ip,
      lead,
      entry: {
        actionType: "ACTIVITY",
        futureStatusId: nextStatus.id,
        futureStatusDate: toDateColumn(move.schedule.date),
        futureStatusHours: move.schedule.hours,
        futureStatusMinutes: move.schedule.minutes,
        comments: move.comments,
      },
    });

    if (reasonIds.length > 0) {
      const { identity } = auth;

      await createDropouts(
        tx,
        reasonIds.map((dropoutReasonId) => ({
          statusHistoryId: historyId,
          leadId: lead.id,
          dropoutReasonId,
          comments: move.comments,
          createdBy: identity.id,
          createdByRoleId: identity.roleId,
          createdIp: truncate(ip, 45),
        }))
      );
    }

    return { leadStatusId: historyId, leadId: lead.id, systemCode: nextStatus.systemCode };
  });
};

const assertTransferTarget = async (auth, lead, change) => {
  const newType = await findActiveFranchiseTypeById(change.franchiseTypeId);

  if (!newType) {
    throw createValidationError(LEAD_MESSAGES.INVALID_FRANCHISE_TYPE);
  }

  if (Number(newType.id) === lead.franchiseTypeId) {
    throw createValidationError(LEAD_MESSAGES.SAME_FRANCHISE_TYPE);
  }

  // Internal Transfer is re-validated here - the client list is never trusted
  if (change.transferType === "internal") {
    const allowed = await getInternalTransferTypes(auth, lead);

    if (!allowed.some((type) => type.id === Number(newType.id))) {
      throw createValidationError(LEAD_MESSAGES.INTERNAL_TYPE_NOT_ALLOWED);
    }
  }

  return newType;
};

// Moves the lead to another franchise type. An External Transfer hands it to
// the new type's Sales Director (when the type has one).
const changeFranchiseType = async (auth, leadId, change, ip) => {
  requirePermission(auth.access, "canChangeFranchiseType");
  const catalog = await loadStatusCatalog();

  return runTransaction(async (tx) => {
    await lockLead(tx, leadId);
    const lead = await findScopedLeadOrFail(auth, leadId, catalog, tx);

    if (isTerminalStatus(catalog, lead.currentSystemCode)) {
      throw createValidationError(LEAD_MESSAGES.TYPE_CHANGE_CLOSED);
    }

    const newType = await assertTransferTarget(auth, lead, change);
    const newTypeId = Number(newType.id);
    const { schedule } = change;

    const historyId = await recordTransition(tx, {
      auth,
      ip,
      lead,
      entry: {
        actionType: "FRANCHISE_TYPE_CHANGE",
        futureStatusId: lead.currentStatusId,
        futureStatusDate: toDateColumn(schedule.date ?? lead.futureStatusDate ?? getToday()),
        futureStatusHours: schedule.date ? schedule.hours : lead.futureStatusHours,
        futureStatusMinutes: schedule.date ? schedule.minutes : lead.futureStatusMinutes,
        comments: change.comments,
        transferType: change.transferType,
        fromFranchiseTypeId: lead.franchiseTypeId,
        toFranchiseTypeId: newTypeId,
      },
    });

    const newOwnerId =
      change.transferType === "external"
        ? (await getSalesDirectorOwners([newTypeId])).get(newTypeId)
        : undefined;

    await updateLead(
      lead.id,
      {
        franchiseTypeId: newTypeId,
        updatedBy: auth.identity.id,
        updatedByRoleId: auth.identity.roleId,
        ...(newOwnerId !== undefined ? { salesDirectorId: newOwnerId } : {}),
      },
      tx
    );

    return {
      leadStatusId: historyId,
      leadId: lead.id,
      franchiseTypeLabel: formatFranchiseTypeLabel(newType.franchiseTypeName, newType.franchiseTypeCode),
    };
  });
};

// Next Activity "Done": a status move, or the Change Franchise Type option
const saveLeadActivity = async (auth, leadId, activity, ip) =>
  activity.changeFranchiseType
    ? changeFranchiseType(auth, leadId, activity.changeFranchiseType, ip)
    : moveLeadStatus(auth, leadId, activity.statusMove, ip);

// "No Response": the lead keeps its status; the date becomes its next follow-up
const saveNoResponse = async (auth, leadId, { date, comments }, ip) => {
  const catalog = await loadStatusCatalog();

  return runTransaction(async (tx) => {
    await lockLead(tx, leadId);
    const lead = await findScopedLeadOrFail(auth, leadId, catalog, tx);

    if (!lead.currentStatusId) {
      throw createValidationError(LEAD_MESSAGES.CURRENT_STATUS_MISSING);
    }

    const historyId = await recordTransition(tx, {
      auth,
      ip,
      lead,
      entry: {
        actionType: "NO_RESPONSE",
        futureStatusId: lead.currentStatusId,
        futureStatusDate: toDateColumn(date),
        futureStatusHours: null,
        futureStatusMinutes: null,
        comments,
      },
    });

    return { leadStatusId: historyId, leadId: lead.id };
  });
};

module.exports = {
  getNextActivityOptions,
  saveLeadActivity,
  saveNoResponse,
};
