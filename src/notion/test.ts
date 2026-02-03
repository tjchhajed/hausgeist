/**
 * Notion Integration Test
 * Run with: npx ts-node src/notion/test.ts
 */

import {
  initNotion,
  testConnection,
  createTask,
  getOpenTasks,
  getTasksForOwner,
  getWeeklyStats,
} from './index';

async function runTests() {
  console.log('=== Hausgeist Notion Tests ===\n');

  // Test 1: Initialize and connect
  console.log('1. Testing connection...');
  try {
    initNotion();
    await testConnection();
    console.log('   Connection successful!\n');
  } catch (error) {
    console.error('   Connection failed:', error);
    process.exit(1);
  }

  // Test 2: Create a task
  console.log('2. Creating test task...');
  try {
    const task = await createTask({
      title: 'Test task from Hausgeist',
      owner: 'Ira',
      points: 5,
    });
    console.log('   Created task:', task.title);
    console.log('   ID:', task.id);
    console.log('   Status:', task.status);
    console.log('');
  } catch (error) {
    console.error('   Create failed:', error);
  }

  // Test 3: Get open tasks
  console.log('3. Getting open tasks...');
  try {
    const tasks = await getOpenTasks();
    console.log(`   Found ${tasks.length} open task(s)`);
    tasks.slice(0, 3).forEach((t) => {
      console.log(`   - ${t.title} (${t.owner})`);
    });
    console.log('');
  } catch (error) {
    console.error('   Query failed:', error);
  }

  // Test 4: Get tasks for specific owner
  console.log('4. Getting tasks for Ira...');
  try {
    const tasks = await getTasksForOwner('Ira');
    console.log(`   Found ${tasks.length} task(s) for Ira`);
    tasks.slice(0, 3).forEach((t) => {
      console.log(`   - ${t.title} [${t.status}]`);
    });
    console.log('');
  } catch (error) {
    console.error('   Query failed:', error);
  }

  // Test 5: Weekly stats
  console.log('5. Getting weekly stats...');
  try {
    const stats = await getWeeklyStats();
    console.log(`   Completed this week: ${stats.completed}`);
    console.log(`   Total points: ${stats.totalPoints}`);
    console.log('');
  } catch (error) {
    console.error('   Stats failed:', error);
  }

  console.log('=== Tests complete ===');
}

runTests().catch(console.error);
