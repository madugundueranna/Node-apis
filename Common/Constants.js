// Required fields for Reporter Registration

exports.REPORTER_REGISTRATION_REQUIRED_FIELDS = [
  "firstName",
  "email",
  "mobileNumber",
];

// User Login Required Fields

exports.USER_LOGIN_REQUIRED_FIELDS = ["email", "role"]


// Login Required Fields

exports.LOGIN_REQUIRED_FIELDS = ["email", "password", "role"];

// Language Required Fields

exports.LANGUAGE_REQUIRED_FIELDS = ["languageName"];

// Post Category Required Fields

exports.POST_CATEGORY_REQUIRED_FIELDS = ["postCategoryName"];

// Post Required Fields

exports.POST_REQUIRED_FIELDS = [
  "postCategory",
  "postReportedDetails",
  "postLanguage",
  "postTitle",
  "postDescription",
  "postedOn",
  "postLocationDetails",
];

// Daily Quote Required Fields

exports.DAILY_QUOTE_REQUIRED_FIELDS = ["dailyQuoteReportedDetails","dailyQuoteLanguage"];

// Short Category Required Fields

exports.SHORT_CATEGORY_REQUIRED_FIELDS = ["shortCategoryName"];

// Short Required Fields

exports.SHORT_REQUIRED_FIELDS = [
  "shortCategory",
  "shortReportedDetails",
  "shortPostedOn",
  "shortLanguage"
];

// Novel Category Required Fields

exports.NOVEL_CATEGORY_REQUIRED_FIELDS = ["novelCategoryName"];

// Novel  Required Fields

exports.NOVEL_REQUIRED_FIELDS = ["startDateTime", "novelCategory", "title","novelLanguage"];

// Job Required Fields

exports.JOB_REQUIRED_FIELDS = [
  "jobTitle",
  "description",
  "hyperlink",
  "expiryDate",
  "role",
  "industryType",
  "department",
  "education",
];

// Ads Required Fields

exports.Ads_REQUIRED_FIELDS = ["adsTitle", "startDateTime", "expiryDateTime"];

// Magazine Required Fields

exports.MAGAZINE_REQUIRED_FIELDS = ["name", "startDate", "expiryDate","magazineLanguage"];

// Dos and Dont's Required Fields

exports.DOS_AND_DONOTS_REQUIRED_FIELDS = ["title", "points"];

// Reporter Tickets Required Fields

exports.TICKETS_REQUIRED_FIELDS = ["roleID", "description"];

// User Activity Required Fields

exports.USER_ACTIVITY_REQUIRED_FIELDS = [
  "contentID",
  "userId",
  "contentType",
  "action",
];

// Bookmark Required Fields

exports.BOOKMARK_REQUIRED_FIELDS = ["contentID", "userId", "contentType"];

// Content Comments Required Fields

exports.CONTENT_COMMENT_REQUIRED_FIELDS = [
  "userID",
  "contentID",
  "contentType",
  "comment",
];

// translate Required Fields

exports.TRANSLATE_REQUIRED_FIELDS = [
  "name", "data"
];
// Content Replies Required Fields

exports.CONTENT_COMMENT_REPLIES_REQUIRED_FIELDS = ["userID", "comment"];



// category Required Fields

exports.CATEGORY_REQUIRED_FIELDS = ["categoryName"]


// Change Password Required Fields

exports.CHANGE_PASSWORD_REQUIRED_FIELDS = [
  "otp",
  "newPassword",
  "confirmNewPassword",
];

// Location Required Fields

exports.LOCATION_REQUIRED_FIELDS = [
  "locationName",
]

// API prefix

exports.API_PREFIX = "/api/v1/airpropx";

// master_role.name of the roles that can log in to the CRM.
// Role ids are never used in code - they are resolved from master_role by name.

exports.ROLES = Object.freeze({
  SALES_DIRECTOR: "Sales Director",
  FRANCHISE_SALES_MANAGER: "Franchise Sales Manager",
});

// airpropx_franchise_crm_role_access.lead_scope values

exports.LEAD_SCOPES = Object.freeze({
  OWN: "OWN",
  FRANCHISE_TYPES: "FRANCHISE_TYPES",
  ALL: "ALL",
});

// airpropx_franchise_modules.date_filter_type values that pick one date bucket

exports.DATE_BUCKETS = Object.freeze(["today", "pending", "future"]);

// OTP Login Required Fields

exports.MOBILE_LOGIN_REQUIRED_FIELDS = ["mobile", "role"];

exports.VERIFY_OTP_REQUIRED_FIELDS = ["mobile", "role", "otp"];

// Error messages

exports.ERROR_MESSAGES = {
  MOBILE_NUMBER_EXISTS: "Mobile Number already exists.",
  EMAIL_EXISTS: "Email already exists.",
  LOGIN_CREDENTIALS_CHECK: "Mobile Number, and Password are required.",
  INVALID_PASSWORD: "Incorrect Password, please check.",
  INVALID_EMAIL_NUMBER: "Email doesn't exists",
  INVALID_EMAIL: "Email doesn't exists",
  LOGIN_FAILED: "Failed to login with these credentials",
  LOGOUT_FAILED: "Failed to logout",
  ACTIVE_LOGIN_CHECK:
    "Only Activated Login are able to login. check your access details",
  ID_NOT_FOUND: "ID is required in params and must be a 24 characters HEX Code",
  APPROVED_LOGIN_CHECK: (role) =>
    `Only Approved ${role} are able to login. check your access details`,
  REGISTRATION_FAILED: (role) => `${role} registration failed`,
  CREATION_FAILED: (role) => `${role} creation failed`,
  ROLE_NOT_FOUND: (role) =>
    `Only ${role} has access, check you role permissions`,
  FETCH_FAILED: (role) => `Failed to fetch ${role}`,
  ID_NOT_FOUND: (role) =>
    `${role} ID is required in params and must be a 24 characters HEX Code`,
  CHANGE_PASSWORD_MATCH:
    "New Password and Confirm New Password does not match, please check.",
  CHANGE_PASSWORD_FAILED: "Failed to change password, please check.",
  OTP_PASSWORD_FAILED: "Incorrect otp, please check.",
  INVALID_APPROVAL_STATUS:
    "Invalid Status value. Only 'true' or 'false' are allowed",
  INVALID_STATUS:
    "Invalid Status value. Only 'Active' or 'Inactive' are allowed",
  INVALID_REPORTER_STATUS:
    "Invalid Status value. Only 'Active' or 'Inactive' or 'Trash' are allowed",
  INVALID_POST_STATUS:
    "Invalid Status value. Only 'Pending' or 'Rejected' or 'Published' are allowed",
  INVALID_SHORT_STATUS:
    "Invalid Status value. Only 'Pending' or 'Rejected' or 'Published' are allowed",
  INVALID_TICKET_STATUS:
    "Invalid Status value. Only 'inProgress' or 'resolved' or 'underReview' are allowed",
  INVALID_MEDIA_TYPE:
    "Invalid Media Type value. Only 'image' or 'video' are allowed",
  CREATE_FAILED: "Failed to Create",
  UPDATE_FAILED: (role) => `Failed to update ${role} details.`,
  STATUS_UPDATE_FAILED: (name) => `Failed to update status for ${name}`,
  FILE_UPLOAD_FAILED: (name) => `Failed to upload ${name} file`,
  NOTIFICATION_FAILED: (name) => `Failed to send ${name} notification`,
  NOT_FOUND: (name) => `${name} details not found.`,
  ALREADY_EXISTS: (name) => `${name} already exists.`,
  FILE_DELETE_FAILED: (name) => `Failed to delete old ${name} file`,
  DELETE_FAILED: "Failed to delete expenditure.",
  INVALID_ACTION_STATUS:
    "Invalid Status value. Only 'like' or 'download' or 'share' or 'dislike' or 'comments or 'read' are allowed",
  INVALID_CONTENT_TYPE:
    "Invalid Content Type. Only 'Post' or 'Short' or 'Quote' or 'Novel' or 'Job' are allowed",
  INVALID_BOOKMARK_CONTENT_TYPE:
    "Invalid Content Type. Only 'Post' or 'Quote' are allowed",
  FILE_NOT_FOUND: "No file uploaded. Please upload an XLSX file",
  INVALID_USER_ROLE_STATUS: "Invalid role value. Only 'User', 'GuestReporter  are allowed",
  INVALID_REPORTER_ROLE_STATUS: "Invalid role value. Only 'Reporter', 'GuestReporter  are allowed",
  REST_PASSWORD_FAILED: "Failed to create rest password",
  RESET_PASSWORD_FAILED: "Failed to reset password, please check.",
  OTP_ALREADY_USED: "OTP has already been used",
  PASSWORD_EXPIRED: "The OTP has expired. Please request a new one.",
  INVALID_USER_STATUS: "User not Active. Please Contact Admin",
  JSON_BODY_REQUIRED: "Request body must be JSON (Content-Type: application/json)",
  INVALID_JSON: "Invalid JSON request body",
  INVALID_MOBILE: "Please enter a valid 10-digit mobile number",
  INVALID_ROLE: "Invalid role",
  INVALID_OTP_FORMAT: "Please enter a valid 6-digit OTP",
  OTP_NOT_FOUND: "OTP not found or expired",
  INVALID_OTP: "Invalid OTP",
  OTP_EXPIRED: "OTP expired",
  OTP_COOLDOWN: "Please wait a moment before requesting another OTP",
  OTP_SEND_FAILED: "Unable to send OTP right now. Please try again",
  TOO_MANY_OTP_REQUESTS: "Too many OTP requests. Please try again later",
  TOO_MANY_OTP_ATTEMPTS: "Too many failed OTP attempts. Please try again later",
  INVALID_FRANCHISE_TYPE: "franchiseType must be a positive integer",
  INVALID_LOGIN: "Invalid mobile number or role",
  INACTIVE_ACCOUNT:
    "Your account is currently inactive. Please contact your administrator",
  NO_ACCESS: "You don't have access. Please contact the administrator",
  MULTIPLE_ACCOUNTS:
    "Multiple active accounts found for this mobile number and role. Please contact the administrator",
  LOGIN_REQUIRED: "Authentication required",
  SESSION_EXPIRED: "Your session has expired. Please login again",
  INVALID_SESSION: "Unauthorized: Invalid session. Please login again",
  ACCESS_REVOKED:
    "Your access has been revoked. Please contact the administrator",
  FORBIDDEN_ROLE: "You do not have permission to access this resource",
  SOMETHING_WENT_WRONG: "Something went wrong. Please try again",
  SERVICE_UNAVAILABLE: "Service temporarily unavailable. Please try again later",
  INVALID_REQUEST: "Invalid request",
  PERMISSION_DENIED: "You do not have access to this action",
  RECORD_NOT_FOUND: "Record not found",
  DUPLICATE_RECORD: "Record already exists",
  OPERATION_FAILED: "Something went wrong. Please try again",
}

// Franchise lead list paging and import limits (same as the CodeIgniter CRM)

exports.LEAD_LIST_DEFAULT_PER_PAGE = 10;

exports.LEAD_LIST_MAX_PER_PAGE = 100;

exports.LEAD_IMPORT_DEFAULT_MAX_ROWS = 5000;

exports.LEAD_TEXT_MAX_LENGTH = 5000;

// Next Activity option that changes the lead's franchise type instead of its status

exports.CHANGE_FRANCHISE_TYPE_OPTION = "change_franchise_type";

exports.TRANSFER_TYPES = Object.freeze(["internal", "external"]);

// Franchise lead messages (same wording as the CodeIgniter CRM)

exports.LEAD_MESSAGES = {
  NOT_FOUND: "Lead not found.",
  LIST: "Franchise Leads",
  DETAILS: "Lead details",
  CREATED: "Franchise Lead added successfully.",
  UPDATED: "Franchise Lead updated successfully.",
  NEXT_ACTIVITY: "Next activity options",
  ACTIVITY_SAVED: "Activity saved successfully.",
  NO_RESPONSE_SAVED: "No Response saved successfully.",
  DUPLICATE: (mobile) => `Duplicate Lead: Mobile number ${mobile} already exists.`,
  TYPE_NOT_ASSIGNED: "Selected Franchise Type is not assigned to you.",
  STATUS_NOT_CONFIGURED: "Selected status is not configured for lead movement yet.",
  TRANSITION_NOT_ALLOWED: "That status change is not allowed from the lead's current status.",
  DROPOUT_REASON_REQUIRED: "Please select at least one dropout reason.",
  CURRENT_STATUS_MISSING: "Lead status is not configured. Please contact the administrator.",
  ENTRY_STATUS_MISSING: "Entry status is not configured. Please contact the administrator.",
  TYPE_CHANGE_CLOSED: "Franchise Type can no longer be changed for this lead.",
  INVALID_FRANCHISE_TYPE: "Selected Franchise Type is not valid.",
  SAME_FRANCHISE_TYPE: "The lead already belongs to the selected Franchise Type.",
  INTERNAL_TYPE_NOT_ALLOWED: "Selected Franchise Type is not available for Internal Transfer.",
  UNKNOWN_MODULE: "Unknown module.",
  IMPORT_FAILED: "Something went wrong while importing leads.",
}


// Response messages

exports.RESPONSE_MESSAGES = {
  REGISTRATION_SUCCESS: (name) => `${name} created successfully.`,
  LOGIN_SUCCESS: "Login Successful",
  OTP_SENT: "OTP sent successfully",
  LOGOUT_SUCCESS: "Logout Successful",
  CREATION_SUCCESS: (name) => `${name} created successfully`,
  REMOVED_SUCCESS: (name) => `${name} removed successfully`,
  FETCH_SUCCESS: (name) => `${name} details fetched successfully`,
  FETCH_NOT_FOUND: (name) => `${name} details not found`,
  UPDATE_SUCCESS: (name) => `${name} details updated successfully.`,
  STATUS_UPDATED_SUCCESS: (name) => `${name} status updated successfully`,
  CHANGE_PASSWORD_SUCCESS: (name) => `${name} password changed successfully`,
  FILE_UPLOAD_SUCCESS: (name) => `${name} file uploaded successfully`,
  NOTIFICATION_SUCCESS: (name) => `${name} notification sent`,
  DELETE_SUCCESS: (name) => `${name} successfully.`,
  NO_CHANGES_FOUND: "No changes were made. The data is already up to date",
  REST_PASSWORD_SUCCESS: "Password reset link sent to your email",
  RESET_PASSWORD_SUCCESS: "Successfully password Created",
};
