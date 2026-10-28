/**
 * Zod schemas for all GHL MCP tool inputs
 */

import { z } from "zod";
import { ResponseFormat } from "../constants.js";

// ─── Contacts ────────────────────────────────────────────────────────────────

export const SearchContactsSchema = z.object({
  query: z.string().min(1).max(200).optional().describe("Search text — name, email, or phone"),
  tags: z.array(z.string()).optional().describe("Filter by tags"),
  limit: z.number().int().min(1).max(100).default(20).describe("Max results (1-100)"),
  offset: z.number().int().min(0).default(0).describe("Pagination offset"),
  response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
}).strict();

export const GetContactSchema = z.object({
  contact_id: z.string().min(1).describe("GHL contact ID"),
  response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
}).strict();

export const CreateContactSchema = z.object({
  first_name: z.string().min(1).describe("First name"),
  last_name: z.string().optional().describe("Last name"),
  email: z.string().email().optional().describe("Email address"),
  phone: z.string().optional().describe("Phone in E.164 format e.g. +16195551234"),
  tags: z.array(z.string()).optional().describe("Initial tags"),
  source: z.string().optional().describe("Lead source"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
}).strict();

export const UpdateContactSchema = z.object({
  contact_id: z.string().min(1).describe("GHL contact ID"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
}).strict();

export const AddTagsSchema = z.object({
  contact_id: z.string().min(1).describe("GHL contact ID"),
  tags: z.array(z.string()).min(1).describe("Tags to add"),
}).strict();

export const RemoveTagsSchema = z.object({
  contact_id: z.string().min(1).describe("GHL contact ID"),
  tags: z.array(z.string()).min(1).describe("Tags to remove"),
}).strict();

export const AddNoteSchema = z.object({
  contact_id: z.string().min(1).describe("GHL contact ID"),
  body: z.string().min(1).describe("Note content"),
}).strict();

export const CreateTaskSchema = z.object({
  contact_id: z.string().min(1).describe("GHL contact ID"),
  title: z.string().min(1).describe("Task title"),
  due_date: z.string().describe("ISO datetime e.g. 2026-05-20T10:00:00Z"),
  description: z.string().optional().describe("Task description"),
}).strict();

// ─── Messaging ───────────────────────────────────────────────────────────────

export const SendSMSSchema = z.object({
  contact_id: z.string().min(1).describe("GHL contact ID"),
  message: z.string().min(1).max(1600).describe("SMS text"),
}).strict();

export const SendEmailSchema = z.object({
  contact_id: z.string().min(1).describe("GHL contact ID"),
  subject: z.string().min(1).max(200).describe("Email subject"),
  message: z.string().min(1).describe("Email body — HTML supported"),
  from: z.string().email().optional().describe("Sender address (optional)"),
}).strict();

export const GetConversationsSchema = z.object({
  contact_id: z.string().min(1).describe("GHL contact ID"),
  limit: z.number().int().min(1).max(20).default(10).describe("Max conversations to return"),
}).strict();

// ─── Workflows & Campaigns ───────────────────────────────────────────────────

export const ListWorkflowsSchema = z.object({}).strict();

export const AddToWorkflowSchema = z.object({
  contact_id: z.string().min(1).describe("GHL contact ID"),
  workflow_id: z.string().min(1).describe("Workflow ID — use ghl_list_workflows to find"),
  start_time: z.string().optional().describe("ISO datetime to start (default: now)"),
}).strict();

export const RemoveFromWorkflowSchema = z.object({
  contact_id: z.string().min(1).describe("GHL contact ID"),
  workflow_id: z.string().min(1).describe("Workflow ID"),
}).strict();

export const AddToCampaignSchema = z.object({
  contact_id: z.string().min(1).describe("GHL contact ID"),
  campaign_id: z.string().min(1).describe("Campaign ID"),
}).strict();

// ─── Opportunities ───────────────────────────────────────────────────────────

export const GetPipelinesSchema = z.object({}).strict();

export const SearchOpportunitiesSchema = z.object({
  pipeline_id: z.string().optional().describe("Filter by pipeline ID"),
  contact_id: z.string().optional().describe("Filter by contact ID"),
  status: z.enum(["open", "won", "lost", "abandoned"]).optional().describe("Opportunity status filter"),
  limit: z.number().int().min(1).max(100).default(20),
}).strict();

export const CreateOpportunitySchema = z.object({
  contact_id: z.string().min(1).describe("GHL contact ID"),
  pipeline_id: z.string().min(1).describe("Pipeline ID — use ghl_get_pipelines"),
  stage_id: z.string().min(1).describe("Stage ID"),
  name: z.string().min(1).describe("Opportunity title"),
  value: z.number().optional().describe("Monetary value in dollars"),
  status: z.enum(["open", "won", "lost", "abandoned"]).default("open"),
}).strict();

export const UpdateOpportunitySchema = z.object({
  opportunity_id: z.string().min(1).describe("Opportunity ID"),
  stage_id: z.string().optional().describe("New stage ID"),
  status: z.enum(["open", "won", "lost", "abandoned"]).optional(),
  value: z.number().optional().describe("New monetary value"),
  name: z.string().optional().describe("New title"),
}).strict();

// ─── Webinars ────────────────────────────────────────────────────────────────

export const GetWebinarStatsSchema = z.object({
  date: z.string().optional().describe("Date filter YYYY-MM-DD — omit for all-time"),
  webinar_name: z.string().optional().describe("Filter by webinar name/tag"),
  response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
}).strict();

// ─── Type exports ────────────────────────────────────────────────────────────

export type SearchContactsInput = z.infer<typeof SearchContactsSchema>;
export type GetContactInput = z.infer<typeof GetContactSchema>;
export type CreateContactInput = z.infer<typeof CreateContactSchema>;
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;
export type AddTagsInput = z.infer<typeof AddTagsSchema>;
export type RemoveTagsInput = z.infer<typeof RemoveTagsSchema>;
export type AddNoteInput = z.infer<typeof AddNoteSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type SendSMSInput = z.infer<typeof SendSMSSchema>;
export type SendEmailInput = z.infer<typeof SendEmailSchema>;
export type GetConversationsInput = z.infer<typeof GetConversationsSchema>;
export type ListWorkflowsInput = z.infer<typeof ListWorkflowsSchema>;
export type AddToWorkflowInput = z.infer<typeof AddToWorkflowSchema>;
export type RemoveFromWorkflowInput = z.infer<typeof RemoveFromWorkflowSchema>;
export type AddToCampaignInput = z.infer<typeof AddToCampaignSchema>;
export type GetPipelinesInput = z.infer<typeof GetPipelinesSchema>;
export type SearchOpportunitiesInput = z.infer<typeof SearchOpportunitiesSchema>;
export type CreateOpportunityInput = z.infer<typeof CreateOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof UpdateOpportunitySchema>;
export type GetWebinarStatsInput = z.infer<typeof GetWebinarStatsSchema>;
