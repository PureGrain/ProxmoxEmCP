#!/usr/bin/env node
/**
 * title: ProxmoxEmCP Server (Node.js)
 * author: PureGrain at SLA Ops, LLC
 * author_url: https://github.com/PureGrain
 * repo_url: https://github.com/PureGrain/ProxmoxMCP
 * funding_url: https://github.com/sponsors/PureGrain
 * version: 0.4.2
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
    // Changed from TOKEN_NAME to TOKEN_ID, and TOKEN_VALUE to TOKEN_SECRET
    this.tokenName = process.env.PROXMOX_TOKEN_ID;
    this.tokenValue = process.env.PROXMOX_TOKEN_SECRET;
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
        'Missing required environment variables: PROXMOX_HOST, PROXMOX_TOKEN_ID, PROXMOX_TOKEN_SECRET'
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

  // Container operations
  async getContainers() {
    try {
      const nodes = await this.apiCall('GET', '/nodes');
      if (!nodes || nodes.error) {
        return { error: nodes?.error || 'Failed to get nodes' };
      }

      const allContainers = [];
      for (const node of nodes) {
        const nodeName = node.node;
        try {
          const nodeContainers = await this.apiCall('GET', `/nodes/${nodeName}/lxc`);
          if (nodeContainers && !nodeContainers.error) {
            for (const container of nodeContainers) {
              container.node = nodeName;
              allContainers.push(container);
            }
          }
        } catch (error) {
          logger.warning(`Could not get containers from node ${nodeName}: ${error.message}`);
        }
      }

      return {
        containers: allContainers,
        total: allContainers.length,
        nodes_checked: nodes.length
      };
    } catch (error) {
      logger.error(`Failed to get containers: ${error.message}`);
      return { error: error.message };
    }
  }

  async getContainerStatus(node, vmid) {
    try {
      const status = await this.apiCall('GET', `/nodes/${node}/lxc/${vmid}/status/current`);
      return status || { error: 'No status data returned' };
    } catch (error) {
      logger.error(`Failed to get container status: ${error.message}`);
      return { error: error.message };
    }
  }

  async startContainer(node, vmid) {
    try {
      const result = await this.apiCall('POST', `/nodes/${node}/lxc/${vmid}/status/start`);
      return {
        success: true,
        task_id: result,
        message: `Container ${vmid} start initiated on node ${node}`
      };
    } catch (error) {
      logger.error(`Failed to start container ${vmid}: ${error.message}`);
      return { error: error.message };
    }
  }

  async stopContainer(node, vmid) {
    try {
      const result = await this.apiCall('POST', `/nodes/${node}/lxc/${vmid}/status/shutdown`);
      return {
        success: true,
        task_id: result,
        message: `Container ${vmid} stop initiated on node ${node}`
      };
    } catch (error) {
      logger.error(`Failed to stop container ${vmid}: ${error.message}`);
      return { error: error.message };
    }
  }

  async rebootContainer(node, vmid) {
    try {
      const result = await this.apiCall('POST', `/nodes/${node}/lxc/${vmid}/status/reboot`);
      return {
        success: true,
        task_id: result,
        message: `Container ${vmid} reboot initiated on node ${node}`
      };
    } catch (error) {
      logger.error(`Failed to reboot container ${vmid}: ${error.message}`);
      return { error: error.message };
    }
  }

  async executeContainerCommand(node, vmid, command) {
    try {
      const result = await this.apiCall('POST', `/nodes/${node}/lxc/${vmid}/exec`, { command });
      if (!result || result.error) {
        return { error: result?.error || 'No response from container' };
      }
      return {
        success: true,
        output: result['out-data'] || '',
        exit_code: result.exitcode || 0
      };
    } catch (error) {
      logger.error(`Failed to execute command in container: ${error.message}`);
      return { error: error.message };
    }
  }

  async createContainerSnapshot(node, vmid, name, description = null) {
    try {
      const params = { snapname: name };
      if (description) {
        params.description = description;
      }

      const result = await this.apiCall('POST', `/nodes/${node}/lxc/${vmid}/snapshot`, params);
      return {
        success: true,
        task_id: result,
        message: `Snapshot '${name}' creation initiated for container ${vmid}`
      };
    } catch (error) {
      logger.error(`Failed to create container snapshot: ${error.message}`);
      return { error: error.message };
    }
  }

  async listContainerSnapshots(node, vmid) {
    try {
      const snapshots = await this.apiCall('GET', `/nodes/${node}/lxc/${vmid}/snapshot`);
      return { snapshots: snapshots || [] };
    } catch (error) {
      logger.error(`Failed to list container snapshots: ${error.message}`);
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

  async getStorageDetails(storage) {
    try {
      // Get storage configuration
      const config = await this.apiCall('GET', `/storage/${storage}`);
      if (!config) {
        return { error: `Storage ${storage} not found` };
      }

      const details = {
        storage: storage,
        type: config.type || 'unknown',
        enabled: config.enabled || 0,
        shared: config.shared || 0,
        content: config.content ? config.content.split(',') : [],
        nodes: config.nodes || 'all'
      };

      // Add type-specific details
      const storageType = (config.type || '').toLowerCase();
      if (storageType === 'nfs') {
        details.nfs = {
          server: config.server || 'N/A',
          export: config.export || 'N/A',
          path: config.path || 'N/A',
          options: config.options || 'N/A'
        };
      } else if (['dir', 'lvm', 'lvmthin', 'zfs', 'zfspool'].includes(storageType)) {
        details.path = config.path || 'N/A';
      }

      // Try to get current usage from a node
      try {
        const nodes = await this.apiCall('GET', '/nodes');
        if (nodes && nodes.length > 0) {
          const node = nodes[0].node;
          const status = await this.apiCall('GET', `/nodes/${node}/storage/${storage}/status`);
          if (status) {
            details.status = {
              total: status.total || 0,
              used: status.used || 0,
              available: status.avail || 0,
              active: status.active || 0
            };
          }
        }
      } catch {
        // Ignore errors getting status
      }

      return details;
    } catch (error) {
      logger.error(`Failed to get storage details: ${error.message}`);
      return { error: error.message };
    }
  }

  async getBackups(storage = null, node = null) {
    try {
      const backups = [];

      if (storage && node) {
        // Get backups from specific storage on specific node
        const content = await this.apiCall('GET', `/nodes/${node}/storage/${storage}/content`);
        if (content) {
          for (const item of content) {
            if (item.content === 'backup') {
              backups.push({
                volid: item.volid,
                vmid: item.vmid,
                node: node,
                storage: storage,
                size: item.size || 0,
                format: item.format,
                ctime: item.ctime || 0,
                notes: item.notes || ''
              });
            }
          }
        }
      } else {
        // Get all backups from all storages on all nodes
        const nodes = await this.apiCall('GET', '/nodes');
        const storages = await this.apiCall('GET', '/storage');

        if (nodes && storages) {
          for (const nodeInfo of nodes) {
            const nodeName = nodeInfo.node;
            for (const stor of storages) {
              if (stor.content && stor.content.includes('backup')) {
                try {
                  const content = await this.apiCall('GET', `/nodes/${nodeName}/storage/${stor.storage}/content`);
                  if (content) {
                    for (const item of content) {
                      if (item.content === 'backup') {
                        backups.push({
                          volid: item.volid,
                          vmid: item.vmid,
                          node: nodeName,
                          storage: stor.storage,
                          size: item.size || 0,
                          format: item.format,
                          ctime: item.ctime || 0,
                          notes: item.notes || ''
                        });
                      }
                    }
                  }
                } catch {
                  // Continue on error
                }
              }
            }
          }
        }
      }

      return { backups: backups, count: backups.length };
    } catch (error) {
      logger.error(`Failed to list backups: ${error.message}`);
      return { error: error.message };
    }
  }

  // Enhanced Cluster operations
  async getClusterStatus() {
    try {
      // Get cluster status
      const clusterStatus = await this.apiCall('GET', '/cluster/status');

      // Get resource summary
      const resources = await this.apiCall('GET', '/cluster/resources?type=node');

      // Calculate totals
      let totalCpu = 0;
      let totalMemory = 0;
      let totalMemoryUsed = 0;
      let totalDisk = 0;
      let totalDiskUsed = 0;
      let onlineNodes = 0;

      const nodesInfo = [];
      if (resources) {
        for (const node of resources) {
          if (node.type === 'node') {
            totalCpu += node.maxcpu || 0;
            totalMemory += node.maxmem || 0;
            totalMemoryUsed += node.mem || 0;
            totalDisk += node.maxdisk || 0;
            totalDiskUsed += node.disk || 0;

            if (node.status === 'online') {
              onlineNodes++;
            }

            nodesInfo.push({
              name: node.node,
              status: node.status || 'unknown',
              cpu_usage: node.cpu || 0,
              memory: node.mem || 0,
              max_memory: node.maxmem || 0,
              disk: node.disk || 0,
              max_disk: node.maxdisk || 0,
              uptime: node.uptime || 0
            });
          }
        }
      }

      // Get VM and container counts
      const vms = await this.apiCall('GET', '/cluster/resources?type=vm');
      let vmCount = 0;
      let ctCount = 0;
      let runningVms = 0;
      let runningCts = 0;

      if (vms) {
        for (const vm of vms) {
          if (vm.type === 'qemu') {
            vmCount++;
            if (vm.status === 'running') runningVms++;
          } else if (vm.type === 'lxc') {
            ctCount++;
            if (vm.status === 'running') runningCts++;
          }
        }
      }

      const clusterInfo = {
        name: clusterStatus && clusterStatus[0] ? clusterStatus[0].name || 'Proxmox Cluster' : 'Proxmox Cluster',
        version: clusterStatus && clusterStatus[0] ? clusterStatus[0].version : 'unknown',
        nodes: {
          total: nodesInfo.length,
          online: onlineNodes,
          details: nodesInfo
        },
        resources: {
          cpu: { total_cores: totalCpu },
          memory: {
            total: totalMemory,
            used: totalMemoryUsed,
            free: totalMemory - totalMemoryUsed
          },
          storage: {
            total: totalDisk,
            used: totalDiskUsed,
            free: totalDisk - totalDiskUsed
          }
        },
        virtual_machines: {
          total: vmCount,
          running: runningVms,
          stopped: vmCount - runningVms
        },
        containers: {
          total: ctCount,
          running: runningCts,
          stopped: ctCount - runningCts
        },
        quorate: clusterStatus && clusterStatus[0] ? clusterStatus[0].quorate !== false : true
      };

      return clusterInfo;
    } catch (error) {
      logger.error(`Failed to get cluster status: ${error.message}`);
      return { error: error.message };
    }
  }

  // User & Access Control operations
  async getUsers() {
    try {
      const users = await this.apiCall('GET', '/access/users');
      if (!users) return { users: [], count: 0 };

      const userList = users.map(user => ({
        userid: user.userid,
        enable: user.enable !== undefined ? user.enable : 1,
        expire: user.expire || 0,
        firstname: user.firstname || '',
        lastname: user.lastname || '',
        email: user.email || '',
        comment: user.comment || '',
        groups: user.groups ? user.groups.split(',') : [],
        tokens: user.tokens || []
      }));

      return { users: userList, count: userList.length };
    } catch (error) {
      logger.error(`Failed to list users: ${error.message}`);
      return { error: error.message };
    }
  }

  async getGroups() {
    try {
      const groups = await this.apiCall('GET', '/access/groups');
      if (!groups) return { groups: [], count: 0 };

      const groupList = groups.map(group => ({
        groupid: group.groupid,
        comment: group.comment || '',
        users: group.users ? group.users.split(',') : []
      }));

      return { groups: groupList, count: groupList.length };
    } catch (error) {
      logger.error(`Failed to list groups: ${error.message}`);
      return { error: error.message };
    }
  }

  async getRoles() {
    try {
      const roles = await this.apiCall('GET', '/access/roles');
      if (!roles) return { roles: [], count: 0 };

      const roleList = roles.map(role => ({
        roleid: role.roleid,
        privs: role.privs ? role.privs.split(',') : [],
        special: role.special || 0
      }));

      return { roles: roleList, count: roleList.length };
    } catch (error) {
      logger.error(`Failed to list roles: ${error.message}`);
      return { error: error.message };
    }
  }

  // Network & Firewall operations
  async getVMNetwork(node, vmid, vmType = 'qemu') {
    try {
      const endpoint = vmType === 'qemu' ?
        `/nodes/${node}/qemu/${vmid}/config` :
        `/nodes/${node}/lxc/${vmid}/config`;

      const config = await this.apiCall('GET', endpoint);
      if (!config) return { error: 'No config data returned' };

      const networkInfo = {
        vmid: vmid,
        node: node,
        type: vmType,
        interfaces: []
      };

      // Extract network interfaces
      for (const key in config) {
        if (key.startsWith('net')) {
          const netConfig = config[key];
          const netInterface = { name: key, config: netConfig };

          // Parse network configuration string
          if (typeof netConfig === 'string') {
            const parts = netConfig.split(',');
            for (const part of parts) {
              if (part.includes('=')) {
                const [k, v] = part.split('=', 2);
                netInterface[k] = v;
              }
            }
          }

          networkInfo.interfaces.push(netInterface);
        }
      }

      // Try to get IP addresses if agent is running (VMs only)
      if (vmType === 'qemu') {
        try {
          const agentInfo = await this.apiCall('GET', `/nodes/${node}/qemu/${vmid}/agent/network-get-interfaces`);
          if (agentInfo && agentInfo.result) {
            networkInfo.agent_network = agentInfo.result;
          }
        } catch {
          networkInfo.agent_network = null;
        }
      }

      return networkInfo;
    } catch (error) {
      logger.error(`Failed to get network info: ${error.message}`);
      return { error: error.message };
    }
  }

  async getFirewallStatus(node, vmid = null) {
    try {
      let optionsEndpoint, rulesEndpoint;

      if (vmid) {
        // Get VM firewall status
        optionsEndpoint = `/nodes/${node}/qemu/${vmid}/firewall/options`;
        rulesEndpoint = `/nodes/${node}/qemu/${vmid}/firewall/rules`;
      } else {
        // Get node firewall status
        optionsEndpoint = `/nodes/${node}/firewall/options`;
        rulesEndpoint = `/nodes/${node}/firewall/rules`;
      }

      const options = await this.apiCall('GET', optionsEndpoint) || {};
      const rules = await this.apiCall('GET', rulesEndpoint) || [];

      const firewallInfo = {
        target: vmid ? `VM ${vmid}` : `Node ${node}`,
        enabled: options.enable || 0,
        policy_in: options.policy_in || 'ACCEPT',
        policy_out: options.policy_out || 'ACCEPT',
        log_level: options.log_level_in || 'nolog',
        rules: []
      };

      for (const rule of rules) {
        firewallInfo.rules.push({
          pos: rule.pos,
          type: rule.type,
          action: rule.action,
          enable: rule.enable !== undefined ? rule.enable : 1,
          source: rule.source || 'any',
          dest: rule.dest || 'any',
          proto: rule.proto || 'any',
          dport: rule.dport || '',
          sport: rule.sport || '',
          comment: rule.comment || ''
        });
      }

      return firewallInfo;
    } catch (error) {
      logger.error(`Failed to get firewall status: ${error.message}`);
      return { error: error.message };
    }
  }

  // Monitoring operations
  async getRecentTasks(node = null, limit = 20) {
    try {
      const tasks = [];

      if (node) {
        // Get tasks from specific node
        const nodeTasks = await this.apiCall('GET', `/nodes/${node}/tasks?limit=${limit}`);
        if (nodeTasks) {
          for (const task of nodeTasks) {
            tasks.push({
              upid: task.upid,
              node: task.node,
              pid: task.pid,
              pstart: task.pstart,
              type: task.type,
              status: task.status || 'running',
              user: task.user,
              starttime: task.starttime || 0,
              endtime: task.endtime || 0
            });
          }
        }
      } else {
        // Get tasks from all nodes
        const nodes = await this.apiCall('GET', '/nodes');
        if (nodes) {
          const nodeLimit = Math.floor(limit / nodes.length) || limit;
          for (const nodeInfo of nodes) {
            try {
              const nodeTasks = await this.apiCall('GET', `/nodes/${nodeInfo.node}/tasks?limit=${nodeLimit}`);
              if (nodeTasks) {
                for (const task of nodeTasks) {
                  tasks.push({
                    upid: task.upid,
                    node: task.node,
                    pid: task.pid,
                    type: task.type,
                    status: task.status || 'running',
                    user: task.user,
                    starttime: task.starttime || 0,
                    endtime: task.endtime || 0
                  });
                }
              }
            } catch {
              // Continue on error
            }
          }
        }
      }

      // Sort by start time (most recent first)
      tasks.sort((a, b) => b.starttime - a.starttime);

      return { tasks: tasks.slice(0, limit), count: Math.min(tasks.length, limit) };
    } catch (error) {
      logger.error(`Failed to list tasks: ${error.message}`);
      return { error: error.message };
    }
  }

  async getClusterLog(maxLines = 50) {
    try {
      // Get cluster log
      const logEntries = await this.apiCall('GET', `/cluster/log?max=${maxLines}`);
      if (!logEntries) return { logs: [], count: 0 };

      const formattedLogs = logEntries.map(entry => ({
        time: entry.time || 0,
        node: entry.node || 'cluster',
        user: entry.user || 'system',
        message: entry.msg || '',
        priority: entry.pri || 6,
        tag: entry.tag || 'system'
      }));

      return { logs: formattedLogs, count: formattedLogs.length };
    } catch (error) {
      logger.error(`Failed to get cluster log: ${error.message}`);
      return { error: error.message };
    }
  }

  // Template management
  async listTemplates() {
    try {
      const templates = [];
      const nodes = await this.apiCall('GET', '/nodes');

      if (nodes) {
        for (const node of nodes) {
          const nodeName = node.node;

          // Check VMs for templates
          try {
            const vms = await this.apiCall('GET', `/nodes/${nodeName}/qemu`);
            if (vms) {
              for (const vm of vms) {
                if (vm.template === 1) {
                  templates.push({
                    vmid: vm.vmid,
                    name: vm.name || 'unnamed',
                    node: nodeName,
                    type: 'qemu',
                    disk_size: vm.maxdisk || 0,
                    memory: vm.maxmem || 0,
                    cpus: vm.cpus || 1
                  });
                }
              }
            }
          } catch {
            // Continue on error
          }

          // Check containers for templates
          try {
            const containers = await this.apiCall('GET', `/nodes/${nodeName}/lxc`);
            if (containers) {
              for (const ct of containers) {
                if (ct.template === 1) {
                  templates.push({
                    vmid: ct.vmid,
                    name: ct.name || 'unnamed',
                    node: nodeName,
                    type: 'lxc',
                    disk_size: ct.maxdisk || 0,
                    memory: ct.maxmem || 0,
                    cpus: ct.cpus || 1
                  });
                }
              }
            }
          } catch {
            // Continue on error
          }
        }
      }

      return { templates: templates, count: templates.length };
    } catch (error) {
      logger.error(`Failed to list templates: ${error.message}`);
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

  /**
   * Generate help documentation for all available tools
   */
  async getHelp() {
    return {
      title: "ProxmoxEmCP Server - Available Tools",
      description: "MCP server for managing and monitoring Proxmox VMs and nodes",
      categories: {
        "Node Management": [
          { name: "get_nodes", description: "List all nodes in the cluster", icon: "📋" },
          { name: "get_node_status", description: "Get detailed status for a specific node", icon: "📊" }
        ],
        "Virtual Machine Management": [
          { name: "get_vms", description: "List all VMs across the cluster", icon: "📋" },
          { name: "get_vm_status", description: "Get status and configuration for a specific VM", icon: "📊" },
          { name: "start_vm", description: "Start a virtual machine", icon: "▶️" },
          { name: "stop_vm", description: "Stop a virtual machine gracefully", icon: "⏹️" },
          { name: "reboot_vm", description: "Reboot a virtual machine", icon: "🔄" },
          { name: "execute_vm_command", description: "Execute a command in a VM via QEMU guest agent", icon: "💻" },
          { name: "create_vm_snapshot", description: "Create a snapshot of a VM", icon: "📸" },
          { name: "list_vm_snapshots", description: "List all snapshots for a VM", icon: "📋" }
        ],
        "Container Management": [
          { name: "get_containers", description: "List all LXC containers across the cluster", icon: "📋" },
          { name: "get_container_status", description: "Get status and configuration for a specific container", icon: "📊" },
          { name: "start_container", description: "Start an LXC container", icon: "▶️" },
          { name: "stop_container", description: "Stop an LXC container gracefully", icon: "⏹️" },
          { name: "reboot_container", description: "Reboot an LXC container", icon: "🔄" },
          { name: "execute_container_command", description: "Execute a command in a container", icon: "💻" },
          { name: "create_container_snapshot", description: "Create a snapshot of a container", icon: "📸" },
          { name: "list_container_snapshots", description: "List all snapshots for a container", icon: "📋" }
        ],
        "Storage & Backup": [
          { name: "get_storage", description: "List storage pools in the cluster", icon: "💾" },
          { name: "get_storage_details", description: "Get detailed information about a specific storage pool", icon: "📊" },
          { name: "get_backups", description: "List backup files in storage", icon: "📋" },
          { name: "list_templates", description: "List all VM and container templates available", icon: "📋" }
        ],
        "Cluster & Monitoring": [
          { name: "get_cluster_status", description: "Get cluster status and health information", icon: "🏥" },
          { name: "get_recent_tasks", description: "List recent tasks across the cluster", icon: "📋" },
          { name: "get_task_status", description: "Get status of a Proxmox task", icon: "📊" },
          { name: "get_cluster_log", description: "Get recent cluster log entries", icon: "📜" }
        ],
        "Network & Security": [
          { name: "get_vm_network", description: "Get network configuration for a VM or container", icon: "🌐" },
          { name: "get_firewall_status", description: "Get firewall status and rules for a node or VM", icon: "🔥" }
        ],
        "User & Access Control": [
          { name: "get_users", description: "List all users in the Proxmox cluster", icon: "👥" },
          { name: "get_groups", description: "List all groups in the Proxmox cluster", icon: "👥" },
          { name: "get_roles", description: "List all roles available in the Proxmox cluster", icon: "🔐" }
        ],
        "Help & Documentation": [
          { name: "get_help", description: "Display this help menu with all available tools", icon: "❓" }
        ]
      },
      usage_examples: {
        "List all nodes": "get_nodes",
        "Check VM status": "get_vm_status with parameters: node='pve1', vmid=100",
        "Start a VM": "start_vm with parameters: node='pve1', vmid=100",
        "Create snapshot": "create_vm_snapshot with parameters: node='pve1', vmid=100, name='backup-2024'",
        "Get cluster health": "get_cluster_status"
      },
      configuration: {
        "Required environment variables": [
          "PROXMOX_HOST - Your Proxmox server address (e.g., 192.168.1.100)",
          "PROXMOX_TOKEN_ID - Your API token ID",
          "PROXMOX_TOKEN_SECRET - Your API token secret"
        ],
        "Optional environment variables": [
          "PROXMOX_USER - User, defaults to root@pam",
          "PROXMOX_VERIFY_SSL - Verify SSL, defaults to false",
          "LOG_LEVEL - Log level (DEBUG/INFO), defaults to INFO"
        ]
      },
      version: "0.4.1",
      author: "PureGrain at SLA Ops, LLC",
      license: "MIT"
    };
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
    },
    // Container management tools
    {
      name: 'get_containers',
      description: 'List all LXC containers across the cluster',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'get_container_status',
      description: 'Get status and configuration for a specific container',
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Node name where container is located' },
          vmid: { type: 'integer', description: 'Container ID number' }
        },
        required: ['node', 'vmid']
      }
    },
    {
      name: 'start_container',
      description: 'Start an LXC container',
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Node name where container is located' },
          vmid: { type: 'integer', description: 'Container ID number' }
        },
        required: ['node', 'vmid']
      }
    },
    {
      name: 'stop_container',
      description: 'Stop an LXC container gracefully',
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Node name where container is located' },
          vmid: { type: 'integer', description: 'Container ID number' }
        },
        required: ['node', 'vmid']
      }
    },
    {
      name: 'reboot_container',
      description: 'Reboot an LXC container',
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Node name where container is located' },
          vmid: { type: 'integer', description: 'Container ID number' }
        },
        required: ['node', 'vmid']
      }
    },
    {
      name: 'execute_container_command',
      description: 'Execute a command in a container',
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Node name where container is located' },
          vmid: { type: 'integer', description: 'Container ID number' },
          command: { type: 'string', description: 'Command to execute in the container' }
        },
        required: ['node', 'vmid', 'command']
      }
    },
    {
      name: 'create_container_snapshot',
      description: 'Create a snapshot of a container',
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Node name where container is located' },
          vmid: { type: 'integer', description: 'Container ID number' },
          name: { type: 'string', description: 'Snapshot name' },
          description: { type: 'string', description: 'Optional snapshot description' }
        },
        required: ['node', 'vmid', 'name']
      }
    },
    {
      name: 'list_container_snapshots',
      description: 'List all snapshots for a container',
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Node name where container is located' },
          vmid: { type: 'integer', description: 'Container ID number' }
        },
        required: ['node', 'vmid']
      }
    },
    // Storage and backup tools
    {
      name: 'get_storage_details',
      description: 'Get detailed information about a specific storage pool',
      inputSchema: {
        type: 'object',
        properties: {
          storage: { type: 'string', description: 'Storage pool name' }
        },
        required: ['storage']
      }
    },
    {
      name: 'get_backups',
      description: 'List backup files in storage',
      inputSchema: {
        type: 'object',
        properties: {
          storage: { type: 'string', description: 'Optional: specific storage pool' },
          node: { type: 'string', description: 'Optional: specific node' }
        },
        required: []
      }
    },
    // User & Access Control tools
    {
      name: 'get_users',
      description: 'List all users in the Proxmox cluster',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'get_groups',
      description: 'List all groups in the Proxmox cluster',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'get_roles',
      description: 'List all roles available in the Proxmox cluster',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    // Network & Firewall tools
    {
      name: 'get_vm_network',
      description: 'Get network configuration for a VM or container',
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Node name where VM/container is located' },
          vmid: { type: 'integer', description: 'VM or container ID' },
          vm_type: { type: 'string', description: 'Type: "qemu" for VM, "lxc" for container (default: qemu)' }
        },
        required: ['node', 'vmid']
      }
    },
    {
      name: 'get_firewall_status',
      description: 'Get firewall status and rules for a node or VM',
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Node name' },
          vmid: { type: 'integer', description: 'Optional: VM ID (if checking VM firewall)' }
        },
        required: ['node']
      }
    },
    // Monitoring tools
    {
      name: 'get_recent_tasks',
      description: 'List recent tasks across the cluster',
      inputSchema: {
        type: 'object',
        properties: {
          node: { type: 'string', description: 'Optional: filter tasks by specific node' },
          limit: { type: 'integer', description: 'Maximum number of tasks to return (default: 20)' }
        },
        required: []
      }
    },
    {
      name: 'get_cluster_log',
      description: 'Get recent cluster log entries',
      inputSchema: {
        type: 'object',
        properties: {
          max_lines: { type: 'integer', description: 'Maximum number of log entries to return (default: 50)' }
        },
        required: []
      }
    },
    // Template management
    {
      name: 'list_templates',
      description: 'List all VM and container templates available in the cluster',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    // Help & Documentation tool
    {
      name: 'get_help',
      description: 'Display help menu with all available tools and their descriptions',
      inputSchema: { type: 'object', properties: {}, required: [] }
    }
  ];

  // Create MCP server
  const server = new Server({
    name: 'ProxmoxEmCP',
    version: '0.4.2'
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
        // Container management
        case 'get_containers':
          result = await proxmox.getContainers();
          break;
        case 'get_container_status':
          result = await proxmox.getContainerStatus(args.node, args.vmid);
          break;
        case 'start_container':
          result = await proxmox.startContainer(args.node, args.vmid);
          break;
        case 'stop_container':
          result = await proxmox.stopContainer(args.node, args.vmid);
          break;
        case 'reboot_container':
          result = await proxmox.rebootContainer(args.node, args.vmid);
          break;
        case 'execute_container_command':
          result = await proxmox.executeContainerCommand(args.node, args.vmid, args.command);
          break;
        case 'create_container_snapshot':
          result = await proxmox.createContainerSnapshot(args.node, args.vmid, args.name, args.description);
          break;
        case 'list_container_snapshots':
          result = await proxmox.listContainerSnapshots(args.node, args.vmid);
          break;
        // Storage and backup
        case 'get_storage_details':
          result = await proxmox.getStorageDetails(args.storage);
          break;
        case 'get_backups':
          result = await proxmox.getBackups(args.storage, args.node);
          break;
        // User & Access Control
        case 'get_users':
          result = await proxmox.getUsers();
          break;
        case 'get_groups':
          result = await proxmox.getGroups();
          break;
        case 'get_roles':
          result = await proxmox.getRoles();
          break;
        // Network & Firewall
        case 'get_vm_network':
          result = await proxmox.getVMNetwork(args.node, args.vmid, args.vm_type);
          break;
        case 'get_firewall_status':
          result = await proxmox.getFirewallStatus(args.node, args.vmid);
          break;
        // Monitoring
        case 'get_recent_tasks':
          result = await proxmox.getRecentTasks(args.node, args.limit);
          break;
        case 'get_cluster_log':
          result = await proxmox.getClusterLog(args.max_lines);
          break;
        // Template management
        case 'list_templates':
          result = await proxmox.listTemplates();
          break;
        // Help & Documentation
        case 'get_help':
          result = await proxmox.getHelp();
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
  const requiredVars = ['PROXMOX_HOST', 'PROXMOX_TOKEN_ID', 'PROXMOX_TOKEN_SECRET'];
  const missing = requiredVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    logger.info('Please set the following environment variables:');
    logger.info('  PROXMOX_HOST - Your Proxmox server address (e.g., 192.168.1.100)');
    logger.info('  PROXMOX_TOKEN_ID - Your API token ID');
    logger.info('  PROXMOX_TOKEN_SECRET - Your API token secret');
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
