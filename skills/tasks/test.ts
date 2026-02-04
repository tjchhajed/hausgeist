/**
 * Tasks Skill Test
 * Run with: npx ts-node skills/tasks/test.ts
 */

import { initNotion } from '../../src/notion';
import { parseCommand } from './parser';
import { handleMessage } from './index';

async function testParser() {
  console.log('=== Parser Tests ===\n');

  const cases = [
    'Add task for Ira: brush teeth',
    'Ira needs to tidy her toys',
    'Create chore for Family: take out trash',
    'Ira finished brushing teeth',
    'Mark tidy toys as done',
    "What's left for today?",
    "What are Ira's tasks?",
    'Show open chores',
    'How did Ira do this week?',
    'Weekly report',
  ];

  for (const input of cases) {
    try {
      const cmd = parseCommand(input);
      console.log(`"${input}"`);
      console.log(`  → intent: ${cmd.intent}, owner: ${cmd.owner || '-'}, title/id: ${cmd.title || cmd.taskIdentifier || '-'}`);
    } catch (e) {
      console.log(`"${input}"`);
      console.log(`  → PARSE ERROR`);
    }
  }
}

async function testHandlers() {
  console.log('\n=== Handler Tests (live Notion) ===\n');

  initNotion();

  const messages = [
    'Add task for Ira: feed the fish',
    "What's left?",
    'Ira finished feed the fish',
    'How did we do this week?',
  ];

  for (const msg of messages) {
    console.log(`You: ${msg}`);
    const response = await handleMessage(msg);
    console.log(`Hausgeist: ${response}`);
    console.log('');
  }
}

async function main() {
  await testParser();
  await testHandlers();
  console.log('=== Done ===');
}

main().catch(console.error);
