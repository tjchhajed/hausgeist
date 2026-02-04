/**
 * Hausgeist v0.1 — Full End-to-End Test Suite
 */

import { initNotion, testConnection } from '../src/notion/client';
import { createTask, getTask, completeTask, updateTaskStatus, deleteTask } from '../src/notion/tasks';
import { getOpenTasks, getTasksForOwner, getTasksForToday, getWeeklyStats, getOverdueTasks } from '../src/notion/queries';
import { parseCommand, ParseError } from '../skills/tasks/parser';
import { handleMessage } from '../skills/tasks/index';
import { RulesEngine } from '../src/rules/engine';
import { generateHeartbeat, formatHeartbeat } from '../src/rules/heartbeat';
import { runDailyCheck } from '../src/rules/scheduler';
import { Item } from '../src/notion/types';

let passed = 0;
let failed = 0;
const failures: string[] = [];
// Track IDs of items we create so we can clean up
const createdIds: string[] = [];

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`   ✅ ${label}`);
    passed++;
  } else {
    const msg = detail ? `${label} — ${detail}` : label;
    console.log(`   ❌ ${msg}`);
    failed++;
    failures.push(msg);
  }
}

// ──────────────────────────────────────────────
// TEST 1 — Notion Connection & Existing Data
// ──────────────────────────────────────────────
async function test1_notionSetup() {
  console.log('\n═══════════════════════════════════════');
  console.log('TEST 1: Notion Connection & Data');
  console.log('═══════════════════════════════════════\n');

  // 1a. Connection
  try {
    initNotion();
    await testConnection();
    assert('Notion connection successful', true);
  } catch (e) {
    assert('Notion connection successful', false, String(e));
    throw new Error('Cannot continue without Notion connection');
  }

  // 1b. Sample chores exist
  const iraTasks = await getTasksForOwner('Ira');
  assert('Ira has tasks in Notion', iraTasks.length > 0, `found ${iraTasks.length}`);

  const sampleTitles = iraTasks.map(t => t.title.toLowerCase());
  assert(
    'Sample chore "Brush teeth (morning)" exists',
    sampleTitles.some(t => t.includes('brush teeth')),
  );
  assert(
    'Sample chore "Tidy toys" exists',
    sampleTitles.some(t => t.includes('tidy toys')),
  );
  assert(
    'Sample chore "Help set table" exists',
    sampleTitles.some(t => t.includes('help set table')),
  );

  // 1c. Check a task has correct properties
  const brushTeeth = iraTasks.find(t => t.title.toLowerCase().includes('brush teeth'));
  if (brushTeeth) {
    assert('Task has type "chore"', brushTeeth.type === 'chore', `got "${brushTeeth.type}"`);
    assert('Task has owner "Ira"', brushTeeth.owner === 'Ira', `got "${brushTeeth.owner}"`);
    assert('Task has a status', typeof brushTeeth.status === 'string' && brushTeeth.status.length > 0);
    assert('Task has createdAt', brushTeeth.createdAt instanceof Date);
    assert('Task has updatedAt', brushTeeth.updatedAt instanceof Date);
  }

  // 1d. Open tasks query works
  const openTasks = await getOpenTasks();
  assert('getOpenTasks() returns results', openTasks.length > 0, `found ${openTasks.length}`);
  assert('All open tasks are not done', openTasks.every(t => t.status !== 'done'));
}

// ──────────────────────────────────────────────
// TEST 2 — Notion CRUD
// ──────────────────────────────────────────────
async function test2_notionCrud() {
  console.log('\n═══════════════════════════════════════');
  console.log('TEST 2: Notion CRUD Operations');
  console.log('═══════════════════════════════════════\n');

  // 2a. Create
  console.log('   Creating "Test task for Papa"...');
  const created = await createTask({ title: 'Test task for Papa', owner: 'Papa', points: 10 });
  createdIds.push(created.id);
  assert('createTask() returns an item', !!created.id);
  assert('Title matches', created.title === 'Test task for Papa', `got "${created.title}"`);
  assert('Owner is Papa', created.owner === 'Papa', `got "${created.owner}"`);
  assert('Status is "todo"', created.status === 'todo', `got "${created.status}"`);
  assert('Points is 10', created.points === 10, `got ${created.points}`);

  // 2b. Read back
  console.log('   Reading it back...');
  const fetched = await getTask(created.id);
  assert('getTask() returns the task', fetched !== null);
  assert('Fetched title matches', fetched?.title === 'Test task for Papa');
  assert('Fetched ID matches', fetched?.id === created.id);

  // 2c. Update status → doing
  console.log('   Updating status to "doing"...');
  const updated = await updateTaskStatus(created.id, 'doing');
  assert('Status changed to "doing"', updated.status === 'doing', `got "${updated.status}"`);

  // 2d. Complete
  console.log('   Completing task...');
  const completed = await completeTask(created.id);
  assert('Status changed to "done"', completed.status === 'done', `got "${completed.status}"`);

  // 2e. Query open tasks — completed task should not appear
  const openTasks = await getOpenTasks();
  const stillThere = openTasks.find(t => t.id === created.id);
  assert('Completed task not in open tasks', !stillThere);

  // 2f. Query for specific owner
  const papaTasks = await getTasksForOwner('Papa');
  const papaTask = papaTasks.find(t => t.id === created.id);
  assert('Task appears in Papa\'s tasks', !!papaTask);

  // 2g. Delete (archive)
  console.log('   Deleting task...');
  await deleteTask(created.id);
  const deleted = await getTask(created.id);
  // Notion archived pages may still be retrievable but let's just verify no error
  assert('deleteTask() completed without error', true);
}

// ──────────────────────────────────────────────
// TEST 3 — Task Skill Parser
// ──────────────────────────────────────────────
async function test3_parser() {
  console.log('\n═══════════════════════════════════════');
  console.log('TEST 3: Task Skill Parser');
  console.log('═══════════════════════════════════════\n');

  // 3a. Add task
  const add = parseCommand('Add task for Ira: clean room');
  console.log(`   "Add task for Ira: clean room"`);
  console.log(`     → intent=${add.intent} owner=${add.owner} title=${add.title}`);
  assert('Intent is add_task', add.intent === 'add_task');
  assert('Owner is Ira', add.owner === 'Ira', `got "${add.owner}"`);
  assert('Title is "clean room"', add.title === 'clean room', `got "${add.title}"`);

  // 3b. Complete task
  const comp = parseCommand('Ira finished brushing teeth');
  console.log(`   "Ira finished brushing teeth"`);
  console.log(`     → intent=${comp.intent} owner=${comp.owner} taskId=${comp.taskIdentifier}`);
  assert('Intent is complete_task', comp.intent === 'complete_task');
  assert('Owner is Ira', comp.owner === 'Ira', `got "${comp.owner}"`);
  assert('Task identifier is "brushing teeth"', comp.taskIdentifier === 'brushing teeth', `got "${comp.taskIdentifier}"`);

  // 3c. List tasks
  const list = parseCommand("What's left for today?");
  console.log(`   "What's left for today?"`);
  console.log(`     → intent=${list.intent} timeframe=${list.timeframe}`);
  assert('Intent is list_tasks', list.intent === 'list_tasks');
  assert('Timeframe is "today"', list.timeframe === 'today', `got "${list.timeframe}"`);

  // 3d. Summary
  const summary = parseCommand('How did Ira do this week?');
  console.log(`   "How did Ira do this week?"`);
  console.log(`     → intent=${summary.intent} owner=${summary.owner} timeframe=${summary.timeframe}`);
  assert('Intent is summary', summary.intent === 'summary');
  assert('Owner is Ira', summary.owner === 'Ira', `got "${summary.owner}"`);
  assert('Timeframe is "week"', summary.timeframe === 'week', `got "${summary.timeframe}"`);

  // 3e. Additional patterns
  const needsTo = parseCommand('Ira needs to tidy her toys');
  assert('"Ira needs to..." → add_task', needsTo.intent === 'add_task');
  assert('Extracts title from "needs to" pattern', needsTo.title === 'tidy her toys', `got "${needsTo.title}"`);

  const markDone = parseCommand('Mark tidy toys as done');
  assert('"Mark X as done" → complete_task', markDone.intent === 'complete_task');
  assert('Extracts "tidy toys"', markDone.taskIdentifier === 'tidy toys', `got "${markDone.taskIdentifier}"`);

  const listIra = parseCommand("What are Ira's tasks?");
  assert('"What are Ira\'s tasks?" → list_tasks', listIra.intent === 'list_tasks');
  assert('Detects Ira as owner', listIra.owner === 'Ira', `got "${listIra.owner}"`);

  const weeklyReport = parseCommand('Weekly report');
  assert('"Weekly report" → summary', weeklyReport.intent === 'summary');

  // 3f. Unknown command
  let parseError = false;
  try {
    parseCommand('Hello how are you');
  } catch (e) {
    parseError = e instanceof ParseError;
  }
  assert('Unrecognized input throws ParseError', parseError);
}

// ──────────────────────────────────────────────
// TEST 4 — Task Skill Handlers
// ──────────────────────────────────────────────
async function test4_handlers() {
  console.log('\n═══════════════════════════════════════');
  console.log('TEST 4: Task Skill Handlers (live)');
  console.log('═══════════════════════════════════════\n');

  // 4a. Add a task via handler
  console.log('   Sending: "Add task for Papa: take out trash"');
  const addResponse = await handleMessage('Add task for Papa: take out trash');
  console.log(`   Response: ${addResponse}`);
  assert('Add response mentions the task', addResponse.includes('take out trash'));
  assert('Add response mentions Papa', addResponse.includes('Papa'));
  assert('Add response is friendly (has emoji)', addResponse.includes('👻'));

  // 4b. List tasks
  console.log('\n   Sending: "What\'s left?"');
  const listResponse = await handleMessage("What's left?");
  console.log(`   Response: ${listResponse.slice(0, 200)}...`);
  assert('List response contains tasks', listResponse.includes('**'));
  assert('List response shows "take out trash"', listResponse.includes('take out trash'));

  // 4c. Complete task via handler
  console.log('\n   Sending: "Papa finished take out trash"');
  const completeResponse = await handleMessage('Papa finished take out trash');
  console.log(`   Response: ${completeResponse}`);
  assert('Complete response confirms done', completeResponse.includes('✅'));
  assert('Complete response mentions points', completeResponse.includes('points'));

  // 4d. Summary
  console.log('\n   Sending: "How did we do this week?"');
  const summaryResponse = await handleMessage('How did we do this week?');
  console.log(`   Response: ${summaryResponse.slice(0, 200)}...`);
  assert('Summary response has a header', summaryResponse.includes('Weekly Report') || summaryResponse.includes('week'));

  // 4e. Unrecognized input
  console.log('\n   Sending: "Hello there"');
  const unknownResponse = await handleMessage('Hello there');
  console.log(`   Response: ${unknownResponse}`);
  assert('Unrecognized input gives help text', unknownResponse.includes('Add task') || unknownResponse.includes('Try'));

  // 4f. Missing info
  console.log('\n   Sending: "Add task"');
  const missingResponse = await handleMessage('Add task');
  console.log(`   Response: ${missingResponse}`);
  assert('Missing title gives guidance', missingResponse.includes('?') || missingResponse.includes('Try'));

  // Clean up — find and delete "take out trash"
  const papaTasks = await getTasksForOwner('Papa');
  for (const t of papaTasks) {
    if (t.title === 'take out trash') {
      await deleteTask(t.id);
    }
  }
}

// ──────────────────────────────────────────────
// TEST 5 — Rules Engine
// ──────────────────────────────────────────────
async function test5_rulesEngine() {
  console.log('\n═══════════════════════════════════════');
  console.log('TEST 5: Rules Engine');
  console.log('═══════════════════════════════════════\n');

  // 5a. Load rules
  const engine = new RulesEngine();
  const rules = engine.getRules();
  console.log(`   Loaded ${rules.length} rules from config/rules.yaml`);
  assert('Rules loaded from YAML', rules.length > 0);
  assert('Has chore rules', rules.some(r => r.category === 'chores'));
  assert('Has inventory rules', rules.some(r => r.category === 'inventory'));
  assert('Has document rules', rules.some(r => r.category === 'documents'));
  assert('Has suggestion rules', rules.some(r => r.category === 'suggestions'));

  // 5b. Rule structure
  const choreRule = rules.find(r => r.name === 'Daily chores incomplete');
  assert('"Daily chores incomplete" rule exists', !!choreRule);
  if (choreRule) {
    assert('Has a schedule', !!choreRule.schedule);
    assert('Has trigger with frequency', choreRule.trigger?.frequency === 'daily');
    assert('Action type is "remind"', choreRule.action.type === 'remind');
    assert('Action has message template', choreRule.action.message.includes('{{'));
  }

  // 5c. Evaluate all rules
  const results = await engine.evaluateAll();
  console.log(`   ${results.length} rule(s) triggered`);
  assert('evaluateAll() returns array', Array.isArray(results));
  for (const r of results) {
    console.log(`   → ${r.rule.name}: ${r.message?.slice(0, 60)}...`);
  }

  // 5d. Evaluate by category
  const choreResults = await engine.evaluateByCategory('chores');
  assert('evaluateByCategory("chores") returns array', Array.isArray(choreResults));

  // 5e. Daily check
  const dailyAlerts = await runDailyCheck();
  assert('runDailyCheck() returns array', Array.isArray(dailyAlerts));
  console.log(`   Daily alerts: ${dailyAlerts.length}`);
}

// ──────────────────────────────────────────────
// TEST 6 — Weekly Heartbeat
// ──────────────────────────────────────────────
async function test6_heartbeat() {
  console.log('\n═══════════════════════════════════════');
  console.log('TEST 6: Weekly Heartbeat');
  console.log('═══════════════════════════════════════\n');

  // 6a. Generate report
  const report = await generateHeartbeat();
  assert('Report has choreSummary', typeof report.choreSummary === 'object');
  assert('Report has choreSummary.completed (number)', typeof report.choreSummary.completed === 'number');
  assert('Report has choreSummary.totalPoints (number)', typeof report.choreSummary.totalPoints === 'number');
  assert('Report has choreSummary.byOwner', typeof report.choreSummary.byOwner === 'object');
  assert('Report has openTasks.total (number)', typeof report.openTasks.total === 'number');
  assert('Report has openTasks.overdue (number)', typeof report.openTasks.overdue === 'number');
  assert('Report has inventoryAlerts (array)', Array.isArray(report.inventoryAlerts));
  assert('Report has documentAlerts (array)', Array.isArray(report.documentAlerts));

  console.log(`   Completed: ${report.choreSummary.completed}`);
  console.log(`   Points: ${report.choreSummary.totalPoints}`);
  console.log(`   Open: ${report.openTasks.total}`);
  console.log(`   Overdue: ${report.openTasks.overdue}`);
  console.log(`   Top: ${report.choreSummary.topPerformer || 'n/a'}`);

  // 6b. Format message
  const message = formatHeartbeat(report);
  assert('Formatted message is a string', typeof message === 'string');
  assert('Message has header', message.includes('Hausgeist Weekly Report'));
  assert('Message has chores section', message.includes('Chores'));
  assert('Message has open section', message.includes('Still Open'));
  assert('Message has closing', message.includes('Have a great week'));

  console.log('\n   --- Formatted Heartbeat ---');
  console.log(message);
  console.log('   --- End ---');
}

// ──────────────────────────────────────────────
// TEST 7 — Full Integration Flow
// ──────────────────────────────────────────────
async function test7_integration() {
  console.log('\n═══════════════════════════════════════');
  console.log('TEST 7: Full Integration Flow');
  console.log('═══════════════════════════════════════\n');

  const input = 'Add task for Ira: water the plants';
  console.log(`   User sends: "${input}"\n`);

  // Step 1: Parse
  console.log('   Step 1 — Parse');
  const cmd = parseCommand(input);
  console.log(`     intent: ${cmd.intent}`);
  console.log(`     owner: ${cmd.owner}`);
  console.log(`     title: ${cmd.title}`);
  assert('Parsed as add_task', cmd.intent === 'add_task');
  assert('Owner extracted as Ira', cmd.owner === 'Ira');
  assert('Title extracted as "water the plants"', cmd.title === 'water the plants');

  // Step 2: Handler → Notion
  console.log('\n   Step 2 — Handler calls Notion createTask()');
  const response = await handleMessage(input);
  console.log(`     Response: ${response}`);
  assert('Handler returns success message', response.includes('water the plants'));

  // Step 3: Verify in Notion
  console.log('\n   Step 3 — Verify task exists in Notion');
  const iraTasks = await getOpenTasks('Ira');
  const created = iraTasks.find(t => t.title === 'water the plants');
  assert('Task exists in Notion', !!created);
  if (created) {
    assert('Task is a chore', created.type === 'chore');
    assert('Task status is todo', created.status === 'todo');
    assert('Task owner is Ira', created.owner === 'Ira');
    createdIds.push(created.id);
  }

  // Step 4: Complete it
  console.log('\n   Step 4 — Complete task via handler');
  const completeInput = 'Ira finished water the plants';
  console.log(`   User sends: "${completeInput}"`);
  const completeCmd = parseCommand(completeInput);
  console.log(`     intent: ${completeCmd.intent}`);
  console.log(`     taskIdentifier: ${completeCmd.taskIdentifier}`);
  const completeResponse = await handleMessage(completeInput);
  console.log(`     Response: ${completeResponse}`);
  assert('Complete response has ✅', completeResponse.includes('✅'));
  assert('Complete response mentions points', completeResponse.includes('points'));

  // Step 5: Verify completion
  console.log('\n   Step 5 — Verify task is done in Notion');
  if (created) {
    const after = await getTask(created.id);
    assert('Task status is now "done"', after?.status === 'done', `got "${after?.status}"`);
  }

  // Step 6: Heartbeat includes it
  console.log('\n   Step 6 — Heartbeat reflects completed task');
  const report = await generateHeartbeat();
  const completedTitles = report.choreSummary.byOwner['Ira'];
  assert('Heartbeat shows Ira has completions', !!completedTitles && completedTitles.count > 0);
}

// ──────────────────────────────────────────────
// Cleanup & Summary
// ──────────────────────────────────────────────
async function cleanup() {
  console.log('\n   Cleaning up test data...');
  for (const id of createdIds) {
    try { await deleteTask(id); } catch {}
  }
  // Also clean up any stray test tasks
  const allTasks = await getOpenTasks();
  for (const t of allTasks) {
    if (['water the plants', 'Test task for Papa', 'Test task from Hausgeist', 'feed the fish', 'take out trash'].includes(t.title)) {
      try { await deleteTask(t.id); } catch {}
    }
  }
  console.log('   Done.');
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   👻 Hausgeist v0.1 — E2E Test Suite     ║');
  console.log('╚══════════════════════════════════════════╝');

  try {
    await test1_notionSetup();
    await test2_notionCrud();
    await test3_parser();
    await test4_handlers();
    await test5_rulesEngine();
    await test6_heartbeat();
    await test7_integration();
  } catch (e) {
    console.error('\n💥 Fatal error:', e);
    failed++;
    failures.push(`Fatal: ${e}`);
  }

  await cleanup();

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║              RESULTS                     ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Total:    ${passed + failed}\n`);

  if (failures.length > 0) {
    console.log('   Failures:');
    for (const f of failures) {
      console.log(`   - ${f}`);
    }
    console.log('');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
