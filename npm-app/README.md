# @puregrain/proxmox-emcp-node

> ## 🚨⚠️ **BREAKING CHANGE IN v0.4.0** ⚠️🚨
>
> ### 🔴 **CRITICAL: Environment Variables Have Changed!** 🔴
>
> | ❌ **OLD (v0.3.x)** | ✅ **NEW (v0.4.0+)** |
> |-------------------|-------------------|
> | `PROXMOX_TOKEN_NAME` | `PROXMOX_TOKEN_ID` |
> | `PROXMOX_TOKEN_VALUE` | `PROXMOX_TOKEN_SECRET` |
>
> **⚡ You MUST update your environment variables or the connection will fail! ⚡**
>
> ```bash
> # ❌ OLD (WILL NOT WORK)
> export PROXMOX_TOKEN_NAME="mytoken"
> export PROXMOX_TOKEN_VALUE="secret"
>
> # ✅ NEW (REQUIRED)
> export PROXMOX_TOKEN_ID="mytoken"
> export PROXMOX_TOKEN_SECRET="secret"
> ```
>
> ---

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
| `PROXMOX_TOKEN_ID` | Yes | API token ID | `mytoken` |
| `PROXMOX_TOKEN_SECRET` | Yes | API token secret | `secret-token` |
| `PROXMOX_USER` | No | User (defaults to root@pam) | `root@pam` |
| `PROXMOX_VERIFY_SSL` | No | Verify SSL certificates | `false` |
| `LOG_LEVEL` | No | Logging level | `DEBUG` |

## Available Tools

The ProxmoxEmCP server now exposes 35+ tools across multiple categories:

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

### Container Operations (NEW)

- `get_containers` - List all LXC containers
- `get_container_status` - Get container status and configuration
- `start_container` - Start an LXC container
- `stop_container` - Stop a container gracefully
- `reboot_container` - Reboot a container
- `execute_container_command` - Execute commands in a container
- `create_container_snapshot` - Create container snapshot
- `list_container_snapshots` - List container snapshots

### Storage & Backup (ENHANCED)

- `get_storage` - List storage pools in the cluster
- `get_storage_details` - Detailed storage information with NFS support
- `get_backups` - List and filter backup files
- `get_cluster_status` - **Enhanced** with resource totals and VM/container counts
- `get_task_status` - Get status of a Proxmox task

### User & Access Control (NEW)

- `get_users` - List all users with groups and tokens
- `get_groups` - List all groups with members
- `get_roles` - List all available roles

### Network & Security (NEW)

- `get_vm_network` - Get network configuration for VMs/containers
- `get_firewall_status` - Get firewall rules and status

### Monitoring (NEW)

- `get_recent_tasks` - List recent tasks with filtering
- `get_cluster_log` - Get cluster-wide log entries

### Templates (NEW)

- `list_templates` - List VM and container templates

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

### v0.4.2 (2025-10-19)

- Added `get_help` tool for comprehensive documentation
- Provides structured documentation for all 32 available tools
- Organized by categories with descriptions and usage examples
- Enhanced tool discoverability for AI/LLM consumers

### v0.4.1 (2025-10-19)

- Version bump to resolve npm publish conflict
- No functional changes from v0.4.0

### v0.4.0 (2025-10-19) - MAJOR UPDATE

**🚀 35+ New Features Added!**

- **Container Management**: Full LXC container support (8 operations)
- **Enhanced Cluster Status**: Resource totals, VM/container counts, quorum status
- **Storage Management**: Detailed storage info, NFS support, backup listings
- **User Access Control**: Users, groups, and roles management
- **Network & Security**: Network configuration and firewall rules
- **Advanced Monitoring**: Task history and cluster logs
- **Template Management**: List VM/container templates
- **Environment Variables**: Changed to `PROXMOX_TOKEN_ID` and `PROXMOX_TOKEN_SECRET`

### v0.3.7 (2025-10-17)

- Updated version to 0.3.7
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
