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
FROM alpine:latest
WORKDIR /app

# Install runtime dependencies
RUN apk update && apk add --no-cache python3 py3-pip && \
    ln -sf python3 /usr/bin/python

# Copy built application from builder stage
COPY --from=builder /app /app

# Create non-root user for security
RUN addgroup -S mcp && adduser -S -G mcp -h /home/mcp mcp && \
    chown -R mcp:mcp /app

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV LOG_LEVEL=INFO

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import mcp; import proxmoxer; print('OK')" || exit 1

# Switch to non-root user
USER mcp

# Run the MCP server
CMD ["python", "mcp_server_stdio.py"]

# Add supply chain attestation metadata
LABEL org.opencontainers.image.source="https://github.com/PureGrain/ProxmoxEmCP"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.vendor="PureGrain at SLA Ops, LLC"
