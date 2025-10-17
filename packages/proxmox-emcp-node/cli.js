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
  stdio: ['pipe', 'pipe', 'inherit'], // stdin and stdout piped, stderr inherited
  env: process.env
});

// Pipe stdin to docker
process.stdin.pipe(docker.stdin);

// Pipe docker stdout to stdout
docker.stdout.pipe(process.stdout);

docker.on('exit', (code) => {
  process.exit(code);
});
