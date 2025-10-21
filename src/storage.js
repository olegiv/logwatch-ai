import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import config from '../config/config.js';
import { getLogger } from './utils/logger.js';
import { format } from 'date-fns';

const logger = getLogger();

/**
 * SQLite database handler for storing analysis summaries
 */
class Storage {
  constructor() {
    this.dbPath = config.app.databasePath;
    this.enabled = config.app.enableDatabase;
    this.db = null;

    if (this.enabled) {
      this.initialize();
    }
  }

  /**
   * Initialize database connection and schema
   */
  initialize() {
    try {
      // Ensure data directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Open database connection
      this.db = new Database(this.dbPath);

      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');

      // Create schema
      this.createSchema();

      logger.info(`Database initialized: ${this.dbPath}`);
    } catch (error) {
      logger.error('Failed to initialize database', error);
      this.enabled = false;
    }
  }

  /**
   * Create database schema
   */
  createSchema() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        summary TEXT NOT NULL,
        critical_count INTEGER DEFAULT 0,
        warning_count INTEGER DEFAULT 0,
        raw_analysis TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `;

    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_date ON summaries(date)
    `;

    this.db.exec(createTableSQL);
    this.db.exec(createIndexSQL);

    logger.debug('Database schema created/verified');
  }

  /**
   * Save analysis summary to database
   * @param {Object} analysis - Analysis object
   * @returns {number|null} Insert ID or null if disabled
   */
  saveSummary(analysis) {
    if (!this.enabled || !this.db) {
      logger.debug('Database disabled, skipping save');
      return null;
    }

    try {
      const date = format(new Date(), 'yyyy-MM-dd');
      const timestamp = Math.floor(Date.now() / 1000);

      const stmt = this.db.prepare(`
        INSERT INTO summaries (date, timestamp, summary, critical_count, warning_count, raw_analysis)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        date,
        timestamp,
        analysis.summary || '',
        analysis.criticalIssues?.length || 0,
        analysis.warnings?.length || 0,
        JSON.stringify(analysis)
      );

      logger.info(`Analysis saved to database (ID: ${result.lastInsertRowid})`);

      return result.lastInsertRowid;
    } catch (error) {
      logger.error('Failed to save summary to database', error);
      return null;
    }
  }

  /**
   * Get recent summaries
   * @param {number} days - Number of days to retrieve
   * @returns {Array} Array of summaries
   */
  getRecentSummaries(days = 7) {
    if (!this.enabled || !this.db) {
      return [];
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

      const stmt = this.db.prepare(`
        SELECT * FROM summaries
        WHERE timestamp >= ?
        ORDER BY timestamp DESC
      `);

      const summaries = stmt.all(cutoffTimestamp);

      logger.debug(`Retrieved ${summaries.length} summaries from last ${days} days`);

      return summaries;
    } catch (error) {
      logger.error('Failed to retrieve recent summaries', error);
      return [];
    }
  }

  /**
   * Get historical context for Claude analysis
   * @param {number} days - Number of days to retrieve
   * @returns {string|null} Formatted historical context
   */
  getHistoricalContext(days = 7) {
    const summaries = this.getRecentSummaries(days);

    if (summaries.length === 0) {
      return null;
    }

    const context = summaries.map(s => {
      return `Date: ${s.date}\nSummary: ${s.summary}\nCritical Issues: ${s.critical_count}, Warnings: ${s.warning_count}`;
    }).join('\n\n');

    return `Previous ${days} days analysis:\n\n${context}`;
  }

  /**
   * Get trends from historical data
   * @returns {Object} Trend analysis
   */
  getTrends() {
    if (!this.enabled || !this.db) {
      return null;
    }

    try {
      const summaries = this.getRecentSummaries(30);

      if (summaries.length === 0) {
        return null;
      }

      const totalCritical = summaries.reduce((sum, s) => sum + s.critical_count, 0);
      const totalWarnings = summaries.reduce((sum, s) => sum + s.warning_count, 0);
      const avgCritical = totalCritical / summaries.length;
      const avgWarnings = totalWarnings / summaries.length;

      // Check if issues are increasing (compare last 7 days vs previous 7 days)
      const recent = summaries.slice(0, 7);
      const previous = summaries.slice(7, 14);

      const recentAvgCritical = recent.reduce((sum, s) => sum + s.critical_count, 0) / recent.length;
      const previousAvgCritical = previous.length > 0
        ? previous.reduce((sum, s) => sum + s.critical_count, 0) / previous.length
        : 0;

      const trend = {
        totalDays: summaries.length,
        avgCriticalIssues: avgCritical.toFixed(2),
        avgWarnings: avgWarnings.toFixed(2),
        isIncreasing: recentAvgCritical > previousAvgCritical,
        recentAvgCritical: recentAvgCritical.toFixed(2),
        previousAvgCritical: previousAvgCritical.toFixed(2)
      };

      logger.debug('Trend analysis completed', JSON.stringify(trend));

      return trend;
    } catch (error) {
      logger.error('Failed to calculate trends', error);
      return null;
    }
  }

  /**
   * Cleanup old database entries
   * @param {number} days - Keep entries from last N days
   * @returns {number} Number of deleted entries
   */
  cleanup(days = 90) {
    if (!this.enabled || !this.db) {
      return 0;
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

      const stmt = this.db.prepare(`
        DELETE FROM summaries
        WHERE timestamp < ?
      `);

      const result = stmt.run(cutoffTimestamp);

      if (result.changes > 0) {
        logger.info(`Cleaned up ${result.changes} old database entries (older than ${days} days)`);
      }

      // Vacuum database to reclaim space
      this.db.exec('VACUUM');

      return result.changes;
    } catch (error) {
      logger.error('Failed to cleanup old entries', error);
      return 0;
    }
  }

  /**
   * Get database statistics
   * @returns {Object} Database statistics
   */
  getStats() {
    if (!this.enabled || !this.db) {
      return null;
    }

    try {
      const totalRows = this.db.prepare('SELECT COUNT(*) as count FROM summaries').get();
      const oldestEntry = this.db.prepare('SELECT date FROM summaries ORDER BY timestamp ASC LIMIT 1').get();
      const newestEntry = this.db.prepare('SELECT date FROM summaries ORDER BY timestamp DESC LIMIT 1').get();

      return {
        totalEntries: totalRows.count,
        oldestDate: oldestEntry?.date,
        newestDate: newestEntry?.date
      };
    } catch (error) {
      logger.error('Failed to get database stats', error);
      return null;
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      logger.info('Database connection closed');
    }
  }
}

export default Storage;
