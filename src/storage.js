import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/config.js';
import { getLogger } from './utils/logger.js';
import { format } from 'date-fns';

const logger = getLogger();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * SQLite database handler for storing analysis summaries
 * Uses sql.js (pure JavaScript/WASM) for SEA compatibility
 */
class Storage {
  constructor() {
    this.dbPath = config.app.databasePath;
    this.enabled = config.app.enableDatabase;
    this.db = null;
    this.SQL = null;
    // Note: initialize() must be called explicitly due to async nature
  }

  /**
   * Initialize database connection and schema
   */
  async initialize() {
    try {
      // Ensure data directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Initialize sql.js with WASM
      this.SQL = await initSqlJs({
        // Locate WASM file for SEA binary deployment
        locateFile: file => {
          // For SEA binary: WASM file is in the same directory as the binary
          const binaryDir = path.dirname(process.execPath);
          const seaWasmPath = path.join(binaryDir, file);

          // Check if running as SEA binary (WASM in binary directory)
          if (fs.existsSync(seaWasmPath)) {
            return seaWasmPath;
          }

          // Fallback for development: check node_modules
          const devWasmPath = path.join(__dirname, '../node_modules/sql.js/dist', file);
          if (fs.existsSync(devWasmPath)) {
            return devWasmPath;
          }

          // Final fallback: current working directory
          return path.join(process.cwd(), file);
        }
      });

      // Load existing database or create new one
      if (fs.existsSync(this.dbPath)) {
        const buffer = fs.readFileSync(this.dbPath);
        this.db = new this.SQL.Database(buffer);
        logger.debug(`Loaded existing database: ${this.dbPath}`);
      } else {
        this.db = new this.SQL.Database();
        logger.debug('Created new in-memory database');
      }

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

    this.db.run(createTableSQL);
    this.db.run(createIndexSQL);

    // Save to disk after schema creation
    this.saveToFile();

    logger.debug('Database schema created/verified');
  }

  /**
   * Save in-memory database to file
   */
  saveToFile() {
    if (!this.db) return;

    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (error) {
      logger.error('Failed to save database to file', error);
    }
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

      this.db.run(
        `INSERT INTO summaries (date, timestamp, summary, critical_count, warning_count, raw_analysis)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          date,
          timestamp,
          analysis.summary || '',
          analysis.criticalIssues?.length || 0,
          analysis.warnings?.length || 0,
          JSON.stringify(analysis)
        ]
      );

      // Get last inserted ID
      const result = this.db.exec('SELECT last_insert_rowid() as id');
      const insertId = result[0]?.values[0]?.[0];

      // Save to disk after insert
      this.saveToFile();

      logger.info(`Analysis saved to database (ID: ${insertId})`);

      return insertId;
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

      const result = this.db.exec(
        `SELECT * FROM summaries
         WHERE timestamp >= ?
         ORDER BY timestamp DESC`,
        [cutoffTimestamp]
      );

      if (!result.length) {
        return [];
      }

      // Convert sql.js result format to objects
      const summaries = this.resultToObjects(result[0]);

      logger.debug(`Retrieved ${summaries.length} summaries from last ${days} days`);

      return summaries;
    } catch (error) {
      logger.error('Failed to retrieve recent summaries', error);
      return [];
    }
  }

  /**
   * Convert sql.js result to array of objects
   * @param {Object} result - sql.js result object
   * @returns {Array} Array of row objects
   */
  resultToObjects(result) {
    if (!result || !result.columns || !result.values) {
      return [];
    }

    return result.values.map(row => {
      const obj = {};
      result.columns.forEach((col, index) => {
        obj[col] = row[index];
      });
      return obj;
    });
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

      // Get count before deletion
      const beforeResult = this.db.exec('SELECT COUNT(*) as count FROM summaries');
      const countBefore = beforeResult[0]?.values[0]?.[0] || 0;

      // Delete old entries
      this.db.run(
        `DELETE FROM summaries WHERE timestamp < ?`,
        [cutoffTimestamp]
      );

      // Get count after deletion
      const afterResult = this.db.exec('SELECT COUNT(*) as count FROM summaries');
      const countAfter = afterResult[0]?.values[0]?.[0] || 0;

      const deletedCount = countBefore - countAfter;

      if (deletedCount > 0) {
        // Vacuum to reclaim space (sql.js doesn't support VACUUM, but we can recreate)
        this.saveToFile();
        logger.info(`Cleaned up ${deletedCount} old database entries (older than ${days} days)`);
      }

      return deletedCount;
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
      const totalResult = this.db.exec('SELECT COUNT(*) as count FROM summaries');
      const totalRows = totalResult[0]?.values[0]?.[0] || 0;

      const oldestResult = this.db.exec('SELECT date FROM summaries ORDER BY timestamp ASC LIMIT 1');
      const oldestDate = oldestResult[0]?.values[0]?.[0];

      const newestResult = this.db.exec('SELECT date FROM summaries ORDER BY timestamp DESC LIMIT 1');
      const newestDate = newestResult[0]?.values[0]?.[0];

      return {
        totalEntries: totalRows,
        oldestDate: oldestDate,
        newestDate: newestDate
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
      // Save to disk before closing
      this.saveToFile();
      this.db.close();
      logger.info('Database connection closed');
    }
  }
}

export default Storage;
