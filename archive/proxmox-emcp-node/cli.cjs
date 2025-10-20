#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Function to log to stderr (so it doesn't interfere with stdio)
function logError(message) {
  process.stderr.write(`[proxmox-emcp-node] ${message}\n`);
}

// Check for required environment variables
const requiredVars = ['PROXMOX_HOST', 'PROXMOX_TOKEN_NAME', 'PROXMOX_TOKEN_VALUE'];
const missingVars = requiredVars.filter(key => !process.env[key]);

if (missingVars.length > 0) {
  logError('ERROR: Missing required environment variables:');
  missingVars.forEach(key => logError(`  - ${key}`));
  logError('');
  logError('Please set the following environment variables:');
  logError('  PROXMOX_HOST - Your Proxmox server address (e.g., 192.168.1.100)');
  logError('  PROXMOX_TOKEN_NAME - Your API token name');
  logError('  PROXMOX_TOKEN_VALUE - Your API token value');
  logError('');
  logError('Optional variables:');
  logError('  PROXMOX_USER - User (defaults to root@pam)');
  logError('  PROXMOX_VERIFY_SSL - Verify SSL (defaults to false)');
  logError('  LOG_LEVEL - Log level (defaults to INFO)');

  // Don't exit immediately - let MCP handle the error properly
  // Instead, output a proper MCP error response
  const errorResponse = {
    jsonrpc: "2.0",
    error: {
      code: -32603,
      message: `Missing required environment variables: ${missingVars.join(', ')}`
    },
    id: null
  };

  // Send error through stdout (MCP protocol)
  process.stdout.write(JSON.stringify(errorResponse) + '\n');
  process.exit(1);
}

// Collect environment variables to pass to Docker
const envVars = [
  'PROXMOX_HOST',
  'PROXMOX_TOKEN_NAME',
  'PROXMOX_TOKEN_VALUE',
  'PROXMOX_USER',
  'PROXMOX_VERIFY_SSL',
  'LOG_LEVEL'
];

const dockerEnvArgs = envVars
  .filter((key) => process.env[key])
  .map((key) => ['-e', `${key}=${process.env[key]}`])
  .flat();

// Check if Docker is available
const checkDocker = spawn('docker', ['--version'], {
  stdio: 'ignore',
  shell: false
});

checkDocker.on('error', (err) => {
  logError('ERROR: Docker is not installed or not in PATH');
  logError('Please install Docker from https://docs.docker.com/get-docker/');

  const errorResponse = {
    jsonrpc: "2.0",
    error: {
      code: -32603,
      message: "Docker is not installed or not available in PATH"
    },
    id: null
  };

  process.stdout.write(JSON.stringify(errorResponse) + '\n');
  process.exit(1);
});

checkDocker.on('close', (code) => {
  if (code !== 0) {
    logError('ERROR: Failed to verify Docker installation');
    process.exit(1);
  }

  // Docker is available, start the container
  const dockerArgs = [
    'run',
    '--rm',
    '-i',
    ...dockerEnvArgs,
    'puregrain/proxmox-emcp:latest'
  ];

  if (process.env.DEBUG === 'true') {
    logError(`Running Docker with args: docker ${dockerArgs.join(' ')}`);
  }

  const docker = spawn('docker', dockerArgs, {
    stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, and stderr all piped
    env: process.env,
    shell: false
  });

  // Handle stdin - pipe from process to docker
  process.stdin.pipe(docker.stdin);

  // Handle stdout - pipe from docker to process
  docker.stdout.pipe(process.stdout);

  // Handle stderr - pipe from docker to process stderr
  docker.stderr.on('data', (data) => {
    // Only output stderr if debug is enabled or it's an error
    const message = data.toString();
    if (process.env.DEBUG === 'true' || message.toLowerCase().includes('error')) {
      process.stderr.write(data);
    }
  });

  // Handle docker exit
  docker.on('exit', (code) => {
    if (code !== 0 && process.env.DEBUG === 'true') {
      logError(`Docker container exited with code ${code}`);
    }
    process.exit(code || 0);
  });

  // Handle errors
  docker.on('error', (err) => {
    logError(`Failed to start Docker container: ${err.message}`);

    const errorResponse = {
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: `Failed to start Docker container: ${err.message}`
      },
      id: null
    };

    process.stdout.write(JSON.stringify(errorResponse) + '\n');
    process.exit(1);
  });

  // Handle process termination signals
  process.on('SIGINT', () => {
    docker.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    docker.kill('SIGTERM');
  });
});
