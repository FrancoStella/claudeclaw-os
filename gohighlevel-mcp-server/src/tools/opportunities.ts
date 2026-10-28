/**
 * Pipeline and Opportunity tools
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GHLClient } from "../services/ghl-client.js";
import {
  GetPipelinesSchema,
  CreateOpportunitySchema,
  UpdateOpportunitySchema,
  SearchOpportunitiesSchema,
  type GetPipelinesInput,
  type CreateOpportunityInput,
  type UpdateOpportunityInput,
  type SearchOpportunitiesInput,
} from "../schemas/tool-schemas.js";

export function registerOpportunityTools(server: McpServer, client: GHLClient) {

  server.registerTool(
    "ghl_get_pipelines",
    {
      title: "List GHL Pipelines",
      description: `List all pipelines and their stages. Use this to find pipeline/stage IDs before creating opportunities.`,
      inputSchema: GetPipelinesSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async (_params: GetPipelinesInput) => {
      try {
        const result = await client.opportunities.getPipelines({ locationId: client.locationId } as any);
        const pipelines = (result as any).pipelines || [];
        if (!pipelines.length) {
          return { content: [{ type: "text", text: "No pipelines found." }] };
        }
        const lines = [`# Pipelines (${pipelines.length})`, ""];
        for (const p of pipelines) {
          lines.push(`## ${p.name} (ID: ${p.id})`);
          if (p.stages?.length) {
            for (const s of p.stages) {
              lines.push(`  - ${s.name} (ID: ${s.id})`);
            }
          }
          lines.push("");
        }
        return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { pipelines } };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  server.registerTool(
    "ghl_search_opportunities",
    {
      title: "Search GHL Opportunities",
      description: `Search opportunities in a pipeline.

Args:
  - pipeline_id (string, optional): Filter by pipeline
  - contact_id (string, optional): Filter by contact
  - status (string, optional): open | won | lost | abandoned
  - limit (number): Max results (default: 20)`,
      inputSchema: SearchOpportunitiesSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async (params: SearchOpportunitiesInput) => {
      try {
        const result = await client.opportunities.find({
          location_id: client.locationId,
          pipeline_id: params.pipeline_id,
          contact_id: params.contact_id,
          status: params.status,
          limit: params.limit,
        } as any);
        const opps = (result as any).opportunities || [];
        if (!opps.length) {
          return { content: [{ type: "text", text: "No opportunities found." }] };
        }
        const lines = [`# Opportunities (${opps.length})`, ""];
        for (const o of opps) {
          lines.push(`**${o.name || "Unnamed"}** (ID: ${o.id})`);
          lines.push(`- Status: ${o.status}`);
          lines.push(`- Value: $${o.monetaryValue || 0}`);
          lines.push(`- Stage: ${o.pipelineStageId || "—"}`);
          lines.push("");
        }
        return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { opportunities: opps } };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  server.registerTool(
    "ghl_create_opportunity",
    {
      title: "Create GHL Opportunity",
      description: `Create a new opportunity/deal in a pipeline.

Args:
  - contact_id (string)
  - pipeline_id (string): Use ghl_get_pipelines to find IDs
  - stage_id (string): Pipeline stage ID
  - name (string): Opportunity title
  - value (number, optional): Monetary value in dollars
  - status (string, optional): open | won | lost | abandoned (default: open)`,
      inputSchema: CreateOpportunitySchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async (params: CreateOpportunityInput) => {
      try {
        const result = await client.opportunities.upsert({
          locationId: client.locationId,
          contactId: params.contact_id,
          pipelineId: params.pipeline_id,
          pipelineStageId: params.stage_id,
          name: params.name,
          monetaryValue: params.value,
          status: params.status || "open",
        } as any);
        const opp = (result as any).opportunity || result;
        return {
          content: [{ type: "text", text: `Opportunity created.\nID: ${opp.id}\nName: ${params.name}\nValue: $${params.value || 0}` }],
          structuredContent: { id: opp.id, name: params.name, pipeline_id: params.pipeline_id, stage_id: params.stage_id }
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  server.registerTool(
    "ghl_update_opportunity",
    {
      title: "Update GHL Opportunity",
      description: `Update an existing opportunity — move stage, change status or value.

Args:
  - opportunity_id (string)
  - stage_id (string, optional): New stage ID
  - status (string, optional): open | won | lost | abandoned
  - value (number, optional): New monetary value
  - name (string, optional): New title`,
      inputSchema: UpdateOpportunitySchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async (params: UpdateOpportunityInput) => {
      try {
        await client.opportunities.update(params.opportunity_id, {
          pipelineStageId: params.stage_id,
          status: params.status,
          monetaryValue: params.value,
          name: params.name,
        } as any);
        return { content: [{ type: "text", text: `Opportunity ${params.opportunity_id} updated.` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );
}
