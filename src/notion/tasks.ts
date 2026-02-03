/**
 * Task CRUD Operations
 * Handles chore/task management in Notion
 */

import {
  PageObjectResponse,
  QueryDatabaseResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { getClient, getDatabaseId, NotionError } from './client';
import {
  Item,
  CreateTaskInput,
  ChoreStatus,
  NOTION_PROPERTIES,
} from './types';

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

export async function createTask(input: CreateTaskInput): Promise<Item> {
  const client = getClient();
  const databaseId = getDatabaseId();

  const properties: Record<string, unknown> = {
    [NOTION_PROPERTIES.title]: {
      title: [{ text: { content: input.title } }],
    },
    [NOTION_PROPERTIES.type]: {
      select: { name: 'chore' },
    },
    [NOTION_PROPERTIES.status]: {
      select: { name: 'todo' },
    },
    [NOTION_PROPERTIES.owner]: {
      select: { name: input.owner },
    },
  };

  if (input.dueDate) {
    properties[NOTION_PROPERTIES.dueDate] = {
      date: { start: input.dueDate.toISOString().split('T')[0] },
    };
  }

  if (input.points !== undefined) {
    properties[NOTION_PROPERTIES.points] = {
      number: input.points,
    };
  }

  if (input.recurring !== undefined) {
    properties[NOTION_PROPERTIES.recurring] = {
      checkbox: input.recurring,
    };
  }

  if (input.frequency) {
    properties[NOTION_PROPERTIES.frequency] = {
      select: { name: input.frequency },
    };
  }

  if (input.notes) {
    properties[NOTION_PROPERTIES.notes] = {
      rich_text: [{ text: { content: input.notes } }],
    };
  }

  try {
    const response = await client.pages.create({
      parent: { database_id: databaseId },
      properties: properties as Parameters<typeof client.pages.create>[0]['properties'],
    });

    return pageToItem(response as PageObjectResponse);
  } catch (error) {
    if (error instanceof Error) {
      throw new NotionError(`Failed to create task: ${error.message}`, 'CREATE_FAILED');
    }
    throw error;
  }
}

export async function getTask(id: string): Promise<Item | null> {
  const client = getClient();

  try {
    const response = await client.pages.retrieve({ page_id: id });

    if (!('properties' in response)) {
      return null;
    }

    return pageToItem(response as PageObjectResponse);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return null;
    }
    throw new NotionError(`Failed to get task: ${error}`, 'GET_FAILED');
  }
}

export async function updateTaskStatus(
  id: string,
  status: ChoreStatus
): Promise<Item> {
  const client = getClient();

  try {
    const response = await client.pages.update({
      page_id: id,
      properties: {
        [NOTION_PROPERTIES.status]: {
          select: { name: status },
        },
      },
    });

    return pageToItem(response as PageObjectResponse);
  } catch (error) {
    throw new NotionError(`Failed to update task status: ${error}`, 'UPDATE_FAILED');
  }
}

export async function completeTask(id: string): Promise<Item> {
  return updateTaskStatus(id, 'done');
}

export async function deleteTask(id: string): Promise<void> {
  const client = getClient();

  try {
    await client.pages.update({
      page_id: id,
      archived: true,
    });
  } catch (error) {
    throw new NotionError(`Failed to delete task: ${error}`, 'DELETE_FAILED');
  }
}

export async function queryTasks(
  filter?: QueryDatabaseResponse['results'][number]['id']
): Promise<Item[]> {
  const client = getClient();
  const databaseId = getDatabaseId();

  try {
    const response = await client.databases.query({
      database_id: databaseId,
      filter: filter as Parameters<typeof client.databases.query>[0]['filter'],
    });

    return response.results
      .filter((page): page is PageObjectResponse => 'properties' in page)
      .map(pageToItem);
  } catch (error) {
    throw new NotionError(`Failed to query tasks: ${error}`, 'QUERY_FAILED');
  }
}
