#!/usr/bin/env node

/**
 * Helper script to get Telegram Channel ID
 *
 * Usage:
 * 1. Add your bot as administrator to the channel
 * 2. Post any message to the channel
 * 3. Run: node scripts/get-channel-id.js
 */

import { Bot } from 'grammy';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN not found in .env file');
  process.exit(1);
}

async function getChannelId() {
  try {
    const bot = new Bot(BOT_TOKEN);

    console.log('🤖 Bot Token: ' + BOT_TOKEN.substring(0, 20) + '...\n');
    console.log('📡 Fetching recent updates from Telegram...\n');

    // Get bot info first
    const botInfo = await bot.api.getMe();
    console.log(`✅ Connected to bot: @${botInfo.username} (${botInfo.first_name})\n`);

    const updates = await bot.api.getUpdates();

    if (updates.length === 0) {
      console.log('⚠️  No updates found.\n');
      console.log('📝 STEP-BY-STEP INSTRUCTIONS:\n');
      console.log('1. Open Telegram and go to your channel');
      console.log('2. Click on the channel name at the top');
      console.log('3. Click "Administrators" → "Add Administrator"');
      console.log(`4. Search for: @${botInfo.username}`);
      console.log('5. Give it "Post Messages" permission');
      console.log('6. Click "Done"');
      console.log('7. Go back to the channel and POST A MESSAGE (any text)');
      console.log('8. Run this script again\n');
      console.log('⚠️  IMPORTANT: You MUST post a message to the channel after adding the bot!\n');
      return;
    }

    console.log(`✅ Found ${updates.length} update(s)\n`);

    // Show all update types for debugging
    console.log('🔍 Debug: Update types found:');
    updates.forEach((update, index) => {
      const types = [];
      if (update.message) types.push('message');
      if (update.channel_post) types.push('channel_post');
      if (update.edited_message) types.push('edited_message');
      if (update.edited_channel_post) types.push('edited_channel_post');
      console.log(`   Update #${index + 1}: ${types.join(', ')}`);
    });
    console.log('');

    // Extract channel IDs only
    const channels = new Map();

    updates.forEach(update => {
      if (update.channel_post) {
        const chat = update.channel_post.chat;
        channels.set(chat.id, {
          id: chat.id,
          title: chat.title,
          type: chat.type,
          username: chat.username,
          updateType: 'channel_post'
        });
      } else if (update.edited_channel_post) {
        const chat = update.edited_channel_post.chat;
        channels.set(chat.id, {
          id: chat.id,
          title: chat.title,
          type: chat.type,
          username: chat.username,
          updateType: 'edited_channel_post'
        });
      }
    });

    if (channels.size === 0) {
      console.log('\n⚠️  NO CHANNELS FOUND!\n');
      console.log('📝 TO FIX THIS:\n');
      console.log('1. Make sure you created a CHANNEL (not a group or chat)');
      console.log(`2. Add @${botInfo.username} as ADMINISTRATOR to the channel`);
      console.log('3. Give the bot "Post Messages" permission');
      console.log('4. POST A MESSAGE to the channel');
      console.log('5. Run this script again\n');
      console.log('💡 Channel IDs are negative and start with -100 (e.g., -1001234567890)\n');
      return;
    }

    // Show channels
    console.log('🎯 CHANNELS FOUND:\n');
    console.log('═'.repeat(70));

    channels.forEach((chat) => {
      console.log(`\n✅ CHANNEL: ${chat.title}`);
      console.log(`   🆔 ID: ${chat.id}`);
      console.log(`   📝 Type: ${chat.type}`);
      if (chat.username) {
        console.log(`   👤 Username: @${chat.username}`);
      }
      console.log(`   📊 Source: ${chat.updateType}`);
      console.log('');
      console.log('   📋 ADD THIS TO YOUR .env FILE:');
      console.log(`   TELEGRAM_CHANNEL_ID=${chat.id}`);
      if (chat.username) {
        console.log(`   OR: TELEGRAM_CHANNEL_ID=@${chat.username}`);
      }
    });

    console.log('\n' + '═'.repeat(70));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n🔍 Debug info:', error);
    console.error('\n📋 Troubleshooting checklist:');
    console.error('  ✓ Bot token is correct in .env');
    console.error('  ✓ Bot has been added as ADMINISTRATOR to the channel');
    console.error('  ✓ Bot has "Post Messages" permission in the channel');
    console.error('  ✓ At least one message has been posted to the channel AFTER adding the bot');
    console.error('  ✓ You created a CHANNEL, not a group or private chat\n');
  }
}

getChannelId();
