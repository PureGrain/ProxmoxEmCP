# title: Proxmox MCP Server Dockerfile
# author: PureGrain at SLA Ops, LLC
# author_url: https://github.com/PureGrain
# repo_url: https://github.com/PureGrain/ProxmoxMCP
# license: MIT
# description: Docker container for Proxmox MCP Server using official MCP SDK

# Multi-stage build to optimize image size

# Stage 1: Build
FROM python:3.13-slim AS builder
WORKDIR /app

# Install build dependencies and Python packages
RUN apt-get update && apt-get install -y gcc g++ && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM gcr.io/distroless/python3
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app /app

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV LOG_LEVEL=INFO

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import mcp; import proxmoxer; print('OK')" || exit 1

# Run the MCP server
CMD ["python3", "mcp_server_stdio.py"]

# Add OCI labels for attestation metadata
LABEL org.opencontainers.image.title="Proxmox MCP Server"
LABEL org.opencontainers.image.description="Docker container for Proxmox MCP Server using official MCP SDK"
LABEL org.opencontainers.image.authors="PureGrain at SLA Ops, LLC"
LABEL org.opencontainers.image.source="https://github.com/PureGrain/ProxmoxEmCP"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.revision="git-commit-sha"
LABEL org.opencontainers.image.created="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
