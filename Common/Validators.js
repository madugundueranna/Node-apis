const {
  ROLES,
  MOBILE_LOGIN_REQUIRED_FIELDS,
  VERIFY_OTP_REQUIRED_FIELDS,
  ERROR_MESSAGES,
} = require("./Constants");

const SUPPORTED_ROLES = Object.values(ROLES);

// Validated If Status is Either 'Active' or 'Inactive'

exports.isValidApprovalStatus = (status) => [true, false].includes(status);

// Validated If Status is Either 'Active' or 'Inactive'

exports.isValidStatus = (status) => ["Active", "Inactive"].includes(status);

// Validated If Status is Either 'Active' or 'Inactive' or 'Trash'

exports.isValidReporterStatus = (status) =>
  ["Active", "Inactive", "Trash"].includes(status);

// Validated If Status is Either 'Read' or 'NotRead'

exports.isValidNotificationStatus = (status) =>
  ["Read", "NotRead"].includes(status);

// ValidPost If Status is Either 'Pending' or 'Rejected'  or 'Published'

exports.isValidPostStatus = (status) =>
  ["Pending", "Rejected", "Published"].includes(status);

// ValidShort If Status is Either 'Pending' or 'Rejected'  or 'Published'

exports.isValidShortStatus = (status) =>
  ["Pending", "Rejected", "Published"].includes(status);

// ValidDailyQuotes If Status is Either 'image' or 'video'

exports.isValidDailyQuoteType = (status) => ["image", "video"].includes(status);

// validActions If Status is Either 'likes' or 'downloads' or 'shares' or 'dislikes' or 'comments'

exports.isValidActionStatus = (status) =>
  ["like", "download", "share", "dislike", "comments", "read"].includes(status);

// validActions If content is Either 'likes' or 'downloads' or 'shares' or 'dislikes' or 'comments'

exports.isValidContentType = (status) =>
  ["Post", "Short", "Quote", "Novel","Job"].includes(status);

// validActions If content is Either 'likes' or 'downloads' or 'shares' or 'dislikes' or 'comments'

exports.isValidContentTypeBookmark = (status) =>
  ["Post", "Quote"].includes(status);

// Validated Reporter Ticket If Status is Either 'inProgress' or 'resolved'  or underReview

exports.isValidReporterTicketStatus = (status) =>
  ["inProgress", "resolved", "underReview"].includes(status);


// Validated User Login Roles  If Status is Either 'GuestReporter' or 'User'

exports.isValidUserLoginRoleStatus = (role) =>
  ["User", "GuestReporter"].includes(role);

// Validated Reporter Login Roles  If Status is Either 'GuestReporter' or 'Reporter'

exports.isValidReporterLoginRoleStatus = (role) =>
  ["Reporter", "GuestReporter","Admin"].includes(role);

// Checks if required fields are present in the request body

exports.getMissingFields = (body, requiredFields) => {
  return requiredFields.filter((field) => !body[field]);
};

// Checks if required fields are present in the request body of an Array

exports.getMissingArrayFields = (array, requiredFields) => {
  const missingFields = [];

  array.forEach((item, index) => {
    const missingForObject = requiredFields.filter((field) => !(field in item));
    if (missingForObject.length > 0) {
      missingFields.push(
        `Object at index ${index}: ${missingForObject.join(", ")}`
      );
    }
  });

  return missingFields;
};

// Mobile number -> 10 digits, or null. Same rule as the CodeIgniter CRM:
// separators and a country code prefix (+91 ...) are ignored.

const normalizeMobile = (value) => {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const raw = String(value).trim();
  if (raw.length > 20) {
    return null;
  }

  const digits = raw.replace(/\D/g, "").slice(-10);

  return /^\d{10}$/.test(digits) ? digits : null;
};

exports.normalizeMobile = normalizeMobile;

// JSON request body with the required fields -> { body } or { error }

const readRequiredJsonFields = (req, requiredFields) => {
  if (!req.is("application/json")) {
    return { error: ERROR_MESSAGES.JSON_BODY_REQUIRED };
  }

  const body =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? req.body
      : {};

  const missingFields = exports.getMissingFields(body, requiredFields);
  if (missingFields.length > 0) {
    return { error: `Missing required fields: ${missingFields.join(", ")}` };
  }

  return { body };
};

// The role is only the requested role here; the database decides whether the user holds it

const validateMobileAndRole = (body) => {
  const mobile = normalizeMobile(body.mobile);
  if (!mobile) {
    return { error: ERROR_MESSAGES.INVALID_MOBILE };
  }

  const role = typeof body.role === "string" ? body.role.trim() : "";
  if (!SUPPORTED_ROLES.includes(role)) {
    return { error: ERROR_MESSAGES.INVALID_ROLE };
  }

  return { mobile, role };
};

// Request OTP -> { error } or { mobile, role }

exports.validateOtpRequest = (req) => {
  const { error, body } = readRequiredJsonFields(req, MOBILE_LOGIN_REQUIRED_FIELDS);

  return error ? { error } : validateMobileAndRole(body);
};

// Verify OTP -> { error } or { mobile, role, otp }

exports.validateVerifyOtpRequest = (req) => {
  const { error, body } = readRequiredJsonFields(req, VERIFY_OTP_REQUIRED_FIELDS);
  if (error) {
    return { error };
  }

  const login = validateMobileAndRole(body);
  if (login.error) {
    return login;
  }

  const otp = typeof body.otp === "string" || typeof body.otp === "number"
    ? String(body.otp).trim()
    : "";
  if (!/^\d{6}$/.test(otp)) {
    return { error: ERROR_MESSAGES.INVALID_OTP_FORMAT };
  }

  return { ...login, otp };
};

// Optional positive integer query value -> { value } (null when absent) or { error }

exports.parseOptionalId = (value, errorMessage) => {
  if (value === undefined || value === "") {
    return { value: null };
  }

  if (typeof value !== "string" || !/^[1-9]\d{0,18}$/.test(value)) {
    return { error: errorMessage };
  }

  const id = Number(value);

  return Number.isSafeInteger(id) ? { value: id } : { error: errorMessage };
};
