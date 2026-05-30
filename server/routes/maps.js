import express from "express";
import protect from "../middleware/auth.js";
import {
  generateMap,
  getMaps,
  getMapById,
  updateNodes,
  deleteMap,
  explainNode,
  generateQuiz,
  generateLearningPath,
  saveNote,
  exportMap,
} from "../controllers/mapController.js";

const router = express.Router();

router.use(protect);

router.post("/generate", generateMap);
router.post("/explain", explainNode);
router.post("/quiz", generateQuiz);
router.get("/", getMaps);
router.get("/:id", getMapById);
router.get("/:id/export", exportMap);
router.get("/:id/learning-path", generateLearningPath);
router.patch("/:id/nodes", updateNodes);
router.patch("/:id/notes", saveNote);
router.delete("/:id", deleteMap);

export default router;
