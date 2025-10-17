# title: Proxmox MCP Server Dockerfile
# author: PureGrain at SLA Ops, LLC
# author_url: https://github.com/PureGrain
# repo_url: https://github.com/PureGrain/ProxmoxMCP
# version: 2.0.0
# license: MIT
# description: Docker container for Proxmox MCP Server using official MCP SDK

FROM python:3.13-slim

# Create non-root user for security
RUN groupadd -r mcp && useradd -r -g mcp -m -d /home/mcp -s /bin/bash mcp

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the MCP server (stdio version - primary)
COPY mcp_server_stdio.py .

# Change ownership to non-root user
RUN chown -R mcp:mcp /app

# Optional: Copy HTTP version for users who need it
# COPY mcp_server_http.py .

# Set environment variables (can be overridden at runtime)
ENV PYTHONUNBUFFERED=1
ENV LOG_LEVEL=INFO

# Health check (optional - checks if Python can import required modules)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import mcp; import proxmoxer; print('OK')" || exit 1

# Switch to non-root user
USER mcp

# Run the MCP server with stdio transport (default for MCP compatibility)
CMD ["python", "mcp_server_stdio.py"]
