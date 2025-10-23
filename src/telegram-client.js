import { Bot } from 'grammy';
import config from '../config/config.js';
import { getLogger } from './utils/logger.js';
import { format } from 'date-fns';
import os from 'os';

const logger = getLogger();

/**
 * Telegram bot client for sending analysis reports to multiple channels
 */
class TelegramClient {
  constructor() {
    this.bot = new Bot(config.telegram.botToken);
    this.archiveChannelId = config.telegram.archiveChannelId;
    this.alertsChannelId = config.telegram.alertsChannelId;
    this.maxMessageLength = config.telegram.maxMessageLength;
    this.retryDelay = config.telegram.retryDelay;
  }

  /**
   * Send analysis report to Telegram channels
   * @param {Object} analysis - Analysis object from Claude
   * @param {Object} stats - Execution statistics (optional)
   * @returns {Promise<void>}
   */
  async sendAnalysisReport(analysis, stats = null) {
    logger.info('Preparing Telegram messages');

    // Format the full report message
    const message = this.formatAnalysisMessage(analysis, stats);

    // Always send full report to archive channel
    await this.sendMessage(message, this.archiveChannelId, 'Archive');

    // Send to alerts channel if status is worse than "Good"
    if (this.alertsChannelId) {
      const statusWorseThanGood = ['Satisfactory', 'Bad', 'Awful'].includes(analysis.systemStatus);

      if (statusWorseThanGood) {
        logger.info(`System status is ${analysis.systemStatus}, sending to alerts channel`);
        await this.sendMessage(message, this.alertsChannelId, 'Alerts');
      } else {
        logger.info(`System status is ${analysis.systemStatus || 'Good'}, skipping alerts channel`);
      }
    }

    logger.info('Telegram messages sent successfully');
  }

  /**
   * Format analysis object into Telegram message
   * @param {Object} analysis - Analysis object
   * @param {Object} stats - Execution statistics (optional)
   * @returns {string} Formatted message
   */
  formatAnalysisMessage(analysis, stats = null) {
    const date = format(new Date(), 'yyyy-MM-dd');
    const time = format(new Date(), 'HH:mm:ss');
    const hostname = os.hostname();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Get system status emoji and color
    const statusInfo = this.getStatusInfo(analysis.systemStatus);

    let message = `🔍 *Logwatch Analysis Report*\n`;
    message += `🖥 Host: ${hostname}\n`;
    message += `📅 Date: ${date} ${time}\n`;
    message += `🌍 Timezone: ${timezone}\n`;
    message += `${statusInfo.emoji} *Status:* ${statusInfo.text}\n`;

    // Execution statistics
    if (stats) {
      message += `\n📋 *Execution Stats*\n`;
      message += `• Critical Issues: ${analysis.criticalIssues?.length || 0}\n`;
      message += `• Warnings: ${analysis.warnings?.length || 0}\n`;
      message += `• Recommendations: ${analysis.recommendations?.length || 0}\n`;
      if (stats.cost !== undefined) {
        message += `• Cost: $${stats.cost.toFixed(4)}\n`;
      }
      if (stats.duration !== undefined) {
        message += `• Duration: ${stats.duration.toFixed(2)}s\n`;
      }
      message += '\n';
    } else {
      message += '\n';
    }

    // Summary
    message += `📊 *Summary*\n`;
    message += `${this.escapeMarkdown(analysis.summary)}\n\n`;

    // Critical Issues
    if (analysis.criticalIssues && analysis.criticalIssues.length > 0) {
      message += `⚠️ *Critical Issues* (${analysis.criticalIssues.length})\n`;
      analysis.criticalIssues.forEach(issue => {
        message += `• ${this.escapeMarkdown(issue)}\n`;
      });
      message += '\n';
    }

    // Warnings
    if (analysis.warnings && analysis.warnings.length > 0) {
      message += `⚡ *Warnings* (${analysis.warnings.length})\n`;
      analysis.warnings.forEach(warning => {
        message += `• ${this.escapeMarkdown(warning)}\n`;
      });
      message += '\n';
    }

    // Recommendations
    if (analysis.recommendations && analysis.recommendations.length > 0) {
      message += `💡 *Recommendations*\n`;
      analysis.recommendations.forEach(rec => {
        message += `• ${this.escapeMarkdown(rec)}\n`;
      });
      message += '\n';
    }

    // Metrics
    if (analysis.metrics && Object.keys(analysis.metrics).length > 0) {
      message += `📈 *Key Metrics*\n`;
      for (const [key, value] of Object.entries(analysis.metrics)) {
        const formattedKey = this.formatMetricKey(key);
        message += `• ${formattedKey}: ${this.escapeMarkdown(String(value))}\n`;
      }
    }

    return message;
  }

  /**
   * Format metric key to readable format
   * @param {string} key - Metric key
   * @returns {string} Formatted key
   */
  formatMetricKey(key) {
    // Convert camelCase to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Get status emoji and text based on system status
   * @param {string} status - System status
   * @returns {Object} Status info with emoji and text
   */
  getStatusInfo(status) {
    const statusMap = {
      'Excellent': { emoji: '✅', text: 'Excellent' },
      'Good': { emoji: '🟢', text: 'Good' },
      'Satisfactory': { emoji: '🟡', text: 'Satisfactory' },
      'Bad': { emoji: '🟠', text: 'Bad' },
      'Awful': { emoji: '🔴', text: 'Awful' }
    };

    return statusMap[status] || { emoji: '❓', text: status || 'Unknown' };
  }

  /**
   * Escape markdown special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeMarkdown(text) {
    if (!text) return '';

    // Escape only the characters that need escaping in Telegram's basic Markdown mode
    // Basic Markdown only requires escaping: _ * [ ] `
    // Other characters like ( ) . + - etc. don't need escaping
    return text
      .replace(/\\/g, '\\\\')  // Escape backslash first to prevent double-escaping
      .replace(/([_*\[\]`])/g, '\\$1');  // Then escape Markdown special chars
  }

  /**
   * Send message to Telegram (with splitting if needed)
   * @param {string} message - Message to send
   * @param {string} channelId - Channel ID to send to
   * @param {string} channelName - Channel name for logging
   * @returns {Promise<void>}
   */
  async sendMessage(message, channelId, channelName = 'Channel') {
    logger.info(`Sending to ${channelName} channel (${channelId})`);

    // Check if message needs to be split
    if (message.length <= this.maxMessageLength) {
      await this.sendSingleMessage(message, channelId);
    } else {
      await this.sendSplitMessage(message, channelId);
    }
  }

  /**
   * Send a single message to Telegram
   * @param {string} message - Message to send
   * @param {string} channelId - Channel ID to send to
   * @returns {Promise<void>}
   */
  async sendSingleMessage(message, channelId) {
    try {
      await this.bot.api.sendMessage(channelId, message, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      logger.warn(`First Telegram send attempt failed: ${error.message}`);

      // Retry once after delay
      logger.info(`Retrying in ${this.retryDelay}ms...`);
      await this.sleep(this.retryDelay);

      try {
        await this.bot.api.sendMessage(channelId, message, {
          parse_mode: 'Markdown'
        });
      } catch (retryError) {
        logger.error('Telegram send failed after retry', retryError);
        throw retryError;
      }
    }
  }

  /**
   * Split and send long message
   * @param {string} message - Message to split and send
   * @param {string} channelId - Channel ID to send to
   * @returns {Promise<void>}
   */
  async sendSplitMessage(message, channelId) {
    logger.info(`Message too long (${message.length} chars), splitting...`);

    const parts = this.splitMessage(message);

    logger.info(`Sending ${parts.length} message parts`);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const partMessage = `[Part ${i + 1}/${parts.length}]\n\n${part}`;

      await this.sendSingleMessage(partMessage, channelId);

      // Small delay between messages to avoid rate limiting
      if (i < parts.length - 1) {
        await this.sleep(1000);
      }
    }
  }

  /**
   * Split message into chunks
   * @param {string} message - Message to split
   * @returns {Array<string>} Message chunks
   */
  splitMessage(message) {
    const parts = [];
    const lines = message.split('\n');
    let currentPart = '';

    for (const line of lines) {
      if (currentPart.length + line.length + 1 > this.maxMessageLength - 50) {
        // -50 for part indicator
        if (currentPart) {
          parts.push(currentPart);
          currentPart = '';
        }
      }
      currentPart += line + '\n';
    }

    if (currentPart) {
      parts.push(currentPart);
    }

    return parts;
  }

  /**
   * Send error notification (to archive channel)
   * @param {string} errorMessage - Error message
   * @returns {Promise<void>}
   */
  async sendError(errorMessage) {
    const message = `❌ *Logwatch Analyzer Error*\n\n${this.escapeMarkdown(errorMessage)}`;

    try {
      await this.sendMessage(message, this.archiveChannelId, 'Archive');
      logger.info('Error notification sent to Telegram');
    } catch (error) {
      logger.error('Failed to send error notification to Telegram', error);
    }
  }

  /**
   * Sleep for specified duration
   * @param {number} ms - Duration in milliseconds
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default TelegramClient;
