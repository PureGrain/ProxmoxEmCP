<!--
title: Open WebUI MCPO Configuration for ProxmoxEmCP
author: PureGrain at SLA Ops, LLC
author_url: https://github.com/PureGrain
repo_url: https://github.com/PureGrain/ProxmoxEmCP
funding_url: https://buymeacoffee.com/puregrain
license: MIT
description: Complete setup guide for using ProxmoxEmCP with Open WebUI's MCPO orchestrator
-->

# Open WebUI MCPO Configuration for ProxmoxEmCP

## Understanding Open WebUI's MCPO

Open WebUI's MCPO orchestrator runs MCP servers from within its own container environment. This means we need to configure our ProxmoxEmCP server to be accessible from inside the MCPO container.

## Configuration Options

### Option 1: Using NPX (Recommended - Native Node.js)

This uses our npm package directly without Docker:

**Step 1: Set environment variables in Open WebUI**
Go to Open WebUI Settings → Environment Variables and add:
```
PROXMOX_HOST=192.168.1.100
PROXMOX_TOKEN_NAME=your-token
PROXMOX_TOKEN_VALUE=your-token-value
PROXMOX_USER=root@pam
PROXMOX_VERIFY_SSL=false
LOG_LEVEL=INFO
```

**Step 2: Configure MCP Server in Open WebUI**
```json
{
  "mcpServers": {
    "proxmox": {
      "command": "npx",
      "args": ["@puregrain/proxmox-emcp-node"],
      "env": {
        "PROXMOX_HOST": "${PROXMOX_HOST}",
        "PROXMOX_TOKEN_NAME": "${PROXMOX_TOKEN_NAME}",
        "PROXMOX_TOKEN_VALUE": "${PROXMOX_TOKEN_VALUE}",
        "PROXMOX_USER": "${PROXMOX_USER}",
        "PROXMOX_VERIFY_SSL": "${PROXMOX_VERIFY_SSL}",
        "LOG_LEVEL": "${LOG_LEVEL}"
      }
    }
  }
}
```

### Option 2: Using Docker-in-Docker

If Open WebUI has Docker available inside its container:

```json
{
  "mcpServers": {
    "proxmox": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--network", "host",
        "-e", "PROXMOX_HOST=${PROXMOX_HOST}",
        "-e", "PROXMOX_TOKEN_NAME=${PROXMOX_TOKEN_NAME}",
        "-e", "PROXMOX_TOKEN_VALUE=${PROXMOX_TOKEN_VALUE}",
        "puregrain/proxmox-emcp:latest"
      ]
    }
  }
}
```

### Option 3: Direct Python Execution

If you have the Python script available in Open WebUI's container:

**Step 1: Mount the script into Open WebUI container**
Add to your docker-compose.yml for Open WebUI:
```yaml
volumes:
  - ./ProxmoxEmCP/mcp_server.py:/app/proxmox_mcp.py
  - ./ProxmoxEmCP/requirements.txt:/app/proxmox_requirements.txt
```

**Step 2: Install dependencies in Open WebUI container**
```bash
docker exec -it openwebui pip install -r /app/proxmox_requirements.txt
```

**Step 3: Configure MCP Server**
```json
{
  "mcpServers": {
    "proxmox": {
      "command": "python",
      "args": ["/app/proxmox_mcp.py"],
      "env": {
        "PROXMOX_HOST": "${PROXMOX_HOST}",
        "PROXMOX_TOKEN_NAME": "${PROXMOX_TOKEN_NAME}",
        "PROXMOX_TOKEN_VALUE": "${PROXMOX_TOKEN_VALUE}"
      }
    }
  }
}
```

## Quick Fix for Your Current Error

The error shows MCPO is looking for `/app/mcp_server.py` which doesn't exist. Here's the quickest fix:

### Using NPX (No Docker Required):

1. **Install Node.js in Open WebUI container** (if not already present):
```bash
docker exec -it openwebui apt-get update && apt-get install -y nodejs npm
```

2. **Configure in Open WebUI**:
```json
{
  "mcpServers": {
    "proxmox": {
      "command": "npx",
      "args": ["@puregrain/proxmox-emcp-node"],
      "env": {
        "PROXMOX_HOST": "YOUR_PROXMOX_IP",
        "PROXMOX_TOKEN_NAME": "YOUR_TOKEN_NAME",
        "PROXMOX_TOKEN_VALUE": "YOUR_TOKEN_VALUE"
      }
    }
  }
}
```

## Troubleshooting

### Error: "python: can't open file '/app/mcp_server.py'"
- The Python script path is incorrect
- Solution: Use npx method or correct the path

### Error: "npx: command not found"
- Node.js/npm not installed in Open WebUI container
- Solution: Install Node.js as shown above

### Error: "docker: command not found"
- Docker not available inside Open WebUI container
- Solution: Use npx method instead

## Environment Variables

Set these in Open WebUI's environment or docker-compose:

```yaml
environment:
  - PROXMOX_HOST=192.168.1.100
  - PROXMOX_TOKEN_NAME=mcp-token
  - PROXMOX_TOKEN_VALUE=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  - PROXMOX_USER=root@pam
  - PROXMOX_VERIFY_SSL=false
  - LOG_LEVEL=INFO
```

## Testing the Connection

1. Check MCPO logs:
```bash
docker logs openwebui -f
```

2. Test from inside Open WebUI:
- Go to a chat
- Type: "List my Proxmox nodes"
- The assistant should be able to query your Proxmox server

## Recommended Setup

For Open WebUI, we recommend using the **NPX method** as it:
- Doesn't require Docker-in-Docker
- Uses the native Node.js implementation
- Is easier to debug
- Has better performance

## Support

- GitHub Issues: https://github.com/PureGrain/ProxmoxEmCP/issues
- Open WebUI Docs: https://docs.openwebui.com/openapi-servers/mcp
- Buy Me a Coffee: https://buymeacoffee.com/puregrain
