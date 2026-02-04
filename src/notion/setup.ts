/**
 * Notion Database Setup
 * Creates the Hausgeist database with all properties and sample data
 */

import { Client } from '@notionhq/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Color mappings for Notion select options
const COLORS = {
  gray: 'gray',
  blue: 'blue',
  green: 'green',
  yellow: 'yellow',
  red: 'red',
  purple: 'purple',
  orange: 'orange',
  pink: 'pink',
  brown: 'brown',
} as const;

// Database schema configuration
const DATABASE_SCHEMA = {
  title: 'Hausgeist',
  properties: {
    Title: { title: {} },
    Type: {
      select: {
        options: [
          { name: 'chore', color: COLORS.blue },
          { name: 'inventory', color: COLORS.green },
          { name: 'document', color: COLORS.purple },
        ],
      },
    },
    Status: {
      select: {
        options: [
          // Chore statuses
          { name: 'todo', color: COLORS.gray },
          { name: 'doing', color: COLORS.blue },
          { name: 'done', color: COLORS.green },
          // Inventory statuses
          { name: 'have', color: COLORS.green },
          { name: 'outgrown', color: COLORS.yellow },
          { name: 'broken', color: COLORS.red },
          { name: 'to-buy', color: COLORS.purple },
          { name: 'bought', color: COLORS.green },
          // Document statuses
          { name: 'valid', color: COLORS.green },
          { name: 'expiring-soon', color: COLORS.yellow },
          { name: 'expired', color: COLORS.red },
          { name: 'renewed', color: COLORS.green },
        ],
      },
    },
    Owner: {
      select: {
        options: [
          { name: 'Ira', color: COLORS.pink },
          { name: 'Family', color: COLORS.blue },
        ],
      },
    },
    'Due Date': { date: {} },
    Category: {
      select: {
        options: [
          { name: 'clothes', color: COLORS.blue },
          { name: 'shoes', color: COLORS.brown },
          { name: 'toys', color: COLORS.orange },
          { name: 'gear', color: COLORS.gray },
          { name: 'passport', color: COLORS.purple },
          { name: 'visa', color: COLORS.purple },
          { name: 'vaccination', color: COLORS.green },
          { name: 'insurance', color: COLORS.yellow },
        ],
      },
    },
    Size: { rich_text: {} },
    Points: { number: { format: 'number' } },
    Recurring: { checkbox: {} },
    Frequency: {
      select: {
        options: [
          { name: 'daily', color: COLORS.red },
          { name: 'weekly', color: COLORS.orange },
          { name: 'monthly', color: COLORS.yellow },
        ],
      },
    },
    Price: { number: { format: 'euro' } },
    Store: { rich_text: {} },
    Notes: { rich_text: {} },
    Created: { created_time: {} },
    Updated: { last_edited_time: {} },
  },
};

// Sample data
const SAMPLE_DATA = {
  chores: [
    { title: 'Brush teeth (morning)', owner: 'Ira', recurring: true, frequency: 'daily', points: 1 },
    { title: 'Tidy toys', owner: 'Ira', recurring: true, frequency: 'daily', points: 2 },
    { title: 'Help set table', owner: 'Ira', recurring: true, frequency: 'daily', points: 2 },
  ],
  inventory: [
    { title: 'Winter jacket', owner: 'Ira', size: '104', category: 'clothes' },
    { title: 'Sneakers', owner: 'Ira', size: '26', category: 'shoes' },
    { title: 'Wooden blocks', owner: 'Ira', category: 'toys' },
  ],
  documents: [
    { title: "Ira's passport", owner: 'Ira', category: 'passport', dueDate: '2028-05-15' },
  ],
};

export interface SetupOptions {
  parentPageId?: string;
  withSamples?: boolean;
  updateEnv?: boolean;
}

export interface SetupResult {
  databaseId: string;
  databaseUrl: string;
  samplesCreated?: number;
}

/**
 * Find pages shared with the integration
 */
export async function findSharedPages(client: Client): Promise<Array<{ id: string; title: string }>> {
  const response = await client.search({
    filter: { property: 'object', value: 'page' },
    page_size: 10,
  });

  return response.results
    .filter((page): page is Extract<typeof page, { object: 'page' }> => page.object === 'page')
    .map((page) => {
      let title = 'Untitled';
      if ('properties' in page && page.properties) {
        const titleProp = Object.values(page.properties).find(
          (prop): prop is Extract<typeof prop, { type: 'title' }> => prop.type === 'title'
        );
        if (titleProp && titleProp.title.length > 0) {
          title = titleProp.title.map((t) => t.plain_text).join('');
        }
      }
      return { id: page.id, title };
    });
}

/**
 * Create the Hausgeist database
 */
export async function createDatabase(
  client: Client,
  parentPageId: string
): Promise<{ id: string; url: string }> {
  console.log('Creating Hausgeist database...');

  const response = await client.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    title: [{ type: 'text', text: { content: DATABASE_SCHEMA.title } }],
    properties: DATABASE_SCHEMA.properties as Parameters<typeof client.databases.create>[0]['properties'],
  });

  console.log('Database created successfully!');
  const url = 'url' in response ? response.url : `https://notion.so/${response.id.replace(/-/g, '')}`;
  return { id: response.id, url };
}

/**
 * Add sample data to the database
 */
export async function addSampleData(client: Client, databaseId: string): Promise<number> {
  console.log('Adding sample data...');
  let count = 0;

  // Add chores
  for (const chore of SAMPLE_DATA.chores) {
    await client.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Title: { title: [{ text: { content: chore.title } }] },
        Type: { select: { name: 'chore' } },
        Status: { select: { name: 'todo' } },
        Owner: { select: { name: chore.owner } },
        Recurring: { checkbox: chore.recurring },
        Frequency: { select: { name: chore.frequency } },
        Points: { number: chore.points },
      },
    });
    console.log(`  + Chore: ${chore.title}`);
    count++;
  }

  // Add inventory
  for (const item of SAMPLE_DATA.inventory) {
    const properties: Record<string, unknown> = {
      Title: { title: [{ text: { content: item.title } }] },
      Type: { select: { name: 'inventory' } },
      Status: { select: { name: 'have' } },
      Owner: { select: { name: item.owner } },
      Category: { select: { name: item.category } },
    };
    if (item.size) {
      properties.Size = { rich_text: [{ text: { content: item.size } }] };
    }
    await client.pages.create({
      parent: { database_id: databaseId },
      properties: properties as Parameters<typeof client.pages.create>[0]['properties'],
    });
    console.log(`  + Inventory: ${item.title}`);
    count++;
  }

  // Add documents
  for (const doc of SAMPLE_DATA.documents) {
    await client.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Title: { title: [{ text: { content: doc.title } }] },
        Type: { select: { name: 'document' } },
        Status: { select: { name: 'valid' } },
        Owner: { select: { name: doc.owner } },
        Category: { select: { name: doc.category } },
        'Due Date': { date: { start: doc.dueDate } },
      },
    });
    console.log(`  + Document: ${doc.title}`);
    count++;
  }

  console.log(`Added ${count} sample items.`);
  return count;
}

/**
 * Update .env file with database ID
 */
export function updateEnvFile(databaseId: string): void {
  const envPath = path.join(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    console.log('Creating .env file...');
    fs.writeFileSync(
      envPath,
      `NOTION_API_KEY=${process.env.NOTION_API_KEY}\nNOTION_DATABASE_ID=${databaseId}\n`
    );
    return;
  }

  let content = fs.readFileSync(envPath, 'utf-8');

  if (content.includes('NOTION_DATABASE_ID=')) {
    content = content.replace(
      /NOTION_DATABASE_ID=.*/,
      `NOTION_DATABASE_ID=${databaseId}`
    );
  } else {
    content += `\nNOTION_DATABASE_ID=${databaseId}\n`;
  }

  fs.writeFileSync(envPath, content);
  console.log('Updated .env with NOTION_DATABASE_ID');
}

/**
 * Main setup function
 */
export async function setup(options: SetupOptions = {}): Promise<SetupResult> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey || apiKey === 'your_notion_integration_token') {
    throw new Error('NOTION_API_KEY not set in .env file');
  }

  const client = new Client({ auth: apiKey });

  // Find parent page if not provided
  let parentPageId = options.parentPageId;
  if (!parentPageId) {
    console.log('Searching for pages shared with the integration...');
    const pages = await findSharedPages(client);

    if (pages.length === 0) {
      throw new Error(
        'No pages found. Please share a Notion page with the Hausgeist integration first.'
      );
    }

    if (pages.length === 1) {
      parentPageId = pages[0].id;
      console.log(`Found page: "${pages[0].title}"`);
    } else {
      console.log('\nFound multiple pages:');
      pages.forEach((p, i) => console.log(`  ${i + 1}. ${p.title} (${p.id})`));
      console.log('\nUsing first page. Set NOTION_PARENT_PAGE_ID in .env to use a different one.');
      parentPageId = pages[0].id;
    }
  }

  // Create database
  const { id: databaseId, url: databaseUrl } = await createDatabase(client, parentPageId);

  // Add sample data if requested
  let samplesCreated: number | undefined;
  if (options.withSamples) {
    samplesCreated = await addSampleData(client, databaseId);
  }

  // Update .env file
  if (options.updateEnv !== false) {
    updateEnvFile(databaseId);
  }

  return { databaseId, databaseUrl, samplesCreated };
}
