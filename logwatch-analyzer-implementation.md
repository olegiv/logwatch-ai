# Logwatch AI Analyzer Implementation Guide

## Overview

Build a daily automated system that analyzes logwatch reports using Claude API and sends summarized insights via Telegram bot.

## Architecture

```
┌─────────────┐
│   Cron Job  │ (daily at 6:00 AM)
└──────┬──────┘
       │
       v
┌──────────────────┐
│  logwatch        │ (generates report)
└──────┬───────────┘
       │
       v
┌──────────────────────────┐
│  analyzer.js             │
│  - Read logwatch output  │
│  - Call Claude API       │
│  - Parse AI response     │
└──────┬───────────────────┘
       │
       v
┌──────────────────────────┐
│  telegram.js             │
│  - Format message        │
│  - Send to Telegram      │
└──────────────────────────┘
       │
       v
┌──────────────────────────┐
│  Optional: SQLite DB     │
│  - Store summaries       │
│  - Track trends          │
└──────────────────────────┘
```

## Project Structure

```
/opt/logwatch-ai/
├── package.json
├── .env
├── config/
│   └── config.js
├── src/
│   ├── analyzer.js           # Main orchestrator
│   ├── claude-client.js      # Claude API wrapper
│   ├── telegram-client.js    # Telegram bot client
│   ├── logwatch-reader.js    # Logwatch file parser
│   ├── storage.js            # SQLite database handler
│   └── utils/
│       ├── logger.js         # Logging utility
│       └── prompts.js        # Claude prompts
├── logs/
│   └── app.log
├── data/
│   └── summaries.db          # SQLite database
└── scripts/
    ├── install.sh            # Installation script
    └── test.sh               # Manual test script
```

## Implementation Requirements

### 1. Dependencies (package.json)

```json
{
  "name": "logwatch-ai",
  "version": "1.0.0",
  "type": "module",
  "description": "AI-powered logwatch analysis with Telegram notifications",
  "main": "src/analyzer.js",
  "scripts": {
    "start": "node src/analyzer.js",
    "test": "node scripts/test.sh"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.0",
    "node-telegram-bot-api": "^0.66.0",
    "better-sqlite3": "^11.7.0",
    "dotenv": "^16.4.5",
    "date-fns": "^4.1.0"
  }
}
```

### 2. Environment Variables (.env)

```bash
# Claude API
ANTHROPIC_API_KEY=sk-ant-xxxxx
CLAUDE_MODEL=claude-sonnet-4-20250514

# Telegram Bot
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHANNEL_ID=-1001234567890

# Logwatch Configuration
LOGWATCH_OUTPUT_PATH=/var/cache/logwatch/logwatch.txt
# Alternative: /tmp/logwatch-output.txt

# Application Settings
NODE_ENV=production
LOG_LEVEL=info
MAX_LOG_SIZE_MB=10
ENABLE_DATABASE=true
DATABASE_PATH=/opt/logwatch-ai/data/summaries.db
```

### 3. Configuration (config/config.js)

```javascript
// Load and validate environment variables
// Export configuration object with defaults
// Validate required fields (API keys, paths)
```

### 4. Claude API Client (src/claude-client.js)

**Functionality:**
- Initialize Anthropic SDK client
- Create method `analyzeLogwatch(logContent)` that:
  - Takes raw logwatch output as input
  - Uses prompt from `prompts.js`
  - Calls Claude API with appropriate parameters
  - Returns structured analysis object
- Handle API errors with retry logic (exponential backoff, max 3 retries)
- Implement timeout handling (120 seconds)
- Log API usage statistics (tokens, cost estimation)

**Expected Output Format:**
```javascript
{
  summary: "Brief overview of system health",
  criticalIssues: ["Issue 1", "Issue 2"],
  warnings: ["Warning 1"],
  recommendations: ["Action 1", "Action 2"],
  metrics: {
    failedLogins: 5,
    errorCount: 12,
    diskUsage: "78%"
  }
}
```

### 5. Telegram Client (src/telegram-client.js)

**Functionality:**
- Initialize Telegram Bot API
- Create method `sendAnalysisReport(analysis)` that:
  - Formats analysis object into readable Telegram message
  - Uses Markdown formatting for readability
  - Includes emojis for visual categorization
  - Handles message length limits (split if > 4096 chars)
  - Sends message to configured chat ID
- Create method `sendError(errorMessage)` for error notifications
- Implement message queuing to avoid rate limits
- Log successful/failed deliveries

**Message Format Example:**
```
🔍 *Logwatch Analysis Report*
📅 Date: 2025-10-21

📊 *Summary*
System is stable with minor issues detected.

⚠️ *Critical Issues* (2)
• Failed SSH login attempts: 15
• Disk space on /var at 85%

💡 *Recommendations*
• Investigate SSH access attempts
• Clean up old log files
• Consider disk expansion

📈 *Metrics*
• Failed logins: 15
• Total errors: 23
• Disk usage: 85%
```

### 6. Logwatch Reader (src/logwatch-reader.js)

**Functionality:**
- Create method `readLogwatchOutput()` that:
  - Checks if logwatch output file exists
  - Reads file content (handle encoding properly)
  - Validates content is not empty
  - Returns raw text content
- Handle file permission errors
- Implement file size validation (warn if > MAX_LOG_SIZE_MB)
- Return null if file doesn't exist or is empty

### 7. Storage Handler (src/storage.js)

**Functionality:**
- Initialize SQLite database with schema:
  ```sql
  CREATE TABLE IF NOT EXISTS summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    summary TEXT NOT NULL,
    critical_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,
    raw_analysis TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );
  
  CREATE INDEX IF NOT EXISTS idx_date ON summaries(date);
  ```
- Create method `saveSummary(analysis)` to store daily results
- Create method `getRecentSummaries(days)` to retrieve historical data
- Create method `getTrends()` to identify patterns
- Implement database cleanup (delete entries older than 90 days)
- Handle database errors gracefully

### 8. Prompts (src/utils/prompts.js)

**Functionality:**
Export Claude prompt templates as functions:

```javascript
export function getAnalysisPrompt(logContent, historicalContext = null) {
  return `You are a senior system administrator analyzing a logwatch report.

LOGWATCH OUTPUT:
${logContent}

${historicalContext ? `HISTORICAL CONTEXT:\n${historicalContext}\n` : ''}

Analyze this report and provide:

1. SUMMARY: Brief 2-3 sentence overview of system health
2. CRITICAL ISSUES: List any security threats, system failures, or urgent problems
3. WARNINGS: List concerning but non-critical issues
4. RECOMMENDATIONS: Actionable steps to address problems
5. KEY METRICS: Extract important numbers (failed logins, errors, disk usage, etc.)

Format your response as JSON with this structure:
{
  "summary": "string",
  "criticalIssues": ["string"],
  "warnings": ["string"],
  "recommendations": ["string"],
  "metrics": {
    "failedLogins": number,
    "errorCount": number,
    "diskUsage": "string"
  }
}

Be concise but thorough. Focus on actionable insights.`;
}
```

### 9. Logger (src/utils/logger.js)

**Functionality:**
- Implement simple file-based logger
- Support levels: debug, info, warn, error
- Write to `/opt/logwatch-ai/logs/app.log`
- Include timestamps and log levels
- Implement log rotation (max 10MB per file, keep 5 files)
- Console output in development mode

### 10. Main Analyzer (src/analyzer.js)

**Functionality:**
This is the main entry point that orchestrates everything:

```javascript
async function main() {
  try {
    // 1. Initialize logger
    // 2. Load configuration
    // 3. Log start of analysis
    
    // 4. Read logwatch output
    // 5. If no logwatch file, generate it by running:
    //    sudo logwatch --output file --filename /tmp/logwatch-output.txt --format text --range yesterday
    
    // 6. Get historical context from database (last 7 days)
    // 7. Call Claude API to analyze logs
    // 8. Save analysis to database
    // 9. Send report via Telegram
    // 10. Log completion with statistics
    
  } catch (error) {
    // Log error
    // Send error notification to Telegram
    // Exit with error code
  }
}
```

## Installation Script (scripts/install.sh)

```bash
#!/bin/bash
# Create directory structure
# Install Node.js dependencies
# Create systemd service file (optional)
# Set up cron job
# Create .env from template
# Set proper permissions
# Test configuration
```

**Cron Job Entry:**
```cron
# Run logwatch analyzer daily at 6:00 AM
0 6 * * * cd /opt/logwatch-ai && /usr/local/bin/node src/analyzer.js >> logs/cron.log 2>&1
```

## Test Script (scripts/test.sh)

**Functionality:**
- Validate configuration
- Check file permissions
- Test Claude API connection
- Test Telegram bot connection
- Run analysis with sample logwatch output
- Verify database operations

## Error Handling Requirements

1. **API Failures:**
   - Retry with exponential backoff
   - Send notification if all retries fail
   - Log detailed error information

2. **File Access:**
   - Check permissions before reading
   - Provide helpful error messages
   - Fallback to manual logwatch generation

3. **Telegram Delivery:**
   - Queue messages if rate-limited
   - Log failed deliveries
   - Retry once after 5 seconds

4. **Database:**
   - Create database if doesn't exist
   - Handle locked database gracefully
   - Backup before schema changes

## Security Considerations

1. Store `.env` with restricted permissions (600)
2. Never log API keys or tokens
3. Validate all file paths to prevent injection
4. Sanitize log content before sending to Claude
5. Limit log file size to prevent memory issues
6. Use read-only access for logwatch files

## Performance Considerations

1. Set token limits for Claude API (max 8000 tokens)
2. Truncate extremely large logwatch files (> 10MB)
3. Use streaming for file reading
4. Implement timeout for all API calls
5. Optimize database queries with indexes

## Monitoring & Maintenance

1. Log all operations with timestamps
2. Track API usage and costs
3. Monitor Telegram delivery success rate
4. Alert if analysis hasn't run in 48 hours
5. Cleanup old database entries monthly

## Expected Deliverables

Build a working system with:
1. All source files in proper structure
2. Installation script that automates setup
3. Test script for validation
4. README with setup instructions
5. Proper error handling throughout
6. Comprehensive logging
7. Working cron job configuration

## Testing Checklist

- [ ] Claude API connection works
- [ ] Telegram bot sends messages
- [ ] Logwatch file is read correctly
- [ ] Database stores summaries
- [ ] Cron job executes properly
- [ ] Error notifications work
- [ ] Log rotation functions
- [ ] Historical context retrieval works
- [ ] Large log files handled gracefully
- [ ] All permissions set correctly

## Notes for Claude Code

- Use modern JavaScript (ES6+ with async/await)
- Follow Node.js best practices
- Add JSDoc comments for all functions
- Include inline comments for complex logic
- Use meaningful variable names
- Implement proper error types
- Add validation for all inputs
- Make code maintainable and extensible
- Consider that this runs on Ubuntu 24.04.2 LTS
- Ensure compatibility with Node.js 20
- Handle timezone properly (server timezone)
- Make paths configurable via environment variables

## Future Enhancements (Not Required Now)

- Web dashboard for viewing summaries
- Multi-server support
- Custom alert thresholds
- Integration with other monitoring tools
- Slack/Discord notifications
- Machine learning for anomaly detection
