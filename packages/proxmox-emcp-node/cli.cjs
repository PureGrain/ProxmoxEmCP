#!/usr/bin/env node

const { spawn } = require('child_process');

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

const dockerArgs = [
  'run',
  '--rm',
  '-i',
  ...dockerEnvArgs,
  'puregrain/proxmox-emcp:latest'
];

const docker = spawn('docker', dockerArgs, {
  stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, and stderr all piped
  env: process.env
});

// Handle stdin
process.stdin.pipe(docker.stdin);

// Handle stdout
docker.stdout.pipe(process.stdout);

// Handle stderr - pipe to stderr instead of inheriting
docker.stderr.pipe(process.stderr);

// Handle docker exit
docker.on('exit', (code) => {
  process.exit(code || 0);
});

// Handle errors
docker.on('error', (err) => {
  console.error('Failed to start Docker container:', err);
  process.exit(1);
});
