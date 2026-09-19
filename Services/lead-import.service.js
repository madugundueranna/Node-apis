const { LEAD_MESSAGES } = require("../Common/Constants");
const { APP_ERRORS, createAppError } = require("../Common/AppError");
const { runTransaction } = require("../Config/Prisma");
const { findActiveFranchiseTypesByCodes } = require("../Models/franchise-type.model");
const { findActiveSourcesByCodes } = require("../Models/master.model");
const { createLeads, findLiveLeadMobiles } = require("../Models/lead.model");
const {
  createImportBatch,
  createImportDuplicates,
  updateImportBatch,
} = require("../Models/lead-import.model");
const {
  getAssignableSalesDirectorId,
  getCreatableFranchiseTypeIds,
  requirePermission,
} = require("./lead-access.service");

// Import Leads - CodeIgniter Franchise_lead_import_model, which uses the same
// request contract, rules and response as the admin panel import.
//
// Row: { row_number, customer_name, mobile_number, email_id, Franchise_Type,
//        source_id, comments }
//   Franchise_Type = airpropx_franchise_types.franchise_type_code
//   source_id      = airpropx_franchise_source_names.code

const MOBILE_CHUNK_SIZE = 500;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cellText = (row, key) => {
  const value = row && typeof row === "object" ? row[key] : undefined;

  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
};

const readRow = (row, index) => {
  const rowNumberText = cellText(row, "row_number");
  const comments = cellText(row, "comments");

  return {
    rowNumber: /^\d+$/.test(rowNumberText) ? Number(rowNumberText) : index + 2,
    customerName: cellText(row, "customer_name"),
    mobileNumber: cellText(row, "mobile_number"),
    emailId: cellText(row, "email_id"),
    franchiseTypeCode: cellText(row, "Franchise_Type"),
    sourceCode: cellText(row, "source_id"),
    comments: comments || null,
  };
};

// Trailing blank sheet rows are not import rows
const isBlankRow = (row) =>
  !row.customerName && !row.mobileNumber && !row.emailId && !row.franchiseTypeCode && !row.sourceCode && !row.comments;

// Same rules as the admin import validator
const getRowErrors = (row) => {
  const errors = [];

  if (!row.customerName) {
    errors.push("The Customer Name field is required.");
  } else if (row.customerName.length > 150) {
    errors.push("The Customer Name may not be greater than 150 characters.");
  }

  if (!row.mobileNumber) {
    errors.push("The Mobile Number field is required.");
  } else if (!/^\d{10}$/.test(row.mobileNumber)) {
    errors.push("The Mobile Number must be 10 digits.");
  }

  if (row.emailId && (!EMAIL.test(row.emailId) || row.emailId.length > 150)) {
    errors.push("The Email ID must be a valid email address.");
  }

  if (!row.franchiseTypeCode) {
    errors.push("The Franchise Type Code field is required.");
  }

  if (!row.sourceCode) {
    errors.push("The Source Code field is required.");
  }

  return errors;
};

const reportRow = (row, message) => ({
  row_number: row.rowNumber,
  customer_name: row.customerName,
  franchise_type: row.franchiseTypeCode,
  source: row.sourceCode,
  error_message: message,
});

const distinctValues = (rows, field) => [...new Set(rows.map((row) => row[field]).filter(Boolean))];

// UPPER(code) -> id for the codes present in the sheet
const resolveCodes = async (codes, findByCodes, codeField) => {
  if (codes.length === 0) {
    return new Map();
  }

  const records = await findByCodes(codes);

  return new Map(records.map((record) => [String(record[codeField]).trim().toUpperCase(), Number(record.id)]));
};

const findExistingMobiles = async (mobiles) => {
  const existing = new Set();

  for (let start = 0; start < mobiles.length; start += MOBILE_CHUNK_SIZE) {
    const found = await findLiveLeadMobiles(mobiles.slice(start, start + MOBILE_CHUNK_SIZE));
    found.forEach((mobile) => existing.add(mobile));
  }

  return existing;
};

const processRows = async (auth, rawRows, batchId) => {
  const rows = rawRows.map(readRow).filter((row) => !isBlankRow(row));

  const [franchiseTypeIds, sourceIds, existingMobiles] = await Promise.all([
    resolveCodes(distinctValues(rows, "franchiseTypeCode"), findActiveFranchiseTypesByCodes, "franchiseTypeCode"),
    resolveCodes(distinctValues(rows, "sourceCode"), findActiveSourcesByCodes, "code"),
    findExistingMobiles(distinctValues(rows, "mobileNumber")),
  ]);

  const { identity } = auth;
  const allowedTypeIds = getCreatableFranchiseTypeIds(auth);
  const ownerId = getAssignableSalesDirectorId(identity);
  const seenMobiles = new Set();
  const leads = [];
  const duplicateRows = [];
  const errors = [];
  const duplicates = [];

  rows.forEach((row) => {
    const rowErrors = getRowErrors(row);
    if (rowErrors.length > 0) {
      errors.push(reportRow(row, rowErrors.join("; ")));
      return;
    }

    const franchiseTypeId = franchiseTypeIds.get(row.franchiseTypeCode.toUpperCase());
    if (!franchiseTypeId) {
      errors.push(reportRow(row, `Invalid Franchise Type Code: ${row.franchiseTypeCode}`));
      return;
    }

    if (allowedTypeIds !== null && !allowedTypeIds.includes(franchiseTypeId)) {
      errors.push(reportRow(row, `Franchise Type Code ${row.franchiseTypeCode} is not assigned to you`));
      return;
    }

    const sourceId = sourceIds.get(row.sourceCode.toUpperCase());
    if (!sourceId) {
      errors.push(reportRow(row, `Invalid Source Code: ${row.sourceCode}`));
      return;
    }

    const leadFields = {
      importBatchId: batchId,
      rowNumber: row.rowNumber,
      customerName: row.customerName,
      mobileNumber: row.mobileNumber,
      emailId: row.emailId || null,
      comments: row.comments,
      franchiseTypeId,
      sourceId,
    };

    const inSheet = seenMobiles.has(row.mobileNumber);
    if (inSheet || existingMobiles.has(row.mobileNumber)) {
      const reason = inSheet
        ? `Duplicate Lead: Mobile number ${row.mobileNumber} appears more than once in this file - "${row.customerName}" was skipped.`
        : `Duplicate Lead: Mobile number ${row.mobileNumber} already exists - "${row.customerName}" was skipped.`;

      duplicates.push(reportRow(row, reason));
      duplicateRows.push({ ...leadFields, duplicateReason: reason, status: "Duplicate" });
      return;
    }

    seenMobiles.add(row.mobileNumber);
    leads.push({
      ...leadFields,
      salesDirectorId: ownerId,
      status: "Imported",
      leadOrigin: "Import",
      createdBy: identity.id,
      createdByRoleId: identity.roleId,
      createdByName: identity.name ? String(identity.name).slice(0, 150) : null,
      updatedBy: identity.id,
      updatedByRoleId: identity.roleId,
    });
  });

  await runTransaction(async (tx) => {
    if (duplicateRows.length > 0) {
      await createImportDuplicates(duplicateRows, tx);
    }
    if (leads.length > 0) {
      await createLeads(leads, tx);
    }
  });

  return { totalDataRows: rows.length, importedCount: leads.length, errors, duplicates };
};

const markBatchFailed = async (batchId) => {
  try {
    await updateImportBatch(batchId, { status: "Failed" });
  } catch (error) {
    console.error(`Could not mark lead import batch ${batchId} as Failed:`, error);
  }
};

// A Sales Director owns the leads they import; a Franchise Sales Manager's
// imported leads stay unassigned in their franchise types (see createFranchiseLead)
const importLeads = async (auth, { rows, originalFilename }) => {
  requirePermission(auth.access, "canImportLeads");

  // Created before processing so a failure still leaves a Failed batch behind
  const batch = await createImportBatch({
    originalFilename,
    totalRows: 0,
    importedCount: 0,
    duplicateCount: 0,
    failedCount: 0,
    status: "Processing",
    uploadedBy: auth.identity.id,
    uploadedByRoleId: auth.identity.roleId,
  });
  const batchId = Number(batch.id);

  let result;
  try {
    result = await processRows(auth, rows, batchId);
  } catch (error) {
    await markBatchFailed(batchId);
    console.error(`Lead import batch ${batchId} failed:`, error);
    throw createAppError(APP_ERRORS.OPERATION_FAILED, { message: LEAD_MESSAGES.IMPORT_FAILED });
  }

  const failedCount = result.errors.length;
  const duplicateCount = result.duplicates.length;
  const skippedCount = failedCount + duplicateCount;

  await updateImportBatch(batchId, {
    totalRows: result.totalDataRows,
    importedCount: result.importedCount,
    duplicateCount,
    failedCount,
    status: "Completed",
  });

  return {
    message:
      skippedCount > 0
        ? `Import completed. ${skippedCount} row(s) skipped (${failedCount} error(s), ${duplicateCount} duplicate(s)).`
        : "Import completed. All rows imported successfully.",
    data: {
      batch: { id: batchId, original_filename: originalFilename, status: "Completed" },
      summary: {
        total_rows: result.totalDataRows,
        successful: result.importedCount,
        failed: failedCount,
        duplicates: duplicateCount,
        skipped: skippedCount,
      },
      errors: result.errors,
      duplicates: result.duplicates,
    },
  };
};

module.exports = {
  importLeads,
};
