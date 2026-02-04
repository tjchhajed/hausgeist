#!/usr/bin/env npx ts-node

/**
 * Notion Setup CLI
 * Creates the Hausgeist database with all properties
 *
 * Usage:
 *   npx ts-node scripts/setup-notion.ts              # Create database only
 *   npx ts-node scripts/setup-notion.ts --samples    # Create with sample data
 */

import { setup } from '../src/notion/setup';

async function main() {
  const args = process.argv.slice(2);
  const withSamples = args.includes('--samples') || args.includes('-s');

  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║     👻 Hausgeist Notion Setup        ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');

  try {
    const result = await setup({
      withSamples,
      updateEnv: true,
    });

    console.log('');
    console.log('════════════════════════════════════════');
    console.log('✅ Setup complete!');
    console.log('');
    console.log(`Database ID: ${result.databaseId}`);
    console.log(`Database URL: ${result.databaseUrl}`);
    if (result.samplesCreated) {
      console.log(`Sample items: ${result.samplesCreated}`);
    }
    console.log('');
    console.log('Your .env file has been updated.');
    console.log('You can now run: npm run test:notion');
    console.log('════════════════════════════════════════');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ Setup failed:', error instanceof Error ? error.message : error);
    console.error('');
    process.exit(1);
  }
}

main();
