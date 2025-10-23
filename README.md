# Logwatch AI Analyzer

An automated system that analyzes logwatch reports using Claude AI and sends summarized insights via Telegram bot.

## Features

- Daily automated logwatch analysis using Claude AI
- Intelligent summarization of system logs
- Critical issue detection and prioritization
- Actionable recommendations
- Telegram notifications with formatted reports
- Historical trend analysis
- SQLite database for storing analysis history
- Comprehensive error handling and logging

## Requirements

- Ubuntu 24.04.2 LTS (or similar Linux distribution)
- Node.js 20 or higher
- logwatch installed (`sudo apt-get install logwatch`)
- Claude API key (Anthropic)
- Telegram Bot token and chat ID

## Quick Start

### 1. Clone or Download

```bash
cd /opt
git clone https://github.com/olegiv/logwatch-ai.git logwatch-ai
# OR download and extract the project files
```

### 2. Run Installation Script

```bash
cd logwatch-ai
chmod +x scripts/install.sh
./scripts/install.sh
```

The installation script will:
- Check prerequisites (Node.js, npm, logwatch)
- Install Node.js dependencies
- Create necessary directories
- Set up environment configuration
- Configure cron job for daily execution
- Optionally create systemd service

### 3. Configure API Keys

Edit the `.env` file and add your credentials:

```bash
nano .env
```

Required settings:
```env
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
TELEGRAM_BOT_TOKEN=your-bot-token-here
TELEGRAM_CHANNEL_ID=your-channel-id-here
```

### 4. Setup Telegram Notifications

You can send logwatch reports to either a private chat or a Telegram channel. **Channels are recommended** for better organization and access control.

#### Option A: Telegram Channel (Recommended)

A Telegram channel allows you to:
- Control who can view reports (private channel)
- Keep a permanent history of all reports
- Share access with team members
- Separate notifications from personal messages

**Step 1: Create a Telegram Bot**
1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` and follow instructions
3. Choose a name (e.g., "Logwatch Reporter")
4. Choose a username (e.g., "my_logwatch_bot")
5. Copy the bot token - you'll need this for `.env`

**Step 2: Create a Private Channel**
1. In Telegram, click menu (☰) → **New Channel**
2. Enter channel name (e.g., "Logwatch Reports")
3. Add description (optional): "Automated system log analysis reports"
4. Choose **Private Channel** (only invited users can access)
5. Click **Create**
6. Skip adding subscribers for now (you can add later)

**Step 3: Add Bot as Administrator**
1. Open your channel
2. Click on the channel name at the top
3. Click **Administrators** → **Add Administrator**
4. Search for your bot by username (e.g., `@my_logwatch_bot`)
5. Give the bot permission to **Post Messages** (uncheck other permissions)
6. Click **Done**

**Step 4: Get Channel ID**
1. Post any message to your channel (this is required)
2. Run the helper script:
   ```bash
   node scripts/get-channel-id.js
   ```
3. Copy the channel ID (looks like `-1001234567890`)
4. Update your `.env` file with:
   ```env
   TELEGRAM_CHANNEL_ID=-1001234567890
   ```

**Step 5: Invite Team Members (Optional)**
1. Open your channel → Channel Info
2. Click **Subscribers**
3. Click **Add Subscribers**
4. Search and add team members who should see reports
5. Members will receive reports but cannot post (read-only access)

#### Option B: Direct Chat with Bot

For personal use, you can send reports to a private chat:

1. Create bot with [@BotFather](https://t.me/botfather) (same as Step 1 above)
2. Copy the bot token to your `.env` file
3. Open your bot in Telegram and send `/start`
4. Get your chat ID:
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Look for `"chat":{"id":123456789`
   - Copy the numeric ID
5. Update `.env` with:
   ```env
   TELEGRAM_CHANNEL_ID=123456789
   ```

**Note:** Using a channel is preferred as it provides better organization and team collaboration.

### 5. Test Configuration

```bash
node scripts/test.js
```

This will validate:
- Configuration files
- API connections (Claude and Telegram)
- Database operations
- File permissions
- Logwatch availability

### 6. Run Manual Test

```bash
npm start
```

This will run a complete analysis cycle and send a report to Telegram.

## Project Structure

```
logwatch-ai/
├── package.json              # Node.js dependencies
├── .env                      # Environment configuration (create from .env.template)
├── .env.template             # Environment template
├── README.md                 # This file
├── config/
│   └── config.js             # Configuration loader
├── src/
│   ├── analyzer.js           # Main orchestrator
│   ├── claude-client.js      # Claude API client
│   ├── telegram-client.js    # Telegram bot client
│   ├── logwatch-reader.js    # Logwatch file reader
│   ├── storage.js            # SQLite database handler
│   └── utils/
│       ├── logger.js         # Logging utility
│       └── prompts.js        # Claude prompts
├── logs/
│   ├── app.log               # Application logs
│   └── cron.log              # Cron execution logs
├── data/
│   └── summaries.db          # SQLite database
└── scripts/
    ├── install.sh            # Installation script
    ├── test.js               # Configuration test script
    └── get-channel-id.js     # Helper to get Telegram channel ID
```

## Usage

### Automatic Execution

The system runs automatically via cron at 6:00 AM daily:

```bash
# View current cron jobs
crontab -l

# Edit cron schedule
crontab -e
```

**Add this line to your crontab:**

For Linux:
```cron
# Logwatch AI Analyzer - Daily at 6:00 AM
0 6 * * * cd /opt/logwatch-ai && ./scripts/generate-logwatch.sh yesterday && /usr/local/bin/node src/analyzer.js >> logs/cron.log 2>&1
```

For macOS:
```cron
# Logwatch AI Analyzer - Daily at 6:00 AM
0 6 * * * cd /Users/yourusername/Desktop/Projects/AI/logwatch-ai && ./scripts/generate-logwatch.sh yesterday && /usr/local/bin/node src/analyzer.js >> logs/cron.log 2>&1
```

**Notes:**
- Replace paths according to your installation directory
- Use `which node` to find your Node.js path
- The `generate-logwatch.sh` script handles logwatch execution and permission fixes
- Requires passwordless sudo for logwatch (see MACOS_SETUP.md for instructions)

### Manual Execution

```bash
# Run analyzer
npm start

# Or with node directly
node src/analyzer.js

# Using systemd (if configured)
sudo systemctl start logwatch-ai
```

### View Logs

```bash
# Application logs
tail -f logs/app.log

# Cron execution logs
tail -f logs/cron.log

# View last 100 lines
tail -n 100 logs/app.log
```

### Database Management

```bash
# View database statistics
sqlite3 data/summaries.db "SELECT COUNT(*) FROM summaries;"

# View recent summaries
sqlite3 data/summaries.db "SELECT date, critical_count, warning_count FROM summaries ORDER BY timestamp DESC LIMIT 10;"

# Cleanup old entries (older than 90 days is done automatically)
```

## Configuration Options

Edit `.env` to customize behavior:

```env
# Claude API
ANTHROPIC_API_KEY=sk-ant-xxxxx
CLAUDE_MODEL=claude-sonnet-4-20250514

# Telegram Bot
TELEGRAM_BOT_TOKEN=xxxxx
TELEGRAM_CHANNEL_ID=xxxxx

# Logwatch
LOGWATCH_OUTPUT_PATH=/tmp/logwatch-output.txt
MAX_LOG_SIZE_MB=10

# Application
NODE_ENV=production
LOG_LEVEL=info              # debug, info, warn, error
ENABLE_DATABASE=true
DATABASE_PATH=./data/summaries.db
```

## Telegram Message Format

The Telegram bot sends formatted messages with:

- 📊 Summary: Brief overview of system health
- ⚠️ Critical Issues: Urgent problems requiring attention
- ⚡ Warnings: Non-critical but concerning issues
- 💡 Recommendations: Actionable steps
- 📈 Key Metrics: Important numbers (failed logins, errors, disk usage)

## Troubleshooting

### No logwatch output file

Generate manually:
```bash
sudo logwatch --output file --filename /tmp/logwatch-output.txt --format text --range yesterday
```

Then update `LOGWATCH_OUTPUT_PATH` in `.env`

### Permission denied errors

```bash
# Fix .env permissions
chmod 600 .env

# Fix directory ownership
sudo chown -R $USER:$USER /opt/logwatch-ai

# Fix log directory permissions
chmod 755 logs data
```

### Claude API errors

- Verify API key is correct in `.env`
- Check API key has sufficient credits
- Review `logs/app.log` for detailed error messages

### Telegram not receiving messages

**For channels:**
- Verify bot is added as **administrator** to the channel
- Bot must have **Post Messages** permission
- Post a test message to the channel after adding the bot
- Run `node scripts/get-channel-id.js` to verify the channel ID
- Channel ID should start with `-100` (e.g., `-1001234567890`)
- Check `logs/app.log` for detailed error messages

**For direct chats:**
- Verify bot token and chat ID are correct
- Send `/start` to your bot first
- Ensure bot is not blocked
- Chat ID should be a positive number (e.g., `123456789`)

**General troubleshooting:**
- Test with: `node scripts/test.js`
- Verify credentials in `.env` are correct
- Check `logs/app.log` for delivery errors
- Try sending a test message: `node src/analyzer.js`

### Cron job not running

```bash
# Check cron service status
sudo systemctl status cron

# View cron logs
grep CRON /var/log/syslog

# Test cron job manually
cd /opt/logwatch-ai && node src/analyzer.js
```

## Security Considerations

- `.env` file contains sensitive credentials - keep it secure (600 permissions)
- API keys are never logged
- Database stores only analysis summaries, not raw logs
- Logwatch files are read-only access
- Consider using environment-specific API keys

## Cost Estimation

Claude API costs (approximate, as of 2025):
- Input: $3 per million tokens
- Output: $15 per million tokens
- Typical daily analysis: ~2,000-5,000 tokens
- Estimated monthly cost: $0.10 - $0.50

## Maintenance

### Log Rotation

Logs are automatically rotated when they exceed 10MB. Maximum 5 log files are kept.

### Database Cleanup

Database automatically removes entries older than 90 days during each run.

### Updates

```bash
cd /opt/logwatch-ai
git pull  # if using git
npm install  # update dependencies
```

## Uninstallation

```bash
# Remove cron job
crontab -e
# Delete the logwatch-ai line

# Remove systemd service (if created)
sudo systemctl stop logwatch-ai
sudo systemctl disable logwatch-ai
sudo rm /etc/systemd/system/logwatch-ai.service
sudo systemctl daemon-reload

# Remove installation directory
sudo rm -rf /opt/logwatch-ai
```

## License

MIT

## Support

For issues, questions, or contributions:
- Check logs: `logs/app.log`
- Run tests: `node scripts/test.js`
- Review configuration: `.env` and `config/config.js`

## Changelog

### Version 1.0.0
- Initial release
- Claude AI integration
- Telegram notifications
- SQLite database storage
- Historical trend analysis
- Automatic cron scheduling
- Comprehensive error handling
