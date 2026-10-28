/**
 * TypeScript type definitions for GoHighLevel API
 */

export interface GHLContact {
  id: string;
  locationId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  source?: string;
  dateAdded?: string;
  dateUpdated?: string;
}

export interface GHLContactSearchResponse {
  contacts: GHLContact[];
  total: number;
  count: number;
}

export interface GHLMessage {
  id: string;
  conversationId: string;
  locationId: string;
  contactId: string;
  body: string;
  type: string;
  direction: string;
  status: string;
  dateAdded: string;
}

export interface GHLConversation {
  id: string;
  locationId: string;
  contactId: string;
  lastMessageDate?: string;
  lastMessageBody?: string;
  unreadCount?: number;
}

export interface WebinarStats {
  total_registered: number;
  total_attended: number;
  total_completed: number;
  completion_rate: number;
  no_shows: number;
  registered_contacts: GHLContact[];
  attended_contacts: GHLContact[];
  completed_contacts: GHLContact[];
}
