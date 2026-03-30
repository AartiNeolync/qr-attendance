const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../Models/User");
const path = require("path");
const crypto = require("crypto");

const router = express.Router();

// Login page (GET /auth/login)
router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "Public", "login.html"));
});

// Register
router.post("/register", async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 10);
  const user = await User.create({ ...req.body, password: hash });
  req.session.userId = user._id.toString();
  req.session.role = user.role;
  res.json({
    message: "Registered",
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
});

// Login
router.post("/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).json({ msg: "User not found" });

  const valid = await bcrypt.compare(req.body.password, user.password);
  if (!valid) return res.status(400).json({ msg: "Wrong password" });

  req.session.userId = user._id.toString();
  req.session.role = user.role;

  res.json({
    message: "Logged in",
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
});

// Current session
router.get("/me", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ msg: "Unauthorized" });
  res.json({ id: req.session.userId, role: req.session.role });
});

// Request password reset (dev-friendly: returns token)
router.post("/request-reset", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ msg: "User not found" });

  const token = crypto.randomBytes(24).toString("hex");
  user.resetToken = token;
  user.resetTokenExp = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  res.json({
    message: "Reset token generated (dev mode).",
    token
  });
});

// Reset password using token
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;
  const user = await User.findOne({
    resetToken: token,
    resetTokenExp: { $gt: new Date() }
  });
  if (!user) return res.status(400).json({ msg: "Invalid or expired token" });

  const hash = await bcrypt.hash(password, 10);
  user.password = hash;
  user.resetToken = null;
  user.resetTokenExp = null;
  await user.save();

  res.json({ message: "Password reset successful" });
});

module.exports = router;
