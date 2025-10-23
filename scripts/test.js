#!/usr/bin/env node

/**
 * Test script for Logwatch AI Analyzer
 * Validates configuration and tests components
 */

import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import { Bot } from 'grammy';
import config from '../config/config.js';
import { getLogger } from '../src/utils/logger.js';
import Storage from '../src/storage.js';

const logger = getLogger(null, 'info');

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0
};

// Color codes for terminal
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

/**
 * Print test header
 */
function printHeader(title) {
  console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}\n`);
}

/**
 * Print test result
 */
function printResult(test, passed, message = '') {
  if (passed) {
    console.log(`${colors.green}✓${colors.reset} ${test}`);
    results.passed++;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${test}`);
    if (message) {
      console.log(`  ${colors.red}${message}${colors.reset}`);
    }
    results.failed++;
  }
}

/**
 * Print warning
 */
function printWarning(test, message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${test}`);
  console.log(`  ${colors.yellow}${message}${colors.reset}`);
  results.warnings++;
}

/**
 * Test configuration
 */
async function testConfiguration() {
  printHeader('Configuration Tests');

  try {
    // Test .env file exists
    const envExists = fs.existsSync('.env');
    printResult('.env file exists', envExists, 'Create .env from .env.template');

    if (envExists) {
      // Test API keys are set
      const hasClaudeKey = config.claude.apiKey && !config.claude.apiKey.includes('xxxxx');
      printResult('Claude API key configured', hasClaudeKey, 'Set ANTHROPIC_API_KEY in .env');

      const hasTelegramToken = config.telegram.botToken && !config.telegram.botToken.includes('xxxxx');
      printResult('Telegram bot token configured', hasTelegramToken, 'Set TELEGRAM_BOT_TOKEN in .env');

      const hasArchiveId = config.telegram.archiveChannelId &&
                           config.telegram.archiveChannelId !== '123456789' &&
                           config.telegram.archiveChannelId !== '-1001234567890';
      printResult('Telegram archive channel configured', hasArchiveId, 'Set TELEGRAM_CHANNEL_ARCHIVE_ID in .env');

      const hasAlertsId = config.telegram.alertsChannelId &&
                         config.telegram.alertsChannelId !== '-1009876543210';
      if (config.telegram.alertsChannelId) {
        printResult('Telegram alerts channel configured', hasAlertsId, 'Optional: Update TELEGRAM_CHANNEL_ALERTS_ID');
      } else {
        printWarning('Telegram alerts channel not configured', 'Optional: Set TELEGRAM_CHANNEL_ALERTS_ID for alerts');
      }
    }

    // Test logwatch path
    const logwatchPathSet = config.logwatch.outputPath !== '';
    printResult('Logwatch output path configured', logwatchPathSet);

    // Test directories exist
    const logsDir = fs.existsSync('logs');
    printResult('Logs directory exists', logsDir, 'Run: mkdir logs');

    const dataDir = fs.existsSync('data');
    printResult('Data directory exists', dataDir, 'Run: mkdir data');

  } catch (error) {
    printResult('Configuration validation', false, error.message);
  }
}

/**
 * Test file permissions
 */
async function testFilePermissions() {
  printHeader('File Permissions Tests');

  try {
    // Test .env permissions
    if (fs.existsSync('.env')) {
      const stats = fs.statSync('.env');
      const mode = (stats.mode & parseInt('777', 8)).toString(8);
      const secure = mode === '600';

      if (!secure) {
        printWarning('.env file permissions', `Permissions are ${mode}, should be 600. Run: chmod 600 .env`);
      } else {
        printResult('.env permissions secure (600)', true);
      }
    }

    // Test write access to logs directory
    if (fs.existsSync('logs')) {
      try {
        fs.accessSync('logs', fs.constants.W_OK);
        printResult('Logs directory writable', true);
      } catch (error) {
        printResult('Logs directory writable', false, error.message);
      }
    }

    // Test write access to data directory
    if (fs.existsSync('data')) {
      try {
        fs.accessSync('data', fs.constants.W_OK);
        printResult('Data directory writable', true);
      } catch (error) {
        printResult('Data directory writable', false, error.message);
      }
    }

  } catch (error) {
    printResult('File permissions check', false, error.message);
  }
}

/**
 * Test Claude API connection
 */
async function testClaudeAPI() {
  printHeader('Claude API Tests');

  try {
    if (!config.claude.apiKey || config.claude.apiKey.includes('xxxxx')) {
      printWarning('Claude API test skipped', 'API key not configured');
      return;
    }

    console.log('Testing Claude API connection...');

    const client = new Anthropic({
      apiKey: config.claude.apiKey,
      timeout: 30000
    });

    const response = await client.messages.create({
      model: config.claude.model,
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: 'Respond with OK if you can read this.'
        }
      ]
    });

    const success = response && response.content && response.content.length > 0;
    printResult('Claude API connection', success);

    if (success) {
      console.log(`  Model: ${config.claude.model}`);
      console.log(`  Response: ${response.content[0].text.substring(0, 50)}...`);
    }

  } catch (error) {
    printResult('Claude API connection', false, error.message);
  }
}

/**
 * Test Telegram bot connection
 */
async function testTelegramBot() {
  printHeader('Telegram Bot Tests');

  try {
    if (!config.telegram.botToken || config.telegram.botToken.includes('xxxxx')) {
      printWarning('Telegram test skipped', 'Bot token not configured');
      return;
    }

    console.log('Testing Telegram bot connection...');

    const bot = new Bot(config.telegram.botToken);

    // Get bot info
    const botInfo = await bot.api.getMe();
    printResult('Telegram bot connection', true);
    console.log(`  Bot username: @${botInfo.username}`);
    console.log(`  Bot name: ${botInfo.first_name}`);

    // Test sending message to archive channel
    console.log('Sending test message to archive channel...');
    await bot.api.sendMessage(
      config.telegram.archiveChannelId,
      '🧪 *Test Message - Archive*\n\nLogwatch AI Analyzer configuration test.\nThis is the archive channel for full reports.',
      { parse_mode: 'Markdown' }
    );
    printResult('Archive channel message sent', true);
    console.log(`  Message sent to archive channel: ${config.telegram.archiveChannelId}`);

    // Test sending message to alerts channel (if configured)
    if (config.telegram.alertsChannelId) {
      console.log('Sending test message to alerts channel...');
      await bot.api.sendMessage(
        config.telegram.alertsChannelId,
        '🚨 *Test Alert*\n\nLogwatch AI Analyzer configuration test.\nThis is the alerts channel for critical issues only.',
        { parse_mode: 'Markdown' }
      );
      printResult('Alerts channel message sent', true);
      console.log(`  Message sent to alerts channel: ${config.telegram.alertsChannelId}`);
    } else {
      printWarning('Alerts channel test skipped', 'TELEGRAM_CHANNEL_ALERTS_ID not configured (optional)');
    }

  } catch (error) {
    printResult('Telegram bot connection', false, error.message);
  }
}

/**
 * Test database operations
 */
async function testDatabase() {
  printHeader('Database Tests');

  try {
    if (!config.app.enableDatabase) {
      printWarning('Database tests skipped', 'Database disabled in configuration');
      return;
    }

    const storage = new Storage();

    // Test database initialization
    printResult('Database initialization', storage.db !== null);

    if (storage.db) {
      // Test save operation
      const testAnalysis = {
        summary: 'Test analysis',
        criticalIssues: ['Test issue'],
        warnings: [],
        recommendations: ['Test recommendation'],
        metrics: { testMetric: 123 }
      };

      const insertId = storage.saveSummary(testAnalysis);
      printResult('Database write operation', insertId !== null);

      // Test read operation
      const summaries = storage.getRecentSummaries(7);
      printResult('Database read operation', Array.isArray(summaries));

      // Test stats
      const stats = storage.getStats();
      printResult('Database statistics', stats !== null);

      if (stats) {
        console.log(`  Total entries: ${stats.totalEntries}`);
        console.log(`  Oldest: ${stats.oldestDate || 'N/A'}`);
        console.log(`  Newest: ${stats.newestDate || 'N/A'}`);
      }

      storage.close();
    }

  } catch (error) {
    printResult('Database operations', false, error.message);
  }
}

/**
 * Test logwatch availability
 */
async function testLogwatch() {
  printHeader('Logwatch Tests');

  try {
    // Check if logwatch is installed
    const { execSync } = await import('child_process');

    try {
      execSync('which logwatch', { stdio: 'pipe' });
      printResult('Logwatch installed', true);
    } catch (error) {
      printResult('Logwatch installed', false, 'Install with: sudo apt-get install logwatch');
      return;
    }

    // Check logwatch output file
    if (fs.existsSync(config.logwatch.outputPath)) {
      printResult('Logwatch output file exists', true);

      const stats = fs.statSync(config.logwatch.outputPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`  File size: ${sizeMB} MB`);

      const age = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
      console.log(`  Age: ${age.toFixed(1)} hours`);

      if (age > 24) {
        printWarning('Logwatch file age', 'File is older than 24 hours');
      }
    } else {
      printWarning('Logwatch output file', `Not found at ${config.logwatch.outputPath}`);
      console.log('  Generate with: sudo logwatch --output file --filename /tmp/logwatch-output.txt');
    }

  } catch (error) {
    printResult('Logwatch check', false, error.message);
  }
}

/**
 * Print summary
 */
function printSummary() {
  console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.blue}Test Summary${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}\n`);

  console.log(`${colors.green}Passed:${colors.reset}   ${results.passed}`);
  console.log(`${colors.red}Failed:${colors.reset}   ${results.failed}`);
  console.log(`${colors.yellow}Warnings:${colors.reset} ${results.warnings}`);

  console.log('');

  if (results.failed === 0 && results.warnings === 0) {
    console.log(`${colors.green}✓ All tests passed! System ready to use.${colors.reset}`);
  } else if (results.failed === 0) {
    console.log(`${colors.yellow}⚠ Tests passed with warnings. Review warnings above.${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Some tests failed. Fix errors above before running.${colors.reset}`);
  }

  console.log('');
}

/**
 * Main test function
 */
async function main() {
  console.log(`${colors.blue}
╔══════════════════════════════════════════════════╗
║   Logwatch AI Analyzer - Configuration Test     ║
╚══════════════════════════════════════════════════╝
${colors.reset}`);

  await testConfiguration();
  await testFilePermissions();
  await testLogwatch();
  await testClaudeAPI();
  await testTelegramBot();
  await testDatabase();

  printSummary();

  // Exit with error code if tests failed
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
main().catch((error) => {
  console.error(`${colors.red}Test execution failed:${colors.reset}`, error);
  process.exit(1);
});
