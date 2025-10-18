<!--
title: Proxmox MCP Server Documentation
author: PureGrain at SLA Ops, LLC
author_url: https://github.com/PureGrain
repo_url: https://github.com/PureGrain/ProxmoxMCP
license: MIT
description: Complete documentation for Proxmox MCP Server implementation
-->

# Proxmox MCP Server - Clean Implementation

[![CI](https://github.com/PureGrain/ProxmoxEmCP/actions/workflows/ci.yml/badge.svg)](https://github.com/PureGrain/ProxmoxEmCP/actions/workflows/ci.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/puregrain/proxmox-emcp?logo=docker)](https://hub.docker.com/r/puregrain/proxmox-emcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Security: Dependabot](https://img.shields.io/badge/dependabot-enabled-brightgreen?logo=dependabot)](https://github.com/PureGrain/ProxmoxEmCP/security/dependabot)

## 🎬 Project History

Just a few months ago (May 2025, to be exact), we kicked off our first Model Context Protocol (MCP) server for Proxmox in the original ProxmoxMCP repo. It was loaded with features, FastMCP, FastAPI, and enough virtual environments to make your head spin. But hey, times change, and so do we!

Now, we’re rolling out ProxmoxEmCP: a fresh, clean rebuild. No more complicated setup, no more FastMCP or FastAPI, and absolutely zero venv drama. Everything lives happily in the root of the container, ready to roll.

[repo_url: ProxmoxEmCP](https://github.com/PureGrain/ProxmoxEmCP)

A containerized MCP (Model Context Protocol) server for managing Proxmox VE through AI assistants. This implementation uses the official MCP SDK and runs in Docker without virtual environments.

## Features

- ✅ Official MCP SDK implementation
- 🐳 Containerized deployment (no venv needed)
- 🔐 Environment variable configuration
- 🚀 Simple setup and deployment
- 📦 Lightweight and efficient
- 🔧 Full Proxmox VE management capabilities

## 🚀 Using from Docker Hub or GitHub Container Registry

You can run ProxmoxEmCP directly from Docker Hub or GitHub Container Registry (GHCR) without cloning the repo.

### Docker Hub

Pull the image:

```bash
docker pull puregrain/proxmox-emcp:latest
```

Run the container (replace values with your actual credentials):

```bash
docker run -d \
  --name proxmox-emcp \
  -e PROXMOX_HOST="192.168.1.100" \
  -e PROXMOX_TOKEN_NAME="your-token-name" \
  -e PROXMOX_TOKEN_VALUE="your-token-value" \
  puregrain/proxmox-emcp:latest
```

### GitHub Container Registry (GHCR)

Pull the image:

```bash
docker pull ghcr.io/puregrain/proxmox-emcp:latest
```

Run the container (same as above, just change the image name):

```bash
docker run -d \
  --name proxmox-emcp \
  -e PROXMOX_HOST="192.168.1.100" \
  -e PROXMOX_TOKEN_NAME="your-token-name" \
  -e PROXMOX_TOKEN_VALUE="your-token-value" \
  ghcr.io/puregrain/proxmox-emcp:latest
```

### Required Environment Variables

- `PROXMOX_HOST`: Your Proxmox server IP/hostname (e.g., 192.168.1.100)
- `PROXMOX_TOKEN_NAME`: API token name from Proxmox
- `PROXMOX_TOKEN_VALUE`: API token value from Proxmox

You can also use a `.env` file and Docker Compose for easier management. See below for more details.

## Quick Start

### 1. Clone or Download

```bash
git clone <repository>
cd ProxmoxEmCP
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env with your Proxmox credentials
```

Required variables:

- `PROXMOX_HOST` - Your Proxmox server IP/hostname (e.g., 192.168.1.100)
- `PROXMOX_TOKEN_NAME` - API token name from Proxmox
- `PROXMOX_TOKEN_VALUE` - API token value from Proxmox

### 3. Run with Docker Compose

```bash
docker-compose up -d
```

### 4. Connect Your AI Assistant

Configure your AI assistant (Claude, Cline, etc.) to use the MCP server:

```json
{
  "mcpServers": {
    "proxmox": {
      "command": "docker",
      "args": ["attach", "proxmox-mcp"]
    }
  }
}
```

## 🤖 AI Agent Integration

To connect an AI agent (like Claude, Cline, or any MCP-compatible orchestrator) to your ProxmoxEmCP server, use a settings.json like this:

```json
{
  "mcpServers": {
    "proxmox": {
      "image": "puregrain/proxmox-emcp:latest",
      "env": {
        "PROXMOX_HOST": "192.168.1.100",
        "PROXMOX_TOKEN_NAME": "your-token-name",
        "PROXMOX_TOKEN_VALUE": "your-token-value",
        "PROXMOX_USER": "root@pam",
        "PROXMOX_VERIFY_SSL": "false",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

- Replace the values with your actual Proxmox credentials.
- The env block passes environment variables to the container at launch.
- The image field tells the orchestrator which Docker image to use.

See the included `settings.example.json` file for a ready-to-edit template.

## Creating Proxmox API Token

1. Log into Proxmox Web UI
2. Go to Datacenter → Permissions → API Tokens
3. Click "Add" and create a new token:
   - User: root@pam (or your user)
   - Token ID: choose a name
   - Privilege Separation: Unchecked (for full access)
4. Copy the token value (shown only once!)

## Available MCP Tools

### Node Management

- `get_nodes` - List all nodes in the cluster
- `get_node_status` - Get detailed status for a specific node

### VM Operations

- `get_vms` - List all VMs across the cluster
- `get_vm_status` - Get VM status and configuration
- `start_vm` - Start a virtual machine
- `stop_vm` - Stop a virtual machine gracefully
- `reboot_vm` - Reboot a virtual machine
- `execute_vm_command` - Execute commands via QEMU guest agent

### Snapshot Management

- `create_vm_snapshot` - Create a VM snapshot
- `list_vm_snapshots` - List all snapshots for a VM

### Storage & Cluster

- `get_storage` - List storage pools
- `get_cluster_status` - Get cluster health information
- `get_task_status` - Check Proxmox task status

## Alternative Deployment Methods

### Run with Docker (without Compose)

```bash
docker build -t proxmox-mcp .
docker run -it \
  -e PROXMOX_HOST=192.168.1.100 \
  -e PROXMOX_TOKEN_NAME=your-token \
  -e PROXMOX_TOKEN_VALUE=your-token-value \
  proxmox-mcp
```

### Run Locally (without Docker)

```bash
pip install -r requirements.txt
export PROXMOX_HOST=192.168.1.100
export PROXMOX_TOKEN_NAME=your-token
export PROXMOX_TOKEN_VALUE=your-token-value

# For MCP clients (Claude Desktop, MCPO, etc.) - uses stdio transport
python mcp_server_stdio.py

# For HTTP API access (standalone REST API) - uses HTTP transport
# python mcp_server_http.py  # Available but not primary
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PROXMOX_HOST` | Yes | - | Proxmox server IP/hostname |
| `PROXMOX_TOKEN_NAME` | Yes | - | API token name |
| `PROXMOX_TOKEN_VALUE` | Yes | - | API token value |
| `PROXMOX_USER` | No | root@pam | Proxmox user |
| `PROXMOX_VERIFY_SSL` | No | false | Verify SSL certificates |
| `LOG_LEVEL` | No | INFO | Logging level |

## Modifying Configuration After Deployment

Since configuration is via environment variables, you can:

**Update and restart the container:**

```bash
docker-compose down
# Edit .env file
docker-compose up -d
```

**Or use docker exec to check/modify:**

```bash
docker exec -it proxmox-mcp /bin/bash
# Check current config
env | grep PROXMOX
```

## Architecture

```bash
┌─────────────────┐
│   AI Assistant  │
│  (Claude, etc)  │
└────────┬────────┘
         │ MCP Protocol
         ▼
┌─────────────────┐
│  MCP Server     │
│  (Python/Docker)│
└────────┬────────┘
         │ API Calls
         ▼
┌─────────────────┐
│  Proxmox VE     │
│    Cluster      │
└─────────────────┘
```

## Troubleshooting

### Server won't start

- Check environment variables are set correctly
- Verify Proxmox host is reachable
- Confirm API token has proper permissions

### Connection errors

- Ensure `PROXMOX_VERIFY_SSL=false` if using self-signed certificates
- Check firewall allows connection to Proxmox port 8006

### View logs

```bash
docker logs proxmox-mcp
```

## Security Considerations

- API tokens are more secure than passwords
- Use environment variables or Docker secrets for credentials
- Never commit `.env` files to version control
- Consider network isolation for production deployments
- Use SSL verification in production environments

## Development

To modify or extend the server:

1. Edit `mcp_server_stdio.py` (for MCP clients) or `mcp_server_http.py` (for HTTP API)
2. Rebuild the Docker image: `docker-compose build`
3. Restart the container: `docker-compose up -d`

**Note:** The Docker container uses `mcp_server_stdio.py` by default for MCP compatibility.

## 🛠️ Development & Contribution

### Pre-commit Hooks (Linting & Secrets)

This project uses [pre-commit](https://pre-commit.com/) to automate code style, linting, and secrets scanning before every commit.

**To set up pre-commit hooks locally:**

```bash
pip install pre-commit
pre-commit install
```

**To run all hooks manually:**

```bash
pre-commit run --all-files
```

Hooks include:

- `black` (Python code formatter)
- `flake8` (Python linter)
- `detect-secrets` (secret scanning)
- Common whitespace and YAML checks

If a hook fails, fix the reported issues and re-commit.

See `.pre-commit-config.yaml` for details.

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review Proxmox API documentation
3. Verify MCP protocol compatibility

# Proxmox MCP Server

## Overview

Proxmox MCP Server is a lightweight containerized application for managing and monitoring Proxmox VMs and nodes using the official MCP SDK.

## Updates

### Version 2.1.0

- **Base Image**: Switched to Alpine (`python:3.14-alpine`) for reduced image size and improved security.

- **Package Manager**: Replaced `apt-get` commands with `apk` equivalents.

- **Environment Variables**:

  - Required:

    - `PROXMOX_HOST`: Proxmox server address (e.g., `192.168.1.100`).

    - `PROXMOX_TOKEN_NAME`: API token name.

    - `PROXMOX_TOKEN_VALUE`: API token value.

  - Optional:

    - `PROXMOX_USER`: Defaults to `root@pam`.

    - `PROXMOX_VERIFY_SSL`: Defaults to `false`.

    - `LOG_LEVEL`: Defaults to `INFO`.

- **Port Mapping**: Default port is `8811`. Update the `docker run` command to map this port correctly.

## Running the Container

### Example Command

```bash

docker run --rm -p 8811:8811 --env-file .env proxmox-emcp

```

## Scout Health Score Improvements

- Addressed issues with unapproved and outdated base images.

- Enhanced supply chain security by using a non-root user and adding metadata.

## Documentation

Refer to the `.env` file for environment variable configuration.
