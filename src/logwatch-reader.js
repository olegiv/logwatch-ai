import fs from 'fs';
import config from '../config/config.js';
import { getLogger } from './utils/logger.js';
import LogwatchPreprocessor from './utils/preprocessor.js';

const logger = getLogger();

/**
 * Logwatch output file reader
 */
class LogwatchReader {
  constructor() {
    this.outputPath = config.logwatch.outputPath;
    this.maxSizeBytes = config.logwatch.maxSizeMB * 1024 * 1024;
    this.preprocessingEnabled = config.preprocessing?.enabled !== false; // Default to true
    this.preprocessor = new LogwatchPreprocessor(config.preprocessing?.maxTokens || 150000);
  }

  /**
   * Read logwatch output file
   * @returns {Promise<string|null>} File content or null if not found/empty
   */
  async readLogwatchOutput() {
    logger.info(`Reading logwatch output from: ${this.outputPath}`);

    // Check if file exists
    if (!this.fileExists()) {
      logger.warn(`Logwatch output file not found: ${this.outputPath}`);
      return null;
    }

    // Check file permissions
    if (!this.canReadFile()) {
      logger.error(`Cannot read logwatch output file (permission denied): ${this.outputPath}`);
      throw new Error(`Permission denied: ${this.outputPath}`);
    }

    // Check file size
    const fileSize = this.getFileSize();
    if (fileSize === 0) {
      logger.warn('Logwatch output file is empty');
      return null;
    }

    if (fileSize > this.maxSizeBytes) {
      logger.warn(`Logwatch file size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds limit (${config.logwatch.maxSizeMB}MB)`);
      logger.info('Truncating file content to max size');
      return this.readTruncated();
    }

    // Read file content
    try {
      let content = fs.readFileSync(this.outputPath, 'utf8');
      logger.info(`Successfully read logwatch output (${content.length} chars)`);

      // Apply preprocessing if enabled
      if (this.preprocessingEnabled) {
        content = this.preprocessor.preprocess(content);
        const stats = this.preprocessor.getStats();

        // Log if preprocessing was applied
        if (stats.originalTokens > stats.processedTokens) {
          logger.info(`Preprocessing reduced content from ${stats.originalTokens} to ${stats.processedTokens} tokens`);
        }
      }

      return content;
    } catch (error) {
      logger.error('Failed to read logwatch output file', error);
      throw error;
    }
  }

  /**
   * Check if file exists
   * @returns {boolean}
   */
  fileExists() {
    try {
      return fs.existsSync(this.outputPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if file is readable
   * @returns {boolean}
   */
  canReadFile() {
    try {
      fs.accessSync(this.outputPath, fs.constants.R_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file size in bytes
   * @returns {number}
   */
  getFileSize() {
    try {
      const stats = fs.statSync(this.outputPath);
      return stats.size;
    } catch (error) {
      logger.error('Failed to get file size', error);
      return 0;
    }
  }

  /**
   * Read file with truncation to max size
   * @returns {string}
   */
  readTruncated() {
    try {
      const fd = fs.openSync(this.outputPath, 'r');
      const buffer = Buffer.alloc(this.maxSizeBytes);
      const bytesRead = fs.readSync(fd, buffer, 0, this.maxSizeBytes, 0);
      fs.closeSync(fd);

      const content = buffer.toString('utf8', 0, bytesRead);
      logger.info(`Read truncated content (${content.length} chars)`);
      return content;
    } catch (error) {
      logger.error('Failed to read truncated file', error);
      throw error;
    }
  }

  /**
   * Validate logwatch content
   * @param {string} content - File content
   * @returns {boolean}
   */
  validateContent(content) {
    if (!content || content.trim().length === 0) {
      logger.warn('Logwatch content is empty');
      return false;
    }

    // Basic validation - check if it looks like logwatch output
    const hasLogwatchHeader = content.toLowerCase().includes('logwatch') ||
                             content.includes('################### Logwatch');

    if (!hasLogwatchHeader) {
      logger.warn('Content does not appear to be logwatch output (missing header)');
    }

    return true;
  }

  /**
   * Get file modification time
   * @returns {Date|null}
   */
  getFileModificationTime() {
    try {
      const stats = fs.statSync(this.outputPath);
      return stats.mtime;
    } catch (error) {
      logger.error('Failed to get file modification time', error);
      return null;
    }
  }

  /**
   * Check if file is recent (modified within last 24 hours)
   * @returns {boolean}
   */
  isFileRecent() {
    const mtime = this.getFileModificationTime();
    if (!mtime) {
      return false;
    }

    const now = new Date();
    const hoursSinceModification = (now - mtime) / (1000 * 60 * 60);

    return hoursSinceModification <= 24;
  }
}

export default LogwatchReader;
