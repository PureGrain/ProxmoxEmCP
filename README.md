<!--
title: Proxmox MCP Server Documentation
author: PureGrain at SLA Ops, LLC
author_url: https://github.com/PureGrain
repo_url: https://github.com/PureGrain/ProxmoxMCP
version: 2.0.0
license: MIT
description: Complete documentation for Proxmox MCP Server implementation
-->

# Proxmox MCP Server - Clean Implementation

A containerized MCP (Model Context Protocol) server for managing Proxmox VE through AI assistants. This implementation uses the official MCP SDK and runs in Docker without virtual environments.

## Features

- ✅ Official MCP SDK implementation
- 🐳 Containerized deployment (no venv needed)
- 🔐 Environment variable configuration
- 🚀 Simple setup and deployment
- 📦 Lightweight and efficient
- 🔧 Full Proxmox VE management capabilities

## Quick Start

### 1. Clone or Download

```bash
git clone <repository>
cd ProxmoxMCP-Clean
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
python mcp_server.py
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

1. **Update and restart the container:**

```bash
docker-compose down
# Edit .env file
docker-compose up -d
```

2. **Or use docker exec to check/modify:**

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

1. Edit `mcp_server.py` with your changes
2. Rebuild the Docker image: `docker-compose build`
3. Restart the container: `docker-compose up -d`

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review Proxmox API documentation
3. Verify MCP protocol compatibility
