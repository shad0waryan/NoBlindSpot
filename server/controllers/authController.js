import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import User from "../models/User.js";
import crypto from "crypto";
import { sendVerificationEmail } from "../utils/sendVerificationEmail.js";
import { sendPasswordResetEmail } from "../utils/sendPasswordResetEmail.js";
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const userPayload = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role || "",
  onboarded: !!u.onboarded,
  preferences: u.preferences || {
    theme: "dark",
    defaultView: "list",
    autoSave: true,
    showDescriptions: true,
    compactMode: false,
  },
});
export const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: errors.array()[0].msg,
      });
    }

    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      name,
      email,
      password,
      verificationToken,
    });

    await sendVerificationEmail(user.email, verificationToken);
    console.log("Verification Token:", verificationToken);

    res.status(201).json({
      message: "Registration successful. Please verify your email.",
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid email or password" });
    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    res.json({ token: generateToken(user._id), user: userPayload(user) });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  res.json({ user: userPayload(req.user) });
};

export const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    const { name, email, currentPassword, newPassword, role, preferences } =
      req.body;
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (newPassword) {
      if (!currentPassword)
        return res
          .status(400)
          .json({ message: "Current password is required" });
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch)
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      user.password = newPassword;
    }

    if (name && name.trim()) user.name = name.trim();

    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing)
        return res.status(400).json({ message: "Email already in use" });
      user.email = email;
    }

    if (role !== undefined) user.role = role;

    if (preferences) {
      if (!user.preferences) user.preferences = {};
      if (preferences.theme !== undefined)
        user.preferences.theme = preferences.theme;
      if (preferences.defaultView !== undefined)
        user.preferences.defaultView = preferences.defaultView;
      if (preferences.autoSave !== undefined)
        user.preferences.autoSave = preferences.autoSave;
      if (preferences.showDescriptions !== undefined)
        user.preferences.showDescriptions = preferences.showDescriptions;
      if (preferences.compactMode !== undefined)
        user.preferences.compactMode = preferences.compactMode;
    }

    await user.save();
    res.json({ user: userPayload(user) });
  } catch (error) {
    next(error);
  }
};

export const completeOnboarding = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (role) user.role = role;
    user.onboarded = true;
    await user.save();
    res.json({ user: userPayload(user) });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.token,
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid verification link",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;

    await user.save();

    res.json({
      message: "Email verified successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        message: "If an account exists, a reset email will been send.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = token;

    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000;

    await user.save();

    await sendPasswordResetEmail(email, token);

    res.json({
      message: "If an account exists, a reset email will been send.",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: {
        $gt: Date.now(),
      },
    }).select("+password");

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset link",
      });
    }

    user.password = password;

    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};
  