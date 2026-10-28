/**
 * Contact management tools
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GHLClient } from "../services/ghl-client.js";
import { ResponseFormat, CHARACTER_LIMIT } from "../constants.js";
import {
  SearchContactsSchema,
  GetContactSchema,
  CreateContactSchema,
  UpdateContactSchema,
  AddTagsSchema,
  RemoveTagsSchema,
  AddNoteSchema,
  CreateTaskSchema,
  type SearchContactsInput,
  type GetContactInput,
  type CreateContactInput,
  type UpdateContactInput,
  type AddTagsInput,
  type RemoveTagsInput,
  type AddNoteInput,
  type CreateTaskInput,
} from "../schemas/tool-schemas.js";

export function registerContactTools(server: McpServer, client: GHLClient) {

  server.registerTool(
    "ghl_search_contacts",
    {
      title: "Search GoHighLevel Contacts",
      description: `Search for contacts by name, email, phone, or tags.

Args:
  - query (string, optional): Text to match against name, email, or phone
  - tags (string[], optional): Filter by tags
  - limit (number): Max results 1-100 (default: 20)
  - offset (number): Pagination offset (default: 0)
  - response_format: 'markdown' | 'json'`,
      inputSchema: SearchContactsSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async (params: SearchContactsInput) => {
      try {
        let contacts: any[] = [];
        let total = 0;

        if (params.tags && params.tags.length > 0 && !params.query) {
          // Tag-based search via legacy find
          const result = await client.contacts.find({
            locationId: client.locationId,
            query: params.tags.join(" "),
            limit: params.limit,
          });
          contacts = result.contacts || [];
          total = contacts.length;
        } else {
          const result = await client.contacts.find({
            locationId: client.locationId,
            query: params.query,
            limit: params.limit,
            startAfter: params.offset > 0 ? params.offset : undefined,
          });
          contacts = result.contacts || [];
          total = contacts.length;
        }

        if (!contacts.length) {
          return { content: [{ type: "text", text: `No contacts found${params.query ? ` matching '${params.query}'` : ""}` }] };
        }

        const formatted = contacts.map(formatContact);
        const output = { total, count: formatted.length, offset: params.offset, contacts: formatted };

        const text = params.response_format === ResponseFormat.JSON
          ? JSON.stringify(output, null, 2)
          : formatContactsMarkdown(contacts, total, params.offset);

        return { content: [{ type: "text", text: text.slice(0, CHARACTER_LIMIT) }], structuredContent: output };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  server.registerTool(
    "ghl_get_contact",
    {
      title: "Get GoHighLevel Contact by ID",
      description: `Retrieve full contact details by their GHL contact ID.

Args:
  - contact_id (string): The GHL contact ID
  - response_format: 'markdown' | 'json'`,
      inputSchema: GetContactSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async (params: GetContactInput) => {
      try {
        const result = await client.contacts.findById(params.contact_id);
        const contact = (result as any).contact || result;
        const output = formatContact(contact);
        const text = params.response_format === ResponseFormat.JSON
          ? JSON.stringify(output, null, 2)
          : formatContactMarkdown(contact);
        return { content: [{ type: "text", text }], structuredContent: output };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  server.registerTool(
    "ghl_create_contact",
    {
      title: "Create a New GHL Contact",
      description: `Create a new contact in GoHighLevel.

Args:
  - first_name (string)
  - last_name (string, optional)
  - email (string, optional)
  - phone (string, optional): E.164 format e.g. +16195551234
  - tags (string[], optional)
  - source (string, optional): Lead source
  - address (string, optional)
  - city (string, optional)
  - state (string, optional)
  - postal_code (string, optional)`,
      inputSchema: CreateContactSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async (params: CreateContactInput) => {
      try {
        const result = await client.contacts.create({
          locationId: client.locationId,
          firstName: params.first_name,
          lastName: params.last_name,
          email: params.email,
          phone: params.phone,
          tags: params.tags,
          source: params.source,
          address1: params.address,
          city: params.city,
          state: params.state,
          postalCode: params.postal_code,
        } as any);
        const contact = (result as any).contact || result;
        return {
          content: [{ type: "text", text: `Contact created: ${contact.id}\nName: ${params.first_name} ${params.last_name || ""}\nEmail: ${params.email || "—"}\nPhone: ${params.phone || "—"}` }],
          structuredContent: { id: contact.id, ...params }
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  server.registerTool(
    "ghl_update_contact",
    {
      title: "Update a GHL Contact",
      description: `Update fields on an existing contact.

Args:
  - contact_id (string): The GHL contact ID
  - first_name, last_name, email, phone, address, city, state, postal_code (all optional)`,
      inputSchema: UpdateContactSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async (params: UpdateContactInput) => {
      try {
        const { contact_id, ...fields } = params;
        await client.contacts.update(contact_id, {
          firstName: fields.first_name,
          lastName: fields.last_name,
          email: fields.email,
          phone: fields.phone,
          address1: fields.address,
          city: fields.city,
          state: fields.state,
          postalCode: fields.postal_code,
        } as any);
        return { content: [{ type: "text", text: `Contact ${contact_id} updated.` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  server.registerTool(
    "ghl_add_tags",
    {
      title: "Add Tags to a GHL Contact",
      description: `Add one or more tags to a contact.

Args:
  - contact_id (string)
  - tags (string[]): Tags to add`,
      inputSchema: AddTagsSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async (params: AddTagsInput) => {
      try {
        await client.contacts.addTags(params.contact_id, { tags: params.tags });
        return { content: [{ type: "text", text: `Tags added to ${params.contact_id}: ${params.tags.join(", ")}` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  server.registerTool(
    "ghl_remove_tags",
    {
      title: "Remove Tags from a GHL Contact",
      description: `Remove one or more tags from a contact.

Args:
  - contact_id (string)
  - tags (string[]): Tags to remove`,
      inputSchema: RemoveTagsSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async (params: RemoveTagsInput) => {
      try {
        await client.contacts.removeTags(params.contact_id, { tags: params.tags });
        return { content: [{ type: "text", text: `Tags removed from ${params.contact_id}: ${params.tags.join(", ")}` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  server.registerTool(
    "ghl_add_note",
    {
      title: "Add Note to a GHL Contact",
      description: `Add a note to a contact record.

Args:
  - contact_id (string)
  - body (string): Note content`,
      inputSchema: AddNoteSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async (params: AddNoteInput) => {
      try {
        const result = await client.contacts.createNote(params.contact_id, { body: params.body, userId: "" });
        const note = (result as any).note || result;
        return { content: [{ type: "text", text: `Note added to ${params.contact_id}. Note ID: ${note.id || "—"}` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );

  server.registerTool(
    "ghl_create_task",
    {
      title: "Create Task for a GHL Contact",
      description: `Create a follow-up task on a contact.

Args:
  - contact_id (string)
  - title (string): Task title
  - due_date (string): ISO date e.g. 2026-05-20T10:00:00Z
  - description (string, optional)`,
      inputSchema: CreateTaskSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async (params: CreateTaskInput) => {
      try {
        const result = await client.contacts.createTask(params.contact_id, {
          title: params.title,
          dueDate: params.due_date,
          body: params.description,
          completed: false,
          assignedTo: "",
        } as any);
        const task = (result as any).task || result;
        return { content: [{ type: "text", text: `Task created for ${params.contact_id}.\nTitle: ${params.title}\nDue: ${params.due_date}` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    }
  );
}

function formatContact(c: any) {
  return {
    id: c.id,
    name: c.contactName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "No name",
    email: c.email || null,
    phone: c.phone || null,
    tags: c.tags || [],
    source: c.source || null,
    city: c.city || null,
    state: c.state || null,
    customFields: c.customFields || [],
    dateAdded: c.dateAdded,
    dateUpdated: c.dateUpdated || null,
  };
}

function formatContactMarkdown(c: any): string {
  const name = c.contactName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "No name";
  const lines = [
    `# ${name}`,
    `**ID:** ${c.id}`,
    `**Email:** ${c.email || "—"}`,
    `**Phone:** ${c.phone || "—"}`,
    `**City/State:** ${[c.city, c.state].filter(Boolean).join(", ") || "—"}`,
  ];
  if (c.tags?.length) lines.push(`**Tags:** ${c.tags.join(", ")}`);
  if (c.dateAdded) lines.push(`**Added:** ${new Date(c.dateAdded).toLocaleDateString()}`);
  return lines.join("\n");
}

function formatContactsMarkdown(contacts: any[], total: number, offset: number): string {
  const lines = [`# Contacts (${total} found, showing ${contacts.length})`, ""];
  for (const c of contacts) {
    const name = c.contactName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "No name";
    lines.push(`## ${name}`);
    lines.push(`- **ID:** ${c.id}`);
    lines.push(`- **Email:** ${c.email || "—"}`);
    lines.push(`- **Phone:** ${c.phone || "—"}`);
    if (c.tags?.length) lines.push(`- **Tags:** ${c.tags.join(", ")}`);
    lines.push("");
  }
  return lines.join("\n");
}
