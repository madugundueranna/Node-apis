const { RESPONSE_MESSAGES, ERROR_MESSAGES } = require("../Common/Constants");
const { parseOptionalId } = require("../Common/Validators");
const { sendErrorResponse, sendSuccessResponse } = require("../Common/Responses");
const { sendExceptionResponse } = require("../Common/ErrorResponses");
const STATUS = require("../Common/StatusCodes");
const { getDashboard } = require("../Services/dashboard.service");

// Franchise Lead Dashboard of the logged-in user (?franchiseType=<id> optional)
const getFranchiseLeadDashboard = async (req, res) => {
  // Leads are scoped to the logged-in user - no req.auth (authenticate
  // middleware missing) means no user, so never reach the service without it
  if (!req.auth || !req.auth.identity || !req.auth.access) {
    return sendErrorResponse(res, STATUS.UNAUTHORIZED, ERROR_MESSAGES.LOGIN_REQUIRED);
  }

  const franchiseType = parseOptionalId(
    req.query.franchiseType,
    ERROR_MESSAGES.INVALID_FRANCHISE_TYPE
  );

  if (franchiseType.error) {
    return sendErrorResponse(res, STATUS.BAD_REQUEST, franchiseType.error);
  }

  try {
    const dashboard = await getDashboard(req.auth, franchiseType.value);

    return sendSuccessResponse(
      res,
      STATUS.OK,
      RESPONSE_MESSAGES.FETCH_SUCCESS("Dashboard"),
      dashboard,
      "data"
    );
  } catch (error) {
    return sendExceptionResponse(res, error, "Failed to fetch AirproX dashboard:");
  }
};

module.exports = {
  getFranchiseLeadDashboard,
};
