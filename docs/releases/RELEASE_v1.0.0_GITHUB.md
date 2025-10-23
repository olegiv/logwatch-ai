# 🎉 Logwatch AI Analyzer v1.0.0 - First Stable Release

> AI-powered system log analysis with intelligent insights delivered via Telegram

## What is Logwatch AI Analyzer?

An automated system that transforms raw logwatch reports into actionable intelligence using **Claude AI** (Anthropic). Get daily security and system health reports delivered to your private **Telegram channel** with intelligent prioritization, trend analysis, and expert recommendations.

## ✨ Key Features

🤖 **AI-Powered Analysis** - Claude Sonnet 4 for intelligent log interpretation
📱 **Telegram Channels** - Private channels with team collaboration
📊 **Smart Monitoring** - Critical issues, warnings, and key metrics
💾 **Historical Tracking** - SQLite database with 90-day retention
🛡️ **Zero Vulnerabilities** - All dependencies secure and up-to-date
⚡ **Automated Scheduling** - Daily cron job execution

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/olegiv/logwatch-ai.git
cd logwatch-ai
./scripts/install.sh

# Configure (add your API keys)
nano .env

# Test
node scripts/test.js

# Run
npm start
```

**Requirements**: Node.js 20+, Claude API key, Telegram bot

## 📦 What's New

### Major Features ✨
- ✅ **Telegram Channel Support** - Private channels instead of chats
- ✅ **Node.js 20+ Enforcement** - Strict version requirements
- ✅ **Latest Dependencies** - All packages at stable versions
- ✅ **Zero Vulnerabilities** - Complete security audit passing
- ✅ **Channel Setup Helper** - `scripts/get-channel-id.js`

### Dependencies 📦
- `@anthropic-ai/sdk` **0.67.0** (was 0.32.0)
- `better-sqlite3` **12.4.1** (was 11.7.0)
- `dotenv` **17.2.3** (was 16.4.5)
- `date-fns` **4.1.0** ✓
- `grammy` **1.38.3** ✓

### Recent Improvements 🔧
- Fixed markdown escaping in Telegram messages
- Added nvm support (`.nvmrc`)
- Enhanced error handling and logging
- Improved documentation for all platforms
- Standardized project naming

## ⚠️ Breaking Changes

1. **Environment Variable Renamed**
   ```diff
   - TELEGRAM_CHAT_ID=123456789
   + TELEGRAM_CHANNEL_ID=-1001234567890
   ```
   Update your `.env` file accordingly.

2. **Node.js Version Required**
   - Minimum: **Node.js 20.0.0**
   - Recommended: **Node.js 22.x LTS**
   - Installation will fail on older versions

## 💰 Cost Estimate

- **~$0.10-$0.50/month** for Claude API
- **Free** for Telegram
- Based on daily analysis of typical logwatch output

## 📚 Documentation

- **[Complete Setup Guide](README.md)**
- **[Claude Integration](CLAUDE.md)**
- **[macOS Setup](MACOS_SETUP.md)**

## 🔒 Security

✅ npm audit: **0 vulnerabilities**
✅ All dependencies: **Latest stable versions**
✅ Tests: **19/19 passing**

## 🎯 Perfect For

- System administrators monitoring servers
- DevOps teams tracking infrastructure
- Security professionals identifying threats
- Anyone wanting automated log analysis

## 📸 Example Report

```
🔍 Logwatch Analysis Report
🖥 Host: production-server
📅 Date: 2025-10-23 06:00:00
✅ Status: Good

📊 Summary
System is running normally with 2 warnings detected...

⚠️ Critical Issues (0)
None detected

⚡ Warnings (2)
• 15 failed SSH login attempts from IP 192.168.1.x
• Disk usage at 78% on /var partition

💡 Recommendations
• Review SSH access logs for brute force patterns
• Consider enabling fail2ban for SSH protection
• Schedule disk cleanup or expansion for /var
```

## 🤝 Contributing

Contributions welcome! Check out issues labeled `good first issue`.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/olegiv/logwatch-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/olegiv/logwatch-ai/discussions)

## 📄 License

MIT License

---

**Full Changelog**: https://github.com/olegiv/logwatch-ai/compare/...v1.0.0

**Installation Guide**: [README.md](README.md)

*Built with ❤️ using Claude AI*
