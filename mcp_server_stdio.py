#!/usr/bin/env python3
"""
title: Proxmox MCP Server (STDIO)
author: PureGrain at SLA Ops, LLC
author_url: https://github.com/PureGrain
repo_url: https://github.com/PureGrain/ProxmoxMCP
version: 2.0.0
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
        self.token_name = os.getenv("PROXMOX_TOKEN_NAME")
        self.token_value = os.getenv("PROXMOX_TOKEN_VALUE")
        self.verify_ssl = os.getenv("PROXMOX_VERIFY_SSL", "false").lower() == "true"

        # Ensure the host does not have a duplicate port
        if self.host and ":" in self.host.split("//")[-1]:
            self.host = self.host.rsplit(":", 1)[0]

        if not all([self.host, self.token_name, self.token_value]):
            raise ValueError(
                "Missing required environment variables: "
                "PROXMOX_HOST, PROXMOX_TOKEN_NAME, PROXMOX_TOKEN_VALUE"
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

    # Storage operations
    def get_storage(self) -> Dict[str, Any]:
        """Get storage information."""
        try:
            storage = self.proxmox.storage.get()
            return {"storage": storage if storage is not None else []}
        except Exception as e:
            logger.error(f"Failed to get storage: {e}")
            return {"error": str(e)}

    # Cluster operations
    def get_cluster_status(self) -> Dict[str, Any]:
        """Get cluster status."""
        try:
            status = self.proxmox.cluster.status.get()
            return {"status": status if status is not None else []}
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


async def run_mcp_server():
    """Run the MCP server with stdio transport."""
    # Initialize Proxmox manager
    try:
        proxmox = ProxmoxManager()
    except Exception as e:
        logger.error(f"Failed to initialize Proxmox connection: {e}")
        sys.exit(1)

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
                name="get_storage",
                description="List storage pools in the cluster",
                inputSchema={"type": "object", "properties": {}, "required": []},
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
        ]

    @server.call_tool()
    async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
        """Handle MCP tool calls."""
        try:
            result = None

            # Route tool calls to appropriate methods
            if name == "get_nodes":
                result = proxmox.get_nodes()
            elif name == "get_node_status":
                result = proxmox.get_node_status(arguments["node"])
            elif name == "get_vms":
                result = proxmox.get_vms()
            elif name == "get_vm_status":
                result = proxmox.get_vm_status(arguments["node"], arguments["vmid"])
            elif name == "start_vm":
                result = proxmox.start_vm(arguments["node"], arguments["vmid"])
            elif name == "stop_vm":
                result = proxmox.stop_vm(arguments["node"], arguments["vmid"])
            elif name == "reboot_vm":
                result = proxmox.reboot_vm(arguments["node"], arguments["vmid"])
            elif name == "execute_vm_command":
                result = proxmox.execute_vm_command(
                    arguments["node"], arguments["vmid"], arguments["command"]
                )
            elif name == "create_vm_snapshot":
                result = proxmox.create_vm_snapshot(
                    arguments["node"],
                    arguments["vmid"],
                    arguments["name"],
                    arguments.get("description"),
                )
            elif name == "list_vm_snapshots":
                result = proxmox.list_vm_snapshots(arguments["node"], arguments["vmid"])
            elif name == "get_storage":
                result = proxmox.get_storage()
            elif name == "get_cluster_status":
                result = proxmox.get_cluster_status()
            elif name == "get_task_status":
                result = proxmox.get_task_status(arguments["node"], arguments["upid"])
            else:
                result = {"error": f"Unknown tool: {name}"}

            return [TextContent(type="text", text=json.dumps(result, indent=2))]
        except Exception as e:
            logger.error(f"Error calling tool {name}: {e}")
            return [TextContent(type="text", text=json.dumps({"error": str(e)}))]

    # Run the server with stdio transport
    logger.info("Starting Proxmox MCP Server (STDIO)...")
    logger.info(f"Connected to Proxmox host: {os.getenv('PROXMOX_HOST')}")

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
    required_vars = ["PROXMOX_HOST", "PROXMOX_TOKEN_NAME", "PROXMOX_TOKEN_VALUE"]
    missing = [var for var in required_vars if not os.getenv(var)]

    if missing:
        logger.error(f"Missing required environment variables: {', '.join(missing)}")
        logger.info("Please set the following environment variables:")
        logger.info(
            "  PROXMOX_HOST - Your Proxmox server address (e.g., 192.168.1.100)"
        )
        logger.info("  PROXMOX_TOKEN_NAME - Your API token name")
        logger.info("  PROXMOX_TOKEN_VALUE - Your API token value")
        logger.info("  PROXMOX_USER - (Optional) User, defaults to root@pam")
        logger.info("  PROXMOX_VERIFY_SSL - (Optional) Verify SSL, defaults to false")
        logger.info("  LOG_LEVEL - (Optional) Log level, defaults to INFO")
        sys.exit(1)

    try:
        asyncio.run(run_mcp_server())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
