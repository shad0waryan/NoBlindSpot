import { v4 as uuidv4 } from "uuid";
import TopicMap from "../models/TopicMap.js";
import UserProgress from "../models/UserProgress.js";
import axios from "axios";
import { OPENROUTER_API_KEY } from "../config/env.js";

const AI_URL = "https://openrouter.ai/api/v1/chat/completions";
const AI_HEADERS = {
  Authorization: `Bearer ${OPENROUTER_API_KEY}`,
  "Content-Type": "application/json",
};

function callAI(prompt, temperature = 0.3, maxTokens = 2000) {
  return axios.post(
    AI_URL,
    {
      model: "openrouter/free",
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: maxTokens,
      // reasoning models can burn the whole token budget "thinking" and
      // return null content; ask them not to (ignored where unsupported)
      reasoning: { enabled: false },
    },
    { headers: AI_HEADERS, timeout: 90000 },
  );
}

// Pulls the message text out of an OpenRouter response, tolerating
// providers that return null/empty content (filtered, empty, or errored
// generations) instead of throwing.
function extractMessageText(response) {
  const content = response.data?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

// Extract a JSON array from a raw AI response. Tolerates markdown fences,
// stray text around the array, `{"nodes": [...]}` wrappers, and output
// truncated mid-array (salvages up to the last complete object).
function extractJSONArray(rawText) {
  if (!rawText) return null;
  const text = rawText.replace(/```(?:json)?/gi, "").trim();

  try {
    const v = JSON.parse(text);
    if (Array.isArray(v)) return v;
    // some models wrap the array in an object despite instructions
    if (v && typeof v === "object") {
      const arr = Object.values(v).find((x) => Array.isArray(x));
      if (arr) return arr;
    }
    return null;
  } catch {
    // fall through to bracket extraction
  }

  const start = text.indexOf("[");
  if (start === -1) return null;

  const end = text.lastIndexOf("]");
  if (end > start) {
    try {
      const v = JSON.parse(text.slice(start, end + 1));
      if (Array.isArray(v)) return v;
    } catch {
      // fall through to truncation salvage
    }
  }

  // truncated mid-array: cut back to the last complete object and close
  const lastObj = text.lastIndexOf("}");
  if (lastObj > start) {
    try {
      const v = JSON.parse(text.slice(start, lastObj + 1) + "]");
      if (Array.isArray(v)) return v;
    } catch {
      // give up
    }
  }
  return null;
}

// Calls the AI expecting a non-empty JSON array back, retrying with fresh
// generations on failure. "openrouter/free" routes each request to a
// different free model of varying quality, so a retry usually lands on a
// model that produces valid output even when the previous one didn't.
// An optional `validate` callback rejects arrays that parse but don't have
// the required shape, so bad output triggers a retry instead of a 500.
async function callAIForArray(
  prompt,
  { temperature = 0.3, maxTokens = 2000, attempts = 3, validate } = {},
) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const response = await callAI(prompt, temperature, maxTokens);
      const rawText = extractMessageText(response);
      const parsed = extractJSONArray(rawText);
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        (!validate || validate(parsed))
      ) {
        return parsed;
      }
      console.warn(
        `AI attempt ${i}/${attempts} produced unusable output (model: ${response.data?.model}, finish: ${response.data?.choices?.[0]?.finish_reason}, length: ${rawText.length})`,
      );
    } catch (err) {
      console.warn(`AI attempt ${i}/${attempts} request failed: ${err.message}`);
    }
  }
  return null;
}

// ================= PROMPT =================
const buildKnowledgeMapPrompt = (topic) => `
You are an expert educator and curriculum designer who can map ANY subject — academic, technical, creative, historical, scientific, practical, professional, cultural, or hobby.

Topic: "${topic}"

Generate a complete knowledge map: a hierarchy of the concepts a learner must understand to master this topic, ordered from foundational to advanced.

OUTPUT FORMAT — a JSON array of nodes:

[
{
"id": "unique-id",
"label": "Concept",
"description": "Short explanation (one sentence)",
"parentId": null,
"depth": 0
}
]

STRICT RULES:

* EXACTLY ONE root node (parentId: null) — the topic itself
* 25 to 45 nodes total
* Maximum depth = 4
* IDs must be unique; every parentId must reference an existing node's id
* No duplicate or redundant concepts; include ONLY concepts directly relevant to this topic
* Return ONLY the valid JSON array — no markdown, no comments, no text before or after

STRUCTURE — organize the map into layers, adapting each to whatever kind of topic this is:

1. FOUNDATIONS — core ideas, essential terminology, key principles, prerequisites, origins or background
2. CORE KNOWLEDGE — the main concepts, methods, techniques, components, processes, or events that make up the subject
3. ADVANCED — deeper mastery: advanced techniques, nuances, specializations, expert-level themes, or complex applications
4. REAL WORLD — how the subject shows up in practice today: applications, notable examples or figures, common challenges, best practices, and current developments or trends

ADAPT TO THE DOMAIN — use whatever concept types fit the subject:

* Technical/scientific topics: theory, tools, methods, implementation, testing, current research
* Historical/cultural topics: periods, causes, key events, figures, consequences, legacy, interpretations
* Creative/artistic topics: fundamentals, techniques, styles, materials/tools, influential works and artists, developing your own practice
* Practical/skill topics: basics, progressions, common mistakes, equipment, routines, mastery milestones
* Business/professional topics: core concepts, frameworks, processes, strategy, case examples, industry landscape

QUALITY BAR: a learner following this map top to bottom should go from "never heard of it" to understanding what it is, how it works, how to engage with or apply it, and where it's headed. Prioritize high-signal concepts over quantity — no generic filler.

Return ONLY the JSON array.
`;

// ================= VALIDATION =================
function sanitizeNodes(nodes) {
  return nodes.map((node) => ({
    id: node.id || uuidv4(),
    label: node.label || "Unnamed",
    description: node.description || "",
    parentId: node.parentId ?? null,
    depth: node.depth ?? 0,
  }));
}

function validateTree(nodes) {
  const ids = new Set();
  const parentIds = new Set();

  nodes.forEach((n) => {
    if (ids.has(n.id)) throw new Error("Duplicate node ID found");
    ids.add(n.id);
    if (n.parentId) parentIds.add(n.parentId);
  });

  for (let pid of parentIds) {
    if (!ids.has(pid)) throw new Error("Invalid parentId");
  }

  const roots = nodes.filter((n) => n.parentId === null);
  if (roots.length !== 1) throw new Error("Must have exactly one root");
}

function isValidTree(nodes) {
  try {
    validateTree(sanitizeNodes(nodes));
    return true;
  } catch {
    return false;
  }
}

// ================= GENERATE =================
export const generateMap = async (req, res, next) => {
  try {
    const { topic } = req.body;

    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({ message: "Topic is required" });
    }
    if (topic.trim().length > 200) {
      return res.status(400).json({ message: "Topic too long" });
    }

    const normalizedTopic = topic.trim().toLowerCase();
    let topicMap = await TopicMap.findOne({ topic: normalizedTopic });

    if (topicMap) {
      let progress = await UserProgress.findOne({
        user: req.user._id,
        topicMap: topicMap._id,
      });

      if (!progress) {
        progress = await UserProgress.create({
          user: req.user._id,
          topicMap: topicMap._id,
          nodeStatuses: {},
          nodeNotes: {},
          stats: {
            total: topicMap.nodes.length,
            known: 0,
            partial: 0,
            unknown: topicMap.nodes.length,
          },
        });
      }

      return res.json({ topicMap, progress, cached: true });
    }

    const nodes = await callAIForArray(buildKnowledgeMapPrompt(normalizedTopic), {
      temperature: 0.3,
      maxTokens: 4000,
      attempts: 3,
      validate: isValidTree,
    });

    if (!nodes) {
      return res.status(502).json({
        message:
          "The AI couldn't generate a valid map right now. Please try again.",
      });
    }

    const sanitizedNodes = sanitizeNodes(nodes);

    try {
      topicMap = await TopicMap.create({
        topic: normalizedTopic,
        nodes: sanitizedNodes,
      });
    } catch (err) {
      if (err.code === 11000) {
        topicMap = await TopicMap.findOne({ topic: normalizedTopic });
      } else {
        throw err;
      }
    }

    const progress = await UserProgress.create({
      user: req.user._id,
      topicMap: topicMap._id,
      nodeStatuses: {},
      nodeNotes: {},
      stats: {
        total: sanitizedNodes.length,
        known: 0,
        partial: 0,
        unknown: sanitizedNodes.length,
      },
    });

    res.status(201).json({ topicMap, progress });
  } catch (err) {
    next(err);
  }
};

// ================= GET ALL =================
export const getMaps = async (req, res, next) => {
  try {
    const progress = await UserProgress.find({ user: req.user._id })
      .populate("topicMap", "topic")
      .sort({ updatedAt: -1 });

    res.json({ progress });
  } catch (err) {
    next(err);
  }
};

// ================= GET ONE =================
export const getMapById = async (req, res, next) => {
  try {
    const topicMap = await TopicMap.findById(req.params.id);
    if (!topicMap) return res.status(404).json({ message: "Map not found" });

    const progress = await UserProgress.findOne({
      user: req.user._id,
      topicMap: topicMap._id,
    });

    res.json({ topicMap, progress });
  } catch (err) {
    next(err);
  }
};

// ================= UPDATE NODES =================
export const updateNodes = async (req, res, next) => {
  try {
    const { nodes } = req.body;

    const progress = await UserProgress.findOne({
      user: req.user._id,
      topicMap: req.params.id,
    });

    if (!progress) return res.status(404).json({ message: "Progress not found" });

    nodes.forEach((item) => {
      if (!item || !item.id) return;
      const { id, status } = item;
      if (["unknown", "partial", "known"].includes(status)) {
        progress.nodeStatuses.set(id, status);
      }
    });

    const topicMap = await TopicMap.findById(req.params.id);
    const stats = { total: 0, known: 0, partial: 0, unknown: 0 };

    topicMap.nodes.forEach((node) => {
      const status = progress.nodeStatuses.get(node.id) || "unknown";
      stats.total++;
      stats[status]++;
    });

    progress.stats = stats;
    await progress.save();

    res.json({ progress });
  } catch (err) {
    next(err);
  }
};

// ================= EXPLAIN =================
export const explainNode = async (req, res, next) => {
  try {
    const { concept, parentTopic } = req.body;
    if (!concept || concept.trim().length === 0) {
      return res.status(400).json({ message: "Concept is required" });
    }

    const prompt = `You are an expert educator. The student is learning about "${parentTopic || "a topic"}".

Explain the concept "${concept}" in a clear, concise way suitable for someone encountering it for the first time.

RULES:
- Keep it to 3-5 short paragraphs
- Use simple language
- Include a practical example if helpful
- Do NOT use markdown headers or bullet lists — write in plain flowing paragraphs
- Return ONLY the explanation text, nothing else`;

    let explanation = "";
    for (let i = 0; i < 2 && !explanation; i++) {
      try {
        const response = await callAI(prompt, 0.4);
        explanation = extractMessageText(response);
      } catch (err) {
        console.warn(`Explain attempt ${i + 1} failed: ${err.message}`);
      }
    }
    if (!explanation) {
      return res
        .status(502)
        .json({ message: "AI returned no explanation. Please try again." });
    }
    res.json({ explanation });
  } catch (err) {
    next(err);
  }
};

// ================= QUIZ =================
export const generateQuiz = async (req, res, next) => {
  try {
    const { concepts, parentTopic } = req.body;

    if (!concepts || !Array.isArray(concepts) || concepts.length === 0) {
      return res.status(400).json({ message: "Concepts array is required" });
    }

    const list = concepts.slice(0, 10).join(", ");

    const prompt = `You are an expert quiz creator. Topic: "${parentTopic || "General"}".

Create a multiple-choice quiz with exactly ${Math.min(concepts.length, 5)} questions to test understanding of these concepts: ${list}.

STRICT RULES:
- Each question has exactly 4 options (A, B, C, D)
- Exactly one correct answer per question
- Questions should test understanding, not just recall
- Return ONLY a JSON array, nothing else

Format:
[
  {
    "question": "What is...?",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct": 0,
    "concept": "concept name",
    "explanation": "Brief explanation of correct answer"
  }
]`;

    const questions = await callAIForArray(prompt, {
      temperature: 0.5,
      maxTokens: 1500,
      attempts: 3,
      validate: (arr) =>
        arr.every(
          (q) =>
            typeof q.question === "string" &&
            Array.isArray(q.options) &&
            q.options.length === 4 &&
            Number.isInteger(q.correct) &&
            q.correct >= 0 &&
            q.correct < 4,
        ),
    });

    if (!questions) {
      return res.status(502).json({
        message:
          "The AI couldn't generate a valid quiz right now. Please try again.",
      });
    }

    res.json({ questions });
  } catch (err) {
    next(err);
  }
};

// ================= LEARNING PATH =================
export const generateLearningPath = async (req, res, next) => {
  try {
    const topicMap = await TopicMap.findById(req.params.id);
    if (!topicMap) return res.status(404).json({ message: "Map not found" });

    const progress = await UserProgress.findOne({
      user: req.user._id,
      topicMap: topicMap._id,
    });

    const gaps = topicMap.nodes
      .filter((n) => {
        const s = progress?.nodeStatuses?.get?.(n.id) || "unknown";
        return s !== "known";
      })
      .map((n) => n.label);

    if (gaps.length === 0) {
      return res.json({ path: [], message: "All concepts mastered!" });
    }

    const prompt = `You are an expert learning coach. Topic: "${topicMap.topic}".

The student has NOT yet mastered these concepts: ${gaps.join(", ")}.

Create an optimal learning path — the best order to study these concepts, considering prerequisites and dependencies.

STRICT RULES:
- Return ONLY a JSON array of objects
- Order from "learn first" to "learn last"
- Each object has: label, reason (why learn at this point, 1 sentence)

Format:
[
  { "label": "Concept Name", "reason": "Foundation for everything else" }
]`;

    const path = await callAIForArray(prompt, {
      temperature: 0.3,
      maxTokens: 1500,
      attempts: 3,
      validate: (arr) => arr.every((s) => typeof s.label === "string"),
    });

    if (!path) {
      return res.status(502).json({
        message:
          "The AI couldn't generate a valid path right now. Please try again.",
      });
    }

    res.json({ path });
  } catch (err) {
    next(err);
  }
};

// ================= SAVE NOTE =================
export const saveNote = async (req, res, next) => {
  try {
    const { nodeId, note } = req.body;

    if (!nodeId) return res.status(400).json({ message: "nodeId is required" });

    const progress = await UserProgress.findOne({
      user: req.user._id,
      topicMap: req.params.id,
    });

    if (!progress) return res.status(404).json({ message: "Progress not found" });

    if (note && note.trim().length > 0) {
      progress.nodeNotes.set(nodeId, note.trim());
    } else {
      progress.nodeNotes.delete(nodeId);
    }

    await progress.save();
    res.json({ nodeNotes: Object.fromEntries(progress.nodeNotes) });
  } catch (err) {
    next(err);
  }
};

// ================= EXPORT =================
export const exportMap = async (req, res, next) => {
  try {
    const topicMap = await TopicMap.findById(req.params.id);
    if (!topicMap) return res.status(404).json({ message: "Map not found" });

    const progress = await UserProgress.findOne({
      user: req.user._id,
      topicMap: topicMap._id,
    });

    const nodeMap = {};
    topicMap.nodes.forEach((n) => {
      nodeMap[n.id] = { ...n.toObject(), children: [] };
    });
    topicMap.nodes.forEach((n) => {
      if (n.parentId && nodeMap[n.parentId]) {
        nodeMap[n.parentId].children.push(nodeMap[n.id]);
      }
    });

    const roots = topicMap.nodes.filter((n) => !n.parentId).map((n) => nodeMap[n.id]);

    let md = `# ${topicMap.topic}\n\n`;

    const stats = { total: 0, known: 0, partial: 0, unknown: 0 };
    topicMap.nodes.forEach((n) => {
      const s = progress?.nodeStatuses?.get?.(n.id) || "unknown";
      stats.total++;
      stats[s]++;
    });

    md += `**Progress:** ${stats.known}/${stats.total} known, ${stats.partial} partial, ${stats.unknown} unknown\n\n---\n\n`;

    function renderMd(nodeList, depth = 0) {
      const indent = "  ".repeat(depth);
      nodeList.forEach((n) => {
        const s = progress?.nodeStatuses?.get?.(n.id) || "unknown";
        const icon = s === "known" ? "✅" : s === "partial" ? "🟡" : "❌";
        const note = progress?.nodeNotes?.get?.(n.id);
        md += `${indent}- ${icon} **${n.label}** — ${n.description || ""}`;
        if (note) md += ` *(Note: ${note})*`;
        md += "\n";
        if (n.children.length > 0) renderMd(n.children, depth + 1);
      });
    }

    renderMd(roots);

    res.json({ markdown: md, filename: `${topicMap.topic.replace(/\s+/g, "-")}.md` });
  } catch (err) {
    next(err);
  }
};

// ================= DELETE =================
export const deleteMap = async (req, res, next) => {
  try {
    const progress = await UserProgress.findOneAndDelete({
      user: req.user._id,
      topicMap: req.params.id,
    });

    if (!progress) return res.status(404).json({ message: "Not found" });

    res.json({ message: "Progress deleted" });
  } catch (err) {
    next(err);
  }
};
