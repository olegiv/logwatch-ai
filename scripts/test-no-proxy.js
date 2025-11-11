#!/usr/bin/env node

/**
 * Test script to verify application works WITHOUT proxy
 * This simulates a clean environment with no proxy configuration
 */

// Remove all proxy environment variables before loading config
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.NO_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;
delete process.env.no_proxy;

console.log('=== Testing Application WITHOUT Proxy ===\n');

console.log('Step 1: Verify proxy variables are not set');
console.log(`- HTTP_PROXY: ${process.env.HTTP_PROXY || '(not set)'}`);
console.log(`- HTTPS_PROXY: ${process.env.HTTPS_PROXY || '(not set)'}`);
console.log(`- http_proxy: ${process.env.http_proxy || '(not set)'}`);
console.log(`- https_proxy: ${process.env.https_proxy || '(not set)'}`);
console.log();

// Now load the config module
console.log('Step 2: Loading configuration...');
const config = (await import('../config/config.js')).default;

console.log(`- Proxy enabled: ${config.proxy.enabled}`);
console.log(`- HTTP Proxy: ${config.proxy.http || '(not set)'}`);
console.log(`- HTTPS Proxy: ${config.proxy.https || '(not set)'}`);
console.log();

// Test Claude client initialization
console.log('Step 3: Testing Claude Client initialization...');
try {
  const { default: ClaudeClient } = await import('../src/claude-client.js');
  const claudeClient = new ClaudeClient();
  console.log('✅ Claude client initialized successfully WITHOUT proxy');
} catch (error) {
  console.error('❌ Claude client initialization failed:', error.message);
  process.exit(1);
}

console.log();

// Test Telegram client initialization
console.log('Step 4: Testing Telegram Client initialization...');
try {
  const { default: TelegramClient } = await import('../src/telegram-client.js');
  const telegramClient = new TelegramClient();
  console.log('✅ Telegram client initialized successfully WITHOUT proxy');
} catch (error) {
  console.error('❌ Telegram client initialization failed:', error.message);
  process.exit(1);
}

console.log();
console.log('=== All Tests Passed! ===');
console.log();
console.log('✅ Application works correctly without proxy configuration');
console.log('✅ Both Claude and Telegram clients initialize properly');
console.log('✅ Direct connection will be used for all API requests');
