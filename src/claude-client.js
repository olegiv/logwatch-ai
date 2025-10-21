import Anthropic from '@anthropic-ai/sdk';
import config from '../config/config.js';
import { getLogger } from './utils/logger.js';
import { getAnalysisPrompt } from './utils/prompts.js';

const logger = getLogger();

/**
 * Claude API client for analyzing logwatch reports
 */
class ClaudeClient {
  constructor() {
    this.client = new Anthropic({
      apiKey: config.claude.apiKey,
      timeout: config.claude.timeout
    });
    this.model = config.claude.model;
    this.maxTokens = config.claude.maxTokens;
    this.maxRetries = config.claude.maxRetries;
  }

  /**
   * Analyze logwatch output using Claude
   * @param {string} logContent - Raw logwatch output
   * @param {string|null} historicalContext - Optional historical context
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeLogwatch(logContent, historicalContext = null) {
    if (!logContent || logContent.trim().length === 0) {
      throw new Error('Log content is empty');
    }

    const prompt = getAnalysisPrompt(logContent, historicalContext);

    logger.info(`Starting Claude analysis (content length: ${logContent.length} chars)`);

    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const startTime = Date.now();

        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: this.maxTokens,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });

        const duration = Date.now() - startTime;

        // Extract text content from response
        const content = response.content[0].text;

        // Calculate cost and stats
        const stats = this.calculateStats(response, duration);

        // Log API usage statistics
        this.logApiUsage(response, duration);

        // Parse JSON response
        const analysis = this.parseAnalysisResponse(content);

        logger.info('Claude analysis completed successfully');

        return { analysis, stats };

      } catch (error) {
        lastError = error;
        logger.warn(`Claude API attempt ${attempt}/${this.maxRetries} failed: ${error.message}`);

        if (attempt < this.maxRetries) {
          const backoffDelay = this.calculateBackoff(attempt);
          logger.info(`Retrying in ${backoffDelay}ms...`);
          await this.sleep(backoffDelay);
        }
      }
    }

    // All retries failed
    logger.error('All Claude API retry attempts failed', lastError);
    throw new Error(`Claude API failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Parse Claude's JSON response
   * @param {string} content - Response content
   * @returns {Object} Parsed analysis object
   */
  parseAnalysisResponse(content) {
    try {
      // Try to extract JSON from response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Validate structure
      this.validateAnalysis(analysis);

      return analysis;

    } catch (error) {
      logger.error('Failed to parse Claude response', error);
      logger.debug(`Raw response: ${content}`);

      // Return fallback structure
      return {
        systemStatus: 'Satisfactory',
        summary: 'Failed to parse AI response. Manual review required.',
        criticalIssues: ['AI response parsing failed'],
        warnings: [],
        recommendations: ['Review raw logwatch output manually'],
        metrics: {}
      };
    }
  }

  /**
   * Validate analysis object structure
   * @param {Object} analysis - Analysis object
   * @throws {Error} If structure is invalid
   */
  validateAnalysis(analysis) {
    const required = ['systemStatus', 'summary', 'criticalIssues', 'warnings', 'recommendations', 'metrics'];

    for (const field of required) {
      if (!(field in analysis)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate systemStatus value
    const validStatuses = ['Excellent', 'Good', 'Satisfactory', 'Bad', 'Awful'];
    if (!validStatuses.includes(analysis.systemStatus)) {
      logger.warn(`Invalid systemStatus: ${analysis.systemStatus}, defaulting to Satisfactory`);
      analysis.systemStatus = 'Satisfactory';
    }

    if (!Array.isArray(analysis.criticalIssues)) {
      throw new Error('criticalIssues must be an array');
    }

    if (!Array.isArray(analysis.warnings)) {
      throw new Error('warnings must be an array');
    }

    if (!Array.isArray(analysis.recommendations)) {
      throw new Error('recommendations must be an array');
    }

    if (typeof analysis.metrics !== 'object') {
      throw new Error('metrics must be an object');
    }
  }

  /**
   * Calculate execution statistics
   * @param {Object} response - Claude API response
   * @param {number} duration - Request duration in ms
   * @returns {Object} Stats object
   */
  calculateStats(response, duration) {
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;

    // Rough cost estimation for Claude Sonnet (as of 2025)
    // Input: $3 per million tokens, Output: $15 per million tokens
    const estimatedCost = (inputTokens / 1000000 * 3) + (outputTokens / 1000000 * 15);

    return {
      inputTokens,
      outputTokens,
      totalTokens,
      cost: estimatedCost,
      duration: duration / 1000 // Convert to seconds
    };
  }

  /**
   * Log API usage statistics
   * @param {Object} response - Claude API response
   * @param {number} duration - Request duration in ms
   */
  logApiUsage(response, duration) {
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;

    // Rough cost estimation for Claude Sonnet (as of 2025)
    // Input: $3 per million tokens, Output: $15 per million tokens
    const estimatedCost = (inputTokens / 1000000 * 3) + (outputTokens / 1000000 * 15);

    logger.info(`API Usage - Input: ${inputTokens} tokens, Output: ${outputTokens} tokens, Total: ${totalTokens} tokens`);
    logger.info(`Estimated cost: $${estimatedCost.toFixed(4)}, Duration: ${duration}ms`);
  }

  /**
   * Calculate exponential backoff delay
   * @param {number} attempt - Attempt number
   * @returns {number} Delay in milliseconds
   */
  calculateBackoff(attempt) {
    // Exponential backoff: 2^attempt * 1000ms (1s, 2s, 4s, etc.)
    return Math.pow(2, attempt) * 1000;
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

export default ClaudeClient;
