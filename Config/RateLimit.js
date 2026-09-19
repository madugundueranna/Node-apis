const rateLimit = require("express-rate-limit");
const { ERROR_MESSAGES } = require("../Common/Constants");
const { normalizeMobile } = require("../Common/Validators");
const { sendErrorResponse } = require("../Common/Responses");
const STATUS = require("../Common/StatusCodes");
const { getOtpSettings } = require("./Config");

// OTP rate limits per mobile number (in-memory, per server instance).
// Requests without a valid mobile number are left to request validation.

const mobileOf = (req) => normalizeMobile(req.body ? req.body.mobile : undefined);

const createMobileRateLimit = ({ limit, message, skipSuccessfulRequests }) => {
  const settings = getOtpSettings();

  return rateLimit({
    windowMs: settings.rateLimitWindowMinutes * 60 * 1000,
    limit,
    skipSuccessfulRequests,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => mobileOf(req),
    skip: (req) => !mobileOf(req),
    handler: (req, res) =>
      sendErrorResponse(res, STATUS.TOO_MANY_REQUESTS, message),
  });
};

// Every OTP request counts (limits SMS sent to one number)
const otpRequestRateLimit = createMobileRateLimit({
  limit: getOtpSettings().maxRequestsPerWindow,
  message: ERROR_MESSAGES.TOO_MANY_OTP_REQUESTS,
  skipSuccessfulRequests: false,
});

// Only failed verifications count (limits OTP guessing)
const otpVerifyRateLimit = createMobileRateLimit({
  limit: getOtpSettings().maxFailedAttemptsPerWindow,
  message: ERROR_MESSAGES.TOO_MANY_OTP_ATTEMPTS,
  skipSuccessfulRequests: true,
});

module.exports = {
  otpRequestRateLimit,
  otpVerifyRateLimit,
};
