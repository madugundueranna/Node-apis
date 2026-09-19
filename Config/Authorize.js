const { authenticateToken } = require("../Services/auth.service");
const { isAppError } = require("../Common/AppError");
const { getCookieSettings } = require("./Config");
const {
  ROLES,
  ERROR_MESSAGES,
} = require("../Common/Constants");
const { sendErrorResponse } = require("../Common/Responses");
const { sendExceptionResponse } = require("../Common/ErrorResponses");
const STATUS = require("../Common/StatusCodes");

// Token Verification (JWT from the HttpOnly auth cookie)
// Sets req.user = the authenticated user and req.auth = { identity, access, expiresAt }

const authenticate = async (req, res, next) => {
  const cookie = getCookieSettings();
  const token = req.cookies ? req.cookies[cookie.name] : undefined;

  if (typeof token !== "string" || token === "") {
    return sendErrorResponse(
      res,
      STATUS.UNAUTHORIZED,
      ERROR_MESSAGES.LOGIN_REQUIRED
    );
  }

  try {
    req.auth = await authenticateToken(token);
    req.user = req.auth.identity;
    return next();
  } catch (error) {
    // An unusable token is dropped so the browser stops sending it
    if (isAppError(error)) {
      res.clearCookie(cookie.name, cookie.options);
    }

    return sendExceptionResponse(res, error, "Error authenticating AirproX user:");
  }
};

// Role Based Permissions - master_role names, e.g.
// authorizeRole(ROLES.SALES_DIRECTOR). Use after authenticate.

const authorizeRole = (...roles) => {
  const allowedRoles = roles.flat();
  const knownRoles = Object.values(ROLES);
  const unknownRoles = allowedRoles.filter(
    (role) => !knownRoles.includes(role)
  );

  if (allowedRoles.length === 0 || unknownRoles.length > 0) {
    throw new Error(
      `authorizeRole: unknown AirproX role(s): ${unknownRoles.join(", ") || "none given"}`
    );
  }

  return (req, res, next) => {
    if (!req.auth) {
      return sendErrorResponse(
        res,
        STATUS.UNAUTHORIZED,
        ERROR_MESSAGES.LOGIN_REQUIRED
      );
    }

    if (!allowedRoles.includes(req.auth.identity.roleName)) {
      return sendErrorResponse(
        res,
        STATUS.FORBIDDEN,
        ERROR_MESSAGES.FORBIDDEN_ROLE
      );
    }

    return next();
  };
};

module.exports = { authenticate, authorizeRole };
