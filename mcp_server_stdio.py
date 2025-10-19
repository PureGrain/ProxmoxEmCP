#!/usr/bin/env python3
"""
title: Proxmox MCP Server (STDIO)
author: PureGrain at SLA Ops, LLC
author_url: https://github.com/PureGrain
repo_url: https://github.com/PureGrain/ProxmoxMCP
funding_url: https://github.com/sponsors/PureGrain
license: MIT
description: MCP server for managing and monitoring Proxmox VMs and nodes using stdio transport.
"""

import asyncio
import json
import logging
import os
import sys
from typing import Dict, Any, List, Optional
import urllib3

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
from proxmoxer import ProxmoxAPI

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Setup logging to stderr so it doesn't interfere with stdio communication
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger("ProxmoxMCP")


class ProxmoxManager:
    """Manages Proxmox API connections and operations."""

    def __init__(self):
        """Initialize Proxmox connection from environment variables."""
        self.host = os.getenv("PROXMOX_HOST")
        self.user = os.getenv("PROXMOX_USER", "root@pam")
        self.token_name = os.getenv("PROXMOX_TOKEN_ID")
        self.token_value = os.getenv("PROXMOX_TOKEN_SECRET")
        self.verify_ssl = os.getenv("PROXMOX_VERIFY_SSL", "false").lower() == "true"

        # Ensure the host does not have a duplicate port
        if self.host and ":" in self.host.split("//")[-1]:
            self.host = self.host.rsplit(":", 1)[0]

        if not all([self.host, self.token_name, self.token_value]):
            raise ValueError(
                "Missing required environment variables: "
                "PROXMOX_HOST, PROXMOX_TOKEN_ID, PROXMOX_TOKEN_SECRET"
            )

        self.proxmox = self._connect()
        logger.info(f"Connected to Proxmox host: {self.host}")

    def _connect(self) -> ProxmoxAPI:
        """Create Proxmox API connection."""
        try:
            # Ensure the host does not have a duplicate port
            if self.host and ":" in self.host.split("//")[-1]:
                self.host = self.host.rsplit(":", 1)[0]

            return ProxmoxAPI(
                self.host,
                user=self.user,
                token_name=self.token_name,
                token_value=self.token_value,
                verify_ssl=self.verify_ssl,
            )
        except Exception as e:
            logger.error(f"Failed to connect to Proxmox: {e}")
            raise

    # Node operations
    def get_nodes(self) -> Dict[str, Any]:
        """Get all nodes in the cluster."""
        try:
            nodes = self.proxmox.nodes.get()
            if nodes is None:
                nodes = []
            return {"nodes": nodes, "count": len(nodes)}
        except Exception as e:
            logger.error(f"Failed to get nodes: {e}")
            return {"error": str(e)}

    def get_node_status(self, node: str) -> Dict[str, Any]:
        """Get detailed status for a specific node."""
        try:
            status = self.proxmox.nodes(node).status.get()
            return status or {"error": "No status data returned"}
        except Exception as e:
            logger.error(f"Failed to get node status: {e}")
            return {"error": str(e)}

    # VM operations
    def get_vms(self) -> Dict[str, Any]:
        """Get all VMs across the cluster."""
        try:
            nodes = self.proxmox.nodes.get()
            if nodes is None:
                nodes = []
            all_vms = []

            for node in nodes:
                node_name = node["node"]
                try:
                    node_vms = self.proxmox.nodes(node_name).qemu.get()
                    if node_vms is not None:
                        for vm in node_vms:
                            vm["node"] = node_name
                            all_vms.append(vm)
                except Exception as e:
                    logger.warning(f"Could not get VMs from node {node_name}: {e}")

            return {"vms": all_vms, "total": len(all_vms), "nodes_checked": len(nodes)}
        except Exception as e:
            logger.error(f"Failed to get VMs: {e}")
            return {"error": str(e)}

    # Container operations
    def get_containers(self) -> Dict[str, Any]:
        """Get all LXC containers across the cluster."""
        try:
            nodes = self.proxmox.nodes.get()
            if nodes is None:
                nodes = []
            all_containers = []

            for node in nodes:
                node_name = node["node"]
                try:
                    node_containers = self.proxmox.nodes(node_name).lxc.get()
                    if node_containers is not None:
                        for container in node_containers:
                            container["node"] = node_name
                            all_containers.append(container)
                except Exception as e:
                    logger.warning(f"Could not get containers from node {node_name}: {e}")

            return {"containers": all_containers, "total": len(all_containers), "nodes_checked": len(nodes)}
        except Exception as e:
            logger.error(f"Failed to get containers: {e}")
            return {"error": str(e)}

    def start_vm(self, node: str, vmid: int) -> Dict[str, Any]:
        """Start a VM."""
        try:
            result = self.proxmox.nodes(node).qemu(vmid).status.start.post()
            return {
                "success": True,
                "task_id": result,
                "message": f"VM {vmid} start initiated on node {node}",
            }
        except Exception as e:
            logger.error(f"Failed to start VM {vmid}: {e}")
            return {"error": str(e)}

    def stop_vm(self, node: str, vmid: int) -> Dict[str, Any]:
        """Stop a VM."""
        try:
            result = self.proxmox.nodes(node).qemu(vmid).status.shutdown.post()
            return {
                "success": True,
                "task_id": result,
                "message": f"VM {vmid} stop initiated on node {node}",
            }
        except Exception as e:
            logger.error(f"Failed to stop VM {vmid}: {e}")
            return {"error": str(e)}

    def reboot_vm(self, node: str, vmid: int) -> Dict[str, Any]:
        """Reboot a VM."""
        try:
            result = self.proxmox.nodes(node).qemu(vmid).status.reboot.post()
            return {
                "success": True,
                "task_id": result,
                "message": f"VM {vmid} reboot initiated on node {node}",
            }
        except Exception as e:
            logger.error(f"Failed to reboot VM {vmid}: {e}")
            return {"error": str(e)}

    def execute_vm_command(self, node: str, vmid: int, command: str) -> Dict[str, Any]:
        """Execute a command in a VM via QEMU guest agent."""
        try:
            result = (
                self.proxmox.nodes(node).qemu(vmid).agent.exec.post(command=command)
            )
            if result is None:
                return {"error": "No response from VM agent"}
            return {
                "success": True,
                "output": result.get("out-data", ""),
                "exit_code": result.get("exitcode", 0),
            }
        except Exception as e:
            logger.error(f"Failed to execute command: {e}")
            return {"error": str(e)}

    def create_vm_snapshot(
        self, node: str, vmid: int, name: str, description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a VM snapshot."""
        try:
            params = {"snapname": name}
            if description is not None:
                params["description"] = description

            result = self.proxmox.nodes(node).qemu(vmid).snapshot.post(**params)
            return {
                "success": True,
                "task_id": result,
                "message": f"Snapshot '{name}' creation initiated for VM {vmid}",
            }
        except Exception as e:
            logger.error(f"Failed to create snapshot: {e}")
            return {"error": str(e)}

    def list_vm_snapshots(self, node: str, vmid: int) -> Dict[str, Any]:
        """List VM snapshots."""
        try:
            snapshots = self.proxmox.nodes(node).qemu(vmid).snapshot.get()
            return {"snapshots": snapshots if snapshots is not None else []}
        except Exception as e:
            logger.error(f"Failed to list snapshots: {e}")
            return {"error": str(e)}

    def get_vm_status(self, node: str, vmid: int) -> Dict[str, Any]:
        """Get VM status and configuration."""
        try:
            status = self.proxmox.nodes(node).qemu(vmid).status.current.get()
            return status or {"error": "No status data returned"}
        except Exception as e:
            logger.error(f"Failed to get VM status: {e}")
            return {"error": str(e)}
    
    def get_container_status(self, node: str, vmid: int) -> Dict[str, Any]:
        """Get container status and configuration."""
        try:
            status = self.proxmox.nodes(node).lxc(vmid).status.current.get()
            return status or {"error": "No status data returned"}
        except Exception as e:
            logger.error(f"Failed to get container status: {e}")
            return {"error": str(e)}
    
    def start_container(self, node: str, vmid: int) -> Dict[str, Any]:
        """Start a container."""
        try:
            result = self.proxmox.nodes(node).lxc(vmid).status.start.post()
            return {
                "success": True,
                "task_id": result,
                "message": f"Container {vmid} start initiated on node {node}",
            }
        except Exception as e:
            logger.error(f"Failed to start container {vmid}: {e}")
            return {"error": str(e)}
    
    def stop_container(self, node: str, vmid: int) -> Dict[str, Any]:
        """Stop a container."""
        try:
            result = self.proxmox.nodes(node).lxc(vmid).status.shutdown.post()
            return {
                "success": True,
                "task_id": result,
                "message": f"Container {vmid} stop initiated on node {node}",
            }
        except Exception as e:
            logger.error(f"Failed to stop container {vmid}: {e}")
            return {"error": str(e)}
    
    def reboot_container(self, node: str, vmid: int) -> Dict[str, Any]:
        """Reboot a container."""
        try:
            result = self.proxmox.nodes(node).lxc(vmid).status.reboot.post()
            return {
                "success": True,
                "task_id": result,
                "message": f"Container {vmid} reboot initiated on node {node}",
            }
        except Exception as e:
            logger.error(f"Failed to reboot container {vmid}: {e}")
            return {"error": str(e)}
    
    def execute_container_command(self, node: str, vmid: int, command: str) -> Dict[str, Any]:
        """Execute a command in a container via pct exec."""
        try:
            result = self.proxmox.nodes(node).lxc(vmid).exec.post(command=command)
            if result is None:
                return {"error": "No response from container"}
            return {
                "success": True,
                "output": result.get("out-data", ""),
                "exit_code": result.get("exitcode", 0),
            }
        except Exception as e:
            logger.error(f"Failed to execute command in container: {e}")
            return {"error": str(e)}
    
    def create_container_snapshot(
        self, node: str, vmid: int, name: str, description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a container snapshot."""
        try:
            params = {"snapname": name}
            if description is not None:
                params["description"] = description
            
            result = self.proxmox.nodes(node).lxc(vmid).snapshot.post(**params)
            return {
                "success": True,
                "task_id": result,
                "message": f"Snapshot '{name}' creation initiated for container {vmid}",
            }
        except Exception as e:
            logger.error(f"Failed to create container snapshot: {e}")
            return {"error": str(e)}
    
    def list_container_snapshots(self, node: str, vmid: int) -> Dict[str, Any]:
        """List container snapshots."""
        try:
            snapshots = self.proxmox.nodes(node).lxc(vmid).snapshot.get()
            return {"snapshots": snapshots if snapshots is not None else []}
        except Exception as e:
            logger.error(f"Failed to list container snapshots: {e}")
            return {"error": str(e)}

    # Storage operations
    def get_storage(self) -> Dict[str, Any]:
        """Get storage information."""
        try:
            storage = self.proxmox.storage.get()
            return {"storage": storage if storage is not None else []}
        except Exception as e:
            logger.error(f"Failed to get storage: {e}")
            return {"error": str(e)}
    
    def get_storage_details(self, storage: str) -> Dict[str, Any]:
        """Get detailed information about a specific storage pool."""
        try:
            # Get storage configuration
            config_list = self.proxmox.storage(storage).get()
            if not config_list:
                return {"error": f"Storage {storage} not found"}
            config = config_list[0]
            
            details = {
                "storage": storage,
                "type": config.get('type', 'unknown'),
                "enabled": config.get('enabled', 0),
                "shared": config.get('shared', 0),
                "content": config.get('content', '').split(',') if config.get('content') else [],
                "nodes": config.get('nodes', 'all')
            }
            
            # Add type-specific details
            storage_type = config.get('type', '').lower()
            
            if storage_type == 'nfs':
                details['nfs'] = {
                    "server": config.get('server', 'N/A'),
                    "export": config.get('export', 'N/A'),
                    "path": config.get('path', 'N/A'),
                    "options": config.get('options', 'N/A')
                }
            elif storage_type in ['dir', 'lvm', 'lvmthin', 'zfs', 'zfspool']:
                details['path'] = config.get('path', 'N/A')
            
            # Try to get current usage from a node
            try:
                nodes = self.proxmox.nodes.get()
                if nodes and len(nodes) > 0:
                    node = nodes[0]['node']
                    status = self.proxmox.nodes(node).storage(storage).status.get()
                    if status:
                        details['status'] = {
                            "total": status.get('total', 0),
                            "used": status.get('used', 0),
                            "available": status.get('avail', 0),
                            "active": status.get('active', 0)
                        }
            except:
                pass
            
            return details
            
        except Exception as e:
            logger.error(f"Failed to get storage details: {e}")
            return {"error": str(e)}
    
    def get_backups(self, storage: Optional[str] = None, node: Optional[str] = None) -> Dict[str, Any]:
        """List all backups, optionally filtered by storage or node."""
        try:
            backups = []
            
            if storage and node:
                # Get backups from specific storage on specific node
                content = self.proxmox.nodes(node).storage(storage).content.get()
                if content is None:
                    content = []
                for item in content:
                    if item.get('content') == 'backup':
                        backup_info = {
                            "volid": item['volid'],
                            "vmid": item.get('vmid'),
                            "node": node,
                            "storage": storage,
                            "size": item.get('size', 0),
                            "format": item.get('format'),
                            "ctime": item.get('ctime', 0),
                            "notes": item.get('notes', '')
                        }
                        backups.append(backup_info)
            else:
                # Get all backups from all storages on all nodes
                nodes = self.proxmox.nodes.get()
                storages = self.proxmox.storage.get()
                
                if nodes is None:
                    nodes = []
                if storages is None:
                    storages = []
                    
                for node_info in nodes:
                    node_name = node_info['node']
                    for stor in storages:
                        if 'backup' in stor.get('content', ''):
                            try:
                                content = self.proxmox.nodes(node_name).storage(stor['storage']).content.get()
                                if content is None:
                                    content = []
                                for item in content:
                                    if item.get('content') == 'backup':
                                        backup_info = {
                                            "volid": item['volid'],
                                            "vmid": item.get('vmid'),
                                            "node": node_name,
                                            "storage": stor['storage'],
                                            "size": item.get('size', 0),
                                            "format": item.get('format'),
                                            "ctime": item.get('ctime', 0),
                                            "notes": item.get('notes', '')
                                        }
                                        backups.append(backup_info)
                            except:
                                continue
            
            return {"backups": backups, "count": len(backups)}
            
        except Exception as e:
            logger.error(f"Failed to list backups: {e}")
            return {"error": str(e)}

    # Cluster operations
    def get_cluster_status(self) -> Dict[str, Any]:
        """Get comprehensive cluster health and resource summary."""
        try:
            # Get cluster status
            cluster_status = self.proxmox.cluster.status.get()
            
            # Get resource summary
            resources = self.proxmox.cluster.resources.get(type='node')
            if resources is None:
                resources = []
            
            # Calculate totals
            total_cpu = 0
            total_memory = 0
            total_memory_used = 0
            total_disk = 0
            total_disk_used = 0
            online_nodes = 0
            
            nodes_info = []
            for node in resources:
                if node['type'] == 'node':
                    total_cpu += node.get('maxcpu', 0)
                    total_memory += node.get('maxmem', 0)
                    total_memory_used += node.get('mem', 0)
                    total_disk += node.get('maxdisk', 0)
                    total_disk_used += node.get('disk', 0)
                    
                    if node.get('status') == 'online':
                        online_nodes += 1
                    
                    nodes_info.append({
                        "name": node['node'],
                        "status": node.get('status', 'unknown'),
                        "cpu_usage": node.get('cpu', 0),
                        "memory": node.get('mem', 0),
                        "max_memory": node.get('maxmem', 0),
                        "disk": node.get('disk', 0),
                        "max_disk": node.get('maxdisk', 0),
                        "uptime": node.get('uptime', 0)
                    })
            
            # Get VM and container counts
            vms = self.proxmox.cluster.resources.get(type='vm')
            if vms is None:
                vms = []
            vm_count = sum(1 for vm in vms if vm['type'] == 'qemu')
            ct_count = sum(1 for vm in vms if vm['type'] == 'lxc')
            running_vms = sum(1 for vm in vms if vm['type'] == 'qemu' and vm.get('status') == 'running')
            running_cts = sum(1 for vm in vms if vm['type'] == 'lxc' and vm.get('status') == 'running')
            
            cluster_info = {
                "name": cluster_status[0].get('name', 'Proxmox Cluster') if cluster_status else 'Proxmox Cluster',
                "version": cluster_status[0].get('version') if cluster_status else 'unknown',
                "nodes": {
                    "total": len(nodes_info),
                    "online": online_nodes,
                    "details": nodes_info
                },
                "resources": {
                    "cpu": {
                        "total_cores": total_cpu
                    },
                    "memory": {
                        "total": total_memory,
                        "used": total_memory_used,
                        "free": total_memory - total_memory_used
                    },
                    "storage": {
                        "total": total_disk,
                        "used": total_disk_used,
                        "free": total_disk - total_disk_used
                    }
                },
                "virtual_machines": {
                    "total": vm_count,
                    "running": running_vms,
                    "stopped": vm_count - running_vms
                },
                "containers": {
                    "total": ct_count,
                    "running": running_cts,
                    "stopped": ct_count - running_cts
                },
                "quorate": cluster_status[0].get('quorate', True) if cluster_status else True
            }
            
            return cluster_info
            
        except Exception as e:
            logger.error(f"Failed to get cluster status: {e}")
            return {"error": str(e)}

    # Task operations
    def get_task_status(self, node: str, upid: str) -> Dict[str, Any]:
        """Get task status."""
        try:
            # Parse UPID to get task ID
            parts = upid.split(":")
            if len(parts) < 3:
                return {"error": "Invalid UPID format"}

            status = self.proxmox.nodes(node).tasks(upid).status.get()
            return status or {"error": "No task status returned"}
        except Exception as e:
            logger.error(f"Failed to get task status: {e}")
            return {"error": str(e)}
    
    # User & Access Control operations
    def get_users(self) -> Dict[str, Any]:
        """List all users in the Proxmox cluster."""
        try:
            users = self.proxmox.access.users.get()
            if users is None:
                users = []
            
            user_list = []
            for user in users:
                user_info = {
                    "userid": user['userid'],
                    "enable": user.get('enable', 1),
                    "expire": user.get('expire', 0),
                    "firstname": user.get('firstname', ''),
                    "lastname": user.get('lastname', ''),
                    "email": user.get('email', ''),
                    "comment": user.get('comment', ''),
                    "groups": user.get('groups', '').split(',') if user.get('groups') else [],
                    "tokens": user.get('tokens', [])
                }
                user_list.append(user_info)
            
            return {"users": user_list, "count": len(user_list)}
        except Exception as e:
            logger.error(f"Failed to list users: {e}")
            return {"error": str(e)}
    
    def get_groups(self) -> Dict[str, Any]:
        """List all groups in the Proxmox cluster."""
        try:
            groups = self.proxmox.access.groups.get()
            if groups is None:
                groups = []
            
            group_list = []
            for group in groups:
                group_info = {
                    "groupid": group['groupid'],
                    "comment": group.get('comment', ''),
                    "users": group.get('users', '').split(',') if group.get('users') else []
                }
                group_list.append(group_info)
            
            return {"groups": group_list, "count": len(group_list)}
        except Exception as e:
            logger.error(f"Failed to list groups: {e}")
            return {"error": str(e)}
    
    def get_roles(self) -> Dict[str, Any]:
        """List all roles in the Proxmox cluster."""
        try:
            roles = self.proxmox.access.roles.get()
            if roles is None:
                roles = []
            
            role_list = []
            for role in roles:
                role_info = {
                    "roleid": role['roleid'],
                    "privs": role.get('privs', '').split(',') if role.get('privs') else [],
                    "special": role.get('special', 0)
                }
                role_list.append(role_info)
            
            return {"roles": role_list, "count": len(role_list)}
        except Exception as e:
            logger.error(f"Failed to list roles: {e}")
            return {"error": str(e)}
    
    # Monitoring operations
    def get_recent_tasks(self, node: Optional[str] = None, limit: int = 20) -> Dict[str, Any]:
        """List recent tasks, optionally filtered by node."""
        try:
            tasks = []
            
            if node:
                # Get tasks from specific node
                node_tasks = self.proxmox.nodes(node).tasks.get(limit=limit)
                if node_tasks is None:
                    node_tasks = []
                for task in node_tasks:
                    task_info = {
                        "upid": task.get('upid'),
                        "node": task.get('node'),
                        "pid": task.get('pid'),
                        "pstart": task.get('pstart'),
                        "type": task.get('type'),
                        "status": task.get('status', 'running'),
                        "user": task.get('user'),
                        "starttime": task.get('starttime', 0),
                        "endtime": task.get('endtime', 0)
                    }
                    tasks.append(task_info)
            else:
                # Get tasks from all nodes
                nodes = self.proxmox.nodes.get()
                if nodes is None:
                    nodes = []
                for node_info in nodes:
                    try:
                        node_limit = limit // len(nodes) if len(nodes) > 0 else limit
                        node_tasks = self.proxmox.nodes(node_info['node']).tasks.get(limit=node_limit)
                        if node_tasks is None:
                            node_tasks = []
                        for task in node_tasks:
                            task_info = {
                                "upid": task.get('upid'),
                                "node": task.get('node'),
                                "pid": task.get('pid'),
                                "type": task.get('type'),
                                "status": task.get('status', 'running'),
                                "user": task.get('user'),
                                "starttime": task.get('starttime', 0),
                                "endtime": task.get('endtime', 0)
                            }
                            tasks.append(task_info)
                    except:
                        continue
            
            # Sort by start time (most recent first)
            tasks.sort(key=lambda x: x['starttime'], reverse=True)
            
            return {"tasks": tasks[:limit], "count": len(tasks[:limit])}
            
        except Exception as e:
            logger.error(f"Failed to list tasks: {e}")
            return {"error": str(e)}
    
    def get_cluster_log(self, max_lines: int = 50) -> Dict[str, Any]:
        """Get recent cluster log entries."""
        try:
            # Get cluster log
            log_entries = self.proxmox.cluster.log.get(max=max_lines)
            if log_entries is None:
                log_entries = []
            
            formatted_logs = []
            for entry in log_entries:
                log_info = {
                    "time": entry.get('time', 0),
                    "node": entry.get('node', 'cluster'),
                    "user": entry.get('user', 'system'),
                    "message": entry.get('msg', ''),
                    "priority": entry.get('pri', 6),
                    "tag": entry.get('tag', 'system')
                }
                formatted_logs.append(log_info)
            
            return {"logs": formatted_logs, "count": len(formatted_logs)}
            
        except Exception as e:
            logger.error(f"Failed to get cluster log: {e}")
            return {"error": str(e)}
    
    # Template management
    def list_templates(self) -> Dict[str, Any]:
        """List all available templates (VMs and containers marked as templates)."""
        try:
            templates = []
            nodes = self.proxmox.nodes.get()
            if nodes is None:
                nodes = []
            
            for node in nodes:
                node_name = node['node']
                
                # Check VMs for templates
                vms = self.proxmox.nodes(node_name).qemu.get()
                if vms:
                    for vm in vms:
                        if vm.get('template', 0) == 1:
                            template_info = {
                                "vmid": vm['vmid'],
                                "name": vm.get('name', 'unnamed'),
                                "node": node_name,
                                "type": "qemu",
                                "disk_size": vm.get('maxdisk', 0),
                                "memory": vm.get('maxmem', 0),
                                "cpus": vm.get('cpus', 1)
                            }
                            templates.append(template_info)
                
                # Check containers for templates
                containers = self.proxmox.nodes(node_name).lxc.get()
                if containers:
                    for ct in containers:
                        if ct.get('template', 0) == 1:
                            template_info = {
                                "vmid": ct['vmid'],
                                "name": ct.get('name', 'unnamed'),
                                "node": node_name,
                                "type": "lxc",
                                "disk_size": ct.get('maxdisk', 0),
                                "memory": ct.get('maxmem', 0),
                                "cpus": ct.get('cpus', 1)
                            }
                            templates.append(template_info)
            
            return {"templates": templates, "count": len(templates)}
            
        except Exception as e:
            logger.error(f"Failed to list templates: {e}")
            return {"error": str(e)}
    
    # Network & Firewall operations
    def get_vm_network(self, node: str, vmid: int, vm_type: str = "qemu") -> Dict[str, Any]:
        """Get network configuration for a VM or container."""
        try:
            if vm_type == "qemu":
                config = self.proxmox.nodes(node).qemu(vmid).config.get()
            else:
                config = self.proxmox.nodes(node).lxc(vmid).config.get()
            
            if config is None:
                config = {}
                
            network_info = {
                "vmid": vmid,
                "node": node,
                "type": vm_type,
                "interfaces": []
            }
            
            # Extract network interfaces
            for key in config:
                if key.startswith('net'):
                    net_config = config[key]
                    interface = {
                        "name": key,
                        "config": net_config
                    }
                    
                    # Parse network configuration string
                    if isinstance(net_config, str):
                        parts = net_config.split(',')
                        for part in parts:
                            if '=' in part:
                                k, v = part.split('=', 1)
                                interface[k] = v
                    
                    network_info["interfaces"].append(interface)
            
            # Try to get IP addresses if agent is running (VMs only)
            if vm_type == "qemu":
                try:
                    agent_info = self.proxmox.nodes(node).qemu(vmid).agent.get('network-get-interfaces')
                    if agent_info:
                        network_info["agent_network"] = agent_info.get('result', [])
                    else:
                        network_info["agent_network"] = None
                except:
                    network_info["agent_network"] = None
            
            return network_info
            
        except Exception as e:
            logger.error(f"Failed to get network info: {e}")
            return {"error": str(e)}
    
    def get_firewall_status(self, node: str, vmid: Optional[int] = None) -> Dict[str, Any]:
        """Get firewall status and rules for a node or VM."""
        try:
            if vmid:
                # Get VM firewall status
                options = self.proxmox.nodes(node).qemu(vmid).firewall.options.get()
                rules = self.proxmox.nodes(node).qemu(vmid).firewall.rules.get()
            else:
                # Get node firewall status
                options = self.proxmox.nodes(node).firewall.options.get()
                rules = self.proxmox.nodes(node).firewall.rules.get()
            
            if options is None:
                options = {}
            if rules is None:
                rules = []
                
            firewall_info = {
                "target": f"VM {vmid}" if vmid else f"Node {node}",
                "enabled": options.get('enable', 0),
                "policy_in": options.get('policy_in', 'ACCEPT'),
                "policy_out": options.get('policy_out', 'ACCEPT'),
                "log_level": options.get('log_level_in', 'nolog'),
                "rules": []
            }
            
            for rule in rules:
                rule_info = {
                    "pos": rule.get('pos'),
                    "type": rule.get('type'),
                    "action": rule.get('action'),
                    "enable": rule.get('enable', 1),
                    "source": rule.get('source', 'any'),
                    "dest": rule.get('dest', 'any'),
                    "proto": rule.get('proto', 'any'),
                    "dport": rule.get('dport', ''),
                    "sport": rule.get('sport', ''),
                    "comment": rule.get('comment', '')
                }
                firewall_info["rules"].append(rule_info)
            
            return firewall_info
            
        except Exception as e:
            logger.error(f"Failed to get firewall status: {e}")
            return {"error": str(e)}


async def run_mcp_server():
    """Run the MCP server with stdio transport."""
    # Initialize Proxmox manager - but handle errors gracefully
    proxmox = None
    initialization_error = None

    try:
        proxmox = ProxmoxManager()
        logger.info("Successfully initialized Proxmox connection")
    except Exception as e:
        logger.error(f"Failed to initialize Proxmox connection: {e}")
        initialization_error = str(e)
        # Don't exit - let the MCP server run and report the error through the protocol

    # Create MCP server
    server = Server("ProxmoxMCP")

    @server.list_tools()
    async def list_tools() -> List[Tool]:
        """List available MCP tools."""
        return [
            Tool(
                name="get_nodes",
                description="List all nodes in the Proxmox cluster",
                inputSchema={"type": "object", "properties": {}, "required": []},
            ),
            Tool(
                name="get_node_status",
                description="Get detailed status for a specific node",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node": {
                            "type": "string",
                            "description": "Node name (e.g., 'pve1')",
                        }
                    },
                    "required": ["node"],
                },
            ),
            Tool(
                name="get_vms",
                description="List all VMs across the cluster",
                inputSchema={"type": "object", "properties": {}, "required": []},
            ),
            Tool(
                name="get_containers",
                description="List all LXC containers across the cluster",
                inputSchema={"type": "object", "properties": {}, "required": []},
            ),
            Tool(
                name="get_vm_status",
                description="Get status and configuration for a specific VM",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node": {
                            "type": "string",
                            "description": "Node name where VM is located",
                        },
                        "vmid": {"type": "integer", "description": "VM ID number"},
                    },
                    "required": ["node", "vmid"],
                },
            ),
            Tool(
                name="get_container_status",
                description="Get status and configuration for a specific container",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node": {
                            "type": "string",
                            "description": "Node name where container is located",
                        },
                        "vmid": {"type": "integer", "description": "Container ID number"},
                    },
                    "required": ["node", "vmid"],
                },
            ),
            Tool(
                name="start_vm",
                description="Start a virtual machine",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node": {
                            "type": "string",
                            "description": "Node name where VM is located",
                        },
                        "vmid": {"type": "integer", "description": "VM ID number"},
                    },
                    "required": ["node", "vmid"],
                },
            ),
            Tool(
                name="stop_vm",
                description="Stop a virtual machine gracefully",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node": {
                            "type": "string",
                            "description": "Node name where VM is located",
                        },
                        "vmid": {"type": "integer", "description": "VM ID number"},
                    },
                    "required": ["node", "vmid"],
                },
            ),
            Tool(
                name="reboot_vm",
                description="Reboot a virtual machine",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node": {
                            "type": "string",
                            "description": "Node name where VM is located",
                        },
                        "vmid": {"type": "integer", "description": "VM ID number"},
                    },
                    "required": ["node", "vmid"],
                },
            ),
            Tool(
                name="start_container",
                description="Start an LXC container",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node": {
                            "type": "string",
                            "description": "Node name where container is located",
                        },
                        "vmid": {"type": "integer", "description": "Container ID number"},
                    },
                    "required": ["node", "vmid"],
                },
            ),
            Tool(
                name="stop_container",
                description="Stop an LXC container gracefully",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node": {
                            "type": "string",
                            "description": "Node name where container is located",
                        },
                        "vmid": {"type": "integer", "description": "Container ID number"},
                    },
                    "required": ["node", "vmid"],
                },
            ),
            Tool(
                name="reboot_container",
                description="Reboot an LXC container",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node": {
                            "type": "string",
                            "description": "Node name where container is located",
                        },
                        "vmid": {"type": "integer", "description": "Container ID number"},
                    },
                    "required": ["node", "vmid"],
                },
            ),
            Tool(
                name="execute_vm_command",
                description="Execute a command in a VM via QEMU guest agent",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node": {
                            "type": "string",
                            "description": "Node name where VM is located",
                        },
                        "vmid": {"type": "integer", "description": "VM ID number"},
                        "command": {
                            "type": "string",
                            "description": "Command to execute in the VM",
                        },
                    },
                    "required": ["node", "vmid", "command"],
                },
            ),
            Tool(
                name="create_vm_snapshot",
                description="Create a snapshot of a VM",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node": {
                            "type": "string",
                            "description": "Node name where VM is located",
                        },
                        "vmid": {"type": "integer", "description": "VM ID number"},
                        "name": {"type": "string", "description": "Snapshot name"},
                        "description": {
                            "type": "string",
                            "description": "Optional snapshot description",
                        },
                    },
                    "required": ["node", "vmid", "name"],
                },
            ),
            Tool(
                name="list_vm_snapshots",
                description="List all snapshots for a VM",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node": {
                            "type": "string",
                            "description": "Node name where VM is located",
                        },
                        "vmid": {"type": "integer", "description": "VM ID number"},
                    },
                    "required": ["node", "vmid"],
                },
            ),
            Tool(
                name="execute_container_command",
                description="Execute a command in a container",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node": {
                            "type": "string",
                            "description": "Node name where container is located",
                        },
                        "vmid": {"type": "integer", "description": "Container ID number"},
                        "command": {
                            "type": "string",
                            "description": "Command to execute in the container",
                        },
                    },
                    "required": ["node", "vmid", "command"],
                },
            ),
            Tool(
                name="create_container_snapshot",
                description="Create a snapshot of a container",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node": {
                            "type": "string",
                            "description": "Node name where container is located",
                        },
                        "vmid": {"type": "integer", "description": "Container ID number"},
                        "name": {"type": "string", "description": "Snapshot name"},
                        "description": {
                            "type": "string",
                            "description": "Optional snapshot description",
                        },
                    },
                    "required": ["node", "vmid", "name"],
                },
            ),
            Tool(
                name="list_container_snapshots",
                description="List all snapshots for a container",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node": {
                            "type": "string",
                            "description": "Node name where container is located",
                        },
                        "vmid": {"type": "integer", "description": "Container ID number"},
                    },
                    "required": ["node", "vmid"],
                },
            ),
            Tool(
                name="get_storage",
                description="List storage pools in the cluster",
                inputSchema={"type": "object", "properties": {}, "required": []},
            ),
            Tool(
                name="get_storage_details",
                description="Get detailed information about a specific storage pool",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "storage": {
                            "type": "string",
                            "description": "Storage pool name",
                        }
                    },
                    "required": ["storage"],
                },
            ),
            Tool(
                name="get_backups",
                description="List backup files in storage",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "storage": {
                            "type": "string",
                            "description": "Optional: specific storage pool",
                        },
                        "node": {
                            "type": "string",
                            "description": "Optional: specific node",
                        }
                    },
                    "required": [],
                },
            ),
            Tool(
                name="get_cluster_status",
                description="Get cluster status and health information",
                inputSchema={"type": "object", "properties": {}, "required": []},
            ),
            Tool(
                name="get_task_status",
                description="Get status of a Proxmox task",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node": {
                            "type": "string",
                            "description": "Node where the task is running",
                        },
                        "upid": {
                            "type": "string",
                            "description": "Unique Process ID of the task",
                        },
                    },
                    "required": ["node", "upid"],
                },
            ),
            Tool(
                name="get_users",
                description="List all users in the Proxmox cluster",
                inputSchema={"type": "object", "properties": {}, "required": []},
            ),
            Tool(
                name="get_groups",
                description="List all groups in the Proxmox cluster",
                inputSchema={"type": "object", "properties": {}, "required": []},
            ),
            Tool(
                name="get_roles",
                description="List all roles available in the Proxmox cluster",
                inputSchema={"type": "object", "properties": {}, "required": []},
            ),
            Tool(
                name="get_vm_network",
                description="Get network configuration for a VM or container",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node": {
                            "type": "string",
                            "description": "Node name where VM/container is located",
                        },
                        "vmid": {"type": "integer", "description": "VM or container ID"},
                        "vm_type": {
                            "type": "string",
                            "description": "Type: 'qemu' for VM, 'lxc' for container (default: qemu)",
                        },
                    },
                    "required": ["node", "vmid"],
                },
            ),
            Tool(
                name="get_firewall_status",
                description="Get firewall status and rules for a node or VM",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node": {
                            "type": "string",
                            "description": "Node name",
                        },
                        "vmid": {
                            "type": "integer",
                            "description": "Optional: VM ID (if checking VM firewall)",
                        },
                    },
                    "required": ["node"],
                },
            ),
            Tool(
                name="get_recent_tasks",
                description="List recent tasks across the cluster",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node": {
                            "type": "string",
                            "description": "Optional: filter tasks by specific node",
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum number of tasks to return (default: 20)",
                        },
                    },
                    "required": [],
                },
            ),
            Tool(
                name="get_cluster_log",
                description="Get recent cluster log entries",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "max_lines": {
                            "type": "integer",
                            "description": "Maximum number of log entries to return (default: 50)",
                        },
                    },
                    "required": [],
                },
            ),
            Tool(
                name="list_templates",
                description="List all VM and container templates available in the cluster",
                inputSchema={"type": "object", "properties": {}, "required": []},
            ),
        ]

    @server.call_tool()
    async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
        """Handle MCP tool calls."""
        try:
            # Check if initialization failed
            if proxmox is None:
                error_msg = initialization_error or "Proxmox connection not initialized"
                return [
                    TextContent(
                        type="text",
                        text=json.dumps(
                            {
                                "error": f"Server initialization failed: {error_msg}",
                                "details": "Please check environment variables and server configuration",
                            },
                            indent=2,
                        ),
                    )
                ]

            result = None

            # Route tool calls to appropriate methods
            if name == "get_nodes":
                result = proxmox.get_nodes()
            elif name == "get_node_status":
                result = proxmox.get_node_status(arguments["node"])
            elif name == "get_vms":
                result = proxmox.get_vms()
            elif name == "get_containers":
                result = proxmox.get_containers()
            elif name == "get_vm_status":
                result = proxmox.get_vm_status(arguments["node"], arguments["vmid"])
            elif name == "get_container_status":
                result = proxmox.get_container_status(arguments["node"], arguments["vmid"])
            elif name == "start_vm":
                result = proxmox.start_vm(arguments["node"], arguments["vmid"])
            elif name == "stop_vm":
                result = proxmox.stop_vm(arguments["node"], arguments["vmid"])
            elif name == "reboot_vm":
                result = proxmox.reboot_vm(arguments["node"], arguments["vmid"])
            elif name == "start_container":
                result = proxmox.start_container(arguments["node"], arguments["vmid"])
            elif name == "stop_container":
                result = proxmox.stop_container(arguments["node"], arguments["vmid"])
            elif name == "reboot_container":
                result = proxmox.reboot_container(arguments["node"], arguments["vmid"])
            elif name == "execute_vm_command":
                result = proxmox.execute_vm_command(
                    arguments["node"], arguments["vmid"], arguments["command"]
                )
            elif name == "execute_container_command":
                result = proxmox.execute_container_command(
                    arguments["node"], arguments["vmid"], arguments["command"]
                )
            elif name == "create_vm_snapshot":
                result = proxmox.create_vm_snapshot(
                    arguments["node"],
                    arguments["vmid"],
                    arguments["name"],
                    arguments.get("description"),
                )
            elif name == "create_container_snapshot":
                result = proxmox.create_container_snapshot(
                    arguments["node"],
                    arguments["vmid"],
                    arguments["name"],
                    arguments.get("description"),
                )
            elif name == "list_vm_snapshots":
                result = proxmox.list_vm_snapshots(arguments["node"], arguments["vmid"])
            elif name == "list_container_snapshots":
                result = proxmox.list_container_snapshots(arguments["node"], arguments["vmid"])
            elif name == "get_storage":
                result = proxmox.get_storage()
            elif name == "get_storage_details":
                result = proxmox.get_storage_details(arguments["storage"])
            elif name == "get_backups":
                result = proxmox.get_backups(
                    arguments.get("storage"),
                    arguments.get("node")
                )
            elif name == "get_cluster_status":
                result = proxmox.get_cluster_status()
            elif name == "get_task_status":
                result = proxmox.get_task_status(arguments["node"], arguments["upid"])
            elif name == "get_users":
                result = proxmox.get_users()
            elif name == "get_groups":
                result = proxmox.get_groups()
            elif name == "get_roles":
                result = proxmox.get_roles()
            elif name == "get_vm_network":
                result = proxmox.get_vm_network(
                    arguments["node"],
                    arguments["vmid"],
                    arguments.get("vm_type", "qemu")
                )
            elif name == "get_firewall_status":
                result = proxmox.get_firewall_status(
                    arguments["node"],
                    arguments.get("vmid")
                )
            elif name == "get_recent_tasks":
                result = proxmox.get_recent_tasks(
                    arguments.get("node"),
                    arguments.get("limit", 20)
                )
            elif name == "get_cluster_log":
                result = proxmox.get_cluster_log(
                    arguments.get("max_lines", 50)
                )
            elif name == "list_templates":
                result = proxmox.list_templates()
            else:
                result = {"error": f"Unknown tool: {name}"}

            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        except Exception as e:
            logger.error(f"Error calling tool {name}: {e}")
            return [TextContent(type="text", text=json.dumps({"error": str(e)}))]

    # Run the server with stdio transport
    logger.info("Starting Proxmox MCP Server (STDIO)...")
    if proxmox:
        logger.info(f"Connected to Proxmox host: {os.getenv('PROXMOX_HOST')}")
    else:
        logger.warning("Running in degraded mode - Proxmox connection failed")

    # Use stdio_server for MCP communication
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


def main():
    """Main entry point."""
    # Check for required environment variables
    required_vars = ["PROXMOX_HOST", "PROXMOX_TOKEN_ID", "PROXMOX_TOKEN_SECRET"]
    missing = [var for var in required_vars if not os.getenv(var)]

    if missing:
        logger.error(f"Missing required environment variables: {', '.join(missing)}")
        logger.info("Please set the following environment variables:")
        logger.info(
            "  PROXMOX_HOST - Your Proxmox server address (e.g., 192.168.1.100)"
        )
        logger.info("  PROXMOX_TOKEN_ID - Your API token ID")
        logger.info("  PROXMOX_TOKEN_SECRET - Your API token secret")
        logger.info("  PROXMOX_USER - (Optional) User, defaults to root@pam")
        logger.info("  PROXMOX_VERIFY_SSL - (Optional) Verify SSL, defaults to false")
        logger.info("  LOG_LEVEL - (Optional) Log level, defaults to INFO")

        # Don't exit immediately - run the server anyway to report errors through MCP protocol
        # The server will run in a degraded mode and report initialization errors

    try:
        asyncio.run(run_mcp_server())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        import traceback

        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
