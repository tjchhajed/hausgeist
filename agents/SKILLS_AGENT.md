# Skills Agent

You are the **Skills Agent** for Hausgeist. You own the conversation layer.

## Read First

1. `../CLAUDE.md` — Master context
2. `../README.md` — Architecture overview
3. `../skills/tasks/SKILL.md` — Skill documentation
4. `../skills/tasks/skill.yaml` — Skill configuration

## Your Scope

```
skills/
├── tasks/
│   ├── SKILL.md        # Documentation (already exists)
│   ├── skill.yaml      # Config (already exists)
│   ├── index.ts        # Main skill entry point
│   ├── handlers.ts     # Command handlers
│   └── parser.ts       # Natural language parsing
└── inventory/          # v0.2
    └── ...
```

**You own:** Everything in `skills/`
**You don't touch:** `src/notion/`, `src/rules/`, UI code

## Your Responsibilities

1. **Parse natural language** — Understand what the user wants
2. **Route to handlers** — Call the right function for each command
3. **Format responses** — Return friendly, conversational messages
4. **Handle errors** — Graceful failures with helpful messages

## Dependencies

You depend on the **Notion Agent** for data operations:

```typescript
// Import from Notion Agent's code
import { 
  createTask, 
  completeTask, 
  getTasksForOwner,
  getTasksForToday,
  getOpenTasks 
} from '../../src/notion/tasks';
```

**Wait for:** Notion Agent to complete `src/notion/tasks.ts` before implementing handlers.

## Command Patterns

### Add Task
```
"Add task for Ira: brush teeth"
"Create a chore for family: clean kitchen"
"Ira needs to tidy her toys"
"{owner} should {task}"
```

**Extract:** owner, title, optional (recurring, due date, points)

### Complete Task
```
"Ira finished brushing teeth"
"Mark tidy toys as done"
"Ira did her chores"
"{owner} finished {task}"
"{owner} completed {task}"
```

**Extract:** owner, task identifier (fuzzy match)

### List Tasks
```
"What are Ira's tasks for today?"
"Show me all open chores"
"What's left to do?"
"Family tasks for this week"
```

**Extract:** owner (optional), timeframe (optional)

### Task Summary
```
"How did Ira do this week?"
"Chore summary"
"Weekly report"
```

**Extract:** owner (optional), timeframe

## Implementation

### Parser

```typescript
// skills/tasks/parser.ts

export interface ParsedCommand {
  intent: 'add_task' | 'complete_task' | 'list_tasks' | 'summary';
  owner?: string;
  title?: string;
  taskIdentifier?: string;
  timeframe?: 'today' | 'week' | 'month' | 'all';
  recurring?: boolean;
  dueDate?: Date;
}

export function parseCommand(message: string): ParsedCommand {
  const normalized = message.toLowerCase().trim();
  
  // Detect intent
  if (normalized.match(/add|create|needs to|should/)) {
    return parseAddTask(message);
  }
  if (normalized.match(/finished|completed|done|did/)) {
    return parseCompleteTask(message);
  }
  if (normalized.match(/what's left|show|list|tasks for/)) {
    return parseListTasks(message);
  }
  if (normalized.match(/how did|summary|report/)) {
    return parseSummary(message);
  }
  
  throw new Error('Could not understand command');
}

// Family members to recognize
const FAMILY_MEMBERS = ['ira', 'isha', 'papa', 'mama', 'family'];

function extractOwner(message: string): string | undefined {
  const lower = message.toLowerCase();
  return FAMILY_MEMBERS.find(m => lower.includes(m));
}
```

### Handlers

```typescript
// skills/tasks/handlers.ts

import { ParsedCommand } from './parser';
import { createTask, completeTask, getTasksForOwner, getOpenTasks } from '../../src/notion/tasks';

export async function handleAddTask(cmd: ParsedCommand): Promise<string> {
  if (!cmd.owner || !cmd.title) {
    return "I need to know who the task is for and what it is. Try: 'Add task for Ira: brush teeth'";
  }
  
  const task = await createTask({
    title: cmd.title,
    type: 'chore',
    owner: capitalize(cmd.owner),
    recurring: cmd.recurring,
  });
  
  return `Got it! I've added "${task.title}" for ${task.owner}. 👻`;
}

export async function handleCompleteTask(cmd: ParsedCommand): Promise<string> {
  // Find task by fuzzy matching title
  const tasks = await getTasksForOwner(cmd.owner);
  const match = findBestMatch(cmd.taskIdentifier, tasks);
  
  if (!match) {
    return `I couldn't find a task matching "${cmd.taskIdentifier}" for ${cmd.owner}.`;
  }
  
  const completed = await completeTask(match.id);
  const points = completed.points || 5;
  
  return `Nice! ✅ "${completed.title}" is done. ${completed.owner} earned ${points} points! ⭐`;
}

export async function handleListTasks(cmd: ParsedCommand): Promise<string> {
  const tasks = cmd.owner 
    ? await getTasksForOwner(cmd.owner)
    : await getOpenTasks();
  
  if (tasks.length === 0) {
    return cmd.owner 
      ? `${cmd.owner} has no open tasks. All done! 🎉`
      : `No open tasks. The house spirit is pleased. 👻`;
  }
  
  const grouped = groupByOwner(tasks);
  let response = "Here's what's open:\n\n";
  
  for (const [owner, ownerTasks] of Object.entries(grouped)) {
    response += `**${owner}:**\n`;
    ownerTasks.forEach(t => {
      response += `- ${t.title}${t.dueDate ? ` (due ${formatDate(t.dueDate)})` : ''}\n`;
    });
    response += '\n';
  }
  
  return response;
}

export async function handleSummary(cmd: ParsedCommand): Promise<string> {
  // TODO: Implement weekly summary
  return "Weekly summary coming soon! 👻";
}
```

### Main Entry Point

```typescript
// skills/tasks/index.ts

import { parseCommand } from './parser';
import { handleAddTask, handleCompleteTask, handleListTasks, handleSummary } from './handlers';

export async function handleMessage(message: string): Promise<string> {
  try {
    const cmd = parseCommand(message);
    
    switch (cmd.intent) {
      case 'add_task':
        return handleAddTask(cmd);
      case 'complete_task':
        return handleCompleteTask(cmd);
      case 'list_tasks':
        return handleListTasks(cmd);
      case 'summary':
        return handleSummary(cmd);
      default:
        return "I'm not sure what you want me to do. Try 'Add task for Ira: brush teeth' or 'What's left for today?'";
    }
  } catch (error) {
    return `Oops, something went wrong: ${error.message}`;
  }
}
```

## Response Guidelines

- **Friendly tone** — You're a helpful house spirit, not a robot
- **Use emojis** — 👻 ✅ ⭐ 🎉 sparingly
- **Confirm actions** — "Got it! I've added..."
- **Be helpful on errors** — Suggest correct format

### Good Responses

```
"Got it! I've added 'brush teeth' for Ira. 👻"

"Nice! ✅ 'Tidy toys' is done. Ira earned 5 points! ⭐"

"Here's what's left for today:

**Ira:**
- Help set the table

**Family:**
- Take out trash

Almost done! 👻"
```

### Bad Responses

```
"Task created successfully with ID abc123."  // Too robotic

"ERROR: Owner field required"  // Not friendly

"Done."  // Too terse
```

## Testing

```bash
# Test parser
npx ts-node -e "
import { parseCommand } from './skills/tasks/parser';
console.log(parseCommand('Add task for Ira: brush teeth'));
console.log(parseCommand('Ira finished brushing teeth'));
console.log(parseCommand('What\\'s left for today?'));
"
```

## Handoff Notes

**Waiting on:**
- Notion Agent: `src/notion/tasks.ts` with CRUD functions

**Providing to:**
- Rules Agent: Will call your `handleMessage` for automated messages

---

Start with `skills/tasks/parser.ts` — get the NLP working first. 👻
