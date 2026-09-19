const { APP_ERRORS, createAppError } = require("../Common/AppError");
const { parseOptionalChoice, toPositiveInt } = require("./helpers");

const parseSalesManagerId = (value) => {
  const userId = toPositiveInt(value);

  if (userId === null) {
    throw createAppError(APP_ERRORS.RECORD_NOT_FOUND, {
      message: "Franchise Sales Manager not found.",
    });
  }

  return userId;
};

const parseAssignmentFilter = (query) =>
  parseOptionalChoice(query.assignment, ["all", "assigned", "unassigned"], "all", "assignment");

module.exports = {
  parseSalesManagerId,
  parseAssignmentFilter,
};
