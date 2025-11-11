# Network Proxy Configuration

This document explains how to configure network proxy support for the Logwatch AI Analyzer.

## Overview

The application supports HTTP/HTTPS proxy configuration for all network requests to:
- Claude API (Anthropic)
- Telegram Bot API

Proxy settings are read with the following priority:
1. **Environment variables in `.env` file** (highest priority)
2. **Shell environment variables** (fallback)
3. **No proxy** (direct connection, if neither is set)

## Configuration

### Method 1: Using .env File (Recommended)

Add proxy settings to your `.env` file:

```bash
# Network Proxy Configuration
HTTP_PROXY=http://proxy.example.com:8080
HTTPS_PROXY=http://proxy.example.com:8080
NO_PROXY=localhost,127.0.0.1,.local
```

### Method 2: Using Shell Environment Variables

Set environment variables in your shell:

```bash
export http_proxy=http://proxy.example.com:8080
export https_proxy=http://proxy.example.com:8080
export no_proxy=localhost,127.0.0.1,.local
```

**Note**: Both uppercase (`HTTP_PROXY`) and lowercase (`http_proxy`) variables are supported. Uppercase variables in `.env` take precedence over lowercase shell variables.

## Proxy URL Format

The proxy URL should follow this format:

```
http://[username:password@]host:port
```

Examples:
- `http://proxy.example.com:8080`
- `http://user:pass@proxy.example.com:8080`
- `https://secure-proxy.example.com:443`

## NO_PROXY Configuration

The `NO_PROXY` variable specifies hosts that should bypass the proxy (direct connection).

Format: Comma-separated list of domains, IPs, or CIDR blocks:

```bash
NO_PROXY=localhost,127.0.0.1,.local,.example.com,192.168.0.0/16
```

Common patterns:
- `localhost` - Localhost hostname
- `127.0.0.1` - Loopback IP
- `.local` - All .local domains
- `.example.com` - example.com and all subdomains
- `192.168.0.0/16` - IP ranges (CIDR notation)

## Testing Proxy Configuration

### Test 1: Check Proxy Settings

Run the proxy configuration test to verify settings are loaded correctly:

```bash
node scripts/test-proxy-config.js
```

This displays:
- Current proxy configuration
- Environment variables
- Priority order
- Whether proxy is enabled

### Test 2: Verify Client Integration

Test that Claude and Telegram clients initialize with proxy:

```bash
node scripts/test-proxy-integration.js
```

This verifies:
- Claude API client initialization
- Telegram bot client initialization
- Proxy URL being used

### Test 3: Check Application Logs

After running the application, check logs for proxy configuration:

```bash
grep -i proxy logs/app.log
```

You should see messages like:
```
[2025-11-11T15:10:42.106Z] [INFO] Claude API client configured with proxy: http://proxy.example.com:8080
[2025-11-11T15:10:42.744Z] [INFO] Telegram bot configured with proxy: http://proxy.example.com:8080
```

## Troubleshooting

### Proxy Not Being Used

**Issue**: Application not using proxy despite configuration.

**Solution**:
1. Check priority order - .env variables override shell variables
2. Verify proxy URL format (must include `http://` or `https://`)
3. Check logs: `grep -i proxy logs/app.log`
4. Run test: `node scripts/test-proxy-config.js`

### Connection Timeouts

**Issue**: Requests timeout when using proxy.

**Possible causes**:
1. Proxy server is down or unreachable
2. Proxy requires authentication (add credentials to URL)
3. Firewall blocking outbound connections
4. Wrong proxy port

**Solution**:
- Test proxy with curl: `curl -x http://proxy:8080 https://api.anthropic.com`
- Check proxy credentials
- Verify firewall rules

### Proxy Authentication

**Issue**: Proxy requires username/password.

**Solution**: Include credentials in proxy URL:

```bash
HTTP_PROXY=http://username:password@proxy.example.com:8080
HTTPS_PROXY=http://username:password@proxy.example.com:8080
```

**Security note**: If using credentials in `.env`, ensure file permissions are restrictive:
```bash
chmod 600 .env
```

### Mixed Environment

**Issue**: Some requests go through proxy, others don't.

**Solution**:
- Ensure both `HTTP_PROXY` and `HTTPS_PROXY` are set
- Most modern APIs use HTTPS, so `HTTPS_PROXY` is usually required
- Use identical values for both unless you have different proxies for HTTP/HTTPS

### NO_PROXY Not Working

**Issue**: Requests to local services go through proxy.

**Solution**:
- Verify `NO_PROXY` format (comma-separated, no spaces)
- Use IP addresses for localhost: `127.0.0.1`
- Include domain patterns with leading dot: `.local`

## Implementation Details

### Technical Overview

The proxy support is implemented using the `https-proxy-agent` package, which creates HTTP/HTTPS agents that route requests through the configured proxy.

**Files modified**:
- `config/config.js` - Proxy configuration loading
- `src/claude-client.js` - Claude API client with proxy support
- `src/telegram-client.js` - Telegram bot with proxy support

### Code Example

```javascript
// config/config.js
this.proxy = {
  http: process.env.HTTP_PROXY || process.env.http_proxy || null,
  https: process.env.HTTPS_PROXY || process.env.https_proxy || null,
  noProxy: process.env.NO_PROXY || process.env.no_proxy || null,
  enabled: !!(httpProxy || httpsProxy)
};

// src/claude-client.js
if (config.proxy.enabled) {
  const proxyUrl = config.proxy.https || config.proxy.http;
  clientOptions.httpAgent = new HttpsProxyAgent(proxyUrl);
}

// src/telegram-client.js
if (config.proxy.enabled) {
  const proxyUrl = config.proxy.https || config.proxy.http;
  botOptions.client = {
    baseFetchConfig: {
      agent: new HttpsProxyAgent(proxyUrl)
    }
  };
}
```

## Environment Examples

### Development Environment (No Proxy)

```bash
# .env
# Leave proxy settings commented out or unset
# HTTP_PROXY=
# HTTPS_PROXY=
```

### Corporate Network (With Proxy)

```bash
# .env
HTTP_PROXY=http://corporate-proxy.company.com:8080
HTTPS_PROXY=http://corporate-proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1,.local,.company.com
```

### Authenticated Proxy

```bash
# .env
HTTP_PROXY=http://user:pass@proxy.company.com:8080
HTTPS_PROXY=http://user:pass@proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1,.local
```

### Docker Container with Host Proxy

```bash
# docker-compose.yml or docker run
environment:
  - HTTP_PROXY=http://host.docker.internal:8080
  - HTTPS_PROXY=http://host.docker.internal:8080
  - NO_PROXY=localhost,127.0.0.1
```

## Security Considerations

1. **Credentials in .env**: Ensure `.env` file has restrictive permissions (600)
2. **Environment Variables**: Shell environment variables may be visible to other users
3. **Logs**: Proxy URLs (including credentials) are logged - review log access
4. **Network Security**: Proxy can intercept all traffic - use trusted proxies only
5. **HTTPS**: Prefer HTTPS for proxy connections when possible

## Additional Resources

- [https-proxy-agent Documentation](https://github.com/TooTallNate/proxy-agents)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
