/**
 * Command Handlers
 * Processes parsed commands by calling the Notion data layer
 */

import { ParsedCommand } from './parser';
import {
  createTask,
  completeTask,
  getOpenTasks,
  getTasksForOwner,
  getTasksForToday,
  getWeeklyStats,
  getOverdueTasks,
  Item,
} from '../../src/notion';

/**
 * Fuzzy match a task identifier against a list of tasks.
 * Returns the best matching task or null.
 */
function findBestMatch(identifier: string, tasks: Item[]): Item | null {
  if (!identifier || tasks.length === 0) return null;

  const needle = identifier.toLowerCase();

  // Exact title match
  const exact = tasks.find((t) => t.title.toLowerCase() === needle);
  if (exact) return exact;

  // Title contains the identifier
  const contains = tasks.find((t) => t.title.toLowerCase().includes(needle));
  if (contains) return contains;

  // Identifier contains the title
  const reverse = tasks.find((t) => needle.includes(t.title.toLowerCase()));
  if (reverse) return reverse;

  // Word overlap scoring
  const needleWords = needle.split(/\s+/);
  let bestScore = 0;
  let bestMatch: Item | null = null;

  for (const task of tasks) {
    const titleWords = task.title.toLowerCase().split(/\s+/);
    let score = 0;
    for (const word of needleWords) {
      if (titleWords.some((tw) => tw.includes(word) || word.includes(tw))) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = task;
    }
  }

  // Require at least one word overlap
  return bestScore > 0 ? bestMatch : null;
}

function formatDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === -1) return 'yesterday';
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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

export async function handleAddTask(cmd: ParsedCommand): Promise<string> {
  if (!cmd.title) {
    return "What's the task? Try something like: \"Add task for Ira: brush teeth\"";
  }

  const owner = cmd.owner || 'Family';

  const task = await createTask({
    title: cmd.title,
    owner,
    recurring: cmd.recurring,
    frequency: cmd.frequency,
  });

  let response = `Got it! Added "${task.title}" for ${task.owner}.`;
  if (task.recurring && task.frequency) {
    response += ` It'll repeat ${task.frequency}.`;
  }
  response += ' 👻';
  return response;
}

export async function handleCompleteTask(cmd: ParsedCommand): Promise<string> {
  if (!cmd.taskIdentifier) {
    return "Which task was finished? Try: \"Ira finished brushing teeth\"";
  }

  // Get open tasks to match against
  const tasks = cmd.owner
    ? await getTasksForOwner(cmd.owner)
    : await getOpenTasks();

  const openTasks = tasks.filter((t) => t.status !== 'done');

  const match = findBestMatch(cmd.taskIdentifier, openTasks);
  if (!match) {
    const ownerHint = cmd.owner ? ` for ${cmd.owner}` : '';
    return `Couldn't find an open task matching "${cmd.taskIdentifier}"${ownerHint}. Try \"What's left?\" to see open tasks.`;
  }

  const completed = await completeTask(match.id);
  const points = completed.points || 5;

  return `Nice! ✅ "${completed.title}" is done. ${completed.owner} earned ${points} points! ⭐`;
}

export async function handleListTasks(cmd: ParsedCommand): Promise<string> {
  let tasks: Item[];

  if (cmd.timeframe === 'today') {
    tasks = await getTasksForToday();
    if (cmd.owner) {
      tasks = tasks.filter((t) => t.owner === cmd.owner);
    }
  } else if (cmd.owner) {
    const allTasks = await getTasksForOwner(cmd.owner);
    tasks = allTasks.filter((t) => t.status !== 'done');
  } else {
    tasks = await getOpenTasks();
  }

  if (tasks.length === 0) {
    if (cmd.owner) {
      return `${cmd.owner} has no open tasks. All done! 🎉`;
    }
    return 'No open tasks. The house spirit is pleased. 👻';
  }

  const grouped = groupByOwner(tasks);
  let response = '';

  if (cmd.timeframe === 'today') {
    response += "Here's what's on for today:\n\n";
  } else {
    response += "Here's what's open:\n\n";
  }

  for (const [owner, ownerTasks] of Object.entries(grouped)) {
    response += `**${owner}:**\n`;
    for (const t of ownerTasks) {
      const due = t.dueDate ? ` (due ${formatDate(t.dueDate)})` : '';
      const status = t.status === 'doing' ? ' 🔄' : '';
      response += `- ${t.title}${due}${status}\n`;
    }
    response += '\n';
  }

  const total = tasks.length;
  response += `${total} task${total === 1 ? '' : 's'} total.`;

  return response;
}

export async function handleSummary(cmd: ParsedCommand): Promise<string> {
  const stats = await getWeeklyStats(cmd.owner);
  const overdue = await getOverdueTasks(cmd.owner);

  if (stats.completed === 0 && overdue.length === 0) {
    const who = cmd.owner || 'everyone';
    return `No completed tasks this week for ${who} yet. Time to get going! 👻`;
  }

  let response = '👻 **Weekly Report**\n\n';

  if (cmd.owner) {
    response += `**${cmd.owner}:**\n`;
    response += `- Completed: ${stats.completed} task${stats.completed === 1 ? '' : 's'}\n`;
    response += `- Points earned: ${stats.totalPoints} ⭐\n`;
  } else {
    response += `**Completed:** ${stats.completed} task${stats.completed === 1 ? '' : 's'}\n`;
    response += `**Points earned:** ${stats.totalPoints} ⭐\n`;

    if (stats.tasks.length > 0) {
      // Break down by owner
      const grouped = groupByOwner(stats.tasks);
      response += '\n';
      for (const [owner, ownerTasks] of Object.entries(grouped)) {
        const ownerPoints = ownerTasks.reduce((sum, t) => sum + (t.points || 0), 0);
        response += `**${owner}:** ${ownerTasks.length} task${ownerTasks.length === 1 ? '' : 's'} (${ownerPoints} pts)\n`;
      }
    }
  }

  if (overdue.length > 0) {
    response += `\n⚠️ **Overdue:** ${overdue.length} task${overdue.length === 1 ? '' : 's'}\n`;
    for (const t of overdue.slice(0, 3)) {
      response += `- ${t.title} (${t.owner})\n`;
    }
    if (overdue.length > 3) {
      response += `- ...and ${overdue.length - 3} more\n`;
    }
  }

  return response;
}
