const { RESPONSE_MESSAGES } = require("../Common/Constants");
const {
  validateOtpRequest,
  validateVerifyOtpRequest,
} = require("../Common/Validators");
const {
  sendErrorResponse,
  sendSuccessResponse,
  sendLogoutSuccessResponse,
} = require("../Common/Responses");
const { sendExceptionResponse } = require("../Common/ErrorResponses");
const STATUS = require("../Common/StatusCodes");
const { getCookieSettings } = require("../Config/Config");
const {
  requestLoginOtp,
  loginWithOtp,
  getCurrentSession,
} = require("../Services/auth.service");

// Request OTP (mobile + role) - the OTP only goes out by SMS, never in the response
const requestOtp = async (req, res) => {
  const { error, mobile, role } = validateOtpRequest(req);

  if (error) {
    return sendErrorResponse(res, STATUS.BAD_REQUEST, error);
  }

  try {
    await requestLoginOtp(mobile, role);

    return sendSuccessResponse(res, STATUS.OK, RESPONSE_MESSAGES.OTP_SENT);
  } catch (error) {
    return sendExceptionResponse(res, error, "Error sending AirproX login OTP:");
  }
};

// Verify OTP (mobile + role + OTP) - the JWT goes into the HttpOnly cookie, never the body
const verifyOtp = async (req, res) => {
  const { error, mobile, role, otp } = validateVerifyOtpRequest(req);

  if (error) {
    return sendErrorResponse(res, STATUS.BAD_REQUEST, error);
  }

  try {
    const { token, expiresAt, session } = await loginWithOtp(mobile, role, otp);
    const cookie = getCookieSettings();

    res.cookie(cookie.name, token, {
      ...cookie.options,
      maxAge: Math.max(expiresAt.getTime() - Date.now(), 0),
    });

    return sendSuccessResponse(
      res,
      STATUS.OK,
      RESPONSE_MESSAGES.LOGIN_SUCCESS,
      { authenticated: true, expiresAt: expiresAt.toISOString(), ...session },
      "data"
    );
  } catch (error) {
    return sendExceptionResponse(res, error, "Error verifying AirproX login OTP:");
  }
};

// Logged-in user (authenticate middleware sets req.auth)
const getCurrentUser = async (req, res) => {
  try {
    const session = await getCurrentSession(req.auth);

    return sendSuccessResponse(
      res,
      STATUS.OK,
      RESPONSE_MESSAGES.FETCH_SUCCESS("User"),
      { authenticated: true, expiresAt: req.auth.expiresAt.toISOString(), ...session },
      "data"
    );
  } catch (error) {
    return sendExceptionResponse(res, error, "Error fetching AirproX current user:");
  }
};

// Logout always succeeds, so an expired session can still log out. Tokens are
// stateless: clearing the cookie is all there is to do.
const logout = (req, res) => {
  const cookie = getCookieSettings();

  res.clearCookie(cookie.name, cookie.options);

  return sendLogoutSuccessResponse(res, STATUS.OK, RESPONSE_MESSAGES.LOGOUT_SUCCESS);
};

module.exports = {
  requestOtp,
  verifyOtp,
  getCurrentUser,
  logout,
};
