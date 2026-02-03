/**
 * Hausgeist Data Types
 * Mirrors the Notion database schema
 */

export type ItemType = 'chore' | 'inventory' | 'document';

export type ChoreStatus = 'todo' | 'doing' | 'done';
export type InventoryStatus = 'have' | 'outgrown' | 'broken' | 'to-buy' | 'bought';
export type DocumentStatus = 'valid' | 'expiring-soon' | 'expired' | 'renewed';

export type ItemStatus = ChoreStatus | InventoryStatus | DocumentStatus;

export interface Item {
  id: string;
  title: string;
  type: ItemType;
  status: ItemStatus;
  owner: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Chore-specific
  points?: number;
  recurring?: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';

  // Inventory-specific
  category?: string;
  size?: string;
  price?: number;
  store?: string;

  // Document-specific
  expiryDate?: Date;

  // General
  notes?: string;
}

export interface CreateTaskInput {
  title: string;
  owner: string;
  dueDate?: Date;
  points?: number;
  recurring?: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
  notes?: string;
}

export interface CreateInventoryInput {
  title: string;
  owner: string;
  category?: string;
  size?: string;
  price?: number;
  store?: string;
  notes?: string;
}

export interface CreateDocumentInput {
  title: string;
  owner: string;
  expiryDate?: Date;
  category?: string;
  notes?: string;
}

export interface QueryOptions {
  type?: ItemType;
  owner?: string;
  status?: ItemStatus;
  dueBefore?: Date;
  dueAfter?: Date;
  limit?: number;
}

// Notion API property mapping
export const NOTION_PROPERTIES = {
  title: 'Title',
  type: 'Type',
  status: 'Status',
  owner: 'Owner',
  dueDate: 'Due Date',
  category: 'Category',
  size: 'Size',
  points: 'Points',
  recurring: 'Recurring',
  frequency: 'Frequency',
  price: 'Price',
  store: 'Store',
  notes: 'Notes',
  created: 'Created',
  updated: 'Updated',
} as const;
