const {
  CHANGE_FRANCHISE_TYPE_OPTION,
  LEAD_LIST_DEFAULT_PER_PAGE,
  LEAD_LIST_MAX_PER_PAGE,
  LEAD_MESSAGES,
  LEAD_TEXT_MAX_LENGTH,
  TRANSFER_TYPES,
} = require("../Common/Constants");
const { APP_ERRORS, createAppError, createValidationError } = require("../Common/AppError");
const { isValidDateString } = require("../Common/Dates");
const {
  isValidEmail,
  parseOptionalChoice,
  parseOptionalPositiveInt,
  parseOptionalText,
  parsePagination,
  toPositiveInt,
  toText,
} = require("./helpers");

// Same field rules and messages as the CodeIgniter CRM

const LEAD_SORT_KEYS = ["name", "date", "phone", "franchiseType", "status", "createdBy", "createdAt"];

// /leads/:id - an id that cannot exist is simply a lead that is not found
const parseLeadId = (value) => {
  const leadId = toPositiveInt(value);

  if (leadId === null) {
    throw createAppError(APP_ERRORS.RECORD_NOT_FOUND, { message: LEAD_MESSAGES.NOT_FOUND });
  }

  return leadId;
};

const parseAssignedTo = (value) => {
  const assignedTo = parseOptionalText(value, "assignedTo", 20);

  if (assignedTo === "" || assignedTo === "me" || assignedTo === "unassigned") {
    return assignedTo;
  }

  const salesDirectorId = toPositiveInt(assignedTo);

  if (salesDirectorId === null) {
    throw createValidationError("assignedTo must be me, unassigned or a Sales Director id.");
  }

  return salesDirectorId;
};

const parseOptionalDate = (value) => {
  const date = parseOptionalText(value, "Date", 10);

  if (date !== "" && !isValidDateString(date)) {
    throw createValidationError("Please select a valid date.");
  }

  return date || null;
};

// GET /leads query
const validateLeadListQuery = (query) => ({
  filters: {
    module: parseOptionalText(query.module, "module", 50),
    status: parseOptionalText(query.status, "status", 50),
    franchiseTypeId: parseOptionalPositiveInt(
      query.franchiseType,
      "franchiseType must be a positive integer."
    ),
    sourceId: parseOptionalPositiveInt(query.source, "source must be a positive integer."),
    assignedTo: parseAssignedTo(query.assignedTo),
    dateField: parseOptionalChoice(query.dateField, ["followup", "created"], "followup", "dateField"),
    dateFrom: parseOptionalDate(query.dateFrom),
    dateTo: parseOptionalDate(query.dateTo),
    search: parseOptionalText(query.search, "search", 100),
  },
  ...parsePagination(query, {
    defaultPerPage: LEAD_LIST_DEFAULT_PER_PAGE,
    maxPerPage: LEAD_LIST_MAX_PER_PAGE,
  }),
  sort: parseOptionalChoice(query.sort, LEAD_SORT_KEYS, null, "sort"),
  direction: parseOptionalChoice(query.direction, ["asc", "desc"], "asc", "direction"),
});

const addError = (errors, field, message) => {
  errors[field] = [...(errors[field] || []), message];
};

const throwFirstError = (errors) => {
  const fields = Object.keys(errors);

  if (fields.length > 0) {
    throw createValidationError(errors[fields[0]][0], errors);
  }
};

// Optional comments: trimmed, null when empty
const parseComments = (value, label = "Comments") => {
  const comments = toText(value);

  if (comments.length > LEAD_TEXT_MAX_LENGTH) {
    throw createValidationError(`${label} may not be greater than ${LEAD_TEXT_MAX_LENGTH} characters.`);
  }

  return comments || null;
};

// POST /leads and PUT /leads/:id body. The franchise type is set only when
// creating; afterwards it changes through Change Franchise Type.
const validateLeadInput = (body, { creating }) => {
  const errors = {};

  const customerName = toText(body.customerName);
  if (customerName === "") {
    addError(errors, "customerName", "Customer Name is required.");
  } else if (customerName.length > 150) {
    addError(errors, "customerName", "Customer Name may not be greater than 150 characters.");
  }

  const mobileNumber = toText(body.mobileNumber).replace(/\s+/g, "");
  if (mobileNumber === "") {
    addError(errors, "mobileNumber", "Mobile Number is required.");
  } else if (!/^\d{10}$/.test(mobileNumber)) {
    addError(errors, "mobileNumber", "Mobile Number must be 10 digits.");
  }

  const emailId = toText(body.emailId);
  if (emailId !== "" && (!isValidEmail(emailId) || emailId.length > 150)) {
    addError(errors, "emailId", "Email ID must be a valid email address.");
  }

  const sourceId = toPositiveInt(body.sourceId);
  if (sourceId === null) {
    addError(errors, "sourceId", "Please select a valid Source.");
  }

  const franchiseTypeId = creating ? toPositiveInt(body.franchiseTypeId) : null;
  if (creating && franchiseTypeId === null) {
    addError(errors, "franchiseTypeId", "Please select a valid Franchise Type.");
  }

  const comments = toText(body.comments);
  if (comments.length > LEAD_TEXT_MAX_LENGTH) {
    addError(errors, "comments", `Comments may not be greater than ${LEAD_TEXT_MAX_LENGTH} characters.`);
  }

  throwFirstError(errors);

  return {
    customerName,
    mobileNumber,
    emailId: emailId || null,
    sourceId,
    comments: comments || null,
    ...(creating ? { franchiseTypeId } : {}),
  };
};

// Date + hours + minutes of the Next Activity form
const parseSchedule = (body, required) => {
  const date = toText(body.futureDate);

  if (date === "") {
    if (required) {
      throw createValidationError("Please select a Date.");
    }

    return { date: null, hours: null, minutes: null };
  }

  if (!isValidDateString(date)) {
    throw createValidationError("Please select a valid Date.");
  }

  const hours = toText(body.hours);
  if (!/^\d{1,2}$/.test(hours) || Number(hours) > 23) {
    throw createValidationError("Please select Hours.");
  }

  const minutes = toText(body.minutes);
  if (!/^\d{1,2}$/.test(minutes) || Number(minutes) > 59) {
    throw createValidationError("Please select Minutes.");
  }

  return { date, hours: Number(hours), minutes: Number(minutes) };
};

const parseDropoutReasonIds = (value) => {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value];

  return [...new Set(values.map(toPositiveInt).filter((id) => id !== null))];
};

// POST /leads/:id/activity: a status move, or the Change Franchise Type option
const validateActivityInput = (body) => {
  const futureStatus = toText(body.futureStatusTypeId);

  if (futureStatus === "") {
    throw createValidationError("Please select a Future Act status.");
  }

  if (futureStatus === CHANGE_FRANCHISE_TYPE_OPTION) {
    const transferType = toText(body.transferType);
    if (!TRANSFER_TYPES.includes(transferType)) {
      throw createValidationError("Please select a Transfer Type.");
    }

    const franchiseTypeId = toPositiveInt(body.franchiseTypeId);
    if (franchiseTypeId === null) {
      throw createValidationError("Please select a Franchise Type.");
    }

    return {
      changeFranchiseType: {
        transferType,
        franchiseTypeId,
        schedule: parseSchedule(body, false),
        comments: parseComments(body.comments),
      },
    };
  }

  const statusTypeId = toPositiveInt(futureStatus);
  if (statusTypeId === null) {
    throw createValidationError(LEAD_MESSAGES.STATUS_NOT_CONFIGURED);
  }

  return {
    statusMove: {
      statusTypeId,
      schedule: parseSchedule(body, true),
      comments: parseComments(body.comments),
      dropoutReasonIds: parseDropoutReasonIds(body.dropoutReasonIds),
    },
  };
};

// POST /leads/:id/no-response
const validateNoResponseInput = (body) => {
  const date = toText(body.noResponseDate);

  if (date === "") {
    throw createValidationError("Date is required.");
  }

  if (!isValidDateString(date)) {
    throw createValidationError("Please select a valid date.");
  }

  return { date, comments: parseComments(body.reason, "Reason") };
};

// POST /leads/import: rows parsed from the sheet by the client
const validateImportInput = (body, maxRows) => {
  const rows = body.data;

  if (!Array.isArray(rows) || rows.length === 0) {
    const message = "No lead rows were provided for import.";
    throw createValidationError(message, { data: [message] });
  }

  if (rows.length > maxRows) {
    throw createValidationError(`A maximum of ${maxRows} rows can be imported at a time.`);
  }

  const originalFilename = toText(body.original_filename).slice(0, 255);

  return { rows, originalFilename: originalFilename || null };
};

module.exports = {
  parseLeadId,
  validateLeadListQuery,
  validateLeadInput,
  validateActivityInput,
  validateNoResponseInput,
  validateImportInput,
};
