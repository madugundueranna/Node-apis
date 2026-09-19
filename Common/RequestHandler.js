const { sendSuccessResponse } = require("./Responses");
const { sendExceptionResponse } = require("./ErrorResponses");
const STATUS = require("./StatusCodes");

// Express handler around a function that returns { message, data, status? }.
// Validation and service errors become the matching error response.
const handleRequest = (logMessage, handler) => async (req, res) => {
  try {
    const { message, data, status = STATUS.OK } = await handler(req);

    return sendSuccessResponse(res, status, message, data, "data");
  } catch (error) {
    return sendExceptionResponse(res, error, logMessage);
  }
};

module.exports = {
  handleRequest,
};
