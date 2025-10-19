# ProxmoxEmCP Container → npm-app Migration Plan

## Overview
We're porting 35+ features from the Python container to the Node.js npm app. This document outlines the implementation strategy.

## Current State Analysis

### Container (Python) Structure
- Uses `proxmoxer` library with direct API calls
- Environment vars: `PROXMOX_TOKEN_ID` and `PROXMOX_TOKEN_SECRET`
- Returns raw JSON for AI consumption
- 35+ functions across multiple domains

### npm-app (Node.js) Structure
- Uses `axios` for HTTP requests
- Environment vars: `PROXMOX_TOKEN_NAME` and `PROXMOX_TOKEN_VALUE`
- Already has `apiCall()` helper method
- Currently has ~10 functions (VMs, nodes, basic operations)

## Migration Strategy

### Phase 1: Container Management (Day 1)
**8 Functions to Port:**

1. `getContainers()` - List all LXC containers
2. `getContainerStatus(node, vmid)` - Get container status
3. `startContainer(node, vmid)` - Start a container
4. `stopContainer(node, vmid)` - Stop a container
5. `rebootContainer(node, vmid)` - Reboot a container
6. `executeContainerCommand(node, vmid, command)` - Execute commands
7. `createContainerSnapshot(node, vmid, name, description)` - Create snapshots
8. `listContainerSnapshots(node, vmid)` - List snapshots

**Code Translation Example:**

Python (Container):
```python
def get_containers(self) -> Dict[str, Any]:
    nodes = self.proxmox.nodes.get()
    all_containers = []
    for node in nodes:
        node_name = node["node"]
        node_containers = self.proxmox.nodes(node_name).lxc.get()
        for container in node_containers:
            container["node"] = node_name
            all_containers.append(container)
    return {"containers": all_containers, "total": len(all_containers)}
```

JavaScript (npm-app):
```javascript
async getContainers() {
    const nodes = await this.apiCall('GET', '/nodes');
    const allContainers = [];
    for (const node of nodes) {
        const nodeName = node.node;
        const nodeContainers = await this.apiCall('GET', `/nodes/${nodeName}/lxc`);
        if (nodeContainers) {
            for (const container of nodeContainers) {
                container.node = nodeName;
                allContainers.push(container);
            }
        }
    }
    return { containers: allContainers, total: allContainers.length };
}
```

### Phase 2: Enhanced Cluster Status (Day 1)
**1 Enhanced Function:**
- `getClusterStatus()` - Comprehensive cluster overview with resource totals

### Phase 3: Storage & Backup (Day 2)
**3 Functions:**
- `getStorageDetails(storage)` - Detailed storage info
- `getBackups(storage?, node?)` - List backups
- `getStorage()` - Already exists, may need enhancement

### Phase 4: User & Access Control (Day 2)
**3 Functions:**
- `getUsers()` - List all users
- `getGroups()` - List all groups
- `getRoles()` - List all roles

### Phase 5: Network & Firewall (Day 3)
**2 Functions:**
- `getVMNetwork(node, vmid, vm_type)` - Network configuration
- `getFirewallStatus(node, vmid?)` - Firewall status

### Phase 6: Monitoring (Day 3)
**2 Functions:**
- `getRecentTasks(node?, limit)` - Recent tasks
- `getClusterLog(max_lines)` - Cluster logs

### Phase 7: Templates (Day 3)
**1 Function:**
- `listTemplates()` - List all templates

## Key Implementation Decisions

### 1. Environment Variable Strategy
**Option A: Keep Both (Confusing)**
- Container uses: TOKEN_ID/TOKEN_SECRET
- npm uses: TOKEN_NAME/TOKEN_VALUE

**Option B: Standardize on Container Names (Recommended)**
- Change npm to use TOKEN_ID/TOKEN_SECRET
- More consistent with Proxmox terminology
- One-time breaking change

**Option C: Support Both with Fallback**
```javascript
this.tokenName = process.env.PROXMOX_TOKEN_ID || process.env.PROXMOX_TOKEN_NAME;
this.tokenValue = process.env.PROXMOX_TOKEN_SECRET || process.env.PROXMOX_TOKEN_VALUE;
```

### 2. Error Handling Pattern
Both use similar patterns - return object with error key:
```javascript
// Consistent pattern
if (error) {
    return { error: error.message };
}
```

### 3. Tool Registration
Each new function needs MCP tool registration:
```javascript
{
    name: 'get_containers',
    description: 'List all LXC containers across the cluster',
    inputSchema: { type: 'object', properties: {}, required: [] }
}
```

## Implementation Approach

### Step 1: Environment Variables
First, update the npm app to handle the naming difference.

### Step 2: Add Container Functions
Port the 8 container management functions one by one.

### Step 3: Register MCP Tools
Add tool definitions for each new function.

### Step 4: Test
Test each function with actual Proxmox API.

## API Endpoint Mapping

| Function | HTTP Method | Endpoint |
|----------|------------|----------|
| getContainers | GET | `/nodes/{node}/lxc` |
| getContainerStatus | GET | `/nodes/{node}/lxc/{vmid}/status/current` |
| startContainer | POST | `/nodes/{node}/lxc/{vmid}/status/start` |
| stopContainer | POST | `/nodes/{node}/lxc/{vmid}/status/shutdown` |
| rebootContainer | POST | `/nodes/{node}/lxc/{vmid}/status/reboot` |
| executeContainerCommand | POST | `/nodes/{node}/lxc/{vmid}/exec` |
| createContainerSnapshot | POST | `/nodes/{node}/lxc/{vmid}/snapshot` |
| listContainerSnapshots | GET | `/nodes/{node}/lxc/{vmid}/snapshot` |

## Benefits of This Migration

1. **Single Codebase**: Everything in Node.js
2. **Native Performance**: No Python runtime needed
3. **Consistency**: Same patterns as existing VM operations
4. **Maintainability**: One language to maintain
5. **Direct Port**: Logic already tested in Python

## Risk Mitigation

1. **Test incrementally**: Test each function as we add it
2. **Keep Python as reference**: Don't delete container code until npm is proven
3. **Version carefully**: Bump minor version for new features
4. **Document changes**: Update README with new capabilities

## Timeline

- **Day 1**: Phases 1-2 (Container management + Cluster status)
- **Day 2**: Phases 3-4 (Storage/Backup + User management)
- **Day 3**: Phases 5-7 (Network + Monitoring + Templates)

Total effort: ~3 days of focused development

## Next Steps

1. Decide on environment variable strategy
2. Start with Phase 1 container functions
3. Test with real Proxmox cluster
4. Document as we go
