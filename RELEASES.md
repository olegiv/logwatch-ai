# Release History

This document provides a summary of all releases for Logwatch AI Analyzer.

---

## Version 1.1.0 (October 24, 2025)

**Type**: Minor Release - Feature Update

### Highlights
- ✨ **Prompt caching implementation** - 16-30% cost savings
- 📊 Enhanced AI analysis with expanded prompts
- 💰 Monthly cost reduction from ~$0.59 to ~$0.47
- 📈 Server-side cache sharing for multi-server deployments

### Features
- Prompt caching with 5-minute TTL
- Cache statistics logging and monitoring
- Enhanced system prompt (~1,590 tokens)
- Comprehensive analysis framework
- Improved security threat detection
- Better recommendation generation

### Cost Impact
- **Single server**: 20% monthly savings (~$0.12/month)
- **10 servers**: 27% total savings when orchestrated
- **Per analysis**: $0.0154 (cached) vs $0.0195 (uncached)

### Technical Changes
- Modified `src/claude-client.js` for cache control
- Enhanced `src/utils/prompts.js` with split prompts
- Added cache monitoring and statistics
- Removed deprecated beta header

### Migration
- ✅ Zero breaking changes
- ✅ No configuration updates needed
- ✅ Automatic cost savings
- ✅ Backward compatible

**Full Release Notes**: [RELEASE_NOTES_v1.1.0.md](./RELEASE_NOTES_v1.1.0.md)

---

## Version 1.0.0 (October 22, 2025)

**Type**: Initial Release

### Highlights
- 🎉 Initial public release
- 🤖 Claude AI integration for log analysis
- 📱 Telegram bot notifications
- 🗄️ SQLite database for history
- 📊 Historical trend analysis

### Features
- Automated daily logwatch analysis
- Claude Sonnet 4.5 integration
- Intelligent issue prioritization
- Two-channel Telegram reporting:
  - Archive channel (all reports)
  - Alerts channel (issues only)
- Critical issue detection
- Actionable recommendations
- Metrics extraction
- Historical context integration

### Components
- Claude API client with retry logic
- Telegram bot integration
- SQLite storage system
- Logwatch file reader
- Comprehensive logging
- Error handling

### Cost
- ~$0.59/month per server
- ~$0.0195 per analysis

### Setup
- Installation script included
- Cron job automation
- Systemd service support
- Configuration validation

**Documentation**: [README.md](./README.md), [CLAUDE.md](./CLAUDE.md)

---

## Upgrade Paths

### From 1.0.0 to 1.1.0
```bash
cd /opt/logwatch-ai
git pull
npm install
npm test
```

**Result**: Automatic 20% cost reduction, no configuration changes needed.

---

## Version Support

| Version | Release Date | Status | Support Until |
|---------|--------------|--------|---------------|
| 1.1.0 | Oct 24, 2025 | ✅ Current | Ongoing |
| 1.0.0 | Oct 22, 2025 | ⚠️ Superseded | Dec 31, 2025 |

---

## Deprecation Notices

None at this time.

---

## Security Advisories

None at this time.

---

## Breaking Changes History

### v1.1.0
- None (backward compatible)

### v1.0.0
- Initial release (no prior versions)

---

## Future Roadmap

### Planned for v1.2.0
- Custom analysis profiles
- Enhanced multi-server orchestration tools
- Improved trend analysis

### Under Consideration
- 1-hour cache option implementation
- Real-time log streaming
- Interactive Telegram commands
- Support for Claude Opus 4
- A/B testing framework

See [CLAUDE.md - Future Enhancements](./CLAUDE.md#future-enhancements) for full roadmap.

---

## Download Links

### Latest Release (v1.1.0)
- **Source**: https://github.com/olegiv/logwatch-ai
- **Tag**: v1.1.0
- **Commit**: TBD

### Previous Releases
- **v1.0.0**: Tag `v1.0.0`

---

## Release Statistics

| Metric | v1.0.0 | v1.1.0 | Change |
|--------|--------|--------|--------|
| Files | 15 | 17 | +2 |
| Lines of Code | ~1,200 | ~1,400 | +200 |
| Dependencies | 7 | 7 | 0 |
| Documentation Pages | 2 | 3 | +1 |
| Monthly Cost | $0.59 | $0.47 | -20% |
| Features | 8 | 9 | +1 |

---

## Getting Started

### New Installation
```bash
cd /opt
git clone https://github.com/olegiv/logwatch-ai.git
cd logwatch-ai
./scripts/install.sh
```

### Quick Update to Latest
```bash
cd /opt/logwatch-ai
git pull
npm install
npm start  # Test run
```

### Version Check
```bash
# Check installed version
grep "Version" RELEASES.md | head -1

# Or check package.json
cat package.json | grep version
```

---

## Support

For version-specific issues:
- **v1.1.0**: See [RELEASE_NOTES_v1.1.0.md](./RELEASE_NOTES_v1.1.0.md)
- **General**: See [README.md](./README.md)
- **Claude Integration**: See [CLAUDE.md](./CLAUDE.md)

---

Last updated: October 24, 2025
