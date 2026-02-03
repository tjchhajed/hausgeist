/**
 * Hausgeist - Family Operating System
 * Main entry point
 */

export * from './notion';

// Initialize on import if running directly
if (require.main === module) {
  const { initNotion, testConnection } = require('./notion');

  console.log('Hausgeist starting...');
  initNotion();
  testConnection()
    .then(() => console.log('Ready!'))
    .catch((err: Error) => console.error('Failed:', err.message));
}
