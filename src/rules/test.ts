/**
 * Rules Engine Test
 * Run with: npx ts-node src/rules/test.ts
 */

import { initNotion } from '../notion';
import { RulesEngine } from './engine';
import { generateHeartbeat, formatHeartbeat } from './heartbeat';
import { runDailyCheck } from './scheduler';

async function main() {
  console.log('=== Hausgeist Rules Engine Tests ===\n');

  initNotion();

  // Test 1: Load rules from config
  console.log('1. Loading rules...');
  const engine = new RulesEngine();
  const rules = engine.getRules();
  console.log(`   Loaded ${rules.length} rules:`);
  for (const r of rules) {
    console.log(`   - [${r.category}] ${r.name}`);
  }

  // Test 2: Evaluate all rules
  console.log('\n2. Evaluating rules...');
  const results = await engine.evaluateAll();
  console.log(`   ${results.length} rule(s) triggered`);
  for (const r of results) {
    console.log(`   - ${r.rule.name}: ${r.message?.slice(0, 80)}...`);
  }

  // Test 3: Daily check
  console.log('\n3. Running daily check...');
  const dailyAlerts = await runDailyCheck();
  console.log(`   ${dailyAlerts.length} alert(s)`);
  for (const a of dailyAlerts) {
    console.log(`   - ${a}`);
  }

  // Test 4: Generate heartbeat
  console.log('\n4. Generating weekly heartbeat...');
  const report = await generateHeartbeat();
  console.log(`   Completed: ${report.choreSummary.completed}`);
  console.log(`   Open: ${report.openTasks.total}`);
  console.log(`   Overdue: ${report.openTasks.overdue}`);

  // Test 5: Format heartbeat
  console.log('\n5. Formatted heartbeat:\n');
  const message = formatHeartbeat(report);
  console.log(message);

  console.log('\n=== Done ===');
}

main().catch(console.error);
