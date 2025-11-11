#!/usr/bin/env node

/**
 * Logwatch AI Analyzer
 * Main entry point for the analyzer
 */

import config from '../config/config.js';
import { getLogger } from './utils/logger.js';
import ClaudeClient from './claude-client.js';
import TelegramClient from './telegram-client.js';
import LogwatchReader from './logwatch-reader.js';
import Storage from './storage.js';

const logger = getLogger(null, config.app.logLevel);

/**
 * Main analysis function
 */
async function main() {
  const startTime = Date.now();

  try {
    logger.info('========================================');
    logger.info('Logwatch AI Analyzer - Starting');
    logger.info('========================================');

    // 1. Initialize components
    logger.info('Initializing components...');
    const claudeClient = new ClaudeClient();
    const telegramClient = new TelegramClient();
    const logwatchReader = new LogwatchReader();
    const storage = new Storage();

    // Wait for async database initialization
    if (storage.enabled) {
      await storage.initialize();
    }

    // 2. Read logwatch output
    logger.info('Reading logwatch output...');
    const logContent = await logwatchReader.readLogwatchOutput();

    // 3. Validate that we have content
    if (!logContent) {
      throw new Error(
        `Logwatch output file not found or empty: ${config.logwatch.outputPath}\n` +
        'Please ensure the logwatch cron job is configured correctly.\n' +
        'See docs/CRON_SETUP.md for installation instructions, or run:\n' +
        '  sudo scripts/generate-logwatch.sh'
      );
    }

    // 4. Validate content
    if (!logwatchReader.validateContent(logContent)) {
      logger.warn('Logwatch content validation failed, but continuing anyway');
    }

    // 5. Check if file is recent
    if (!logwatchReader.isFileRecent()) {
      logger.warn('Logwatch file is older than 24 hours - may contain stale data');
    }

    // 6. Get historical context from database
    logger.info('Retrieving historical context...');
    const historicalContext = storage.getHistoricalContext(7);

    if (historicalContext) {
      logger.info('Using historical context from last 7 days');
    } else {
      logger.info('No historical context available (first run or database disabled)');
    }

    // 7. Analyze with Claude
    logger.info('Analyzing logwatch output with Claude AI...');
    const { analysis, stats } = await claudeClient.analyzeLogwatch(logContent, historicalContext);

    logger.info('Analysis completed:');
    logger.info(`  - Critical Issues: ${analysis.criticalIssues?.length || 0}`);
    logger.info(`  - Warnings: ${analysis.warnings?.length || 0}`);
    logger.info(`  - Recommendations: ${analysis.recommendations?.length || 0}`);

    // 8. Save analysis to database
    if (storage.enabled) {
      logger.info('Saving analysis to database...');
      const insertId = storage.saveSummary(analysis);

      if (insertId) {
        // Cleanup old entries
        const deleted = storage.cleanup(90);
        if (deleted > 0) {
          logger.info(`Cleaned up ${deleted} old database entries`);
        }
      }
    }

    // 9. Send report via Telegram
    logger.info('Sending report via Telegram...');
    const totalDuration = (Date.now() - startTime) / 1000;
    const executionStats = {
      ...stats,
      duration: totalDuration // Use total execution time
    };
    await telegramClient.sendAnalysisReport(analysis, executionStats);

    // 10. Log completion
    const duration = totalDuration.toFixed(2);
    logger.info('========================================');
    logger.info(`Analysis completed successfully in ${duration}s`);
    logger.info('========================================');

    // Close database connection
    storage.close();

    process.exit(0);

  } catch (error) {
    logger.error('Analysis failed', error);

    // Try to send error notification to Telegram
    try {
      const telegramClient = new TelegramClient();
      await telegramClient.sendError(`Analysis failed: ${error.message}`);
    } catch (telegramError) {
      logger.error('Failed to send error notification', telegramError);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.error(`Analysis failed after ${duration}s`);

    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', reason);
  process.exit(1);
});

// Run main function
main();
