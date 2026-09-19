const { Prisma } = require("@prisma/client");
const { ERROR_MESSAGES } = require("./Constants");
const { APP_ERRORS, isAppError } = require("./AppError");
const { sendErrorResponse } = require("./Responses");
const STATUS = require("./StatusCodes");

const APP_ERROR_STATUS = {
  [APP_ERRORS.INVALID_LOGIN]: STATUS.UNAUTHORIZED,
  [APP_ERRORS.INACTIVE_ACCOUNT]: STATUS.FORBIDDEN,
  [APP_ERRORS.NO_ACCESS]: STATUS.FORBIDDEN,
  [APP_ERRORS.MULTIPLE_ACCOUNTS]: STATUS.CONFLICT,
  [APP_ERRORS.SESSION_EXPIRED]: STATUS.UNAUTHORIZED,
  [APP_ERRORS.INVALID_SESSION]: STATUS.UNAUTHORIZED,
  [APP_ERRORS.ACCESS_REVOKED]: STATUS.UNAUTHORIZED,
  [APP_ERRORS.OTP_NOT_FOUND]: STATUS.UNAUTHORIZED,
  [APP_ERRORS.INVALID_OTP]: STATUS.UNAUTHORIZED,
  [APP_ERRORS.OTP_EXPIRED]: STATUS.UNAUTHORIZED,
  [APP_ERRORS.OTP_COOLDOWN]: STATUS.TOO_MANY_REQUESTS,
  [APP_ERRORS.OTP_SEND_FAILED]: STATUS.BAD_GATEWAY,
  [APP_ERRORS.INVALID_REQUEST]: STATUS.BAD_REQUEST,
  [APP_ERRORS.PERMISSION_DENIED]: STATUS.FORBIDDEN,
  [APP_ERRORS.RECORD_NOT_FOUND]: STATUS.NOT_FOUND,
  [APP_ERRORS.DUPLICATE_RECORD]: STATUS.CONFLICT,
  [APP_ERRORS.OPERATION_FAILED]: STATUS.INTERNAL_SERVER_ERROR,
};

// Prisma codes for a database that cannot be used right now: authentication
// failed, unreachable, timeouts, missing database, TLS, closed connection,
// connection pool timeout
const DATABASE_UNAVAILABLE_CODES = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1003",
  "P1008",
  "P1011",
  "P1017",
  "P2024",
]);

const isDatabaseUnavailable = (error) =>
  error instanceof Prisma.PrismaClientInitializationError ||
  (error instanceof Prisma.PrismaClientKnownRequestError &&
    DATABASE_UNAVAILABLE_CODES.has(error.code));

// Response for an error thrown while handling a request. Application errors
// keep their message; anything else is logged on the server only and answered
// with a generic 503 (database unavailable) or 500.
const sendExceptionResponse = (res, error, logMessage) => {
  if (isAppError(error)) {
    return sendErrorResponse(
      res,
      APP_ERROR_STATUS[error.code] ?? STATUS.INTERNAL_SERVER_ERROR,
      error.message,
      error.details
    );
  }

  console.error(logMessage, error);

  if (isDatabaseUnavailable(error)) {
    return sendErrorResponse(
      res,
      STATUS.SERVICE_UNAVAILABLE,
      ERROR_MESSAGES.SERVICE_UNAVAILABLE
    );
  }

  return sendErrorResponse(
    res,
    STATUS.INTERNAL_SERVER_ERROR,
    ERROR_MESSAGES.SOMETHING_WENT_WRONG
  );
};

module.exports = {
  isDatabaseUnavailable,
  sendExceptionResponse,
};
