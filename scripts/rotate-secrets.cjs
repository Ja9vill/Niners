#!/usr/bin/env node
/**
 * Secret Rotation Helper
 * 
 * Generates new cryptographically secure values for:
 * - JWT_SECRET (256-bit hex string)
 * - VAPID keys (for web push notifications)
 * 
 * Usage:
 *   node scripts/rotate-secrets.js
 * 
 * Then copy the output values into your .env file or secret manager.
 * After rotating JWT_SECRET, all existing user sessions will be invalidated
 * (users will need to log in again).
 */

const crypto = require('crypto');

console.log('=== Secret Rotation Helper ===\n');

// Generate JWT Secret
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('JWT_SECRET=' + jwtSecret);
console.log('');

// Generate VAPID keys
try {
  const webpush = require('web-push');
  const vapidKeys = webpush.generateVAPIDKeys();
  console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
  console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
  console.log('');
  console.log('NOTE: After rotating VAPID keys, all existing push subscriptions');
  console.log('will become invalid. Users will need to re-subscribe to notifications.');
} catch (e) {
  console.log('(web-push not installed — run "npm install" first to generate VAPID keys)');
  console.log('Or generate manually: npx web-push generate-vapid-keys');
}

console.log('\n=== Instructions ===');
console.log('1. Copy the values above into your .env file or cloud secret manager');
console.log('2. Restart the server');
console.log('3. All existing sessions will be invalidated (JWT_SECRET changed)');
console.log('4. If VAPID keys were rotated, delete vapid_keys_fallback.json');
