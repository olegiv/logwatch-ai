#!/usr/bin/env node

/**
 * Test script to verify logger console output behavior
 */

import { getLogger } from '../src/utils/logger.js';

console.log('Testing logger console output...\n');

// Create logger instance
const logger = getLogger(null, 'debug');

console.log('=== Testing all log levels ===\n');

console.log('1. DEBUG message (should show in dev, hidden in prod):');
logger.debug('This is a debug message');

console.log('\n2. INFO message (should show in dev, hidden in prod):');
logger.info('This is an info message');

console.log('\n3. WARN message (should ALWAYS show):');
logger.warn('This is a warning message');

console.log('\n4. ERROR message (should ALWAYS show):');
logger.error('This is an error message');

console.log('\n5. ERROR with stack trace (should ALWAYS show):');
const testError = new Error('Test error with stack trace');
logger.error('Failed to connect to API', testError);

console.log('\n=== Test complete ===');
console.log('\nExpected behavior:');
console.log('- In development (NODE_ENV != production): All messages visible');
console.log('- In production (NODE_ENV = production): Only WARN and ERROR visible');
console.log(`\nCurrent NODE_ENV: ${process.env.NODE_ENV || '(not set, treated as development)'}`);
