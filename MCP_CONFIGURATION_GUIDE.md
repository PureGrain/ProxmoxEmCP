<!--
title: MCP Configuration Guide
author: PureGrain at SLA Ops, LLC
author_url: https://github.com/PureGrain
repo_url: https://github.com/PureGrain/ProxmoxEmCP
funding_url: https://buymeacoffee.com/puregrain
license: MIT
description: Complete guide for configuring ProxmoxEmCP with various MCP orchestrators
-->

# ProxmoxEmCP MCP Configuration Guide

## 🚨 Troubleshooting Connection Errors

### Error: "No such file or directory: 'cmd'"
This error occurs when the orchestrator is configured for Windows but running on Linux/Mac.

**Solution:** Use the correct configuration format for your system (see examples below).

## Configuration Examples

### Option 1: Docker (Recommended for all platforms)

**settings.json:**
```json
{
  "mcpServers": {
    "proxmox": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-e", "PROXMOX_HOST=192.168.1.100",
        "-e", "PROXMOX_TOKEN_NAME=your-token-name",
        "-e", "PROXMOX_TOKEN_VALUE=your-token-value",
        "-e", "PROXMOX_USER=root@pam",
        "-e", "PROXMOX_VERIFY_SSL=false",
        "-e", "LOG_LEVEL=INFO",
        "puregrain/proxmox-emcp:latest"
      ]
    }
  }
}
```

### Option 2: Native Node.js Package (No Docker Required)

**settings.json:**
```json
{
  "mcpServers": {
    "proxmox": {
      "command": "npx",
      "args": ["@puregrain/proxmox-emcp-node"],
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

### Option 3: Python Direct (For Development)

**settings.json:**
```json
{
  "mcpServers": {
    "proxmox": {
      "command": "python",
      "args": ["path/to/ProxmoxEmCP/mcp_server.py"],
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

### Option 4: Windows Command Prompt

**settings.json (Windows only):**
```json
{
  "mcpServers": {
    "proxmox": {
      "command": "cmd",
      "args": ["/c", "docker", "run", "--rm", "-i",
        "-e", "PROXMOX_HOST=192.168.1.100",
        "-e", "PROXMOX_TOKEN_NAME=your-token-name",
        "-e", "PROXMOX_TOKEN_VALUE=your-token-value",
        "puregrain/proxmox-emcp:latest"
      ]
    }
  }
}
```

## Required Environment Variables

All configurations require these environment variables:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PROXMOX_HOST` | Yes | Proxmox server IP/hostname | `192.168.1.100` |
| `PROXMOX_TOKEN_NAME` | Yes | API token name | `mcp-token` |
| `PROXMOX_TOKEN_VALUE` | Yes | API token value | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `PROXMOX_USER` | No | Proxmox user (default: `root@pam`) | `root@pam` |
| `PROXMOX_VERIFY_SSL` | No | Verify SSL certs (default: `false`) | `false` |
| `LOG_LEVEL` | No | Logging level (default: `INFO`) | `DEBUG` |

## Verifying Your Configuration

### Test Docker Installation:
```bash
docker --version
docker pull puregrain/proxmox-emcp:latest
```

### Test Python Installation:
```bash
python --version
python -c "import mcp; print('MCP SDK installed')"
```

### Test Node.js/npm:
```bash
node --version
npx @puregrain/proxmox-emcp-node --version
```

## Common Issues and Solutions

### 1. "Command not found" errors
- **Issue**: The command specified in `command` field doesn't exist
- **Solution**: Verify the command is installed and in PATH

### 2. "Permission denied" errors
- **Issue**: Docker requires elevated permissions
- **Solution**: Add user to docker group or use sudo

### 3. "Connection refused" errors
- **Issue**: Proxmox server not reachable
- **Solution**: Check PROXMOX_HOST and firewall settings

### 4. "401 Unauthorized" errors
- **Issue**: Invalid API token
- **Solution**: Verify token name and value in Proxmox

## Platform-Specific Notes

### macOS/Linux
- Use `docker` directly (not `cmd /c docker`)
- Python usually installed as `python3`
- May need to use `sudo` for Docker

### Windows
- Use `cmd /c` prefix for shell commands if needed
- Python installed as `python` or `py`
- Docker Desktop must be running

### WSL (Windows Subsystem for Linux)
- Use Linux configuration format
- Ensure Docker Desktop is configured for WSL2
- Use Linux paths, not Windows paths

## Getting Help

1. Check logs: `docker logs <container_id>`
2. Enable debug logging: Set `LOG_LEVEL=DEBUG`
3. Test connection: `curl -k https://YOUR_PROXMOX_HOST:8006`
4. GitHub Issues: https://github.com/PureGrain/ProxmoxEmCP/issues
