#!/usr/bin/env node

/**
 * Test script to verify the server starts correctly with new environment variables
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Test environment variables
const testEnv = {
  ...process.env,
  PROXMOX_HOST: '12.12.8.102:8006',
  PROXMOX_TOKEN_ID: 'openwebui',        // NEW name
  PROXMOX_TOKEN_SECRET: '6dfba038-228d-42ef-9147-15771a44c3cb', // NEW name
  LOG_LEVEL: 'DEBUG'
};

console.log('🧪 Testing ProxmoxEmCP Server v0.4.0');
console.log('=====================================');
console.log('Environment Variables (NEW naming):');
console.log('  PROXMOX_HOST:', testEnv.PROXMOX_HOST);
console.log('  PROXMOX_TOKEN_ID:', testEnv.PROXMOX_TOKEN_ID);
console.log('  PROXMOX_TOKEN_SECRET:', '***hidden***');
console.log('');

// Start the server
const serverPath = join(__dirname, 'index.js');
const server = spawn('node', [serverPath], {
  env: testEnv,
  stdio: ['pipe', 'pipe', 'pipe']
});

let hasStarted = false;
let stderr = '';

// Capture stderr
server.stderr.on('data', (data) => {
  const msg = data.toString();
  stderr += msg;

  // Check for successful start
  if (msg.includes('Starting ProxmoxEmCP Server') || msg.includes('Server started successfully')) {
    hasStarted = true;
    console.log('✅ Server started successfully!');
  }

  // Check for environment variable errors
  if (msg.includes('Missing required environment variables')) {
    console.error('❌ Environment variable error detected!');
    console.error(msg);
  }

  // Show debug output
  if (process.env.DEBUG) {
    console.error('[DEBUG]', msg.trim());
  }
});

// Send a test MCP initialization request
setTimeout(() => {
  const testRequest = {
    jsonrpc: "2.0",
    method: "initialize",
    params: {
      protocolVersion: "1.0.0",
      capabilities: {}
    },
    id: 1
  };

  console.log('📤 Sending MCP initialization request...');
  server.stdin.write(JSON.stringify(testRequest) + '\n');
}, 1000);

// Handle response
server.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());
    console.log('📥 Received response:', JSON.stringify(response, null, 2));

    if (response.result) {
      console.log('✅ MCP initialization successful!');
      console.log('  Protocol version:', response.result.protocolVersion);
      console.log('  Server name:', response.result.serverInfo?.name);
      console.log('  Server version:', response.result.serverInfo?.version);
      console.log('  Capabilities:', Object.keys(response.result.capabilities || {}));
    }
  } catch (e) {
    // Not JSON, might be other output
    if (process.env.DEBUG) {
      console.log('[STDOUT]', data.toString().trim());
    }
  }
});

// Cleanup after 5 seconds
setTimeout(() => {
  console.log('\n🛑 Stopping test server...');
  server.kill('SIGTERM');

  if (hasStarted) {
    console.log('\n✅ TEST PASSED: Server starts with new environment variables!');
    console.log('\n📝 Migration Guide for Users:');
    console.log('===============================');
    console.log('OLD Environment Variables (v0.3.x):');
    console.log('  PROXMOX_TOKEN_NAME=your-token');
    console.log('  PROXMOX_TOKEN_VALUE=your-secret');
    console.log('');
    console.log('NEW Environment Variables (v0.4.0+):');
    console.log('  PROXMOX_TOKEN_ID=your-token');
    console.log('  PROXMOX_TOKEN_SECRET=your-secret');
    process.exit(0);
  } else {
    console.log('\n❌ TEST FAILED: Server did not start properly');
    console.log('Error output:', stderr);
    process.exit(1);
  }
}, 5000);

// Handle errors
server.on('error', (err) => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});
