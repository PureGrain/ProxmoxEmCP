# @puregrain/proxmox-emcp-node

A Node.js CLI wrapper to launch the ProxmoxEmCP Docker image as a Model Context Protocol (MCP) server. This allows you to use your Proxmox MCP server with npx, Open WebUI, or any MCP orchestrator that expects a Node.js-compatible CLI.

## Usage

### With npx

```sh
PROXMOX_HOST=192.168.1.100 PROXMOX_TOKEN_NAME=your-token PROXMOX_TOKEN_VALUE=your-token-value npx @puregrain/proxmox-emcp-node
```

Or add to your orchestrator's settings.json:

```json
{
  "mcpServers": {
    "proxmox": {
      "command": "npx",
      "args": ["@puregrain/proxmox-emcp-node"]
    }
  }
}
```

Environment variables (PROXMOX_HOST, PROXMOX_TOKEN_NAME, PROXMOX_TOKEN_VALUE, etc.) are passed to the Docker container.

## Requirements
- Docker must be installed and running.
- Node.js 18+ is recommended.

## License
MIT
