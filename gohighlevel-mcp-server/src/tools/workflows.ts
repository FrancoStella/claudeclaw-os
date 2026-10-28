/**
 * Workflow and Campaign automation tools
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GHLClient } from "../services/ghl-client.js";
import {
  AddToWorkflowSchema,
  RemoveFromWorkflowSchema,
  AddToCampaignSchema,
  ListWorkflowsSchema,
  type AddToWorkflowInput,
  type RemoveFromWorkflowInput,
  type AddToCampaignInput,
  type ListWorkflowsInput,
} from "../schemas/tool-schemas.js";

export function registerWorkflowTools(server: McpServer, client: GHLClient) {

  server.registerTool(
    "ghl_list_workflows",
    {
      title: "List GHL Workflows",
      description: `List all active workflows in your GHL location. Use this to find workflow IDs before adding contacts.`,
      inputSchema: ListWorkflowsSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async (_params: ListWorkflowsInput) => {
      try {
        const result = await client.workflows.find({ locationId: client.locationId } as any);
        const workflows = (result as any).workflows || [];
        if (!workflows.length) {
          return { content: [{ type: "text", text: "No workflows found." }] };
        }
        const lines = [`# Workflows (${workflows.length})`, ""];
        for (const w of workflows) {
          lines.push(`**${w.name}**`);
          lines.push(`- ID: ${w.id}`);
          lines.push(`- Status: ${w.status || "—"}`);
          lines.push("");
        }
        return {
          content: [{ type: "text", text: lines.join("\n") }],
          structuredContent: { workflows: workflows.map((w: any) => ({ id: w.id, name: w.name, status: w.status })) }
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  server.registerTool(
    "ghl_add_to_workflow",
    {
      title: "Add Contact to GHL Workflow",
      description: `Enroll a contact in a workflow to trigger automation sequences.

Args:
  - contact_id (string)
  - workflow_id (string): Use ghl_list_workflows to find IDs
  - start_time (string, optional): ISO datetime to start e.g. 2026-05-14T09:00:00Z (defaults to now)`,
      inputSchema: AddToWorkflowSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async (params: AddToWorkflowInput) => {
      try {
        await client.contacts.addToWorkflow(
          params.contact_id,
          params.workflow_id,
          params.start_time || new Date().toISOString()
        );
        return { content: [{ type: "text", text: `Contact ${params.contact_id} added to workflow ${params.workflow_id}.` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  server.registerTool(
    "ghl_remove_from_workflow",
    {
      title: "Remove Contact from GHL Workflow",
      description: `Remove a contact from a workflow, stopping the automation sequence.

Args:
  - contact_id (string)
  - workflow_id (string)`,
      inputSchema: RemoveFromWorkflowSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
    },
    async (params: RemoveFromWorkflowInput) => {
      try {
        await client.contacts.removeFromWorkflow(params.contact_id, params.workflow_id);
        return { content: [{ type: "text", text: `Contact ${params.contact_id} removed from workflow ${params.workflow_id}.` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  server.registerTool(
    "ghl_add_to_campaign",
    {
      title: "Add Contact to GHL Campaign",
      description: `Add a contact to a drip campaign.

Args:
  - contact_id (string)
  - campaign_id (string)`,
      inputSchema: AddToCampaignSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async (params: AddToCampaignInput) => {
      try {
        await client.contacts.addToCampaign(params.contact_id, params.campaign_id);
        return { content: [{ type: "text", text: `Contact ${params.contact_id} added to campaign ${params.campaign_id}.` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );
}
