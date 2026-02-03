# Rules Agent

You are the **Rules Agent** for Hausgeist. You own the proactive AI layer.

## Read First

1. `../CLAUDE.md` — Master context
2. `../README.md` — Architecture overview
3. `../config/rules.yaml` — Rule definitions

## Your Scope

```
src/rules/
├── engine.ts           # Rules evaluation engine
├── evaluators.ts       # Individual rule evaluators
├── heartbeat.ts        # Weekly summary generator
├── scheduler.ts        # Cron job management
└── notifications.ts    # Message formatting and sending
```

**You own:** Everything in `src/rules/`
**You don't touch:** `src/notion/`, `skills/`, UI code

## Your Responsibilities

1. **Evaluate rules** — Check conditions, trigger actions
2. **Generate suggestions** — Proactive recommendations
3. **Weekly heartbeat** — Sunday summary of everything
4. **Schedule checks** — Run rules at the right times

## Dependencies

You depend on:

**Notion Agent** for data:
```typescript
import { getOpenTasks, getTasksDoneThisWeek } from '../notion/tasks';
import { getOutgrownItems, getItemsByAge } from '../notion/inventory';
import { getExpiringDocuments } from '../notion/documents';
```

**Skills Agent** for sending messages:
```typescript
import { sendMessage } from '../../skills/notifications';
```

**Wait for:** Notion Agent to complete queries before implementing evaluators.

## Rule Structure

From `config/rules.yaml`:

```typescript
interface Rule {
  name: string;
  description: string;
  trigger: {
    type?: ItemType;
    status?: string;
    age?: string;           // "> 6 months"
    dueDate?: string;       // "within 30 days"
    event?: string;         // "status_changed"
  };
  schedule?: string;        // cron expression or "daily at 18:00"
  action: {
    type: 'remind' | 'suggest' | 'alert' | 'summary';
    priority?: 'normal' | 'high';
    message: string;        // Template with {{variables}}
  };
}
```

## Implementation

### Rules Engine

```typescript
// src/rules/engine.ts

import { Rule, EvaluationResult } from './types';
import { loadRules } from './loader';
import { evaluateRule } from './evaluators';

export class RulesEngine {
  private rules: Rule[];
  
  constructor() {
    this.rules = loadRules('../config/rules.yaml');
  }
  
  async evaluateAll(): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];
    
    for (const rule of this.rules) {
      const result = await evaluateRule(rule);
      if (result.triggered) {
        results.push(result);
      }
    }
    
    return results;
  }
  
  async evaluateBySchedule(schedule: string): Promise<EvaluationResult[]> {
    const scheduledRules = this.rules.filter(r => r.schedule === schedule);
    const results: EvaluationResult[] = [];
    
    for (const rule of scheduledRules) {
      const result = await evaluateRule(rule);
      if (result.triggered) {
        results.push(result);
      }
    }
    
    return results;
  }
}
```

### Evaluators

```typescript
// src/rules/evaluators.ts

import { Rule, EvaluationResult } from './types';
import { getItemsByAge, getExpiringDocuments, getTasksDoneThisWeek } from '../notion/queries';

export async function evaluateRule(rule: Rule): Promise<EvaluationResult> {
  const { trigger } = rule;
  
  // Age-based trigger (e.g., shoes > 6 months old)
  if (trigger.age) {
    const items = await getItemsByAge(trigger.type, trigger.age);
    if (items.length > 0) {
      return {
        triggered: true,
        rule,
        data: items,
        message: formatMessage(rule.action.message, { items, count: items.length })
      };
    }
  }
  
  // Expiry-based trigger (e.g., document expiring within 30 days)
  if (trigger.dueDate) {
    const items = await getExpiringDocuments(trigger.dueDate);
    if (items.length > 0) {
      return {
        triggered: true,
        rule,
        data: items,
        message: formatMessage(rule.action.message, { items })
      };
    }
  }
  
  // Status-based trigger (e.g., outgrown items)
  if (trigger.status) {
    const items = await getItemsByStatus(trigger.type, trigger.status);
    if (items.length > 0) {
      return {
        triggered: true,
        rule,
        data: items,
        message: formatMessage(rule.action.message, { items })
      };
    }
  }
  
  return { triggered: false, rule };
}

function formatMessage(template: string, data: Record<string, any>): string {
  let message = template;
  
  // Replace {{variable}} with actual values
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      // Format item lists
      const titles = value.map(i => i.title).join(', ');
      message = message.replace(`{{${key}}}`, titles);
    } else {
      message = message.replace(`{{${key}}}`, String(value));
    }
  }
  
  return message;
}
```

### Weekly Heartbeat

```typescript
// src/rules/heartbeat.ts

import { getTasksDoneThisWeek, getOpenTasks } from '../notion/tasks';
import { getOutgrownItems, getItemsByAge } from '../notion/inventory';
import { getExpiringDocuments } from '../notion/documents';

export interface HeartbeatReport {
  choreSummary: {
    completed: number;
    byOwner: Record<string, number>;
    topPerformer: string;
  };
  inventoryAlerts: string[];
  documentAlerts: string[];
  suggestions: string[];
}

export async function generateHeartbeat(): Promise<HeartbeatReport> {
  // Chore summary
  const completedTasks = await getTasksDoneThisWeek();
  const byOwner = groupBy(completedTasks, 'owner');
  const counts = Object.entries(byOwner).map(([owner, tasks]) => ({
    owner,
    count: tasks.length
  }));
  const topPerformer = counts.sort((a, b) => b.count - a.count)[0];
  
  // Inventory alerts
  const oldShoes = await getItemsByAge('inventory', '> 5 months', 'shoes');
  const outgrown = await getOutgrownItems();
  
  // Document alerts
  const expiring = await getExpiringDocuments('within 90 days');
  
  return {
    choreSummary: {
      completed: completedTasks.length,
      byOwner: Object.fromEntries(counts.map(c => [c.owner, c.count])),
      topPerformer: topPerformer?.owner || 'Nobody yet'
    },
    inventoryAlerts: [
      ...oldShoes.map(i => `${i.owner}'s ${i.title} might need replacing`),
      ...outgrown.map(i => `${i.title} is outgrown — donate or hand down?`)
    ],
    documentAlerts: expiring.map(d => 
      `${d.owner}'s ${d.title} expires in ${daysUntil(d.expiryDate)} days`
    ),
    suggestions: []
  };
}

export function formatHeartbeatMessage(report: HeartbeatReport): string {
  return `👻 **Hausgeist Weekly Report**

📋 **Chores**
Completed this week: ${report.choreSummary.completed}
Top performer: ${report.choreSummary.topPerformer} ⭐

${report.inventoryAlerts.length > 0 ? `👕 **Inventory Alerts**
${report.inventoryAlerts.map(a => `- ${a}`).join('\n')}` : ''}

${report.documentAlerts.length > 0 ? `📄 **Documents**
${report.documentAlerts.map(a => `- ${a}`).join('\n')}` : ''}

Have a great week! 👻`;
}
```

### Scheduler

```typescript
// src/rules/scheduler.ts

import { RulesEngine } from './engine';
import { generateHeartbeat, formatHeartbeatMessage } from './heartbeat';
import { sendNotification } from './notifications';

// For OpenClaw integration, export these functions to be called by cron

export async function runDailyCheck(): Promise<void> {
  const engine = new RulesEngine();
  const results = await engine.evaluateBySchedule('daily');
  
  for (const result of results) {
    if (result.triggered) {
      await sendNotification(result.message, result.rule.action.priority);
    }
  }
}

export async function runWeeklyHeartbeat(): Promise<void> {
  const report = await generateHeartbeat();
  const message = formatHeartbeatMessage(report);
  await sendNotification(message, 'normal');
}

export async function runDocumentCheck(): Promise<void> {
  const engine = new RulesEngine();
  const results = await engine.evaluateAll();
  
  const documentAlerts = results.filter(r => 
    r.rule.trigger.type === 'document' && r.triggered
  );
  
  for (const alert of documentAlerts) {
    await sendNotification(alert.message, alert.rule.action.priority);
  }
}
```

## OpenClaw Integration

The scheduler functions are called by OpenClaw's cron system. In `skills/tasks/skill.yaml`:

```yaml
schedules:
  - name: daily_check
    cron: "0 18 * * *"
    handler: runDailyCheck
  
  - name: weekly_heartbeat
    cron: "0 10 * * 0"
    handler: runWeeklyHeartbeat
```

## Testing

```bash
# Test heartbeat generation
npx ts-node -e "
import { generateHeartbeat, formatHeartbeatMessage } from './src/rules/heartbeat';

async function test() {
  const report = await generateHeartbeat();
  console.log(report);
  console.log('---');
  console.log(formatHeartbeatMessage(report));
}

test();
"

# Test rules engine
npx ts-node -e "
import { RulesEngine } from './src/rules/engine';

async function test() {
  const engine = new RulesEngine();
  const results = await engine.evaluateAll();
  console.log('Triggered rules:', results.filter(r => r.triggered));
}

test();
"
```

## Handoff Notes

**Waiting on:**
- Notion Agent: Query functions for tasks, inventory, documents

**Providing to:**
- OpenClaw: Scheduled functions for cron jobs
- Skills Agent: May call rules engine for on-demand checks

---

Start with `src/rules/engine.ts` and `src/rules/evaluators.ts`. The heartbeat can come after queries are ready. 👻
