import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Simple file-based logger with rotation support
 */
class Logger {
  constructor(logPath = null, logLevel = 'info') {
    this.logPath = logPath || path.join(__dirname, '..', '..', 'logs', 'app.log');
    this.logLevel = logLevel;
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.maxFiles = 5;

    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    this.currentLevel = this.levels[logLevel] || this.levels.info;

    // Ensure log directory exists
    this.ensureLogDirectory();
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    const logDir = path.dirname(this.logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Format log message with timestamp and level
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @returns {string} Formatted log message
   */
  formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  }

  /**
   * Write log message to file
   * @param {string} level - Log level
   * @param {string} message - Log message
   */
  write(level, message) {
    if (this.levels[level] < this.currentLevel) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message);

    // Console output in development
    if (process.env.NODE_ENV !== 'production') {
      const consoleMethod = level === 'error' ? console.error : console.log;
      consoleMethod(formattedMessage.trim());
    }

    // Check file size and rotate if needed
    this.rotateIfNeeded();

    // Write to file
    try {
      fs.appendFileSync(this.logPath, formattedMessage);
    } catch (error) {
      console.error('Failed to write log:', error.message);
    }
  }

  /**
   * Rotate log file if it exceeds max size
   */
  rotateIfNeeded() {
    try {
      if (!fs.existsSync(this.logPath)) {
        return;
      }

      const stats = fs.statSync(this.logPath);
      if (stats.size < this.maxFileSize) {
        return;
      }

      // Rotate existing files
      for (let i = this.maxFiles - 1; i > 0; i--) {
        const oldPath = `${this.logPath}.${i}`;
        const newPath = `${this.logPath}.${i + 1}`;

        if (fs.existsSync(oldPath)) {
          if (i === this.maxFiles - 1) {
            fs.unlinkSync(oldPath); // Delete oldest
          } else {
            fs.renameSync(oldPath, newPath);
          }
        }
      }

      // Rotate current file
      fs.renameSync(this.logPath, `${this.logPath}.1`);
    } catch (error) {
      console.error('Failed to rotate log file:', error.message);
    }
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   */
  debug(message) {
    this.write('debug', message);
  }

  /**
   * Log info message
   * @param {string} message - Log message
   */
  info(message) {
    this.write('info', message);
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   */
  warn(message) {
    this.write('warn', message);
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Error} error - Optional error object
   */
  error(message, error = null) {
    const fullMessage = error ? `${message}: ${error.message}\n${error.stack}` : message;
    this.write('error', fullMessage);
  }
}

// Export singleton instance
let loggerInstance = null;

/**
 * Get logger instance
 * @param {string} logPath - Path to log file
 * @param {string} logLevel - Log level
 * @returns {Logger} Logger instance
 */
export function getLogger(logPath = null, logLevel = 'info') {
  if (!loggerInstance) {
    loggerInstance = new Logger(logPath, logLevel);
  }
  return loggerInstance;
}

export default { getLogger };
