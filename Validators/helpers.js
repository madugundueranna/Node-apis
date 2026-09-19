const { ERROR_MESSAGES } = require("../Common/Constants");
const { createValidationError } = require("../Common/AppError");

// Shared request validation helpers. Invalid input throws a 400 AppError.

const POSITIVE_INT = /^[1-9]\d{0,15}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// JSON object body of a write request (a cross-site form cannot send JSON)
const readJsonBody = (req) => {
  if (!req.is("application/json")) {
    throw createValidationError(ERROR_MESSAGES.JSON_BODY_REQUIRED);
  }

  const { body } = req;

  return body && typeof body === "object" && !Array.isArray(body) ? body : {};
};

// Strings and numbers as trimmed text; anything else (objects, arrays) as ""
const toText = (value) =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : "";

// Positive integer from a string or number, or null
const toPositiveInt = (value) => {
  const text = toText(value);

  return POSITIVE_INT.test(text) && Number.isSafeInteger(Number(text)) ? Number(text) : null;
};

// Optional positive integer: null when absent, 400 when present but invalid
const parseOptionalPositiveInt = (value, message) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = toPositiveInt(value);

  if (number === null) {
    throw createValidationError(message);
  }

  return number;
};

const parseRequiredPositiveInt = (value, message) => {
  const number = toPositiveInt(value);

  if (number === null) {
    throw createValidationError(message);
  }

  return number;
};

// Optional query text with a maximum length; repeated query keys are rejected
const parseOptionalText = (value, label, maxLength = 100) => {
  if (value === undefined) {
    return "";
  }

  if (typeof value !== "string") {
    throw createValidationError(`${label} is invalid.`);
  }

  const text = value.trim();

  if (text.length > maxLength) {
    throw createValidationError(`${label} may not be greater than ${maxLength} characters.`);
  }

  return text;
};

const parseOptionalChoice = (value, choices, fallback, label) => {
  if (value === undefined || value === "") {
    return fallback;
  }

  if (!choices.includes(value)) {
    throw createValidationError(`${label} must be one of: ${choices.join(", ")}.`);
  }

  return value;
};

// ?page=&per_page= (perPage also accepted)
const parsePagination = (query, { defaultPerPage, maxPerPage }) => {
  const page = parseOptionalPositiveInt(query.page, "page must be a positive integer.") ?? 1;
  const perPage =
    parseOptionalPositiveInt(
      query.per_page ?? query.perPage,
      "per_page must be a positive integer."
    ) ?? defaultPerPage;

  return { page, perPage: Math.min(perPage, maxPerPage) };
};

const isValidEmail = (value) => EMAIL.test(value);

module.exports = {
  readJsonBody,
  toText,
  toPositiveInt,
  parseOptionalPositiveInt,
  parseRequiredPositiveInt,
  parseOptionalText,
  parseOptionalChoice,
  parsePagination,
  isValidEmail,
};
