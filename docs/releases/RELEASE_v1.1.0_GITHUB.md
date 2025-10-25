# Release v1.1.0 - Prompt Caching for Cost Optimization

**Release Date**: October 24, 2025

## Overview

Introduces **prompt caching** for Claude API calls, delivering **16-30% cost savings** per analysis with zero configuration required.

## Key Features

**Prompt Caching**: 16-30% automatic cost reduction, ~$0.12/month savings per server, up to 27% savings across multiple servers within 5-minute cache window. Zero setup required.

**Enhanced AI Analysis**: System prompt expanded from ~320 to ~1,590 tokens with improved security detection, health assessment, and actionable recommendations.

**Cost Monitoring**: Real-time cache statistics, savings calculations, and token usage breakdown in logs.

## What's Changed

**Modified:**
- `src/claude-client.js` - Cache control and statistics logging
- `src/utils/prompts.js` - Split into cached system + dynamic user prompts

**New:**
- `scripts/test-caching.js` - Test caching functionality
- `scripts/check-prompt-size.js` - Verify prompt threshold

## Upgrade

```bash
git pull && npm start
```

Verify caching: `tail -f logs/app.log | grep Cache`

## Cost Comparison

| Scenario | v1.0.0 | v1.1.0 | Savings |
|----------|---------|---------|---------|
| Per analysis | $0.0195 | $0.0154 | 21% ↓ |
| Monthly | $0.59 | $0.47 | 20% ↓ |

## Breaking Changes

None - fully backward-compatible.

**Full Changelog**: https://github.com/olegiv/logwatch-ai/compare/v1.0.0...v1.1.0
