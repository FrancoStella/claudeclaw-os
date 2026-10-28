#!/usr/bin/env node

/**
 * Facebook Token Setup Script
 * Exchanges short-lived token for long-lived Page Access Tokens
 */

import readline from 'readline';
import https from 'https';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Facebook Token Setup\n');

  const appId = process.env.FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;

  if (!appId || !appSecret) {
    console.error('ERROR: FB_APP_ID and FB_APP_SECRET must be set in .env');
    process.exit(1);
  }

  console.log(`App ID: ${appId}`);

  // Get short-lived token from user
  const shortToken = await question('\nPaste the User Access Token from Graph API Explorer: ');

  console.log('\n1. Exchanging for long-lived User Access Token...');

  // Exchange for long-lived token
  const longLivedUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken.trim()}`;

  let longLivedToken;
  try {
    const longLivedData = await httpsGet(longLivedUrl);
    if (longLivedData.error) {
      throw new Error(longLivedData.error.message);
    }
    longLivedToken = longLivedData.access_token;
    console.log('✓ Got long-lived User Access Token (60 days)');
  } catch (error) {
    console.error('ERROR exchanging token:', error.message);
    process.exit(1);
  }

  console.log('\n2. Fetching your Pages...');

  // Get user's pages
  const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedToken}`;

  let pages;
  try {
    const pagesData = await httpsGet(pagesUrl);
    if (pagesData.error) {
      throw new Error(pagesData.error.message);
    }
    pages = pagesData.data;

    if (!pages || pages.length === 0) {
      console.error('ERROR: No pages found. Make sure you selected pages when generating the token.');
      process.exit(1);
    }

    console.log(`✓ Found ${pages.length} page(s):`);
    pages.forEach((page, i) => {
      console.log(`   ${i + 1}. ${page.name} (ID: ${page.id})`);
    });
  } catch (error) {
    console.error('ERROR fetching pages:', error.message);
    process.exit(1);
  }

  console.log('\n3. Saving tokens to .env...');

  // Prepare env entries
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Remove old FB page tokens if they exist
  envContent = envContent.replace(/FB_PAGE_\w+_ID=.*/g, '');
  envContent = envContent.replace(/FB_PAGE_\w+_TOKEN=.*/g, '');
  envContent = envContent.replace(/FB_PAGE_\w+_NAME=.*/g, '');

  // Add new page tokens
  const pageEntries = [];
  pages.forEach((page, i) => {
    const prefix = `FB_PAGE_${i + 1}`;
    pageEntries.push(`${prefix}_ID=${page.id}`);
    pageEntries.push(`${prefix}_NAME=${page.name}`);
    pageEntries.push(`${prefix}_TOKEN=${page.access_token}`);
  });

  // Append to .env
  if (!envContent.endsWith('\n')) envContent += '\n';
  envContent += '\n# Facebook Page Access Tokens\n';
  envContent += pageEntries.join('\n') + '\n';

  fs.writeFileSync(envPath, envContent);

  console.log('✓ Saved to .env:');
  pages.forEach((page, i) => {
    console.log(`   FB_PAGE_${i + 1}_ID, FB_PAGE_${i + 1}_NAME, FB_PAGE_${i + 1}_TOKEN`);
  });

  console.log('\n✅ Setup complete! You can now post to your Facebook Pages.');
  console.log('\nYour pages:');
  pages.forEach((page, i) => {
    console.log(`   ${i + 1}. ${page.name}`);
  });

  rl.close();
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
