import Anthropic from '@anthropic-ai/sdk';
import config from '../config/config.js';
import { getAnalysisPrompt } from '../src/utils/prompts.js';

const client = new Anthropic({ apiKey: config.claude.apiKey });

// Sample logwatch content
const sampleLog = `
################### Logwatch 7.5.6 ####################
        Processing Initiated: Thu Oct 24 21:15:00 2025
        Date Range Processed: yesterday
##########################################################

 --------------------- SSHD Begin -----------------------
 Users logging in through sshd:
    root: 192.168.1.10: 2 times
 Failed logins from: 192.168.1.100: 5 times
 ---------------------- SSHD End ------------------------
`;

const { systemPrompt, userPrompt } = getAnalysisPrompt(sampleLog, null);

console.log('\n=== Prompt Size Analysis ===\n');
console.log(`System prompt length: ${systemPrompt.length} characters`);
console.log(`User prompt length: ${userPrompt.length} characters`);
console.log('');

// Estimate tokens (rough: ~4 chars per token)
const estimatedSystemTokens = Math.ceil(systemPrompt.length / 4);
const estimatedUserTokens = Math.ceil(userPrompt.length / 4);

console.log(`Estimated system prompt tokens: ~${estimatedSystemTokens}`);
console.log(`Estimated user prompt tokens: ~${estimatedUserTokens}`);
console.log('');

console.log(`Minimum tokens for caching: 1024`);
console.log(`System prompt meets minimum: ${estimatedSystemTokens >= 1024 ? '✓ YES' : '✗ NO'}`);
console.log('');

if (estimatedSystemTokens < 1024) {
  console.log('⚠ System prompt is too small for caching!');
  console.log(`  Need to add ~${1024 - estimatedSystemTokens} more tokens (${(1024 - estimatedSystemTokens) * 4} characters)`);
  console.log('');
  console.log('Suggestion: Add more detailed instructions, examples, or context to the system prompt.');
}

console.log('\n--- System Prompt Preview (first 200 chars) ---');
console.log(systemPrompt.substring(0, 200) + '...');
