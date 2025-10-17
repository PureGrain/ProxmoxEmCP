# Changelog

All notable changes to @puregrain/proxmox-emcp-node will be documented in this file.

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
