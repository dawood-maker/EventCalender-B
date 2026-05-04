const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      otp,
      otpExpiry,
    });
    await user.save();

    //  FIX: object style
    await sendEmail({
      to: email,
      subject: "Verify OTP",
      html: `Your OTP is: <b>${otp}</b>`,
    });

    res.status(201).json({ message: "OTP sent to email", email });
  } catch (err) {
    console.log("REGISTER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// VERIFY OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.otp !== otp) return res.status(400).json({ message: "Wrong OTP" });
    if (new Date() > user.otpExpiry)
      return res.status(400).json({ message: "OTP expired" });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ message: "Verified successfully", token, user });
  } catch (err) {
    console.log("VERIFY OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: "Email is not registered" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect password" });

    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Email not verified. Please verify OTP first." });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token, user });
  } catch (err) {
    console.log("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// FORGOT PASSWORD
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Email not found" });

    const otp = generateOTP();
    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    //  FIX: object style
    await sendEmail({
      to: email,
      subject: "Reset OTP",
      html: `Your reset OTP is: <b>${otp}</b>`,
    });

    res.json({ message: "OTP sent", email });
  } catch (err) {
    console.log("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// VERIFY RESET OTP
router.post("/verify-reset-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.resetOtp !== otp)
      return res.status(400).json({ message: "Wrong OTP" });
    if (new Date() > user.resetOtpExpiry)
      return res.status(400).json({ message: "OTP expired" });

    res.json({ message: "OTP verified" });
  } catch (err) {
    console.log("VERIFY RESET OTP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// RESET PASSWORD
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.resetOtp !== otp)
      return res.status(400).json({ message: "Wrong OTP" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.log("RESET PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
