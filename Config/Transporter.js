const nodeMailer = require("nodemailer");

const transporter = nodeMailer.createTransport({
  host: "smtp.gmail.com",  //  SMTP host (e.g., "smtp.gmail.com" for Gmail)
  port: 587,             //  SMTP port (e.g., 587 for Gmail)
  secure: false,
  auth: {
    user: "macharlanandusai142@gmail.com",
    pass: process.env.PASS,
  },
});

module.exports = transporter;
