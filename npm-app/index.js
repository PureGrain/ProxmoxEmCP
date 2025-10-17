#!/usr/bin/env node
/**
 * title: ProxmoxEmCP Server (Node.js)
 * author: PureGrain at SLA Ops, LLC
 * author_url: https://github.com/PureGrain
 * repo_url: https://github.com/PureGrain/ProxmoxMCP
 * version: 0.3.4
 * license: MIT
 * description: Native Node.js ProxmoxEmCP server for managing and monitoring Proxmox VMs and nodes.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import https from "https";
import { config } from "dotenv";

// Load environment variables
config();

// Logger that writes to stderr to avoid interfering with stdio
const logger = {
  info: (msg) => console.error(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  debug: (msg) => process.env.LOG_LEVEL === 'DEBUG' && console.error(`[DEBUG] ${msg}`),
  warning: (msg) => console.error(`[WARNING] ${msg}`)
};

/**
 * ProxmoxManager class - handles all Proxmox API operations
 */
class ProxmoxManager {
  constructor() {
    this.host = process.env.PROXMOX_HOST;
    this.user = process.env.PROXMOX_USER || 'root@pam';
    this.tokenName = process.env.PROXMOX_TOKEN_NAME;
    this.tokenValue = process.env.PROXMOX_TOKEN_VALUE;
    this.verifySSL = process.env.PROXMOX_VERIFY_SSL?.toLowerCase() === 'true';

    // Remove duplicate port if present
    if (this.host && this.host.includes(':')) {
      const parts = this.host.split('//');
      if (parts.length > 1 && parts[1].includes(':')) {
        this.host = parts[0] + '//' + parts[1].split(':')[0];
      }
    }

    if (!this.host || !this.tokenName || !this.tokenValue) {
      throw new Error(
        'Missing required environment variables: PROXMOX_HOST, PROXMOX_TOKEN_NAME, PROXMOX_TOKEN_VALUE'
      );
    }

    // Configure axios client
    this.client = axios.create({
      baseURL: `https://${this.host}:8006/api2/json`,
      headers: {
        'Authorization': `PVEAPIToken=${this.user}!${this.tokenName}=${this.tokenValue}`
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: this.verifySSL
      }),
      timeout: 30000
    });

    logger.info(`Connected to Proxmox host: ${this.host}`);
  }

  // Helper method for API calls with error handling
  async apiCall(method, path, data = null) {
    try {
      const response = await this.client({
        method,
        url: path,
        data
      });
      return response.data?.data || response.data;
    } catch (error) {
      logger.error(`API call failed: ${error.message}`);
      return { error: error.message };
    }
  }

  // Node operations
  async getNodes() {
    try {
      const nodes = await this.apiCall('GET', '/nodes');
      return { nodes: nodes || [], count: nodes?.length || 0 };
    } catch (error) {
      logger.error(`Failed to get nodes: ${error.message}`);
      return { error: error.message };
    }
  }

  async getNodeStatus(node) {
    try {
      const status = await this.apiCall('GET', `/nodes/${node}/status`);
      return status || { error: 'No status data returned' };
    } catch (error) {
      logger.error(`Failed to get node status: ${error.message}`);
      return { error: error.message };
    }
  }

  // VM operations
  async getVMs() {
    try {
      const nodes = await this.apiCall('GET', '/nodes');
      if (!nodes || nodes.error) {
        return { error: nodes?.error || 'Failed to get nodes' };
      }

      const allVMs = [];
      for (const node of nodes) {
        const nodeName = node.node;
        try {
          const nodeVMs = await this.apiCall('GET', `/nodes/${nodeName}/qemu`);
          if (nodeVMs && !nodeVMs.error) {
            for (const vm of nodeVMs) {
              vm.node = nodeName;
              allVMs.push(vm);
            }
          }
        } catch (error) {
          logger.warning(`Could not get VMs from node ${nodeName}: ${error.message}`);
        }
      }

      return { vms: allVMs, total: allVMs.length, nodes_checked: nodes.length };
    } catch (error) {
      logger.error(`Failed to get VMs: ${error.message}`);
      return { error: error.message };
    }
  }

  async startVM(node, vmid) {
    try {
      const result = await this.apiCall('POST', `/nodes/${node}/qemu/${vmid}/status/start`);
      return {
        success: true,
        task_id: result,
        message: `VM ${vmid} start initiated on node ${node}`
      };
    } catch (error) {
      logger.error(`Failed to start VM ${vmid}: ${error.message}`);
      return { error: error.message };
    }
  }

  async stopVM(node, vmid) {
    try {
      const result = await this.apiCall('POST', `/nodes/${node}/qemu/${vmid}/status/shutdown`);
      return {
        success: true,
        task_id: result,
        message: `VM ${vmid} stop initiated on node ${node}`
      };
    } catch (error) {
      logger.error(`Failed to stop VM ${vmid}: ${error.message}`);
      return { error: error.message };
    }
  }

  async rebootVM(node, vmid) {
    try {
      const result = await this.apiCall('POST', `/nodes/${node}/qemu/${vmid}/status/reboot`);
      return {
        success: true,
        task_id: result,
        message: `VM ${vmid} reboot initiated on node ${node}`
      };
    } catch (error) {
      logger.error(`Failed to reboot VM ${vmid}: ${error.message}`);
      return { error: error.message };
    }
  }

  async executeVMCommand(node, vmid, command) {
    try {
      const result = await this.apiCall('POST', `/nodes/${node}/qemu/${vmid}/agent/exec`, { command });
      if (!result || result.error) {
        return { error: result?.error || 'No response from VM agent' };
      }
      return {
        success: true,
        output: result['out-data'] || '',
        exit_code: result.exitcode || 0
      };
    } catch (error) {
      logger.error(`Failed to execute command: ${error.message}`);
      return { error: error.message };
    }
  }

  async createVMSnapshot(node, vmid, name, description = null) {
    try {
      const params = { snapname: name };
      if (description) {
        params.description = description;
      }

      const result = await this.apiCall('POST', `/nodes/${node}/qemu/${vmid}/snapshot`, params);
      return {
        success: true,
        task_id: result,
        message: `Snapshot '${name}' creation initiated for VM ${vmid}`
      };
    } catch (error) {
      logger.error(`Failed to create snapshot: ${error.message}`);
      return { error: error.message };
    }
  }

  async listVMSnapshots(node, vmid) {
    try {
      const snapshots = await this.apiCall('GET', `/nodes/${node}/qemu/${vmid}/snapshot`);
      return { snapshots: snapshots || [] };
    } catch (error) {
      logger.error(`Failed to list snapshots: ${error.message}`);
      return { error: error.message };
    }
  }

  async getVMStatus(node, vmid) {
    try {
      const status = await this.apiCall('GET', `/nodes/${node}/qemu/${vmid}/status/current`);
      return status || { error: 'No status data returned' };
    } catch (error) {
      logger.error(`Failed to get VM status: ${error.message}`);
      return { error: error.message };
    }
  }

  // Storage operations
  async getStorage() {
    try {
      const storage = await this.apiCall('GET', '/storage');
      return { storage: storage || [] };
    } catch (error) {
      logger.error(`Failed to get storage: ${error.message}`);
      return { error: error.message };
    }
  }

  // Cluster operations
  async getClusterStatus() {
    try {
      const status = await this.apiCall('GET', '/cluster/status');
      return { status: status || [] };
    } catch (error) {
      logger.error(`Failed to get cluster status: ${error.message}`);
      return { error: error.message };
    }
  }

  // Task operations
  async getTaskStatus(node, upid) {
    try {
      // Parse UPID if needed
      const parts = upid.split(':');
      if (parts.length < 3) {
        return { error: 'Invalid UPID format' };
      }

      const status = await this.apiCall('GET', `/nodes/${node}/tasks/${upid}/status`);
      return status || { error: 'No task status returned' };
    } catch (error) {
      logger.error(`Failed to get task status: ${error.message}`);
      return { error: error.message };
    }
  }
}

/**
 * Main MCP Server implementation
 */
async function runMCPServer() {
  let proxmox = null;
  let initializationError = null;

  // Try to initialize Proxmox connection
  try {
    proxmox = new ProxmoxManager();
    logger.info('Successfully initialized Proxmox connection');
  } catch (error) {
    logger.error(`Failed to initialize Proxmox connection: ${error.message}`);
    initializationError = error.message;
    // Don't exit - run in degraded mode
  }

  // Tool definitions
  const tools = [
    {
      name: 'get_nodes',
      description: 'List all nodes in the Proxmox cluster',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'get_node_status',
      description: 'Get detailed status for a specific node',
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Node name (e.g., "pve1")' }
        },
        required: ['node']
      }
    },
    {
      name: 'get_vms',
      description: 'List all VMs across the cluster',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'get_vm_status',
      description: 'Get status and configuration for a specific VM',
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Node name where VM is located' },
          vmid: { type: 'integer', description: 'VM ID number' }
        },
        required: ['node', 'vmid']
      }
    },
    {
      name: 'start_vm',
      description: 'Start a virtual machine',
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Node name where VM is located' },
          vmid: { type: 'integer', description: 'VM ID number' }
        },
        required: ['node', 'vmid']
      }
    },
    {
      name: 'stop_vm',
      description: 'Stop a virtual machine gracefully',
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Node name where VM is located' },
          vmid: { type: 'integer', description: 'VM ID number' }
        },
        required: ['node', 'vmid']
      }
    },
    {
      name: 'reboot_vm',
      description: 'Reboot a virtual machine',
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Node name where VM is located' },
          vmid: { type: 'integer', description: 'VM ID number' }
        },
        required: ['node', 'vmid']
      }
    },
    {
      name: 'execute_vm_command',
      description: 'Execute a command in a VM via QEMU guest agent',
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Node name where VM is located' },
          vmid: { type: 'integer', description: 'VM ID number' },
          command: { type: 'string', description: 'Command to execute in the VM' }
        },
        required: ['node', 'vmid', 'command']
      }
    },
    {
      name: 'create_vm_snapshot',
      description: 'Create a snapshot of a VM',
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Node name where VM is located' },
          vmid: { type: 'integer', description: 'VM ID number' },
          name: { type: 'string', description: 'Snapshot name' },
          description: { type: 'string', description: 'Optional snapshot description' }
        },
        required: ['node', 'vmid', 'name']
      }
    },
    {
      name: 'list_vm_snapshots',
      description: 'List all snapshots for a VM',
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Node name where VM is located' },
          vmid: { type: 'integer', description: 'VM ID number' }
        },
        required: ['node', 'vmid']
      }
    },
    {
      name: 'get_storage',
      description: 'List storage pools in the cluster',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'get_cluster_status',
      description: 'Get cluster status and health information',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'get_task_status',
      description: 'Get status of a Proxmox task',
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Node where the task is running' },
          upid: { type: 'string', description: 'Unique Process ID of the task' }
        },
        required: ['node', 'upid']
      }
    }
  ];

  // Create MCP server
  const server = new Server({
    name: 'ProxmoxEmCP',
    version: '0.3.4'
  }, {
    capabilities: {
      tools: {}
    }
  });

  // Register handlers for listing tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  // Register handler for calling tools
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Check if initialization failed
    if (!proxmox) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Server initialization failed: ${initializationError || 'Proxmox connection not initialized'}`,
            details: 'Please check environment variables and server configuration'
          }, null, 2)
        }],
        isError: true
      };
    }

    let result = null;

    try {
      // Route tool calls to appropriate methods
      switch (name) {
        case 'get_nodes':
          result = await proxmox.getNodes();
          break;
        case 'get_node_status':
          result = await proxmox.getNodeStatus(args.node);
          break;
        case 'get_vms':
          result = await proxmox.getVMs();
          break;
        case 'get_vm_status':
          result = await proxmox.getVMStatus(args.node, args.vmid);
          break;
        case 'start_vm':
          result = await proxmox.startVM(args.node, args.vmid);
          break;
        case 'stop_vm':
          result = await proxmox.stopVM(args.node, args.vmid);
          break;
        case 'reboot_vm':
          result = await proxmox.rebootVM(args.node, args.vmid);
          break;
        case 'execute_vm_command':
          result = await proxmox.executeVMCommand(args.node, args.vmid, args.command);
          break;
        case 'create_vm_snapshot':
          result = await proxmox.createVMSnapshot(args.node, args.vmid, args.name, args.description);
          break;
        case 'list_vm_snapshots':
          result = await proxmox.listVMSnapshots(args.node, args.vmid);
          break;
        case 'get_storage':
          result = await proxmox.getStorage();
          break;
        case 'get_cluster_status':
          result = await proxmox.getClusterStatus();
          break;
        case 'get_task_status':
          result = await proxmox.getTaskStatus(args.node, args.upid);
          break;
        default:
          result = { error: `Unknown tool: ${name}` };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      logger.error(`Error calling tool ${name}: ${error.message}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: error.message })
        }],
        isError: true
      };
    }
  });

  // Start the server with stdio transport
  logger.info('Starting ProxmoxEmCP Server (Node.js)...');
  if (proxmox) {
    logger.info(`Connected to Proxmox host: ${process.env.PROXMOX_HOST}`);
  } else {
    logger.warning('Running in degraded mode - Proxmox connection failed');
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Server started successfully');
}

/**
 * Main entry point
 */
function main() {
  // Check for required environment variables
  const requiredVars = ['PROXMOX_HOST', 'PROXMOX_TOKEN_NAME', 'PROXMOX_TOKEN_VALUE'];
  const missing = requiredVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    logger.info('Please set the following environment variables:');
    logger.info('  PROXMOX_HOST - Your Proxmox server address (e.g., 192.168.1.100)');
    logger.info('  PROXMOX_TOKEN_NAME - Your API token name');
    logger.info('  PROXMOX_TOKEN_VALUE - Your API token value');
    logger.info('  PROXMOX_USER - (Optional) User, defaults to root@pam');
    logger.info('  PROXMOX_VERIFY_SSL - (Optional) Verify SSL, defaults to false');
    logger.info('  LOG_LEVEL - (Optional) Log level, defaults to INFO');

    // Don't exit immediately - run server in degraded mode to report errors through MCP
  }

  runMCPServer().catch((error) => {
    logger.error(`Server error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  });
}

// Handle termination signals
process.on('SIGINT', () => {
  logger.info('Server stopped by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Server terminated');
  process.exit(0);
});

// Run the server
main();
