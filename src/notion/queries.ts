/**
 * Common Query Helpers
 * Pre-built queries for common use cases
 */

import { getClient, getDatabaseId, NotionError } from './client';
import { Item, NOTION_PROPERTIES } from './types';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

type NotionPropertyValue = PageObjectResponse['properties'][string];

function extractTitle(prop: NotionPropertyValue): string {
  if (prop.type === 'title' && prop.title.length > 0) {
    return prop.title.map((t) => t.plain_text).join('');
  }
  return '';
}

function extractSelect(prop: NotionPropertyValue): string | undefined {
  if (prop.type === 'select' && prop.select) {
    return prop.select.name;
  }
  return undefined;
}

function extractNumber(prop: NotionPropertyValue): number | undefined {
  if (prop.type === 'number' && prop.number !== null) {
    return prop.number;
  }
  return undefined;
}

function extractCheckbox(prop: NotionPropertyValue): boolean {
  if (prop.type === 'checkbox') {
    return prop.checkbox;
  }
  return false;
}

function extractDate(prop: NotionPropertyValue): Date | undefined {
  if (prop.type === 'date' && prop.date?.start) {
    return new Date(prop.date.start);
  }
  return undefined;
}

function extractText(prop: NotionPropertyValue): string | undefined {
  if (prop.type === 'rich_text' && prop.rich_text.length > 0) {
    return prop.rich_text.map((t) => t.plain_text).join('');
  }
  return undefined;
}

function extractCreatedTime(prop: NotionPropertyValue): Date {
  if (prop.type === 'created_time') {
    return new Date(prop.created_time);
  }
  return new Date();
}

function extractLastEditedTime(prop: NotionPropertyValue): Date {
  if (prop.type === 'last_edited_time') {
    return new Date(prop.last_edited_time);
  }
  return new Date();
}

function pageToItem(page: PageObjectResponse): Item {
  const props = page.properties;

  return {
    id: page.id,
    title: extractTitle(props[NOTION_PROPERTIES.title]),
    type: (extractSelect(props[NOTION_PROPERTIES.type]) as Item['type']) || 'chore',
    status: (extractSelect(props[NOTION_PROPERTIES.status]) as Item['status']) || 'todo',
    owner: extractSelect(props[NOTION_PROPERTIES.owner]) || 'Family',
    dueDate: extractDate(props[NOTION_PROPERTIES.dueDate]),
    createdAt: extractCreatedTime(props[NOTION_PROPERTIES.created]),
    updatedAt: extractLastEditedTime(props[NOTION_PROPERTIES.updated]),
    points: extractNumber(props[NOTION_PROPERTIES.points]),
    recurring: extractCheckbox(props[NOTION_PROPERTIES.recurring]),
    frequency: extractSelect(props[NOTION_PROPERTIES.frequency]) as Item['frequency'],
    category: extractSelect(props[NOTION_PROPERTIES.category]),
    size: extractText(props[NOTION_PROPERTIES.size]),
    price: extractNumber(props[NOTION_PROPERTIES.price]),
    store: extractText(props[NOTION_PROPERTIES.store]),
    notes: extractText(props[NOTION_PROPERTIES.notes]),
  };
}

function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

function getWeekStartDateString(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export async function getTasksForOwner(owner: string): Promise<Item[]> {
  const client = getClient();
  const databaseId = getDatabaseId();

  try {
    const response = await client.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          {
            property: NOTION_PROPERTIES.type,
            select: { equals: 'chore' },
          },
          {
            property: NOTION_PROPERTIES.owner,
            select: { equals: owner },
          },
        ],
      },
      sorts: [
        {
          property: NOTION_PROPERTIES.dueDate,
          direction: 'ascending',
        },
      ],
    });

    return response.results
      .filter((page): page is PageObjectResponse => 'properties' in page)
      .map(pageToItem);
  } catch (error) {
    throw new NotionError(`Failed to get tasks for ${owner}: ${error}`, 'QUERY_FAILED');
  }
}

export async function getTasksForToday(): Promise<Item[]> {
  const client = getClient();
  const databaseId = getDatabaseId();
  const today = getTodayDateString();

  try {
    const response = await client.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          {
            property: NOTION_PROPERTIES.type,
            select: { equals: 'chore' },
          },
          {
            property: NOTION_PROPERTIES.dueDate,
            date: { equals: today },
          },
          {
            property: NOTION_PROPERTIES.status,
            select: { does_not_equal: 'done' },
          },
        ],
      },
      sorts: [
        {
          property: NOTION_PROPERTIES.owner,
          direction: 'ascending',
        },
      ],
    });

    return response.results
      .filter((page): page is PageObjectResponse => 'properties' in page)
      .map(pageToItem);
  } catch (error) {
    throw new NotionError(`Failed to get tasks for today: ${error}`, 'QUERY_FAILED');
  }
}

export async function getOpenTasks(owner?: string): Promise<Item[]> {
  const client = getClient();
  const databaseId = getDatabaseId();

  const filters: Parameters<typeof client.databases.query>[0]['filter'] = {
    and: [
      {
        property: NOTION_PROPERTIES.type,
        select: { equals: 'chore' },
      },
      {
        property: NOTION_PROPERTIES.status,
        select: { does_not_equal: 'done' },
      },
    ],
  };

  if (owner && filters.and) {
    (filters.and as unknown[]).push({
      property: NOTION_PROPERTIES.owner,
      select: { equals: owner },
    });
  }

  try {
    const response = await client.databases.query({
      database_id: databaseId,
      filter: filters,
      sorts: [
        {
          property: NOTION_PROPERTIES.dueDate,
          direction: 'ascending',
        },
      ],
    });

    return response.results
      .filter((page): page is PageObjectResponse => 'properties' in page)
      .map(pageToItem);
  } catch (error) {
    throw new NotionError(`Failed to get open tasks: ${error}`, 'QUERY_FAILED');
  }
}

export async function getTasksDoneThisWeek(owner?: string): Promise<Item[]> {
  const client = getClient();
  const databaseId = getDatabaseId();
  const weekStart = getWeekStartDateString();

  const filters: Parameters<typeof client.databases.query>[0]['filter'] = {
    and: [
      {
        property: NOTION_PROPERTIES.type,
        select: { equals: 'chore' },
      },
      {
        property: NOTION_PROPERTIES.status,
        select: { equals: 'done' },
      },
      {
        property: NOTION_PROPERTIES.updated,
        date: { on_or_after: weekStart },
      },
    ],
  };

  if (owner && filters.and) {
    (filters.and as unknown[]).push({
      property: NOTION_PROPERTIES.owner,
      select: { equals: owner },
    });
  }

  try {
    const response = await client.databases.query({
      database_id: databaseId,
      filter: filters,
      sorts: [
        {
          property: NOTION_PROPERTIES.updated,
          direction: 'descending',
        },
      ],
    });

    return response.results
      .filter((page): page is PageObjectResponse => 'properties' in page)
      .map(pageToItem);
  } catch (error) {
    throw new NotionError(`Failed to get completed tasks: ${error}`, 'QUERY_FAILED');
  }
}

export async function getWeeklyStats(owner?: string): Promise<{
  completed: number;
  totalPoints: number;
  tasks: Item[];
}> {
  const tasks = await getTasksDoneThisWeek(owner);
  const totalPoints = tasks.reduce((sum, task) => sum + (task.points || 0), 0);

  return {
    completed: tasks.length,
    totalPoints,
    tasks,
  };
}

export async function getOverdueTasks(owner?: string): Promise<Item[]> {
  const client = getClient();
  const databaseId = getDatabaseId();
  const today = getTodayDateString();

  const filters: Parameters<typeof client.databases.query>[0]['filter'] = {
    and: [
      {
        property: NOTION_PROPERTIES.type,
        select: { equals: 'chore' },
      },
      {
        property: NOTION_PROPERTIES.status,
        select: { does_not_equal: 'done' },
      },
      {
        property: NOTION_PROPERTIES.dueDate,
        date: { before: today },
      },
    ],
  };

  if (owner && filters.and) {
    (filters.and as unknown[]).push({
      property: NOTION_PROPERTIES.owner,
      select: { equals: owner },
    });
  }

  try {
    const response = await client.databases.query({
      database_id: databaseId,
      filter: filters,
      sorts: [
        {
          property: NOTION_PROPERTIES.dueDate,
          direction: 'ascending',
        },
      ],
    });

    return response.results
      .filter((page): page is PageObjectResponse => 'properties' in page)
      .map(pageToItem);
  } catch (error) {
    throw new NotionError(`Failed to get overdue tasks: ${error}`, 'QUERY_FAILED');
  }
}
