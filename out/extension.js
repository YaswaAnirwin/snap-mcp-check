"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
/**
 * 🧩 Snap MCP Instruction Loader Test
 * Shows all markdown files fetched by the MCP before Copilot generation.
 */
function activate(context) {
    const mcpPath = "C:/Users/DuddeYaswaAnirwin/snap-mcp-plugin/mcp/instructions-remote-mcp.mjs";
    const loadedFiles = [];
    let mcpOutput = "";
    // --- 1️⃣ Start MCP server manually ---
    const mcpProc = (0, child_process_1.spawn)("node", [mcpPath], { stdio: ["pipe", "pipe", "pipe"] });
    const outChannel = vscode.window.createOutputChannel("Snap MCP Debug");
    outChannel.show(true);
    mcpProc.stdout.on("data", (d) => {
        const text = d.toString();
        mcpOutput += text;
        outChannel.append(text);
        // capture all "✅ Loaded:" lines within this chunk
        for (const line of text.split(/\r?\n/)) {
            const match = line.match(/✅\s+Loaded:\s*(.+)/);
            if (match) {
                const file = match[1].trim();
                if (!loadedFiles.includes(file)) {
                    loadedFiles.push(file);
                }
            }
        }
    });
    mcpProc.stderr.on("data", (d) => {
        outChannel.appendLine("[MCP Error] " + d.toString());
    });
    mcpProc.on("close", (code) => {
        outChannel.appendLine(`[MCP] exited with code ${code}`);
    });
    // --- 2️⃣ Chat participant for @snap ---
    const snapParticipant = vscode.chat.createChatParticipant("snap", async (request, chatCtx, response) => {
        response.markdown("🧩 **Snap MCP Instruction Loader Active…**");
        // small delay to allow late stdout lines to finish
        await new Promise(r => setTimeout(r, 500));
        if (loadedFiles.length > 0) {
            response.markdown(`✅ **Files loaded into Copilot context:**\n\n${loadedFiles
                .map(f => `- ${f}`)
                .join("\n")}`);
        }
        else {
            response.markdown("⚠️ MCP is still loading or no files were detected. Check the 'Snap MCP Debug' output.");
        }
        response.markdown(`🕒 Last update: ${new Date().toLocaleTimeString()}`);
    });
    context.subscriptions.push(snapParticipant);
    context.subscriptions.push({ dispose: () => mcpProc.kill() });
}
function deactivate() { }
