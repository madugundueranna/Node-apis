// AirproX CRM settings - every value comes from the environment (see .env.example).
// Read on use (not at startup) so a missing AirproX setting never stops other modules.

const SAME_SITE_VALUES = ["lax", "strict", "none"];
const DEFAULT_TIMEZONE = "Asia/Kolkata";
const MIN_SECRET_LENGTH = 32;

// NODE_ENV or ENVIRONMENT (used by the other Terraterri Node apps; trimmed
// because Windows "set ENVIRONMENT=production && node ..." keeps the space)

const isProduction = () =>
  [process.env.NODE_ENV, process.env.ENVIRONMENT].some(
    (value) => String(value || "").trim().toLowerCase() === "production"
  );

// "true" / "false" flag; any other value (or none) keeps the default
const readFlag = (value, defaultValue) => {
  const flag = String(value ?? "").trim().toLowerCase();

  if (flag === "true" || flag === "false") {
    return flag === "true";
  }

  return defaultValue;
};

// JWT signing / verification settings

exports.getJwtSettings = () => {
  const secret = process.env.JWT_SECRET || "";

  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters for AirproX authentication`
    );
  }

  // Plain digits are seconds ("86400"); otherwise a timespan such as "1d" or "12h"
  const rawExpiresIn = String(process.env.JWT_EXPIRES_IN || "1d").trim();
  const expiresIn = /^\d+$/.test(rawExpiresIn)
    ? Number(rawExpiresIn)
    : rawExpiresIn;

  return {
    secret,
    expiresIn,
    algorithm: "HS256",
    issuer: process.env.JWT_ISSUER || "airpropx-crm-api",
    audience: process.env.JWT_AUDIENCE || "airpropx-crm",
  };
};

// Auth cookie settings. HttpOnly always; Secure in production (and whenever
// SameSite=None, which browsers require); plain HTTP allowed for local development.

exports.getCookieSettings = () => {
  const sameSiteValue = String(process.env.JWT_COOKIE_SAMESITE || "lax")
    .trim()
    .toLowerCase();
  const sameSite = SAME_SITE_VALUES.includes(sameSiteValue)
    ? sameSiteValue
    : "lax";

  const options = {
    httpOnly: true,
    secure:
      isProduction() ||
      sameSite === "none" ||
      readFlag(process.env.JWT_COOKIE_SECURE, false),
    sameSite,
    path: "/",
  };

  if (process.env.JWT_COOKIE_DOMAIN) {
    options.domain = process.env.JWT_COOKIE_DOMAIN;
  }

  return {
    name: process.env.JWT_COOKIE_NAME || "airpropx_token",
    options,
  };
};

// Browser origins allowed to call the AirproX API with credentials (exact
// matches only - a wildcard is never honoured). Empty = same origin only.

exports.getAllowedOrigins = () =>
  String(process.env.AIRPROPX_CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter((origin) => origin && origin !== "*");

const toInteger = (value, fallback, min) => {
  const number = Number(value);

  return value !== undefined && value !== "" && Number.isInteger(number) && number >= min
    ? number
    : fallback;
};

// Login OTP settings. Defaults follow nodeapi-services-terraterri (5 minute
// OTP, 30 second resend cooldown). The SMS text states the expiry, so a
// different OTP_EXPIRY_MINUTES needs a matching DLT SMS template.

exports.getOtpSettings = () => ({
  expiryMinutes: toInteger(process.env.OTP_EXPIRY_MINUTES, 5, 1),
  resendCooldownSeconds: toInteger(process.env.OTP_RESEND_COOLDOWN_SECONDS, 30, 0),
  maxRequestsPerWindow: toInteger(process.env.OTP_MAX_REQUESTS, 5, 1),
  maxFailedAttemptsPerWindow: toInteger(process.env.OTP_MAX_FAILED_ATTEMPTS, 5, 1),
  rateLimitWindowMinutes: toInteger(process.env.OTP_RATE_LIMIT_WINDOW_MINUTES, 15, 1),
});

// Lead import: rows accepted per request (same IMPORT_MAX_ROWS as the CodeIgniter CRM)

exports.getLeadImportSettings = () => ({
  maxRows: toInteger(process.env.IMPORT_MAX_ROWS, 5000, 1),
});

// SMS provider (same provider and variables as nodeapi-services-terraterri).
// SMS_TLS_REJECT_UNAUTHORIZED=false skips the certificate check, as the
// reference does, for a provider whose certificate is not valid for SMS_HOST.

const REQUIRED_SMS_SETTINGS = {
  host: "SMS_HOST",
  username: "SMS_USERNAME",
  password: "SMS_PASSWORD",
  sender: "SMS_SENDER",
  otpTemplateId: "SMS_OTP_TEMPLATE_ID",
};

exports.getSmsSettings = () => {
  const missing = Object.values(REQUIRED_SMS_SETTINGS).filter(
    (name) => !process.env[name]
  );

  if (missing.length > 0) {
    throw new Error(`SMS provider is not configured: set ${missing.join(", ")}`);
  }

  return {
    host: process.env.SMS_HOST,
    port: process.env.SMS_PORT || "",
    username: process.env.SMS_USERNAME,
    password: process.env.SMS_PASSWORD,
    sender: process.env.SMS_SENDER,
    entityId: process.env.SMS_ENTITY_ID || "",
    tmid: process.env.SMS_TMID || "",
    otpTemplateId: process.env.SMS_OTP_TEMPLATE_ID,
    rejectUnauthorized: readFlag(process.env.SMS_TLS_REJECT_UNAUTHORIZED, true),
  };
};

// Business time zone - decides which leads are "today", "pending" or "future"

exports.getTimezone = () => {
  const timeZone = process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;

  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
    return timeZone;
  } catch (error) {
    console.error(
      `Invalid APP_TIMEZONE "${timeZone}", using ${DEFAULT_TIMEZONE}`
    );
    return DEFAULT_TIMEZONE;
  }
};
