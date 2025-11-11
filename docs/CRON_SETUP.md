# Cron Setup for Logwatch Generation

This document explains how to set up automated logwatch report generation using cron.

## Overview

The Logwatch AI Analyzer no longer generates logwatch reports internally. Instead, a cron job runs the `scripts/generate-logwatch.sh` script to generate reports on a schedule, and the analyzer simply reads the pre-generated files.

**Benefits:**
- ✅ No sudo required in JavaScript code
- ✅ Better security (separation of privileges)
- ✅ Simpler application architecture
- ✅ Easier monitoring and debugging
- ✅ Works in restricted environments

## Installation

### Step 1: Test the Script Manually

First, verify the script works correctly:

```bash
# Test as root
sudo /path/to/logwatch-ai/scripts/generate-logwatch.sh

# Check the generated file
ls -l /tmp/logwatch-output.txt
cat /tmp/logwatch-output.txt
```

### Step 2: Install Cron Job

#### Option A: Daily Report (Recommended)

Generate logwatch reports daily at 2:00 AM:

```bash
# Edit root's crontab
sudo crontab -e

# Add this line:
0 2 * * * /path/to/logwatch-ai/scripts/generate-logwatch.sh
```

**Explanation:**
- `0 2 * * *` - Run at 2:00 AM every day
- Script generates report for "yesterday"
- Uses default detail level (0 - minimal verbosity)
- Outputs to `/tmp/logwatch-output.txt`

#### Option B: Custom Schedule

```bash
# Run every 6 hours
0 */6 * * * /path/to/logwatch-ai/scripts/generate-logwatch.sh

# Run at 3:00 AM with custom settings
0 3 * * * /path/to/logwatch-ai/scripts/generate-logwatch.sh /var/log/logwatch-daily.txt 5 yesterday

# Run hourly (for testing)
0 * * * * /path/to/logwatch-ai/scripts/generate-logwatch.sh
```

#### Option C: With Custom Parameters

```bash
# Custom output path, detail level, and range
0 2 * * * /path/to/logwatch-ai/scripts/generate-logwatch.sh /custom/path.txt 10 yesterday
```

**Script Parameters:**
1. **Output path** (default: `/tmp/logwatch-output.txt`)
2. **Detail level** (default: `0`)
   - `0` - Minimal details (fastest, least verbose)
   - `5` - Medium details (balanced)
   - `10` - Maximum details (slowest, most verbose)
   - Any value 0-10 is valid
3. **Range** (default: `yesterday`)
   - `yesterday` - Previous day
   - `today` - Current day
   - `all` - All available logs

### Step 3: Update Environment Variables

Ensure your `.env` file matches the cron output path:

```bash
# In .env file
LOGWATCH_OUTPUT_PATH=/tmp/logwatch-output.txt
```

**Important:** The path in `.env` must match the path used in cron!

### Step 4: Verify Cron is Working

```bash
# View root's crontab
sudo crontab -l

# Check cron logs (Linux)
sudo grep generate-logwatch /var/log/syslog

# Check cron logs (macOS)
log show --predicate 'process == "cron"' --last 1h | grep generate-logwatch

# Manually test the cron command
sudo /path/to/logwatch-ai/scripts/generate-logwatch.sh

# Verify file was generated
ls -lh /tmp/logwatch-output.txt
```

## macOS Setup

macOS uses `cron` but also recommends `launchd` for system services.

### Using Cron (Simpler)

```bash
# Edit root crontab
sudo crontab -e

# Add the cron job as shown above
0 2 * * * /path/to/logwatch-ai/scripts/generate-logwatch.sh
```

### Using Launchd (Alternative)

Create `/Library/LaunchDaemons/com.logwatch.generator.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.logwatch.generator</string>

    <key>ProgramArguments</key>
    <array>
        <string>/path/to/logwatch-ai/scripts/generate-logwatch.sh</string>
    </array>

    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>

    <key>StandardOutPath</key>
    <string>/var/log/logwatch-generator.log</string>

    <key>StandardErrorPath</key>
    <string>/var/log/logwatch-generator.error.log</string>
</dict>
</plist>
```

Then load it:

```bash
sudo launchctl load /Library/LaunchDaemons/com.logwatch.generator.plist
sudo launchctl start com.logwatch.generator
```

## Monitoring and Troubleshooting

### Check if Cron Ran

```bash
# Linux
sudo grep generate-logwatch /var/log/syslog

# macOS
log show --predicate 'eventMessage contains "generate-logwatch"' --last 24h
```

### Check Output File

```bash
# Verify file exists and is recent
ls -lh /tmp/logwatch-output.txt

# Check file age
find /tmp -name "logwatch-output.txt" -mmin -1440  # Modified in last 24 hours

# View file contents
cat /tmp/logwatch-output.txt
```

### Common Issues

#### Issue: Cron job doesn't run

**Solution:**
1. Verify crontab entry: `sudo crontab -l`
2. Check cron service is running: `systemctl status cron` (Linux)
3. Check syslog for errors: `sudo grep CRON /var/log/syslog`

#### Issue: File not generated

**Solution:**
1. Run script manually: `sudo /path/to/logwatch-ai/scripts/generate-logwatch.sh`
2. Check if logwatch is installed: `which logwatch`
3. Check script has execute permissions: `chmod +x scripts/generate-logwatch.sh`

#### Issue: Permission denied

**Solution:**
1. Ensure cron runs as root: `sudo crontab -e` (not `crontab -e`)
2. Verify script permissions: `ls -l scripts/generate-logwatch.sh`
3. Check output directory exists: `ls -ld /tmp`

#### Issue: File exists but analyzer can't read it

**Solution:**
1. Check file permissions: `ls -l /tmp/logwatch-output.txt`
2. Should be: `-rw-r--r--` (644)
3. Fix if needed: `sudo chmod 644 /tmp/logwatch-output.txt`

#### Issue: Old data in reports

**Solution:**
1. Check cron is actually running (see above)
2. Verify cron frequency matches your needs
3. Check file modification time: `stat /tmp/logwatch-output.txt`

### Email Notifications from Cron

By default, cron sends email on errors. To receive notifications:

```bash
# Add MAILTO at the top of crontab
sudo crontab -e

# Add:
MAILTO=your-email@example.com
0 2 * * * /path/to/logwatch-ai/scripts/generate-logwatch.sh
```

To suppress emails (not recommended):

```bash
0 2 * * * /path/to/logwatch-ai/scripts/generate-logwatch.sh >/dev/null 2>&1
```

## Testing

### Manual Test

```bash
# Generate a test report
sudo /path/to/logwatch-ai/scripts/generate-logwatch.sh

# Run the analyzer
cd /path/to/logwatch-ai
npm start
```

### Verify Cron Timing

```bash
# Add a test cron that runs every minute
sudo crontab -e

# Add temporarily:
* * * * * /path/to/logwatch-ai/scripts/generate-logwatch.sh

# Wait a few minutes, then check
ls -lh /tmp/logwatch-output.txt
sudo grep generate-logwatch /var/log/syslog

# Remove the test cron after verification!
```

## Production Deployment

### Recommended Setup

```bash
# 1. Install cron job for daily reports at 2 AM
sudo crontab -e
0 2 * * * /path/to/logwatch-ai/scripts/generate-logwatch.sh

# 2. Configure analyzer to run after logwatch generation
# Run analyzer at 2:15 AM (15 minutes after logwatch)
crontab -e  # User crontab (not root)
15 2 * * * cd /path/to/logwatch-ai && npm start

# 3. Set up monitoring
# Check file age and alert if stale (>25 hours old)
30 3 * * * [ $(stat -c %Y /tmp/logwatch-output.txt) -gt $(( $(date +%s) - 90000 )) ] || echo "Logwatch file is stale!" | mail -s "Alert: Logwatch Stale" admin@example.com
```

### Log Rotation

If storing reports long-term, set up rotation:

```bash
# /etc/logrotate.d/logwatch-ai
/var/log/logwatch/*.txt {
    daily
    rotate 30
    compress
    missingok
    notifempty
}
```

## Security Considerations

1. **Run cron as root**: Required for logwatch to access system logs
2. **File permissions**: Script sets output to 644 (world-readable)
3. **Script location**: Keep script in project directory with proper ownership
4. **Audit cron**: Monitor cron execution logs regularly
5. **Validate output**: Analyzer validates file exists and is readable

## Alternative: Systemd Timer (Linux Only)

For systems using systemd, you can use a timer instead of cron:

### Create Service File

`/etc/systemd/system/logwatch-generator.service`:

```ini
[Unit]
Description=Generate Logwatch Report
After=network.target

[Service]
Type=oneshot
ExecStart=/path/to/logwatch-ai/scripts/generate-logwatch.sh
User=root
```

### Create Timer File

`/etc/systemd/system/logwatch-generator.timer`:

```ini
[Unit]
Description=Daily Logwatch Report Generation
Requires=logwatch-generator.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

### Enable and Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable logwatch-generator.timer
sudo systemctl start logwatch-generator.timer

# Check status
sudo systemctl status logwatch-generator.timer
sudo systemctl list-timers
```

## Summary

- ✅ Cron runs `generate-logwatch.sh` as root
- ✅ Script generates report with `--detail 0` (minimal verbosity by default)
- ✅ File permissions set to 644 (readable by all)
- ✅ Analyzer reads pre-generated file (no sudo needed)
- ✅ Logs to syslog for monitoring
- ✅ Cron typically runs daily at 2 AM
- ✅ Analyzer runs after logwatch completes

For additional help, see the [main README](../README.md) or [deployment documentation](../README.md#deployment).
