#!/usr/bin/env node

/**
 * Test script to verify proxy integration with Claude and Telegram clients
 */

import config from '../config/config.js';
import { getLogger } from '../src/utils/logger.js';

const logger = getLogger();

console.log('=== Proxy Integration Test ===\n');

// Display current proxy configuration
console.log('Current Proxy Configuration:');
console.log(`- Enabled: ${config.proxy.enabled}`);
console.log(`- HTTP Proxy: ${config.proxy.http || '(not set)'}`);
console.log(`- HTTPS Proxy: ${config.proxy.https || '(not set)'}`);
console.log(`- No Proxy: ${config.proxy.noProxy || '(not set)'}`);
console.log();

// Test Claude client initialization
console.log('Testing Claude Client initialization...');
try {
  // Import dynamically to see initialization logs
  const { default: ClaudeClient } = await import('../src/claude-client.js');
  const claudeClient = new ClaudeClient();
  console.log('✅ Claude client initialized successfully');
} catch (error) {
  console.error('❌ Claude client initialization failed:', error.message);
}

console.log();

// Test Telegram client initialization
console.log('Testing Telegram Client initialization...');
try {
  // Import dynamically to see initialization logs
  const { default: TelegramClient } = await import('../src/telegram-client.js');
  const telegramClient = new TelegramClient();
  console.log('✅ Telegram client initialized successfully');
} catch (error) {
  console.error('❌ Telegram client initialization failed:', error.message);
}

console.log();
console.log('=== Test Complete ===');
console.log();

if (config.proxy.enabled) {
  const proxyUrl = config.proxy.https || config.proxy.http;
  console.log(`Note: All API requests will be routed through proxy: ${proxyUrl}`);
} else {
  console.log('Note: No proxy configured, using direct connection');
}
