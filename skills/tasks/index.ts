/**
 * Hausgeist Tasks Skill
 * Main entry point — parses messages and routes to handlers
 */

import { initNotion } from '../../src/notion';
import { parseCommand, ParseError } from './parser';
import {
  handleAddTask,
  handleCompleteTask,
  handleListTasks,
  handleSummary,
} from './handlers';

const HELP_TEXT =
  "I can help with tasks! Try:\n" +
  '- "Add task for Ira: brush teeth"\n' +
  '- "Ira finished brushing teeth"\n' +
  '- "What\'s left for today?"\n' +
  '- "How did Ira do this week?"';

/**
 * Handle an incoming message. Returns a friendly response string.
 */
export async function handleMessage(message: string): Promise<string> {
  try {
    const cmd = parseCommand(message);

    switch (cmd.intent) {
      case 'add_task':
        return await handleAddTask(cmd);
      case 'complete_task':
        return await handleCompleteTask(cmd);
      case 'list_tasks':
        return await handleListTasks(cmd);
      case 'summary':
        return await handleSummary(cmd);
    }
  } catch (error) {
    if (error instanceof ParseError) {
      return `I didn't quite get that. ${HELP_TEXT}`;
    }
    const msg = error instanceof Error ? error.message : String(error);
    return `Something went wrong: ${msg}\n\nPlease try again. 👻`;
  }
}

// Interactive CLI mode for testing
if (require.main === module) {
  const readline = require('readline');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('');
  console.log('👻 Hausgeist Tasks Skill — Interactive Test');
  console.log('Type a command, or "quit" to exit.');
  console.log('');

  initNotion();

  function prompt() {
    rl.question('You: ', async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed || trimmed === 'quit' || trimmed === 'exit') {
        console.log('\nBye! 👻\n');
        rl.close();
        return;
      }

      const response = await handleMessage(trimmed);
      console.log(`\nHausgeist: ${response}\n`);
      prompt();
    });
  }

  prompt();
}
