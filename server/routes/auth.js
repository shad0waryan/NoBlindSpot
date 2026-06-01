import express from "express";
import { body } from "express-validator";
import {
  register,
  login,
  getMe,
  updateProfile,
  completeOnboarding,
  verifyEmail,
  forgotPassword,
  resetPassword
} from "../controllers/authController.js";
import protect from "../middleware/auth.js";

const router = express.Router();

const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

const loginValidation = [
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

const profileValidation = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("email").optional().isEmail().withMessage("Please enter a valid email"),
  body("newPassword")
    .optional()
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
  body("role")
    .optional()
    .isIn(["student", "researcher", "professional", ""])
    .withMessage("Invalid role"),
];

router.post("/register", registerValidation, register);
router.post("/login", loginValidation, login);
router.get("/me", protect, getMe);
router.patch("/profile", protect, profileValidation, updateProfile);
router.post("/onboard", protect, completeOnboarding);
router.get("/verify-email/:token", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
export default router;
