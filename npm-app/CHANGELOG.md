# Changelog

## [0.4.5] - 2025-10-20

### Changes in Version 0.4.5

- Updated version to 0.4.5 for consistency
- Minor fixes and improvements

## [0.4.4] - 2025-10-19

### Changes in Version 0.4.4

- Updated version to 0.4.4 for consistency
- Minor fixes and improvements

## [0.4.3] - 2025-10-18

### Changes in Version 0.4.3

- Updated version to 0.4.3 for consistency
- Minor fixes and improvements

## [0.4.2] - 2025-10-17

### New Features in 0.4.2

- **New `get_help` Tool** - Comprehensive help documentation system
  - Returns structured documentation for all 32 available tools
  - Organized by categories (Node, VM, Container, Storage, Cluster, Network, User Management)
  - Includes usage examples and configuration requirements
  - Provides visual icons for better readability
  - Makes tool discovery explicit rather than AI-interpreted

### Enhancements in 0.4.2

- Test suite now validates the help tool functionality
- Better tool discoverability for AI/LLM consumers

## [0.4.1] - 2025-10-16

### Fixes in 0.4.1

- Version bump to resolve npm publish conflict (0.4.0 was already published)
- No functional changes from 0.4.0

## [0.4.0] - 2025-10-15

### 🎉 Major Update - 35+ New Features

#### Additions in 0.4.0

- **Container Management (8 operations)**
  - `get_containers` - List all LXC containers
  - `get_container_status` - Container status & config
  - `start_container`, `stop_container`, `reboot_container`
  - `execute_container_command` - Execute commands
  - `create_container_snapshot`, `list_container_snapshots`

- **Enhanced Cluster Status**
  - Comprehensive resource totals (CPU/RAM/Storage)
  - VM and container counts (running/stopped)
  - Node health aggregation
  - Quorum status

- **Storage & Backup Management**
  - `get_storage_details` - Detailed storage info with NFS support
  - `get_backups` - List and filter backup files
  - Storage usage per node

- **User & Access Control**
  - `get_users` - List users with groups and tokens
  - `get_groups` - List groups with members
  - `get_roles` - List all available roles

- **Network & Security**
  - `get_vm_network` - Network configuration for VMs/containers
  - `get_firewall_status` - Firewall rules and status

- **Advanced Monitoring**
  - `get_recent_tasks` - Task history with filtering
  - `get_cluster_log` - Cluster-wide log entries

- **Template Management**
  - `list_templates` - List VM/container templates

#### Changes in 0.4.0

- **BREAKING**: Environment variables renamed:
  - `PROXMOX_TOKEN_NAME` → `PROXMOX_TOKEN_ID`
  - `PROXMOX_TOKEN_VALUE` → `PROXMOX_TOKEN_SECRET`

#### Technical Details in 0.4.0

- Ported 35+ functions from Python container implementation
- All functions return raw JSON for optimal AI/LLM consumption
- Maintained backward compatibility with existing VM operations

## [0.3.7] - 2025-10-14

### Fixes in 0.3.7

- Updated version to 0.3.7

## [0.3.6] - 2025-10-13

### Fixes in 0.3.6

- Updated version to 0.3.6
- Fixed version consistency issues in `check-version.js`

## [0.3.4] - 2024-12-17

### Additions in 0.3.4

- Automatic version consistency checks via `check-version.js`
- npm lifecycle hooks for version validation:
  - `preversion` - Validates before version bumps
  - `prepublishOnly` - Validates before publishing
- Publishing guide with version management workflow

### Changes in 0.3.4

- Updated package.json scripts for better developer experience

## [0.3.3] - 2024-12-16

### Changes in 0.3.3

- **BREAKING**: Complete rewrite as native Node.js implementation
- Removed Docker dependency - now runs directly in Node.js
- Changed main entry point from `cli.cjs` to `index.js`
- Switched to ES modules (`type: "module"`)
- Updated MCP SDK dependency to ^1.18.0

### Additions in 0.3.3

- Full ProxmoxEmCP server implementation in JavaScript
- Complete Proxmox API coverage:
  - VM operations (start, stop, reboot, execute commands)
  - Node operations and status monitoring
  - Snapshot management
  - Storage and cluster status
  - Task tracking
- Improved error handling with graceful degradation
- Environment variable validation with helpful error messages
- Comprehensive logging to stderr (avoids stdio conflict)

### Fixes in 0.3.3

- MCP protocol compatibility with proper request schemas
- Server capabilities declaration for tools support
- Connection issues with MCPO and other MCP orchestrators

## [0.3.2] - 2024-12-15

### Additions in 0.3.2

- Docker wrapper implementation
- Basic MCP server functionality via Docker container
- Environment variable passing to Docker

### Known Issues in 0.3.2

- Connection closed errors with some MCP orchestrators
- Required Docker to be installed and running

## [0.3.1] - 2024-12-14

### Additions in 0.3.1

- Initial npm package setup
- Basic Docker wrapper script

## [0.3.0] - 2024-12-13

### Additions in 0.3.0

- Initial release with Docker-based approach
