/**
 * Notion Client
 * Handles connection and authentication with Notion API
 */

import { Client } from '@notionhq/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

let notionClient: Client | null = null;
let databaseId: string | null = null;

export class NotionError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'NotionError';
  }
}

export function initNotion(): Client {
  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_DATABASE_ID;

  if (!apiKey) {
    throw new NotionError(
      'NOTION_API_KEY not found in environment variables',
      'MISSING_API_KEY'
    );
  }

  if (!dbId) {
    throw new NotionError(
      'NOTION_DATABASE_ID not found in environment variables',
      'MISSING_DATABASE_ID'
    );
  }

  notionClient = new Client({ auth: apiKey });
  databaseId = dbId;

  return notionClient;
}

export function getClient(): Client {
  if (!notionClient) {
    return initNotion();
  }
  return notionClient;
}

export function getDatabaseId(): string {
  if (!databaseId) {
    initNotion();
  }
  if (!databaseId) {
    throw new NotionError(
      'Database ID not initialized',
      'NOT_INITIALIZED'
    );
  }
  return databaseId;
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = getClient();
    const dbId = getDatabaseId();

    const response = await client.databases.retrieve({
      database_id: dbId,
    });

    console.log('Connected to Notion database:', response.id);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      throw new NotionError(
        `Failed to connect to Notion: ${error.message}`,
        'CONNECTION_FAILED'
      );
    }
    throw error;
  }
}
