# title: Proxmox MCP Server Dockerfile
# author: PureGrain at SLA Ops, LLC
# author_url: https://github.com/PureGrain
# repo_url: https://github.com/PureGrain/ProxmoxMCP
# license: MIT
# description: Docker container for Proxmox MCP Server using official MCP SDK

# Single-stage build for lightweight and secure builds
FROM alpine:latest

# Set working directory
WORKDIR /app

# Install dependencies
RUN apk update && apk add --no-cache python3 py3-pip

# Copy application files
COPY . /app

# Install Python dependencies
RUN pip3 install -r requirements.txt

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run the application
CMD ["python3", "mcp_server.py"]

# Add OCI labels for attestation metadata
LABEL org.opencontainers.image.title="Proxmox MCP Server"
LABEL org.opencontainers.image.description="Docker container for Proxmox MCP Server using official MCP SDK"
LABEL org.opencontainers.image.authors="PureGrain at SLA Ops, LLC"
LABEL org.opencontainers.image.source="https://github.com/PureGrain/ProxmoxEmCP"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.revision="git-commit-sha"
LABEL org.opencontainers.image.created="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
