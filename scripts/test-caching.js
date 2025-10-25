import Anthropic from '@anthropic-ai/sdk';
import config from '../config/config.js';

const client = new Anthropic({
  apiKey: config.claude.apiKey
});

async function testCaching() {
  console.log('\n=== Testing Prompt Caching ===\n');

  const systemPrompt = `You are a helpful AI assistant analyzing system logs.
Your task is to provide clear, actionable insights about system health and security.`;

  const userMessage = `Please analyze this sample log:
[INFO] System started at 10:00:00
[WARN] High CPU usage detected: 85%
[ERROR] Failed login attempt from 192.168.1.100`;

  console.log('Run 1: Creating cache...\n');
  const response1 = await client.messages.create({
    model: config.claude.model,
    max_tokens: 500,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages: [
      {
        role: 'user',
        content: userMessage
      }
    ]
  });

  console.log('Response 1 Usage:');
  console.log(JSON.stringify(response1.usage, null, 2));
  console.log('');

  // Wait a moment and run again
  console.log('Run 2: Using cache (within 5 min)...\n');
  await new Promise(resolve => setTimeout(resolve, 1000));

  const response2 = await client.messages.create({
    model: config.claude.model,
    max_tokens: 500,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages: [
      {
        role: 'user',
        content: userMessage
      }
    ]
  });

  console.log('Response 2 Usage:');
  console.log(JSON.stringify(response2.usage, null, 2));
  console.log('');

  // Calculate savings
  const run1Cost = (response1.usage.input_tokens / 1000000 * 3) +
                   (response1.usage.output_tokens / 1000000 * 15) +
                   ((response1.usage.cache_creation_input_tokens || 0) / 1000000 * 3.75);

  const run2InputCost = (response2.usage.input_tokens / 1000000 * 3);
  const run2CacheCost = ((response2.usage.cache_read_input_tokens || 0) / 1000000 * 0.30);
  const run2Cost = run2InputCost + run2CacheCost +
                   (response2.usage.output_tokens / 1000000 * 15);

  console.log('=== Cost Analysis ===');
  console.log(`Run 1 cost: $${run1Cost.toFixed(6)}`);
  console.log(`Run 2 cost: $${run2Cost.toFixed(6)}`);

  if (response2.usage.cache_read_input_tokens > 0) {
    const savings = ((response2.usage.cache_read_input_tokens / 1000000 * 3) - run2CacheCost);
    console.log(`Cache savings: $${savings.toFixed(6)} (${((savings / (savings + run2Cost)) * 100).toFixed(1)}% reduction)`);
  } else {
    console.log('⚠ No cache hits detected. Cache may not be working.');
  }
}

testCaching().catch(console.error);
