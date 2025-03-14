import type { Message } from 'ai';

export interface IChatMetadata {
  // Add any metadata fields that might be useful for chat
  lastModified?: string;
  tags?: string[];
  category?: string;
  starred?: boolean;
  gitUrl: string; // URL of the git repository if this chat was created from one
  // Add any other metadata fields as needed
}

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  metadata?: IChatMetadata;
  favorite?: boolean;
}
