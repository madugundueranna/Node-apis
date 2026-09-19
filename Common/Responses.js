// Standard Error Response Function (errors: optional field-level details)

exports.sendErrorResponse = (res, status, message, errors) => {
  return res
    .status(status)
    .json(errors ? { success: false, message, errors } : { success: false, message });
};

// Standard Success Response Function

exports.sendSuccessResponse = (
  res,
  status,
  message,
  data = {},
  keyName = "details"
) => {
  let responseData = {};

  // Check if data is an array, object, or empty

  if (Array.isArray(data)) {
    responseData[keyName] = data;
  } else if (typeof data === "object" && Object.keys(data).length > 0) {
    responseData[keyName] = data;
  }

  return res.status(status).json({ success: true, message, ...responseData });
};

// Creation Success Response Function

exports.sendCreateSuccessResponse = (res, status, message, data = {}) => {
  return res.status(status).json({ success: true, message, ...data });
};

// Login Success Response Function

exports.sendLoginSuccessResponse = (res, status, message, user, token) => {
  return res.status(status).json({
    success: true,
    message,
    user,
    token,
  });
};

// Logout Success Response Function

exports.sendLogoutSuccessResponse = (res, status, message) => {
  return res.status(status).json({
    success: true,
    message,
  });
};
