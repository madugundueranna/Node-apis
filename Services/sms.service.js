const https = require("https");
const { getSmsSettings } = require("../Config/Config");

const SMS_TIMEOUT_MS = 10000;

const buildSmsUrl = (settings, { mobile, message, templateId }) => {
  const params = new URLSearchParams({
    username: settings.username,
    password: settings.password,
    type: "0",
    dlr: "1",
    destination: mobile,
    source: settings.sender,
    message,
    tempid: templateId,
  });

  if (settings.entityId) {
    params.set("entityid", settings.entityId);
  }
  if (settings.tmid) {
    params.set("tmid", settings.tmid);
  }

  const port = settings.port ? `:${settings.port}` : "";

  return `https://${settings.host}${port}/sendsms/bulksms?${params}`;
};

// Resolves with the HTTP status code once the response has been read
const httpsGet = (url, { rejectUnauthorized }) =>
  new Promise((resolve, reject) => {
    const request = https.get(
      url,
      { rejectUnauthorized, signal: AbortSignal.timeout(SMS_TIMEOUT_MS) },
      (response) => {
        response.on("error", reject);
        response.on("end", () => resolve(response.statusCode));
        response.resume();
      }
    );

    request.on("error", reject);
  });

// Same bulk SMS request as nodeapi-services-terraterri (utils/sendSms.js).
// Certificate verification follows SMS_TLS_REJECT_UNAUTHORIZED.
const sendSms = async (settings, sms) => {
  const status = await httpsGet(buildSmsUrl(settings, sms), {
    rejectUnauthorized: settings.rejectUnauthorized,
  });

  if (status < 200 || status >= 300) {
    throw new Error(`SMS provider responded with HTTP ${status}`);
  }
};

// The text must match the registered DLT template
const sendOtpSms = async (mobile, otp, expiryMinutes) => {
  const settings = getSmsSettings();

  await sendSms(settings, {
    mobile,
    message: `Thank you for reaching Us Your One-Time Code is: ${otp} This code is valid for ${expiryMinutes} minutes. Regards, Terraterri Proptech Pvt Ltd.`,
    templateId: settings.otpTemplateId,
  });
};

module.exports = {
  sendOtpSms,
};
