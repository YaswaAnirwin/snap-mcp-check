#!/usr/bin/env node
import { spawn } from "child_process";
import fetch from "node-fetch";

/* ---------------------------------------------------------
   🧩 Step 1: Start the MCP to load instruction files
--------------------------------------------------------- */
const mcpPath =
  "C:/Users/DuddeYaswaAnirwin/snap-mcp-plugin/mcp/instructions-remote-mcp.mjs";

console.log("🚀 Starting MCP:", mcpPath);

// Run the MCP process
const mcpProc = spawn("node", [mcpPath], { stdio: ["pipe", "pipe", "pipe"] });

let combinedText = "";
let loadedFiles = [];

// Capture MCP stdout
mcpProc.stdout.on("data", (d) => {
  const text = d.toString();
  process.stdout.write(text);

  // detect loaded files
  const match = text.match(/✅\s+Loaded:\s*(.+)/);
  if (match) loadedFiles.push(match[1].trim());

  // capture combined markdown content
  const contentMatch = text.match(
    /--- Combined Markdown Content Start ---([\s\S]*?)--- End of Combined Markdown Content ---/
  );
  if (contentMatch) {
    combinedText = contentMatch[1].trim();
  }

  // Auto-terminate MCP after all files are loaded
  if (text.includes("✅ instructions-remote-mcp running")) {
    setTimeout(() => {
      try {
        mcpProc.kill();
      } catch (_) {}
    }, 1000);
  }
});

// Capture MCP errors
mcpProc.stderr.on("data", (d) =>
  process.stderr.write("[MCP Error] " + d.toString())
);

/* ---------------------------------------------------------
   🧠 Step 2: When MCP finishes, call Gemini to generate code
--------------------------------------------------------- */
mcpProc.on("close", async () => {
  console.log("\n✅ MCP finished loading instruction files.");
  console.log("📄 Files loaded:", loadedFiles.join(", "));

  if (!combinedText.trim()) {
    console.error("❌ No instruction content captured from MCP.");
    return;
  }

  const userPrompt =
    process.argv.slice(2).join(" ") || "Generate a React login page";
  console.log(`\n🧠 Generating code for: "${userPrompt}" via Gemini...\n`);

  const GEMINI_API_KEY = "AIzaSyAb1j6wz_fQNfhScC4BR3vMhdNQpfmBLFk";

  const prompt = `
You are an expert Software developer.

The following are internal project-specific coding guidelines and instructions from our MCP system:
${combinedText}

Now follow these strictly and generate complete, clean, production-grade code for:
"${userPrompt}"
`;

  try {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-03-25:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            contents: [
                {
                role: "user",
                parts: [{ text: prompt }]
                }
            ]
            })
        }
        );


    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Gemini API Error:", data);
      return;
    }

    const output =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "❌ No response from Gemini.";

    console.log("\n💡 Generated Code:\n");
    console.log(output);
  } catch (err) {
    console.error("❌ Gemini API Error:", err.message);
  }
});

/* ---------------------------------------------------------
   🧩 Step 3: Safety timeout to prevent infinite hangs
--------------------------------------------------------- */
setTimeout(() => {
  if (mcpProc.exitCode === null) {
    console.warn("\n⚠️ MCP took too long — force closing...");
    mcpProc.kill();
  }
}, 60000); // 60 seconds safety timeout
