const { getAllowedOrigins } = require("./Config");
const {
  API_PREFIX,
  ERROR_MESSAGES,
} = require("../Common/Constants");
const { sendErrorResponse } = require("../Common/Responses");
const { sendExceptionResponse } = require("../Common/ErrorResponses");
const STATUS = require("../Common/StatusCodes");

const isApiRequest = (req) => {
  const path = String(req.originalUrl || req.url || "")
    .split("?")[0]
    .toLowerCase();

  return path === API_PREFIX || path.startsWith(`${API_PREFIX}/`);
};

// CORS options per request for app.use(cors(corsOptionsDelegate)).
// AirproX routes: cookie credentials, only the origins in
// AIRPROPX_CORS_ALLOWED_ORIGINS (never "*"). Every other route: {} - exactly
// the previous cors() defaults.

const corsOptionsDelegate = (req, callback) => {
  if (!isApiRequest(req)) {
    return callback(null, {});
  }

  return callback(null, {
    origin: getAllowedOrigins(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Requested-With"],
    maxAge: 600,
  });
};

// Error handler for AirproX routes (mounted at the AirproX prefix before the
// global one): readable status codes, no parser / internal error details.

const apiErrorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.type === "entity.parse.failed") {
    return sendErrorResponse(
      res,
      STATUS.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_JSON
    );
  }

  if (err.status >= 400 && err.status < 500 && err.expose) {
    return sendErrorResponse(res, err.status, err.message);
  }

  return sendExceptionResponse(res, err, "AirproX API error:");
};

module.exports = {
  corsOptionsDelegate,
  apiErrorHandler,
};
