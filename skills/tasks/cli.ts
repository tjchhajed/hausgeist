#!/usr/bin/env npx ts-node

/**
 * Hausgeist CLI — single-command entry point for OpenClaw
 *
 * Usage:
 *   npx ts-node skills/tasks/cli.ts task "Add task for Ira: brush teeth"
 *   npx ts-node skills/tasks/cli.ts heartbeat
 *   npx ts-node skills/tasks/cli.ts daily-check
 */

import { initNotion } from '../../src/notion';
import { handleMessage } from './index';
import { runWeeklyHeartbeat, runDailyCheck } from '../../src/rules';

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const message = rest.join(' ');

  initNotion();

  switch (command) {
    case 'task':
      if (!message) {
        console.error('Usage: cli.ts task "message"');
        process.exit(1);
      }
      console.log(await handleMessage(message));
      break;

    case 'heartbeat':
      console.log(await runWeeklyHeartbeat());
      break;

    case 'daily-check': {
      const alerts = await runDailyCheck();
      console.log(alerts.length > 0 ? alerts.join('\n\n') : 'No alerts — everything looks good! 👻');
      break;
    }

    default:
      console.error('Unknown command. Use: task, heartbeat, or daily-check');
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
