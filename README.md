# Proxmox MCP Server

[![GitHub Sponsors](https://img.shields.io/github/sponsors/PureGrain?label=Sponsor&logo=GitHub-Sponsors&style=for-the-badge)](https://github.com/sponsors/PureGrain)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support-yellow?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/puregrain)

[![Docker Build](https://github.com/PureGrain/ProxmoxEmCP/actions/workflows/docker-multiarch.yml/badge.svg)](https://github.com/PureGrain/ProxmoxEmCP/actions/workflows/docker-multiarch.yml)
[![NPM Publish](https://github.com/PureGrain/ProxmoxEmCP/actions/workflows/publish-npm.yml/badge.svg)](https://github.com/PureGrain/ProxmoxEmCP/actions/workflows/publish-npm.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/puregrain/proxmox-emcp?logo=docker)](https://hub.docker.com/r/puregrain/proxmox-emcp)
[![NPM Version](https://img.shields.io/npm/v/@puregrain/proxmox-emcp-node?logo=npm)](https://www.npmjs.com/package/@puregrain/proxmox-emcp-node)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Security: Dependabot](https://img.shields.io/badge/dependabot-enabled-brightgreen?logo=dependabot)](https://github.com/PureGrain/ProxmoxEmCP/security/dependabot)

A Model Context Protocol (MCP) server for managing Proxmox VE infrastructure through AI assistants. Available as an npm package, Docker container, or standalone Python application.

## Project Background

In May 2025, we launched the original ProxmoxMCP server with FastMCP, FastAPI, and virtual environments. Based on community feedback and operational experience, we rebuilt the project as ProxmoxEmCP - a cleaner, simpler implementation that eliminates setup complexity while maintaining full functionality. This version uses the official MCP SDK directly and runs without virtual environment dependencies, making deployment and maintenance significantly easier.

## Table of Contents

- [Quick Start](#quick-start)
  - [npm/npx](#npmnnpx)
  - [Docker Hub](#docker-hub)
- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
  - [npm Package](#npm-package)
  - [Docker Container](#docker-container)
  - [Local Python](#local-python)
  - [Open WebUI Integration](#open-webui-integration)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Creating API Token](#creating-api-token)
- [AI Agent Integration](#ai-agent-integration)
- [Available MCP Tools](#available-mcp-tools)
  - [Node Management](#node-management)
  - [VM Operations](#vm-operations)
  - [Container Operations](#container-operations-lxc)
  - [Storage & Backup](#storage--backup)
  - [Monitoring & Logs](#monitoring--logs)
  - [Access Control](#access-control)
  - [Network & Security](#network--security)
- [Architecture](#architecture)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Support](#support)

## Quick Start

### npm/npx

```bash
# Install globally
npm install -g @puregrain/proxmox-emcp-node

# Or run directly with npx
npx @puregrain/proxmox-emcp-node
```

### Docker Hub

```bash
docker run -d \
  --name proxmox-emcp \
  -e PROXMOX_HOST="192.168.1.100" \
  -e PROXMOX_TOKEN_ID="your-token-id" \
  -e PROXMOX_TOKEN_SECRET="your-token-secret" \
  puregrain/proxmox-emcp:latest
```

## Prerequisites

- **Proxmox VE**: Version 7.0 or higher with API access enabled
- **For npm package**: Node.js 18+
- **For Docker**: Docker Engine installed
- **For local Python**: Python 3.9+
- **API Token**: Created in Proxmox with appropriate permissions

## Installation Methods

### npm Package

The npm package provides a native Node.js implementation without Docker requirements.

```bash
# Install globally
npm install -g @puregrain/proxmox-emcp-node

# Set environment variables
export PROXMOX_HOST="192.168.1.100"
export PROXMOX_TOKEN_ID="your-token-id"
export PROXMOX_TOKEN_SECRET="your-token-secret"

# Run the server
proxmox-emcp-node
```

**Using with npx (no installation required):**

```bash
PROXMOX_HOST=192.168.1.100 \
PROXMOX_TOKEN_ID=your-token-id \
PROXMOX_TOKEN_SECRET=your-token-secret \
npx @puregrain/proxmox-emcp-node
```

### Docker Container

#### Using Docker Compose (Recommended)

1. Clone the repository:

```bash
git clone https://github.com/PureGrain/ProxmoxEmCP.git
cd ProxmoxEmCP
```

2. Configure environment:

```bash
cp .env.example .env
# Edit .env with your Proxmox credentials
```

3. Start the container:

```bash
docker-compose up -d
```

#### Using Docker CLI

```bash
docker run -d \
  --name proxmox-emcp \
  -e PROXMOX_HOST="192.168.1.100" \
  -e PROXMOX_TOKEN_ID="your-token-id" \
  -e PROXMOX_TOKEN_SECRET="your-token-secret" \
  puregrain/proxmox-emcp:latest
```

#### Using GitHub Container Registry

```bash
docker run -d \
  --name proxmox-emcp \
  -e PROXMOX_HOST="192.168.1.100" \
  -e PROXMOX_TOKEN_ID="your-token-id" \
  -e PROXMOX_TOKEN_SECRET="your-token-secret" \
  ghcr.io/puregrain/proxmox-emcp:latest
```

### Local Python

```bash
# Clone the repository
git clone https://github.com/PureGrain/ProxmoxEmCP.git
cd ProxmoxEmCP

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export PROXMOX_HOST="192.168.1.100"
export PROXMOX_TOKEN_ID="your-token-id"
export PROXMOX_TOKEN_SECRET="your-token-secret"

# Run the server
python mcp_server_stdio.py
```

### Open WebUI Integration

For [Open WebUI](https://openwebui.com/) users, we provide **ProxmoxWeaver** - a specialized tool that brings full Proxmox management capabilities directly into your Open WebUI interface.

**ProxmoxWeaver** is a native Open WebUI tool that provides the same comprehensive Proxmox VE management features as our MCP server, but specifically designed for the Open WebUI ecosystem.

**Features:**

- Direct integration with Open WebUI's tool system
- Same powerful Proxmox management capabilities
- No additional containers or services required
- Simple installation through Open WebUI's tool marketplace

**Installation:**

1. Visit the [ProxmoxWeaver repository](https://github.com/PureGrain/openwebui-stuff/tree/main/tools/proxmoxweaver)
2. Copy the tool configuration
3. In Open WebUI, navigate to **Tools** → **Add Tool**
4. Paste the ProxmoxWeaver configuration
5. Configure your Proxmox credentials in the tool settings

**Usage:**

Once installed, ProxmoxWeaver appears as a native tool in Open WebUI, allowing you to:

- Query and manage VMs and containers
- Monitor cluster health and resources
- Execute commands and create snapshots
- Manage storage, backups, and templates
- All through natural language interactions in Open WebUI

This integration is perfect for teams already using Open WebUI who want to add Proxmox management capabilities without additional infrastructure.

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PROXMOX_HOST` | Yes | - | Proxmox server IP or hostname |
| `PROXMOX_TOKEN_ID` | Yes | - | API token ID |
| `PROXMOX_TOKEN_SECRET` | Yes | - | API token secret |
| `PROXMOX_USER` | No | root@pam | Proxmox user |
| `PROXMOX_VERIFY_SSL` | No | false | Verify SSL certificates |
| `LOG_LEVEL` | No | INFO | Logging level (DEBUG, INFO, WARNING, ERROR) |

### Creating API Token

1. Log into Proxmox Web UI
2. Navigate to **Datacenter** → **Permissions** → **API Tokens**
3. Click **Add** to create a new token
4. Configure the token:
   - **User**: Select your user (e.g., root@pam)
   - **Token ID**: Choose a descriptive name
   - **Privilege Separation**: Uncheck for full user permissions
5. Copy the token secret (shown only once!)

## AI Agent Integration

Configure your AI assistant (Claude Desktop, Cline, or any MCP-compatible client) to connect to the server.

### For npm Package

```json
{
  "mcpServers": {
    "proxmox": {
      "command": "npx",
      "args": ["@puregrain/proxmox-emcp-node"],
      "env": {
        "PROXMOX_HOST": "192.168.1.100",
        "PROXMOX_TOKEN_ID": "your-token-id",
        "PROXMOX_TOKEN_SECRET": "your-token-secret"
      }
    }
  }
}
```

### For Docker Container

```json
{
  "mcpServers": {
    "proxmox": {
      "command": "docker",
      "args": ["attach", "proxmox-emcp"],
      "env": {
        "PROXMOX_HOST": "192.168.1.100",
        "PROXMOX_TOKEN_ID": "your-token-id",
        "PROXMOX_TOKEN_SECRET": "your-token-secret"
      }
    }
  }
}
```

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
- `create_vm_snapshot` - Create a VM snapshot
- `list_vm_snapshots` - List all snapshots for a VM
- `get_vm_network` - Get VM network configuration

### Container Operations (LXC)

- `get_containers` - List all LXC containers
- `get_container_status` - Get container status and configuration
- `start_container` - Start a container
- `stop_container` - Stop a container gracefully
- `reboot_container` - Reboot a container
- `execute_container_command` - Execute commands in container
- `create_container_snapshot` - Create a container snapshot
- `list_container_snapshots` - List container snapshots

### Storage & Backup

- `get_storage` - List storage pools
- `get_storage_details` - Get detailed storage pool information
- `get_backups` - List backup files with filtering
- `list_templates` - List VM and container templates

### Monitoring & Logs

- `get_cluster_status` - Get comprehensive cluster health and resources
- `get_task_status` - Check Proxmox task status
- `get_recent_tasks` - List recent tasks with filtering
- `get_cluster_log` - Get cluster-wide log entries

### Access Control

- `get_users` - List all users with groups and tokens
- `get_groups` - List all groups with members
- `get_roles` - List all roles and privileges

### Network & Security

- `get_firewall_status` - Get firewall status and rules

## Architecture

```bash
┌─────────────────┐
│   AI Assistant  │
│  (Claude, etc)  │
└────────┬────────┘
         │ MCP Protocol
         ▼
┌─────────────────┐
│   MCP Server    │
│  (Node/Python)  │
└────────┬────────┘
         │ REST API
         ▼
┌─────────────────┐
│  Proxmox VE     │
│    Cluster      │
└─────────────────┘
```

## Development

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test` or `python -m pytest`
5. Submit a pull request

### Pre-commit Hooks

This project uses pre-commit for code quality:

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files
```

Hooks include:

- `black` - Python code formatter
- `flake8` - Python linter
- `detect-secrets` - Secret scanning
- YAML and whitespace validation

### Building Docker Image

```bash
docker build -t proxmox-emcp .
```

### Modifying the Server

- **Node.js version**: Edit files in `npm-app/`
- **Python version**: Edit `mcp_server_stdio.py`
- **Docker config**: Edit `Dockerfile` and `docker-compose.yml`

## Troubleshooting

### Connection Issues

- **Verify Proxmox is reachable**: `ping <PROXMOX_HOST>`
- **Check API port**: Ensure port 8006 is accessible
- **SSL certificates**: Set `PROXMOX_VERIFY_SSL=false` for self-signed certs

### Authentication Failures

- **Token permissions**: Ensure token has required permissions
- **Token format**: Verify `TOKEN_ID` and `TOKEN_SECRET` are correct
- **User privileges**: Check user has appropriate Proxmox permissions

### Viewing Logs

```bash
# Docker logs
docker logs proxmox-emcp

# npm/Node.js - set LOG_LEVEL
LOG_LEVEL=DEBUG npx @puregrain/proxmox-emcp-node
```

### Common Issues

- **"Connection refused"**: Check firewall and Proxmox API service
- **"Unauthorized"**: Verify token credentials
- **"SSL verification failed"**: Set `PROXMOX_VERIFY_SSL=false`

## License

MIT License - See [LICENSE](LICENSE) file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/PureGrain/ProxmoxEmCP/issues)
- **Documentation**: [MCP Configuration Guide](MCP_CONFIGURATION_GUIDE.md)
- **Sponsor**: [GitHub Sponsors](https://github.com/sponsors/PureGrain)
- **Buy Me A Coffee**: [Support Development](https://buymeacoffee.com/puregrain)

---

**Author**: PureGrain at SLA Ops, LLC
**Repository**: [github.com/PureGrain/ProxmoxEmCP](https://github.com/PureGrain/ProxmoxEmCP)
