const { LEAD_MESSAGES } = require("../Common/Constants");
const { APP_ERRORS, createAppError, createValidationError } = require("../Common/AppError");
const { runTransaction } = require("../Config/Prisma");
const { findActiveSourceById } = require("../Models/master.model");
const { findActiveFranchiseTypeById } = require("../Models/franchise-type.model");
const {
  createLead,
  findLiveLeadIdByMobile,
  lockLead,
  updateLead,
} = require("../Models/lead.model");
const {
  getAssignableSalesDirectorId,
  getCreatableFranchiseTypeIds,
  requirePermission,
} = require("./lead-access.service");
const { findScopedLeadOrFail } = require("./lead-record.service");
const { getPresentedLead } = require("./lead-query.service");
const { loadStatusCatalog } = require("./status-catalog.service");

// Add / Edit Franchise Lead - CodeIgniter Franchise_lead_form_model. Same
// duplicate rule as the import (mobile number of a live lead), so a lead
// cannot be created twice through either path.

const truncate = (value, maxLength) => (value ? String(value).slice(0, maxLength) : value);

const fieldError = (field, message) => createValidationError(message, { [field]: [message] });

const assertActiveSource = async (sourceId) => {
  if (!(await findActiveSourceById(sourceId))) {
    throw fieldError("sourceId", "Please select a valid Source.");
  }
};

const assertCreatableFranchiseType = async (auth, franchiseTypeId) => {
  if (!(await findActiveFranchiseTypeById(franchiseTypeId))) {
    throw fieldError("franchiseTypeId", "Please select a valid Franchise Type.");
  }

  const allowedIds = getCreatableFranchiseTypeIds(auth);

  if (allowedIds !== null && !allowedIds.includes(franchiseTypeId)) {
    throw fieldError("franchiseTypeId", LEAD_MESSAGES.TYPE_NOT_ASSIGNED);
  }
};

const assertNotDuplicate = async (mobileNumber, exceptLeadId, db) => {
  if ((await findLiveLeadIdByMobile(mobileNumber, exceptLeadId, db)) !== null) {
    const message = LEAD_MESSAGES.DUPLICATE(mobileNumber);

    throw createAppError(APP_ERRORS.DUPLICATE_RECORD, {
      message,
      details: { mobileNumber: [message] },
    });
  }
};

const auditFields = (identity) => ({
  updatedBy: identity.id,
  updatedByRoleId: identity.roleId,
});

// A Sales Director owns the leads they add. A Franchise Sales Manager's lead
// stays unassigned in their franchise type, so both they and the type's
// Sales Director see it.
const createFranchiseLead = async (auth, input) => {
  requirePermission(auth.access, "canAddLead");

  await Promise.all([
    assertActiveSource(input.sourceId),
    assertCreatableFranchiseType(auth, input.franchiseTypeId),
  ]);

  const { identity } = auth;
  const leadId = await runTransaction(async (tx) => {
    await assertNotDuplicate(input.mobileNumber, null, tx);

    const lead = await createLead(
      {
        ...input,
        importBatchId: null,
        rowNumber: null,
        salesDirectorId: getAssignableSalesDirectorId(identity),
        status: "Imported",
        leadOrigin: "Manual",
        createdBy: identity.id,
        createdByRoleId: identity.roleId,
        createdByName: truncate(identity.name, 150),
        ...auditFields(identity),
      },
      tx
    );

    return Number(lead.id);
  });

  return getPresentedLead(auth, leadId);
};

// Contact details, source and remarks. The franchise type changes only
// through Change Franchise Type, which records the transfer in the history.
const updateFranchiseLead = async (auth, leadId, input) => {
  requirePermission(auth.access, "canEditLead");
  await assertActiveSource(input.sourceId);

  const catalog = await loadStatusCatalog();

  await runTransaction(async (tx) => {
    await lockLead(tx, leadId);
    const lead = await findScopedLeadOrFail(auth, leadId, catalog, tx);
    await assertNotDuplicate(input.mobileNumber, lead.id, tx);

    await updateLead(lead.id, { ...input, ...auditFields(auth.identity) }, tx);
  });

  return getPresentedLead(auth, leadId);
};

module.exports = {
  createFranchiseLead,
  updateFranchiseLead,
};
