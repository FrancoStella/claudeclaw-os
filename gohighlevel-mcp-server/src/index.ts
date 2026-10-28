#!/usr/bin/env node
/**
 * GoHighLevel MCP Server
 *
 * MCP server for GoHighLevel API integration - manage contacts, send SMS/email,
 * and track webinar statistics.
 *
 * Required environment variables:
 * - GHL_API_KEY: GoHighLevel API key
 * - GHL_LOCATION_ID: GoHighLevel location ID
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import os from "os";

import { GHLClient } from "./services/ghl-client.js";
import { registerContactTools } from "./tools/contacts.js";
import { registerMessagingTools } from "./tools/messaging.js";
import { registerWebinarTools } from "./tools/webinars.js";
import { registerWorkflowTools } from "./tools/workflows.js";
import { registerOpportunityTools } from "./tools/opportunities.js";

// Load environment variables — global config takes priority
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const globalEnvPath = path.join(os.homedir(), '.config', 'claudeclaw', '.env');
const projectEnvPath = path.join(__dirname, '..', '.env');
// Load both so project .env can override specific keys if needed
dotenv.config({ path: projectEnvPath });
if (fs.existsSync(globalEnvPath)) dotenv.config({ path: globalEnvPath, override: true });

// Prefer GHL_PIT over legacy GHL_API_KEY when both are present
if (process.env.GHL_PIT && !process.env.GHL_API_KEY?.startsWith('pit-')) {
  process.env.GHL_API_KEY = process.env.GHL_PIT;
}

// Validate required environment variables
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

if (!GHL_API_KEY) {
  console.error("❌ ERROR: GHL_API_KEY environment variable is required");
  console.error("   Add it to: ~/.config/claudeclaw/.env");
  console.error("   Format: GHL_API_KEY=your_api_key_here");
  process.exit(1);
}

if (!GHL_LOCATION_ID) {
  console.error("❌ ERROR: GHL_LOCATION_ID environment variable is required");
  console.error("   Add it to: ~/.config/claudeclaw/.env");
  console.error("   Format: GHL_LOCATION_ID=your_location_id_here");
  process.exit(1);
}

// Create MCP server instance
const server = new McpServer({
  name: "gohighlevel-mcp-server",
  version: "1.0.0"
});

// Create GHL API client
const ghlClient = new GHLClient(GHL_API_KEY, GHL_LOCATION_ID);

// Register all tools
registerContactTools(server, ghlClient);
registerMessagingTools(server, ghlClient);
registerWebinarTools(server, ghlClient);
registerWorkflowTools(server, ghlClient);
registerOpportunityTools(server, ghlClient);

// Start server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is reserved for MCP protocol)
  console.error("✅ GoHighLevel MCP server running via stdio");
  console.error(`   API Key: ${GHL_API_KEY!.substring(0, 10)}...`);
  console.error(`   Location ID: ${GHL_LOCATION_ID}`);
}

main().catch((error) => {
  console.error("❌ Server error:", error);
  process.exit(1);
});
