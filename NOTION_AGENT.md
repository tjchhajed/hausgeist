# Notion Agent

You are the **Notion Agent** for Hausgeist. You own the data layer.

## Read First

1. `../CLAUDE.md` — Master context
2. `../README.md` — Architecture overview
3. `../notion/TEMPLATE.md` — Database schema

## Your Scope

```
src/notion/
├── client.ts       # Notion API connection
├── types.ts        # TypeScript interfaces
├── tasks.ts        # Task CRUD operations
├── inventory.ts    # Inventory CRUD (v0.2)
├── documents.ts    # Document CRUD (v0.3)
└── queries.ts      # Common query helpers
```

**You own:** Everything in `src/notion/`
**You don't touch:** `skills/`, `src/rules/`, UI code

## Your Responsibilities

1. **Notion API client** — Initialize, authenticate, handle errors
2. **CRUD operations** — Create, read, update, delete items
3. **Query helpers** — Get tasks by owner, by date, by status
4. **Type safety** — Keep TypeScript interfaces in sync with Notion schema

## Data Model

```typescript
// src/notion/types.ts

export type ItemType = 'chore' | 'inventory' | 'document';

export type ChoreStatus = 'todo' | 'doing' | 'done';
export type InventoryStatus = 'have' | 'outgrown' | 'broken' | 'to-buy' | 'bought';
export type DocumentStatus = 'valid' | 'expiring-soon' | 'expired' | 'renewed';

export interface Item {
  id: string;
  title: string;
  type: ItemType;
  status: ChoreStatus | InventoryStatus | DocumentStatus;
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
}

export interface CreateItemInput {
  title: string;
  type: ItemType;
  owner: string;
  dueDate?: Date;
  points?: number;
  recurring?: boolean;
  frequency?: string;
  category?: string;
  size?: string;
}

export interface QueryOptions {
  type?: ItemType;
  owner?: string;
  status?: string;
  dueBefore?: Date;
  dueAfter?: Date;
}
```

## API Functions to Implement

### v0.1 (Tasks)

```typescript
// src/notion/client.ts
export function initNotion(): NotionClient

// src/notion/tasks.ts
export async function createTask(input: CreateItemInput): Promise<Item>
export async function getTask(id: string): Promise<Item | null>
export async function updateTaskStatus(id: string, status: ChoreStatus): Promise<Item>
export async function completeTask(id: string): Promise<Item>  // Sets status=done, records completion time

// src/notion/queries.ts
export async function getTasksForOwner(owner: string): Promise<Item[]>
export async function getTasksForToday(): Promise<Item[]>
export async function getOpenTasks(): Promise<Item[]>
export async function getTasksDoneThisWeek(owner?: string): Promise<Item[]>
```

### v0.2 (Inventory) — Later

```typescript
// src/notion/inventory.ts
export async function createInventoryItem(input: CreateItemInput): Promise<Item>
export async function markOutgrown(id: string): Promise<Item>
export async function getItemsToShop(): Promise<Item[]>
export async function getOutgrownItems(owner?: string): Promise<Item[]>
```

## Environment Variables

```
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=xxx
```

## Implementation Order

1. **`src/notion/types.ts`** — Define all interfaces
2. **`src/notion/client.ts`** — Notion client initialization
3. **`src/notion/tasks.ts`** — Task CRUD
4. **`src/notion/queries.ts`** — Query helpers
5. **Test** — Make sure it all works

## Testing Your Code

```bash
# Create a test script
npx ts-node -e "
import { initNotion } from './src/notion/client';
import { createTask, getOpenTasks } from './src/notion/tasks';

async function test() {
  initNotion();
  
  // Create a test task
  const task = await createTask({
    title: 'Test task',
    type: 'chore',
    owner: 'Ira'
  });
  console.log('Created:', task);
  
  // Get open tasks
  const open = await getOpenTasks();
  console.log('Open tasks:', open);
}

test();
"
```

## Handoff to Other Agents

When your code is ready, update `agents/HANDOFFS.md`:

```markdown
## Notion Agent → Skills Agent
- `src/notion/tasks.ts` is ready
- Import: `import { createTask, completeTask, getTasksForOwner } from '../notion/tasks'`
- Functions available: createTask, getTask, updateTaskStatus, completeTask
```

## Dependencies

```json
{
  "@notionhq/client": "^2.2.0",
  "typescript": "^5.0.0"
}
```

## Questions to Ask Yourself

- [ ] Are error cases handled? (task not found, API errors)
- [ ] Are dates handled correctly? (timezone: Europe/Berlin)
- [ ] Is the Notion property mapping correct?
- [ ] Can other agents use my functions easily?

---

Start with `src/notion/types.ts` and `src/notion/client.ts`. Go! 👻
