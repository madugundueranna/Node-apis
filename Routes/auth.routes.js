const express = require("express");
const { authenticate } = require("../Config/Authorize");
const { otpRequestRateLimit, otpVerifyRateLimit } = require("../Config/RateLimit");
const {
  requestOtp,
  verifyOtp,
  getCurrentUser,
  logout,
} = require("../Controllers/auth.controller");

const router = express.Router();

router.post("/request-otp", otpRequestRateLimit, requestOtp);
router.post("/verify-otp", otpVerifyRateLimit, verifyOtp);
router.get("/me", authenticate, getCurrentUser);
router.post("/logout", logout);

module.exports = router;
