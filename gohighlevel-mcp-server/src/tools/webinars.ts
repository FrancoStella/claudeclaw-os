/**
 * Webinar analytics tools
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GHLClient } from "../services/ghl-client.js";
import { ResponseFormat } from "../constants.js";
import {
  GetWebinarStatsSchema,
  type GetWebinarStatsInput
} from "../schemas/tool-schemas.js";
import type { GHLContact, WebinarStats } from "../types.js";

export function registerWebinarTools(server: McpServer, client: GHLClient) {

  /**
   * Get Webinar Stats Tool
   */
  server.registerTool(
    "ghl_get_webinar_stats",
    {
      title: "Get Webinar Attendance Statistics",
      description: `Get webinar attendance and completion statistics from GoHighLevel contacts.

This tool analyzes webinar performance by searching contacts with specific tags set by WebinarKit/GHL automations. It calculates:
- Total registrations (contacts tagged "Webinar - Registered" or similar)
- Total attendees (contacts tagged "Webinar - Attended")
- Total completions (contacts tagged "Webinar - Completed")
- Completion rate percentage
- No-shows (registered but didn't attend)

Args:
  - date (string, optional): Filter by date in YYYY-MM-DD format (e.g., '2026-05-13' for today)
  - webinar_name (string, optional): Filter by specific webinar name/tag
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "total_registered": number,
    "total_attended": number,
    "total_completed": number,
    "completion_rate": number,
    "no_shows": number,
    "date_filter": string,
    "summary": {
      "attendance_rate": number,
      "completion_rate": number
    }
  }

Examples:
  - Today's webinar: { date: "2026-05-13" }
  - All-time stats: {} (no parameters)
  - Specific webinar: { webinar_name: "Medicare Basics" }

Note: This tool relies on your GHL automations tagging contacts with:
  - "Webinar - Registered" (or similar)
  - "Webinar - Attended"
  - "Webinar - Completed"

If tags don't match, adjust the tool implementation or ensure your WebinarKit automations set these tags.

Error Handling:
  - Returns "No webinar data found" if no tagged contacts exist
  - Returns "Error: Authentication Failed" if GHL_API_KEY is invalid`,
      inputSchema: GetWebinarStatsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetWebinarStatsInput) => {
      try {
        // Search for contacts with webinar-related tags
        // Note: Adjust these tag names to match your actual GHL automation tags
        const registeredTag = params.webinar_name
          ? `Webinar - ${params.webinar_name} - Registered`
          : "Webinar - Registered";
        const attendedTag = params.webinar_name
          ? `Webinar - ${params.webinar_name} - Attended`
          : "Webinar - Attended";
        const completedTag = params.webinar_name
          ? `Webinar - ${params.webinar_name} - Completed`
          : "Webinar - Completed";

        // Fetch contacts for each category
        const [registered, attended, completed] = await Promise.all([
          client.searchContacts({ tags: [registeredTag], limit: 100 }),
          client.searchContacts({ tags: [attendedTag], limit: 100 }),
          client.searchContacts({ tags: [completedTag], limit: 100 })
        ]);

        // Filter by date if provided
        const filterByDate = (contacts: GHLContact[]) => {
          if (!params.date) return contacts;
          const targetDate = new Date(params.date).toISOString().split('T')[0];
          return contacts.filter(c => {
            if (!c.dateAdded) return false;
            const contactDate = new Date(c.dateAdded).toISOString().split('T')[0];
            return contactDate === targetDate;
          });
        };

        const registeredFiltered = filterByDate(registered.contacts);
        const attendedFiltered = filterByDate(attended.contacts);
        const completedFiltered = filterByDate(completed.contacts);

        const totalRegistered = registeredFiltered.length;
        const totalAttended = attendedFiltered.length;
        const totalCompleted = completedFiltered.length;
        const noShows = totalRegistered - totalAttended;
        const attendanceRate = totalRegistered > 0 ? (totalAttended / totalRegistered * 100) : 0;
        const completionRate = totalAttended > 0 ? (totalCompleted / totalAttended * 100) : 0;

        if (totalRegistered === 0 && totalAttended === 0 && totalCompleted === 0) {
          return {
            content: [{
              type: "text",
              text: `No webinar data found${params.date ? ` for date ${params.date}` : ''}${params.webinar_name ? ` for webinar "${params.webinar_name}"` : ''}.\n\nMake sure your GHL automations are tagging contacts with: "${registeredTag}", "${attendedTag}", "${completedTag}"`
            }]
          };
        }

        const output = {
          total_registered: totalRegistered,
          total_attended: totalAttended,
          total_completed: totalCompleted,
          completion_rate: Math.round(completionRate * 10) / 10,
          no_shows: noShows,
          ...(params.date ? { date_filter: params.date } : {}),
          ...(params.webinar_name ? { webinar_name: params.webinar_name } : {}),
          summary: {
            attendance_rate: Math.round(attendanceRate * 10) / 10,
            completion_rate: Math.round(completionRate * 10) / 10
          }
        };

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines = [
            `# Webinar Statistics${params.webinar_name ? ` - ${params.webinar_name}` : ''}`,
            ""
          ];

          if (params.date) {
            lines.push(`**Date:** ${params.date}`, "");
          }

          lines.push(
            `## Overall Metrics`,
            "",
            `📊 **Total Registered:** ${totalRegistered}`,
            `✅ **Total Attended:** ${totalAttended} (${attendanceRate.toFixed(1)}% attendance rate)`,
            `🎯 **Total Completed:** ${totalCompleted} (${completionRate.toFixed(1)}% completion rate)`,
            `❌ **No-Shows:** ${noShows}`,
            ""
          );

          if (completionRate >= 80) {
            lines.push(`🎉 **Excellent completion rate!**`);
          } else if (completionRate >= 60) {
            lines.push(`👍 **Good completion rate**`);
          } else if (completionRate >= 40) {
            lines.push(`⚠️ **Moderate completion rate** - consider shortening content or increasing engagement`);
          } else if (totalAttended > 0) {
            lines.push(`📉 **Low completion rate** - review content length and engagement strategies`);
          }

          textContent = lines.join("\n");
        } else {
          textContent = JSON.stringify(output, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error fetching webinar stats: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
}
