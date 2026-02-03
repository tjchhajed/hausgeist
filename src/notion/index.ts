/**
 * Notion Data Layer
 * Main exports for the Hausgeist Notion integration
 */

// Client
export { initNotion, getClient, getDatabaseId, testConnection, NotionError } from './client';

// Types
export type {
  Item,
  ItemType,
  ItemStatus,
  ChoreStatus,
  InventoryStatus,
  DocumentStatus,
  CreateTaskInput,
  CreateInventoryInput,
  CreateDocumentInput,
  QueryOptions,
} from './types';
export { NOTION_PROPERTIES } from './types';

// Task operations
export {
  createTask,
  getTask,
  updateTaskStatus,
  completeTask,
  deleteTask,
} from './tasks';

// Query helpers
export {
  getTasksForOwner,
  getTasksForToday,
  getOpenTasks,
  getTasksDoneThisWeek,
  getWeeklyStats,
  getOverdueTasks,
} from './queries';
