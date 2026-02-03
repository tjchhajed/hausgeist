# Hausgeist Tasks Skill

This skill allows OpenClaw to manage family tasks through natural conversation.

## Commands

### Add a task
```
"Add task for Ira: brush teeth"
"Create a chore for family: clean kitchen"
"Ira needs to tidy her toys"
```

### Complete a task
```
"Ira finished brushing teeth"
"Mark tidy toys as done"
"Ira completed her chores"
```

### List tasks
```
"What are Ira's tasks for today?"
"Show me all open chores"
"What's left to do?"
"Family tasks for this week"
```

### Task status
```
"How did Ira do this week?"
"Chore summary"
"Who completed the most tasks?"
```

## Notion Integration

This skill reads and writes to the Hausgeist Notion database.

### Environment Variables Required

```bash
NOTION_API_KEY=your_integration_token
NOTION_DATABASE_ID=your_database_id
```

### API Operations

**Create task:**
```javascript
// POST https://api.notion.com/v1/pages
{
  parent: { database_id: NOTION_DATABASE_ID },
  properties: {
    Title: { title: [{ text: { content: "Brush teeth" } }] },
    Type: { select: { name: "chore" } },
    Status: { select: { name: "todo" } },
    Owner: { select: { name: "Ira" } },
    Recurring: { checkbox: true },
    Frequency: { select: { name: "daily" } }
  }
}
```

**Update task status:**
```javascript
// PATCH https://api.notion.com/v1/pages/{page_id}
{
  properties: {
    Status: { select: { name: "done" } }
  }
}
```

**Query tasks:**
```javascript
// POST https://api.notion.com/v1/databases/{database_id}/query
{
  filter: {
    and: [
      { property: "Type", select: { equals: "chore" } },
      { property: "Owner", select: { equals: "Ira" } },
      { property: "Status", select: { does_not_equal: "done" } }
    ]
  }
}
```

## Conversation Examples

### Example 1: Adding a task

**User:** Add a task for Ira to brush her teeth every morning

**Hausgeist:** Got it! I've added "Brush teeth (morning)" as a daily recurring task for Ira. She can check it off each morning. 🦷

---

### Example 2: Completing tasks

**User:** Ira did her teeth and tidied her toys

**Hausgeist:** Nice! ✅ I've marked both tasks as done:
- Brush teeth (morning)
- Tidy toys

Ira has earned 10 points today! ⭐

---

### Example 3: Checking status

**User:** What's left for today?

**Hausgeist:** Here's what's still open for today:

**Ira:**
- Help set the table (before dinner)

**Family:**
- Take out trash

Everyone's doing great! 👻

---

### Example 4: Weekly summary

**User:** How did we do this week?

**Hausgeist:** 👻 Weekly chore report:

**Completed:** 23 tasks
**Top performer:** Ira with 12 tasks! ⭐

**Ira:** 12 tasks (85% completion)
**Family:** 11 tasks (100% completion)

Great teamwork this week!

## Skill Configuration

```yaml
name: hausgeist-tasks
description: Family task management for Hausgeist
version: 0.1.0

triggers:
  - "add task"
  - "create chore"
  - "finished"
  - "completed"
  - "done"
  - "what's left"
  - "tasks for today"
  - "chore summary"

requires:
  - notion_api

config:
  family_members:
    - Ira
    - Isha
    - Papa
    - Mama
    - Family
  
  default_points:
    simple: 5
    medium: 10
    hard: 20
  
  celebrations:
    task_complete: "✅"
    all_done: "🎉"
    streak: "🔥"
    star: "⭐"
```

## Files

```
skills/tasks/
├── SKILL.md          # This file
├── skill.yaml        # OpenClaw skill configuration
├── notion.js         # Notion API wrapper
└── handlers.js       # Command handlers
```
