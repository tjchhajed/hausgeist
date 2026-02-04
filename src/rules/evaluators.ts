/**
 * Rule Evaluators
 * Checks rule conditions against live data
 *
 * v0.1: Only chore rules are fully implemented.
 * Inventory/document evaluators return not-triggered until
 * those Notion query functions are built (v0.2/v0.3).
 */

import { Rule, EvaluationResult } from './types';
import {
  getOpenTasks,
  getTasksForToday,
  getOverdueTasks,
  getTasksDoneThisWeek,
  Item,
} from '../notion';

/**
 * Evaluate a single rule against live data.
 */
export async function evaluateRule(rule: Rule): Promise<EvaluationResult> {
  switch (rule.category) {
    case 'chores':
      return evaluateChoreRule(rule);
    case 'inventory':
    case 'documents':
    case 'suggestions':
      // Not implemented in v0.1
      return { triggered: false, rule };
  }
}

async function evaluateChoreRule(rule: Rule): Promise<EvaluationResult> {
  const trigger = rule.trigger;

  // Rules without a trigger (e.g. summary-only) are handled by heartbeat
  if (!trigger) {
    return { triggered: false, rule };
  }

  // "Daily chores incomplete" — open tasks due today
  if (trigger.frequency === 'daily' && trigger.status === 'todo' && trigger.due_date === 'today') {
    const tasks = await getTasksForToday();
    if (tasks.length > 0) {
      const grouped = groupByOwner(tasks);
      const messages = Object.entries(grouped).map(([owner, ownerTasks]) =>
        formatTemplate(rule.action.message, {
          owner,
          count: String(ownerTasks.length),
          titles: ownerTasks.map((t) => t.title).join(', '),
        })
      );
      return {
        triggered: true,
        rule,
        data: tasks,
        message: messages.join('\n'),
      };
    }
  }

  // "Recurring chore missed" — overdue recurring tasks
  if (trigger.recurring && trigger.last_completed) {
    const overdue = await getOverdueTasks();
    const recurring = overdue.filter((t) => t.recurring);
    if (recurring.length > 0) {
      const messages = recurring.map((t) =>
        formatTemplate(rule.action.message, {
          owner: t.owner,
          title: t.title,
        })
      );
      return {
        triggered: true,
        rule,
        data: recurring,
        message: messages.join('\n'),
      };
    }
  }

  // "Weekly chore summary" — handled by heartbeat instead
  if (rule.action.type === 'summary') {
    return { triggered: false, rule };
  }

  return { triggered: false, rule };
}

function formatTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

function groupByOwner(tasks: Item[]): Record<string, Item[]> {
  const groups: Record<string, Item[]> = {};
  for (const task of tasks) {
    const owner = task.owner || 'Family';
    if (!groups[owner]) groups[owner] = [];
    groups[owner].push(task);
  }
  return groups;
}
