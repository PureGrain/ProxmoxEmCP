# Changelog

All notable changes to @puregrain/proxmox-emcp-node will be documented in this file.

## [0.4.0] - 2025-10-19

### 🎉 Major Update - 35+ New Features!

#### Added
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

#### Changed
- **BREAKING**: Environment variables renamed:
  - `PROXMOX_TOKEN_NAME` → `PROXMOX_TOKEN_ID`
  - `PROXMOX_TOKEN_VALUE` → `PROXMOX_TOKEN_SECRET`

#### Technical Details
- Ported 35+ functions from Python container implementation
- All functions return raw JSON for optimal AI/LLM consumption
- Maintained backward compatibility with existing VM operations

## [0.3.7] - 2025-10-17

### Fixed

- Updated version to 0.3.7

## [0.3.6] - 2025-10-17

### Fixed

- Updated version to 0.3.6
- Fixed version consistency issues in `check-version.js`

## [0.3.4] - 2024-12-17

### Added

- Automatic version consistency checks via `check-version.js`
- npm lifecycle hooks for version validation:
  - `preversion` - Validates before version bumps
  - `prepublishOnly` - Validates before publishing
- Publishing guide with version management workflow

### Changed

- Updated package.json scripts for better developer experience

## [0.3.3] - 2024-12-17

### Changed

- **BREAKING**: Complete rewrite as native Node.js implementation
- Removed Docker dependency - now runs directly in Node.js
- Changed main entry point from `cli.cjs` to `index.js`
- Switched to ES modules (`type: "module"`)
- Updated MCP SDK dependency to ^1.18.0

### Added

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

### Fixed

- MCP protocol compatibility with proper request schemas
- Server capabilities declaration for tools support
- Connection issues with MCPO and other MCP orchestrators

## [0.3.2] - 2024-12-17

### Added

- Docker wrapper implementation
- Basic MCP server functionality via Docker container
- Environment variable passing to Docker

### Known Issues

- Connection closed errors with some MCP orchestrators
- Required Docker to be installed and running

## [0.3.1] - 2024-12-16

### Added

- Initial npm package setup
- Basic Docker wrapper script

## [0.3.0] - 2024-12-16

### Added

- Initial release with Docker-based approach
