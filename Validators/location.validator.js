const { createValidationError } = require("../Common/AppError");
const { parseOptionalChoice, parseOptionalText, parsePagination } = require("./helpers");

const LOCATION_STATUSES = ["active", "inactive", "all"];

const parseCode = (value, label, maxLength) => {
  const code = parseOptionalText(value, label, maxLength);

  if (code !== "" && !/^[A-Za-z0-9]+$/.test(code)) {
    throw createValidationError(`${label} must contain only letters and digits.`);
  }

  return code;
};

// ?search=&status=active|inactive|all plus the parent location codes
const validateLocationQuery = (query) => ({
  search: parseOptionalText(query.search, "search", 100),
  status: parseOptionalChoice(query.status, LOCATION_STATUSES, "active", "status"),
  countryCode: parseCode(query.countryCode, "countryCode", 2),
  stateCode: parseCode(query.stateCode, "stateCode", 5),
  cityCode: parseCode(query.cityCode, "cityCode", 10),
});

const validateLocalityQuery = (query) => ({
  ...validateLocationQuery(query),
  ...parsePagination(query, { defaultPerPage: 50, maxPerPage: 200 }),
});

module.exports = {
  validateLocationQuery,
  validateLocalityQuery,
};
