import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

const userPayload = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role || "",
  avatar: u.avatar || "",
  onboarded: !!u.onboarded,
  preferences: u.preferences || { theme: "dark", defaultView: "list", autoSave: true, showDescriptions: true, compactMode: false },
});

export const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });

    const user = await User.create({ name, email, password });
    res.status(201).json({ token: generateToken(user._id), user: userPayload(user) });
  } catch (error) { next(error); }
};

export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    res.json({ token: generateToken(user._id), user: userPayload(user) });
  } catch (error) { next(error); }
};

export const getMe = async (req, res) => {
  res.json({ user: userPayload(req.user) });
};

export const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const { name, email, currentPassword, newPassword, role, preferences } = req.body;
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: "Current password is required" });
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) return res.status(401).json({ message: "Current password is incorrect" });
      user.password = newPassword;
    }

    if (name && name.trim()) user.name = name.trim();

    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ message: "Email already in use" });
      user.email = email;
    }

    if (role !== undefined) user.role = role;

    if (preferences) {
      if (!user.preferences) user.preferences = {};
      if (preferences.theme !== undefined) user.preferences.theme = preferences.theme;
      if (preferences.defaultView !== undefined) user.preferences.defaultView = preferences.defaultView;
      if (preferences.autoSave !== undefined) user.preferences.autoSave = preferences.autoSave;
      if (preferences.showDescriptions !== undefined) user.preferences.showDescriptions = preferences.showDescriptions;
      if (preferences.compactMode !== undefined) user.preferences.compactMode = preferences.compactMode;
    }

    await user.save();
    res.json({ user: userPayload(user) });
  } catch (error) { next(error); }
};

export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.avatar) {
      const oldPath = path.join(__dirname, "..", "uploads", "avatars", path.basename(user.avatar));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    res.json({ user: userPayload(user) });
  } catch (error) { next(error); }
};

export const deleteAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.avatar) {
      const avatarPath = path.join(__dirname, "..", "uploads", "avatars", path.basename(user.avatar));
      if (fs.existsSync(avatarPath)) fs.unlinkSync(avatarPath);
      user.avatar = "";
      await user.save();
    }

    res.json({ user: userPayload(user) });
  } catch (error) { next(error); }
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
  } catch (error) { next(error); }
};
