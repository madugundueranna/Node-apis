const { ERROR_MESSAGES } = require("./Constants");

// Expected application failures thrown by services. Each code is also the key
// of its default ERROR_MESSAGES entry; controllers map codes to HTTP statuses
// (Common/ErrorResponses.js).

const APP_ERRORS = Object.freeze({
  INVALID_LOGIN: "INVALID_LOGIN",
  INACTIVE_ACCOUNT: "INACTIVE_ACCOUNT",
  NO_ACCESS: "NO_ACCESS",
  MULTIPLE_ACCOUNTS: "MULTIPLE_ACCOUNTS",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  INVALID_SESSION: "INVALID_SESSION",
  ACCESS_REVOKED: "ACCESS_REVOKED",
  OTP_NOT_FOUND: "OTP_NOT_FOUND",
  INVALID_OTP: "INVALID_OTP",
  OTP_EXPIRED: "OTP_EXPIRED",
  OTP_COOLDOWN: "OTP_COOLDOWN",
  OTP_SEND_FAILED: "OTP_SEND_FAILED",
  INVALID_REQUEST: "INVALID_REQUEST",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  RECORD_NOT_FOUND: "RECORD_NOT_FOUND",
  DUPLICATE_RECORD: "DUPLICATE_RECORD",
  OPERATION_FAILED: "OPERATION_FAILED",
});

// message: overrides the default message; details: field errors for the response
const createAppError = (code, { message, details } = {}) => {
  const error = new Error(message ?? ERROR_MESSAGES[code]);
  error.name = "AppError";
  error.code = code;

  if (details) {
    error.details = details;
  }

  return error;
};

const createValidationError = (message, details) =>
  createAppError(APP_ERRORS.INVALID_REQUEST, { message, details });

const isAppError = (error) =>
  error instanceof Error && error.name === "AppError";

module.exports = {
  APP_ERRORS,
  createAppError,
  createValidationError,
  isAppError,
};
