/**
 * Hausgeist — OpenClaw Plugin
 *
 * Registers tools that the OpenClaw agent can call to manage
 * family tasks, generate heartbeat summaries, and run rules.
 */

import { Type } from '@sinclair/typebox';
import { initNotion } from './src/notion';
import { handleMessage } from './skills/tasks';
import { runWeeklyHeartbeat, runDailyCheck } from './src/rules';

let notionInitialized = false;

function ensureNotion() {
  if (!notionInitialized) {
    initNotion();
    notionInitialized = true;
  }
}

export default function register(api: any) {
  // ─── Main tool: process a family task command ───
  api.registerTool({
    name: 'hausgeist_task',
    description:
      'Manage family tasks and chores. Use this tool for any request about ' +
      'adding tasks, completing tasks, listing open tasks, or getting a summary. ' +
      'Pass the user\'s message as-is in the "message" parameter.',
    parameters: Type.Object({
      message: Type.String({
        description: 'The user\'s natural language message about tasks',
      }),
    }),
    async execute(_id: string, params: { message: string }) {
      ensureNotion();
      const response = await handleMessage(params.message);
      return { content: [{ type: 'text', text: response }] };
    },
  });

  // ─── Heartbeat: weekly summary report ───
  api.registerTool({
    name: 'hausgeist_heartbeat',
    description:
      'Generate the weekly Hausgeist family report. Shows completed tasks, ' +
      'points, open items, and overdue alerts. Use when the user asks for ' +
      'a weekly report or family summary.',
    parameters: Type.Object({}),
    async execute() {
      ensureNotion();
      const report = await runWeeklyHeartbeat();
      return { content: [{ type: 'text', text: report }] };
    },
  });

  // ─── Daily check: evaluate rules and return alerts ───
  api.registerTool({
    name: 'hausgeist_daily_check',
    description:
      'Run the daily rules check. Returns any alerts about incomplete ' +
      'daily tasks or overdue recurring chores.',
    parameters: Type.Object({}),
    async execute() {
      ensureNotion();
      const alerts = await runDailyCheck();
      if (alerts.length === 0) {
        return { content: [{ type: 'text', text: 'No alerts — everything looks good! 👻' }] };
      }
      return { content: [{ type: 'text', text: alerts.join('\n\n') }] };
    },
  });
}
