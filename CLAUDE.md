# Hausgeist — Master Context

You are building **Hausgeist** — a family operating system ("Jira for home").

## Agent System

This project uses multiple Claude Code agents. Each agent has a specific role:

| Agent | File | Responsibility |
|-------|------|----------------|
| Notion Agent | `agents/NOTION_AGENT.md` | Data layer, Notion API |
| Skills Agent | `agents/SKILLS_AGENT.md` | OpenClaw conversation handlers |
| Rules Agent | `agents/RULES_AGENT.md` | Proactive AI, heartbeat, suggestions |

**How it works:**
1. All agents read this `CLAUDE.md` first for shared context
2. Each agent then reads their specific `agents/*_AGENT.md`
3. Agents work on their own files/folders only
4. Agents commit to git — others pull to see changes
5. If you need something from another agent's domain, note it in `agents/HANDOFFS.md`

## Project Context

Read these files first to understand the architecture:
1. `README.md` — Overall architecture and data model
2. `docs/ROADMAP.md` — What we're building and in what order
3. `notion/TEMPLATE.md` — How the Notion database is structured
4. `config/rules.yaml` — AI rules for proactive suggestions
5. `skills/tasks/SKILL.md` — OpenClaw skill documentation

## Current Goal: v0.1

Build a working MVP with:
- [ ] Notion database integration (read/write tasks)
- [ ] OpenClaw skill that handles natural language commands
- [ ] Basic weekly heartbeat summary

## Tech Stack

- **Backend:** Notion API (database)
- **AI Layer:** OpenClaw (conversation + automation)
- **Messaging:** WhatsApp/Telegram via OpenClaw
- **Language:** TypeScript preferred, JavaScript OK

## Key Files to Create

```
hausgeist/
├── src/
│   ├── notion/
│   │   ├── client.ts       # Notion API wrapper
│   │   ├── tasks.ts        # Task CRUD operations
│   │   └── queries.ts      # Common queries (today's tasks, by owner, etc.)
│   ├── rules/
│   │   └── engine.ts       # Rules evaluation engine
│   └── index.ts            # Main entry point
├── skills/
│   └── tasks/
│       └── index.ts        # OpenClaw skill handlers
├── package.json
└── tsconfig.json
```

## Commands to Support

### Task Management
- "Add task for {person}: {title}" → Create task in Notion
- "{person} finished {task}" → Mark as done, award points
- "What's left for today?" → Query open tasks
- "How did {person} do this week?" → Summary stats

### Data Model (Notion)

```typescript
interface Item {
  id: string;
  title: string;
  type: 'chore' | 'inventory' | 'document';
  status: string;  // depends on type
  owner: string;   // family member
  dueDate?: Date;
  points?: number;
  recurring?: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
  metadata?: Record<string, any>;
}
```

## Environment Variables

```
NOTION_API_KEY=xxx
NOTION_DATABASE_ID=xxx
```

## How to Work

1. Start with `src/notion/client.ts` — basic Notion connection
2. Add `src/notion/tasks.ts` — CRUD for tasks
3. Wire up `skills/tasks/index.ts` — OpenClaw handlers
4. Test each piece as you go

## Testing

For now, test manually:
```bash
# Test Notion connection
npx ts-node src/notion/client.ts

# Test adding a task
npx ts-node -e "import { createTask } from './src/notion/tasks'; createTask({title: 'Test', owner: 'Ira'})"
```

## Questions?

If unclear on anything:
1. Check the existing docs in this repo
2. Ask clarifying questions before implementing
3. Prefer simple solutions over complex ones

Let's build! 👻
