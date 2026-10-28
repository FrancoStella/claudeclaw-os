/**
 * Messaging tools — SMS, Email, Conversations
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GHLClient } from "../services/ghl-client.js";
import {
  SendSMSSchema,
  SendEmailSchema,
  GetConversationsSchema,
  type SendSMSInput,
  type SendEmailInput,
  type GetConversationsInput,
} from "../schemas/tool-schemas.js";

export function registerMessagingTools(server: McpServer, client: GHLClient) {

  server.registerTool(
    "ghl_send_sms",
    {
      title: "Send SMS via GoHighLevel",
      description: `Send an SMS to a contact.

Args:
  - contact_id (string)
  - message (string): Max 1600 characters`,
      inputSchema: SendSMSSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true }
    },
    async (params: SendSMSInput) => {
      try {
        const result = await client.conversations.sendMessage({
          type: "SMS",
          contactId: params.contact_id,
          message: params.message,
        } as any);
        return {
          content: [{ type: "text", text: `SMS sent.\nMessage ID: ${result.messageId}\nConversation: ${result.conversationId}` }],
          structuredContent: { success: true, message_id: result.messageId, conversation_id: result.conversationId }
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  server.registerTool(
    "ghl_send_email",
    {
      title: "Send Email via GoHighLevel",
      description: `Send an email to a contact.

Args:
  - contact_id (string)
  - subject (string)
  - message (string): Body — HTML supported
  - from (string, optional): Sender address`,
      inputSchema: SendEmailSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true }
    },
    async (params: SendEmailInput) => {
      try {
        const result = await client.conversations.sendMessage({
          type: "Email",
          contactId: params.contact_id,
          html: params.message,
          message: params.subject,
          ...(params.from ? { emailFrom: params.from } : {}),
        } as any);
        return {
          content: [{ type: "text", text: `Email sent.\nMessage ID: ${result.messageId}\nConversation: ${result.conversationId}` }],
          structuredContent: { success: true, message_id: result.messageId, conversation_id: result.conversationId }
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  server.registerTool(
    "ghl_get_conversations",
    {
      title: "Get Conversations for a Contact",
      description: `Retrieve conversation history for a contact.

Args:
  - contact_id (string)
  - limit (number): Max results 1-20 (default: 10)`,
      inputSchema: GetConversationsSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async (params: GetConversationsInput) => {
      try {
        const result = await client.conversations.search({
          locationId: client.locationId,
          contactId: params.contact_id,
          limit: params.limit,
        } as any);
        const convos = (result as any).conversations || [];
        if (!convos.length) {
          return { content: [{ type: "text", text: "No conversations found for this contact." }] };
        }
        const lines = [`# Conversations for ${params.contact_id}`, ""];
        for (const c of convos) {
          lines.push(`**ID:** ${c.id}`);
          lines.push(`**Last Message:** ${c.lastMessageBody || "—"}`);
          lines.push(`**Unread:** ${c.unreadCount || 0}`);
          lines.push(`**Updated:** ${c.lastMessageDate ? new Date(c.lastMessageDate).toLocaleString() : "—"}`);
          lines.push("");
        }
        return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { conversations: convos } };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );
}
