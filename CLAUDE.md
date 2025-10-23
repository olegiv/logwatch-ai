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

### Current Usage (Sonnet 4.5)

- **Daily analysis**: ~2,000-5,000 tokens
- **Monthly cost**: ~$0.59 (cost-effective)
- **Token breakdown**:
  - Input: ~1,500 tokens × $3/MTok = $0.0045
  - Output: ~1,000 tokens × $15/MTok = $0.015
  - Total per analysis: ~$0.0195

### Optimization Tips

1. **Preprocess logs**: Remove unnecessary verbosity before sending to Claude
2. **Use caching**: Implement prompt caching for repeated system prompts (can reduce costs by 90%)
3. **Batch processing**: Analyze multiple days at once if appropriate
4. **Model selection**: Sonnet 4.5 provides best balance; use Haiku 4.5 for 3x cost savings if quality is sufficient

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
# Generate test logwatch file
sudo logwatch --output stdout --format text --range yesterday > /tmp/test-logwatch.txt

# Set path in .env
LOGWATCH_OUTPUT_PATH=/tmp/test-logwatch.txt

# Run analysis
npm start
```

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

- [ ] Implement prompt caching for cost reduction
- [ ] Add support for Claude 4 Opus for deeper analysis
- [ ] Create custom analysis profiles (security-focused, performance-focused)
- [ ] Implement A/B testing for prompt variations
- [ ] Add sentiment analysis for system health trends
- [ ] Support for multiple logwatch instances
- [ ] Real-time analysis of streaming logs
- [ ] Integration with incident response workflows

## Version History

### v1.0.0 (Current)
- Initial Claude integration
- Basic log analysis
- Telegram notifications
- Historical trend analysis
- SQLite storage

---

For questions or issues related to Claude integration, check the logs in `logs/app.log` or run diagnostic tests with `node scripts/test.js`.
