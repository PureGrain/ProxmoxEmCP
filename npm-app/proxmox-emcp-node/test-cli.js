#!/usr/bin/env node

/**
 * Test script for the proxmox-emcp-node CLI wrapper
 * Tests different scenarios including missing environment variables
 */

const { spawn } = require('child_process');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runTest(name, env = {}, timeout = 5000) {
  return new Promise((resolve, reject) => {
    log(`\nTesting: ${name}`, colors.blue);

    const cliPath = path.join(__dirname, 'cli.cjs');
    const child = spawn('node', [cliPath], {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let hasExited = false;

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('exit', (code) => {
      hasExited = true;

      log(`  Exit code: ${code}`, code === 0 ? colors.green : colors.red);

      if (stdout) {
        log(`  Stdout:`, colors.yellow);
        console.log(`    ${stdout.slice(0, 200).replace(/\n/g, '\n    ')}`);
      }

      if (stderr) {
        log(`  Stderr:`, colors.yellow);
        console.log(`    ${stderr.slice(0, 500).replace(/\n/g, '\n    ')}`);
      }

      resolve({
        name,
        code,
        stdout,
        stderr,
        success: true
      });
    });

    child.on('error', (err) => {
      log(`  Error: ${err.message}`, colors.red);
      resolve({
        name,
        error: err.message,
        success: false
      });
    });

    // Send a test MCP message
    setTimeout(() => {
      if (!hasExited) {
        const testMessage = JSON.stringify({
          jsonrpc: "2.0",
          method: "initialize",
          params: {
            protocolVersion: "1.0.0",
            capabilities: {}
          },
          id: 1
        });

        child.stdin.write(testMessage + '\n');

        // Kill after timeout
        setTimeout(() => {
          if (!hasExited) {
            child.kill('SIGTERM');
          }
        }, 2000);
      }
    }, 1000);
  });
}

async function runTests() {
  log('=== Proxmox MCP Node Wrapper Test Suite ===', colors.green);

  const results = [];

  // Test 1: Missing all environment variables
  results.push(await runTest('Missing all environment variables', {}));

  // Test 2: Missing one required variable
  results.push(await runTest('Missing PROXMOX_TOKEN_VALUE', {
    PROXMOX_HOST: '192.168.1.100',
    PROXMOX_TOKEN_NAME: 'test-token'
  }));

  // Test 3: All required variables present (will try to connect to Docker)
  results.push(await runTest('All required variables present', {
    PROXMOX_HOST: '192.168.1.100',
    PROXMOX_TOKEN_NAME: 'test-token',
    PROXMOX_TOKEN_VALUE: 'test-value',
    DEBUG: 'true'
  }));

  // Test 4: With optional variables
  results.push(await runTest('With optional variables', {
    PROXMOX_HOST: '192.168.1.100',
    PROXMOX_TOKEN_NAME: 'test-token',
    PROXMOX_TOKEN_VALUE: 'test-value',
    PROXMOX_USER: 'root@pam',
    PROXMOX_VERIFY_SSL: 'false',
    LOG_LEVEL: 'DEBUG',
    DEBUG: 'true'
  }));

  // Summary
  log('\n=== Test Summary ===', colors.green);
  results.forEach(result => {
    const status = result.success ? '✓' : '✗';
    const color = result.success ? colors.green : colors.red;
    log(`${status} ${result.name}`, color);
  });
}

// Run tests
runTests().catch(err => {
  log(`Test suite failed: ${err.message}`, colors.red);
  process.exit(1);
});
