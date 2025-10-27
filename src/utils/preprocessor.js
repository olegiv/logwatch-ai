/**
 * Logwatch Content Preprocessor
 * Intelligently reduces token count while preserving critical information
 */

import { getLogger } from './logger.js';

const logger = getLogger();

/**
 * Priority levels for logwatch sections
 */
const PRIORITY = {
  HIGH: 3,    // Security, auth failures, errors
  MEDIUM: 2,  // Network events, disk usage
  LOW: 1      // Routine messages, info
};

/**
 * Logwatch section patterns and their priorities
 */
const SECTION_PATTERNS = {
  // HIGH PRIORITY - Security & Errors
  'ssh': { pattern: /^-+\s*sshd?\s+(begin|end|-)/i, priority: PRIORITY.HIGH },
  'auth': { pattern: /^-+\s*(authentication|pam_unix|auth)/i, priority: PRIORITY.HIGH },
  'sudo': { pattern: /^-+\s*sudo/i, priority: PRIORITY.HIGH },
  'fail2ban': { pattern: /^-+\s*fail2ban/i, priority: PRIORITY.HIGH },
  'security': { pattern: /^-+\s*security/i, priority: PRIORITY.HIGH },
  'error': { pattern: /^-+\s*errors/i, priority: PRIORITY.HIGH },
  'kernel': { pattern: /^-+\s*kernel/i, priority: PRIORITY.HIGH },
  'disk_full': { pattern: /^-+\s*disk\s*space/i, priority: PRIORITY.HIGH },

  // MEDIUM PRIORITY - Network & Resources
  'firewall': { pattern: /^-+\s*(firewall|iptables)/i, priority: PRIORITY.MEDIUM },
  'network': { pattern: /^-+\s*network/i, priority: PRIORITY.MEDIUM },
  'connections': { pattern: /^-+\s*connections/i, priority: PRIORITY.MEDIUM },
  'disk': { pattern: /^-+\s*disk/i, priority: PRIORITY.MEDIUM },
  'filesystem': { pattern: /^-+\s*filesystem/i, priority: PRIORITY.MEDIUM },

  // LOW PRIORITY - Routine & Info
  'cron': { pattern: /^-+\s*cron/i, priority: PRIORITY.LOW },
  'http': { pattern: /^-+\s*(http|apache|nginx)/i, priority: PRIORITY.LOW },
  'mail': { pattern: /^-+\s*mail/i, priority: PRIORITY.LOW },
  'postfix': { pattern: /^-+\s*postfix/i, priority: PRIORITY.LOW },
  'init': { pattern: /^-+\s*(init|systemd)/i, priority: PRIORITY.LOW }
};

/**
 * Patterns for deduplication
 */
const DEDUP_PATTERNS = {
  failedPassword: /failed password for .* from ([\d.]+)/i,
  invalidUser: /invalid user .* from ([\d.]+)/i,
  connectionClosed: /connection closed by .* \[([\d.]+)\]/i,
  acceptedPassword: /accepted password for .* from ([\d.]+)/i,
  refusedConnect: /refused connect from ([\d.]+)/i
};

/**
 * LogwatchPreprocessor class
 */
class LogwatchPreprocessor {
  constructor(maxTokens = 150000) {
    this.maxTokens = maxTokens;
    this.stats = {
      originalSize: 0,
      processedSize: 0,
      originalTokens: 0,
      processedTokens: 0,
      linesRemoved: 0,
      linesDeduplicated: 0,
      sectionsCompressed: 0
    };
  }

  /**
   * Estimate token count from text
   * Rule of thumb: 1 token ≈ 4 characters for English text
   * @param {string} text - Text to estimate
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    if (!text) return 0;
    // More accurate: count words and punctuation
    const words = text.split(/\s+/).length;
    const chars = text.length;
    // Average: 1 token = 0.75 words or 1 token = 4 chars (whichever is higher)
    return Math.max(Math.ceil(words / 0.75), Math.ceil(chars / 4));
  }

  /**
   * Preprocess logwatch content
   * @param {string} content - Raw logwatch output
   * @returns {string} Preprocessed content
   */
  preprocess(content) {
    if (!content || content.trim().length === 0) {
      return content;
    }

    // Initialize stats
    this.stats.originalSize = content.length;
    this.stats.originalTokens = this.estimateTokens(content);

    logger.info(`Preprocessing logwatch content (${this.stats.originalTokens} tokens estimated)`);

    // Check if preprocessing is needed
    if (this.stats.originalTokens <= this.maxTokens) {
      logger.info('Content within token limit, no preprocessing needed');
      this.stats.processedSize = this.stats.originalSize;
      this.stats.processedTokens = this.stats.originalTokens;
      return content;
    }

    logger.info(`Content exceeds limit (${this.stats.originalTokens} > ${this.maxTokens}), applying preprocessing...`);

    // Step 1: Parse into sections
    const sections = this.parseSections(content);
    logger.debug(`Parsed ${sections.length} sections`);

    // Step 2: Deduplicate each section
    const dedupedSections = sections.map(section => this.deduplicateSection(section));

    // Step 3: Check if still too large
    const afterDedup = dedupedSections.map(s => s.content).join('\n\n');
    const afterDedupTokens = this.estimateTokens(afterDedup);
    logger.debug(`After deduplication: ${afterDedupTokens} tokens`);

    if (afterDedupTokens <= this.maxTokens) {
      // Deduplication was enough
      this.stats.processedSize = afterDedup.length;
      this.stats.processedTokens = afterDedupTokens;
      this.logStats();
      return afterDedup;
    }

    // Step 4: Compress low-priority sections
    const compressed = this.compressSections(dedupedSections, afterDedupTokens);

    this.stats.processedSize = compressed.length;
    this.stats.processedTokens = this.estimateTokens(compressed);
    this.logStats();

    return compressed;
  }

  /**
   * Parse content into sections
   * @param {string} content - Raw content
   * @returns {Array} Array of section objects
   */
  parseSections(content) {
    const lines = content.split('\n');
    const sections = [];
    let currentSection = null;

    for (const line of lines) {
      // Check if this is a section header
      const sectionInfo = this.identifySection(line);

      if (sectionInfo) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          name: sectionInfo.name,
          priority: sectionInfo.priority,
          header: line,
          content: line + '\n',
          lines: [line]
        };
      } else if (currentSection) {
        // Add to current section
        currentSection.content += line + '\n';
        currentSection.lines.push(line);
      } else {
        // Before first section (header/preamble)
        if (!sections.length) {
          sections.push({
            name: 'preamble',
            priority: PRIORITY.MEDIUM,
            header: '',
            content: line + '\n',
            lines: [line]
          });
          currentSection = sections[0];
        }
      }
    }

    // Add last section
    if (currentSection && !sections.includes(currentSection)) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Identify section type and priority
   * @param {string} line - Line to check
   * @returns {Object|null} Section info or null
   */
  identifySection(line) {
    for (const [name, config] of Object.entries(SECTION_PATTERNS)) {
      if (config.pattern.test(line)) {
        return { name, priority: config.priority };
      }
    }

    // Check for generic section headers (lines with dashes)
    if (/^-{3,}/.test(line.trim()) || /^={3,}/.test(line.trim())) {
      // Default to LOW priority for unknown sections
      return { name: 'unknown', priority: PRIORITY.LOW };
    }

    return null;
  }

  /**
   * Deduplicate section content
   * @param {Object} section - Section object
   * @returns {Object} Deduplicated section
   */
  deduplicateSection(section) {
    if (section.lines.length <= 3) {
      return section; // Too small to deduplicate
    }

    const deduped = { ...section };
    const lines = [...section.lines];
    const newLines = [];
    const groupedMessages = new Map();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Keep section headers and empty lines
      if (!line.trim() || line.match(/^-+/) || line.match(/^=+/)) {
        newLines.push(line);
        continue;
      }

      // Check for deduplication patterns
      let grouped = false;
      for (const [patternName, pattern] of Object.entries(DEDUP_PATTERNS)) {
        const match = line.match(pattern);
        if (match) {
          const key = `${patternName}:${match[1] || 'generic'}`;
          if (!groupedMessages.has(key)) {
            groupedMessages.set(key, { lines: [], count: 0, example: line });
          }
          groupedMessages.get(key).lines.push(line);
          groupedMessages.get(key).count++;
          grouped = true;
          break;
        }
      }

      if (!grouped) {
        // Check for exact duplicates
        const nextLines = lines.slice(i + 1, Math.min(i + 6, lines.length));
        const duplicateCount = nextLines.filter(l => l.trim() === line.trim()).length;

        if (duplicateCount >= 2) {
          // Skip ahead and add summary
          const totalCount = duplicateCount + 1;
          i += duplicateCount;
          newLines.push(`${line} (repeated ${totalCount}x)`);
          this.stats.linesDeduplicated += duplicateCount;
        } else {
          newLines.push(line);
        }
      }
    }

    // Add grouped message summaries
    for (const [key, data] of groupedMessages.entries()) {
      const [patternName, identifier] = key.split(':');
      if (data.count > 1) {
        newLines.push(`   ${data.count} similar ${patternName} events from ${identifier}`);
        this.stats.linesDeduplicated += data.count - 1;
      } else {
        newLines.push(data.example);
      }
    }

    deduped.lines = newLines;
    deduped.content = newLines.join('\n');

    return deduped;
  }

  /**
   * Compress sections to fit token limit
   * @param {Array} sections - Array of sections
   * @param {number} currentTokens - Current token count
   * @returns {string} Compressed content
   */
  compressSections(sections, currentTokens) {
    // Calculate how much we need to reduce
    const targetReduction = currentTokens - this.maxTokens;
    const reductionRatio = this.maxTokens / currentTokens;

    logger.info(`Need to reduce by ${targetReduction} tokens (${((1 - reductionRatio) * 100).toFixed(1)}%)`);

    // Sort sections by priority (high priority = keep more detail)
    const sortedSections = [...sections].sort((a, b) => b.priority - a.priority);

    const processedSections = [];

    for (const section of sortedSections) {
      const sectionTokens = this.estimateTokens(section.content);
      let processedContent = section.content;

      if (section.priority === PRIORITY.LOW) {
        // Aggressively compress low-priority sections
        const lines = section.lines;
        const targetLines = Math.max(5, Math.ceil(lines.length * 0.2)); // Keep 20%
        const compressed = [
          section.header,
          `   [Section compressed: showing ${targetLines} of ${lines.length} lines]`,
          ...lines.slice(0, targetLines)
        ];
        processedContent = compressed.join('\n');
        this.stats.sectionsCompressed++;
        this.stats.linesRemoved += lines.length - targetLines;

      } else if (section.priority === PRIORITY.MEDIUM) {
        // Moderately compress medium-priority sections
        const lines = section.lines;
        const targetLines = Math.max(10, Math.ceil(lines.length * 0.5)); // Keep 50%
        if (lines.length > targetLines) {
          const compressed = [
            section.header,
            `   [Section condensed: showing ${targetLines} of ${lines.length} lines]`,
            ...lines.slice(0, targetLines)
          ];
          processedContent = compressed.join('\n');
          this.stats.sectionsCompressed++;
          this.stats.linesRemoved += lines.length - targetLines;
        }

      } else {
        // Keep high-priority sections fully (already deduplicated)
        processedContent = section.content;
      }

      processedSections.push({
        ...section,
        content: processedContent
      });
    }

    // Reassemble in original order (by finding original index)
    const finalSections = sections.map(original =>
      processedSections.find(p => p.name === original.name && p.header === original.header)
    );

    return finalSections.map(s => s.content).join('\n\n');
  }

  /**
   * Log preprocessing statistics
   */
  logStats() {
    const reduction = this.stats.originalTokens - this.stats.processedTokens;
    const reductionPct = ((reduction / this.stats.originalTokens) * 100).toFixed(1);

    logger.info('Preprocessing complete:');
    logger.info(`  Original: ${this.stats.originalTokens} tokens (${(this.stats.originalSize / 1024).toFixed(1)} KB)`);
    logger.info(`  Processed: ${this.stats.processedTokens} tokens (${(this.stats.processedSize / 1024).toFixed(1)} KB)`);
    logger.info(`  Reduction: ${reduction} tokens (${reductionPct}%)`);
    logger.info(`  Lines deduplicated: ${this.stats.linesDeduplicated}`);
    logger.info(`  Lines removed: ${this.stats.linesRemoved}`);
    logger.info(`  Sections compressed: ${this.stats.sectionsCompressed}`);
  }

  /**
   * Get preprocessing statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return { ...this.stats };
  }
}

export default LogwatchPreprocessor;
