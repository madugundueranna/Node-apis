const crypto = require("crypto");
const { APP_ERRORS, createAppError } = require("../Common/AppError");
const { getOtpSettings } = require("../Config/Config");
const {
  findLatestOtpByMobile,
  createOtp,
  deleteOtpsByMobile,
  deleteOtpById,
} = require("../Models/otp.model");
const { sendOtpSms } = require("./sms.service");

const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const isSameOtp = (storedOtp, receivedOtp) => {
  const stored = Buffer.from(String(storedOtp));
  const received = Buffer.from(String(receivedOtp));

  return stored.length === received.length && crypto.timingSafeEqual(stored, received);
};

// A future created_at (clock skew, another service's time zone) never blocks
const assertResendAllowed = async (mobile, cooldownSeconds) => {
  if (cooldownSeconds === 0) {
    return;
  }

  const latestOtp = await findLatestOtpByMobile(mobile);
  const ageMs = latestOtp && latestOtp.createdAt
    ? Date.now() - latestOtp.createdAt.getTime()
    : null;

  if (ageMs !== null && ageMs >= 0 && ageMs < cooldownSeconds * 1000) {
    throw createAppError(APP_ERRORS.OTP_COOLDOWN);
  }
};

// New OTP for the mobile number: replaces earlier OTPs, stores it with its expiry, sends it by SMS
const sendLoginOtp = async (mobile) => {
  const settings = getOtpSettings();

  await assertResendAllowed(mobile, settings.resendCooldownSeconds);

  const otp = generateOtp();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + settings.expiryMinutes * 60 * 1000);

  await deleteOtpsByMobile(mobile);
  const { id } = await createOtp({ mobile, otp, expiresAt, createdAt });

  try {
    await sendOtpSms(mobile, otp, settings.expiryMinutes);
  } catch (error) {
    // Unsent OTP is removed so the user can ask again straight away
    await deleteOtpById(id);
    console.error("Failed to send login OTP SMS:", error.message);
    throw createAppError(APP_ERRORS.OTP_SEND_FAILED);
  }
};

// Checks the OTP against the latest one sent to the mobile number and consumes it
const verifyLoginOtp = async (mobile, otp) => {
  const latestOtp = await findLatestOtpByMobile(mobile);

  if (!latestOtp) {
    throw createAppError(APP_ERRORS.OTP_NOT_FOUND);
  }

  if (!isSameOtp(latestOtp.otp, otp)) {
    throw createAppError(APP_ERRORS.INVALID_OTP);
  }

  if (latestOtp.expiresAt.getTime() <= Date.now()) {
    await deleteOtpById(latestOtp.id);
    throw createAppError(APP_ERRORS.OTP_EXPIRED);
  }

  // Deleting the row marks it used; of two parallel requests only one deletes it
  const { count } = await deleteOtpById(latestOtp.id);

  if (count === 0) {
    throw createAppError(APP_ERRORS.OTP_NOT_FOUND);
  }
};

module.exports = {
  sendLoginOtp,
  verifyLoginOtp,
};
