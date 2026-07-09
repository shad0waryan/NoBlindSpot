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
    },
    { headers: AI_HEADERS },
  );
}

// Extract a JSON array from a raw AI response, tolerating markdown fences
// or stray text around the array.
function extractJSONArray(rawText) {
  try {
    return JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\[[\s\S]*\]/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

// Calls the AI expecting a JSON array back. If parsing fails, makes one
// repair attempt asking the model to fix its own malformed output before
// giving up — this is what most "AI parse failed" errors used to be.
async function callAIForArray(prompt, { temperature = 0.3, maxTokens = 2000 } = {}) {
  const response = await callAI(prompt, temperature, maxTokens);
  const rawText = response.data.choices[0].message.content.trim();
  let parsed = extractJSONArray(rawText);
  if (parsed) return parsed;

  const repairPrompt = `The text below was supposed to be a valid JSON array but is malformed or incomplete. Fix it and return ONLY the corrected, complete, valid JSON array — no markdown, no explanations, no text before or after.

${rawText}`;
  const repairResponse = await callAI(repairPrompt, 0.1, maxTokens);
  const repairText = repairResponse.data.choices[0].message.content.trim();
  return extractJSONArray(repairText);
}

// ================= PROMPT =================
const buildKnowledgeMapPrompt = (topic) => `
You are an expert educator, curriculum designer, researcher, software architect, and industry analyst.

Topic: "${topic}"

Generate a complete knowledge map.

STRICT RULES:

* EXACTLY ONE root node
* Maximum depth = 4
* IDs must be globally unique
* Every parentId must reference an existing node
* No duplicate concepts
* No redundant concepts
* No unrelated or irrelevant concepts
* Include ONLY concepts directly related to the topic
* Maintain logical hierarchy from foundational to advanced concepts
* Return ONLY a valid JSON array
* Do NOT return markdown
* Do NOT return explanations
* Do NOT return comments
* Do NOT return text before or after the JSON

NODE FORMAT:

[
{
"id": "unique-id",
"label": "Concept",
"description": "Short explanation",
"parentId": null,
"depth": 0
}
]

KNOWLEDGE MAP REQUIREMENTS:

1. FOUNDATION LAYER

* Core fundamentals
* Basic terminology
* Essential principles
* Prerequisites

2. INTERMEDIATE LAYER

* Practical concepts
* Architectures
* Components
* Workflows
* Applications

3. ADVANCED LAYER

* Optimization
* Scaling
* Security
* Performance
* Enterprise usage
* Advanced implementations

4. REAL-WORLD LAYER

* Industry use cases
* Production systems
* Case studies
* Best practices
* Common challenges
* Future trends

TECHNICAL TOPICS REQUIREMENTS:

If the topic is related to programming, software engineering, AI, data science, cloud, cybersecurity, databases, DevOps, web development, mobile development, or technology:

Include:

* Fundamentals
* Syntax
* Data Structures
* Algorithms
* Object-Oriented Programming
* Functional Programming
* Design Patterns
* APIs
* Databases
* Testing
* Debugging
* Deployment
* Monitoring
* Security
* Performance Optimization
* Production Architecture

LANGUAGE IMPLEMENTATIONS:

When applicable create nodes for:

* Python Implementation
* JavaScript Implementation
* TypeScript Implementation
* Java Implementation
* C# Implementation
* C++ Implementation
* Go Implementation
* Rust Implementation
* SQL Implementation

CODE-FOCUSED REQUIREMENTS:

When applicable include:

* Example Implementations
* Sample Code Concepts
* Project Structure
* Framework Usage
* Library Usage
* API Development
* Database Integration
* Authentication
* Error Handling
* Logging
* Testing Strategies

PROJECT-BASED LEARNING:

When relevant include:

* Beginner Project
* Intermediate Project
* Advanced Project
* Enterprise Project
* Production Deployment

RESEARCH & INDUSTRY INTELLIGENCE REQUIREMENTS:

Include topic-specific nodes for:

* Latest Research
* Recent Innovations
* Industry Trends
* Emerging Technologies
* State-of-the-Art Techniques
* Current Challenges
* Open Research Problems
* Future Directions

If applicable include:

* Research Papers
* Benchmark Models
* Industry Standards
* RFCs
* Whitepapers
* Academic Foundations

NEWS & MARKET AWARENESS:

Include only if relevant to the topic:

* Recent Developments
* Current Industry Adoption
* Major Breakthroughs
* Notable Companies
* Ecosystem Evolution
* Regulatory Changes
* Market Trends

RELEVANCE FILTERING:

VERY IMPORTANT:

* Exclude generic filler concepts.
* Exclude unrelated technologies.
* Exclude broad concepts not directly connected to the topic.
* Exclude duplicated ideas under different names.
* Exclude outdated technologies unless historically important.
* Prioritize high-signal concepts over quantity.
* Prefer depth and relevance over breadth.

QUALITY REQUIREMENTS:

The generated map should allow a learner to understand:

* What it is
* How it works
* How to build with it
* How to scale it
* How it is used in industry
* Current research directions
* Latest innovations
* Future opportunities

Return ONLY the JSON array.
`;

// ================= VALIDATION =================
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
    });

    if (!nodes) {
      return res
        .status(500)
        .json({ message: "AI parse failed. Please try again." });
    }

    if (!Array.isArray(nodes) || nodes.length === 0) {
      return res.status(500).json({ message: "AI returned empty map" });
    }

    const sanitizedNodes = nodes.map((node) => ({
      id: node.id || uuidv4(),
      label: node.label || "Unnamed",
      description: node.description || "",
      parentId: node.parentId ?? null,
      depth: node.depth ?? 0,
    }));

    validateTree(sanitizedNodes);

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

    const response = await callAI(prompt, 0.4);
    const explanation = response.data.choices[0].message.content.trim();
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
    });

    if (!questions) {
      return res
        .status(500)
        .json({ message: "Quiz parse failed. Please try again." });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({ message: "AI returned empty quiz" });
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
    });

    if (!path) {
      return res
        .status(500)
        .json({ message: "Path parse failed. Please try again." });
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
