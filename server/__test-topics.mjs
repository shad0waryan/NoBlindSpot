import dotenv from "dotenv";
import axios from "axios";
import { readFileSync } from "fs";
dotenv.config({ path: "W:/CODES/noBlindSpot/server/.env" });

const key = process.env.OPENROUTER_API_KEY;
const AI_URL = "https://openrouter.ai/api/v1/chat/completions";

const src = readFileSync("W:/CODES/noBlindSpot/server/controllers/mapController.js", "utf8");
const start = src.indexOf("const buildKnowledgeMapPrompt = (topic) => `");
const tplStart = src.indexOf("`", start) + 1;
const tplEnd = src.indexOf("`;", tplStart);
const template = src.slice(tplStart, tplEnd);

// reuse the production parser too
const fnStart = src.indexOf("function extractJSONArray");
const fnEnd = src.indexOf("// Calls the AI expecting");
const extractJSONArray = eval(src.slice(fnStart, fnEnd) + "; extractJSONArray");

async function testTopic(topic) {
  const prompt = template.replace("${topic}", topic);
  const t0 = Date.now();
  try {
    const r = await axios.post(
      AI_URL,
      { model: "openrouter/free", messages: [{ role: "user", content: prompt }], temperature: 0.3, max_tokens: 4000, reasoning: { enabled: false } },
      { headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, timeout: 120000 },
    );
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    const content = r.data.choices?.[0]?.message?.content;
    const nodes = extractJSONArray(typeof content === "string" ? content.trim() : "");
    if (!nodes) {
      console.log(`\n[${topic}] PARSE FAIL (model: ${r.data.model}, finish: ${r.data.choices?.[0]?.finish_reason}, ${secs}s)`);
      console.log("RAW first 400:", JSON.stringify(content)?.slice(0, 400));
      console.log("RAW last 200:", JSON.stringify(content)?.slice(-200));
      return;
    }
    const roots = nodes.filter((n) => n.parentId === null || n.parentId === undefined);
    const ids = new Set(nodes.map((n) => n.id));
    const badParents = nodes.filter((n) => n.parentId && !ids.has(n.parentId)).length;
    console.log(`\n[${topic}] OK — ${nodes.length} nodes, ${roots.length} root(s), ${badParents} bad parentIds (model: ${r.data.model}, ${secs}s)`);
    console.log("sample labels:", nodes.slice(0, 10).map((n) => n.label).join(" | "));
  } catch (e) {
    console.log(`\n[${topic}] REQUEST FAIL:`, e.response?.status, JSON.stringify(e.response?.data)?.slice(0, 300) || e.message);
  }
}

await testTopic("watercolor painting");
await testTopic("graphql");
