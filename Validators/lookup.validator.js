const { parseOptionalPositiveInt, parseRequiredPositiveInt } = require("./helpers");

// Change Franchise Type cascade query parameters

const requireQueryId = (query, key) =>
  parseRequiredPositiveInt(query[key], `${key} is required.`);

const parseOptionalLeadId = (query) =>
  parseOptionalPositiveInt(query.leadId, "leadId must be a positive integer.");

module.exports = {
  requireQueryId,
  parseOptionalLeadId,
};
