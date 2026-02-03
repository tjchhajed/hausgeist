# Agent Handoffs

This file tracks dependencies and communication between agents.

## Status

| Agent | Status | Blocking |
|-------|--------|----------|
| Notion Agent | 🔴 Not started | — |
| Skills Agent | 🔴 Not started | Notion Agent |
| Rules Agent | 🔴 Not started | Notion Agent |

## Dependency Graph

```
┌──────────────────┐
│   Notion Agent   │
│   (Data Layer)   │
└────────┬─────────┘
         │
         │ provides data functions
         ▼
┌────────┴─────────┐
│                  │
▼                  ▼
┌──────────────┐  ┌──────────────┐
│ Skills Agent │  │ Rules Agent  │
│ (Conversation)│  │ (Proactive)  │
└──────────────┘  └──────────────┘
```

---

## Handoff Log

### [Date] Notion Agent → Skills Agent

**Status:** ⏳ Pending

**When ready, Skills Agent can use:**
```typescript
import { 
  createTask, 
  getTask,
  completeTask, 
  getTasksForOwner,
  getTasksForToday,
  getOpenTasks,
  getTasksDoneThisWeek
} from '../notion/tasks';
```

**Notes:**
- (Add notes when implementation is complete)

---

### [Date] Notion Agent → Rules Agent

**Status:** ⏳ Pending

**When ready, Rules Agent can use:**
```typescript
import { 
  getTasksDoneThisWeek,
  getItemsByAge,
  getOutgrownItems,
  getExpiringDocuments
} from '../notion/queries';
```

**Notes:**
- (Add notes when implementation is complete)

---

### [Date] Skills Agent → Rules Agent

**Status:** ⏳ Pending

**When ready, Rules Agent can use:**
```typescript
import { sendMessage } from '../../skills/notifications';
```

**Notes:**
- (Add notes when implementation is complete)

---

## How to Update This File

When you complete something another agent needs:

1. Update the status in the table above
2. Add a dated entry in the Handoff Log
3. Include:
   - What functions are now available
   - Any caveats or notes
   - Example usage if helpful

Example:

```markdown
### 2026-02-03 Notion Agent → Skills Agent

**Status:** ✅ Complete

**Available functions:**
- `createTask(input)` — Creates a new task, returns the created item
- `completeTask(id)` — Marks task done, awards points, returns updated item
- `getTasksForOwner(owner)` — Returns all open tasks for owner

**Notes:**
- Owner names are case-sensitive ("Ira" not "ira")
- `completeTask` automatically sets `completedAt` timestamp
```

---

## Questions / Blockers

Use this section to ask questions or flag blockers for other agents.

**Format:**
```
[Agent] → [Question/Blocker]
```

**Current:**
- (None yet)
