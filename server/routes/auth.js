import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { body } from "express-validator";
import { register, login, getMe, updateProfile, uploadAvatar, deleteAvatar, completeOnboarding } from "../controllers/authController.js";
import protect from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "uploads", "avatars"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user._id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(ext && mime ? null : new Error("Only images (jpg, png, gif, webp) are allowed"), ext && mime);
  },
});

const router = express.Router();

const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

const loginValidation = [
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

const profileValidation = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("email").optional().isEmail().withMessage("Please enter a valid email"),
  body("newPassword").optional().isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
  body("role").optional().isIn(["student", "researcher", "professional", ""]).withMessage("Invalid role"),
];

router.post("/register", registerValidation, register);
router.post("/login", loginValidation, login);
router.get("/me", protect, getMe);
router.patch("/profile", protect, profileValidation, updateProfile);
router.post("/avatar", protect, upload.single("avatar"), uploadAvatar);
router.delete("/avatar", protect, deleteAvatar);
router.post("/onboard", protect, completeOnboarding);

export default router;
