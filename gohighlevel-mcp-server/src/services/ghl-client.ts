/**
 * GoHighLevel SDK client wrappers
 */

import {
  ContactsClient,
  ConversationsClient,
  OpportunitiesClient,
  CalendarsClient,
  WorkflowsClient,
  CampaignsClient,
} from "ghl-sdk";

export class GHLClient {
  readonly contacts: ContactsClient;
  readonly conversations: ConversationsClient;
  readonly opportunities: OpportunitiesClient;
  readonly calendars: CalendarsClient;
  readonly workflows: WorkflowsClient;
  readonly campaigns: CampaignsClient;
  readonly locationId: string;

  constructor(apiKey: string, locationId: string) {
    this.locationId = locationId;
    this.contacts = new ContactsClient(apiKey);
    this.conversations = new ConversationsClient(apiKey);
    this.opportunities = new OpportunitiesClient(apiKey);
    this.calendars = new CalendarsClient(apiKey);
    this.workflows = new WorkflowsClient(apiKey);
    this.campaigns = new CampaignsClient(apiKey);
  }
}
