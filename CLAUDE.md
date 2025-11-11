# Development Guidelines for Claude Code

This section provides instructions for Claude Code when assisting with development tasks.

## Git Workflow Rules

**CRITICAL:** Never create commits or push changes unless explicitly instructed by the user.

### Rules
1. **No automatic commits**: Do NOT commit changes automatically after completing tasks
2. **No automatic pushes**: Do NOT push to remote repositories unless explicitly asked
3. **Wait for instruction**: After completing work, inform the user and wait for them to ask for a commit
4. **User controls git**: The user decides when and what to commit

### When to Create Commits
- **Only when explicitly asked**: "commit these changes", "create a commit", "git commit", etc.
- **Never proactively**: Even after completing major features or fixes
- **Let user review first**: User may want to test or review changes before committing

### Example Workflow
```
✓ CORRECT:
User: "Implement feature X"
Claude: [implements feature]
Claude: "Feature X is complete. Would you like me to commit these changes?"
User: "Yes, commit it"
Claude: [creates commit]

✗ INCORRECT:
User: "Implement feature X"
Claude: [implements feature and automatically commits]
```

## Release Documentation

When preparing a new release (e.g., v1.2.0), create two documentation files in the `docs/releases/` directory:

### 1. Detailed Release Notes
**File**: `docs/releases/RELEASE_NOTES_vx.x.x.md`
- Comprehensive documentation of all changes, features, and improvements
- Technical details, implementation notes, and migration guides
- Code examples and configuration changes
- No length restrictions - include all relevant information

### 2. GitHub Release Changelog
**File**: `docs/releases/RELEASE_vx.x.x_GITHUB.md`
- Concise, user-facing changelog for GitHub releases
- Highlights key features, fixes, and breaking changes
- **Maximum 50 lines** - keep it scannable and focused
- Use clear, non-technical language where possible
- Format for easy reading (bullet points, sections)

### Important
- **Never create RELEASE*.md files in the project root**
- All release documentation must go in `docs/releases/` directory only
- This keeps the project root clean and organized

## Claude Code Permissions

**IMPORTANT:** Understand the difference between shared and local permissions files:

### Permission Files

- **`.claude/settings.json`** - Shared team permissions, checked into git
- **`.claude/settings.local.json`** - Personal local permissions, **NEVER commit** (gitignored)

### Rules

1. **Never commit `.claude/settings.local.json`**: This file is for personal/local testing and is automatically gitignored
2. **Commit `.claude/settings.json`**: Use this for team-wide permissions that everyone needs
3. **Add new scripts**: When creating test scripts or utilities:
   - For personal testing → add to `.claude/settings.local.json`
   - For team use → add to `.claude/settings.json` and commit
4. **Document permissions**: Permissions enable Claude Code to run specific commands automatically

### Example: Personal Testing

Add to `.claude/settings.local.json` (not committed):
```json
{
  "permissions": {
    "allow": [
      "Bash(node scripts/test-preprocessing.js:*)"
    ]
  }
}
```

### Example: Team Permission

Add to `.claude/settings.json` (committed):
```json
{
  "permissions": {
    "allow": [
      "Bash(npm test)"
    ]
  }
}
```

Then commit the shared settings:
```bash
git add .claude/settings.json
git commit -m "Add team permission for npm test"
```

---

# Claude AI Integration Guide

This document describes how Claude AI is integrated into the Logwatch AI Analyzer project and provides guidance for developers working with this codebase.

## Overview

This project uses Claude AI (Anthropic's language model) to intelligently analyze system logs from logwatch and provide actionable insights. The AI integration transforms raw log data into structured, prioritized security and system health reports.

## Claude's Role in This Project

### Core Functionality

Claude AI serves as the intelligent analysis engine that:

1. **Analyzes Raw Logs**: Processes logwatch output to identify patterns and anomalies
2. **Prioritizes Issues**: Categorizes findings into critical issues, warnings, and informational items
3. **Provides Context**: Explains the significance of each finding in plain language
4. **Generates Recommendations**: Suggests specific, actionable steps to address issues
5. **Tracks Trends**: Analyzes historical data to identify patterns over time

### API Integration

**Model Used**: `claude-sonnet-4-5-20250929` (Sonnet 4.5)

The integration is implemented in `src/claude-client.js` and uses:
- Anthropic SDK (@anthropic-ai/sdk)
- Streaming responses for better performance
- Structured JSON output for reliable parsing
- **Prompt caching** for cost optimization

### Prompt Caching

**Status**: ✅ Implemented (v1.1.0)

Prompt caching is a server-side feature that caches the static system prompt, reducing costs by 90% on cached tokens.

**How It Works:**
- The system prompt (~1,590 tokens) is cached on Anthropic's servers
- Cache is shared across all API calls using the same API key
- Cache lasts 5 minutes from last access (auto-refreshes on each use)
- First request: Creates cache (writes cost 1.25× base rate = $3.75/MTok)
- Subsequent requests (within 5 min): Use cache (reads cost 0.1× base rate = $0.30/MTok)

**Multi-Server Benefits:**
- Cache is **server-side**, not local
- If you run analysis on multiple servers within 5 minutes:
  - Server 1: Creates cache ($0.0220)
  - Servers 2-N: Use cached prompt ($0.0154 each)
  - Example: 10 servers = 27% total cost savings

**Cache Options:**
- **5-minute cache** (default, implemented): Best for frequent access, lowest cost
- **1-hour cache** (available, not implemented): For less frequent access, 2× write cost

**Monitoring:**
Application logs show cache statistics:
```
[INFO] Cache - Created: 1559 tokens, Read: 0 tokens
[INFO] Cache - Read: 1559 tokens
[INFO] Cache savings: $0.0042 (21.4% reduction)
```

**Requirements:**
- System prompt must be >1024 tokens (current: ~1,590 tokens ✓)
- No special configuration needed (works automatically)
- Generally available (no beta header required)

## Key Components

### 1. Claude Client (`src/claude-client.js`)

The Claude client handles all API interactions:

```javascript
// Initialize client with API key
const client = new Anthropic({ apiKey: config.anthropic.apiKey });

// Analyze logs with structured output
const analysis = await client.analyzeLogwatch(logContent);
```

**Key features:**
- Error handling with retry logic
- Token usage tracking
- Streaming support for large analyses
- Structured JSON response validation

### 2. Analysis Prompts (`src/utils/prompts.js`)

The prompts are carefully crafted to ensure:
- Consistent output format
- Security-focused analysis
- Actionable recommendations
- Proper JSON structure

**Current prompt structure:**
```javascript
{
  summary: "Brief overview",
  critical_issues: ["List of urgent problems"],
  warnings: ["Non-critical concerns"],
  recommendations: ["Actionable steps"],
  metrics: {
    failed_logins: 0,
    security_events: 0,
    disk_usage: "N/A"
  }
}
```

### 3. Historical Analysis

The system maintains an SQLite database (`data/summaries.db`) that stores:
- Analysis summaries
- Issue counts
- Timestamps
- Raw responses

This enables Claude to:
- Compare current findings with historical trends
- Identify recurring issues
- Track resolution progress
- Detect anomalies

### 4. Intelligent Preprocessing (`src/utils/preprocessor.js`)

**Status**: ✅ Implemented (v1.2.0)

The preprocessor handles large logwatch files that would exceed Claude's 200K token context window by intelligently reducing content while preserving critical information.

**How It Works:**
- **Token Estimation**: Estimates token count (~1 token = 4 characters)
- **Automatic Activation**: Triggers when content exceeds 150K tokens
- **Section Parsing**: Identifies logwatch sections (SSH, Kernel, Cron, etc.)
- **Priority Classification**:
  - HIGH: Security/auth failures, errors & warnings (kept in full detail)
  - MEDIUM: Network events, disk usage (moderate compression)
  - LOW: Routine messages (aggressive compression)
- **Deduplication**: Groups similar messages (e.g., "23 failed login attempts from 192.168.1.100")
- **Smart Compression**: Reduces low-priority sections while preserving high-priority details

**Typical Results:**
- Handles logwatch files up to ~800KB-1MB
- 30-60% size reduction for verbose logs
- Preserves all critical security and error information
- Zero configuration required (works automatically)

**Configuration:**
```env
# Enable/disable preprocessing (default: true)
ENABLE_PREPROCESSING=true

# Maximum tokens after preprocessing (default: 150000)
MAX_PREPROCESSING_TOKENS=150000
```

**Testing:**
```bash
node scripts/test-preprocessing.js
```

**Monitoring:**
Application logs show preprocessing statistics:
```
[INFO] Preprocessing logwatch content (180000 tokens estimated)
[INFO] Content exceeds limit, applying preprocessing...
[INFO] Preprocessing complete:
[INFO]   Original: 180000 tokens (720 KB)
[INFO]   Processed: 145000 tokens (580 KB)
[INFO]   Reduction: 35000 tokens (19.4%)
[INFO]   Lines deduplicated: 450
[INFO]   Lines removed: 320
[INFO]   Sections compressed: 3
```

## Configuration

### Environment Variables

```env
# Claude API Configuration
ANTHROPIC_API_KEY=sk-ant-xxxxx              # Your Anthropic API key
CLAUDE_MODEL=claude-sonnet-4-5-20250929     # Model to use
```

### Model Selection

The project uses Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`), which offers:
- Fast response times (important for daily automation)
- Strong analytical and reasoning capabilities
- Balanced pricing ($3/MTok input, $15/MTok output)
- Excellent instruction-following for JSON output
- Superior quality for complex log analysis

Alternative models:
- `claude-haiku-4-5-20251001` - Faster, 3x cheaper, less capable for complex analysis
- `claude-opus-4-20250514` - Most powerful, significantly higher cost

## Working with This Codebase Using Claude Code

### Quick Start

1. **Understanding the codebase:**
   ```
   Ask: "Explain how the Claude integration works in this project"
   ```

2. **Making changes:**
   ```
   Ask: "Add support for detecting SSH brute force attacks"
   ```

3. **Testing:**
   ```
   Ask: "Run the test script and analyze the results"
   ```

### Common Development Tasks

#### Modifying Analysis Prompts

The prompts are in `src/utils/prompts.js`. To modify:

1. Update the `getAnalysisPrompt()` function
2. Test with: `npm start`
3. Verify the JSON structure is maintained

#### Adding New Metrics

To add new metrics to the analysis:

1. Update the prompt in `src/utils/prompts.js` to request the metric
2. Update the JSON schema validation
3. Update the Telegram message formatter in `src/telegram-client.js`
4. Update the database schema if needed in `src/storage.js`

#### Improving Analysis Quality

To enhance Claude's analysis:

1. **Add more context**: Include historical data in the prompt
2. **Provide examples**: Show Claude examples of good analysis
3. **Refine instructions**: Make requirements more specific
4. **Increase model temperature**: For more creative insights (current: 1.0)

### Debugging Claude Integration

#### Enable Debug Logging

```env
LOG_LEVEL=debug
```

This will show:
- Full prompts sent to Claude
- Complete API responses
- Token usage statistics
- Error details

#### Common Issues

**API Key Issues:**
```bash
node scripts/test.js  # Validates API key
```

**Response Format Issues:**
Check `logs/app.log` for JSON parsing errors. Claude might return malformed JSON if:
- The prompt is ambiguous
- The log content is too large
- The model is overloaded

**Token Limits:**
- Maximum context: ~200K tokens
- Typical logwatch file: 2-5K tokens
- If logs exceed limits, implement chunking in `src/logwatch-reader.js`

## Cost Management

### Current Usage (Sonnet 4.5 with Prompt Caching)

**Without Cache (First Run):**
- System prompt: ~1,590 tokens (cached)
- User prompt: ~800 tokens (dynamic)
- Output: ~500 tokens
- Cache write: 1,559 tokens × $3.75/MTok = $0.0058
- Input: 885 tokens × $3/MTok = $0.0027
- Output: 500 tokens × $15/MTok = $0.0075
- **Total: ~$0.0160-0.0220 per analysis**

**With Cache (Subsequent Runs within 5 min):**
- Cache read: 1,559 tokens × $0.30/MTok = $0.0005
- Input: 885 tokens × $3/MTok = $0.0027
- Output: 500 tokens × $15/MTok = $0.0075
- **Total: ~$0.0107-0.0154 per analysis**
- **Savings: $0.0042-0.0066 (16-30% reduction)**

**Monthly Costs:**
- Daily automated run: ~$0.47/month (with caching benefits over retries)
- Without caching: ~$0.59/month
- **Monthly savings: ~$0.12 (20% reduction)**

**Multi-Server Deployment:**
If running on 10 servers within 5-minute window:
- Server 1: $0.0220 (creates cache)
- Servers 2-10: $0.0154 each = $0.1386
- Total: $0.1606 (vs $0.2200 without cache)
- **Savings: 27% across all servers**

### Cache Pricing Breakdown

| Token Type | Rate | Description |
|------------|------|-------------|
| Standard Input | $3.00/MTok | Regular input tokens |
| Cache Write | $3.75/MTok | Creating cache (1.25× input) |
| Cache Read | $0.30/MTok | Reading cache (0.1× input, 90% savings) |
| Output | $15.00/MTok | Generated response |

### Optimization Tips

1. **Preprocess logs**: Remove unnecessary verbosity before sending to Claude
2. ✅ **Prompt caching**: Implemented - reduces costs by 16-30% per analysis
3. **Orchestrate multi-server runs**: Run within 5-minute window to share cache
4. **Batch processing**: Analyze multiple days at once if appropriate
5. **Model selection**: Sonnet 4.5 provides best balance; use Haiku 4.5 for 3x cost savings if quality is sufficient

### Cost Monitoring

Check logs for real-time cost tracking:
```bash
tail -f logs/app.log | grep -E "API Usage|Cache|Estimated cost"
```

Example output:
```
[INFO] API Usage - Input: 2441 tokens, Output: 471 tokens, Total: 2912 tokens
[INFO] Cache - Created: 1559 tokens, Read: 0 tokens
[INFO] Estimated cost: $0.0144, Duration: 12405ms

# Next run (within 5 min)
[INFO] Cache - Read: 1559 tokens
[INFO] Cache savings: $0.0042 (21.4% reduction)
[INFO] Estimated cost: $0.0154, Duration: 12618ms
```

## Extending the AI Capabilities

### 1. Multi-Language Support

Add language detection and localization:

```javascript
// In prompts.js
const getAnalysisPrompt = (language = 'en') => {
  // Return localized prompts
};
```

### 2. Custom Alert Rules

Allow users to define custom patterns:

```javascript
// Add to config
custom_rules: [
  {
    pattern: "failed password",
    severity: "critical",
    message: "Potential brute force attack"
  }
]
```

### 3. Interactive Analysis

Enable follow-up questions via Telegram:

```javascript
// User asks: "Why are there so many failed logins?"
// Claude provides detailed explanation
```

### 4. Predictive Analysis

Use historical trends to predict issues:

```javascript
// Analyze trends and forecast potential problems
const prediction = await claude.predictIssues(historicalData);
```

## Security Considerations

### API Key Protection

- Store API key in `.env` file with 600 permissions
- Never commit API keys to version control
- Use environment-specific keys (dev/staging/prod)
- Rotate keys regularly

### Data Privacy

- Logwatch data may contain sensitive information
- Claude API processes data securely (Anthropic SOC 2 Type II certified)
- Consider data retention policies
- Review Anthropic's privacy policy: https://www.anthropic.com/privacy

### Prompt Injection

Current mitigations:
- Clear separation between instructions and data
- Structured output format
- Input validation

## Testing

### Unit Tests

```bash
npm test  # Runs configuration tests
```

### Integration Tests

```bash
# Test full pipeline
npm start

# Test specific components
node src/claude-client.js  # Direct Claude API test
```

### Manual Testing

```bash
# Generate test logwatch file using the cron script
sudo ./scripts/generate-logwatch.sh /tmp/test-logwatch.txt 0 yesterday

# Or directly with logwatch (detail level 0-10):
# sudo logwatch --output file --filename /tmp/test-logwatch.txt --format text --detail 5 --range yesterday

# Set path in .env
LOGWATCH_OUTPUT_PATH=/tmp/test-logwatch.txt

# Run analysis
npm start
```

**Note:** The analyzer now expects pre-generated logwatch files and does not generate them internally. See [docs/CRON_SETUP.md](docs/CRON_SETUP.md) for production setup.

## Performance

### Response Times

- Typical analysis: 3-8 seconds
- Large logs (>10K tokens): 10-15 seconds
- With historical analysis: +2-3 seconds

### Optimization

1. **Stream responses**: Already implemented
2. **Parallel processing**: Analyze multiple sections concurrently
3. **Caching**: Cache common responses
4. **Precompute**: Extract metrics before sending to Claude

## Troubleshooting

### Claude API Errors

**Rate Limits:**
```
Error: rate_limit_exceeded
Solution: Implement exponential backoff (already in code)
```

**Invalid Response:**
```
Error: JSON parsing failed
Solution: Check logs/app.log for raw response, refine prompt
```

**Timeout:**
```
Error: Request timeout
Solution: Reduce log size or increase timeout in config
```

### Quality Issues

**Generic Analysis:**
- Add more specific instructions to prompt
- Include examples of good analysis
- Increase context window

**Missing Issues:**
- Improve prompt to specifically ask about those patterns
- Add explicit rules for critical issues
- Include historical context

**False Positives:**
- Refine prompt to be more conservative
- Add filtering logic post-analysis
- Provide negative examples

### Preprocessing Issues

**Content Still Too Large:**
```
Error: Content exceeds Claude's context window after preprocessing
Solution: Lower MAX_PREPROCESSING_TOKENS (e.g., to 100000)
```

**Important Information Missing:**
```
Issue: Critical errors not appearing in Claude's analysis
Solution: Check logs for preprocessing stats. If too aggressive, increase MAX_PREPROCESSING_TOKENS or add patterns to HIGH priority in src/utils/preprocessor.js
```

**Preprocessing Disabled:**
```
Issue: Large files fail with context window error
Solution: Check ENABLE_PREPROCESSING is set to 'true' in .env
```

**Test Preprocessing:**
```bash
# Generate test file and validate preprocessing
node scripts/test-preprocessing.js

# Check preprocessing with your logwatch file
LOGWATCH_OUTPUT_PATH=/path/to/your/logwatch.txt node scripts/test-preprocessing.js
```

## Best Practices

1. **Prompt Engineering**
   - Be specific and explicit
   - Use structured output formats
   - Include examples
   - Test with various log types

2. **Error Handling**
   - Always validate Claude's responses
   - Have fallback logic
   - Log errors comprehensively
   - Retry transient failures

3. **Monitoring**
   - Track token usage
   - Monitor response quality
   - Log all API interactions
   - Set up alerts for failures

4. **Cost Control**
   - Set budget limits
   - Monitor daily usage
   - Optimize prompts
   - Consider caching

## Resources

- **Anthropic Documentation**: https://docs.anthropic.com
- **Claude API Reference**: https://docs.anthropic.com/en/api
- **Prompt Engineering Guide**: https://docs.anthropic.com/en/docs/prompt-engineering
- **SDKs**: https://github.com/anthropics

## Contributing

When modifying Claude integration:

1. Test thoroughly with various log types
2. Validate JSON output structure
3. Update prompts.js documentation
4. Monitor token usage impact
5. Update this document

## Future Enhancements

Planned improvements:

- [x] Implement prompt caching for cost reduction (✓ Completed in v1.1.0)
- [ ] Add support for Claude 4 Opus for deeper analysis
- [ ] Create custom analysis profiles (security-focused, performance-focused)
- [ ] Implement A/B testing for prompt variations
- [ ] Add sentiment analysis for system health trends
- [ ] Support for multiple logwatch instances
- [ ] Real-time analysis of streaming logs
- [ ] Integration with incident response workflows

## Version History

### v1.2.0 (Current)
- **Intelligent preprocessing** - Handles logwatch files up to ~800KB-1MB
- Token estimation and automatic content reduction
- Section-based priority classification (HIGH/MEDIUM/LOW)
- Moderate deduplication strategy
- Smart compression preserving critical information
- 30-60% typical size reduction for large files
- Zero configuration required (auto-enabled by default)
- Comprehensive test suite for preprocessing validation

### v1.1.0
- **Prompt caching implementation** - 16-30% cost savings per analysis
- Enhanced system prompt (~1,590 tokens) with comprehensive analysis framework
- Server-side cache sharing across multiple servers
- Cache statistics logging and monitoring
- Cost optimization for multi-server deployments
- Improved analysis quality with detailed security and system health guidelines

### v1.0.0
- Initial Claude integration
- Basic log analysis
- Telegram notifications
- Historical trend analysis
- SQLite storage

---

For questions or issues related to Claude integration, check the logs in `logs/app.log` or run diagnostic tests with `node scripts/test.js`.
