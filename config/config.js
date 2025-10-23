import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

/**
 * Application configuration
 * Loads and validates all required environment variables
 */
class Config {
  constructor() {
    this.claude = {
      apiKey: this.getRequired('ANTHROPIC_API_KEY'),
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      maxTokens: 8000,
      timeout: 120000, // 120 seconds
      maxRetries: 3
    };

    this.telegram = {
      botToken: this.getRequired('TELEGRAM_BOT_TOKEN'),
      archiveChannelId: this.getRequired('TELEGRAM_CHANNEL_ARCHIVE_ID'),
      alertsChannelId: process.env.TELEGRAM_CHANNEL_ALERTS_ID || null,
      maxMessageLength: 4096,
      retryDelay: 5000 // 5 seconds
    };

    this.logwatch = {
      outputPath: process.env.LOGWATCH_OUTPUT_PATH || '/tmp/logwatch-output.txt',
      maxSizeMB: parseInt(process.env.MAX_LOG_SIZE_MB) || 10
    };

    this.app = {
      nodeEnv: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || 'info',
      enableDatabase: process.env.ENABLE_DATABASE === 'true',
      databasePath: process.env.DATABASE_PATH || join(__dirname, '..', 'data', 'summaries.db'),
      logsPath: join(__dirname, '..', 'logs'),
      dataPath: join(__dirname, '..', 'data')
    };

    this.validate();
  }

  /**
   * Get required environment variable or throw error
   * @param {string} key - Environment variable name
   * @returns {string} Environment variable value
   */
  getRequired(key) {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  /**
   * Validate configuration
   * @throws {Error} If configuration is invalid
   */
  validate() {
    // Validate Claude API key format
    if (!this.claude.apiKey.startsWith('sk-ant-')) {
      throw new Error('Invalid ANTHROPIC_API_KEY format');
    }

    // Validate Telegram bot token format
    if (!this.telegram.botToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
      throw new Error('Invalid TELEGRAM_BOT_TOKEN format');
    }

    // Validate archive channel ID is numeric (channels start with -100)
    if (!this.telegram.archiveChannelId.match(/^-?\d+$/)) {
      throw new Error('Invalid TELEGRAM_CHANNEL_ARCHIVE_ID format (must be numeric, channels start with -100)');
    }

    // Validate alerts channel ID if provided
    if (this.telegram.alertsChannelId && !this.telegram.alertsChannelId.match(/^-?\d+$/)) {
      throw new Error('Invalid TELEGRAM_CHANNEL_ALERTS_ID format (must be numeric, channels start with -100)');
    }

    // Validate max log size
    if (this.logwatch.maxSizeMB < 1 || this.logwatch.maxSizeMB > 100) {
      throw new Error('MAX_LOG_SIZE_MB must be between 1 and 100');
    }
  }

  /**
   * Check if running in production mode
   * @returns {boolean}
   */
  isProduction() {
    return this.app.nodeEnv === 'production';
  }

  /**
   * Check if running in development mode
   * @returns {boolean}
   */
  isDevelopment() {
    return this.app.nodeEnv === 'development';
  }
}

export default new Config();
