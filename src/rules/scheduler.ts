/**
 * Scheduler
 * Entry points for scheduled rule evaluation and heartbeat generation.
 * These functions are called by cron (or OpenClaw's scheduler).
 */

import { initNotion } from '../notion';
import { RulesEngine } from './engine';
import { generateHeartbeat, formatHeartbeat } from './heartbeat';
import { EvaluationResult } from './types';

/**
 * Run the daily evening check (6pm).
 * Evaluates daily chore rules and returns triggered alerts.
 */
export async function runDailyCheck(): Promise<string[]> {
  initNotion();
  const engine = new RulesEngine();
  const results = await engine.evaluateByCategory('chores');

  return results
    .filter((r) => r.triggered && r.message)
    .map((r) => r.message!);
}

/**
 * Run the weekly heartbeat (Sunday 9am).
 * Returns the formatted summary message.
 */
export async function runWeeklyHeartbeat(): Promise<string> {
  initNotion();
  const report = await generateHeartbeat();
  return formatHeartbeat(report);
}

/**
 * Run all rules and return triggered results.
 */
export async function runAllRules(): Promise<EvaluationResult[]> {
  initNotion();
  const engine = new RulesEngine();
  return engine.evaluateAll();
}
