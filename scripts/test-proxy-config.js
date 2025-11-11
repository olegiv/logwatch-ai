#!/usr/bin/env node

/**
 * Test script to verify proxy configuration is loaded correctly
 */

import config from '../config/config.js';

console.log('=== Proxy Configuration Test ===\n');

console.log('Proxy settings:');
console.log(`- Enabled: ${config.proxy.enabled}`);
console.log(`- HTTP Proxy: ${config.proxy.http || '(not set)'}`);
console.log(`- HTTPS Proxy: ${config.proxy.https || '(not set)'}`);
console.log(`- No Proxy: ${config.proxy.noProxy || '(not set)'}`);

console.log('\n=== Environment Variables ===\n');

console.log('From .env or environment:');
console.log(`- HTTP_PROXY: ${process.env.HTTP_PROXY || '(not set)'}`);
console.log(`- HTTPS_PROXY: ${process.env.HTTPS_PROXY || '(not set)'}`);
console.log(`- NO_PROXY: ${process.env.NO_PROXY || '(not set)'}`);
console.log(`- http_proxy: ${process.env.http_proxy || '(not set)'}`);
console.log(`- https_proxy: ${process.env.https_proxy || '(not set)'}`);
console.log(`- no_proxy: ${process.env.no_proxy || '(not set)'}`);

console.log('\n=== Priority Order ===\n');
console.log('The configuration reads proxy settings in this order:');
console.log('1. HTTP_PROXY / HTTPS_PROXY from .env');
console.log('2. http_proxy / https_proxy from shell environment');
console.log('3. Not configured (direct connection)');

if (config.proxy.enabled) {
  console.log('\n✅ Proxy is ENABLED');
  console.log(`   Using: ${config.proxy.https || config.proxy.http}`);
} else {
  console.log('\n✅ Proxy is DISABLED (direct connection)');
}

console.log('\n=== Test Complete ===');
