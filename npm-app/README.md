# @puregrain/proxmox-emcp-node

A native Node.js implementation of the ProxmoxEmCP server using the Model Context Protocol (MCP). This package provides a comprehensive API for managing and monitoring Proxmox virtual machines, nodes, and clusters.

## Installation

```bash
npm install @puregrain/proxmox-emcp-node
# or
npx @puregrain/proxmox-emcp-node
```

## Features

- **Native Node.js Implementation**: No Docker required - runs directly in Node.js
- **Complete Proxmox API Coverage**: Manage VMs, nodes, storage, and clusters
- **MCP Protocol Support**: Compatible with any MCP client/orchestrator
- **Environment-based Configuration**: Simple setup via environment variables
- **Error Handling**: Graceful degradation with detailed error messages

## Usage

### With npx

```bash
PROXMOX_HOST=192.168.1.100 \
PROXMOX_TOKEN_NAME=your-token \
PROXMOX_TOKEN_VALUE=your-token-value \
npx @puregrain/proxmox-emcp-node
```

### With MCP Orchestrators

Add to your MCP configuration (e.g., Claude Desktop settings.json):

```json
{
  "mcpServers": {
    "proxmox": {
      "command": "npx",
      "args": ["@puregrain/proxmox-emcp-node"],
      "env": {
        "PROXMOX_HOST": "192.168.1.100",
        "PROXMOX_TOKEN_NAME": "your-token",
        "PROXMOX_TOKEN_VALUE": "your-token-value"
      }
    }
  }
}
```

### As a Module

```javascript
import { ProxmoxManager } from '@puregrain/proxmox-emcp-node';

// Environment variables must be set
const proxmox = new ProxmoxManager();
const vms = await proxmox.getVMs();
```

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PROXMOX_HOST` | Yes | Proxmox server address | `192.168.1.100` |
| `PROXMOX_TOKEN_NAME` | Yes | API token name | `mytoken` |
| `PROXMOX_TOKEN_VALUE` | Yes | API token value | `secret-token` |
| `PROXMOX_USER` | No | User (defaults to root@pam) | `root@pam` |
| `PROXMOX_VERIFY_SSL` | No | Verify SSL certificates | `false` |
| `LOG_LEVEL` | No | Logging level | `DEBUG` |

## Available Tools

The ProxmoxEmCP server exposes the following tools:

### Node Operations

- `get_nodes` - List all nodes in the cluster
- `get_node_status` - Get detailed status for a specific node

### VM Operations

- `get_vms` - List all VMs across the cluster
- `get_vm_status` - Get status and configuration for a specific VM
- `start_vm` - Start a virtual machine
- `stop_vm` - Stop a virtual machine gracefully
- `reboot_vm` - Reboot a virtual machine
- `execute_vm_command` - Execute commands via QEMU guest agent
- `create_vm_snapshot` - Create a VM snapshot
- `list_vm_snapshots` - List all snapshots for a VM

### Storage & Cluster

- `get_storage` - List storage pools in the cluster
- `get_cluster_status` - Get cluster status and health information
- `get_task_status` - Get status of a Proxmox task

## Creating a Proxmox API Token

1. Log into your Proxmox web interface
2. Navigate to Datacenter → Permissions → API Tokens
3. Click "Add" to create a new token
4. Select the user and give the token a name
5. Optionally uncheck "Privilege Separation" for full user permissions
6. Copy the token value (shown only once!)

## Requirements

- Node.js 18+
- Proxmox VE 7.0+ with API access
- Valid API token with appropriate permissions

## Changelog

### v0.3.6 (2025-10-17)

- Updated version to 0.3.6
- Fixed version consistency issues in `check-version.js`

### v0.3.4 (2024-12-17)

- Added automatic version consistency checks
- Added publishing safeguards to prevent version mismatches

### v0.3.3 (2024-12-17)

- Complete rewrite as native Node.js implementation
- Removed Docker dependency
- Added comprehensive Proxmox API coverage
- Improved error handling and logging
- Updated MCP SDK to ^1.18.0

### v0.3.2 and earlier

- Docker wrapper implementation (deprecated)

## License

MIT

## Author

PureGrain at SLA Ops, LLC

## Support

- [GitHub Issues](https://github.com/PureGrain/ProxmoxEmCP/issues)
- [Buy me a coffee](https://buymeacoffee.com/puregrain)
