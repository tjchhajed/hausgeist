/**
 * Weekly Heartbeat Generator
 * Produces the Sunday morning summary report
 */

import {
  getWeeklyStats,
  getOpenTasks,
  getOverdueTasks,
  Item,
} from '../notion';
import { HeartbeatReport } from './types';

/**
 * Generate the weekly heartbeat report from live Notion data.
 */
export async function generateHeartbeat(): Promise<HeartbeatReport> {
  const [stats, open, overdue] = await Promise.all([
    getWeeklyStats(),
    getOpenTasks(),
    getOverdueTasks(),
  ]);

  // Break down completed tasks by owner
  const byOwner: HeartbeatReport['choreSummary']['byOwner'] = {};
  for (const task of stats.tasks) {
    const owner = task.owner || 'Family';
    if (!byOwner[owner]) byOwner[owner] = { count: 0, points: 0 };
    byOwner[owner].count++;
    byOwner[owner].points += task.points || 0;
  }

  // Find top performer
  let topPerformer: string | undefined;
  let topCount = 0;
  for (const [owner, data] of Object.entries(byOwner)) {
    if (data.count > topCount) {
      topCount = data.count;
      topPerformer = owner;
    }
  }

  // Break down open tasks by owner
  const openByOwner: Record<string, number> = {};
  for (const task of open) {
    const owner = task.owner || 'Family';
    openByOwner[owner] = (openByOwner[owner] || 0) + 1;
  }

  return {
    choreSummary: {
      completed: stats.completed,
      totalPoints: stats.totalPoints,
      byOwner,
      topPerformer,
    },
    openTasks: {
      total: open.length,
      overdue: overdue.length,
      byOwner: openByOwner,
    },
    // v0.2/v0.3 — no inventory or document queries yet
    inventoryAlerts: [],
    documentAlerts: [],
    suggestions: [],
  };
}

/**
 * Format the heartbeat report into a readable message.
 */
export function formatHeartbeat(report: HeartbeatReport): string {
  const lines: string[] = [];

  lines.push('👻 **Hausgeist Weekly Report**');
  lines.push('');

  // Chore summary
  lines.push('📋 **Chores**');
  if (report.choreSummary.completed > 0) {
    lines.push(`Completed this week: ${report.choreSummary.completed}`);
    lines.push(`Points earned: ${report.choreSummary.totalPoints} ⭐`);

    if (report.choreSummary.topPerformer) {
      lines.push(`Top performer: ${report.choreSummary.topPerformer} 🏆`);
    }

    lines.push('');
    for (const [owner, data] of Object.entries(report.choreSummary.byOwner)) {
      lines.push(`  ${owner}: ${data.count} task${data.count === 1 ? '' : 's'} (${data.points} pts)`);
    }
  } else {
    lines.push('No tasks completed this week.');
  }

  // Open tasks
  lines.push('');
  lines.push('📌 **Still Open**');
  if (report.openTasks.total > 0) {
    lines.push(`${report.openTasks.total} open task${report.openTasks.total === 1 ? '' : 's'}`);
    if (report.openTasks.overdue > 0) {
      lines.push(`⚠️ ${report.openTasks.overdue} overdue!`);
    }
    for (const [owner, count] of Object.entries(report.openTasks.byOwner)) {
      lines.push(`  ${owner}: ${count}`);
    }
  } else {
    lines.push('All clear! 🎉');
  }

  // Inventory alerts (v0.2)
  if (report.inventoryAlerts.length > 0) {
    lines.push('');
    lines.push('👕 **Inventory**');
    for (const alert of report.inventoryAlerts) {
      lines.push(`- ${alert}`);
    }
  }

  // Document alerts (v0.3)
  if (report.documentAlerts.length > 0) {
    lines.push('');
    lines.push('📄 **Documents**');
    for (const alert of report.documentAlerts) {
      lines.push(`- ${alert}`);
    }
  }

  // Suggestions
  if (report.suggestions.length > 0) {
    lines.push('');
    lines.push('💡 **Suggestions**');
    for (const s of report.suggestions) {
      lines.push(`- ${s}`);
    }
  }

  lines.push('');
  lines.push('Have a great week! 👻');

  return lines.join('\n');
}
