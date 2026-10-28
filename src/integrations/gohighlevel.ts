/**
 * GoHighLevel Integration
 * Full CRM access via ghl-sdk — contacts, messaging, workflows, opportunities, calendars
 */

import {
  ContactsClient,
  ConversationsClient,
  OpportunitiesClient,
  CalendarsClient,
  WorkflowsClient,
  CampaignsClient,
} from 'ghl-sdk';

export class GoHighLevel {
  readonly contacts: ContactsClient;
  readonly conversations: ConversationsClient;
  readonly opportunities: OpportunitiesClient;
  readonly calendars: CalendarsClient;
  readonly workflows: WorkflowsClient;
  readonly campaigns: CampaignsClient;
  readonly locationId: string;

  constructor() {
    // Prefer PIT token over legacy JWT
    const apiKey = process.env.GHL_PIT || process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!apiKey) throw new Error('GHL_PIT or GHL_API_KEY is required in ~/.config/claudeclaw/.env');
    if (!locationId) throw new Error('GHL_LOCATION_ID is required in ~/.config/claudeclaw/.env');

    this.locationId = locationId;
    this.contacts = new ContactsClient(apiKey);
    this.conversations = new ConversationsClient(apiKey);
    this.opportunities = new OpportunitiesClient(apiKey);
    this.calendars = new CalendarsClient(apiKey);
    this.workflows = new WorkflowsClient(apiKey);
    this.campaigns = new CampaignsClient(apiKey);
  }

  // ─── Contacts ────────────────────────────────────────────────────────────

  async searchContacts(query: string, limit = 20) {
    const result = await this.contacts.find({ locationId: this.locationId, query, limit });
    return result.contacts || [];
  }

  async getContact(contactId: string) {
    const result = await this.contacts.findById(contactId);
    return (result as any).contact || result;
  }

  async createContact(data: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    tags?: string[];
    source?: string;
  }) {
    const result = await this.contacts.create({ locationId: this.locationId, ...data } as any);
    return (result as any).contact || result;
  }

  async updateContact(contactId: string, data: Record<string, any>) {
    return this.contacts.update(contactId, data as any);
  }

  async addTags(contactId: string, tags: string[]) {
    return this.contacts.addTags(contactId, { tags });
  }

  async removeTags(contactId: string, tags: string[]) {
    return this.contacts.removeTags(contactId, { tags });
  }

  async addNote(contactId: string, body: string) {
    return this.contacts.createNote(contactId, { body, userId: '' });
  }

  async createTask(contactId: string, title: string, dueDate: string, description?: string) {
    return this.contacts.createTask(contactId, { title, dueDate, body: description, completed: false, assignedTo: '' } as any);
  }

  // ─── Messaging ───────────────────────────────────────────────────────────

  async sendSMS(contactId: string, message: string) {
    return this.conversations.sendMessage({ type: 'SMS', contactId, message } as any);
  }

  async sendEmail(contactId: string, subject: string, html: string, from?: string) {
    return this.conversations.sendMessage({
      type: 'Email',
      contactId,
      html,
      message: subject,
      ...(from ? { emailFrom: from } : {}),
    } as any);
  }

  async getConversations(contactId: string, limit = 10) {
    const result = await this.conversations.search({ locationId: this.locationId, contactId, limit } as any);
    return (result as any).conversations || [];
  }

  // ─── Workflows & Campaigns ───────────────────────────────────────────────

  async addToWorkflow(contactId: string, workflowId: string, startTime?: string) {
    return this.contacts.addToWorkflow(contactId, workflowId, startTime || new Date().toISOString());
  }

  async removeFromWorkflow(contactId: string, workflowId: string) {
    return this.contacts.removeFromWorkflow(contactId, workflowId);
  }

  async addToCampaign(contactId: string, campaignId: string) {
    return this.contacts.addToCampaign(contactId, campaignId);
  }

  // ─── Opportunities ───────────────────────────────────────────────────────

  async getPipelines() {
    const result = await (this.opportunities as any).getPipelines({ locationId: this.locationId });
    return (result as any).pipelines || [];
  }

  async createOpportunity(data: {
    contactId: string;
    pipelineId: string;
    pipelineStageId: string;
    name: string;
    monetaryValue?: number;
    status?: 'open' | 'won' | 'lost' | 'abandoned';
  }) {
    return (this.opportunities as any).upsert({ locationId: this.locationId, status: 'open', ...data });
  }

  async updateOpportunity(opportunityId: string, data: Record<string, any>) {
    return (this.opportunities as any).update(opportunityId, data);
  }
}

// Lazy singleton — instantiated on first access so env is loaded by the time it's used
let _ghl: GoHighLevel | null = null;
export function getGHL(): GoHighLevel {
  if (!_ghl) _ghl = new GoHighLevel();
  return _ghl;
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const dotenv = require('dotenv');
  const os = require('os');
  const path = require('path');
  dotenv.config({ path: path.join(os.homedir(), '.config', 'claudeclaw', '.env') });

  const command = process.argv[2];

  const ghl = getGHL();

  if (command === 'search') {
    const query = process.argv[3] || '';
    ghl.searchContacts(query).then(contacts => {
      console.log(JSON.stringify(contacts.map((c: any) => ({
        id: c.id,
        name: c.contactName || `${c.firstName} ${c.lastName}`.trim(),
        email: c.email,
        phone: c.phone,
        tags: c.tags,
      })), null, 2));
    }).catch(console.error);
  } else {
    console.log('Usage:');
    console.log('  npx tsx src/integrations/gohighlevel.ts search <name>');
  }
}
