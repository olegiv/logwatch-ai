# macOS Setup Guide for Logwatch AI Analyzer

This guide provides macOS-specific instructions for using the Logwatch AI Analyzer.

## Issue: Permission Problems with sudo logwatch

When running `sudo logwatch`, the output file is created as `root:wheel` with `600` permissions, which prevents the Node.js application from reading it.

## Solutions

### Option 1: Use the Helper Script (Recommended)

Use the provided script that handles permissions automatically:

```bash
# Generate logwatch for yesterday
./scripts/generate-logwatch.sh yesterday

# Generate logwatch for today
./scripts/generate-logwatch.sh today

# Generate logwatch for last 7 days
./scripts/generate-logwatch.sh "between -7 days and today"

# Then run the analyzer
npm start
```

The script automatically:
1. Runs logwatch with sudo
2. Fixes file permissions (644)
3. Changes ownership to your user account
4. Verifies the file is readable

### Option 2: Manual Command

Run both commands together:

```bash
sudo /opt/local/bin/logwatch --output file --filename /tmp/logwatch-output.txt --format text --range yesterday && \
sudo chmod 644 /tmp/logwatch-output.txt && \
sudo chown $(whoami):staff /tmp/logwatch-output.txt
```

### Option 3: Passwordless sudo (For Automation)

If you want to automate with cron without password prompts:

1. Edit sudoers file:
```bash
sudo visudo
```

2. Add this line (replace `yourusername` with your actual username):
```
yourusername ALL=(ALL) NOPASSWD: /opt/local/bin/logwatch
yourusername ALL=(ALL) NOPASSWD: /bin/chmod /tmp/logwatch-output.txt
```

3. Save and exit (Ctrl+X, then Y, then Enter)

Now the analyzer can auto-generate logwatch reports without password prompts.

## Complete Workflow

### Manual Execution

```bash
# Step 1: Generate logwatch report with proper permissions
./scripts/generate-logwatch.sh yesterday

# Step 2: Run the analyzer
npm start
```

### Automated Execution with Cron

1. Set up passwordless sudo (see Option 3 above)

2. Add to crontab:
```bash
crontab -e
```

3. Add this line for daily 6 AM execution:
```bash
0 6 * * * cd /Users/olegiv/Desktop/Projects/AI/logwatch-ai && ./scripts/generate-logwatch.sh yesterday && /usr/local/bin/node src/analyzer.js >> logs/cron.log 2>&1
```

### One-Line Execution

For convenience, create an alias in your `.zshrc` or `.bash_profile`:

```bash
alias analyze-logs='cd /Users/olegiv/Desktop/Projects/AI/logwatch-ai && ./scripts/generate-logwatch.sh yesterday && npm start'
```

Then just run:
```bash
analyze-logs
```

## Troubleshooting

### "Permission denied" when reading logwatch file

**Problem:** File is owned by root with 600 permissions

**Solution:** Use the generate-logwatch.sh script or manually fix permissions:
```bash
sudo chmod 644 /tmp/logwatch-output.txt
sudo chown $(whoami):staff /tmp/logwatch-output.txt
```

### "sudo requires password" in cron

**Problem:** Cron cannot prompt for password

**Solution:** Set up passwordless sudo for logwatch (see Option 3)

### Logwatch not found

**Problem:** Logwatch not installed or wrong path

**Solution:**
```bash
# Install via MacPorts
sudo port install logwatch

# Or find the correct path
which logwatch
```

## macOS vs Linux Differences

| Feature | Linux | macOS |
|---------|-------|-------|
| Default logwatch path | `/usr/sbin/logwatch` | `/opt/local/bin/logwatch` |
| Default output | `/var/cache/logwatch/` | Use `/tmp/` |
| Cron service | `systemd` or `cron` | `launchd` or `cron` |
| Log locations | `/var/log/*` | `/var/log/*` and system logs |

## Alternative: launchd (macOS Native Scheduler)

Instead of cron, you can use launchd:

1. Create file: `~/Library/LaunchAgents/com.logwatch.analyzer.plist`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.logwatch.analyzer</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>cd /Users/olegiv/Desktop/Projects/AI/logwatch-ai && ./scripts/generate-logwatch.sh yesterday && /usr/local/bin/node src/analyzer.js</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>6</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/Users/olegiv/Desktop/Projects/AI/logwatch-ai/logs/launchd.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/olegiv/Desktop/Projects/AI/logwatch-ai/logs/launchd-error.log</string>
</dict>
</plist>
```

2. Load the agent:
```bash
launchctl load ~/Library/LaunchAgents/com.logwatch.analyzer.plist
```

3. Test it:
```bash
launchctl start com.logwatch.analyzer
```

## Summary

**For manual use:** Use `./scripts/generate-logwatch.sh` then `npm start`

**For automation:** Set up passwordless sudo + cron or use launchd

**Quick test:** `./scripts/generate-logwatch.sh today && npm start`
