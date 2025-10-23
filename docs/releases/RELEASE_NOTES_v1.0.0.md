# 🎉 Logwatch AI Analyzer v1.0.0

> **First stable release** - AI-powered system log analysis with intelligent insights delivered via Telegram

## Overview

Logwatch AI Analyzer is an automated system that transforms raw logwatch reports into actionable intelligence using Claude AI (Anthropic). Get daily security and system health reports delivered directly to your private Telegram channel with intelligent prioritization, trend analysis, and expert recommendations.

## ✨ Key Features

### 🤖 AI-Powered Analysis
- **Claude Sonnet 4** integration for intelligent log analysis
- Automatic detection and prioritization of critical issues
- Context-aware explanations in plain language
- Actionable recommendations for every finding
- Historical trend analysis and anomaly detection

### 📱 Telegram Integration
- **Private channel support** with access control
- Beautifully formatted reports with markdown
- Team collaboration with read-only member access
- Permanent message history
- Real-time delivery of daily summaries

### 📊 Smart Monitoring
- Critical issue detection (security events, failed logins, errors)
- Warning identification (non-critical but concerning issues)
- Key metrics tracking (disk usage, login attempts, service status)
- System health scoring (Excellent → Awful)
- Automated daily scheduling via cron

### 💾 Data Management
- **SQLite database** for historical storage
- 90-day automatic data retention
- Trend analysis across time periods
- Query and review past analyses
- Cost tracking and usage statistics

### 🛡️ Security & Reliability
- **Zero vulnerabilities** in dependencies
- Secure API key management
- Rate limiting and retry logic
- Comprehensive error handling
- Detailed logging for debugging

## 📦 What's Included

### Core Components
- `src/analyzer.js` - Main orchestrator
- `src/claude-client.js` - Claude AI integration
- `src/telegram-client.js` - Telegram channel handler
- `src/logwatch-reader.js` - Log file parser
- `src/storage.js` - SQLite database manager
- `src/utils/logger.js` - Logging system
- `src/utils/prompts.js` - AI prompt templates

### Scripts & Tools
- `scripts/install.sh` - Automated installation
- `scripts/test.js` - Configuration validation
- `scripts/get-channel-id.js` - Telegram channel ID helper
- `scripts/generate-logwatch.sh` - Logwatch wrapper (macOS/Linux)

### Documentation
- `README.md` - Complete user guide
- `CLAUDE.md` - Claude AI integration guide
- `MACOS_SETUP.md` - macOS-specific instructions
- Configuration templates and examples

## 🚀 Quick Start

### Prerequisites
- **Node.js 20+** (enforced via package.json)
- **npm 10+**
- logwatch installed
- Claude API key ([get one here](https://console.anthropic.com/))
- Telegram bot token ([create via @BotFather](https://t.me/botfather))

### Installation

```bash
# Clone repository
git clone https://github.com/olegiv/logwatch-ai.git
cd logwatch-ai

# Run automated installation
chmod +x scripts/install.sh
./scripts/install.sh

# Configure API keys
nano .env
# Add: ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID

# Test configuration
node scripts/test.js

# Run first analysis
npm start
```

### Telegram Channel Setup

1. **Create bot** with [@BotFather](https://t.me/botfather)
2. **Create private channel** in Telegram
3. **Add bot as administrator** with "Post Messages" permission
4. **Get channel ID**: `node scripts/get-channel-id.js`
5. **Update .env** with the channel ID

Detailed setup instructions available in [README.md](README.md#4-setup-telegram-notifications).

## 📋 System Requirements

### Minimum Requirements
- **OS**: Ubuntu 24.04 LTS, Debian 12, macOS 12+ (or similar)
- **Node.js**: 20.0.0 or higher (strictly enforced)
- **npm**: 10.0.0 or higher
- **Memory**: 512MB RAM
- **Disk**: 100MB free space
- **Network**: Internet connection for API calls

### Recommended Setup
- **Node.js**: 22.x LTS
- **Memory**: 1GB+ RAM for better performance
- **Disk**: 1GB+ for logs and database
- Dedicated VM or container for production use

## 📦 Dependencies

All dependencies are at their latest stable versions with zero vulnerabilities:

| Package | Version | Purpose |
|---------|---------|---------|
| `@anthropic-ai/sdk` | 0.67.0 | Claude AI API client |
| `better-sqlite3` | 12.4.1 | Fast SQLite database |
| `date-fns` | 4.1.0 | Date/time formatting |
| `dotenv` | 17.2.3 | Environment configuration |
| `grammy` | 1.38.3 | Modern Telegram bot framework |

## 🔒 Security

### Implemented Measures
- ✅ No known vulnerabilities (`npm audit`)
- ✅ Secure API key storage in `.env` (600 permissions)
- ✅ Input validation and sanitization
- ✅ Markdown escaping for Telegram messages
- ✅ Rate limiting for API calls
- ✅ No sensitive data in logs

### Best Practices
- Store API keys in environment variables only
- Use private Telegram channels (not groups)
- Rotate API keys regularly
- Review logs for anomalies
- Keep dependencies updated
- Use dedicated service account for cron jobs

## 💰 Cost Estimation

### Claude API Usage
- **Model**: Claude Sonnet 4 (`claude-sonnet-4-20250514`)
- **Daily tokens**: ~2,000-5,000 (varies with log size)
- **Monthly cost**: $0.10 - $0.50 (approximate)

Cost breakdown:
- Input: ~1,500 tokens @ $3/million
- Output: ~500-1,000 tokens @ $15/million

*Actual costs depend on log volume and complexity.*

## 🎯 Use Cases

### Perfect For
- **System administrators** monitoring multiple servers
- **DevOps teams** tracking infrastructure health
- **Security professionals** identifying threats
- **Small businesses** automating log review
- **Hobbyists** learning about system security

### Example Scenarios
- Daily security audit summaries
- Failed login attempt alerts
- Disk space warnings
- Service failure notifications
- Trend analysis over time
- Compliance reporting

## 🆕 What's New in v1.0.0

### Major Features
✅ **Telegram Channel Support** - Private channels with team collaboration
✅ **Node.js 20+ Enforcement** - Strict version requirements via engines field
✅ **Latest Dependencies** - All packages updated to stable versions
✅ **Zero Vulnerabilities** - Complete security audit passing
✅ **Channel ID Helper** - New script for easy Telegram setup
✅ **Comprehensive Documentation** - Complete guides for all platforms

### Recent Improvements
- Fixed markdown escaping issues in Telegram messages
- Added nvm support with `.nvmrc` file
- Improved error handling and logging
- Enhanced cron job examples for Linux and macOS
- Standardized project naming to `logwatch-ai`
- Added `.gitattributes` for consistent line endings

### Breaking Changes
- **TELEGRAM_CHAT_ID** renamed to **TELEGRAM_CHANNEL_ID**
  - Update your `.env` file: `TELEGRAM_CHAT_ID` → `TELEGRAM_CHANNEL_ID`
  - Channels are now the recommended approach (private channels only)
- **Node.js 20+** now required (enforced with `engine-strict`)
  - Upgrade Node.js if using version 18 or older

## 📚 Documentation

- **[README.md](README.md)** - Complete user guide and setup instructions
- **[CLAUDE.md](CLAUDE.md)** - Claude AI integration details and customization
- **[MACOS_SETUP.md](MACOS_SETUP.md)** - macOS-specific setup guide
- **[logwatch-analyzer-implementation.md](logwatch-analyzer-implementation.md)** - Implementation reference

## 🐛 Known Issues

None at this time. Report issues at: https://github.com/olegiv/logwatch-ai/issues

## 🔮 Future Roadmap

Planned for future releases:
- [ ] Web dashboard for viewing historical reports
- [ ] Multi-server support with aggregated reports
- [ ] Custom alert rules and thresholds
- [ ] Integration with other monitoring tools (Prometheus, Grafana)
- [ ] Email notification support
- [ ] Docker container for easy deployment
- [ ] Real-time log streaming analysis
- [ ] Claude 4 Opus support for deeper analysis
- [ ] Prompt caching for cost reduction

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

See issues labeled `good first issue` for beginner-friendly tasks.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Anthropic** - For the incredible Claude AI API
- **Telegram** - For the robust Bot API
- **Node.js Community** - For excellent packages and tools
- **logwatch** - For system log aggregation

## 📞 Support

- **Issues**: https://github.com/olegiv/logwatch-ai/issues
- **Discussions**: https://github.com/olegiv/logwatch-ai/discussions
- **Author**: Oleg Ivanchenko

## 🎉 Try It Now!

```bash
git clone https://github.com/olegiv/logwatch-ai.git
cd logwatch-ai
./scripts/install.sh
```

Transform your system logs into actionable intelligence today! 🚀

---

**Full Changelog**: https://github.com/olegiv/logwatch-ai/commits/v1.0.0

*Generated with [Claude Code](https://claude.com/claude-code)*
